import { adminRepository } from './admin.repository';
import User, { UserRole, UserStatus } from '../../models/User.model';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/error.util';
import appEvents from '../../utils/event-emitter.util';
import { EVENTS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../constants';
import AuthEvent, { AuthEventType } from '../../models/AuthEvent.model';
import WalkSession, { WalkSessionStatus } from '../../models/WalkSession.model';
import AvailabilitySlot, { SlotStatus } from '../../models/AvailabilitySlot.model';
import { Op } from 'sequelize';

// Simple in-memory cache for dashboard
let dashboardCache: { data: any, timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Admin Service
 */
export const adminService = {
    /**
     * Vetting: Approve nurse profile
     */
    async approveNurse(id: string): Promise<void> {
        const user = await User.findByPk(id);
        if (!user || user.role !== UserRole.NURSE) {
            throw new NotFoundError('Nurse account not found');
        }

        await user.update({ status: UserStatus.ACTIVE, is_active: true });
        
        // Log event
        await AuthEvent.create({
            user_id: id,
            event_type: AuthEventType.ACCOUNT_UNLOCKED, // Reusing for approval
            metadata: { action: 'APPROVED_BY_ADMIN' }
        });
    },

    /**
     * Vetting: Reject nurse profile
     */
    async rejectNurse(id: string, reason: string): Promise<void> {
        const user = await User.findByPk(id);
        if (!user || user.role !== UserRole.NURSE) {
            throw new NotFoundError('Nurse account not found');
        }

        await user.update({ status: UserStatus.REJECTED, is_active: false });

        // Log event
        await AuthEvent.create({
            user_id: id,
            event_type: AuthEventType.ACCOUNT_LOCKED, // Reusing for rejection
            metadata: { action: 'REJECTED_BY_ADMIN', reason }
        });
    },

    /**
     * Get pending nurses
     */
    async getPendingNurses() {
        return adminRepository.findPendingNurses();
    },

    /**
     * List users (paginated)
     */
    async listUsers(query: any) {
        const page = Math.max(1, parseInt(query.page as string) || 1);
        const limit = Math.min(
            MAX_PAGE_SIZE,
            parseInt(query.limit as string) || DEFAULT_PAGE_SIZE
        );
        const offset = (page - 1) * limit;

        const { rows, count } = await adminRepository.listUsers({
            role: query.role as UserRole,
            status: query.status as UserStatus,
            search: query.search as string,
            offset,
            limit
        });

        return {
            users: rows,
            pagination: {
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit
            }
        };
    },

    /**
     * Deactivate user (Kill-switch)
     */
    async deactivateUser(targetId: string, adminId: string): Promise<void> {
        if (targetId === adminId) {
            throw new ForbiddenError('You cannot deactivate your own account');
        }

        const user = await User.findByPk(targetId);
        if (!user) throw new NotFoundError('User not found');

        if (user.role === UserRole.ADMIN) {
            throw new ForbiddenError('You cannot deactivate another administrator account');
        }

        await user.update({ status: UserStatus.DEACTIVATED, is_active: false });

        // Emit deactivation event for token revocation/session termination
        appEvents.emit(EVENTS.USER_DEACTIVATED, { userId: targetId, adminId });

        // Audit log
        await AuthEvent.create({
            user_id: targetId,
            event_type: AuthEventType.ACCOUNT_LOCKED,
            metadata: { action: 'DEACTIVATED_BY_ADMIN', adminId }
        });
    },

    /**
     * Dashboard stats (Parallelized + Cached)
     */
    async getDashboardStats() {
        const now = Date.now();
        if (dashboardCache && (now - dashboardCache.timestamp) < CACHE_TTL) {
            return dashboardCache.data;
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Run queries in parallel
        const [
            activeNurses,
            activeElderly,
            pendingNurses,
            walksCompletedToday,
            walksInProgress,
            openSlotsToday
        ] = await Promise.all([
            adminRepository.countActiveNurses(),
            adminRepository.countActiveElderly(),
            adminRepository.countPendingNurses(),
            WalkSession.count({ 
                where: { 
                    status: WalkSessionStatus.COMPLETED,
                    actual_end_time: { [Op.between]: [todayStart, todayEnd] }
                } 
            }),
            WalkSession.count({ where: { status: WalkSessionStatus.IN_PROGRESS } }),
            AvailabilitySlot.count({ 
                where: { 
                    status: SlotStatus.OPEN,
                    date: format(new Date(), 'yyyy-MM-dd') 
                } 
            })
        ]);

        // Note: Emergency Alert count is zero for now (Sprint 3)
        const counts = {
            activeNurses,
            activeElderly,
            pendingNurses,
            walksCompletedToday,
            walksInProgress,
            openSlotsToday,
            activeEmergencyAlerts: 0
        };

        dashboardCache = { data: counts, timestamp: now };
        return counts;
    }
};

/**
 * Helper: format date for SQL
 */
function format(date: Date, fmt: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

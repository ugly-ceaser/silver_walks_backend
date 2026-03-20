import User, { UserRole, UserStatus } from '../../models/User.model';
import NurseProfile from '../../models/NurseProfile.model';
import ElderlyProfile from '../../models/ElderlyProfile.model';
import { Op, Sequelize } from 'sequelize';

/**
 * Admin Repository
 */
export const adminRepository = {
    /**
     * Find pending nurses for vetting
     */
    async findPendingNurses(): Promise<User[]> {
        return User.findAll({
            where: {
                role: UserRole.NURSE,
                status: UserStatus.PENDING
            },
            include: [{ model: NurseProfile, as: 'nurseProfile' }]
        });
    },

    /**
     * Paginated user list with profile joins
     */
    async listUsers(params: {
        role?: UserRole;
        status?: UserStatus;
        search?: string;
        offset: number;
        limit: number;
    }) {
        const { role, status, search, offset, limit } = params;

        const where: any = {};
        if (role) where.role = role;
        if (status) where.status = status;
        if (search) {
            where.email = { [Op.iLike]: `%${search}%` };
        }

        const { rows, count } = await User.findAndCountAll({
            where,
            offset,
            limit,
            include: [
                { model: NurseProfile, as: 'nurseProfile', required: false },
                { model: ElderlyProfile, as: 'elderlyProfile', required: false }
            ],
            order: [['created_at', 'DESC']]
        });

        return { rows, count };
    },

    /**
     * Count active nurses
     */
    async countActiveNurses() {
        return User.count({ where: { role: UserRole.NURSE, status: UserStatus.ACTIVE } });
    },

    /**
     * Count active elderly users
     */
    async countActiveElderly() {
        return User.count({ where: { role: UserRole.ELDERLY, status: UserStatus.ACTIVE } });
    },

    /**
     * Count pending nurse approvals
     */
    async countPendingNurses() {
        return User.count({ where: { role: UserRole.NURSE, status: UserStatus.PENDING } });
    }
};

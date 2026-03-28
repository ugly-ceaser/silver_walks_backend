import WalkSession, { WalkSessionAttributes, WalkSessionCreationAttributes, WalkSessionStatus } from "../../models/WalkSession.model";
import ElderlyProfile from "../../models/ElderlyProfile.model";
import NurseProfile from "../../models/NurseProfile.model";
import { Transaction, Op, fn, col, literal } from "sequelize";

interface WalkFilters {
    status?: WalkSessionStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}

interface WalkStatistics {
    totalWalks: number;
    totalDuration: number;
    totalSteps: number;
    totalDistance: number;
    avgDuration: number;
    avgSteps: number;
    avgDistance: number;
    avgRating: number;
    completionRate: number;
}

export class WalksRepository {
    /**
     * Create a new Walk Session
     */
    async createWalkSession(data: WalkSessionCreationAttributes, t?: Transaction): Promise<WalkSession> {
        return WalkSession.create(data, { transaction: t });
    }

    /**
     * Find Walk Session by ID
     */
    async findWalkSessionById(id: string): Promise<WalkSession | null> {
        return WalkSession.findOne({
            where: { id },
            include: [
                { model: ElderlyProfile, as: "elderlyProfile" },
                { model: NurseProfile, as: "nurseProfile" }
            ]
        });
    }

    /**
     * Find Walks by Elderly ID with Filters
     */
    async findWalksByElderlyIdWithFilters(elderlyId: string, filters: WalkFilters = {}): Promise<WalkSession[]> {
        const where: any = { elderly_id: elderlyId };

        // Filter by status
        if (filters.status) {
            where.status = filters.status;
        }

        // Filter by date range
        if (filters.startDate || filters.endDate) {
            where.scheduled_date = {};
            if (filters.startDate) {
                where.scheduled_date[Op.gte] = filters.startDate;
            }
            if (filters.endDate) {
                where.scheduled_date[Op.lte] = filters.endDate;
            }
        }

        const queryOptions: any = {
            where,
            include: [
                {
                    model: NurseProfile,
                    as: "nurseProfile",
                    attributes: ['id', 'name', 'rating']
                }
            ],
            order: [["scheduled_date", "DESC"], ["scheduled_time", "DESC"]]
        };

        // Apply limit if specified
        if (filters.limit) {
            queryOptions.limit = filters.limit;
        }

        return WalkSession.findAll(queryOptions);
    }

    /**
     * Find Walks by Elderly ID (legacy method for backward compatibility)
     */
    async findWalksByElderlyId(elderlyId: string, status?: WalkSessionStatus): Promise<WalkSession[]> {
        return this.findWalksByElderlyIdWithFilters(elderlyId, { status });
    }

    /**
     * Find Today's Walk by Elderly ID
     */
    async findTodayWalkByElderlyId(elderlyId: string): Promise<WalkSession | null> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return WalkSession.findOne({
            where: {
                elderly_id: elderlyId,
                scheduled_date: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            },
            include: [
                {
                    model: NurseProfile,
                    as: "nurseProfile",
                    attributes: ['id', 'name']
                }
            ],
            order: [["scheduled_time", "ASC"]]
        });
    }

    /**
     * Find Weekly Walks by Elderly ID
     */
    async findWeeklyWalksByElderlyId(elderlyId: string, weekStart: Date, weekEnd: Date): Promise<WalkSession[]> {
        return WalkSession.findAll({
            where: {
                elderly_id: elderlyId,
                scheduled_date: {
                    [Op.gte]: weekStart,
                    [Op.lte]: weekEnd
                }
            },
            order: [["scheduled_date", "ASC"], ["scheduled_time", "ASC"]]
        });
    }

    /**
     * Get Walk Statistics by Elderly ID
     */
    async getWalkStatisticsByElderlyId(elderlyId: string, period?: 'month' | 'year' | 'all-time'): Promise<WalkStatistics> {
        const where: any = { elderly_id: elderlyId };

        // Apply period filter
        if (period === 'month') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            where.scheduled_date = { [Op.gte]: startOfMonth };
        } else if (period === 'year') {
            const startOfYear = new Date();
            startOfYear.setMonth(0, 1);
            startOfYear.setHours(0, 0, 0, 0);
            where.scheduled_date = { [Op.gte]: startOfYear };
        }

        // Get all walks for counting
        const allWalks = await WalkSession.findAll({ where });
        const completedWalks = allWalks.filter(w => w.status === WalkSessionStatus.COMPLETED);

        // Calculate statistics
        const totalWalks = completedWalks.length;

        if (totalWalks === 0) {
            return {
                totalWalks: 0,
                totalDuration: 0,
                totalSteps: 0,
                totalDistance: 0,
                avgDuration: 0,
                avgSteps: 0,
                avgDistance: 0,
                avgRating: 0,
                completionRate: 0
            };
        }

        const totalDuration = completedWalks.reduce((sum, w) => {
            if (w.actual_start_time && w.actual_end_time) {
                const duration = (w.actual_end_time.getTime() - w.actual_start_time.getTime()) / (1000 * 60);
                return sum + duration;
            }
            return sum + (w.duration_minutes || 0);
        }, 0);

        const totalSteps = completedWalks.reduce((sum, w) => sum + (w.steps_count || 0), 0);
        const totalDistance = completedWalks.reduce((sum, w) => sum + (w.distance_meters || 0), 0);

        // Calculate average rating from nurse feedback
        const ratingsSum = completedWalks.reduce((sum, w) => {
            if (w.nurse_feedback && typeof w.nurse_feedback === 'object' && 'rating' in w.nurse_feedback) {
                return sum + (Number(w.nurse_feedback.rating) || 0);
            }
            return sum;
        }, 0);
        const walksWithRatings = completedWalks.filter(w =>
            w.nurse_feedback && typeof w.nurse_feedback === 'object' && 'rating' in w.nurse_feedback
        ).length;

        const avgRating = walksWithRatings > 0 ? ratingsSum / walksWithRatings : 0;
        const completionRate = allWalks.length > 0 ? (totalWalks / allWalks.length) * 100 : 0;

        return {
            totalWalks,
            totalDuration: Math.round(totalDuration),
            totalSteps,
            totalDistance,
            avgDuration: totalWalks > 0 ? Math.round(totalDuration / totalWalks) : 0,
            avgSteps: totalWalks > 0 ? Math.round(totalSteps / totalWalks) : 0,
            avgDistance: totalWalks > 0 ? Number((totalDistance / totalWalks).toFixed(2)) : 0,
            avgRating: Number(avgRating.toFixed(1)),
            completionRate: Number(completionRate.toFixed(1))
        };
    }

    /**
     * Find Walks by Nurse ID with Filters
     */
    async findWalksByNurseIdWithFilters(nurseId: string, filters: WalkFilters = {}): Promise<WalkSession[]> {
        const where: any = { nurse_id: nurseId };

        // Filter by status
        if (filters.status) {
            where.status = filters.status;
        }

        // Filter by date range
        if (filters.startDate || filters.endDate) {
            where.scheduled_date = {};
            if (filters.startDate) {
                where.scheduled_date[Op.gte] = filters.startDate;
            }
            if (filters.endDate) {
                where.scheduled_date[Op.lte] = filters.endDate;
            }
        }

        const queryOptions: any = {
            where,
            include: [
                {
                    model: ElderlyProfile,
                    as: "elderlyProfile",
                    attributes: ['id', 'name', 'profile_picture']
                }
            ],
            order: [["scheduled_date", "DESC"], ["scheduled_time", "DESC"]]
        };

        // Apply limit if specified
        if (filters.limit) {
            queryOptions.limit = filters.limit;
        }

        return WalkSession.findAll(queryOptions);
    }

    /**
     * Find Walks by Nurse ID (legacy method for backward compatibility)
     */
    async findWalksByNurseId(nurseId: string, status?: WalkSessionStatus): Promise<WalkSession[]> {
        return this.findWalksByNurseIdWithFilters(nurseId, { status });
    }

    /**
     * Get Walk Statistics by Nurse ID
     */
    async getWalkStatisticsByNurseId(nurseId: string, period?: 'month' | 'year' | 'all-time'): Promise<WalkStatistics> {
        const where: any = { nurse_id: nurseId };

        if (period === 'month') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            where.scheduled_date = { [Op.gte]: startOfMonth };
        } else if (period === 'year') {
            const startOfYear = new Date();
            startOfYear.setMonth(0, 1);
            startOfYear.setHours(0, 0, 0, 0);
            where.scheduled_date = { [Op.gte]: startOfYear };
        }

        const allWalks = await WalkSession.findAll({ where });
        const completedWalks = allWalks.filter(w => w.status === WalkSessionStatus.COMPLETED);

        const totalWalks = completedWalks.length;

        if (totalWalks === 0) {
            return {
                totalWalks: 0,
                totalDuration: 0,
                totalSteps: 0,
                totalDistance: 0,
                avgDuration: 0,
                avgSteps: 0,
                avgDistance: 0,
                avgRating: 0,
                completionRate: 0
            };
        }

        const totalDuration = completedWalks.reduce((sum, w) => {
            if (w.actual_start_time && w.actual_end_time) {
                const duration = (w.actual_end_time.getTime() - w.actual_start_time.getTime()) / (1000 * 60);
                return sum + duration;
            }
            return sum + (w.duration_minutes || 0);
        }, 0);

        const totalSteps = completedWalks.reduce((sum, w) => sum + (w.steps_count || 0), 0);
        const totalDistance = completedWalks.reduce((sum, w) => sum + (w.distance_meters || 0), 0);

        const ratingsSum = completedWalks.reduce((sum, w) => {
            if (w.nurse_feedback && typeof w.nurse_feedback === 'object' && 'rating' in w.nurse_feedback) {
                return sum + (Number((w.nurse_feedback as any).rating) || 0);
            }
            return sum;
        }, 0);

        const walksWithRatings = completedWalks.filter(w =>
            w.nurse_feedback && typeof w.nurse_feedback === 'object' && 'rating' in (w.nurse_feedback as any)
        ).length;

        const avgRating = walksWithRatings > 0 ? ratingsSum / walksWithRatings : 0;
        const completionRate = allWalks.length > 0 ? (totalWalks / allWalks.length) * 100 : 0;

        return {
            totalWalks,
            totalDuration: Math.round(totalDuration),
            totalSteps,
            totalDistance,
            avgDuration: totalWalks > 0 ? Math.round(totalDuration / totalWalks) : 0,
            avgSteps: totalWalks > 0 ? Math.round(totalSteps / totalWalks) : 0,
            avgDistance: totalWalks > 0 ? Number((totalDistance / totalWalks).toFixed(2)) : 0,
            avgRating: Number(avgRating.toFixed(1)),
            completionRate: Number(completionRate.toFixed(1))
        };
    }

    /**
     * Update Walk Session
     */
    async updateWalkSession(id: string, data: Partial<WalkSessionAttributes>, t?: Transaction): Promise<[number, WalkSession[]]> {
        return WalkSession.update(data, {
            where: { id },
            returning: true,
            transaction: t
        });
    }

    /**
     * Find Upcoming Walks for a User
     */
    async findUpcomingWalks(userId: string, role: 'elderly' | 'nurse'): Promise<WalkSession[]> {
        const where: any = {
            status: WalkSessionStatus.SCHEDULED,
            scheduled_date: {
                [Op.gte]: new Date()
            }
        };

        if (role === 'elderly') {
            where.elderly_id = userId;
        } else {
            where.nurse_id = userId;
        }

        return WalkSession.findAll({
            where,
            order: [["scheduled_date", "ASC"], ["scheduled_time", "ASC"]]
        });
    }
}

export const walksRepository = new WalksRepository();

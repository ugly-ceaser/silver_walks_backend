import WalkSession, { WalkSessionAttributes, WalkSessionCreationAttributes, WalkSessionStatus } from "../../models/WalkSession.model";
import ElderlyProfile from "../../models/ElderlyProfile.model";
import NurseProfile from "../../models/NurseProfile.model";
import { Transaction, Op } from "sequelize";

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
     * Find Walks by Elderly ID
     */
    async findWalksByElderlyId(elderlyId: string, status?: WalkSessionStatus): Promise<WalkSession[]> {
        const where: any = { elderly_id: elderlyId };
        if (status) {
            where.status = status;
        }
        return WalkSession.findAll({
            where,
            order: [["scheduled_date", "DESC"], ["scheduled_time", "DESC"]]
        });
    }

    /**
     * Find Walks by Nurse ID
     */
    async findWalksByNurseId(nurseId: string, status?: WalkSessionStatus): Promise<WalkSession[]> {
        const where: any = { nurse_id: nurseId };
        if (status) {
            where.status = status;
        }
        return WalkSession.findAll({
            where,
            order: [["scheduled_date", "DESC"], ["scheduled_time", "DESC"]]
        });
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

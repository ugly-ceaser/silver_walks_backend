import ElderlyProfile from "../../models/ElderlyProfile.model";
import { Transaction } from "sequelize";

export class ElderlyRepository {
    /**
     * Find Elderly by User ID
     */
    async findByUserId(userId: string): Promise<ElderlyProfile | null> {
        return ElderlyProfile.findOne({
            where: { user_id: userId }
        });
    }

    /**
     * Update Elderly Profile
     */
    async updateProfile(id: string, data: any, t?: Transaction): Promise<[number, ElderlyProfile[]]> {
        return ElderlyProfile.update(data, {
            where: { id },
            returning: true,
            transaction: t
        });
    }
}

export const elderlyRepository = new ElderlyRepository();

import User, { UserCreationAttributes } from "../../models/User.model";
import ElderlyProfile, { ElderlyProfileCreationAttributes } from "../../models/ElderlyProfile.model";
import EmergencyContact, { EmergencyContactCreationAttributes } from "../../models/EmergencyContact.model";
import HealthProfile, { HealthProfileCreationAttributes } from "../../models/HealthProfile.model";
import { Transaction } from "sequelize";

export class AuthRepository {
    /**
     * Create a new User
     */
    async createUser(data: UserCreationAttributes, t?: Transaction): Promise<User> {
        return User.create(data, { transaction: t });
    }

    /**
     * Create Elderly Profile
     */
    async createElderlyProfile(data: ElderlyProfileCreationAttributes, t?: Transaction): Promise<ElderlyProfile> {
        return ElderlyProfile.create(data, { transaction: t });
    }

    /**
     * Create Emergency Contact
     */
    async createEmergencyContact(data: EmergencyContactCreationAttributes, t?: Transaction): Promise<EmergencyContact> {
        return EmergencyContact.create(data, { transaction: t });
    }

    /**
     * Create Health Profile
     */
    async createHealthProfile(data: HealthProfileCreationAttributes, t?: Transaction): Promise<HealthProfile> {
        return HealthProfile.create(data, { transaction: t });
    }

    /**
     * Find User by Email
     */
    async findUserByEmail(email: string): Promise<User | null> {
        return User.findOne({ where: { email } });
    }

    /**
     * Find User by ID
     */
    async findUserById(id: string): Promise<User | null> {
        return User.findOne({ where: { id } });
    }

    /**
     * Find Elderly Profile by Phone
     * Includes the User model to get the user ID
     */
    async findElderlyProfileByPhone(phone: string): Promise<ElderlyProfile | null> {
        return ElderlyProfile.findOne({
            where: { phone },
            include: [{ model: User, as: "user" }],
        });
    }

    /**
     * Find Elderly Profile by User ID
     */
    async findElderlyProfileByUserId(userId: string): Promise<ElderlyProfile | null> {
        return ElderlyProfile.findOne({ where: { user_id: userId } });
    }
}

export const authRepository = new AuthRepository();

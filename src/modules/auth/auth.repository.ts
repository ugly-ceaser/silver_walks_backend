import User, { UserCreationAttributes } from "../../models/User.model";
import ElderlyProfile, { ElderlyProfileCreationAttributes } from "../../models/ElderlyProfile.model";
import EmergencyContact, { EmergencyContactCreationAttributes } from "../../models/EmergencyContact.model";
import HealthProfile, { HealthProfileCreationAttributes } from "../../models/HealthProfile.model";
import NurseProfile, { NurseProfileCreationAttributes } from "../../models/NurseProfile.model";
import NurseCertification from "../../models/NurseCertification.model";
import NurseAvailability from "../../models/NurseAvailability.model";
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
     * Create Nurse Profile
     */
    async createNurseProfile(data: NurseProfileCreationAttributes, t?: Transaction): Promise<NurseProfile> {
        return NurseProfile.create(data, { transaction: t });
    }

    /**
     * Create Nurse Certification
     */
    async createNurseCertification(data: any, t?: Transaction): Promise<NurseCertification> {
        return NurseCertification.create(data, { transaction: t });
    }

    /**
     * Create Nurse Availability
     */
    async createNurseAvailability(data: any, t?: Transaction): Promise<NurseAvailability> {
        return NurseAvailability.create(data, { transaction: t });
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

    /**
     * Find Nurse Profile by User ID
     */
    async findNurseProfileByUserId(userId: string): Promise<NurseProfile | null> {
        return NurseProfile.findOne({ where: { user_id: userId } });
    }

    /**
     * Find Nurse Profile by Phone
     */
    async findNurseProfileByPhone(phone: string): Promise<NurseProfile | null> {
        return NurseProfile.findOne({
            where: { phone },
            include: [{ model: User, as: "user" }],
        });
    }
}

export const authRepository = new AuthRepository();

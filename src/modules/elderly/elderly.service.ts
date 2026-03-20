import { elderlyRepository } from "./elderly.repository";
import { NotFoundError } from "../../utils/error.util";

/**
 * Update elderly device token for push notifications
 */
export const updateDeviceToken = async (userId: string, token: string) => {
    const elderly = await elderlyRepository.findByUserId(userId);
    if (!elderly) {
        throw new NotFoundError('Elderly profile not found');
    }

    await elderlyRepository.updateProfile(elderly.id, { device_token: token });
    return { success: true };
};

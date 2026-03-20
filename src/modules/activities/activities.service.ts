import { activitiesRepository } from './activities.repository';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/error.util';
import { sequelize } from '../../config/database.config';
import { logger } from '../../utils/logger.util';

export class ActivitiesService {
    /**
     * List all upcoming activities
     */
    async listUpcoming() {
        return activitiesRepository.getUpcoming();
    }

    /**
     * Get activity details
     */
    async getDetail(id: string) {
        const activity = await activitiesRepository.findById(id);
        if (!activity) throw new NotFoundError('Activity not found');
        return activity;
    }

    /**
     * Join an activity
     */
    async join(activityId: string, elderlyId: string) {
        const activity = await activitiesRepository.findById(activityId);
        if (!activity) throw new NotFoundError('Activity not found');

        // Check if already registered
        const alreadyRegistered = await activitiesRepository.isRegistered(activityId, elderlyId);
        if (alreadyRegistered) {
            throw new ConflictError('You are already registered for this activity');
        }

        // Check capacity
        const currentCount = await activitiesRepository.countParticipants(activityId);
        if (currentCount >= activity.capacity) {
            throw new ValidationError('This activity is already at full capacity');
        }

        return activitiesRepository.addParticipant(activityId, elderlyId);
    }

    /**
     * Leave an activity
     */
    async leave(activityId: string, elderlyId: string) {
        const affected = await activitiesRepository.removeParticipant(activityId, elderlyId);
        if (affected === 0) {
            throw new NotFoundError('You are not registered for this activity');
        }
        return { success: true };
    }

    /**
     * Admin: Create activity
     */
    async create(data: any) {
        return activitiesRepository.create(data);
    }
}

export const activitiesService = new ActivitiesService();

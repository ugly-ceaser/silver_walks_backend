import Activity, { ActivityStatus } from '../../models/Activity.model';
import ActivityParticipant, { AttendanceStatus } from '../../models/ActivityParticipant.model';
import { Op, Transaction } from 'sequelize';

export class ActivitiesRepository {
    /**
     * Get upcoming activities
     */
    async getUpcoming(now: Date = new Date()): Promise<Activity[]> {
        return Activity.findAll({
            where: {
                scheduled_date: {
                    [Op.gte]: now
                },
                status: ActivityStatus.SCHEDULED
            },
            order: [['scheduled_date', 'ASC'], ['scheduled_time', 'ASC']]
        });
    }

    /**
     * Get activity by ID with participants
     */
    async findById(id: string): Promise<Activity | null> {
        return Activity.findByPk(id, {
            include: [{ model: ActivityParticipant, as: 'participants' }]
        });
    }

    /**
     * Create an activity
     */
    async create(data: any): Promise<Activity> {
        return Activity.create(data);
    }

    /**
     * Register a participant
     */
    async addParticipant(activityId: string, elderlyId: string, transaction?: Transaction): Promise<ActivityParticipant> {
        return ActivityParticipant.create({
            activity_id: activityId,
            elderly_id: elderlyId,
            attendance_status: AttendanceStatus.REGISTERED
        }, { transaction });
    }

    /**
     * Remove a participant
     */
    async removeParticipant(activityId: string, elderlyId: string, transaction?: Transaction): Promise<number> {
        return ActivityParticipant.destroy({
            where: {
                activity_id: activityId,
                elderly_id: elderlyId
            },
            transaction
        });
    }

    /**
     * Count participants for an activity
     */
    async countParticipants(activityId: string): Promise<number> {
        return ActivityParticipant.count({
            where: {
                activity_id: activityId,
                attendance_status: {
                    [Op.ne]: AttendanceStatus.CANCELLED
                }
            }
        });
    }

    /**
     * Check if elderly is already registered
     */
    async isRegistered(activityId: string, elderlyId: string): Promise<boolean> {
        const participant = await ActivityParticipant.findOne({
            where: {
                activity_id: activityId,
                elderly_id: elderlyId
            }
        });
        return !!participant;
    }
}

export const activitiesRepository = new ActivitiesRepository();

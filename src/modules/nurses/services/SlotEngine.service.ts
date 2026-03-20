import { addDays, format, parse, startOfDay, isBefore, getDay, addMinutes, max } from 'date-fns';
import { Op } from 'sequelize';
import AvailabilitySlot, { SlotStatus, SlotSource } from '../../../models/AvailabilitySlot.model';
import AvailabilityRule, { RecurrenceType } from '../../../models/AvailabilityRule.model';
import { logger } from '../../../utils/logger.util';

export const SlotEngineService = {
    /**
     * Materialize a rule into slots for the next N days
     */
    async materializeRule(rule: AvailabilityRule, daysToMaterialize: number = 30): Promise<void> {
        const today = startOfDay(new Date());
        const endRange = addDays(today, daysToMaterialize);
        const slots = [];

        // Start from rule.effective_from or today, whichever is later
        let current = max([today, new Date(rule.effective_from)]);

        // Set current to start of day for easier comparison
        current = startOfDay(current);

        while (!isBefore(endRange, current)) {
            if (rule.effective_until && isBefore(new Date(rule.effective_until), current)) {
                break;
            }

            let shouldGenerate = false;

            if (rule.recurrence_type === RecurrenceType.DAILY) {
                shouldGenerate = true;
            } else if (rule.recurrence_type === RecurrenceType.WEEKLY) {
                if (getDay(current) === rule.day_of_week) {
                    shouldGenerate = true;
                }
            } else if (rule.recurrence_type === RecurrenceType.ONCE) {
                if (format(current, 'yyyy-MM-dd') === rule.effective_from) {
                    shouldGenerate = true;
                }
            }

            if (shouldGenerate) {
                slots.push({
                    nurse_id: rule.nurse_id,
                    date: format(current, 'yyyy-MM-dd'),
                    start_time: rule.start_time,
                    duration_mins: rule.duration_mins,
                    status: SlotStatus.OPEN,
                    source: SlotSource.RULE,
                    rule_id: rule.id,
                    version: 0
                });
            }

            if (rule.recurrence_type === RecurrenceType.ONCE && shouldGenerate) break;

            current = addDays(current, 1);
        }

        if (slots.length > 0) {
            logger.info(`Materializing ${slots.length} slots for rule ${rule.id}`);

            // Use bulkCreate with ignoreDuplicates (via partial unique index)
            // Note: Sequelize doesn't support ON CONFLICT DO NOTHING natively for partial indexes easily in bulkCreate
            // So we use a raw query or just loop and handle individual errors, or better: use findOrCreate logic.
            // But for speed, we can try-catch the whole block or use raw SQL.

            for (const slot of slots) {
                try {
                    await AvailabilitySlot.create(slot);
                } catch (error: any) {
                    if (error.name === 'SequelizeUniqueConstraintError') {
                        // Skip existing slots
                        continue;
                    }
                    throw error;
                }
            }
        }
    },

    /**
     * Background job: Cleanup expired slots
     */
    async cleanupExpiredSlots(): Promise<void> {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        const timeStr = format(now, 'HH:mm:ss');

        logger.info('Running cleanup for expired slots');

        await AvailabilitySlot.update(
            { status: SlotStatus.EXPIRED },
            {
                where: {
                    status: SlotStatus.OPEN,
                    [Op.or]: [
                        { date: { [Op.lt]: todayStr } },
                        {
                            [Op.and]: [
                                { date: todayStr },
                                { start_time: { [Op.lt]: timeStr } }
                            ]
                        }
                    ]
                }
            }
        );
    }
};

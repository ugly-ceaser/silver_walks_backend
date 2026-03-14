import { sequelize } from '../../../config/database.config';
import AvailabilitySlot, { SlotStatus } from '../../../models/AvailabilitySlot.model';
import Booking, { BookingStatus } from '../../../models/Booking.model';
import WalkSession, { WalkSessionStatus } from '../../../models/WalkSession.model';
import { ConflictError, NotFoundError, ValidationError } from '../../../utils/error.util';
import { logger } from '../../../utils/logger.util';

export const BookingService = {
    /**
     * Create a booking for a slot
     */
    async createBooking(params: {
        slotId: string;
        elderlyId: string;
        bookedBy: string;
        notes?: string;
    }): Promise<Booking> {
        const { slotId, elderlyId, bookedBy, notes } = params;

        const t = await sequelize.transaction();

        try {
            // 1. Fetch the slot
            const slot = await AvailabilitySlot.findByPk(slotId, { transaction: t });
            if (!slot) {
                throw new NotFoundError('Availability slot not found');
            }

            if (slot.status !== SlotStatus.OPEN) {
                throw new ValidationError(`Slot is not available. Current status: ${slot.status}`);
            }

            // 2. Optimistic Lock: Update status and version
            const [affectedRows] = await AvailabilitySlot.update(
                {
                    status: SlotStatus.BOOKED,
                    version: slot.version + 1
                },
                {
                    where: {
                        id: slotId,
                        version: slot.version // Hard guard: must match the version we read
                    },
                    transaction: t
                }
            );

            if (affectedRows === 0) {
                // Version changed since we read it -> double booking attempt
                throw new ConflictError('This slot was just booked by someone else. Please try another slot.');
            }

            // 3. Create Booking record
            const booking = await Booking.create({
                slot_id: slotId,
                elderly_id: elderlyId,
                booked_by: bookedBy,
                status: BookingStatus.CONFIRMED,
                notes
            }, { transaction: t });

            // 4. Create WalkSession record (for compatibility with existing flow)
            await WalkSession.create({
                elderly_id: elderlyId,
                nurse_id: slot.nurse_id,
                scheduled_date: new Date(slot.date),
                scheduled_time: slot.start_time,
                duration_minutes: slot.duration_mins,
                status: WalkSessionStatus.SCHEDULED
            }, { transaction: t });

            await t.commit();
            logger.info(`Booking ${booking.id} created for slot ${slotId}`);
            return booking;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    /**
     * Cancel a booking
     */
    async cancelBooking(bookingId: string, reason: string): Promise<void> {
        const t = await sequelize.transaction();
        try {
            const booking = await Booking.findByPk(bookingId, { transaction: t });
            if (!booking) throw new NotFoundError('Booking not found');

            if (booking.status !== BookingStatus.CONFIRMED) {
                throw new ValidationError('Only confirmed bookings can be cancelled');
            }

            // Update booking status
            booking.status = BookingStatus.CANCELLED;
            booking.cancelled_at = new Date();
            booking.cancel_reason = reason;
            await booking.save({ transaction: t });

            // Reopen the slot
            await AvailabilitySlot.update(
                { status: SlotStatus.OPEN },
                { where: { id: booking.slot_id }, transaction: t }
            );

            // Optionally: Update WalkSession status to CANCELLED
            // This would require finding the walk session linked to this booking/slot

            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
};

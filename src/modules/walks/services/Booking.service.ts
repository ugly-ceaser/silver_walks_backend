import { sequelize } from '../../../config/database.config';
import { Transaction } from 'sequelize';
import AvailabilitySlot, { SlotStatus } from '../../../models/AvailabilitySlot.model';
import Booking, { BookingStatus } from '../../../models/Booking.model';
import NurseProfile from '../../../models/NurseProfile.model';
import ElderlyProfile from '../../../models/ElderlyProfile.model';
import WalkSession, { WalkSessionStatus } from '../../../models/WalkSession.model';
import { ConflictError, NotFoundError, ValidationError } from '../../../utils/error.util';
import { logger } from '../../../utils/logger.util';
import appEvents from '../../../utils/event-emitter.util';
import { EVENTS, CANCEL_REOPEN_THRESHOLD_HRS } from '../../../constants';
import { differenceInHours } from 'date-fns';
import { ratingsService } from '../../ratings/ratings.service';

export const BookingService = {
    /**
     * Create a booking for a slot
     */
    async createBooking(params: {
        slotId: string;
        elderlyId: string;
        bookedBy: string;
        notes?: string;
    }, transaction?: Transaction): Promise<{ booking: Booking; walkSession: WalkSession }> {
        const { slotId, elderlyId, bookedBy, notes } = params;

        // 0. Ratings Gate: Check for pending ratings
        const hasPending = await ratingsService.hasActivePendingRatings(elderlyId);
        if (hasPending) {
            throw new ValidationError('You have a pending rating from a previous walk. Please complete it before making a new booking.');
        }

        const isExternalTransaction = !!transaction;
        const t = transaction || await sequelize.transaction();

        try {
            // 1. Fetch the slot
            const slot = await AvailabilitySlot.findByPk(slotId, {
                transaction: t,
                include: [{ model: NurseProfile, as: 'nurse' }]
            });
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
                        version: slot.version
                    },
                    transaction: t
                }
            );

            if (affectedRows === 0) {
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

            // 4. Create WalkSession record
            const walkSession = await WalkSession.create({
                elderly_id: elderlyId,
                nurse_id: slot.nurse_id,
                scheduled_date: new Date(slot.date),
                scheduled_time: slot.start_time,
                duration_minutes: slot.duration_mins,
                status: WalkSessionStatus.SCHEDULED
            }, { transaction: t });

            if (!isExternalTransaction) await t.commit();
            logger.info(`Booking ${booking.id} created for slot ${slotId}`);

            // Emit booking.confirmed event
            appEvents.emit(EVENTS.BOOKING_CONFIRMED, {
                bookingId: booking.id,
                slotId,
                elderlyId,
                nurseId: slot.nurse_id,
            });

            // Re-fetch with associations for formatWalkSession
            const sessionWithAssociations = await WalkSession.findByPk(walkSession.id, {
                transaction: isExternalTransaction ? t : undefined, // If external, session is still in t
                include: [
                    { model: NurseProfile, as: 'nurseProfile' },
                    { model: ElderlyProfile, as: 'elderlyProfile' }
                ]
            });

            return { booking, walkSession: sessionWithAssociations || walkSession };
        } catch (error) {
            if (!isExternalTransaction) await t.rollback();
            throw error;
        }
    },

    /**
     * Cancel a booking
     */
    async cancelBooking(params: {
        bookingId: string;
        reason: string;
        cancelledBy: 'nurse' | 'elderly' | 'admin';
    }): Promise<void> {
        const { bookingId, reason, cancelledBy } = params;
        const t = await sequelize.transaction();
        try {
            const booking = await Booking.findByPk(bookingId, {
                transaction: t,
                include: [{ model: AvailabilitySlot, as: 'slot' }]
            });
            if (!booking) throw new NotFoundError('Booking not found');

            if (booking.status !== BookingStatus.CONFIRMED) {
                throw new ValidationError('Only confirmed bookings can be cancelled');
            }

            // Update booking status
            booking.status = BookingStatus.CANCELLED;
            booking.cancelled_at = new Date();
            booking.cancel_reason = reason;
            await booking.save({ transaction: t });

            // Reopen or Permanently close the slot based on policy
            let newSlotStatus = SlotStatus.OPEN;

            if (cancelledBy === 'elderly') {
                // If cancelled by elderly < 2 hours before, close the slot permanently
                const now = new Date();
                const slotDateTime = new Date(`${booking.slot?.date} ${booking.slot?.start_time}`);
                const hoursToStart = differenceInHours(slotDateTime, now);

                if (hoursToStart < CANCEL_REOPEN_THRESHOLD_HRS) {
                    newSlotStatus = SlotStatus.CANCELLED;
                    logger.info(`Slot ${booking.slot_id} permanently closed due to late cancellation by elderly.`);
                }
            }

            await AvailabilitySlot.update(
                { status: newSlotStatus },
                { where: { id: booking.slot_id }, transaction: t }
            );

            // Update WalkSession status to CANCELLED
            await WalkSession.update(
                {
                    status: WalkSessionStatus.CANCELLED,
                    cancellation_reason: reason
                },
                {
                    where: {
                        elderly_id: booking.elderly_id,
                        scheduled_date: booking.slot?.date,
                        scheduled_time: booking.slot?.start_time
                    },
                    transaction: t
                }
            );

            await t.commit();

            // Emit booking.cancelled event
            appEvents.emit(EVENTS.BOOKING_CANCELLED, {
                bookingId,
                slotId: booking.slot_id,
                reason,
                cancelledBy
            });
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
};

// @ts-nocheck
import { sequelize } from '../src/config/database.config';
import User, { UserRole, UserStatus } from '../src/models/User.model';
import NurseProfile from '../src/models/NurseProfile.model';
import ElderlyProfile from '../src/models/ElderlyProfile.model';
import AvailabilitySlot, { SlotStatus, SlotSource } from '../src/models/AvailabilitySlot.model';
import { Op } from 'sequelize';
import { BookingService } from '../src/modules/walks/services/Booking.service';
import * as walksByService from '../src/modules/walks/walks.service';
import EmergencyContact from '../src/models/EmergencyContact.model';
import { emergencyContactService } from '../src/modules/emergency-contacts/emergency-contacts.service';
import HealthProfile from '../src/models/HealthProfile.model';
import { healthProfileService } from '../src/modules/health-profiles/health-profiles.service';
import { format, addMinutes, subMinutes, addDays } from 'date-fns';
import appEvents from '../src/utils/event-emitter.util';
import { EVENTS } from '../src/constants';

async function runTests() {
    console.log('--- STARTING SPRINT 2 VERIFICATION ---');
    
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        // Cleanup previous test data
        await User.destroy({ where: { email: { [Op.in]: ['test-nurse@example.com', 'test-elderly@example.com'] } } });
        console.log('🧹 Cleaned up old test users');

        // Setup test data
        // 1. Create a nurse and elderly
        const [nurseUser] = await User.findOrCreate({
            where: { email: 'test-nurse@example.com' },
            defaults: { password_hash: 'hash', role: UserRole.NURSE, status: UserStatus.ACTIVE }
        });
        const [nurseProfile] = await NurseProfile.findOrCreate({
            where: { user_id: nurseUser.id },
            defaults: { 
                user_id: nurseUser.id,
                name: 'Test Nurse', 
                phone: '123', 
                address: 'London',
                gender: 'F',
                experience_years: 5,
                latitude: 51.5074,
                longitude: -0.1278
            } as any
        });

        const [elderlyUser] = await User.findOrCreate({
            where: { email: 'test-elderly@example.com' },
            defaults: { password_hash: 'hash', role: UserRole.ELDERLY, status: UserStatus.ACTIVE } as any
        });
        const [elderlyProfile] = await ElderlyProfile.findOrCreate({
            where: { user_id: elderlyUser.id },
            defaults: { 
                user_id: elderlyUser.id,
                name: 'Test Elderly', 
                phone: '456', 
                address: 'Manchester', 
                date_of_birth: new Date('1950-01-01'),
                gender: 'M',
                subscription_plan: 'BASIC' as any,
                subscription_status: 'ACTIVE' as any,
                latitude: 53.4808,
                longitude: -2.2426
            } as any
        });

        // --- CASE 1: Atomic Booking Concurrency ---
        console.log('\nCase 1: Atomic Booking Concurrency');
        const slot = await AvailabilitySlot.create({
            nurse_id: nurseProfile.id,
            date: format(new Date(), 'yyyy-MM-dd'),
            start_time: '10:00:00',
            duration_mins: 60,
            status: SlotStatus.OPEN,
            source: SlotSource.MANUAL,
            version: 0
        } as any);

        // Attempt simultaneous bookings
        const results = await Promise.allSettled([
            BookingService.createBooking({ slotId: slot.id, elderlyId: elderlyProfile.id, bookedBy: elderlyUser.id }),
            BookingService.createBooking({ slotId: slot.id, elderlyId: elderlyProfile.id, bookedBy: elderlyUser.id })
        ]);

        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`- Succeeded: ${succeeded}, Failed: ${failed}`);
        if (succeeded === 1 && failed === 1) console.log('✅ EXACTLY ONE booking succeeded - Optimistic locking works!');
        else console.log('❌ Concurrency check FAILED');

        // --- CASE 2: Split-slot Correctness ---
        console.log('\nCase 2: Split-slot Correctness');
        const bigSlot = await AvailabilitySlot.create({
            nurse_id: nurseProfile.id,
            date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            start_time: '14:00:00',
            duration_mins: 60,
            status: SlotStatus.OPEN,
            source: SlotSource.MANUAL,
            version: 0
        } as any);

        // Book only 30 mins
        await BookingService.createBooking({ slotId: bigSlot.id, elderlyId: elderlyProfile.id, bookedBy: elderlyUser.id, notes: '30 min walk' });
        
        const originalSlot = await AvailabilitySlot.findByPk(bigSlot.id);
        const newSlot = await AvailabilitySlot.findOne({
            where: {
                nurse_id: nurseProfile.id,
                date: bigSlot.date,
                start_time: '14:30:00', // Should start after the 30min walk
                status: SlotStatus.OPEN
            }
        });

        if (originalSlot?.status === SlotStatus.BOOKED && newSlot) {
             console.log(`- Original slot status: ${originalSlot.status}, Duration: ${originalSlot.duration_mins}`);
             console.log(`- New split slot: ${newSlot ? 'CREATED' : 'NOT FOUND'}`);
             if (newSlot) console.log('✅ Split slot logic works!');
             else console.log('⚠️ Split slot NOT created - Verify if logic exists in Booking.service.ts');
        }

        // --- CASE 3: Walk State Machine Happy Path ---
        console.log('\nCase 3: Walk State Machine Happy Path');
        // We need a CONFIRMED WalkSession. BookingService creates it.
        const sessionSlot = await AvailabilitySlot.create({
            nurse_id: nurseProfile.id,
            date: format(new Date(), 'yyyy-MM-dd'),
            start_time: format(addMinutes(new Date(), 5), 'HH:mm:ss'), // Adjust for tolerance
            duration_mins: 60,
            status: SlotStatus.OPEN,
            source: SlotSource.MANUAL,
            version: 0
        } as any);
        const bookingResult = await BookingService.createBooking({ slotId: sessionSlot.id, elderlyId: elderlyProfile.id, bookedBy: elderlyUser.id });
        
        const activeSession = await (sequelize.models.WalkSession as any).findOne({
            where: { nurse_id: nurseProfile.id, elderly_id: elderlyProfile.id, status: 'scheduled' },
            order: [['created_at', 'DESC']]
        });

        if (activeSession) {
            console.log('- Starting walk...');
            await walksByService.startWalk(activeSession.id, nurseProfile.id);
            console.log('- Completing walk...');
            await walksByService.completeWalk(activeSession.id, nurseProfile.id, 'Excellent walk!');
            const completed = await (sequelize.models.WalkSession as any).findByPk(activeSession.id);
            console.log(`- Final Status: ${completed.status}, Duration: ${completed.duration_minutes}`);
            if (completed.status === 'completed') console.log('✅ Happy path works!');
        }

        // --- CASE 8: Emergency Contact Constraints ---
        console.log('\nCase 8: Emergency Contact Constraints');
        await EmergencyContact.destroy({ where: { elderly_id: elderlyProfile.id } });
        
        console.log('- Creating 3 contacts...');
        await emergencyContactService.create(elderlyProfile.id, { name: 'C1', relationship: 'Son', phone: '+123', is_primary: true });
        await emergencyContactService.create(elderlyProfile.id, { name: 'C2', relationship: 'Daughter', phone: '+456', is_primary: false });
        await emergencyContactService.create(elderlyProfile.id, { name: 'C3', relationship: 'Friend', phone: '+789', is_primary: false });

        try {
            await emergencyContactService.create(elderlyProfile.id, { name: 'C4', relationship: 'Other', phone: '+000', is_primary: false });
            console.log('❌ FAILED: Created 4th contact');
        } catch (e) {
            console.log('✅ Successfully blocked 4th contact');
        }

        console.log('- Rotating primary...');
        const contacts = await emergencyContactService.getAll(elderlyProfile.id);
        const c3 = contacts.find(c => c.name === 'C3')!;
        await emergencyContactService.setPrimary(c3.id, elderlyProfile.id);
        const updatedContacts = await emergencyContactService.getAll(elderlyProfile.id);
        const newPrimary = updatedContacts.find(c => c.is_primary);
        if (newPrimary?.name === 'C3') console.log('✅ Primary rotation works!');

        console.log('\n--- VERIFICATION FINISHED ---');

    } catch (error) {
        console.error('💥 TEST CRASHED:', error);
    } finally {
        await sequelize.close();
    }
}

runTests();

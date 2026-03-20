const axios = require('axios');
const baseUrl = 'http://localhost:5000/api/v1';

async function verify() {
    console.log('--- Verifying Availability Refactor ---');

    try {
        // 1. Login as Nurse
        console.log('1. Logging in as Nurse...');
        const nurseLogin = await axios.post(`${baseUrl}/auth/login-nurse`, {
            identifier: 'martins.paraclet@yahoo.com',
            password: 'Safe@1234'
        });
        const nurseToken = nurseLogin.data.data.token;
        console.log('Nurse logged in.');

        // 2. Login as Elderly
        console.log('2. Logging in as Elderly...');
        const elderlyLogin = await axios.post(`${baseUrl}/auth/login-elderly`, {
            identifier: 'martins.paraclet@gmail.com',
            password: 'password123'
        });
        const elderlyToken = elderlyLogin.data.data.token;
        console.log('Elderly logged in.');

        // 3. Create an Availability Rule (Nurse)
        console.log('3. Creating Availability Rule (Nurse)...');
        // Weekly on Tuesday (2), 10:00, 45 mins
        const ruleRes = await axios.post(`${baseUrl}/nurses/availability/rules`, {
            recurrence_type: 'WEEKLY',
            day_of_week: 2,
            start_time: '10:00:00',
            duration_mins: 45,
            effective_from: '2026-03-14'
        }, {
            headers: { Authorization: `Bearer ${nurseToken}` }
        });
        console.log('Rule created:', ruleRes.data.data.id);

        // Wait a bit for materialization (it's async)
        console.log('Waiting for materialization...');
        await new Promise(r => setTimeout(r, 2000));

        // 4. Query Available Slots (Elderly)
        console.log('4. Querying Available Slots (Elderly)...');
        const slotsRes = await axios.get(`${baseUrl}/walks/slots?date=2026-03-17`, {
            headers: { Authorization: `Bearer ${elderlyToken}` }
        });
        const slots = slotsRes.data.data;
        console.log(`Found ${slots.length} slots.`);

        if (slots.length === 0) {
            throw new Error('No slots found for 2026-03-17 (should have at least the Tuesday slot)');
        }

        const targetSlot = slots.find(s => s.time === '10:00:00');
        if (!targetSlot) {
            throw new Error('Target Tuesday slot not found in results');
        }
        console.log(`Target Slot ID: ${targetSlot.id}`);

        // 5. Book a Slot (Elderly)
        console.log('5. Booking Slot...');
        const bookRes = await axios.post(`${baseUrl}/walks/book`, {
            slotId: targetSlot.id,
            notes: 'Testing refactor'
        }, {
            headers: { Authorization: `Bearer ${elderlyToken}` }
        });
        console.log('Booking successful:', bookRes.data.data.id);

        // 6. Test Optimistic Locking (Attempt double booking)
        console.log('6. Testing Double Booking (Optimistic Locking)...');
        try {
            await axios.post(`${baseUrl}/walks/book`, {
                slotId: targetSlot.id,
                notes: 'Should fail'
            }, {
                headers: { Authorization: `Bearer ${elderlyToken}` }
            });
            console.error('FAIL: Double booking succeeded but should have failed');
        } catch (error) {
            if (error.response && error.response.status === 400 || error.response.status === 409) {
                console.log('SUCCESS: Double booking failed as expected:', error.response.data.message);
            } else {
                console.error('Unexpected error on double booking:', error.message);
            }
        }

        console.log('\n--- VERIFICATION COMPLETE: SUCCESS ---');
    } catch (error) {
        console.error('\n--- VERIFICATION FAILED ---');
        if (error.response) {
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
            console.error('Status:', error.response.status);
        } else {
            console.error(error.message);
        }
    }
}

verify();

/**
 * Cleanup Nurses Script
 * 
 * Deletes all nurse profiles and associated users except for the specified nurse ID.
 */

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('Error: DATABASE_URL not found in .env');
    process.exit(1);
}

const sequelize = new Sequelize(dbUrl, { logging: false });

const TARGET_NURSE_ID = 'b1a4c5b7-8984-4812-adc6-e2cc797e900c';

async function cleanup() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();

        // Helper to check if table exists
        const tableExists = async (tableName) => {
            const [results] = await sequelize.query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :tableName)",
                { replacements: { tableName }, type: Sequelize.QueryTypes.SELECT }
            );
            return results.exists;
        };

        // 1. Find all nurse profiles to delete
        const [nursesToDelete] = await sequelize.query(
            'SELECT id, user_id, name FROM nurse_profiles WHERE id != :targetId',
            { replacements: { targetId: TARGET_NURSE_ID } }
        );

        if (nursesToDelete.length === 0) {
            console.log('No other nurses found to delete.');
            return;
        }

        const deleteIds = nursesToDelete.map(n => n.id);
        const deleteUserIds = nursesToDelete.map(n => n.user_id).filter(id => id !== null);

        console.log(`Found ${nursesToDelete.length} nurses to delete:`, nursesToDelete.map(n => n.name).join(', '));

        await sequelize.transaction(async (t) => {
            // 2. Clear assigned_nurse_id in elderly_profiles
            console.log('Clearing assigned_nurse_id in elderly_profiles...');
            await sequelize.query(
                'UPDATE elderly_profiles SET assigned_nurse_id = NULL WHERE assigned_nurse_id IN (:ids)',
                { replacements: { ids: deleteIds }, transaction: t }
            );

            // 3. Delete from related tables if they exist
            const tablesToCleanup = [
                { name: 'walk_sessions', fk: 'nurse_id' },
                { name: 'emergency_alerts', fk: 'nurse_id' },
                { name: 'withdrawal_requests', fk: 'nurse_id' },
                { name: 'nurse_bank_accounts', fk: 'nurse_id' },
                { name: 'nurse_availability', fk: 'nurse_id' },
                { name: 'nurse_certifications', fk: 'nurse_profile_id' }
            ];

            for (const table of tablesToCleanup) {
                if (await tableExists(table.name)) {
                    console.log(`Deleting records from ${table.name}...`);
                    await sequelize.query(
                        `DELETE FROM ${table.name} WHERE ${table.fk} IN (:ids)`,
                        { replacements: { ids: deleteIds }, transaction: t }
                    );
                } else {
                    console.log(`Table ${table.name} does not exist, skipping.`);
                }
            }

            // 6. Delete the NurseProfile records
            console.log('Deleting nurse profiles...');
            await sequelize.query(
                'DELETE FROM nurse_profiles WHERE id IN (:ids)',
                { replacements: { ids: deleteIds }, transaction: t }
            );

            // 7. Delete the User records
            if (deleteUserIds.length > 0) {
                console.log('Deleting associated user accounts...');
                await sequelize.query(
                    'DELETE FROM users WHERE id IN (:ids)',
                    { replacements: { ids: deleteUserIds }, transaction: t }
                );
            }
        });

        console.log('Cleanup completed successfully.');

    } catch (error) {
        console.error('Cleanup failed:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

cleanup();

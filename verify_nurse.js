/**
 * Nurse Verification script
 * 
 * Usage:
 * 1. Open a terminal in the project root
 * 2. Run: node verify_nurse.js <USER_ID>
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dbConfig = {
    database: process.env.DB_NAME || 'silver_walks',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
};

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, { logging: false })
    : new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: dbConfig.logging
    });

async function verifyNurse(targetId) {
    if (!targetId) {
        console.error('Error: Please provide a User ID.');
        console.log('Usage: node verify_nurse.js <USER_ID>');
        process.exit(1);
    }

    try {
        console.log(`Connecting to database...`);
        await sequelize.authenticate();

        console.log(`Searching for nurse profile associated with target ID: ${targetId}...`);

        // Raw query to update the nurse profile status
        const [result] = await sequelize.query(
            `UPDATE nurse_profiles 
             SET verification_status = 'approved', availability_status = 'available' 
             WHERE id = :targetId OR user_id = :targetId`,
            {
                replacements: { targetId: targetId },
            }
        );

        // Result handling for PostgreSQL raw queries
        // result is [metadata, metadata] for updates or [results, metadata]
        // Often sequelize.query for UPDATE returns the count as the second element or in metadata.rowCount
        const rowCount = result?.rowCount || 0;

        // Try to find if the record exists at all to give better feedback
        const [existing] = await sequelize.query(
            `SELECT id, name, verification_status, availability_status FROM nurse_profiles WHERE id = :targetId OR user_id = :targetId`,
            { replacements: { targetId } }
        );

        if (existing && existing.length > 0) {
            const nurse = existing[0];
            if (rowCount > 0) {
                console.log(`Successfully updated nurse: ${nurse.name}`);
            } else {
                console.log(`Nurse "${nurse.name}" is already verified (Status: ${nurse.verification_status}, Availability: ${nurse.availability_status})`);
            }
        } else {
            console.warn(`No nurse profile found for ID: ${targetId}. Please verify the ID is correct.`);
        }

    } catch (error) {
        console.error('An error occurred during verification:');
        console.error(error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

const targetUserId = process.argv[2];
verifyNurse(targetUserId);

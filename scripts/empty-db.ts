import { sequelize } from '../src/config/database.config';
import { logger } from '../src/utils/logger.util';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Script to empty all tables in the database except for migrations
 * USE WITH CAUTION: This is a destructive operation!
 */
const emptyDatabase = async (): Promise<void> => {
    const isProduction = process.env.NODE_ENV === 'production';
    const force = process.argv.includes('--force');

    if (isProduction && !force) {
        logger.error('CRITICAL: Attempted to empty database in PRODUCTION without --force flag. Operation aborted.');
        process.exit(1);
    }

    try {
        logger.warn(`Starting database truncation ${isProduction ? 'in PRODUCTION' : ''}...`);

        // Get all user tables in the current schema (public)
        const tables: any[] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != 'migrations';
    `, { type: 'SELECT' });

        if (tables.length === 0) {
            logger.info('No tables found to truncate.');
            return;
        }

        const tableNames = tables.map(t => `"${t.table_name}"`).join(', ');

        // Truncate all tables using RESTART IDENTITY and CASCADE
        // RESTART IDENTITY: Resets primary key sequences
        // CASCADE: Automatically truncates tables that have foreign-key references to the named tables
        await sequelize.query(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);

        logger.info('Database emptied successfully! All tables truncated and sequences reset.');
        process.exit(0);
    } catch (error) {
        logger.error('Failed to empty database:', error as Error);
        process.exit(1);
    }
};

// Run the script
emptyDatabase();

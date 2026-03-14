import { Sequelize, QueryInterface } from 'sequelize';
import { logger } from '../utils/logger.util';
import fs from 'fs';
import path from 'path';

interface MigrationRecord {
  name: string;
  executed_at: Date;
}

/**
 * Migration runner that automatically runs new migrations on startup
 */
export class MigrationRunner {
  private sequelize: Sequelize;
  private migrationsPath: string;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
    this.migrationsPath = path.join(__dirname, '.');
  }

  /**
   * Create migrations tracking table if it doesn't exist
   */
  private async ensureMigrationsTable(): Promise<void> {
    const queryInterface = this.sequelize.getQueryInterface();

    await queryInterface.createTable('migrations', {
      name: {
        type: 'VARCHAR(255)',
        primaryKey: true,
      },
      executed_at: {
        type: 'TIMESTAMP WITH TIME ZONE',
        allowNull: false,
        defaultValue: this.sequelize.literal('CURRENT_TIMESTAMP'),
      },
    }, {
      charset: 'utf8',
    }).catch(() => {
      // Table already exists, ignore error
    });
  }

  /**
   * Get list of executed migrations
   */
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const [results] = await this.sequelize.query(
        'SELECT name FROM migrations ORDER BY name'
      );
      return (results as MigrationRecord[]).map(r => r.name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get list of migration files
   */
  private getMigrationFiles(): string[] {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.ts') && file !== 'index.ts' && !file.endsWith('.d.ts'))
      .sort();
    return files;
  }

  /**
   * Record migration as executed
   */
  private async recordMigration(name: string): Promise<void> {
    await this.sequelize.query(
      'INSERT INTO migrations (name, executed_at) VALUES (?, CURRENT_TIMESTAMP)',
      {
        replacements: [name],
      }
    );
  }

  /**
   * Run a single migration
   */
  private async runMigration(filename: string): Promise<void> {
    const migrationPath = path.join(this.migrationsPath, filename);
    const migration = require(migrationPath).default;

    if (!migration || typeof migration.up !== 'function') {
      throw new Error(`Migration ${filename} does not export a valid up function`);
    }

    const queryInterface = this.sequelize.getQueryInterface();

    logger.info(`Running migration: ${filename}`);
    await migration.up(queryInterface, this.sequelize);
    await this.recordMigration(filename);
    logger.info(`Migration completed: ${filename}`);
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(): Promise<void> {
    try {
      // Ensure migrations table exists
      await this.ensureMigrationsTable();

      // Get executed and available migrations
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = this.getMigrationFiles();

      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migration(s)`);

      // Run each pending migration in order
      for (const migrationFile of pendingMigrations) {
        await this.runMigration(migrationFile);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed', error as Error);
      throw error;
    }
  }

  /**
   * Rollback last migration (for development/testing)
   */
  async rollbackLastMigration(): Promise<void> {
    try {
      const executedMigrations = await this.getExecutedMigrations();

      if (executedMigrations.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      const lastMigration = executedMigrations[executedMigrations.length - 1];
      const migrationPath = path.join(this.migrationsPath, lastMigration);
      const migration = require(migrationPath).default;

      if (!migration || typeof migration.down !== 'function') {
        throw new Error(`Migration ${lastMigration} does not export a valid down function`);
      }

      const queryInterface = this.sequelize.getQueryInterface();

      logger.info(`Rolling back migration: ${lastMigration}`);
      await migration.down(queryInterface, this.sequelize);

      await this.sequelize.query(
        'DELETE FROM migrations WHERE name = ?',
        { replacements: [lastMigration] }
      );

      logger.info(`Migration rollback completed: ${lastMigration}`);
    } catch (error) {
      logger.error('Migration rollback failed', error as Error);
      throw error;
    }
  }
}

/**
 * Run migrations
 */
export const runMigrations = async (sequelize: Sequelize): Promise<void> => {
  const runner = new MigrationRunner(sequelize);
  await runner.runPendingMigrations();
};

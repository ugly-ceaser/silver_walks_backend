import { Sequelize } from 'sequelize';
import { config } from './env.config';
import { logger } from '../utils/logger.util';

// Create Sequelize instance
// Support both DATABASE_URL (for Neon DB) and individual connection parameters
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: config.env === 'development' ? (msg: string) => logger.debug(msg) : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    })
  : new Sequelize(
      config.database.name,
      config.database.user,
      config.database.password,
      {
        host: config.database.host,
        port: config.database.port,
        dialect: 'postgres',
        logging: config.env === 'development' ? (msg: string) => logger.debug(msg) : false,
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true,
        },
        dialectOptions: {
          ssl: config.database.ssl
            ? {
                require: true,
                rejectUnauthorized: false,
              }
            : false,
        },
      }
    );

export { sequelize };

// Test database connection
export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Unable to connect to the database', error as Error);
    process.exit(1);
  }
};

// Sync database models
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    await sequelize.sync({ force, alter: !force && config.env === 'development' });
    logger.info(`Database synchronized successfully${force ? ' (Force mode)' : ''}`);
  } catch (error) {
    logger.error('Database sync failed', error as Error);
    throw error;
  }
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', error as Error);
  }
};

export default sequelize;
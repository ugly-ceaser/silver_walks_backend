import { Request, Response } from 'express';
import { sequelize } from '../config/database.config';
import { config } from '../config/env.config';

/**
 * Health check controller
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check database connection
    await sequelize.authenticate();

    res.status(200).json({
      success: true,
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
      environment: config.env,
      database: {
        status: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service is unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
      },
    });
  }
};


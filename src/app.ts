import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/env.config';
import { requestLogger } from './middlewares/logger.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { apiRateLimiter } from './middlewares/rateLimit.middleware';
import { connectDatabase } from './config/database.config';
import { logger } from './utils/logger.util';

// Import routes
import routes from './routes/index';

/**
 * Create and configure Express application
 */
export const createApp = async (): Promise<Application> => {
  const app = express();

  // Trust proxy (important for rate limiting and IP detection)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
    })
  );

  // Compression middleware
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Health check endpoint (before rate limiting)
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // API rate limiting
  app.use('/api', apiRateLimiter);

  // Activity tracking for nurses and admins (must be after authentication middleware)
  // Note: This will be applied in routes that use authenticate middleware
  // Import and use trackNurseAdminActivity in your route files after authenticate

  // API routes
  app.use(`/api/${config.apiVersion}`, routes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

/**
 * Initialize application (database connection, etc.)
 */
export const initializeApp = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', error as Error);
    throw error;
  }
};

export default createApp;


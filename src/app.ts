import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/env.config';
import { requestLogger } from './middlewares/logger.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { apiRateLimiter } from './middlewares/rateLimit.middleware';
import { responseInterceptor } from './middlewares/responseInterceptor.middleware';
import { connectDatabase, migrateDatabase } from './config/database.config';
import { logger } from './utils/logger.util';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config';

// Import models to ensure they're registered before sync
import './models/index';

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
      origin: (origin, callback) => {
        // If no origin (e.g., local request, postman), allow it
        if (!origin) return callback(null, true);

        const allowedOrigins = config.cors.origin;

        if (allowedOrigins === '*') {
          callback(null, true);
        } else if (Array.isArray(allowedOrigins)) {
          if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        } else {
          callback(null, allowedOrigins === origin);
        }
      },
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

  // Response interceptor (format all JSON responses)
  app.use(responseInterceptor);

  // Request logging
  app.use(requestLogger);



  // API rate limiting
  app.use('/api', apiRateLimiter);

  // Activity tracking for nurses and admins (must be after authentication middleware)
  // Note: This will be applied in routes that use authenticate middleware
  // Import and use trackNurseAdminActivity in your route files after authenticate

  // API routes
  app.use(`/api/${config.apiVersion}`, routes);

  // Swagger Documentation
  app.use(`/api/${config.apiVersion}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

/**
 * Initialize application (database connection, etc.)
 * *****
 */
export const initializeApp = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Run database migrations (create tables if they don't exist)
    // Migrations will automatically run on startup and skip already executed ones
    await migrateDatabase();

    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', error as Error);
    throw error;
  }
};

// Export a singleton app instance for serverless environments
let appInstance: Application | null = null;

export const getApp = async (): Promise<Application> => {
  if (!appInstance) {
    await initializeApp();
    appInstance = await createApp();
  }
  return appInstance;
};

export default createApp;


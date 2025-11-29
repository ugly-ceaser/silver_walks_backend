import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Import models to ensure they're registered
import '../src/models/index';

// Import routes
import routes from '../src/routes/index';
import { requestLogger } from '../src/middlewares/logger.middleware';
import { errorHandler, notFoundHandler } from '../src/middlewares/error.middleware';
import { apiRateLimiter } from '../src/middlewares/rateLimit.middleware';
import { responseInterceptor } from '../src/middlewares/responseInterceptor.middleware';
import { config } from '../src/config/env.config';
import { connectDatabase, migrateDatabase } from '../src/config/database.config';
import { logger } from '../src/utils/logger.util';

let app: Application | null = null;
let isInitialized = false;

const initializeApp = async (): Promise<void> => {
  if (isInitialized) return;
  
  try {
    await connectDatabase();
    await migrateDatabase();
    isInitialized = true;
    logger.info('Serverless app initialized');
  } catch (error) {
    logger.error('Failed to initialize serverless app', error as Error);
    throw error;
  }
};

const createApp = async (): Promise<Application> => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(responseInterceptor);
  app.use(requestLogger);
  
  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({ 
      success: true, 
      message: 'Silver Walks API is running',
      version: config.apiVersion,
      environment: config.env,
      timestamp: new Date().toISOString()
    });
  });
  
  app.use('/api', apiRateLimiter);
  app.use(`/api/${config.apiVersion}`, routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
  try {
    if (!app) {
      await initializeApp();
      app = await createApp();
    }

    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export default handler;

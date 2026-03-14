import { createApp, initializeApp } from './app';
import { config } from './config/env.config';
import { logger } from './utils/logger.util';

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Initialize application (database, etc.)
    await initializeApp();

    // Create Express app
    const app = await createApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`, {
        env: config.env,
        apiVersion: config.apiVersion,
      });
      console.log('--- Server listen callback executed ---');
    });

    server.on('close', () => console.log('--- Server instance emitted "close" ---'));
    server.on('error', (err) => console.error('--- Server instance emitted "error" ---', err));


    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', reason as Error);
      gracefulShutdown('unhandledRejection');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      gracefulShutdown('uncaughtException');
    });

    console.log('--- reached end of startServer try block ---');
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

export default startServer;


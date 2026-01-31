import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env.config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Silver Walks API Documentation',
      version: '1.0.0',
      description: 'A comprehensive platform connecting elderly individuals with professional nurses for safe walking sessions.',
      contact: {
        name: 'Silver Walks Team',
        url: 'https://github.com/ugly-ceaser/silver_walks_backend',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}/api/${config.apiVersion}`,
        description: 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/modules/**/*.routes.ts', './src/modules/**/*.schemaValidator.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);

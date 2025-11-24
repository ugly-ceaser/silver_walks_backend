import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Derive __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  apiVersion: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  bcrypt: {
    saltRounds: number;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
  };
  points: {
    conversionRate: number; // Points to currency conversion rate
    minWithdrawal: number;
  };
  subscription: {
    plans: {
      basic: { price: number; walksPerMonth: number };
      standard: { price: number; walksPerMonth: number };
      premium: { price: number; walksPerMonth: number };
    };
  };
}

export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'silverwalks_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  pagination: {
    defaultLimit: parseInt(process.env.PAGINATION_DEFAULT_LIMIT || '20', 10),
    maxLimit: parseInt(process.env.PAGINATION_MAX_LIMIT || '100', 10),
  },

  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '5242880', 10), // 5MB
    allowedMimeTypes: process.env.UPLOAD_ALLOWED_MIME_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
    ],
  },

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@silverwalks.com',
  },

  points: {
    conversionRate: parseFloat(process.env.POINTS_CONVERSION_RATE || '0.01'), // 1 point = $0.01
    minWithdrawal: parseInt(process.env.MIN_WITHDRAWAL_POINTS || '1000', 10),
  },

  subscription: {
    plans: {
      basic: {
        price: parseFloat(process.env.BASIC_PLAN_PRICE || '29.99'),
        walksPerMonth: parseInt(process.env.BASIC_PLAN_WALKS || '4', 10),
      },
      standard: {
        price: parseFloat(process.env.STANDARD_PLAN_PRICE || '49.99'),
        walksPerMonth: parseInt(process.env.STANDARD_PLAN_WALKS || '8', 10),
      },
      premium: {
        price: parseFloat(process.env.PREMIUM_PLAN_PRICE || '79.99'),
        walksPerMonth: parseInt(process.env.PREMIUM_PLAN_WALKS || '16', 10),
      },
    },
  },
};

// Validate required environment variables
const validateConfig = (): void => {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0 && config.env === 'production') {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
  }

  if (missingVars.length > 0 && config.env === 'development') {
    console.warn('⚠️  Missing environment variables (using defaults):', missingVars.join(', '));
  }
};

// Run validation
validateConfig();

export default config;
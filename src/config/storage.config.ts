import { config } from './env.config';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder?: string; // Default folder for uploads
}

export interface StorageConfig {
  provider: 'local' | 'cloudinary' | 's3' | 'gcs' | 'azure';
  cloudinary?: CloudinaryConfig;
}

export const storageConfig: StorageConfig = {
  provider: (process.env.STORAGE_PROVIDER as StorageConfig['provider']) || 'cloudinary',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'silver-walks',
  },
};

// Validate Cloudinary config if provider is cloudinary
if (storageConfig.provider === 'cloudinary') {
  const required = ['cloudName', 'apiKey', 'apiSecret'];
  const missing = required.filter(
    (key) => !storageConfig.cloudinary?.[key as keyof CloudinaryConfig]
  );

  if (missing.length > 0 && config.env === 'production') {
    throw new Error(
      `Missing required Cloudinary environment variables: ${missing
        .map((key) => `CLOUDINARY_${key.toUpperCase()}`)
        .join(', ')}`
    );
  }
}

export default storageConfig;


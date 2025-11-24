import { v2 as cloudinary } from 'cloudinary';
import { storageConfig } from '../config/storage.config';
import { logger } from '../utils/logger.util';
import { AppError, ErrorCode } from '../utils/error.util';

// Configure Cloudinary
if (storageConfig.provider === 'cloudinary' && storageConfig.cloudinary) {
  cloudinary.config({
    cloud_name: storageConfig.cloudinary.cloudName,
    api_key: storageConfig.cloudinary.apiKey,
    api_secret: storageConfig.cloudinary.apiSecret,
    secure: true, // Use HTTPS
  });
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  transformation?: any; // Cloudinary transformation options
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  overwrite?: boolean;
  invalidate?: boolean;
}

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  resourceType: string;
}

/**
 * Upload file buffer to Cloudinary
 */
export const uploadToCloudinary = async (
  file: Express.Multer.File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  if (storageConfig.provider !== 'cloudinary') {
    throw new AppError(
      'Cloudinary is not configured as storage provider',
      500,
      ErrorCode.INTERNAL_ERROR
    );
  }

  try {
    const uploadOptions: any = {
      folder: options.folder || storageConfig.cloudinary?.folder || 'silver-walks',
      resource_type: options.resourceType || 'auto',
      overwrite: options.overwrite ?? false,
      invalidate: options.invalidate ?? true,
      ...(options.publicId && { public_id: options.publicId }),
      ...(options.transformation && { transformation: options.transformation }),
    };

    // Upload file buffer
    const result = await new Promise<UploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload error', error);
            reject(error);
          } else if (result) {
            resolve({
              url: result.url,
              secureUrl: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              width: result.width,
              height: result.height,
              bytes: result.bytes,
              resourceType: result.resource_type,
            });
          } else {
            reject(new Error('Upload failed: No result returned'));
          }
        }
      );

      uploadStream.end(file.buffer);
    });

    logger.info('File uploaded to Cloudinary', {
      publicId: result.publicId,
      url: result.secureUrl,
    });

    return result;
  } catch (error) {
    logger.error('Failed to upload file to Cloudinary', error as Error);
    throw new AppError(
      'Failed to upload file',
      500,
      ErrorCode.EXTERNAL_SERVICE_ERROR
    );
  }
};

/**
 * Upload multiple files to Cloudinary
 */
export const uploadMultipleToCloudinary = async (
  files: Express.Multer.File[],
  options: UploadOptions = {}
): Promise<UploadResult[]> => {
  const uploadPromises = files.map((file) => uploadToCloudinary(file, options));
  return Promise.all(uploadPromises);
};

/**
 * Delete file from Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  if (storageConfig.provider !== 'cloudinary') {
    throw new AppError(
      'Cloudinary is not configured as storage provider',
      500,
      ErrorCode.INTERNAL_ERROR
    );
  }

  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info('File deleted from Cloudinary', { publicId });
  } catch (error) {
    logger.error('Failed to delete file from Cloudinary', error as Error);
    throw new AppError(
      'Failed to delete file',
      500,
      ErrorCode.EXTERNAL_SERVICE_ERROR
    );
  }
};

/**
 * Generate optimized image URL with transformations
 */
export const getOptimizedImageUrl = (
  publicId: string,
  transformations?: any
): string => {
  if (storageConfig.provider !== 'cloudinary') {
    throw new AppError(
      'Cloudinary is not configured as storage provider',
      500,
      ErrorCode.INTERNAL_ERROR
    );
  }

  return cloudinary.url(publicId, {
    secure: true,
    ...transformations,
  });
};


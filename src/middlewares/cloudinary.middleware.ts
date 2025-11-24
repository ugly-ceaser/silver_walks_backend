import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { config } from '../config/env.config';
import { ValidationError } from '../utils/error.util';
import {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  UploadOptions,
  UploadResult,
} from '../services/storage.service';
import { storageConfig } from '../config/storage.config';

// Extend Express Request to include uploaded file URLs
declare global {
  namespace Express {
    interface Request {
      uploadedFile?: UploadResult;
      uploadedFiles?: UploadResult[];
    }
  }
}

// Memory storage for Cloudinary (files are uploaded directly from memory)
const memoryStorage = multer.memoryStorage();

// File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  // Check MIME type
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ValidationError(
        `File type not allowed. Allowed types: ${config.upload.allowedMimeTypes.join(', ')}`
      )
    );
  }
};

// Base multer configuration
const baseMulterConfig = {
  storage: memoryStorage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter,
};

/**
 * Cloudinary upload middleware for single file
 * Uploads file to Cloudinary and attaches result to req.uploadedFile
 */
export const uploadToCloudinarySingle = (
  fieldName: string = 'file',
  options: UploadOptions = {}
) => {
  const multerMiddleware = multer(baseMulterConfig).single(fieldName);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // First, handle multer upload to memory
    multerMiddleware(req, res, async (err) => {
      if (err) {
        return next(err);
      }

      // Check if file exists
      if (!req.file) {
        return next(new ValidationError(`No file provided in field: ${fieldName}`));
      }

      // Check if Cloudinary is configured
      if (storageConfig.provider !== 'cloudinary') {
        return next(
          new ValidationError('Cloudinary is not configured as storage provider')
        );
      }

      try {
        // Upload to Cloudinary
        const result = await uploadToCloudinary(req.file, options);
        
        // Attach result to request
        req.uploadedFile = result;
        
        next();
      } catch (error) {
        next(error);
      }
    });
  };
};

/**
 * Cloudinary upload middleware for multiple files
 * Uploads files to Cloudinary and attaches results to req.uploadedFiles
 */
export const uploadToCloudinaryMultiple = (
  fieldName: string = 'files',
  maxCount: number = 5,
  options: UploadOptions = {}
) => {
  const multerMiddleware = multer(baseMulterConfig).array(fieldName, maxCount);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // First, handle multer upload to memory
    multerMiddleware(req, res, async (err) => {
      if (err) {
        return next(err);
      }

      // Check if files exist
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return next(new ValidationError(`No files provided in field: ${fieldName}`));
      }

      // Check if Cloudinary is configured
      if (storageConfig.provider !== 'cloudinary') {
        return next(
          new ValidationError('Cloudinary is not configured as storage provider')
        );
      }

      try {
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        
        // Upload to Cloudinary
        const results = await uploadMultipleToCloudinary(files, options);
        
        // Attach results to request
        req.uploadedFiles = results;
        
        next();
      } catch (error) {
        next(error);
      }
    });
  };
};

/**
 * Cloudinary upload middleware for multiple fields
 * Uploads files to Cloudinary and attaches results to req.uploadedFiles
 */
export const uploadToCloudinaryFields = (
  fields: Array<{ name: string; maxCount?: number }>,
  options: UploadOptions = {}
) => {
  const multerMiddleware = multer(baseMulterConfig).fields(fields);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // First, handle multer upload to memory
    multerMiddleware(req, res, async (err) => {
      if (err) {
        return next(err);
      }

      // Check if files exist
      if (!req.files || Object.keys(req.files).length === 0) {
        return next(new ValidationError('No files provided'));
      }

      // Check if Cloudinary is configured
      if (storageConfig.provider !== 'cloudinary') {
        return next(
          new ValidationError('Cloudinary is not configured as storage provider')
        );
      }

      try {
        // Get all files from all fields
        const allFiles: Express.Multer.File[] = [];
        const fileMap: Record<string, UploadResult[]> = {};

        for (const field of fields) {
          const fieldFiles = (req.files as { [fieldname: string]: Express.Multer.File[] })[field.name] || [];
          
          if (fieldFiles.length > 0) {
            const results = await uploadMultipleToCloudinary(fieldFiles, options);
            fileMap[field.name] = results;
            allFiles.push(...fieldFiles);
          }
        }

        // Attach results to request
        req.uploadedFiles = Object.values(fileMap).flat();
        (req as any).uploadedFilesByField = fileMap;
        
        next();
      } catch (error) {
        next(error);
      }
    });
  };
};

/**
 * Pre-configured middleware for profile picture upload
 */
export const uploadProfilePictureToCloudinary = (options?: UploadOptions) => {
  return uploadToCloudinarySingle('profile_picture', {
    folder: 'profile-pictures',
    transformation: {
      width: 500,
      height: 500,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
      fetch_format: 'auto',
    },
    ...options,
  });
};

/**
 * Pre-configured middleware for document upload
 */
export const uploadDocumentToCloudinary = (options?: UploadOptions) => {
  return uploadToCloudinarySingle('document', {
    folder: 'documents',
    resourceType: 'raw',
    ...options,
  });
};

/**
 * Pre-configured middleware for multiple images upload
 */
export const uploadImagesToCloudinary = (
  maxCount: number = 5,
  options?: UploadOptions
) => {
  return uploadToCloudinaryMultiple('images', maxCount, {
    folder: 'images',
    transformation: {
      quality: 'auto',
      fetch_format: 'auto',
    },
    ...options,
  });
};

/**
 * Error handler for multer errors in Cloudinary middleware
 */
export const handleCloudinaryUploadError = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new ValidationError(
          `File size exceeds maximum allowed size of ${config.upload.maxFileSize} bytes`
        )
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new ValidationError('Too many files uploaded'));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ValidationError('Unexpected file field'));
    }
    return next(new ValidationError(`Upload error: ${err.message}`));
  }

  next(err);
};


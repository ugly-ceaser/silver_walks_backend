import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { config } from '../config/env.config';
import { ValidationError } from '../utils/error.util';
import path from 'path';

// Configure storage
const storage: StorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    // In production, you might want to use cloud storage (S3, etc.)
    // For now, using local storage
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// Memory storage (for processing files in memory)
const memoryStorage = multer.memoryStorage();

// File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
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
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter,
};

/**
 * Single file upload middleware
 */
export const uploadSingle = (fieldName: string = 'file') => {
  return multer({
    ...baseMulterConfig,
    storage,
  }).single(fieldName);
};

/**
 * Multiple files upload middleware
 */
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) => {
  return multer({
    ...baseMulterConfig,
    storage,
  }).array(fieldName, maxCount);
};

/**
 * Multiple fields upload middleware
 */
export const uploadFields = (fields: Array<{ name: string; maxCount?: number }>) => {
  return multer({
    ...baseMulterConfig,
    storage,
  }).fields(fields);
};

/**
 * Memory upload (for processing files in memory before uploading to cloud)
 */
export const uploadMemory = (fieldName: string = 'file') => {
  return multer({
    ...baseMulterConfig,
    storage: memoryStorage,
  }).single(fieldName);
};

/**
 * Profile picture upload middleware
 */
export const uploadProfilePicture = uploadSingle('profile_picture');

/**
 * Document upload middleware
 */
export const uploadDocument = uploadSingle('document');

/**
 * Multiple images upload middleware
 */
export const uploadImages = (maxCount: number = 5) => {
  return uploadMultiple('images', maxCount);
};

/**
 * Error handler for multer errors
 */
export const handleUploadError = (
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


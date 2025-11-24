/**
 * EXAMPLE USAGE OF CLOUDINARY MIDDLEWARE
 * 
 * This file shows how to use the Cloudinary upload middleware in your routes.
 * Delete this file after reviewing the examples.
 */

import { Router, Request, Response } from 'express';
import {
  uploadToCloudinarySingle,
  uploadToCloudinaryMultiple,
  uploadProfilePictureToCloudinary,
  uploadImagesToCloudinary,
  handleCloudinaryUploadError,
} from './cloudinary.middleware';
import { asyncHandler } from '../utils/error.util';

const router = Router();

/**
 * Example 1: Single file upload
 * After upload, the file URL will be available in req.uploadedFile
 */
router.post(
  '/upload-single',
  uploadToCloudinarySingle('file', {
    folder: 'custom-folder',
    transformation: {
      width: 800,
      height: 600,
      crop: 'limit',
      quality: 'auto',
    },
  }),
  handleCloudinaryUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    // Access uploaded file info
    const file = req.uploadedFile;
    
    res.json({
      success: true,
      data: {
        url: file?.secureUrl,
        publicId: file?.publicId,
        width: file?.width,
        height: file?.height,
        format: file?.format,
      },
    });
  })
);

/**
 * Example 2: Multiple files upload
 * After upload, file URLs will be available in req.uploadedFiles (array)
 */
router.post(
  '/upload-multiple',
  uploadToCloudinaryMultiple('files', 5, {
    folder: 'gallery',
  }),
  handleCloudinaryUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    // Access uploaded files
    const files = req.uploadedFiles || [];
    
    res.json({
      success: true,
      data: files.map((file) => ({
        url: file.secureUrl,
        publicId: file.publicId,
        format: file.format,
      })),
    });
  })
);

/**
 * Example 3: Profile picture upload (pre-configured)
 * Automatically applies face detection and cropping
 */
router.post(
  '/profile-picture',
  uploadProfilePictureToCloudinary(),
  handleCloudinaryUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.uploadedFile;
    
    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        url: file?.secureUrl,
        publicId: file?.publicId,
      },
    });
  })
);

/**
 * Example 4: Multiple images upload (pre-configured)
 */
router.post(
  '/images',
  uploadImagesToCloudinary(10), // Max 10 images
  handleCloudinaryUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.uploadedFiles || [];
    
    res.json({
      success: true,
      message: `${files.length} images uploaded successfully`,
      data: files.map((file) => file.secureUrl),
    });
  })
);

/**
 * Example 5: Custom upload with specific folder and transformations
 */
router.post(
  '/custom-upload',
  uploadToCloudinarySingle('image', {
    folder: 'products',
    transformation: {
      width: 1200,
      height: 1200,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto:best',
      fetch_format: 'auto',
      format: 'jpg',
    },
    overwrite: false,
    invalidate: true,
  }),
  handleCloudinaryUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.uploadedFile;
    
    res.json({
      success: true,
      data: {
        url: file?.secureUrl,
        publicId: file?.publicId,
        metadata: {
          width: file?.width,
          height: file?.height,
          format: file?.format,
          size: file?.bytes,
        },
      },
    });
  })
);

export default router;


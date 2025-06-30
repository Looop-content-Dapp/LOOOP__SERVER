import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from './errorHandler';

// Configure Cloudinary storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face'
      }
    ],
    resource_type: 'image'
  } as any
});

// File filter for avatar uploads
const avatarFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

// Create multer upload instance for avatars
const upload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only allow one file
  },
  fileFilter: avatarFileFilter
});

// Middleware for uploading avatar
export const asyncUploadAvatar = asyncHandler(upload.single('avatar'));

// Middleware to handle upload errors and return secure URL + public_id
export const handleAvatarUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  // Extract information from the uploaded file
  const uploadedFile = req.file as Express.Multer.File & {
    filename: string;
    path: string;
  };

  // Add upload result to request object for use in route handlers
  req.uploadResult = {
    secure_url: uploadedFile.path,
    public_id: uploadedFile.filename,
    resource_type: 'image',
    format: uploadedFile.mimetype.split('/')[1],
    bytes: uploadedFile.size
  };

  next();
};

// Utility function to delete avatar from Cloudinary
export const deleteAvatar = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting avatar from Cloudinary:', error);
    return false;
  }
};

// Types for TypeScript
declare global {
  namespace Express {
    interface Request {
      uploadResult?: {
        secure_url: string;
        public_id: string;
        resource_type: string;
        format: string;
        bytes: number;
      };
    }
  }
}

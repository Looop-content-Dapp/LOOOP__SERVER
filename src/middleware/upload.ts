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
export const handleAvatarUpload = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
    return;
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

// Configure Cloudinary storage for artist profile images
const artistProfileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'artist-profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      {
        width: 800,
        height: 800,
        crop: 'fill',
        gravity: 'face'
      }
    ],
    resource_type: 'image'
  } as any
});

// File filter for artist profile images (same as avatar)
const artistProfileFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

// Create multer upload instance for artist profile images
const artistProfileUpload = multer({
  storage: artistProfileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for artist profiles
    files: 1 // Only allow one file
  },
  fileFilter: artistProfileFileFilter
});

// Middleware for uploading artist profile image
export const asyncUploadArtistProfile = (req: Request, res: Response, next: NextFunction) => {
  artistProfileUpload.single('profileImage')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'File too large. Maximum size is 10MB.'
          }
        });
      }
      
      if (err.message === 'Unexpected field') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid field name. Please use "profileImage" as the field name for your file upload.'
          }
        });
      }
      
      if (err.message.includes('Invalid file type')) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
          }
        });
      }
      
      return res.status(400).json({
        success: false,
        error: {
          message: err.message || 'File upload failed'
        }
      });
    }
    next();
  });
};

// Middleware to handle artist profile upload errors and return secure URL + public_id
export const handleArtistProfileUpload = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: {
        message: 'No file uploaded. Please include a file with field name "profileImage".'
      }
    });
    return;
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

// Utility function to delete artist profile image from Cloudinary
export const deleteArtistProfile = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting artist profile image from Cloudinary:', error);
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

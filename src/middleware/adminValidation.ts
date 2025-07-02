import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { LOOOP_ADMIN_DOMAIN } from '@/types/admin.types';

/**
 * Validation for admin registration
 */
export const validateAdminRegistration = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),

  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .custom((value) => {
      if (!value.endsWith(LOOOP_ADMIN_DOMAIN)) {
        throw new Error(`Admin email must end with ${LOOOP_ADMIN_DOMAIN}`);
      }
      return true;
    }),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('adminLevel')
    .isIn(['MODERATOR', 'ADMIN', 'SUPER_ADMIN'])
    .withMessage('Valid admin level is required'),

  body('justification')
    .notEmpty()
    .withMessage('Justification for admin access is required')
    .isLength({ min: 20, max: 500 })
    .withMessage('Justification must be between 20 and 500 characters')
    .trim(),

  body('requestedPermissions')
    .optional()
    .isArray()
    .withMessage('Requested permissions must be an array'),

  body('requestedPermissions.*')
    .optional()
    .isString()
    .withMessage('Each permission must be a string')
];

/**
 * Validation for admin approval
 */
export const validateAdminApproval = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string'),

  body('adminLevel')
    .optional()
    .isIn(['MODERATOR', 'ADMIN', 'SUPER_ADMIN'])
    .withMessage('Valid admin level is required'),

  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),

  body('permissions.*')
    .optional()
    .isString()
    .withMessage('Each permission must be a string')
];

/**
 * Validation for updating admin permissions
 */
export const validatePermissionUpdate = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string'),

  body('permissions')
    .isArray({ min: 1 })
    .withMessage('At least one permission is required'),

  body('permissions.*')
    .isString()
    .withMessage('Each permission must be a string')
    .isIn([
      'canApproveArtistClaims',
      'canManageUsers',
      'canCreatePlaylists',
      'canModerateContent',
      'canManageAdmins',
      'canViewAnalytics',
      'canManageSystem',
      'canDeleteContent',
      'canBanUsers',
      'canManagePayments'
    ])
    .withMessage('Invalid permission')
];

/**
 * Validation for admin playlist creation
 */
export const validateAdminPlaylistCreation = [
  body('title')
    .notEmpty()
    .withMessage('Playlist title is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .trim(),

  body('isPublic')
    .isBoolean()
    .withMessage('isPublic must be a boolean'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),

  body('trackIds')
    .isArray({ min: 1 })
    .withMessage('At least one track is required'),

  body('trackIds.*')
    .isString()
    .withMessage('Each track ID must be a string'),

  body('artworkUrl')
    .optional()
    .isURL()
    .withMessage('Valid artwork URL is required'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .isString()
    .withMessage('Each tag must be a string')
];

/**
 * Validation for user banning
 */
export const validateUserBan = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string'),

  body('reason')
    .notEmpty()
    .withMessage('Ban reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters')
    .trim(),

  body('duration')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Duration must be between 1 and 365 days'),

  body('permanent')
    .optional()
    .isBoolean()
    .withMessage('Permanent must be a boolean')
];

/**
 * Validation for user ID parameter
 */
export const validateUserId = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string')
];

/**
 * Handle validation errors
 */
export const handleAdminValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'general',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errorMessages
      }
    });
    return;
  }

  next();
};

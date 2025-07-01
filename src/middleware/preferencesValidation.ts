import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

/**
 * Validation rules for user preferences
 */
export const validateUserPreferences = [
  // Notifications validation
  body('preferences.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification setting must be a boolean'),
  
  body('preferences.notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification setting must be a boolean'),
  
  body('preferences.notifications.newFollowers')
    .optional()
    .isBoolean()
    .withMessage('New followers notification setting must be a boolean'),
  
  body('preferences.notifications.newComments')
    .optional()
    .isBoolean()
    .withMessage('New comments notification setting must be a boolean'),
  
  body('preferences.notifications.newLikes')
    .optional()
    .isBoolean()
    .withMessage('New likes notification setting must be a boolean'),
  
  body('preferences.notifications.trackUpdates')
    .optional()
    .isBoolean()
    .withMessage('Track updates notification setting must be a boolean'),

  // Privacy validation
  body('preferences.privacy.profileVisibility')
    .optional()
    .isIn(['public', 'private', 'friends'])
    .withMessage('Profile visibility must be one of: public, private, friends'),
  
  body('preferences.privacy.showEmail')
    .optional()
    .isBoolean()
    .withMessage('Show email setting must be a boolean'),
  
  body('preferences.privacy.showLastSeen')
    .optional()
    .isBoolean()
    .withMessage('Show last seen setting must be a boolean'),
  
  body('preferences.privacy.allowMessages')
    .optional()
    .isBoolean()
    .withMessage('Allow messages setting must be a boolean'),

  // Audio validation
  body('preferences.audio.quality')
    .optional()
    .isIn(['low', 'medium', 'high', 'lossless'])
    .withMessage('Audio quality must be one of: low, medium, high, lossless'),
  
  body('preferences.audio.autoplay')
    .optional()
    .isBoolean()
    .withMessage('Autoplay setting must be a boolean'),
  
  body('preferences.audio.crossfade')
    .optional()
    .isBoolean()
    .withMessage('Crossfade setting must be a boolean'),
  
  body('preferences.audio.crossfadeDuration')
    .optional()
    .isInt({ min: 0, max: 12 })
    .withMessage('Crossfade duration must be an integer between 0 and 12 seconds'),

  // Display validation
  body('preferences.display.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be one of: light, dark, auto'),
  
  body('preferences.display.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .matches(/^[a-z]{2}(-[A-Z]{2})?$/)
    .withMessage('Language must be a valid language code (e.g., "en", "en-US")'),
  
  body('preferences.display.compactMode')
    .optional()
    .isBoolean()
    .withMessage('Compact mode setting must be a boolean'),

  // Custom validation to ensure at least one preference is provided
  body('preferences')
    .notEmpty()
    .withMessage('Preferences object is required')
    .custom((value) => {
      if (!value || typeof value !== 'object') {
        throw new Error('Preferences must be an object');
      }
      
      const hasValidSection = 
        (value.notifications && typeof value.notifications === 'object') ||
        (value.privacy && typeof value.privacy === 'object') ||
        (value.audio && typeof value.audio === 'object') ||
        (value.display && typeof value.display === 'object');
      
      if (!hasValidSection) {
        throw new Error('At least one preference section (notifications, privacy, audio, display) must be provided');
      }
      
      return true;
    })
];

/**
 * Validation middleware for partial preferences updates
 */
export const validatePartialPreferences = [
  // Allow any subset of preferences to be updated
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),

  // Notifications validation (all optional)
  body('preferences.notifications')
    .optional()
    .isObject()
    .withMessage('Notifications preferences must be an object'),

  body('preferences.notifications.*')
    .optional()
    .isBoolean()
    .withMessage('All notification settings must be boolean values'),

  // Privacy validation (all optional)
  body('preferences.privacy')
    .optional()
    .isObject()
    .withMessage('Privacy preferences must be an object'),

  body('preferences.privacy.profileVisibility')
    .optional()
    .isIn(['public', 'private', 'friends'])
    .withMessage('Profile visibility must be one of: public, private, friends'),

  // Audio validation (all optional)
  body('preferences.audio')
    .optional()
    .isObject()
    .withMessage('Audio preferences must be an object'),

  body('preferences.audio.quality')
    .optional()
    .isIn(['low', 'medium', 'high', 'lossless'])
    .withMessage('Audio quality must be one of: low, medium, high, lossless'),

  // Display validation (all optional)
  body('preferences.display')
    .optional()
    .isObject()
    .withMessage('Display preferences must be an object'),

  body('preferences.display.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be one of: light, dark, auto'),

  body('preferences.display.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .matches(/^[a-z]{2}(-[A-Z]{2})?$/)
    .withMessage('Language must be a valid language code (e.g., "en", "en-US")')
];

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'general',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errorMessages
      }
    });
  }
  
  next();
};

/**
 * Combined validation middleware for preferences updates
 */
export const validatePreferencesUpdate = [
  ...validatePartialPreferences,
  handleValidationErrors
];

/**
 * Combined validation middleware for full preferences validation
 */
export const validateFullPreferences = [
  ...validateUserPreferences,
  handleValidationErrors
];

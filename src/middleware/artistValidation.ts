import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation rules for artist profile updates
 */
export const validateArtistProfile = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Artist name must be between 2 and 100 characters'),

  body('biography')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Biography must be 1000 characters or less'),

  body('websiteurl')
    .optional()
    .isURL()
    .withMessage('Website URL must be a valid URL'),

  body('address1')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Address line 1 must be 255 characters or less'),

  body('address2')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Address line 2 must be 255 characters or less'),

  body('country')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Country must be 100 characters or less'),

  body('postalcode')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Postal code must be 20 characters or less'),

  body('city')
    .optional()
    .isLength({ max: 100 })
    .withMessage('City must be 100 characters or less'),

  body('socialLinks')
    .optional()
    .isObject()
    .withMessage('Social links must be an object'),

  body('socialLinks.*.url')
    .optional()
    .isURL()
    .withMessage('Social link URLs must be valid URLs'),

  body('genres')
    .optional()
    .isArray()
    .withMessage('Genres must be an array'),

  body('genres.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each genre must be a string between 1 and 50 characters'),

  body('labels')
    .optional()
    .isArray()
    .withMessage('Labels must be an array'),

  body('labels.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each label must be a string between 1 and 100 characters')
];

/**
 * Validation rules for artist claim requests
 */
export const validateArtistClaim = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('artistId')
    .notEmpty()
    .isString()
    .withMessage('Artist ID is required'),

  body('evidenceUrl')
    .optional()
    .isURL()
    .withMessage('Evidence URL must be a valid URL if provided')
];

/**
 * Validation rules for artist search
 */
export const validateArtistSearch = [
  query('q')
    .notEmpty()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

/**
 * Validation rules for artist ID parameter
 */
export const validateArtistId = [
  param('artistId')
    .notEmpty()
    .isString()
    .withMessage('Artist ID is required')
];

/**
 * Validation rules for claim ID parameter
 */
export const validateClaimId = [
  param('claimId')
    .notEmpty()
    .isString()
    .withMessage('Claim ID is required')
];

/**
 * Validation rules for claim rejection
 */
export const validateClaimRejection = [
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Rejection reason must be 500 characters or less')
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


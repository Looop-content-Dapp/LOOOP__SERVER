import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation rules for creating NFT collection
 */
export const validateCreateCollection = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('communityId')
    .notEmpty()
    .isString()
    .withMessage('Community ID is required'),

  body('name')
    .notEmpty()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Collection name must be between 2 and 100 characters'),

  body('symbol')
    .notEmpty()
    .isString()
    .isLength({ min: 2, max: 10 })
    .withMessage('Collection symbol must be between 2 and 10 characters'),

  body('pricePerMonth')
    .isNumeric()
    .isFloat({ min: 0.01 })
    .withMessage('Price per month must be a positive number'),

  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),

  body('maxSupply')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max supply must be a positive integer'),

  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL')
];

/**
 * Validation rules for minting NFT
 */
export const validateMintNFT = [
  body('userEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid user email is required'),

  body('communityId')
    .notEmpty()
    .isString()
    .withMessage('Community ID is required')
];

/**
 * Validation rules for renewing membership
 */
export const validateRenewMembership = [
  body('userEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid user email is required'),

  body('membershipId')
    .notEmpty()
    .isString()
    .withMessage('Membership ID is required')
];

/**
 * Validation rules for checking community access
 */
export const validateCommunityAccess = [
  param('userId')
    .notEmpty()
    .isString()
    .withMessage('User ID is required'),

  param('communityId')
    .notEmpty()
    .isString()
    .withMessage('Community ID is required')
];

/**
 * Validation rules for user memberships
 */
export const validateUserMemberships = [
  param('userId')
    .notEmpty()
    .isString()
    .withMessage('User ID is required'),

  query('status')
    .optional()
    .isIn(['active', 'expired', 'all'])
    .withMessage('Status must be active, expired, or all')
];

/**
 * Validation rules for transaction history
 */
export const validateTransactionHistory = [
  param('userId')
    .notEmpty()
    .isString()
    .withMessage('User ID is required'),

  query('type')
    .optional()
    .isString()
    .withMessage('Type must be a string'),

  query('status')
    .optional()
    .isString()
    .withMessage('Status must be a string'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

/**
 * Validation rules for artist analytics
 */
export const validateArtistAnalytics = [
  param('artistId')
    .notEmpty()
    .isString()
    .withMessage('Artist ID is required'),

  query('period')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Period must be between 1 and 365 days')
];

/**
 * Validation rules for community analytics
 */
export const validateCommunityAnalytics = [
  param('communityId')
    .notEmpty()
    .isString()
    .withMessage('Community ID is required'),

  query('period')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Period must be between 1 and 365 days')
];

/**
 * Validation rules for community ID parameter
 */
export const validateCommunityId = [
  param('communityId')
    .notEmpty()
    .isString()
    .withMessage('Community ID is required')
];

/**
 * Validation rules for cron job trigger
 */
export const validateCronJobTrigger = [
  body('jobName')
    .notEmpty()
    .isString()
    .isIn([
      'check-expired-memberships',
      'send-renewal-reminders', 
      'auto-renew-memberships',
      'update-daily-analytics',
      'run-all-daily-jobs'
    ])
    .withMessage('Invalid job name')
];

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
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

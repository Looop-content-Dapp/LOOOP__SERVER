import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

/**
 * Validation middleware for comprehensive artist claim submission
 */
export const validateArtistClaimSubmission = [
  // Artist information
  body('artistName')
    .notEmpty()
    .withMessage('Artist name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Artist name must be between 1 and 100 characters'),

  body('artistId')
    .optional()
    .isString()
    .withMessage('Artist ID must be a string'),

  // Role and connection
  body('role')
    .isIn(['artist', 'manager', 'label_rep', 'band_member', 'producer', 'publisher', 'booking_agent', 'other'])
    .withMessage('Valid role is required'),

  body('connectionDetails')
    .notEmpty()
    .withMessage('Connection details are required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Connection details must be between 10 and 500 characters'),

  // Personal information
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),

  body('phone')
    .if((value, { req }) => req.body.distributorInfo?.isVerified === true)
    .notEmpty()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required')
    .optional(),

  body('companyName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Company name must be less than 100 characters'),

  // Verification data
  body('officialEmail')
    .if((value, { req }) => req.body.distributorInfo?.isVerified === true)
    .notEmpty()
    .isEmail()
    .withMessage('Valid official email is required')
    .normalizeEmail()
    .optional(),

  body('websiteUrl')
    .if((value, { req }) => req.body.distributorInfo?.isVerified === true)
    .notEmpty()
    .isURL()
    .withMessage('Valid website URL is required')
    .optional(),

  body('socialLinks')
    .notEmpty()
    .isObject()
    .withMessage('Social links must be an object')
    .custom((value) => {
      // Check if at least one social media link is provided
      const hasAtLeastOneLink = Object.values(value || {}).some(link => !!link);
      if (!hasAtLeastOneLink) {
        throw new Error('At least one social media link is required for verification');
      }
      return true;
    }),

  body('socialLinks.instagram')
    .optional()
    .isURL()
    .withMessage('Valid Instagram URL is required'),

  body('socialLinks.twitter')
    .optional()
    .isURL()
    .withMessage('Valid Twitter URL is required'),

  body('socialLinks.tiktok')
    .optional()
    .isURL()
    .withMessage('Valid TikTok URL is required'),

  body('socialLinks.facebook')
    .optional()
    .isURL()
    .withMessage('Valid Facebook URL is required'),

  body('socialLinks.youtube')
    .optional()
    .isURL()
    .withMessage('Valid YouTube URL is required'),

  body('socialLinks.spotify')
    .optional()
    .isURL()
    .withMessage('Valid Spotify URL is required'),

  body('socialLinks.appleMusic')
    .optional()
    .isURL()
    .withMessage('Valid Apple Music URL is required'),

  body('socialLinks.website')
    .optional()
    .isURL()
    .withMessage('Valid website URL is required'),

  body('socialLinks.soundcloud')
    .optional()
    .isURL()
    .withMessage('Valid SoundCloud URL is required'),

  body('socialLinks.bandcamp')
    .optional()
    .isURL()
    .withMessage('Valid Bandcamp URL is required'),

  body('distributorInfo')
    .optional()
    .isObject()
    .withMessage('Distributor info must be an object'),

  body('distributorInfo.provider')
    .optional()
    .isIn(['distrokid', 'tunecore', 'awal', 'cd_baby', 'unitedmasters', 'ditto', 'amuse', 'other'])
    .withMessage('Valid distributor provider is required'),

  body('distributorInfo.accountEmail')
    .optional()
    .isEmail()
    .withMessage('Valid distributor account email is required'),

  body('distributorInfo.isVerified')
    .optional()
    .isBoolean()
    .withMessage('Distributor verification status must be boolean'),

  // Additional information
  body('additionalInfo')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Additional info must be less than 1000 characters'),

  // Legal agreements
  body('agreesToTerms')
    .isBoolean()
    .withMessage('Terms agreement must be boolean')
    .custom((value) => {
      if (!value) {
        throw new Error('You must agree to the terms and conditions');
      }
      return true;
    }),

  body('agreesToPrivacy')
    .isBoolean()
    .withMessage('Privacy policy agreement must be boolean')
    .custom((value) => {
      if (!value) {
        throw new Error('You must agree to the privacy policy');
      }
      return true;
    }),
];

/**
 * Validation for artist search
 */
export const validateArtistSearch = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .trim()
    .escape(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

/**
 * Validation for claim status update (admin)
 */
export const validateClaimStatusUpdate = [
  param('claimId')
    .notEmpty()
    .withMessage('Claim ID is required')
    .isString()
    .withMessage('Claim ID must be a string'),

  body('status')
    .isIn(['pending', 'under_review', 'approved', 'rejected', 'info_required'])
    .withMessage('Valid status is required'),

  body('reviewNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Review notes must be less than 1000 characters'),

  body('rejectionReason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Rejection reason must be less than 500 characters'),

  body('adminUserId')
    .optional()
    .isString()
    .withMessage('Admin user ID must be a string'),

  body('actionRequired')
    .optional()
    .isObject()
    .withMessage('Action required must be an object'),

  body('actionRequired.type')
    .optional()
    .isIn(['additional_info', 'verification', 'documentation'])
    .withMessage('Valid action type is required'),

  body('actionRequired.description')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('Action description must be between 10 and 500 characters'),

  body('actionRequired.deadline')
    .optional()
    .isISO8601()
    .withMessage('Valid deadline date is required')
];

/**
 * Validation for claim ID parameter
 */
export const validateClaimId = [
  param('claimId')
    .notEmpty()
    .withMessage('Claim ID is required')
    .isString()
    .withMessage('Claim ID must be a string')
];

/**
 * Validation for distributor verification
 */
export const validateDistributorVerification = [
  body('provider')
    .isIn(['distrokid', 'tunecore', 'awal', 'cd_baby', 'unitedmasters', 'ditto', 'amuse', 'other'])
    .withMessage('Valid distributor provider is required'),

  body('accountEmail')
    .isEmail()
    .withMessage('Valid account email is required')
    .normalizeEmail(),

  body('releaseIds')
    .optional()
    .isArray()
    .withMessage('Release IDs must be an array'),

  body('releaseIds.*')
    .optional()
    .isString()
    .withMessage('Each release ID must be a string'),

  body('verificationMethod')
    .isIn(['email', 'api', 'manual'])
    .withMessage('Valid verification method is required')
];

/**
 * Handle validation errors
 */
export const handleValidationErrors = (
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

/**
 * Legacy validation for backward compatibility
 */
export const validateLegacyArtistClaim = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),

  body('artistId')
    .notEmpty()
    .withMessage('Artist ID is required')
    .isString()
    .withMessage('Artist ID must be a string'),

  body('evidenceUrl')
    .optional()
    .isURL()
    .withMessage('Valid evidence URL is required')
];

/**
 * Validation for claim filters (admin dashboard)
 */
export const validateClaimFilters = [
  query('status')
    .optional()
    .isIn(['pending', 'under_review', 'approved', 'rejected', 'info_required'])
    .withMessage('Valid status filter is required'),

  query('role')
    .optional()
    .isIn(['artist', 'manager', 'label_rep', 'band_member', 'producer', 'publisher', 'booking_agent', 'other'])
    .withMessage('Valid role filter is required'),

  query('submissionType')
    .optional()
    .isIn(['manual', 'distributor_verified'])
    .withMessage('Valid submission type filter is required'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['submittedAt', 'reviewedAt', 'artistName', 'status'])
    .withMessage('Valid sort field is required'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Valid sort order is required'),

  query('artistName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Artist name filter must be between 1 and 100 characters'),

  query('claimantName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Claimant name filter must be between 1 and 100 characters'),

  query('dateRange.from')
    .optional()
    .isISO8601()
    .withMessage('Valid from date is required'),

  query('dateRange.to')
    .optional()
    .isISO8601()
    .withMessage('Valid to date is required')
];

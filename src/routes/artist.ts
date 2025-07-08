import { Router, Request, Response } from 'express';
import { requireAuth, optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { adminWithPermission } from '@/middleware/adminAuth';
import { asyncUploadArtistProfile, handleArtistProfileUpload } from '@/middleware/upload';
import {
  handleValidationErrors,
  validateArtistClaim,
  validateArtistProfile,
  validateClaimId,
  validateClaimRejection,
  validateArtistSearch,
  validateArtistId
} from '@/middleware/artistValidation';

// Enhanced validation middleware
import {
  validateArtistClaimSubmission,
  validateClaimStatusUpdate,
  validateLegacyArtistClaim,
  handleValidationErrors as handleNewValidationErrors
} from '@/middleware/artistClaimValidation';

// Import artist controllers
import {
  getArtistProfile,
  getMyArtistProfile,
  updateArtistProfile,
  searchArtists,
  uploadArtistProfileImage,
  removeArtistProfileImage
} from '@/controllers/artist/profile';

import {
  submitCreatorClaim,
  searchArtistsForClaim,
  updateClaimStatus,
  // Legacy controllers
  claimArtistProfile,
  getUserClaims,
  getClaimStatus
} from '@/controllers/artist/claims';

import {
  getArtistAnalytics,
  getMyArtistAnalytics,
  updateDailyAnalytics
} from '@/controllers/analytics/analytics';

const router: Router = Router();

// Public routes (no authentication required)
router.get('/search', validateArtistSearch, asyncHandler(searchArtists));
router.get('/profile/:artistId', validateArtistId, asyncHandler(getArtistProfile));
router.get('/analytics/:artistId',validateArtistId, asyncHandler(getArtistAnalytics));

// Protected routes (authentication required)
router.use(requireAuth);

// Artist profile management
router.get('/my-profile', asyncHandler(getMyArtistProfile));
router.put('/my-profile', validateArtistProfile, asyncHandler(handleValidationErrors), asyncHandler(updateArtistProfile));

// Artist profile image management
router.post('/profile/image', 
  asyncUploadArtistProfile,
  handleArtistProfileUpload,
  asyncHandler(uploadArtistProfileImage)
);
router.delete('/profile/image', asyncHandler(removeArtistProfileImage));

// Artist analytics for authenticated users
router.get('/my-analytics', asyncHandler(getMyArtistAnalytics));
router.post('/analytics/update', asyncHandler(updateDailyAnalytics));

// Step 1: Search for Artists
router.get('/claim/search', asyncHandler(searchArtistsForClaim));

// Step 2: Submit Comprehensive Claim (Legacy Format)
router.post('/claim/submit',
  validateArtistClaimSubmission,
  asyncHandler(submitCreatorClaim)
);

// Step 3: Get Claim Status
router.get('/claim/status', asyncHandler(getClaimStatus));

// Get user's claim history
router.get('/claims/my', asyncHandler(getUserClaims));

// Admin routes for claim management
router.put('/admin/claims/:claimId/status',
  requireAuth,
  adminWithPermission('canApproveArtistClaims'),
  validateClaimStatusUpdate,
  handleNewValidationErrors,
  asyncHandler(updateClaimStatus)
);

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Artist routes are operational',
    timestamp: new Date().toISOString(),
    features: {
      profiles: 'enabled',
      claims: 'enabled',
      analytics: 'enabled',
      search: 'enabled'
    }
  });
});

export default router;

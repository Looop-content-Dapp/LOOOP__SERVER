import { Router, Request, Response } from 'express';
import { requireAuth, optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
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
  searchArtists
} from '@/controllers/artist/profile';

import {
  // Enhanced controllers
  submitArtistClaim,
  searchArtistsForClaim,
  updateClaimStatus,
  // Legacy controllers
  claimArtistProfile,
  getUserClaims,
  getPendingClaims,
  approveArtistClaim,
  rejectArtistClaim,
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
router.put('/my-profile', validateArtistProfile,asyncHandler(handleValidationErrors), asyncHandler(updateArtistProfile));

// Artist analytics for authenticated users
router.get('/my-analytics', asyncHandler(getMyArtistAnalytics));
router.post('/analytics/update', asyncHandler(updateDailyAnalytics));

// Step 1: Search for Artists
router.get('/claim/search', asyncHandler(searchArtistsForClaim));

// Step 2: Submit Comprehensive Claim
router.post('/claim/submit',
  validateArtistClaimSubmission,
  handleNewValidationErrors,
  asyncHandler(submitArtistClaim)
);

// Step 3: Get Claim Status
router.get('/claim/status', asyncHandler(getClaimStatus));

// Get user's claim history
router.get('/claims/my', asyncHandler(getUserClaims));

// Admin routes for claim management
router.put('/admin/claims/:claimId/status',
  validateClaimStatusUpdate,
  handleNewValidationErrors,
  asyncHandler(updateClaimStatus)
);

// Legacy Artist claiming system (Backward compatibility)
router.post('/claim',
  validateLegacyArtistClaim,
  handleNewValidationErrors,
  asyncHandler(claimArtistProfile)
);

// Legacy Admin routes (TODO: Add admin middleware)
router.get('/admin/claims/pending', asyncHandler(getPendingClaims));
router.put('/admin/claims/:claimId/approve', validateClaimId, asyncHandler(handleValidationErrors), asyncHandler(approveArtistClaim));
router.put('/admin/claims/:claimId/reject',
  validateClaimId,
  validateClaimRejection,
  asyncHandler(handleValidationErrors),
  asyncHandler(rejectArtistClaim)
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

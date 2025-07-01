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

// Import artist controllers
import {
  getArtistProfile,
  getMyArtistProfile,
  updateArtistProfile,
  searchArtists
} from '@/controllers/artist/profile';

import {
  claimArtistProfile,
  getUserClaims,
  getPendingClaims,
  approveArtistClaim,
  rejectArtistClaim
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

// Artist claiming system
router.post('/claim', validateArtistClaim, asyncHandler(handleValidationErrors), asyncHandler(claimArtistProfile));
router.get('/my-claims', asyncHandler(getUserClaims));

// Admin routes (TODO: Add admin middleware)
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

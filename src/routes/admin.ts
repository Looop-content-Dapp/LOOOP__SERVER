import { Router, Request, Response } from 'express';
import { requireAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import {
  requireAdmin,
  requireSuperAdmin,
  adminWithPermission,
  validateAdminDomain
} from '@/middleware/adminAuth';

// Validation middleware
import {
  validateAdminRegistration,
  validateAdminApproval,
  validatePermissionUpdate,
  validateAdminPlaylistCreation,
  validateUserBan,
  validateUserId,
  handleAdminValidationErrors
} from '@/middleware/adminValidation';

// Controllers
import {
  registerAdmin,
  getDashboardStats,
  getAllAdmins,
  approveAdmin,
  updateAdminPermissions,
  createAdminPlaylist,
  getAdminProfile,
  banUser,
  getPendingAdminRegistrations,
  checkBootstrapStatus
} from '@/controllers/admin/admin.controller';
import { approveArtistClaim, getPendingClaims, rejectArtistClaim } from '@/controllers/artist/claims';
import { validateClaimId, validateClaimRejection } from '@/middleware/artistValidation';

const router: Router = Router();

// Bootstrap status check (public endpoint)
router.get('/bootstrap/status', asyncHandler(checkBootstrapStatus));

// Public admin registration (with domain validation)
router.post('/register',
  validateAdminRegistration,
  validateAdminDomain,
  handleAdminValidationErrors,
  asyncHandler(registerAdmin)
);

// Protected admin routes (require authentication and admin status)

// Get admin profile
router.get('/profile',
  requireAuth,
  requireAdmin,
  asyncHandler(getAdminProfile)
);

// Dashboard and statistics (any admin level)
router.get('/dashboard/stats',
  requireAuth,
  requireAdmin,
  asyncHandler(getDashboardStats)
);

// User management (requires canManageUsers permission)
router.post('/users/:userId/ban',
  requireAuth,
  adminWithPermission('canBanUsers'),
  validateUserBan,
  handleAdminValidationErrors,
  asyncHandler(banUser)
);

// Artist claim management (requires canApproveArtistClaims permission)
// These routes are now handled in the artist routes with proper middleware

// Playlist management (requires canCreatePlaylists permission)
router.post('/playlists',
  requireAuth,
  adminWithPermission('canCreatePlaylists'),
  validateAdminPlaylistCreation,
  handleAdminValidationErrors,
  asyncHandler(createAdminPlaylist)
);

// Admin management (Super Admin only)
router.get('/admins',
  requireAuth,
  requireSuperAdmin,
  asyncHandler(getAllAdmins)
);

router.get('/admins/pending',
  requireAuth,
  requireSuperAdmin,
  asyncHandler(getPendingAdminRegistrations)
);

router.post('/admins/:userId/approve',
  requireAuth,
  requireSuperAdmin,
  validateAdminApproval,
  handleAdminValidationErrors,
  asyncHandler(approveAdmin)
);

router.put('/admins/:userId/permissions',
  requireAuth,
  requireSuperAdmin,
  validatePermissionUpdate,
  handleAdminValidationErrors,
  asyncHandler(updateAdminPermissions)
);

router.get('/claims/pending', requireAuth, asyncHandler(getPendingClaims));
router.put('/claims/:claimId/approve', requireAuth, validateClaimId, asyncHandler(handleAdminValidationErrors), asyncHandler(approveArtistClaim));
router.put('/claims/:claimId/reject',
  requireAuth,
  validateClaimId,
  validateClaimRejection,
  asyncHandler(handleAdminValidationErrors),
  asyncHandler(rejectArtistClaim)
);


// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Admin routes are operational',
    timestamp: new Date().toISOString(),
    domain: '@looopmusic.com',
    features: {
      registration: 'enabled',
      dashboard: 'enabled',
      userManagement: 'enabled',
      playlistManagement: 'enabled',
      adminManagement: 'enabled'
    },
    adminLevels: {
      MODERATOR: {
        permissions: ['canModerateContent', 'canViewAnalytics'],
        description: 'Basic moderation and analytics access'
      },
      ADMIN: {
        permissions: [
          'canApproveArtistClaims',
          'canManageUsers',
          'canCreatePlaylists',
          'canModerateContent',
          'canViewAnalytics',
          'canDeleteContent'
        ],
        description: 'Full administrative access'
      },
      SUPER_ADMIN: {
        permissions: [
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
        ],
        description: 'Complete system access'
      }
    }
  });
});

export default router;

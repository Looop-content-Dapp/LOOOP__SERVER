import { Router, Request, Response } from 'express';
import { requireAuth, optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import {  asyncUploadAvatar, handleAvatarUpload } from '@/middleware/upload';

// Import user controllers
import {
  getUserProfile,
  updateUserProfile,
  getUserPreferences,
  updateUserPreferences,
  getUserStats,
  deleteUserAccount
} from '@/controllers/user/profile';

const router: Router = Router();

// All user routes require authentication
router.use(requireAuth);

// Profile management
router.get('/profile', asyncHandler(getUserProfile));
router.put('/profile', asyncHandler(updateUserProfile));
router.delete('/profile', asyncHandler(deleteUserAccount));

// User preferences
router.get('/preferences', asyncHandler(getUserPreferences));
router.put('/preferences', asyncHandler(updateUserPreferences));

// User statistics
router.get('/stats', asyncHandler(getUserStats));

// Avatar upload (to be implemented)
router.post('/avatar', asyncUploadAvatar, asyncHandler(handleAvatarUpload), (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: req.uploadResult
  });
});

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'User routes are operational',
    timestamp: new Date().toISOString()
  });
});

export default router;

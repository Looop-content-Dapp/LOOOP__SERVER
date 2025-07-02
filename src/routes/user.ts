import { Router, Request, Response } from 'express';
import { requireAuth, optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { asyncUploadAvatar, handleAvatarUpload } from '@/middleware/upload';
import { validatePartialPreferences, validatePreferencesUpdate } from '@/middleware/preferencesValidation';

// Import user controllers
import {
  getUserPreferences,
  updateUserPreferences,
  getUserStats,
  uploadUserAvatar,
  removeUserAvatar
} from '@/controllers/user/profile';

const router: Router = Router();

// User preferences
router.get('/preferences',requireAuth, asyncHandler(getUserPreferences));
router.put('/preferences',requireAuth, validatePartialPreferences, asyncHandler(updateUserPreferences));

// User statistics
router.get('/stats', requireAuth, asyncHandler(getUserStats));

// Avatar management
router.post('/avatar', requireAuth, asyncUploadAvatar, handleAvatarUpload, asyncHandler(uploadUserAvatar));
router.delete('/avatar', requireAuth, asyncHandler(removeUserAvatar));

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'User routes are operational',
    timestamp: new Date().toISOString()
  });
});

export default router;

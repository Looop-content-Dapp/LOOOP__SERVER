import { Router, Response, Request } from 'express';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { requireAuth, optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

// Import auth controllers
import { login, logout, refreshToken } from '@/controllers/auth/login';
import { register } from '@/controllers/auth/register';

const router: Router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimiter);

// Public authentication routes
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/refresh', asyncHandler(refreshToken));

// Protected authentication routes
router.post('/logout', requireAuth, asyncHandler(logout));

// Password reset routes (to be implemented)
// router.post('/forgot-password', asyncHandler(forgotPassword));
// router.post('/reset-password', asyncHandler(resetPassword));

// Email verification routes (to be implemented)
// router.post('/verify-email', asyncHandler(verifyEmail));
// router.post('/resend-verification', asyncHandler(resendVerification));

// OAuth routes (to be implemented with Better Auth)
// router.get('/google', googleAuth);
// router.get('/google/callback', googleAuthCallback);

// Auth status check
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Authenticated',
    data: { user: (req as any).user }
  });
});

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth routes are operational',
    timestamp: new Date().toISOString()
  });
});

export default router;

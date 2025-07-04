import { Router, Response, Request } from 'express';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { requireAuth, optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

// Import auth controllers
import { login, logout } from '@/controllers/auth/login';
import { register } from '@/controllers/auth/register';
import { getProfile, updateProfile, deleteAccount } from '@/controllers/auth/profile';
import { changePassword, forgotPassword, resetPassword } from '@/controllers/auth/password';
import { verifyEmail, resendVerification, checkEmailVerification } from '@/controllers/auth/email';
import { googleAuth, googleAuthCallback, appleAuth, appleAuthCallback } from '@/controllers/auth/oauth';

const router: Router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimiter);

// Public authentication routes
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/logout', asyncHandler(logout));

// Password management routes
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));
router.post('/change-password', requireAuth, asyncHandler(changePassword));

// Email verification routes
router.post('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-verification', requireAuth, asyncHandler(resendVerification));
router.get('/email-verification-status', requireAuth, asyncHandler(checkEmailVerification));

// Profile management routes
router.get('/me', requireAuth, asyncHandler(getProfile));
router.patch('/profile', requireAuth, asyncHandler(updateProfile));
router.delete('/account', requireAuth, asyncHandler(deleteAccount));

// OAuth routes


router.get('/google', asyncHandler(googleAuth));
router.get('/google/callback', asyncHandler(googleAuthCallback));
router.get('/apple', asyncHandler(appleAuth));
router.post('/apple/callback', asyncHandler(appleAuthCallback)); // Note: Apple uses POST for callback

// Auth status check (public endpoint)
router.get('/status', optionalAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    success: true,
    message: user ? 'Authenticated' : 'Not authenticated',
    data: {
      authenticated: !!user,
      user: user || null
    }
  });
});

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth routes are operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      public: [
        'POST /register',
        'POST /login',
        'POST /logout',
        'POST /forgot-password',
        'POST /reset-password',
        'POST /verify-email',
        'GET /status',
        'GET /health'
      ],
      protected: [
        'GET /me',
        'PATCH /profile',
        'DELETE /account',
        'POST /change-password',
        'POST /resend-verification',
        'GET /email-verification-status'
      ]
    }
  });
});

export default router;

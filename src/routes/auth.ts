import { Router, Response, } from 'express';
import { authRateLimiter } from '@/middleware/rateLimiter';
// Controllers will be implemented later
// import { register, login, logout, refreshToken, googleAuth } from '@/controllers/auth';

const router: Router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimiter);

// Authentication routes (to be implemented)
// router.post('/register', register);
// router.post('/login', login);
// router.post('/logout', logout);
// router.post('/refresh', refreshToken);
// router.get('/google', googleAuth);
// router.get('/google/callback', googleAuthCallback);

// Placeholder routes for MVP setup
router.get('/health', (res: Response) => {
  res.json({ message: 'Auth routes are ready for implementation' });
});

export default router;

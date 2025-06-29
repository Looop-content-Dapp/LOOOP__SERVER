import { Router, Request, Response } from 'express';

const router: Router = Router();

// User routes (to be implemented)
// router.get('/profile', getUserProfile);
// router.put('/profile', updateUserProfile);
// router.get('/stats', getUserStats);

router.get('/health', (_req: Request, res: Response) => {
  res.json({ message: 'User routes are ready for implementation' });
});

export default router;

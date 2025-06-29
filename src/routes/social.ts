import { Router, Request, Response } from 'express';

const router: Router = Router();

// Social routes (to be implemented)
// router.get('/feed', getFeed);
// router.post('/posts', createPost);
// router.post('/follow/:userId', followUser);
// router.delete('/follow/:userId', unfollowUser);
// router.post('/like/:trackId', likeTrack);
// router.delete('/like/:trackId', unlikeTrack);

router.get('/health', (_req: Request, res: Response) => {
  res.json({ message: 'Social routes are ready for implementation' });
});

export default router;

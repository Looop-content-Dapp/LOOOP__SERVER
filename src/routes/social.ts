import { Router } from 'express';
import { SocialController } from '@/controllers/social/social.controller';
import { requireAuth } from '@/middleware/auth';

const router: Router = Router();

// Social Feature Routes
router.post('/follow', requireAuth, SocialController.toggleFollow);
router.post('/like', requireAuth, SocialController.toggleLike);
router.post('/comments', requireAuth, SocialController.addComment);

// User Feed and Social Data
router.get('/feed', requireAuth, SocialController.getUserFeed);
router.get('/following', requireAuth, SocialController.getFollowing);
router.get('/liked-tracks', requireAuth, SocialController.getLikedTracks);
router.get('/stats/:userId', requireAuth, SocialController.getSocialStats);
router.get('/stats', requireAuth, SocialController.getSocialStats);

// Health check
router.get('/health', (_req, res) => {
  res.json({ 
    message: 'Social routes are active',
    endpoints: {
      follow: 'POST /social/follow - Follow/unfollow user or artist',
      like: 'POST /social/like - Like/unlike tracks',
      comments: 'POST /social/comments - Add comments to posts/tracks',
      feed: 'GET /social/feed - Get user social feed',
      following: 'GET /social/following - Get following list',
      likedTracks: 'GET /social/liked-tracks - Get liked tracks',
      stats: 'GET /social/stats/:userId? - Get social stats'
    }
  });
});

export default router;

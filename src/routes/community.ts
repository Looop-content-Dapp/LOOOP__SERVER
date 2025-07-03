import { Router } from 'express';
import { CommunityController } from '@/controllers/community/community.controller';
import { requireAuth, optionalAuth } from '@/middleware/auth';

const router: Router = Router();

// Community Discovery and Search (must come before /:id routes)
router.get('/discover', optionalAuth, CommunityController.discoverCommunities);
router.get('/search', optionalAuth, CommunityController.searchCommunities);

// Community Management Routes
router.post('/', requireAuth, CommunityController.createCommunity);
router.get('/:id', optionalAuth, CommunityController.getCommunity);
router.post('/:id/join', requireAuth, CommunityController.joinCommunity);
router.post('/:id/leave', requireAuth, CommunityController.leaveCommunity);

// Community Posts
router.post('/:id/posts', requireAuth, CommunityController.createPost);
router.get('/:id/posts', optionalAuth, CommunityController.getCommunityPosts);

// Community Members
router.get('/:id/members', optionalAuth, CommunityController.getCommunityMembers);

// Health check
router.get('/health', (_req, res) => {
  res.json({ 
    message: 'Community routes are active',
    endpoints: {
      create: 'POST /communities - Create community (verified artists only)',
      get: 'GET /communities/:id - Get community details',
      join: 'POST /communities/:id/join - Join community',
      leave: 'POST /communities/:id/leave - Leave community',
      createPost: 'POST /communities/:id/posts - Create post (owner only)',
      getPosts: 'GET /communities/:id/posts - Get community posts',
      discover: 'GET /communities/discover - Discover communities',
      search: 'GET /communities/search - Search communities',
      members: 'GET /communities/:id/members - Get community members'
    }
  });
});

export default router;

import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '@/middleware/errorHandler';
import { handleValidationErrors } from '@/middleware/nftSubscriptionValidation';
import { prisma } from '@/config/database';
import { nftSubscriptionService } from '@/services/starknet.service';
import { subscriptionAnalyticsService } from '@/services/subscriptionAnalytics.service';
import { cronSchedulerService } from '@/services/cronScheduler.service';

const router: Router = Router();

// =============================================================================
// COLLECTION MANAGEMENT ROUTES
// =============================================================================

/**
 * @route POST /api/nft-subscriptions/collections
 * @desc Create NFT collection for a community
 * @access Private (Artist only)
 */
router.post(
  '/collections',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('communityId').notEmpty().withMessage('Community ID is required'),
    body('name').notEmpty().withMessage('Collection name is required'),
    body('symbol').notEmpty().withMessage('Collection symbol is required'),
    body('pricePerMonth').isNumeric().withMessage('Price per month must be a number'),
    body('description').optional().isString(),
    body('maxSupply').optional().isInt({ min: 1 }),
    body('imageUrl').optional().isURL()
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { email, communityId, name, symbol, description, pricePerMonth, maxSupply, imageUrl } = req.body;

      // Verify community exists and belongs to the user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const artist = await prisma.artist.findUnique({ where: { userId: user.id } });
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist profile not found'
        });
      }

      const community = await prisma.community.findFirst({
        where: {
          id: communityId,
          artistId: artist.id
        }
      });

      if (!community) {
        return res.status(404).json({
          success: false,
          message: 'Community not found or not owned by this artist'
        });
      }

      // Check if collection already exists for this community
      const existingCollection = await prisma.nFTCollection.findFirst({
        where: { communityId, isActive: true }
      });

      if (existingCollection) {
        return res.status(400).json({
          success: false,
          message: 'Active NFT collection already exists for this community'
        });
      }

      const result = await nftSubscriptionService.createCommunityCollection(
        email,
        communityId,
        {
          name,
          symbol,
          description,
          pricePerMonth: parseFloat(pricePerMonth),
          maxSupply: maxSupply ? parseInt(maxSupply) : undefined,
          imageUrl
        }
      );

      res.status(201).json({
        success: true,
        message: 'NFT collection created successfully',
        data: result
      });
    } catch (error: any) {
      console.error('Error creating NFT collection:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

/**
 * @route POST /api/nft-subscriptions/mint
 * @desc Mint NFT for community access
 * @access Private
 */
router.post(
  '/mint',
  [
    body('userEmail').isEmail().withMessage('Valid user email is required'),
    body('communityId').notEmpty().withMessage('Community ID is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { userEmail, communityId } = req.body;

      const result = await nftSubscriptionService.mintCommunityAccess(userEmail, communityId);

      res.status(201).json({
        success: true,
        message: 'NFT minted successfully for community access',
        data: result
      });
    } catch (error: any) {
      console.error('Error minting NFT:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

/**
 * @route POST /api/nft-subscriptions/renew
 * @desc Renew NFT membership
 * @access Private
 */
router.post(
  '/renew',
  [
    body('userEmail').isEmail().withMessage('Valid user email is required'),
    body('membershipId').notEmpty().withMessage('Membership ID is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { userEmail, membershipId } = req.body;

      const result = await nftSubscriptionService.renewMembership(userEmail, membershipId);

      res.status(200).json({
        success: true,
        message: 'Membership renewed successfully',
        data: result
      });
    } catch (error: any) {
      console.error('Error renewing membership:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

/**
 * @route GET /api/nft-subscriptions/access/:userId/:communityId
 * @desc Check user's access to a community
 * @access Private
 */
router.get(
  '/access/:userId/:communityId',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    param('communityId').notEmpty().withMessage('Community ID is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { userId, communityId } = req.params;

      const accessInfo = await nftSubscriptionService.checkCommunityAccess(userId, communityId);

      res.status(200).json({
        success: true,
        data: accessInfo
      });
    } catch (error: any) {
      console.error('Error checking community access:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

/**
 * @route GET /api/nft-subscriptions/memberships/:userId
 * @desc Get user's NFT memberships
 * @access Private
 */
router.get(
  '/memberships/:userId',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    query('status').optional().isIn(['active', 'expired', 'all']).withMessage('Status must be active, expired, or all')
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status = 'active' } = req.query;

      let whereClause: any = { userId };

      if (status === 'active') {
        whereClause.isActive = true;
        whereClause.expiresAt = { gt: new Date() };
      } else if (status === 'expired') {
        whereClause.OR = [
          { isActive: false },
          { expiresAt: { lte: new Date() } }
        ];
      }

      const memberships = await prisma.nFTMembership.findMany({
        where: whereClause,
        include: {
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              artist: {
                select: {
                  name: true,
                  profileImage: true
                }
              }
            }
          },
          collection: {
            select: {
              name: true,
              pricePerMonth: true,
              currency: true,
              contractAddress: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({
        success: true,
        data: memberships
      });
    } catch (error: any) {
      console.error('Error getting user memberships:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

/**
 * @route GET /api/nft-subscriptions/transactions/:userId
 * @desc Get user's transaction history
 * @access Private
 */
router.get(
  '/transactions/:userId',
  [
    param('userId').notEmpty().withMessage('User ID is required'),
    query('type').optional().isString(),
    query('status').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { type, status, limit = '50', offset = '0' } = req.query;

      const transactions = await nftSubscriptionService.getUserTransactionHistory(
        userId,
        {
          type: type as string,
          status: status as string,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      );

      res.status(200).json({
        success: true,
        data: transactions
      });
    } catch (error: any) {
      console.error('Error getting transaction history:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

/**
 * @route GET /api/nft-subscriptions/analytics/earnings/:artistId
 * @desc Get artist's earnings overview
 * @access Private (Artist only)
 */
router.get(
  '/analytics/earnings/:artistId',
  [
    param('artistId').notEmpty().withMessage('Artist ID is required'),
    query('period').optional().isInt({ min: 1, max: 365 })
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { artistId } = req.params;
      const { period = '30' } = req.query;

      const overview = await subscriptionAnalyticsService.getEarningsOverview(
        artistId,
        parseInt(period as string)
      );

      res.status(200).json({
        success: true,
        data: overview
      });
    } catch (error: any) {
      console.error('Error getting earnings overview:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

/**
 * @route GET /api/nft-subscriptions/analytics/history/:artistId
 * @desc Get artist's earnings history
 * @access Private (Artist only)
 */
router.get(
  '/analytics/history/:artistId',
  [
    param('artistId').notEmpty().withMessage('Artist ID is required'),
    query('period').optional().isInt({ min: 1, max: 365 })
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { artistId } = req.params;
      const { period = '30' } = req.query;

      const history = await subscriptionAnalyticsService.getEarningsHistory(
        artistId,
        parseInt(period as string)
      );

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error: any) {
      console.error('Error getting earnings history:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

/**
 * @route GET /api/nft-subscriptions/analytics/community/:communityId
 * @desc Get community analytics
 * @access Private
 */
router.get(
  '/analytics/community/:communityId',
  [
    param('communityId').notEmpty().withMessage('Community ID is required'),
    query('period').optional().isInt({ min: 1, max: 365 })
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { communityId } = req.params;
      const { period = '30' } = req.query;

      const analytics = await subscriptionAnalyticsService.getCommunityAnalytics(
        communityId,
        parseInt(period as string)
      );

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      console.error('Error getting community analytics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

/**
 * @route GET /api/nft-subscriptions/analytics/top-communities/:artistId
 * @desc Get artist's top performing communities
 * @access Private (Artist only)
 */
router.get(
  '/analytics/top-communities/:artistId',
  [
    param('artistId').notEmpty().withMessage('Artist ID is required'),
    query('limit').optional().isInt({ min: 1, max: 20 })
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { artistId } = req.params;
      const { limit = '5' } = req.query;

      const topCommunities = await subscriptionAnalyticsService.getTopCommunities(
        artistId,
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: topCommunities
      });
    } catch (error: any) {
      console.error('Error getting top communities:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

/**
 * @route POST /api/nft-subscriptions/cron/trigger
 * @desc Manually trigger cron job
 * @access Private (Admin only)
 */
router.post(
  '/cron/trigger',
  [
    body('jobName').notEmpty().withMessage('Job name is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobName } = req.body;

      const success = await cronSchedulerService.triggerJob(jobName);

      if (success) {
        res.status(200).json({
          success: true,
          message: `Job ${jobName} triggered successfully`
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Failed to trigger job ${jobName}`
        });
      }
    } catch (error: any) {
      console.error('Error triggering cron job:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

/**
 * @route GET /api/nft-subscriptions/cron/status
 * @desc Get cron jobs status
 * @access Private (Admin only)
 */
router.get('/cron/status', asyncHandler(async (req: Request, res: Response) => {
  try {
    const status = cronSchedulerService.healthCheck();
    const history = await cronSchedulerService.getJobHistory(undefined, 10);
    const statistics = await cronSchedulerService.getJobStatistics(7);

    res.status(200).json({
      success: true,
      data: {
        status,
        recentHistory: history,
        weeklyStatistics: statistics
      }
    });
  } catch (error: any) {
    console.error('Error getting cron status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}));

/**
 * @route GET /api/nft-subscriptions/collections/:communityId
 * @desc Get NFT collection for a community
 * @access Public
 */
router.get(
  '/collections/:communityId',
  [
    param('communityId').notEmpty().withMessage('Community ID is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { communityId } = req.params;

      const collection = await prisma.nFTCollection.findFirst({
        where: {
          communityId,
          isActive: true
        },
        include: {
          community: {
            select: {
              name: true,
              description: true,
              imageUrl: true,
              artist: {
                select: {
                  name: true,
                  profileImage: true
                }
              }
            }
          }
        }
      });

      if (!collection) {
        return res.status(404).json({
          success: false,
          message: 'No active NFT collection found for this community'
        });
      }

      res.status(200).json({
        success: true,
        data: collection
      });
    } catch (error: any) {
      console.error('Error getting NFT collection:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  })
);

export default router;

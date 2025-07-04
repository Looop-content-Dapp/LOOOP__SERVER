import { Request, Response } from 'express';
import { subscriptionAnalyticsService } from '@/services/subscriptionAnalytics.service';

/**
 * Get artist's earnings overview
 */
export const getArtistEarningsOverview = async (req: Request, res: Response): Promise<void> => {
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
};

/**
 * Get artist's earnings history
 */
export const getArtistEarningsHistory = async (req: Request, res: Response): Promise<void> => {
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
};

/**
 * Get community analytics
 */
export const getCommunityAnalytics = async (req: Request, res: Response): Promise<void> => {
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
};

/**
 * Get artist's top performing communities
 */
export const getTopCommunities = async (req: Request, res: Response): Promise<void> => {
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
};

/**
 * Get subscription trends for an artist
 */
export const getSubscriptionTrends = async (req: Request, res: Response): Promise<void> => {
  const { artistId } = req.params;
  const { period = '30' } = req.query;

  const trends = await subscriptionAnalyticsService.getSubscriptionTrends(
    artistId,
    parseInt(period as string)
  );

  res.status(200).json({
    success: true,
    data: trends
  });
};

import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { ArtistService } from '@/services/artist.service';

/**
 * Get artist analytics by artist ID (public)
 */
export const getArtistAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { artistId } = req.params;

    if (!artistId) {
      throw createError('Artist ID is required', 400);
    }

    const analytics = await ArtistService.getArtistAnalytics(artistId);

    res.status(200).json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    logger.error('Error retrieving artist analytics:', error);

    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: { message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

/**
 * Get current user's artist analytics (authenticated)
 */
export const getMyArtistAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    // Get user's artist profile
    const artist = await ArtistService.getArtistByUserId(userId);

    if (!artist) {
      throw createError('Artist profile not found', 404);
    }

    const analytics = await ArtistService.getArtistAnalytics(artist.id);

    res.status(200).json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    logger.error('Error retrieving user artist analytics:', error);

    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: { message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

/**
 * Update daily analytics for an artist (cron job or manual trigger)
 */
export const updateDailyAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    // Get user's artist profile
    const artist = await ArtistService.getArtistByUserId(userId);

    if (!artist) {
      throw createError('Artist profile not found', 404);
    }

    await ArtistService.updateDailyAnalytics(artist.id);

    logger.info('Daily analytics updated manually', { 
      userId, 
      artistId: artist.id 
    });

    res.status(200).json({
      success: true,
      message: 'Daily analytics updated successfully'
    });

  } catch (error) {
    logger.error('Error updating daily analytics:', error);

    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: { message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

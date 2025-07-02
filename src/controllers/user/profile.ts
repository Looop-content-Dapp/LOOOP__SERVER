import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { validateUsername, validateUrl, sanitizeInput } from '@/utils/validation';
import { AuthenticatedRequest } from '@/middleware/auth';
import { deleteAvatar } from '@/middleware/upload';
import { PreferencesService } from '@/services/preferences.service';

/**
 * Get user preferences
 */
export const getUserPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const preferences = await PreferencesService.getUserPreferences(userId);

    res.status(200).json({
      success: true,
      data: { preferences }
    });

  } catch (error) {
    logger.error('Error retrieving user preferences:', error);

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
 * Update user preferences
 */
export const updateUserPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      throw createError('Invalid preferences data', 400);
    }

    const updatedPreferences = await PreferencesService.updateUserPreferences(userId, preferences);

    logger.info('User preferences updated', { userId });

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: { preferences: updatedPreferences }
    });

  } catch (error) {
    logger.error('Error updating user preferences:', error);

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
 * Get user stats
 */
export const getUserStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    // Get comprehensive user statistics
    const [user, stats] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          _count: {
            select: {
              tracks: true,
              playlists: true,
              likes: true,
              comments: true,
              followers: true,
              following: true,
              playHistory: true
            }
          }
        }
      })
    ]);

    if (!user || !stats) {
      throw createError('User not found', 404);
    }

    // Calculate additional stats
    const [recentActivity, totalPlayTime] = await Promise.all([
      prisma.playHistory.count({
        where: {
          userId,
          playedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.playHistory.aggregate({
        where: { userId },
        _sum: { duration: true }
      })
    ]);

    const userStats = {
      profile: {
        memberSince: user.createdAt,
        totalTracks: stats._count.tracks,
        totalPlaylists: stats._count.playlists,
        totalLikes: stats._count.likes,
        totalComments: stats._count.comments
      },
      social: {
        followers: stats._count.followers,
        following: stats._count.following
      },
      activity: {
        totalPlays: stats._count.playHistory,
        recentPlays: recentActivity,
        totalPlayTime: totalPlayTime._sum.duration || 0
      }
    };

    logger.info('User stats retrieved', { userId });

    res.status(200).json({
      success: true,
      data: { stats: userStats }
    });

  } catch (error) {
    logger.error('Error retrieving user stats:', error);

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
 * Upload user avatar
 */
export const uploadUserAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    if (!req.uploadResult) {
      throw createError('No file uploaded', 400);
    }

    const { secure_url, public_id } = req.uploadResult;

    // Get current user to check if they have an existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true }
    });

    if (!currentUser) {
      throw createError('User not found', 404);
    }

    // If user has an existing avatar, delete it from Cloudinary
    if (currentUser.image) {
      try {
        // Extract public_id from existing image URL
        const urlParts = currentUser.image.split('/');
        const fileWithExtension = urlParts[urlParts.length - 1];
        const existingPublicId = `avatars/${fileWithExtension.split('.')[0]}`;
        await deleteAvatar(existingPublicId);
      } catch (deleteError) {
        logger.warn('Failed to delete existing avatar from Cloudinary', {
          userId,
          existingImage: currentUser.image,
          error: deleteError
        });
      }
    }

    // Update user with new avatar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: secure_url },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        updatedAt: true
      }
    });

    logger.info('User avatar uploaded successfully', {
      userId,
      imageUrl: secure_url,
      publicId: public_id
    });

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        user: updatedUser,
        upload: {
          url: secure_url,
          publicId: public_id
        }
      }
    });

  } catch (error) {
    logger.error('Error uploading user avatar:', error);

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
 * Remove user avatar
 */
export const removeUserAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    // Get current user to check if they have an avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true }
    });

    if (!currentUser) {
      throw createError('User not found', 404);
    }

    if (!currentUser.image) {
      throw createError('No avatar to remove', 400);
    }

    // Extract public_id from image URL and delete from Cloudinary
    try {
      const urlParts = currentUser.image.split('/');
      const fileWithExtension = urlParts[urlParts.length - 1];
      const publicId = `avatars/${fileWithExtension.split('.')[0]}`;

      const deleteSuccess = await deleteAvatar(publicId);
      if (!deleteSuccess) {
        logger.warn('Failed to delete avatar from Cloudinary', { userId, publicId });
      }
    } catch (deleteError) {
      logger.error('Error deleting avatar from Cloudinary:', deleteError);
    }

    // Update user to remove avatar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: null },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        updatedAt: true
      }
    });

    logger.info('User avatar removed successfully', { userId });

    res.status(200).json({
      success: true,
      message: 'Avatar removed successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    logger.error('Error removing user avatar:', error);

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

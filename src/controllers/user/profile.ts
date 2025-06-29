import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { validateUsername, validateUrl, sanitizeInput } from '@/utils/validation';
import { AuthenticatedRequest } from '@/middleware/auth';

/**
 * Get user profile
 */
export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        image: true,
        isVerified: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        artist: {
          select: {
            id: true,
            name: true,
            verified: true,
            followers: true,
            monthlyListeners: true
          }
        },
        _count: {
          select: {
            tracks: true,
            playlists: true,
            followers: true,
            following: true
          }
        }
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    logger.info('User profile retrieved', { userId });

    res.status(200).json({
      success: true,
      data: { user }
    });

  } catch (error) {
    logger.error('Error retrieving user profile:', error);

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
 * Update user profile
 */
export const updateUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const { name, username, bio } = req.body;

    // Validation
    const updateData: any = {};

    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        throw createError('Name must be at least 2 characters long', 400);
      }
      updateData.name = sanitizeInput(name.trim());
    }

    if (username !== undefined) {
      if (username && !validateUsername(username)) {
        throw createError('Invalid username format', 400);
      }
      
      if (username) {
        // Check if username is already taken
        const existingUser = await prisma.user.findFirst({
          where: {
            username: username.toLowerCase(),
            NOT: { id: userId }
          }
        });

        if (existingUser) {
          throw createError('Username already taken', 409);
        }

        updateData.username = username.toLowerCase();
      } else {
        updateData.username = null;
      }
    }

    if (bio !== undefined) {
      if (bio && bio.length > 500) {
        throw createError('Bio must be 500 characters or less', 400);
      }
      updateData.bio = bio ? sanitizeInput(bio.trim()) : null;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        image: true,
        isVerified: true,
        emailVerified: true,
        updatedAt: true
      }
    });

    logger.info('User profile updated', { userId, updatedFields: Object.keys(updateData) });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    logger.error('Error updating user profile:', error);

    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: { message: 'Username already exists' }
      });
      return;
    }

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
 * Get user preferences
 */
export const getUserPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    // For now, we'll return default preferences since we don't have a preferences table yet
    // This can be extended later with a proper preferences model
    const defaultPreferences = {
      notifications: {
        email: true,
        push: true,
        newFollowers: true,
        newComments: true,
        newLikes: true,
        trackUpdates: true
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showLastSeen: true,
        allowMessages: true
      },
      audio: {
        quality: 'high',
        autoplay: true,
        crossfade: false
      },
      display: {
        theme: 'auto',
        language: 'en'
      }
    };

    res.status(200).json({
      success: true,
      data: { preferences: defaultPreferences }
    });

  } catch (error) {
    logger.error('Error retrieving user preferences:', error);

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

    // For now, we'll just return success since we don't have a preferences table yet
    // This should be implemented with proper preferences storage
    
    logger.info('User preferences updated', { userId });

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: { preferences }
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
 * Delete user account
 */
export const deleteUserAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const { confirmDelete } = req.body;

    if (!confirmDelete) {
      throw createError('Account deletion confirmation required', 400);
    }

    // Soft delete: we'll mark the user as inactive instead of hard delete
    // This preserves data integrity for tracks, comments, etc.
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${Date.now()}_${userId}@deleted.local`,
        name: 'Deleted User',
        username: null,
        bio: null,
        image: null,
        isVerified: false,
        emailVerified: false
      }
    });

    // Also soft delete associated artist profile if exists
    await prisma.artist.updateMany({
      where: { userId },
      data: {
        isActive: false,
        email: `deleted_${Date.now()}_${userId}@deleted.local`
      }
    });

    logger.info('User account deleted', { userId });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting user account:', error);

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

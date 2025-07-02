import { Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not found', 404);
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
        updatedAt: true,
        // Include related data
        artist: {
          select: {
            id: true,
            name: true,
            verified: true,
            monthlyListeners: true,
            followers: true
          }
        },
        wallet: {
          select: {
            address: true,
            publickey: true
          }
        },
        following: {
          select: {
            followingId: true
          }
        }
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    logger.info('Profile retrieved successfully', { userId });

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user }
    });

  } catch (error) {
    logger.error('Get profile error:', error);

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

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { name, username, bio, image } = req.body;

    if (!userId) {
      throw createError('User not found', 404);
    }

    // Check if username is taken by another user
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: username.toLowerCase(),
          id: { not: userId }
        }
      });

      if (existingUser) {
        throw createError('Username already taken', 409);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(username && { username: username.toLowerCase() }),
        ...(bio !== undefined && { bio }),
        ...(image && { image }),
        updatedAt: new Date()
      },
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

    logger.info('Profile updated successfully', { userId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    logger.error('Update profile error:', error);

    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: { message: 'Username already taken' }
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

export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { password } = req.body;

    if (!userId) {
      throw createError('User not found', 404);
    }

    if (!password) {
      throw createError('Password is required to delete account', 400);
    }

    // Verify password before deletion
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    const { AuthService } = await import('@/services/auth.service');
    const isValidPassword = await AuthService.comparePassword(password, user.password);

    if (!isValidPassword) {
      throw createError('Invalid password', 401);
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId }
    });

    logger.info('Account deleted successfully', { userId });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    logger.error('Delete account error:', error);

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

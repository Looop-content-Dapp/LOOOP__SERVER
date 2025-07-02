import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { AuthService } from '@/services/auth.service';
import { AuthenticatedRequest } from '@/middleware/auth';
import { validateEmail, validatePassword } from '@/utils/validation';
import { PasswordResetRequest, PasswordResetConfirmRequest } from '@/types/auth.types';

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      throw createError('User not found', 404);
    }

    if (!currentPassword || !newPassword) {
      throw createError('Current password and new password are required', 400);
    }

    if (!validatePassword(newPassword)) {
      throw createError(
        'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        400
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await AuthService.comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw createError('Current password is incorrect', 401);
    }

    // Hash new password
    const hashedPassword = await AuthService.hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    logger.info('Password changed successfully', { userId });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);

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

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email }: PasswordResetRequest = req.body;

    if (!email) {
      throw createError('Email is required', 400);
    }

    if (!validateEmail(email)) {
      throw createError('Invalid email format', 400);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      logger.warn('Password reset requested for non-existent email', { email });
      res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link'
      });
      return;
    }

    // Generate reset token
    const resetToken = await AuthService.generatePasswordResetToken(email.toLowerCase());

    // TODO: Send password reset email
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    logger.info('Password reset token generated', { 
      userId: user.id, 
      email: user.email 
    });

    res.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link'
    });

  } catch (error) {
    logger.error('Forgot password error:', error);

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword }: PasswordResetConfirmRequest = req.body;

    if (!token || !newPassword) {
      throw createError('Token and new password are required', 400);
    }

    if (!validatePassword(newPassword)) {
      throw createError(
        'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        400
      );
    }

    // Verify reset token
    const email = await AuthService.verifyPasswordResetToken(token);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Hash new password
    const hashedPassword = await AuthService.hashPassword(newPassword);

    // Update password and remove verification token
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      });

      // Remove used verification token
      await tx.verification.deleteMany({
        where: {
          identifier: email,
          value: token
        }
      });
    });

    logger.info('Password reset successful', { 
      userId: user.id, 
      email: user.email 
    });

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    logger.error('Reset password error:', error);

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

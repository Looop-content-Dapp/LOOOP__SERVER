import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { AuthService } from '@/services/auth.service';
import { AuthenticatedRequest } from '@/middleware/auth';
import { EmailVerificationRequest } from '@/types/auth.types';

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token }: EmailVerificationRequest = req.body;

    if (!token) {
      throw createError('Verification token is required', 400);
    }

    // Verify token
    const email = await AuthService.verifyEmailVerificationToken(token);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    if (user.emailVerified) {
      res.json({
        success: true,
        message: 'Email is already verified'
      });
      return;
    }

    // Update user and remove verification token
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { 
          emailVerified: true,
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

    logger.info('Email verified successfully', { 
      userId: user.id, 
      email: user.email 
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    logger.error('Email verification error:', error);

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

export const resendVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not found', 404);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    if (user.emailVerified) {
      res.json({
        success: true,
        message: 'Email is already verified'
      });
      return;
    }

    // Remove any existing verification tokens for this user
    await prisma.verification.deleteMany({
      where: { identifier: user.email }
    });

    // Generate new verification token
    const verificationToken = await AuthService.generateEmailVerificationToken(user.email);

    // TODO: Send verification email
    // await emailService.sendVerificationEmail(user.email, verificationToken);

    logger.info('Email verification resent', { 
      userId: user.id, 
      email: user.email 
    });

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    logger.error('Resend verification error:', error);

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

export const checkEmailVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not found', 404);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      message: 'Email verification status retrieved',
      data: {
        emailVerified: user.emailVerified,
        email: user.email
      }
    });

  } catch (error) {
    logger.error('Check email verification error:', error);

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

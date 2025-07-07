import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { AuthService } from '@/services/auth.service';
import { AuthenticatedRequest } from '@/middleware/auth';
import { EmailVerificationRequest } from '@/types/auth.types';
import { sendEmail } from '@/scripts/sendmail';

// OTP-based email verification
export const verifyEmailOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw createError('Email and OTP are required', 400);
    }

    // Verify OTP
    await AuthService.verifyEmailVerificationOTP(email, otp);

    // Find user if exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Only update user if they exist
    if (user) {
      if (user.emailVerified) {
        res.json({
          success: true,
          message: 'Email is already verified'
        });
        return;
      }

      // Update user to mark email as verified
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          updatedAt: new Date()
        }
      });
    }

    logger.info('Email verified successfully with OTP', {
      userId: user?.id || 'no-user',
      email: email
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    logger.error('Email OTP verification error:', error);

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

// Legacy token-based email verification (kept for backward compatibility)
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

// Send OTP for email verification
export const sendVerificationOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw createError('Email is required', 400);
    }

    // Generate new OTP
    const otp = await AuthService.generateEmailVerificationOTP(email);

    // Send verification email with OTP
    const emailResult = await sendEmail({
      to: email,
      subject: 'Verify Your Email - Looop Music',
      template: 'verify',
      context: {
        email: email,
        otp: otp
      }
    });

    if (!emailResult) {
      throw createError('Failed to send verification email', 500);
    }

    logger.info('Email verification OTP sent', {
      email: email
    });

    res.json({
      success: true,
      message: 'Verification OTP sent successfully'
    });

  } catch (error) {
    logger.error('Send verification OTP error:', error);

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

// Legacy resend verification (kept for backward compatibility)
export const resendVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
   const {email} = req.body;

    // Generate new OTP instead of token
    const otp = await AuthService.generateEmailVerificationOTP(email);

    // Send verification email with OTP
    const emailResult = await sendEmail({
      to: email,
      subject: 'Verify Your Email - Looop Music',
      template: 'verify',
      context: {
        email: email,
        otp: otp
      }
    });

    if (!emailResult) {
      throw createError('Failed to send verification email', 500);
    }

    logger.info('Email verification OTP resent', {
      email: email
    });

    res.json({
      success: true,
      message: 'Verification OTP sent successfully'
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

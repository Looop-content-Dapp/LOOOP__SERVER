import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { generateReferralCode } from '@/utils/referral';
import { validateEmail, validatePassword } from '@/utils/validation';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  username?: string;
  referralCode?: string;
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, username, referralCode }: RegisterRequest = req.body;

    // Validation
    if (!name || !email || !password) {
      throw createError('Name, email, and password are required', 400);
    }

    if (!validateEmail(email)) {
      throw createError('Invalid email format', 400);
    }

    if (!validatePassword(password)) {
      throw createError(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        400
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          ...(username ? [{ username: username.toLowerCase() }] : [])
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw createError('User with this email already exists', 409);
      }
      if (existingUser.username === username?.toLowerCase()) {
        throw createError('Username already taken', 409);
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Handle referral if provided
    let referrer = null;
    if (referralCode) {
      referrer = await prisma.referral.findFirst({
        where: {
          code: referralCode,
          status: 'pending'
        },
        include: { referrer: true }
      });

      if (!referrer) {
        throw createError('Invalid referral code', 400);
      }
    }

    // Create user with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase(),
          username: username?.toLowerCase() || null,
          emailVerified: false,
          isVerified: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          emailVerified: true,
          isVerified: true,
          createdAt: true
        }
      });

      // Create account for password storage
      await tx.account.create({
        data: {
          userId: user.id,
          accountId: user.email,
          providerId: 'credential',
          password: hashedPassword,
        }
      });

      // Handle referral completion
      if (referrer) {
        await tx.referral.update({
          where: { id: referrer.id },
          data: {
            referredId: user.id,
            status: 'completed',
            completedAt: new Date(),
            reward: {
              type: 'signup_bonus',
              amount: 10, // Example reward
              currency: 'USD'
            }
          }
        });

        logger.info('Referral completed', {
          referrerId: referrer.referrerId,
          referredId: user.id,
          code: referralCode
        });
      }

      // Create user's own referral code
      const userReferralCode = generateReferralCode(user.name, user.id);
      await tx.referral.create({
        data: {
          referrerId: user.id,
          code: userReferralCode,
          status: 'pending'
        }
      });

      return { user, referralCode: userReferralCode };
    });

    logger.info('User registered successfully', {
      userId: result.user.id,
      email: result.user.email,
      hasReferrer: !!referrer
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user: result.user,
        referralCode: result.referralCode
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);

    if (error.code === 'P2002') {
      // Prisma unique constraint violation
      res.status(409).json({
        success: false,
        error: { message: 'Email or username already exists' }
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
      error: { message: 'Internal server error during registration' }
    });
  }
};

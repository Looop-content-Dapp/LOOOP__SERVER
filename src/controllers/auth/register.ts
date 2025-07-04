import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { generateReferralCode } from '@/utils/referral';
import { validateEmail, validatePassword } from '@/utils/validation';
import { starknetService } from '@/services/starknet.service';
import { AuthService } from '@/services/auth.service';
import { RegisterRequest, AuthResponse } from '@/types/auth.types';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, username, referralCode, bio }: RegisterRequest = req.body;

    // Validation
    if (!name || !email) {
      throw createError('Name and email are required', 400);
    }

    if (!validateEmail(email)) {
      throw createError('Invalid email format', 400);
    }

    // Only validate password for email registration
    if (password) {
      if (!validatePassword(password)) {
        throw createError(
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
          400
        );
      }
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

    // Hash password if provided (for email registration)
    const hashedPassword = password ? await AuthService.hashPassword(password) : '';

    // Set auth provider
    const authProvider = password ? 'EMAIL' : undefined;

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
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          username: username?.toLowerCase(),
          bio: bio || null,
          emailVerified: false,
          authProvider: 'EMAIL'
        }
      });

      // Create wallet
      const walletInfo = await starknetService.createUserWallet(email);
      await tx.wallet.create({
        data: {
          email: email.toLowerCase(),
          address: walletInfo.address,
          publickey: walletInfo.publickey,
          encryptedPrivateKey: walletInfo.privateKey,
          userId: newUser.id
        }
      });

      // Handle referral completion
      if (referrer) {
        await tx.referral.update({
          where: { id: referrer.id },
          data: {
            referredId: newUser.id,
            status: 'completed',
            completedAt: new Date()
          }
        });
      }

      return { user: newUser, walletInfo };
    });

    // Generate JWT token
    const token = AuthService.generateToken({
      userId: user.user.id,
      email: user.user.email,
      name: user.user.name,
      username: user.user.username || undefined,
      isVerified: user.user.isVerified,
      emailVerified: user.user.emailVerified
    });

    logger.info('User registered successfully', {
      userId: user.user.id,
      email: user.user.email,
      hasReferrer: !!referrer
    });

    const response: AuthResponse = {
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user: {
          id: user.user.id,
          email: user.user.email,
          name: user.user.name,
          username: user.user.username,
          bio: user.user.bio,
          image: user.user.image,
          isVerified: user.user.isVerified,
          emailVerified: user.user.emailVerified
        },
        token,
        tokenType: 'Bearer',
        expiresIn: 30 * 24 * 60 * 60 // 30 days in seconds
      }
    };

    res.status(201).json(response);

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

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { generateReferralCode } from '@/utils/referral';
import { validateEmail, validatePassword } from '@/utils/validation';
import { starknetService } from '@/services/starknet.service';
import { auth } from '@/config/auth';
import { fromNodeHeaders } from 'better-auth/node';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  username?: string;
  referralCode?: string;
  bio: string;
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, username, referralCode, bio }: RegisterRequest = req.body;

    // Validation
    if (!name || !email || !password  || !username) {
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

    const session = await auth.api.signUpEmail({
    headers: fromNodeHeaders(req.headers),
    method: "POST",
     body: {
      name: name,
      email: email,
      password: password,
    },
    })

    await prisma.user.update({
      where: {
        id: session.user.id
      },
      data: {
        id: session.user.id,
        username: username?.toLowerCase(),
        bio: bio
      }
    })

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

    const walletInfo = await starknetService.createUserWallet(email);
    console.log("Wallet info:", walletInfo);

    // Create user
    await prisma.wallet.create({
        data: {
            email: email,
            address: walletInfo.address,
            publickey: walletInfo.publickey,
            encryptedPrivateKey: walletInfo.privateKey,
            userId: session.user.id
        }
    })

    logger.info('User registered successfully', {
      userId: session.user.id,
      email: session.user.email,
      hasReferrer: !!referrer
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user: session.user,
      },
      walletInfo
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

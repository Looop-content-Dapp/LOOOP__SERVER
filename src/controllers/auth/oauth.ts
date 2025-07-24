import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import AppleSignIn from 'apple-signin-auth';

import { AuthService } from '@/services/auth.service';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';
import crypto from "crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'com.looop.app:/oauth2redirect/google';

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID!;
const APPLE_CLIENT_SECRET = process.env.APPLE_CLIENT_SECRET!;
const APPLE_REDIRECT_URI = process.env.APPLE_REDIRECT_URI || 'com.looop.app:/oauth2redirect/apple';

const googleClient = new OAuth2Client({
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectUri: GOOGLE_REDIRECT_URI,
});

//  OAuth handlers for direct token verification
export const mobileGoogleAuth = async (req: Request, res: Response) => {
  try {
    const { token, email, channel } = req.body;

    if (!token || !email || channel !== 'google') {
      throw createError('Invalid request parameters', 400);
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || payload.email !== email) {
      throw createError('Invalid token or email mismatch', 400);
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: payload.email } });
    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          emailVerified: true,
          image: payload.picture,
          authProvider: 'GOOGLE',
          password: '',
        },
      });
      isNewUser = true;
    }

    // Generate JWT token
    const jwtToken = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      isVerified: false,
      emailVerified: true
    });

    res.json({
      success: true,
      message: 'Google authentication successful',
      data: {
        token: jwtToken,
        isNewUser,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          emailVerified: user.emailVerified,
          image: user.image
        }
      }
    });
  } catch (error) {
    logger.error('Mobile Google auth error:', error);
    throw createError('Google authentication failed', 401);
  }
};

export const mobileAppleAuth = async (req: Request, res: Response) => {
  try {
    const { token, email, channel } = req.body;

    if (!token || !email || channel !== 'apple') {
      throw createError('Invalid request parameters', 400);
    }

    // Verify the Apple ID token
    const decoded = await AppleSignIn.verifyIdToken(token, {
      audience: APPLE_CLIENT_ID,
    });

    if (!decoded.email || decoded.email !== email) {
      throw createError('Invalid token or email mismatch', 400);
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: decoded.email } });
    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: decoded.email,
          name: decoded.email.split('@')[0],
          emailVerified: true,
          authProvider: 'APPLE',
          password: '',
          image: null
        },
      });
      isNewUser = true;
    }

    // Generate JWT token
    const jwtToken = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      isVerified: false,
      emailVerified: true
    });

    res.json({
      success: true,
      message: 'Apple authentication successful',
      data: {
        token: jwtToken,
        isNewUser,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          emailVerified: user.emailVerified,
          image: user.image
        }
      }
    });
  } catch (error) {
    logger.error('Mobile Apple auth error:', error);
    throw createError('Apple authentication failed', 401);
  }
};

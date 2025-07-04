import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import AppleSignIn from 'apple-signin-auth';

import { AuthService } from '@/services/auth.service';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';

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

// Google OAuth handlers
export const googleAuth = (_req: Request, res: Response) => {
  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
  });
  res.redirect(authUrl);
};

export const googleAuthCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    if (!code) throw createError('Authorization code not provided', 400);

    const { tokens } = await googleClient.getToken(code);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw createError('Invalid token payload', 400);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: payload.email } });

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
    }

    // Generate JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      isVerified: false,
      emailVerified: true
    });

    res.redirect(`com.looop.app:/oauth2redirect/google?token=${token}`);
  } catch (error) {
    logger.error('Google auth callback error:', error);
    res.redirect('com.looop.app:/oauth2redirect/google?error=true');
  }
};

// Apple OAuth handlers
export const appleAuth = (_req: Request, res: Response) => {
  const authUrl = `https://appleid.apple.com/auth/authorize?client_id=${APPLE_CLIENT_ID}&redirect_uri=${APPLE_REDIRECT_URI}&response_type=code&scope=email name&response_mode=form_post`;
  res.redirect(authUrl);
};

export const appleAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) throw createError('Authorization code not provided', 400);

    const response = await AppleSignIn.getAuthorizationToken(code, {
      clientID: APPLE_CLIENT_ID,
      clientSecret: APPLE_CLIENT_SECRET,
      redirectUri: APPLE_REDIRECT_URI,
    });

    const { sub: appleUserId, email, aud } = await AppleSignIn.verifyIdToken(response.id_token, {
      audience: APPLE_CLIENT_ID,
    });

    if (!email) throw createError('Email not provided', 400);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          emailVerified: true,
          authProvider: 'APPLE',
          password: '',
          image: null
        },
      });
    }

    // Generate JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      isVerified: false,
      emailVerified: true
    });

    res.redirect(`com.looop.app:/oauth2redirect/apple?token=${token}`);
  } catch (error) {
    logger.error('Apple auth callback error:', error);
    res.redirect('com.looop.app:/oauth2redirect/apple?error=true');
  }
};

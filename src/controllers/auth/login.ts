import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { validateEmail } from '@/utils/validation';
import { auth } from '@/config/auth';
import { fromNodeHeaders } from 'better-auth/node';
import { APIError } from 'better-auth/api';

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface TokenPayload {
  userId: string;
  email: string;
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe = false }: LoginRequest = req.body;

    // Validation
    if (!email || !password) {
      throw createError('Email and password are required', 400);
    }

    if (!validateEmail(email)) {
      throw createError('Invalid email format', 400);
    }

    // Authenticate using Better Auth
    const response = await auth.api.signInEmail({
      body: {
        email: email.toLowerCase(),
        password: password,
        rememberMe
      }
    });

    if (!response || !response.user) {
      logger.warn('Failed login attempt', {
        email: email.toLowerCase(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      throw createError('Invalid email or password', 401);
    }

    logger.info('User logged in successfully', {
      userId: response.user.id,
      email: response.user.email,
      sessionId: response.token
    });

    // Get additional user data
    const data = await prisma.user.findUnique({where: {email: response.user.email}});

    // Prepare user data for response
    const userData = {
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      username: data?.username,
      image: response.user.image,
      emailVerified: response.user.emailVerified,
      isVerified: data?.isVerified || false,
      bio: data?.bio,
      lastLoginAt: data?.lastLoginAt
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token: response.token,
        tokenType: 'Bearer',
        expiresIn: 30 * 24 * 60 * 60 // 30 days in seconds
      }
    });

    logger.debug('Login response token:', {
      token: response.token,
      tokenType: 'Bearer'
    });

  } catch (error) {
    logger.error('Login error:', error);

    if (error instanceof APIError) {
      res.status(Number(error.status)).json({
        success: false,
        error: { message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error during login' }
    });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const headers = fromNodeHeaders(req.headers);

    // First verify current session
    const currentSession = await auth.api.getSession({ headers });
    if (!currentSession) {
      throw createError('No active session to refresh', 401);
    }

    // Re-authenticate to get a fresh session
    const response = await auth.api.signInEmail({
      body: {
        email: currentSession.user.email,
        password: req.body.password,
        rememberMe: true
      },
      headers,
      returnHeaders: true
    });

    if (!response || !response.response) {
      throw createError('Failed to refresh session', 401);
    }

    logger.info('Session refreshed successfully', {
      userId: response.response.user.id
    });

    // Handle cookies if present
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      res.setHeader('Set-Cookie', cookies);
    }

    res.status(200).json({
      success: true,
      data: {
        user: response.response.user,
        token: response.response.token,
        tokenType: 'Bearer',
        expiresIn: 30 * 24 * 60 * 60 // 30 days in seconds
      }
    });

  } catch (error) {
    logger.error('Token refresh error:', error);

    if (error instanceof APIError) {
      res.status(Number(error.status)).json({
        success: false,
        error: { message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error during token refresh' }
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const headers = fromNodeHeaders(req.headers);

    let session;
    try {
       session = await auth.api.getSession({ headers });
      if (session) {
        await auth.api.signOut({ headers });
        logger.info('User logged out successfully', { userId: session.user.id });
      }
    } catch (error) {
      if (error instanceof APIError && error.status === 401) {
        logger.warn('Logout attempted with no active session');
      } else {
        throw error;
      }
    }

    res.clearCookie('session');
    res.json({
      success: true,
      message: 'Successfully logged out',
      data: {
        userId: session?.user.id,
        email: session?.user.email
      }
    });
  } catch (error) {
    logger.error('Logout error:', error);
    const status = error instanceof APIError ? Number(error.status) : 500;
    const message = error instanceof APIError ? error.message : 'Error during logout';

    res.status(status).json({
      success: false,
      error: { message }
    });
  }
};

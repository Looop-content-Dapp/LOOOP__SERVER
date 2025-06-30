import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { validateEmail } from '@/utils/validation';
import { auth } from '@/config/auth';
import { createHeaders } from '@/middleware/auth';
import { fromNodeHeaders } from 'better-auth/node';

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface TokenPayload {
  userId: string;
  email: string;
}

interface LogoutRequest {
  token?: string;
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

    const user = await prisma.user.findUnique({ where: { email } });
    console.log("user", user)

    // Find user with account
    const response = await auth.api.signInEmail({
    body: {
      email: email.toLowerCase(),
      password: password,
      rememberMe
    }
    })

    if (!user) {
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

    const data = await prisma.user.findUnique({where: {email}})

    // Prepare user data for response
    const userData = {
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      username: data.username,
      image:  response.user.image,
      emailVerified: response.user.emailVerified,
      isVerified: data.isVerified,
      bio: data.bio,
      lastLoginAt: data.lastLoginAt
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        accessToken: response.token,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
        tokenType: 'Bearer'
      }
    });

  } catch (error) {
    logger.error('Login error:', error);

    if (error.statusCode) {
      res.status(error.statusCode).json({
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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw createError('Refresh token required', 400);
    }

    const secret = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET;
    if (!secret) {
      throw createError('Authentication configuration error', 500);
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, secret) as TokenPayload;

    // Check if session exists and is valid
    const session = await prisma.session.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!session) {
      throw createError('Invalid or expired refresh token', 401);
    }

    // Generate new access token
    const tokenPayload: TokenPayload = {
      userId: session.user.id,
      email: session.user.email
    };

    const accessToken = jwt.sign(tokenPayload, secret, {
      expiresIn: '15m',
      issuer: 'looop-music',
      audience: 'looop-users'
    });

    logger.info('Token refreshed successfully', {
      userId: session.user.id,
      sessionId: session.id
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        expiresIn: 900, // 15 minutes in seconds
        tokenType: 'Bearer'
      }
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired refresh token' }
      });
      return;
    }

    logger.error('Token refresh error:', error);

    if (error.statusCode) {
      res.status(error.statusCode).json({
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
    // Get session from request headers
    await auth.api.signOut({
      headers: fromNodeHeaders(req.headers),
      method: 'POST'
    });

    // Clear any session cookies if using them
    res.clearCookie('session');
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    // Even if there's an error, we should return success for logout
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  }
};

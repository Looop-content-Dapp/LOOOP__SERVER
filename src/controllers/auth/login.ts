import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { validateEmail } from '@/utils/validation';

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

    // Find user with account
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        accounts: {
          where: { providerId: 'credential' }
        }
      }
    });

    if (!user || user.accounts.length === 0) {
      // Generic error message for security
      throw createError('Invalid email or password', 401);
    }

    const account = user.accounts[0];
    if (!account.password) {
      throw createError('Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, account.password);
    if (!isValidPassword) {
      logger.warn('Failed login attempt', { 
        email: email.toLowerCase(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      throw createError('Invalid email or password', 401);
    }

    // Generate tokens
    const secret = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      throw createError('Authentication configuration error', 500);
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email
    };

    // Access token (15 minutes)
    const accessToken = jwt.sign(tokenPayload, secret, {
      expiresIn: '15m',
      issuer: 'looop-music',
      audience: 'looop-users'
    });

    // Refresh token (7 days or 30 days if remember me)
    const refreshTokenExpiry = rememberMe ? '30d' : '7d';
    const refreshToken = jwt.sign(tokenPayload, secret, {
      expiresIn: refreshTokenExpiry,
      issuer: 'looop-music',
      audience: 'looop-users'
    });

    // Create session in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null
      }
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      sessionId: session.id,
      rememberMe
    });

    // Prepare user data for response
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      image: user.image,
      emailVerified: user.emailVerified,
      isVerified: user.isVerified,
      bio: user.bio,
      lastLoginAt: user.lastLoginAt
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        accessToken,
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
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove session from database
      await prisma.session.deleteMany({
        where: { token: refreshToken }
      });

      logger.info('User logged out successfully');
    }

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

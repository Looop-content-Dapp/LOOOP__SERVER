import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { validateEmail } from '@/utils/validation';
import { AuthService } from '@/services/auth.service';
import { LoginRequest, AuthResponse } from '@/types/auth.types';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validation
    if (!email || !password) {
      throw createError('Email and password are required', 400);
    }

    if (!validateEmail(email)) {
      throw createError('Invalid email format', 400);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        username: true,
        bio: true,
        image: true,
        isVerified: true,
        emailVerified: true,
        lastLoginAt: true,
        authProvider: true
      }
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', {
        email: email.toLowerCase(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      throw createError('Invalid email or password', 401);
    }

    // Check if user is registered through OAuth
    if (user.authProvider && user.authProvider !== 'EMAIL') {
      logger.warn('Login attempt for OAuth user with password', {
        userId: user.id,
        email: user.email,
        provider: user.authProvider,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      throw createError(`Please login with ${user.authProvider.toLowerCase()}`, 401);
    }

    // Verify password
    const isValidPassword = await AuthService.comparePassword(password, user.password);
    if (!isValidPassword) {
      logger.warn('Failed login attempt - invalid password', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      throw createError('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      username: user.username || undefined,
      isVerified: user.isVerified,
      emailVerified: user.emailVerified
      
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email
    });

    const response: AuthResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          bio: user.bio,
          image: user.image,
          isVerified: user.isVerified,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt
        },
        token,
        tokenType: 'Bearer',
        expiresIn: 30 * 24 * 60 * 60 // 30 days in seconds
      }
    };

    res.status(200).json(response);

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

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    message: 'Successfully logged out'
  });
};

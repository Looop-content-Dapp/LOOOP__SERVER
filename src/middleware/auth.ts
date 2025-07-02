import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { AuthService } from '@/services/auth.service';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string;
    username?: string;
    bio?: string;
    isVerified: boolean;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = AuthService.verifyToken(token);

    req.user = {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      username: payload.username,
      emailVerified: payload.emailVerified,
      isVerified: payload.isVerified
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid authentication'
      }
    });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = AuthService.verifyToken(token);

      req.user = {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        username: payload.username,
        emailVerified: payload.emailVerified,
        isVerified: payload.isVerified
      };
    }

    next();
  } catch (error) {
    logger.warn('Optional auth failed:', error);
    next();
  }
};

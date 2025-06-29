import { Request, Response, NextFunction } from 'express';
import { auth } from '@/config/auth';
import { logger } from '@/utils/logger';

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
  session?: {
    id: string;
    expiresAt: Date;
    token: string;
    userId: string;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as Record<string, string>
    });

    if (!session) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
      return;
    }

    // Attach user and session to request
    req.user = session.user;
    req.session = session.session;

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
    const session = await auth.api.getSession({
      headers: req.headers as Record<string, string>
    });

    if (session) {
      req.user = session.user;
      req.session = session.session;
    }

    next();
  } catch (error) {
    logger.warn('Optional auth failed:', error);
    next();
  }
};

import { Request, Response, NextFunction } from 'express';
import { auth } from '@/config/auth';
import { logger } from '@/utils/logger';
import { fromNodeHeaders } from 'better-auth/node';

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
    const headers = fromNodeHeaders(req.headers);
    const session = await auth.api.getSession({ headers });

    if (!session || !session.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
      return;
    }

    // Attach user and session to request
    req.user = {
      ...session.user,
      isVerified: session.user.emailVerified || false
    };

    req.session = {
      id: session.user.id,
      token: session.session.token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      userId: session.user.id
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
    const headers = fromNodeHeaders(req.headers);
    const session = await auth.api.getSession({ headers });

    if (session && session.user) {
      req.user = {
        ...session.user,
        isVerified: session.user.emailVerified || false
      };
      req.session = {
        id: session.user.id,
        token: session.session.token,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        userId: session.user.id
      };
    }

    next();
  } catch (error) {
    logger.warn('Optional auth failed:', error);
    next();
  }
};

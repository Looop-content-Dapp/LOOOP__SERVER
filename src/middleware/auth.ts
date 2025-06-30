import { Request, Response, NextFunction } from 'express';
import { auth } from '@/config/auth';
import { logger } from '@/utils/logger';
import { fromNodeHeaders } from 'better-auth/node';
import { prisma } from '@/config/database';

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

// Helper function to convert Express headers to Web API Headers
export function createHeaders(expressHeaders: any): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(expressHeaders)) {
    if (typeof value === 'string') {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(', '));
    }
  }

  return headers;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: createHeaders(req.headers),
    });
    console.log("session", session);

    if (!session) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
      return;
    }

    // Attach user and session to request with isVerified property
    req.user = {
      ...session.user,
      isVerified: session.user.emailVerified || false
    };
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
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: createHeaders(req.headers)
    });

    if (session) {
      req.user = {
        ...session.user,
        isVerified: session.user.emailVerified || false
      };
      req.session = session.session;
    }

    next();
  } catch (error) {
    logger.warn('Optional auth failed:', error);
    next();
  }
};

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { createError } from './errorHandler';
import { logger } from '@/utils/logger';
import { UserRole, AdminLevel, LOOOP_ADMIN_DOMAIN } from '@/types/admin.types';
import { prisma } from '@/config/database';

export interface AdminRequest extends AuthenticatedRequest {
  admin?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    adminLevel?: AdminLevel;
    permissions: string[];
    isAdmin: boolean;
  };
}

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('Authentication required', 401);
    }

    // Get user with admin details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        adminLevel: true,
        permissions: true,
        isAdmin: true
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    if (!user.isAdmin || user.role === 'USER') {
      logger.warn('Non-admin user attempted to access admin endpoint', {
        userId,
        email: user.email,
        role: user.role
      });
      throw createError('Admin access required', 403);
    }

    // Check if email is from LOOOP domain
    if (!user.email.endsWith(LOOOP_ADMIN_DOMAIN)) {
      logger.warn('Non-LOOOP email attempted admin access', {
        userId,
        email: user.email
      });
      throw createError('Invalid admin domain', 403);
    }

    req.admin = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      adminLevel: user.adminLevel as AdminLevel,
      permissions: user.permissions,
      isAdmin: user.isAdmin
    };

    next();
  } catch (error) {
    logger.error('Admin authentication error:', error);
    
    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: { message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

/**
 * Middleware to check specific admin level
 */
export const requireAdminLevel = (requiredLevel: AdminLevel) => {
  return async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw createError('Admin authentication required', 401);
      }

      const adminLevelHierarchy = {
        'MODERATOR': 1,
        'ADMIN': 2,
        'SUPER_ADMIN': 3
      };

      const userLevel = adminLevelHierarchy[req.admin.adminLevel || 'MODERATOR'];
      const requiredLevelValue = adminLevelHierarchy[requiredLevel];

      if (userLevel < requiredLevelValue) {
        logger.warn('Insufficient admin level', {
          userId: req.admin.id,
          userLevel: req.admin.adminLevel,
          requiredLevel
        });
        throw createError(`${requiredLevel} level required`, 403);
      }

      next();
    } catch (error) {
      logger.error('Admin level check error:', error);
      
      if (error.statusCode) {
        res.status(error.statusCode).json({
          success: false,
          error: { message: error.message }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { message: 'Internal server error' }
      });
    }
  };
};

/**
 * Middleware to check specific permission
 */
export const requirePermission = (permission: string) => {
  return async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        throw createError('Admin authentication required', 401);
      }

      if (!req.admin.permissions.includes(permission)) {
        logger.warn('Insufficient permissions', {
          userId: req.admin.id,
          requiredPermission: permission,
          userPermissions: req.admin.permissions
        });
        throw createError(`Permission '${permission}' required`, 403);
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      
      if (error.statusCode) {
        res.status(error.statusCode).json({
          success: false,
          error: { message: error.message }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { message: 'Internal server error' }
      });
    }
  };
};

/**
 * Utility function to check if email is valid LOOOP admin domain
 */
export const isValidAdminEmail = (email: string): boolean => {
  return email.endsWith(LOOOP_ADMIN_DOMAIN) && email.length > LOOOP_ADMIN_DOMAIN.length;
};

/**
 * Middleware to validate admin email domain during registration
 */
export const validateAdminDomain = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { email } = req.body;

    if (!email) {
      throw createError('Email is required', 400);
    }

    if (!isValidAdminEmail(email)) {
      throw createError(`Admin registration requires ${LOOOP_ADMIN_DOMAIN} email domain`, 400);
    }

    next();
  } catch (error) {
    logger.error('Admin domain validation error:', error);
    
    if (error.statusCode) {
      res.status(error.statusCode).json({
        success: false,
        error: { message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

/**
 * Combined middleware for admin routes requiring specific permissions
 */
export const adminWithPermission = (permission: string) => {
  return [requireAdmin, requirePermission(permission)];
};

/**
 * Combined middleware for admin routes requiring specific level
 */
export const adminWithLevel = (level: AdminLevel) => {
  return [requireAdmin, requireAdminLevel(level)];
};

/**
 * Super admin only middleware
 */
export const requireSuperAdmin = [requireAdmin, requireAdminLevel('SUPER_ADMIN')];

/**
 * Admin or higher middleware
 */
export const requireAdminOrHigher = [requireAdmin, requireAdminLevel('ADMIN')];

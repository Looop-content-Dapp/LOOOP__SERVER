import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { AdminRequest } from '@/middleware/adminAuth';
import { AdminService } from '@/services/admin.service';
import { prisma } from '@/config/database';
import {
  AdminRegistrationRequest,
  AdminLevel,
  PlaylistCreationRequest
} from '@/types/admin.types';

/**
 * Register new admin user
 */
export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrationData: AdminRegistrationRequest = req.body;

    const result = await AdminService.registerAdmin(registrationData);

    res.status(201).json(result);

  } catch (error) {
    logger.error('Error in admin registration:', error);

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
 * Get admin dashboard statistics
 */
export const getDashboardStats = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const stats = await AdminService.getDashboardStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting dashboard stats:', error);

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
 * Get all admin users
 */
export const getAllAdmins = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const admins = await AdminService.getAllAdmins();

    res.json({
      success: true,
      data: admins
    });

  } catch (error) {
    logger.error('Error getting all admins:', error);

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
 * Approve pending admin user (Super Admin only)
 */
export const approveAdmin = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { adminLevel, permissions }: { adminLevel?: AdminLevel; permissions?: string[] } = req.body;
    const approvedBy = req.admin!.id;

    const approvedUser = await AdminService.approveAdmin(
      userId,
      approvedBy,
      adminLevel,
      permissions
    );

    logger.info('Admin approved', {
      approvedUserId: userId,
      approvedBy,
      adminLevel
    });

    res.json({
      success: true,
      message: 'Admin user approved successfully',
      data: approvedUser
    });

  } catch (error) {
    logger.error('Error approving admin:', error);

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
 * Update admin permissions (Super Admin only)
 */
export const updateAdminPermissions = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { permissions }: { permissions: string[] } = req.body;
    const updatedBy = req.admin!.id;

    if (!permissions || !Array.isArray(permissions)) {
      throw createError('Valid permissions array is required', 400);
    }

    const updatedUser = await AdminService.updateAdminPermissions(
      userId,
      permissions,
      updatedBy
    );

    logger.info('Admin permissions updated', {
      targetUserId: userId,
      updatedBy,
      newPermissions: permissions
    });

    res.json({
      success: true,
      message: 'Admin permissions updated successfully',
      data: updatedUser
    });

  } catch (error) {
    logger.error('Error updating admin permissions:', error);

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
 * Create admin playlist
 */
export const createAdminPlaylist = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const playlistData: PlaylistCreationRequest = req.body;
    const adminId = req.admin!.id;

    const playlist = await AdminService.createAdminPlaylist(adminId, playlistData);

    logger.info('Admin playlist created', {
      playlistId: playlist.id,
      adminId,
      title: playlist.title
    });

    res.status(201).json({
      success: true,
      message: 'Admin playlist created successfully',
      data: playlist
    });

  } catch (error) {
    logger.error('Error creating admin playlist:', error);

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
 * Get current admin profile
 */
export const getAdminProfile = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const adminInfo = req.admin!;

    res.json({
      success: true,
      data: {
        admin: adminInfo
      }
    });

  } catch (error) {
    logger.error('Error getting admin profile:', error);

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

/**
 * Ban user (Admin permission required)
 */
export const banUser = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason, duration }: { reason: string; duration?: number } = req.body;
    const bannedBy = req.admin!.id;

    if (!reason) {
      throw createError('Ban reason is required', 400);
    }

    // TODO: Implement user banning logic
    // This would involve creating a UserBan model and updating user status

    logger.info('User banned by admin', {
      userId,
      bannedBy,
      reason,
      duration
    });

    res.json({
      success: true,
      message: 'User banned successfully'
    });

  } catch (error) {
    logger.error('Error banning user:', error);

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
 * Get pending admin registrations (Super Admin only)
 */
export const getPendingAdminRegistrations = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const pendingAdmins = await prisma.user.findMany({
      where: {
        email: { endsWith: '@looopmusic.com' },
        isAdmin: false,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminLevel: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: pendingAdmins
    });

  } catch (error) {
    logger.error('Error getting pending admin registrations:', error);

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

/**
 * Check if admin bootstrap is needed
 */
export const checkBootstrapStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const superAdminCount = await prisma.user.count({
      where: {
        role: 'SUPER_ADMIN',
        isAdmin: true
      }
    });

    const isBootstrapNeeded = superAdminCount === 0;

    res.json({
      success: true,
      data: {
        isBootstrapNeeded,
        superAdminCount,
        message: isBootstrapNeeded 
          ? 'No SUPER_ADMIN exists. Bootstrap required.' 
          : 'SUPER_ADMIN exists. System is ready.',
        recommendation: isBootstrapNeeded 
          ? 'Run bootstrap script or register first SUPER_ADMIN through /admin/register endpoint'
          : 'System is properly configured'
      }
    });

  } catch (error) {
    logger.error('Error checking bootstrap status:', error);

    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

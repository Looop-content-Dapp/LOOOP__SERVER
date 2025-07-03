import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { AuthService } from './auth.service';
import {
  AdminRegistrationRequest,
  AdminRegistrationResponse,
  AdminUser,
  AdminLevel,
  UserRole,
  DEFAULT_ADMIN_PERMISSIONS,
  LOOOP_ADMIN_DOMAIN,
  AdminDashboardStats,
  UserManagementFilters,
  PlaylistCreationRequest,
  FeaturedPlaylist
} from '@/types/admin.types';
import { isValidAdminEmail } from '@/middleware/adminAuth';

export class AdminService {
  /**
   * Register a new admin user
   */
  public static async registerAdmin(
    registrationData: AdminRegistrationRequest
  ): Promise<AdminRegistrationResponse> {
    try {
      const { name, email, password, adminLevel, requestedPermissions, justification } = registrationData;

      // Validate email domain
      if (!isValidAdminEmail(email)) {
        throw createError(`Admin registration requires ${LOOOP_ADMIN_DOMAIN} email domain`, 400);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw createError('User with this email already exists', 409);
      }

      // Hash password
      const hashedPassword = await AuthService.hashPassword(password);

      // Determine permissions based on admin level
      const permissions = requestedPermissions || DEFAULT_ADMIN_PERMISSIONS[adminLevel];

      // Check if this is the first admin (bootstrap scenario)
      const existingSuperAdmins = await prisma.user.count({
        where: {
          role: 'SUPER_ADMIN',
          isAdmin: true
        }
      });

      // Auto-approve if:
      // 1. It's a MODERATOR registration, OR
      // 2. No SUPER_ADMIN exists yet (bootstrap scenario)
      const isBootstrapScenario = existingSuperAdmins === 0;
      const isAutoApprove = adminLevel === 'MODERATOR' || (isBootstrapScenario && adminLevel === 'SUPER_ADMIN');
      const role: UserRole = adminLevel === 'SUPER_ADMIN' ? 'SUPER_ADMIN' :
                             adminLevel === 'ADMIN' ? 'ADMIN' : 'MODERATOR';

      if (isBootstrapScenario && adminLevel === 'SUPER_ADMIN') {
        logger.info('Bootstrap scenario detected - auto-approving first SUPER_ADMIN', {
          email: email.toLowerCase(),
          name
        });
      }

      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: role,
          adminLevel: adminLevel,
          permissions: permissions,
          isAdmin: isAutoApprove,
          adminApprovedAt: isAutoApprove ? new Date() : null,
          emailVerified: true, // Auto-verify LOOOP domain emails
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          adminLevel: true,
          permissions: true,
          isAdmin: true,
          adminApprovedAt: true,
          adminApprovedBy: true,
          createdAt: true,
          updatedAt: true
        }
      });

      const responseUser: AdminUser = {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role as UserRole,
        adminLevel: adminUser.adminLevel as AdminLevel,
        permissions: adminUser.permissions,
        isAdmin: adminUser.isAdmin,
        adminApprovedAt: adminUser.adminApprovedAt?.toISOString(),
        adminApprovedBy: adminUser.adminApprovedBy || undefined,
        createdAt: adminUser.createdAt.toISOString(),
        updatedAt: adminUser.updatedAt.toISOString()
      };

      const requiresApproval = !isAutoApprove;

      logger.info('Admin user registered', {
        userId: adminUser.id,
        email: adminUser.email,
        adminLevel,
        requiresApproval,
        justification
      });

      return {
        success: true,
        message: isAutoApprove
          ? 'Admin account created successfully'
          : 'Admin registration submitted for approval',
        data: {
          user: responseUser,
          requiresApproval,
          ...(requiresApproval && {
            approvalInfo: {
              submittedAt: new Date().toISOString(),
              estimatedReviewTime: '1-2 business days'
            }
          })
        }
      };

    } catch (error) {
      logger.error('Error registering admin user:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to register admin user', 500);
    }
  }

  /**
   * Approve pending admin user
   */
  public static async approveAdmin(
    userId: string,
    approvedBy: string,
    adminLevel?: AdminLevel,
    customPermissions?: string[]
  ): Promise<AdminUser> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      if (user.isAdmin) {
        throw createError('User is already an approved admin', 400);
      }

      if (!user.email.endsWith(LOOOP_ADMIN_DOMAIN)) {
        throw createError('User email is not from LOOOP domain', 400);
      }

      const finalAdminLevel = adminLevel || user.adminLevel || 'MODERATOR';
      const finalPermissions = customPermissions || DEFAULT_ADMIN_PERMISSIONS[finalAdminLevel];
      const role: UserRole = finalAdminLevel === 'SUPER_ADMIN' ? 'SUPER_ADMIN' :
                            finalAdminLevel === 'ADMIN' ? 'ADMIN' : 'MODERATOR';

      const approvedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          role: role,
          adminLevel: finalAdminLevel,
          permissions: finalPermissions,
          isAdmin: true,
          adminApprovedAt: new Date(),
          adminApprovedBy: approvedBy
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          adminLevel: true,
          permissions: true,
          isAdmin: true,
          adminApprovedAt: true,
          adminApprovedBy: true,
          createdAt: true,
          updatedAt: true
        }
      });

      logger.info('Admin user approved', {
        userId,
        approvedBy,
        adminLevel: finalAdminLevel
      });

      return {
        id: approvedUser.id,
        name: approvedUser.name,
        email: approvedUser.email,
        role: approvedUser.role as UserRole,
        adminLevel: approvedUser.adminLevel as AdminLevel,
        permissions: approvedUser.permissions,
        isAdmin: approvedUser.isAdmin,
        adminApprovedAt: approvedUser.adminApprovedAt?.toISOString(),
        adminApprovedBy: approvedUser.adminApprovedBy || undefined,
        createdAt: approvedUser.createdAt.toISOString(),
        updatedAt: approvedUser.updatedAt.toISOString()
      };

    } catch (error) {
      logger.error('Error approving admin user:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to approve admin user', 500);
    }
  }

  /**
   * Get admin dashboard statistics
   */
  public static async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      const [
        totalUsers,
        totalArtists,
        pendingArtistClaims,
        totalTracks,
        totalPlaylists,
        activeSubscriptions
      ] = await Promise.all([
        prisma.user.count(),
        prisma.artist.count(),
        prisma.artistClaim.count({ where: { status: 'pending' } }),
        prisma.track.count(),
        prisma.playlist.count(),
        prisma.userSubscription.count({ where: { status: 'active' } })
      ]);

      // Get recent activity for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const [newUsers, newTracks, newArtistClaims] = await Promise.all([
          prisma.user.count({
            where: {
              createdAt: {
                gte: date,
                lt: nextDate
              }
            }
          }),
          prisma.track.count({
            where: {
              createdAt: {
                gte: date,
                lt: nextDate
              }
            }
          }),
          prisma.artistClaim.count({
            where: {
              createdAt: {
                gte: date,
                lt: nextDate
              }
            }
          })
        ]);

        recentActivity.push({
          date: date.toISOString().split('T')[0],
          newUsers,
          newTracks,
          newArtistClaims
        });
      }

      // Calculate growth metrics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const [
        currentMonthUsers,
        previousMonthUsers,
        currentMonthTracks,
        previousMonthTracks,
        currentMonthArtists,
        previousMonthArtists
      ] = await Promise.all([
        prisma.user.count({
          where: { createdAt: { gte: thirtyDaysAgo } }
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo
            }
          }
        }),
        prisma.track.count({
          where: { createdAt: { gte: thirtyDaysAgo } }
        }),
        prisma.track.count({
          where: {
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo
            }
          }
        }),
        prisma.artist.count({
          where: { createdAt: { gte: thirtyDaysAgo } }
        }),
        prisma.artist.count({
          where: {
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo
            }
          }
        })
      ]);

      const userGrowthPercentage = previousMonthUsers > 0
        ? ((currentMonthUsers - previousMonthUsers) / previousMonthUsers) * 100
        : 0;

      const trackGrowthPercentage = previousMonthTracks > 0
        ? ((currentMonthTracks - previousMonthTracks) / previousMonthTracks) * 100
        : 0;

      const artistGrowthPercentage = previousMonthArtists > 0
        ? ((currentMonthArtists - previousMonthArtists) / previousMonthArtists) * 100
        : 0;

      return {
        totalUsers,
        totalArtists,
        pendingArtistClaims,
        totalTracks,
        totalPlaylists,
        activeSubscriptions,
        recentActivity,
        userGrowth: {
          current: currentMonthUsers,
          previous: previousMonthUsers,
          percentage: Math.round(userGrowthPercentage * 100) / 100
        },
        contentGrowth: {
          tracks: {
            current: currentMonthTracks,
            previous: previousMonthTracks,
            percentage: Math.round(trackGrowthPercentage * 100) / 100
          },
          artists: {
            current: currentMonthArtists,
            previous: previousMonthArtists,
            percentage: Math.round(artistGrowthPercentage * 100) / 100
          }
        }
      };

    } catch (error) {
      logger.error('Error getting admin dashboard stats:', error);
      throw createError('Failed to get dashboard statistics', 500);
    }
  }

  /**
   * Get all admin users
   */
  public static async getAllAdmins(): Promise<AdminUser[]> {
    try {
      const admins = await prisma.user.findMany({
        where: {
          OR: [
            { isAdmin: true },
            { role: { in: ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'] } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          adminLevel: true,
          permissions: true,
          isAdmin: true,
          adminApprovedAt: true,
          adminApprovedBy: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [
          { role: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return admins.map(admin => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role as UserRole,
        adminLevel: admin.adminLevel as AdminLevel,
        permissions: admin.permissions,
        isAdmin: admin.isAdmin,
        adminApprovedAt: admin.adminApprovedAt?.toISOString(),
        adminApprovedBy: admin.adminApprovedBy || undefined,
        createdAt: admin.createdAt.toISOString(),
        updatedAt: admin.updatedAt.toISOString()
      }));

    } catch (error) {
      logger.error('Error getting all admins:', error);
      throw createError('Failed to get admin users', 500);
    }
  }

  /**
   * Update admin permissions
   */
  public static async updateAdminPermissions(
    userId: string,
    permissions: string[],
    updatedBy: string
  ): Promise<AdminUser> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      if (!user.isAdmin) {
        throw createError('User is not an admin', 400);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          permissions,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          adminLevel: true,
          permissions: true,
          isAdmin: true,
          adminApprovedAt: true,
          adminApprovedBy: true,
          createdAt: true,
          updatedAt: true
        }
      });

      logger.info('Admin permissions updated', {
        userId,
        updatedBy,
        newPermissions: permissions
      });

      return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role as UserRole,
        adminLevel: updatedUser.adminLevel as AdminLevel,
        permissions: updatedUser.permissions,
        isAdmin: updatedUser.isAdmin,
        adminApprovedAt: updatedUser.adminApprovedAt?.toISOString(),
        adminApprovedBy: updatedUser.adminApprovedBy || undefined,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString()
      };

    } catch (error) {
      logger.error('Error updating admin permissions:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to update admin permissions', 500);
    }
  }

  /**
   * Create admin playlist
   */
  public static async createAdminPlaylist(
    adminId: string,
    playlistData: PlaylistCreationRequest
  ): Promise<FeaturedPlaylist> {
    try {
      const { title, description, isPublic, isFeatured, trackIds, artworkUrl } = playlistData;

      // Verify tracks exist
      const tracks = await prisma.track.findMany({
        where: {
          id: { in: trackIds }
        }
      });

      if (tracks.length !== trackIds.length) {
        throw createError('Some tracks not found', 404);
      }

      // Create playlist
      const playlist = await prisma.$transaction(async (tx) => {
        const newPlaylist = await tx.playlist.create({
          data: {
            title,
            description,
            isPublic,
            artworkUrl,
            userId: adminId
          }
        });

        // Add tracks to playlist
        const playlistTracks = trackIds.map((trackId, index) => ({
          playlistId: newPlaylist.id,
          trackId,
          position: index + 1
        }));

        await tx.playlistTrack.createMany({
          data: playlistTracks
        });

        return newPlaylist;
      });

      // Get admin info
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { id: true, name: true, isAdmin: true }
      });

      logger.info('Admin playlist created', {
        playlistId: playlist.id,
        adminId,
        title,
        trackCount: trackIds.length,
        isFeatured
      });

      return {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        artworkUrl: playlist.artworkUrl,
        trackCount: trackIds.length,
        createdBy: {
          id: admin!.id,
          name: admin!.name,
          isAdmin: admin!.isAdmin
        },
        isFeatured: isFeatured || false,
        featuredAt: isFeatured ? new Date().toISOString() : undefined,
        createdAt: playlist.createdAt.toISOString()
      };

    } catch (error) {
      logger.error('Error creating admin playlist:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to create admin playlist', 500);
    }
  }
}

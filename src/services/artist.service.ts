import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';

export interface ArtistProfile {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  biography?: string;
  address1?: string;
  address2?: string;
  country?: string;
  postalcode?: string;
  city?: string;
  websiteurl?: string;
  monthlyListeners: number;
  followers: number;
  verified: boolean;
  verifiedAt?: Date;
  socialLinks?: any;
  popularity: number;
  topTracks?: any;
  roles: string[];
  labels: string[];
  genres: string[];
  wallet?: any;
  claimedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtistClaimRequest {
  email: string;
  artistId: string;
  evidenceUrl?: string;
}

export interface ArtistAnalytics {
  totalPlays: number;
  totalFollowers: number;
  totalTracks: number;
  monthlyListeners: number;
  popularity: number;
  topTracks: any[];
  recentActivity: any[];
  dailyStats: any[];
  growthData: {
    followers: { current: number; change: number; percentage: number };
    plays: { current: number; change: number; percentage: number };
  };
}

export class ArtistService {
  /**
   * Get artist profile by ID
   */
  public static async getArtistProfile(artistId: string): Promise<ArtistProfile> {
    try {
      const artist = await prisma.artist.findUnique({
        where: { id: artistId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              isVerified: true
            }
          },
          tracks: {
            select: {
              id: true,
              title: true,
              playCount: true,
              likeCount: true,
              artworkUrl: true,
              createdAt: true
            },
            orderBy: { playCount: 'desc' },
            take: 10
          },
          _count: {
            select: {
              tracks: true,
              communities: true,
              subscriptions: true
            }
          }
        }
      });

      if (!artist) {
        throw createError('Artist not found', 404);
      }

      logger.info('Artist profile retrieved successfully', { artistId });
      return artist as ArtistProfile;
    } catch (error) {
      logger.error('Error retrieving artist profile:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to retrieve artist profile', 500);
    }
  }

  /**
   * Get artist profile by user ID
   */
  public static async getArtistByUserId(userId: string): Promise<ArtistProfile | null> {
    try {
      const artist = await prisma.artist.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              isVerified: true
            }
          },
          tracks: {
            select: {
              id: true,
              title: true,
              playCount: true,
              likeCount: true,
              artworkUrl: true,
              createdAt: true
            },
            orderBy: { playCount: 'desc' },
            take: 10
          },
          _count: {
            select: {
              tracks: true,
              communities: true,
              subscriptions: true
            }
          }
        }
      });

      if (artist) {
        logger.info('Artist profile found for user', { userId, artistId: artist.id });
      }

      return artist as ArtistProfile | null;
    } catch (error) {
      logger.error('Error retrieving artist by user ID:', error);
      throw createError('Failed to retrieve artist profile', 500);
    }
  }

  /**
   * Create artist profile (claiming process)
   */
  public static async claimArtistProfile(
    userId: string,
    claimData: ArtistClaimRequest
  ): Promise<{ claim: any; artist: ArtistProfile }> {
    try {
      // Check if user already has an artist profile
      const existingArtist = await prisma.artist.findUnique({
        where: { userId }
      });

      if (existingArtist) {
        throw createError('User already has an artist profile', 409);
      }

      // Check if there's already a pending claim for this artist
      const existingClaim = await prisma.artistClaim.findFirst({
        where: {
          userId,
          artistId: claimData.artistId,
          status: 'pending'
        }
      });

      if (existingClaim) {
        throw createError('Claim request already exists for this artist', 409);
      }

      // Check if artist exists
      const targetArtist = await prisma.artist.findUnique({
        where: { id: claimData.artistId }
      });

      if (!targetArtist) {
        throw createError('Artist not found', 404);
      }

      if (targetArtist.claimedAt) {
        throw createError('Artist profile has already been claimed', 409);
      }

      // Create claim request
      const claim = await prisma.artistClaim.create({
        data: {
          userId,
          email: claimData.email,
          artistId: claimData.artistId,
          evidenceUrl: claimData.evidenceUrl,
          status: 'pending'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          artist: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      logger.info('Artist claim request created', { 
        userId, 
        artistId: claimData.artistId,
        claimId: claim.id 
      });

      return { claim, artist: targetArtist as ArtistProfile };
    } catch (error) {
      logger.error('Error creating artist claim:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to create artist claim', 500);
    }
  }

  /**
   * Approve artist claim (admin function)
   */
  public static async approveArtistClaim(claimId: string): Promise<ArtistProfile> {
    try {
      const claim = await prisma.artistClaim.findUnique({
        where: { id: claimId },
        include: {
          user: true,
          artist: true
        }
      });

      if (!claim) {
        throw createError('Claim not found', 404);
      }

      if (claim.status !== 'pending') {
        throw createError('Claim is not pending', 400);
      }

      // Update claim status and link user to artist
      await prisma.$transaction(async (tx) => {
        // Update claim status
        await tx.artistClaim.update({
          where: { id: claimId },
          data: { status: 'approved' }
        });

        // Update artist with user association
        await tx.artist.update({
          where: { id: claim.artistId },
          data: {
            userId: claim.userId,
            claimedAt: new Date(),
            verified: true,
            verifiedAt: new Date()
          }
        });

        // Update user's artist relation
        await tx.user.update({
          where: { id: claim.userId },
          data: {
            isVerified: true
          }
        });
      });

      const updatedArtist = await this.getArtistProfile(claim.artistId);

      logger.info('Artist claim approved', { 
        claimId, 
        userId: claim.userId, 
        artistId: claim.artistId 
      });

      return updatedArtist;
    } catch (error) {
      logger.error('Error approving artist claim:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to approve artist claim', 500);
    }
  }

  /**
   * Reject artist claim (admin function)
   */
  public static async rejectArtistClaim(claimId: string, reason?: string): Promise<void> {
    try {
      const claim = await prisma.artistClaim.findUnique({
        where: { id: claimId }
      });

      if (!claim) {
        throw createError('Claim not found', 404);
      }

      if (claim.status !== 'pending') {
        throw createError('Claim is not pending', 400);
      }

      await prisma.artistClaim.update({
        where: { id: claimId },
        data: { 
          status: 'rejected',
          // You could add a rejection reason field to the schema
        }
      });

      logger.info('Artist claim rejected', { 
        claimId, 
        reason: reason || 'No reason provided' 
      });
    } catch (error) {
      logger.error('Error rejecting artist claim:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to reject artist claim', 500);
    }
  }

  /**
   * Update artist profile
   */
  public static async updateArtistProfile(
    artistId: string,
    updateData: Partial<ArtistProfile>
  ): Promise<ArtistProfile> {
    try {
      // Remove fields that shouldn't be updated directly
      const { id, createdAt, updatedAt, user, tracks, _count, ...allowedData } = updateData as any;

      const updatedArtist = await prisma.artist.update({
        where: { id: artistId },
        data: allowedData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              isVerified: true
            }
          },
          tracks: {
            select: {
              id: true,
              title: true,
              playCount: true,
              likeCount: true,
              artworkUrl: true,
              createdAt: true
            },
            orderBy: { playCount: 'desc' },
            take: 10
          },
          _count: {
            select: {
              tracks: true,
              communities: true,
              subscriptions: true
            }
          }
        }
      });

      logger.info('Artist profile updated', { 
        artistId, 
        updatedFields: Object.keys(allowedData) 
      });

      return updatedArtist as ArtistProfile;
    } catch (error) {
      logger.error('Error updating artist profile:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to update artist profile', 500);
    }
  }

  /**
   * Get artist analytics
   */
  public static async getArtistAnalytics(artistId: string): Promise<ArtistAnalytics> {
    try {
      const artist = await prisma.artist.findUnique({
        where: { id: artistId },
        include: {
          tracks: {
            select: {
              id: true,
              title: true,
              playCount: true,
              likeCount: true,
              artworkUrl: true,
              createdAt: true
            }
          },
          analyticsDaily: {
            orderBy: { date: 'desc' },
            take: 30
          }
        }
      });

      if (!artist) {
        throw createError('Artist not found', 404);
      }

      // Calculate total plays across all tracks
      const totalPlays = artist.tracks.reduce((sum, track) => sum + track.playCount, 0);

      // Get recent daily analytics
      const dailyStats = artist.analyticsDaily.map(stat => ({
        date: stat.date,
        plays: stat.playCount,
        followers: stat.followerCount
      }));

      // Calculate growth data (comparing last 7 days to previous 7 days)
      const last7Days = dailyStats.slice(0, 7);
      const previous7Days = dailyStats.slice(7, 14);

      const currentFollowers = last7Days.length > 0 ? last7Days[0].followers : artist.followers;
      const previousFollowers = previous7Days.length > 0 ? previous7Days[0].followers : 0;
      const followerChange = currentFollowers - previousFollowers;
      const followerPercentage = previousFollowers > 0 ? (followerChange / previousFollowers) * 100 : 0;

      const currentPlays = last7Days.reduce((sum, day) => sum + day.plays, 0);
      const previousPlays = previous7Days.reduce((sum, day) => sum + day.plays, 0);
      const playsChange = currentPlays - previousPlays;
      const playsPercentage = previousPlays > 0 ? (playsChange / previousPlays) * 100 : 0;

      // Get top tracks
      const topTracks = artist.tracks
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 10)
        .map(track => ({
          id: track.id,
          title: track.title,
          playCount: track.playCount,
          likeCount: track.likeCount,
          artworkUrl: track.artworkUrl
        }));

      const analytics: ArtistAnalytics = {
        totalPlays,
        totalFollowers: artist.followers,
        totalTracks: artist.tracks.length,
        monthlyListeners: artist.monthlyListeners,
        popularity: artist.popularity,
        topTracks,
        recentActivity: [], // Could be populated with recent likes, comments, etc.
        dailyStats,
        growthData: {
          followers: {
            current: currentFollowers,
            change: followerChange,
            percentage: followerPercentage
          },
          plays: {
            current: currentPlays,
            change: playsChange,
            percentage: playsPercentage
          }
        }
      };

      logger.info('Artist analytics retrieved', { artistId });
      return analytics;
    } catch (error) {
      logger.error('Error retrieving artist analytics:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to retrieve artist analytics', 500);
    }
  }

  /**
   * Get all pending claims (admin function)
   */
  public static async getPendingClaims() {
    try {
      const claims = await prisma.artistClaim.findMany({
        where: { status: 'pending' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          artist: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      logger.info('Pending claims retrieved', { count: claims.length });
      return claims;
    } catch (error) {
      logger.error('Error retrieving pending claims:', error);
      throw createError('Failed to retrieve pending claims', 500);
    }
  }

  /**
   * Update daily analytics
   */
  public static async updateDailyAnalytics(artistId: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const artist = await prisma.artist.findUnique({
        where: { id: artistId },
        include: {
          tracks: {
            select: {
              playCount: true
            }
          }
        }
      });

      if (!artist) {
        throw createError('Artist not found', 404);
      }

      const totalPlays = artist.tracks.reduce((sum, track) => sum + track.playCount, 0);

      await prisma.artistAnalyticsDaily.upsert({
        where: {
          artistId_date: {
            artistId,
            date: today
          }
        },
        create: {
          artistId,
          date: today,
          playCount: totalPlays,
          followerCount: artist.followers
        },
        update: {
          playCount: totalPlays,
          followerCount: artist.followers
        }
      });

      logger.info('Daily analytics updated', { artistId, date: today });
    } catch (error) {
      logger.error('Error updating daily analytics:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to update daily analytics', 500);
    }
  }

  /**
   * Search artists
   */
  public static async searchArtists(query: string, limit = 20, offset = 0) {
    try {
      const artists = await prisma.artist.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { genres: { hasSome: [query] } },
                { labels: { hasSome: [query] } }
              ]
            }
          ]
        },
        select: {
          id: true,
          name: true,
          profileImage: true,
          verified: true,
          followers: true,
          monthlyListeners: true,
          genres: true,
          popularity: true
        },
        orderBy: [
          { verified: 'desc' },
          { popularity: 'desc' },
          { followers: 'desc' }
        ],
        take: limit,
        skip: offset
      });

      logger.info('Artists search completed', { query, results: artists.length });
      return artists;
    } catch (error) {
      logger.error('Error searching artists:', error);
      throw createError('Failed to search artists', 500);
    }
  }
}

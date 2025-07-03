import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import {
  ArtistClaimRequest,
  ArtistClaimResponse,
  ArtistClaimFull,
  ArtistSearchResult,
  ClaimStatus,
  ClaimStatistics,
  ArtistClaimSearchFilters,
  AdminClaimAction
} from '@/types/artist-claim.types';

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

// Legacy interface for backward compatibility
export interface LegacyArtistClaimRequest {
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
   * Search for artists (Step 3 in Spotify flow: Search & Select Your Artist Profile)
   */
  public static async searchArtistsForClaim(query: string, limit = 20): Promise<ArtistSearchResult[]> {
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
          socialLinks: true,
          claimedAt: true,
          createdAt: true,
          tracks: {
            select: {
              id: true,
              title: true,
              createdAt: true,
              artworkUrl: true
            },
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        },
        orderBy: [
          { verified: 'desc' },
          { monthlyListeners: 'desc' },
          { followers: 'desc' }
        ],
        take: limit
      });

      const searchResults: ArtistSearchResult[] = artists.map(artist => ({
        id: artist.id,
        name: artist.name,
        profileImage: artist.profileImage || undefined,
        followers: artist.followers,
        monthlyListeners: artist.monthlyListeners,
        verified: artist.verified,
        recentReleases: artist.tracks.map(track => ({
          id: track.id,
          title: track.title,
          releaseDate: track.createdAt.toISOString(),
          artworkUrl: track.artworkUrl || undefined
        })),
        socialLinks: artist.socialLinks as any,
        isClaimed: !!artist.claimedAt,
        claimedAt: artist.claimedAt?.toISOString()
      }));

      logger.info('Artist search for claims completed', { query, results: searchResults.length });
      return searchResults;
    } catch (error) {
      logger.error('Error searching artists for claims:', error);
      throw createError('Failed to search artists', 500);
    }
  }

  /**
   * Submit comprehensive artist claim (Following Spotify's step-by-step flow)
   */
  public static async submitArtistClaim(
    userId: string,
    claimData: ArtistClaimRequest
  ): Promise<ArtistClaimResponse> {
    try {
      // Validation
      if (!claimData.agreesToTerms || !claimData.agreesToPrivacy) {
        throw createError('You must agree to the terms and privacy policy', 400);
      }

      // Check if user already has an artist profile
      const existingArtist = await prisma.artist.findFirst({
        where: { userId }
      });

      if (existingArtist) {
        throw createError('You already have an artist profile', 409);
      }

      // Check for existing pending claims for this user
      const existingUserClaim = await prisma.artistClaim.findFirst({
        where: {
          userId,
          status: { in: ['pending', 'under_review', 'info_required'] }
        }
      });

      if (existingUserClaim) {
        throw createError('You already have a pending claim request', 409);
      }

      // For existing artists, check if already claimed
      if (claimData.artistId) {
        const targetArtist = await prisma.artist.findUnique({
          where: { id: claimData.artistId }
        });

        if (!targetArtist) {
          throw createError('Artist not found', 404);
        }

        if (targetArtist.claimedAt) {
          throw createError('This artist profile has already been claimed', 409);
        }

        // Check for existing claims on this artist
        const existingArtistClaim = await prisma.artistClaim.findFirst({
          where: {
            artistId: claimData.artistId,
            status: { in: ['pending', 'under_review', 'approved'] }
          }
        });

        if (existingArtistClaim) {
          throw createError('This artist profile already has a pending or approved claim', 409);
        }
      }

      // Generate tracking number
      const trackingNumber = `AC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Determine submission type
      const submissionType = claimData.distributorInfo?.isVerified ? 'distributor_verified' : 'manual';
      const initialStatus = submissionType === 'distributor_verified' ? 'under_review' : 'pending';

      // Create comprehensive claim
      const claim = await prisma.artistClaim.create({
        data: {
          userId,
          artistId: claimData.artistId || null, // Handle empty string case
          artistName: claimData.artistName,
          role: claimData.role,
          fullName: claimData.fullName,
          email: claimData.email,
          phone: claimData.phone || null,
          companyName: claimData.companyName || null,
          officialEmail: claimData.officialEmail || null,
          websiteUrl: claimData.websiteUrl || null,
          socialLinks: claimData.socialLinks as any,
          distributorInfo: claimData.distributorInfo as any,
          connectionDetails: claimData.connectionDetails || null,
          evidenceUrls: claimData.evidenceUrls || [],
          status: initialStatus,
          submissionType,
          submittedAt: new Date()
        }
      });

      const estimatedReviewTime = submissionType === 'distributor_verified' ? '1-2 business days' : '1-3 business days';
      const message = submissionType === 'distributor_verified'
        ? 'Your claim has been submitted with distributor verification. Our team will review it shortly.'
        : 'Your artist claim has been submitted successfully. Our team will review your request and get back to you soon.';

      const response: ArtistClaimResponse = {
        id: claim.id,
        status: claim.status as ClaimStatus,
        artistName: claim.artistName,
        artistId: claim.artistId || undefined,
        submittedAt: claim.submittedAt.toISOString(),
        estimatedReviewTime,
        message,
        trackingNumber
      };

      // TODO: Send confirmation email
      // await this.sendClaimConfirmationEmail(claim);

      // TODO: Notify admin team
      // await this.notifyAdminTeam(claim);

      logger.info('Artist claim submitted successfully', {
        userId,
        claimId: claim.id,
        artistName: claim.artistName,
        submissionType,
        trackingNumber
      });

      return response;
    } catch (error) {
      logger.error('Error submitting artist claim:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to submit artist claim', 500);
    }
  }

  /**
   * Get user's claim history
   */
  public static async getUserClaims(userId: string): Promise<ArtistClaimFull[]> {
    try {
      const claims = await prisma.artistClaim.findMany({
        where: { userId },
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
              profileImage: true,
              verified: true,
              followers: true,
              monthlyListeners: true,
              socialLinks: true
            }
          }
        },
        orderBy: { submittedAt: 'desc' }
      });

      const fullClaims: ArtistClaimFull[] = claims.map(claim => {
        const daysInReview = Math.floor(
          (new Date().getTime() - claim.submittedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        const canResubmit = claim.status === 'rejected' || claim.status === 'info_required';
        const trackingNumber = `AC-${claim.submittedAt.getTime()}-${claim.id.slice(-9).toUpperCase()}`;
        const estimatedReviewTime = claim.submissionType === 'distributor_verified' ? '1-2 business days' : '1-3 business days';

        return {
          id: claim.id,
          userId: claim.userId,
          user: claim.user,
          artistId: claim.artistId || undefined,
          artist: claim.artist ? {
            id: claim.artist.id,
            name: claim.artist.name,
            profileImage: claim.artist.profileImage || undefined,
            followers: claim.artist.followers,
            monthlyListeners: claim.artist.monthlyListeners,
            verified: claim.artist.verified,
            socialLinks: claim.artist.socialLinks as any,
            isClaimed: true,
            claimedAt: undefined // Will be filled if needed
          } : undefined,
          artistName: claim.artistName,
          role: claim.role as any,
          fullName: claim.fullName,
          email: claim.email,
          phone: claim.phone || undefined,
          companyName: claim.companyName || undefined,
          officialEmail: claim.officialEmail || undefined,
          websiteUrl: claim.websiteUrl || undefined,
          socialLinks: claim.socialLinks as any,
          distributorInfo: claim.distributorInfo as any,
          connectionDetails: claim.connectionDetails || undefined,
          evidenceUrls: claim.evidenceUrls,
          status: claim.status as ClaimStatus,
          submissionType: claim.submissionType as any,
          reviewNotes: claim.reviewNotes || undefined,
          rejectionReason: claim.rejectionReason || undefined,
          adminUserId: claim.adminUserId || undefined,
          submittedAt: claim.submittedAt.toISOString(),
          reviewedAt: claim.reviewedAt?.toISOString(),
          approvedAt: claim.approvedAt?.toISOString(),
          createdAt: claim.createdAt.toISOString(),
          updatedAt: claim.updatedAt.toISOString(),
          trackingNumber,
          estimatedReviewTime,
          canResubmit,
          daysInReview
        };
      });

      logger.info('User claims retrieved', { userId, count: fullClaims.length });
      return fullClaims;
    } catch (error) {
      logger.error('Error retrieving user claims:', error);
      throw createError('Failed to retrieve claims', 500);
    }
  }

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

  public static async getClaimStatus(userId: string): Promise<ClaimStatus> {
    try {
      const claims = await prisma.artistClaim.findMany({
        where: { userId },
        select: { status: true }
      });

      if (claims.length === 0) {
        return 'pending';
      }

      const statuses = claims.map((claim) => claim.status);

      if (statuses.includes('approved')) {
        return 'approved';
      }

      if (statuses.includes('rejected')) {
        return 'rejected';
      }

      if (statuses.includes('pending')) {
        return 'pending';
      }

      if (statuses.includes('info_required')) {
        return 'info_required';
      }

      return 'pending';
    } catch (error) {
      logger.error('Error retrieving claim status:', error);
      throw createError('Failed to retrieve claim status', 500);
    }
  }

  /**
   * Create artist profile (legacy claiming process - deprecated)
   * @deprecated Use submitArtistClaim instead
   */
  public static async claimArtistProfile(
    userId: string,
    claimData: LegacyArtistClaimRequest
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

      // Create legacy claim request (minimal data)
      const claim = await prisma.artistClaim.create({
        data: {
          userId,
          artistId: claimData.artistId,
          artistName: targetArtist.name,
          role: 'artist', // Default role
          fullName: 'Unknown', // Default value
          email: claimData.email,
          evidenceUrls: claimData.evidenceUrl ? [claimData.evidenceUrl] : [],
          status: 'pending',
          submissionType: 'manual',
          submittedAt: new Date()
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

      logger.info('Legacy artist claim request created', {
        userId,
        artistId: claimData.artistId,
        claimId: claim.id
      });

      return { claim, artist: targetArtist as ArtistProfile };
    } catch (error) {
      logger.error('Error creating legacy artist claim:', error);
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

      let artistId: string;
      let isNewArtist = false;

      // Handle both existing and new artist claims
      await prisma.$transaction(async (tx) => {
        // Update claim status first
        await tx.artistClaim.update({
          where: { id: claimId },
          data: {
            status: 'approved',
            reviewedAt: new Date(),
            approvedAt: new Date()
          }
        });

        if (claim.artistId) {
          // Case 1: Claiming existing artist profile
          artistId = claim.artistId;
          
          // Update existing artist with user association
          await tx.artist.update({
            where: { id: claim.artistId },
            data: {
              userId: claim.userId,
              claimedAt: new Date(),
              verified: true,
              verifiedAt: new Date()
            }
          });

          logger.info('Existing artist profile claimed', {
            claimId,
            artistId: claim.artistId,
            userId: claim.userId
          });
        } else {
          // Case 2: Creating new artist profile
          isNewArtist = true;
          
          // Create new artist profile
          const newArtist = await tx.artist.create({
            data: {
              userId: claim.userId,
              name: claim.artistName,
              email: claim.email,
              profileImage: null,
              biography: null,
              country: null,
              websiteurl: claim.websiteUrl,
              monthlyListeners: 0,
              followers: 0,
              verified: true,
              verifiedAt: new Date(),
              socialLinks: claim.socialLinks,
              popularity: 0,
              roles: [claim.role],
              labels: [],
              genres: [],
              claimedAt: new Date(),
              isActive: true
            }
          });

          artistId = newArtist.id;

          // Update claim with the new artist ID
          await tx.artistClaim.update({
            where: { id: claimId },
            data: {
              artistId: newArtist.id
            }
          });

          logger.info('New artist profile created from claim', {
            claimId,
            artistId: newArtist.id,
            artistName: claim.artistName,
            userId: claim.userId
          });
        }

        // Update user's verification status
        await tx.user.update({
          where: { id: claim.userId },
          data: {
            isVerified: true
          }
        });
      });

      // Get the artist profile (either updated existing or newly created)
      const approvedArtist = await this.getArtistProfile(artistId);

      logger.info('Artist claim approved successfully', {
        claimId,
        userId: claim.userId,
        artistId,
        isNewArtist,
        artistName: claim.artistName
      });

      return approvedArtist;
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

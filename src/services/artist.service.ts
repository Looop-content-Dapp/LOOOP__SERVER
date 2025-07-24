import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import {
  ArtistClaimRequest,
  ArtistClaimResponse,
  ArtistSearchResult,
  ClaimStatus,
  ArtistClaimFull,
  ArtistClaimSearchFilters,
  AdminClaimAction,
  CreatorFormData
} from '@/types/artist-claim.types';
import EmailService from './email.service';

interface Genre { id: string; artistId: string; genreId: string; }

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
  genres: Genre[];
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
  public static async searchArtistsForClaim(query?: string, limit = 20): Promise<ArtistSearchResult[]> {
    try {
      // If no query provided, return empty results or most popular artists
      if (!query || query.trim() === '') {
        const artists = await prisma.artist.findMany({
          where: {
            isActive: true,
            verified: true
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
          take: Math.min(limit, 10) // Return fewer results for empty query
        });

        return artists.map(artist => ({
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
      }

      // Clean the query
      const cleanQuery = query.trim();

      // Build search conditions that filter out undefined values
      const searchConditions: any[] = [
        { name: { contains: cleanQuery, mode: 'insensitive' } },
        {
          genres: {
            some: {
              genre: {
                name: { contains: cleanQuery, mode: 'insensitive' }
              }
            }
          }
        }
      ];

      // Only add labels search if query is meaningful for labels
      if (cleanQuery.length > 2) {
        searchConditions.push({ labels: { hasSome: [cleanQuery] } });
      }

      const artists = await prisma.artist.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: searchConditions
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
   * Transform CreatorFormData to ArtistClaimRequest
   */
  private static transformCreatorFormData(creatorData: any): ArtistClaimRequest {
    return {
      artistName: creatorData.artistName,
      role: creatorData.role,
      connectionDetails: `Role: ${creatorData.role}`,
      fullName: creatorData.connectionDetails.fullName,
      email: creatorData.connectionDetails.email,
      phone: creatorData.connectionDetails.phone,
      websiteUrl: creatorData.websiteUrl,
      socialLinks: creatorData.socialLinks,
      distributorInfo: creatorData.distributorInfo.provider !== 'none' ? {
        provider: creatorData.distributorInfo.provider,
        accountEmail: creatorData.distributorInfo.accountEmail,
        verificationToken: creatorData.distributorInfo.verificationToken,
        isVerified: creatorData.distributorInfo.isVerified || false,
        releaseIds: []
      } : undefined,
      evidenceUrls: [], // Will be populated later if needed
      additionalInfo: creatorData.additionalInfo,
      agreesToTerms: creatorData.agreements.termsAgreed,
      agreesToPrivacy: creatorData.agreements.privacyAgreed
    };
  }

  /**
   * Submit artist claim using CreatorFormData format
   */
  public static async submitCreatorClaim(
    userId: string,
    creatorData: CreatorFormData
  ): Promise<ArtistClaimResponse> {
    try {
      // Transform CreatorFormData to ArtistClaimRequest
      const claimData = this.transformCreatorFormData(creatorData);

      // Use existing submission logic
      return await this.submitArtistClaim(userId, claimData);
    } catch (error) {
      logger.error('Error submitting creator claim:', error);
      throw error;
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
      const initialStatus = 'under_review'; // Always start with under_review for immediate processing

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
        ? 'Your claim has been submitted with distributor verification and is now under review. Our team will review it shortly.'
        : 'Your artist claim has been submitted successfully and is now under review. Our team will review your request and get back to you soon.';

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

      // Send confirmation email to user
      try {
        await EmailService.sendClaimConfirmationEmail(claim);
        logger.info('Confirmation email sent successfully', { claimId: claim.id });
      } catch (emailError) {
        logger.error('Failed to send confirmation email:', emailError);
        // Don't fail the claim submission if email fails
      }

      // Notify admin team
      try {
        await EmailService.notifyAdminTeam(claim);
        logger.info('Admin notification sent successfully', { claimId: claim.id });
      } catch (emailError) {
        logger.error('Failed to send admin notification:', emailError);
        // Don't fail the claim submission if email fails
      }

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
          releases: {
             select: {
                 artwork: true,
                 metadata: true,
                 title: true,
                 id: true,
                 contentInfo: true,
                 releaseDate: true
             }
          },
          _count: {
            select: {
              tracks: true,
              communities: true,
              subscriptions: true
            }
          },
          genres: true
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
          },
          genres: true
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

      if (statuses.includes('under_review')) {
        return 'under_review';
      }

      if (statuses.includes('rejected')) {
        return 'rejected';
      }

      if (statuses.includes('info_required')) {
        return 'info_required';
      }

      if (statuses.includes('pending')) {
        return 'pending';
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
          status: { in: ['pending', 'under_review', 'info_required'] }
        }
      });

      if (existingClaim) {
        throw createError('Claim request already exists for this artist', 409);
      }

      // Check if artist exists
      const targetArtist = await prisma.artist.findUnique({
        where: { id: claimData.artistId },
        select: {
          id: true,
          name: true,
          email: true,
          genres: true,
          claimedAt: true
        }
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
          status: 'under_review',
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
              email: true,
              genres: true
            }
          },
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

      if (!['pending', 'under_review', 'info_required'].includes(claim.status)) {
        throw createError('Claim is not in a reviewable state', 400);
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
              genres: {
            create: []
          },
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

      // Send approval notification email
      try {
        const updatedClaim = await prisma.artistClaim.findUnique({
          where: { id: claimId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        });

        if (updatedClaim) {
          const claimData: ArtistClaimFull = {
            id: updatedClaim.id,
            userId: updatedClaim.userId,
            user: updatedClaim.user,
            artistId: updatedClaim.artistId || undefined,
            artistName: updatedClaim.artistName,
            role: updatedClaim.role as any,
            fullName: updatedClaim.fullName,
            email: updatedClaim.email,
            phone: updatedClaim.phone || undefined,
            companyName: updatedClaim.companyName || undefined,
            officialEmail: updatedClaim.officialEmail || undefined,
            websiteUrl: updatedClaim.websiteUrl || undefined,
            socialLinks: updatedClaim.socialLinks as any,
            distributorInfo: updatedClaim.distributorInfo as any,
            connectionDetails: updatedClaim.connectionDetails || undefined,
            evidenceUrls: updatedClaim.evidenceUrls,
            status: updatedClaim.status as ClaimStatus,
            submissionType: updatedClaim.submissionType as any,
            reviewNotes: updatedClaim.reviewNotes || undefined,
            rejectionReason: updatedClaim.rejectionReason || undefined,
            adminUserId: updatedClaim.adminUserId || undefined,
            submittedAt: updatedClaim.submittedAt.toISOString(),
            reviewedAt: updatedClaim.reviewedAt?.toISOString(),
            approvedAt: updatedClaim.approvedAt?.toISOString(),
            createdAt: updatedClaim.createdAt.toISOString(),
            updatedAt: updatedClaim.updatedAt.toISOString(),
            trackingNumber: `AC-${updatedClaim.submittedAt.getTime()}-${updatedClaim.id.slice(-9).toUpperCase()}`,
            estimatedReviewTime: 'Completed',
            canResubmit: false,
            daysInReview: Math.floor((new Date().getTime() - updatedClaim.submittedAt.getTime()) / (1000 * 60 * 60 * 24))
          };

          await EmailService.sendClaimStatusUpdate(claimData, 'approved');
          logger.info('Approval notification email sent', { claimId });
        }
      } catch (emailError) {
        logger.error('Failed to send approval notification email:', emailError);
        // Don't fail the approval if email fails
      }

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

      if (!['pending', 'under_review', 'info_required'].includes(claim.status)) {
        throw createError('Claim is not in a reviewable state', 400);
      }

      await prisma.artistClaim.update({
        where: { id: claimId },
        data: {
          status: 'rejected',
          rejectionReason: reason,
          reviewedAt: new Date()
        }
      });

      // Send rejection notification email
      try {
        const updatedClaim = await prisma.artistClaim.findUnique({
          where: { id: claimId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        });

        if (updatedClaim) {
          const claimData: ArtistClaimFull = {
            id: updatedClaim.id,
            userId: updatedClaim.userId,
            user: updatedClaim.user,
            artistId: updatedClaim.artistId || undefined,
            artistName: updatedClaim.artistName,
            role: updatedClaim.role as any,
            fullName: updatedClaim.fullName,
            email: updatedClaim.email,
            phone: updatedClaim.phone || undefined,
            companyName: updatedClaim.companyName || undefined,
            officialEmail: updatedClaim.officialEmail || undefined,
            websiteUrl: updatedClaim.websiteUrl || undefined,
            socialLinks: updatedClaim.socialLinks as any,
            distributorInfo: updatedClaim.distributorInfo as any,
            connectionDetails: updatedClaim.connectionDetails || undefined,
            evidenceUrls: updatedClaim.evidenceUrls,
            status: updatedClaim.status as ClaimStatus,
            submissionType: updatedClaim.submissionType as any,
            reviewNotes: updatedClaim.reviewNotes || undefined,
            rejectionReason: updatedClaim.rejectionReason || undefined,
            adminUserId: updatedClaim.adminUserId || undefined,
            submittedAt: updatedClaim.submittedAt.toISOString(),
            reviewedAt: updatedClaim.reviewedAt?.toISOString(),
            approvedAt: updatedClaim.approvedAt?.toISOString(),
            createdAt: updatedClaim.createdAt.toISOString(),
            updatedAt: updatedClaim.updatedAt.toISOString(),
            trackingNumber: `AC-${updatedClaim.submittedAt.getTime()}-${updatedClaim.id.slice(-9).toUpperCase()}`,
            estimatedReviewTime: 'N/A',
            canResubmit: true,
            daysInReview: Math.floor((new Date().getTime() - updatedClaim.submittedAt.getTime()) / (1000 * 60 * 60 * 24))
          };

          await EmailService.sendClaimStatusUpdate(claimData, 'rejected', reason);
          logger.info('Rejection notification email sent', { claimId });
        }
      } catch (emailError) {
        logger.error('Failed to send rejection notification email:', emailError);
        // Don't fail the rejection if email fails
      }

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
   * Update claim status with email notifications (comprehensive admin function)
   */
  public static async updateClaimStatus(
    claimId: string,
    newStatus: ClaimStatus,
    adminUserId?: string,
    reviewNotes?: string,
    rejectionReason?: string
  ): Promise<ArtistClaimFull> {
    try {
      const claim = await prisma.artistClaim.findUnique({
        where: { id: claimId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      });

      if (!claim) {
        throw createError('Claim not found', 404);
      }

      // Update claim with new status
      const updateData: any = {
        status: newStatus,
        reviewedAt: new Date(),
        reviewNotes,
        adminUserId
      };

      if (newStatus === 'rejected' && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      if (newStatus === 'approved') {
        updateData.approvedAt = new Date();
      }

      const updatedClaim = await prisma.artistClaim.update({
        where: { id: claimId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      });

      // Prepare claim data for email notification
      const claimData: ArtistClaimFull = {
        id: updatedClaim.id,
        userId: updatedClaim.userId,
        user: updatedClaim.user,
        artistId: updatedClaim.artistId || undefined,
        artistName: updatedClaim.artistName,
        role: updatedClaim.role as any,
        fullName: updatedClaim.fullName,
        email: updatedClaim.email,
        phone: updatedClaim.phone || undefined,
        companyName: updatedClaim.companyName || undefined,
        officialEmail: updatedClaim.officialEmail || undefined,
        websiteUrl: updatedClaim.websiteUrl || undefined,
        socialLinks: updatedClaim.socialLinks as any,
        distributorInfo: updatedClaim.distributorInfo as any,
        connectionDetails: updatedClaim.connectionDetails || undefined,
        evidenceUrls: updatedClaim.evidenceUrls,
        status: updatedClaim.status as ClaimStatus,
        submissionType: updatedClaim.submissionType as any,
        reviewNotes: updatedClaim.reviewNotes || undefined,
        rejectionReason: updatedClaim.rejectionReason || undefined,
        adminUserId: updatedClaim.adminUserId || undefined,
        submittedAt: updatedClaim.submittedAt.toISOString(),
        reviewedAt: updatedClaim.reviewedAt?.toISOString(),
        approvedAt: updatedClaim.approvedAt?.toISOString(),
        createdAt: updatedClaim.createdAt.toISOString(),
        updatedAt: updatedClaim.updatedAt.toISOString(),
        trackingNumber: `AC-${updatedClaim.submittedAt.getTime()}-${updatedClaim.id.slice(-9).toUpperCase()}`,
        estimatedReviewTime: newStatus === 'approved' || newStatus === 'rejected' ? 'Completed' : '1-3 business days',
        canResubmit: newStatus === 'rejected' || newStatus === 'info_required',
        daysInReview: Math.floor((new Date().getTime() - updatedClaim.submittedAt.getTime()) / (1000 * 60 * 60 * 24))
      };

      // Send status update email notification
      try {
        await EmailService.sendClaimStatusUpdate(claimData, newStatus, reviewNotes || rejectionReason);
        logger.info('Status update notification email sent', {
          claimId,
          newStatus,
          email: updatedClaim.email
        });
      } catch (emailError) {
        logger.error('Failed to send status update notification email:', emailError);
        // Don't fail the status update if email fails
      }

      logger.info('Claim status updated successfully', {
        claimId,
        oldStatus: claim.status,
        newStatus,
        adminUserId,
        artistName: updatedClaim.artistName
      });

      return claimData;
    } catch (error) {
      logger.error('Error updating claim status:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to update claim status', 500);
    }
  }

  /**
   * Get pending claims for admin dashboard
   */
  public static async getPendingClaims(): Promise<ArtistClaimFull[]> {
    try {
      const claims = await prisma.artistClaim.findMany({
        where: {
          status: { in: ['pending', 'under_review', 'info_required'] }
        },
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
        orderBy: [
          { submissionType: 'desc' }, // distributor_verified first
          { submittedAt: 'asc' } // oldest first
        ]
      });

      const formattedClaims: ArtistClaimFull[] = claims.map(claim => {
        const daysInReview = Math.floor(
          (new Date().getTime() - claim.submittedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

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
            claimedAt: undefined
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
          trackingNumber: `AC-${claim.submittedAt.getTime()}-${claim.id.slice(-9).toUpperCase()}`,
          estimatedReviewTime: claim.submissionType === 'distributor_verified' ? '1-2 business days' : '1-3 business days',
          canResubmit: false,
          daysInReview
        };
      });

      logger.info('Pending claims retrieved for admin', { count: formattedClaims.length });
      return formattedClaims;
    } catch (error) {
      logger.error('Error retrieving pending claims:', error);
      throw createError('Failed to retrieve pending claims', 500);
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
          },
          genres: true
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
                { genres: {
                  some: {
                    genre: {
                      name: { contains: query, mode: 'insensitive' }
                    }
                  }
                }},
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
          genres: {
            select: {
              genre: {
                select: {
                  name: true
                }
              }
            }
          },
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

  /**
   * Get discover artists - personalized for authenticated users, random for others
   * Returns comprehensive artist data for all artists in database
   */
  public static async getDiscoverArtists(userId?: string) {
    try {
      if (userId) {
        // Get user's followed artists to personalize recommendations
        const followedArtists = await prisma.follow.findMany({
          where: {
            followerId: userId
          }
        });

        if (followedArtists.length > 0) {
          // Get the artist IDs that the user follows
          const followedArtistIds = followedArtists.map(follow => follow.followingId);

          // Get the actual artist data with genres
          const artistsData = await prisma.artist.findMany({
            where: {
              id: {
                in: followedArtistIds
              }
            },
            include: {
              genres: {
                include: {
                  genre: true
                }
              }
            }
          });

          // Get genres from followed artists
          const followedGenres = artistsData
            .flatMap(artist => artist.genres || [])
            .map(artistGenre => artistGenre.genre.id);

          if (followedGenres.length > 0) {
            // Find artists with similar genres - get comprehensive data
            const recommendedArtists = await prisma.artist.findMany({
              where: {
                isActive: true,
                userId: {
                  not: userId // Exclude user's own artist profile if they have one
                },
                genres: {
                  some: {
                    genreId: {
                      in: followedGenres
                    }
                  }
                }
              },
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
                  where: { isPublic: true },
                  select: {
                    id: true,
                    title: true,
                    playCount: true,
                    likeCount: true,
                    artworkUrl: true,
                    createdAt: true,
                    duration: true,
                    genre: true
                  },
                  orderBy: { playCount: 'desc' },
                  take: 5
                },
                genres: {
                  include: {
                    genre: true
                  }
                },
                _count: {
                  select: {
                    tracks: true,
                    communities: true,
                    subscriptions: true
                  }
                }
              },
              orderBy: {
                popularity: 'desc'
              },
              // Get all matching artists for comprehensive discovery
            });

            if (recommendedArtists.length > 0) {
              // Shuffle all results for variety
               const shuffled = recommendedArtists
                 .sort(() => Math.random() - 0.5);
              logger.info('Personalized artists retrieved', { userId, count: shuffled.length });
              return shuffled;
            }
          }
        }
      }

      // Fallback to random artists for unauthenticated users or users with no follows
      return this.getRandomArtists();
    } catch (error) {
      logger.error('Error getting discover artists:', error);
      throw createError('Failed to get discover artists', 500);
    }
  }

  /**
   * Get random artists with comprehensive data
   * Returns all artists in database
   */
  public static async getRandomArtists() {
    try {
      const artists = await prisma.artist.findMany({
        where: {
          isActive: true
        },
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
            where: { isPublic: true },
            select: {
              id: true,
              title: true,
              playCount: true,
              likeCount: true,
              artworkUrl: true,
              createdAt: true,
              duration: true,
              genre: true
            },
            orderBy: { playCount: 'desc' },
            take: 5
          },
          genres: {
            include: {
              genre: true
            }
          },
          _count: {
            select: {
              tracks: true,
              communities: true,
              subscriptions: true
            }
          }
        },
        // Get all active artists
      });

      // Shuffle all artists
       const shuffled = artists.sort(() => Math.random() - 0.5);
      logger.info('Random artists retrieved', { count: shuffled.length });
      return shuffled;
    } catch (error) {
      logger.error('Error getting random artists:', error);
      throw createError('Failed to get random artists', 500);
    }
  }
}

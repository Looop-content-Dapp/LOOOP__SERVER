import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { validateEmail, validateUrl } from '@/utils/validation';
import { AuthenticatedRequest } from '@/middleware/auth';
import {
  ArtistService,
} from '@/services/artist.service';
import {
  ArtistClaimFull,
  ArtistClaimRequest,
  ArtistClaimResponse,
  ArtistSearchResult,
  ClaimStatusUpdate,
  CreatorFormData
} from '@/types/artist-claim.types';

/**
 * Submit Creator Claim (New Format)
 */
export const submitCreatorClaim = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const creatorData: CreatorFormData = req.body;

    // Validate required fields
    if (!creatorData.artistName) {
      throw createError('Artist name is required', 400);
    }

    if (!creatorData.connectionDetails.fullName || !creatorData.connectionDetails.email) {
      throw createError('Full name and email are required', 400);
    }

    if (!validateEmail(creatorData.connectionDetails.email)) {
      throw createError('Invalid email format', 400);
    }

    if (!creatorData.agreements.termsAgreed || !creatorData.agreements.privacyAgreed) {
      throw createError('You must agree to the terms and privacy policy', 400);
    }

    // Submit creator claim
    const response: ArtistClaimResponse = await ArtistService.submitCreatorClaim(userId, creatorData);

    res.status(201).json({
      success: true,
      message: response.message,
      data: response
    });

  } catch (error) {
    logger.error('Error submitting creator claim:', error);

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
 * Search  Select Your Artist Profile
 */
export const searchArtistsForClaim = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const query = req.query.q as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;

    // Validate limit
    if (limit < 1 || limit > 50) {
      res.status(400).json({
        success: false,
        error: { message: 'Limit must be between 1 and 50' }
      });
      return;
    }

    const results: ArtistSearchResult[] = await ArtistService.searchArtistsForClaim(query, limit);

    res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Error searching for artists:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

export const getClaimStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const status = await ArtistService.getClaimStatus(userId);

    res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Error retrieving claim status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
}

/**
 * Get User's Claim Requests
 */
export const getUserClaims = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const claims: ArtistClaimFull[] = await ArtistService.getUserClaims(userId);

    res.status(200).json({
      success: true,
      data: claims
    });

  } catch (error) {
    logger.error('Error retrieving user claims:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

/**
 * Admin: Approve or Reject a Claim
 */
export const updateClaimStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const claimId = req.params.claimId;
    const updateData: ClaimStatusUpdate = req.body;

    // Validate action
    if (!updateData.status) {
      throw createError('Claim status is required', 400);
    }

    // Perform status update
    if (updateData.status === 'approved') {
      await ArtistService.approveArtistClaim(claimId);
      res.status(200).json({
        success: true,
        message: 'Claim approved successfully'
      });
    } else if (updateData.status === 'rejected') {
      await ArtistService.rejectArtistClaim(claimId, updateData.rejectionReason);
      res.status(200).json({
        success: true,
        message: 'Claim rejected successfully',
      });
    } else {
      throw createError('Invalid status update', 400);
    }

    logger.info(`Claim ${updateData.status} by admin`, { claimId });

  } catch (error) {
    logger.error('Error updating claim status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
};

// Legacy controllers for backward compatibility

/**
 * Submit artist claim request (Legacy)
 * @deprecated Use submitArtistClaim instead
 */
export const claimArtistProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const { email, artistId, evidenceUrl } = req.body;

    // Validation
    if (!email || !validateEmail(email)) {
      throw createError('Valid email is required', 400);
    }

    if (!artistId) {
      throw createError('Artist ID is required', 400);
    }

    if (evidenceUrl && !validateUrl(evidenceUrl)) {
      throw createError('Invalid evidence URL format', 400);
    }

    const result = await ArtistService.claimArtistProfile(userId, {
      email,
      artistId,
      evidenceUrl
    });

    logger.info('Legacy artist claim request submitted', {
      userId,
      artistId,
      claimId: result.claim.id
    });

    res.status(201).json({
      success: true,
      message: 'Artist claim request submitted successfully. Our team will review your request within 3 business days.',
      data: {
        claim: result.claim,
        artist: result.artist
      }
    });

  } catch (error) {
    logger.error('Error submitting legacy artist claim:', error);

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
 * Get pending claims (admin only)
 */
export const getPendingClaims = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    // TODO: Add admin role check
    // For now, assuming this is an admin endpoint that requires admin middleware

    const claims = await ArtistService.getPendingClaims();

    res.status(200).json({
      success: true,
      data: { claims }
    });

  } catch (error) {
    logger.error('Error retrieving pending claims:', error);

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
 * Approve artist claim (admin only)
 */
export const approveArtistClaim = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    // TODO: Add admin role check
    // For now, assuming this is an admin endpoint that requires admin middleware

    const { claimId } = req.params;

    if (!claimId) {
      throw createError('Claim ID is required', 400);
    }

    const artist = await ArtistService.approveArtistClaim(claimId);

    logger.info('Artist claim approved by admin', {
      adminId: userId,
      claimId,
      artistId: artist.id
    });

    res.status(200).json({
      success: true,
      message: 'Artist claim approved successfully',
      data: { artist }
    });

  } catch (error) {
    logger.error('Error approving artist claim:', error);

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
 * Reject artist claim (admin only)
 */
export const rejectArtistClaim = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    // TODO: Add admin role check
    // For now, assuming this is an admin endpoint that requires admin middleware

    const { claimId } = req.params;
    const { reason } = req.body;

    if (!claimId) {
      throw createError('Claim ID is required', 400);
    }

    await ArtistService.rejectArtistClaim(claimId, reason);

    logger.info('Artist claim rejected by admin', {
      adminId: userId,
      claimId,
      reason: reason || 'No reason provided'
    });

    res.status(200).json({
      success: true,
      message: 'Artist claim rejected successfully'
    });

  } catch (error) {
    logger.error('Error rejecting artist claim:', error);

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

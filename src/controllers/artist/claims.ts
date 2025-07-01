import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { validateEmail, validateUrl } from '@/utils/validation';
import { AuthenticatedRequest } from '@/middleware/auth';
import { ArtistService } from '@/services/artist.service';
import { prisma } from '@/config/database';

/**
 * Submit artist claim request
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

    logger.info('Artist claim request submitted', { 
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
    logger.error('Error submitting artist claim:', error);

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
 * Get user's claim requests
 */
export const getUserClaims = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const claims = await prisma.artistClaim.findMany({
      where: { userId },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            verified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: { claims }
    });

  } catch (error) {
    logger.error('Error retrieving user claims:', error);

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

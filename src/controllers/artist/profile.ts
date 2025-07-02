import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { validateUrl, sanitizeInput } from '@/utils/validation';
import { AuthenticatedRequest } from '@/middleware/auth';
import { ArtistService } from '@/services/artist.service';

/**
 * Get artist profile by ID
 */
export const getArtistProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { artistId } = req.params;

    if (!artistId) {
      throw createError('Artist ID is required', 400);
    }

    const artist = await ArtistService.getArtistProfile(artistId);

    res.status(200).json({
      success: true,
      data: { artist }
    });

  } catch (error) {
    logger.error('Error retrieving artist profile:', error);

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
 * Get current user's artist profile
 */
export const getMyArtistProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    const artist = await ArtistService.getArtistByUserId(userId);

    if (!artist) {
      res.status(404).json({
        success: false,
        error: { message: 'Artist profile not found' }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { artist }
    });

  } catch (error) {
    logger.error('Error retrieving user artist profile:', error);

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
 * Update artist profile
 */
export const updateArtistProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createError('User not authenticated', 401);
    }

    // Get user's artist profile
    const artist = await ArtistService.getArtistByUserId(userId);

    if (!artist) {
      throw createError('Artist profile not found', 404);
    }

    const {
      name,
      biography,
      websiteurl,
      address1,
      address2,
      country,
      postalcode,
      city,
      socialLinks,
      genres,
      labels
    } = req.body;

    // Validation
    const updateData: any = {};

    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        throw createError('Artist name must be at least 2 characters long', 400);
      }
      updateData.name = sanitizeInput(name.trim());
    }

    if (biography !== undefined) {
      if (biography && biography.length > 1000) {
        throw createError('Biography must be 1000 characters or less', 400);
      }
      updateData.biography = biography ? sanitizeInput(biography.trim()) : null;
    }

    if (websiteurl !== undefined) {
      if (websiteurl && !validateUrl(websiteurl)) {
        throw createError('Invalid website URL format', 400);
      }
      updateData.websiteurl = websiteurl || null;
    }

    if (address1 !== undefined) {
      updateData.address1 = address1 ? sanitizeInput(address1.trim()) : null;
    }

    if (address2 !== undefined) {
      updateData.address2 = address2 ? sanitizeInput(address2.trim()) : null;
    }

    if (country !== undefined) {
      updateData.country = country ? sanitizeInput(country.trim()) : null;
    }

    if (postalcode !== undefined) {
      updateData.postalcode = postalcode ? sanitizeInput(postalcode.trim()) : null;
    }

    if (city !== undefined) {
      updateData.city = city ? sanitizeInput(city.trim()) : null;
    }

    if (socialLinks !== undefined) {
      if (socialLinks && typeof socialLinks === 'object') {
        // Validate social links URLs
        for (const [platform, url] of Object.entries(socialLinks)) {
          if (url && typeof url === 'string' && !validateUrl(url as string)) {
            throw createError(`Invalid URL for ${platform}`, 400);
          }
        }
        updateData.socialLinks = socialLinks;
      } else {
        updateData.socialLinks = null;
      }
    }

    if (genres !== undefined) {
      if (Array.isArray(genres)) {
        updateData.genres = genres.map(genre => sanitizeInput(genre));
      }
    }

    if (labels !== undefined) {
      if (Array.isArray(labels)) {
        updateData.labels = labels.map(label => sanitizeInput(label));
      }
    }

    const updatedArtist = await ArtistService.updateArtistProfile(artist.id, updateData);

    logger.info('Artist profile updated', {
      userId,
      artistId: artist.id,
      updatedFields: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: 'Artist profile updated successfully',
      data: { artist: updatedArtist }
    });

  } catch (error) {
    logger.error('Error updating artist profile:', error);

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
 * Search artists
 */
export const searchArtists = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: query, limit = 20, offset = 0 } = req.query;

    if (!query || typeof query !== 'string') {
      throw createError('Search query is required', 400);
    }

    if (query.trim().length < 2) {
      throw createError('Search query must be at least 2 characters long', 400);
    }

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = Math.max(parseInt(offset as string) || 0, 0);

    const artists = await ArtistService.searchArtists(query.trim(), limitNum, offsetNum);

    res.status(200).json({
      success: true,
      data: {
        artists,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: artists.length
        }
      }
    });

  } catch (error) {
    logger.error('Error searching artists:', error);

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

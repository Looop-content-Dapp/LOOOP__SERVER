import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import { PlaylistService } from '@/services/playlist.service';
import {
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  AddTrackToPlaylistRequest,
  RemoveTrackFromPlaylistRequest,
  ReorderPlaylistTracksRequest,
  SharePlaylistRequest,
  PlaylistQueryParams
} from '@/types/playlist.types';

export class PlaylistController {
  /**
   * Create a new playlist
   */
  static async createPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const data: CreatePlaylistRequest = req.body;

      // Validate required fields
      if (!data.title || data.title.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { message: 'Playlist title is required' }
        });
        return;
      }

      if (data.title.length > 100) {
        res.status(400).json({
          success: false,
          error: { message: 'Playlist title must be 100 characters or less' }
        });
        return;
      }

      const playlist = await PlaylistService.createPlaylist(userId, data);

      res.status(201).json({
        success: true,
        data: { playlist },
        message: 'Playlist created successfully'
      });
    } catch (error) {
      logger.error('Error creating playlist:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to create playlist' }
      });
    }
  }

  /**
   * Get user's playlists
   */
  static async getUserPlaylists(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const params: PlaylistQueryParams = req.query;

      const result = await PlaylistService.getUserPlaylists(userId, params);

      res.status(200).json({
        success: true,
        data: {
          playlists: result.playlists,
          pagination: {
            page: Number(params.page) || 1,
            limit: Number(params.limit) || 20,
            total: result.total,
            pages: Math.ceil(result.total / (Number(params.limit) || 20))
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching user playlists:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch playlists' }
      });
    }
  }

  /**
   * Get public playlists
   */
  static async getPublicPlaylists(req: Request, res: Response): Promise<void> {
    try {
      const params: PlaylistQueryParams = {
        ...req.query,
        filter: 'public'
      };

      const result = await PlaylistService.getUserPlaylists('', params);

      res.status(200).json({
        success: true,
        data: {
          playlists: result.playlists,
          pagination: {
            page: Number(params.page) || 1,
            limit: Number(params.limit) || 20,
            total: result.total,
            pages: Math.ceil(result.total / (Number(params.limit) || 20))
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching public playlists:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch playlists' }
      });
    }
  }

  /**
   * Get featured playlists (admin created)
   */
  static async getFeaturedPlaylists(req: Request, res: Response): Promise<void> {
    try {
      const params: PlaylistQueryParams = {
        ...req.query,
        filter: 'featured'
      };

      const result = await PlaylistService.getUserPlaylists('', params);

      res.status(200).json({
        success: true,
        data: {
          playlists: result.playlists,
          pagination: {
            page: Number(params.page) || 1,
            limit: Number(params.limit) || 20,
            total: result.total,
            pages: Math.ceil(result.total / (Number(params.limit) || 20))
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching featured playlists:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch featured playlists' }
      });
    }
  }

  /**
   * Get playlist by ID
   */
  static async getPlaylistById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { playlistId } = req.params;
      const userId = req.user?.id;

      if (!playlistId) {
        res.status(400).json({
          success: false,
          error: { message: 'Playlist ID is required' }
        });
        return;
      }

      const playlist = await PlaylistService.getPlaylistById(playlistId, userId);

      if (!playlist) {
        res.status(404).json({
          success: false,
          error: { message: 'Playlist not found' }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { playlist }
      });
    } catch (error) {
      logger.error('Error fetching playlist:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch playlist' }
      });
    }
  }

  /**
   * Update playlist
   */
  static async updatePlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { playlistId } = req.params;
      const userId = req.user!.id;
      const data: UpdatePlaylistRequest = req.body;

      if (!playlistId) {
        res.status(400).json({
          success: false,
          error: { message: 'Playlist ID is required' }
        });
        return;
      }

      // Validate title if provided
      if (data.title !== undefined && (data.title.trim().length === 0 || data.title.length > 100)) {
        res.status(400).json({
          success: false,
          error: { message: 'Playlist title must be between 1 and 100 characters' }
        });
        return;
      }

      const playlist = await PlaylistService.updatePlaylist(playlistId, userId, data);

      res.status(200).json({
        success: true,
        data: { playlist },
        message: 'Playlist updated successfully'
      });
    } catch (error) {
      logger.error('Error updating playlist:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: { message: 'Playlist not found or access denied' }
        });
      } else {
        res.status(500).json({
          success: false,
          error: { message: 'Failed to update playlist' }
        });
      }
    }
  }

  /**
   * Delete playlist
   */
  static async deletePlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { playlistId } = req.params;
      const userId = req.user!.id;

      if (!playlistId) {
        res.status(400).json({
          success: false,
          error: { message: 'Playlist ID is required' }
        });
        return;
      }

      await PlaylistService.deletePlaylist(playlistId, userId);

      res.status(200).json({
        success: true,
        message: 'Playlist deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting playlist:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: { message: 'Playlist not found or access denied' }
        });
      } else {
        res.status(500).json({
          success: false,
          error: { message: 'Failed to delete playlist' }
        });
      }
    }
  }

  /**
   * Add track to playlist
   */
  static async addTrackToPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { playlistId } = req.params;
      const userId = req.user!.id;
      const data: AddTrackToPlaylistRequest = req.body;

      if (!playlistId) {
        res.status(400).json({
          success: false,
          error: { message: 'Playlist ID is required' }
        });
        return;
      }

      if (!data.trackId) {
        res.status(400).json({
          success: false,
          error: { message: 'Track ID is required' }
        });
        return;
      }

      await PlaylistService.addTrackToPlaylist(playlistId, userId, data);

      res.status(200).json({
        success: true,
        message: 'Track added to playlist successfully'
      });
    } catch (error) {
      logger.error('Error adding track to playlist:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('access denied')) {
          res.status(404).json({
            success: false,
            error: { message: error.message }
          });
        } else if (error.message.includes('already in playlist')) {
          res.status(409).json({
            success: false,
            error: { message: error.message }
          });
        } else {
          res.status(500).json({
            success: false,
            error: { message: 'Failed to add track to playlist' }
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: { message: 'Failed to add track to playlist' }
        });
      }
    }
  }

  /**
   * Remove track from playlist
   */
  static async removeTrackFromPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { playlistId } = req.params;
      const userId = req.user!.id;
      const data: RemoveTrackFromPlaylistRequest = req.body;

      if (!playlistId) {
        res.status(400).json({
          success: false,
          error: { message: 'Playlist ID is required' }
        });
        return;
      }

      if (!data.trackId) {
        res.status(400).json({
          success: false,
          error: { message: 'Track ID is required' }
        });
        return;
      }

      await PlaylistService.removeTrackFromPlaylist(playlistId, userId, data);

      res.status(200).json({
        success: true,
        message: 'Track removed from playlist successfully'
      });
    } catch (error) {
      logger.error('Error removing track from playlist:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: { message: 'Playlist not found or access denied' }
        });
      } else {
        res.status(500).json({
          success: false,
          error: { message: 'Failed to remove track from playlist' }
        });
      }
    }
  }

  /**
   * Reorder tracks in playlist
   */
  static async reorderPlaylistTracks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { playlistId } = req.params;
      const userId = req.user!.id;
      const data: ReorderPlaylistTracksRequest = req.body;

      if (!playlistId) {
        res.status(400).json({
          success: false,
          error: { message: 'Playlist ID is required' }
        });
        return;
      }

      if (!data.trackIds || !Array.isArray(data.trackIds) || data.trackIds.length === 0) {
        res.status(400).json({
          success: false,
          error: { message: 'Track IDs array is required' }
        });
        return;
      }

      await PlaylistService.reorderPlaylistTracks(playlistId, userId, data);

      res.status(200).json({
        success: true,
        message: 'Playlist tracks reordered successfully'
      });
    } catch (error) {
      logger.error('Error reordering playlist tracks:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: { message: 'Playlist not found or access denied' }
        });
      } else {
        res.status(500).json({
          success: false,
          error: { message: 'Failed to reorder playlist tracks' }
        });
      }
    }
  }

  /**
   * Share playlist
   */
  static async sharePlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { playlistId } = req.params;
      const userId = req.user!.id;
      const data: SharePlaylistRequest = req.body;

      if (!playlistId) {
        res.status(400).json({
          success: false,
          error: { message: 'Playlist ID is required' }
        });
        return;
      }

      if (!data.shareType || !['link', 'social', 'embed'].includes(data.shareType)) {
        res.status(400).json({
          success: false,
          error: { message: 'Valid share type is required (link, social, embed)' }
        });
        return;
      }

      const shareResponse = await PlaylistService.sharePlaylist(playlistId, userId, data);

      res.status(200).json({
        success: true,
        data: shareResponse
      });
    } catch (error) {
      logger.error('Error sharing playlist:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: { message: 'Playlist not found' }
          });
        } else if (error.message.includes('Cannot share private')) {
          res.status(403).json({
            success: false,
            error: { message: 'Cannot share private playlist' }
          });
        } else {
          res.status(500).json({
            success: false,
            error: { message: 'Failed to share playlist' }
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: { message: 'Failed to share playlist' }
        });
      }
    }
  }
}

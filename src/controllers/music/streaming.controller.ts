import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import { StreamingService } from '@/services/streaming.service';
import {
  PlayTrackRequest,
  UpdatePlayCountRequest,
  PlayHistoryQueryParams,
  ListeningPreferences
} from '@/types/streaming.types';

export class StreamingController {
  /**
   * Get stream URL and token for a track
   */
  static async getTrackStream(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { trackId } = req.params;
      const userId = req.user?.id;
      
      if (!trackId) {
        res.status(400).json({
          success: false,
          error: { message: 'Track ID is required' }
        });
        return;
      }

      const request: PlayTrackRequest = {
        trackId,
        startTime: req.query.startTime ? Number(req.query.startTime) : undefined,
        quality: req.query.quality as any,
        deviceId: req.query.deviceId as string
      };

      const streamData = await StreamingService.getTrackStream(trackId, userId, request);

      res.status(200).json({
        success: true,
        data: streamData
      });
    } catch (error) {
      logger.error('Error getting track stream:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: { message: 'Track not found' }
          });
        } else if (error.message.includes('not available')) {
          res.status(403).json({
            success: false,
            error: { message: 'Track is not available for streaming' }
          });
        } else {
          res.status(500).json({
            success: false,
            error: { message: 'Failed to get track stream' }
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: { message: 'Failed to get track stream' }
        });
      }
    }
  }

  /**
   * Update play count for a track
   */
  static async updatePlayCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const data: UpdatePlayCountRequest = req.body;

      if (!data.trackId) {
        res.status(400).json({
          success: false,
          error: { message: 'Track ID is required' }
        });
        return;
      }

      if (data.duration === undefined || data.duration < 0) {
        res.status(400).json({
          success: false,
          error: { message: 'Valid duration is required' }
        });
        return;
      }

      if (data.completed === undefined) {
        res.status(400).json({
          success: false,
          error: { message: 'Completed status is required' }
        });
        return;
      }

      await StreamingService.updatePlayCount(userId, data);

      res.status(200).json({
        success: true,
        message: 'Play count updated successfully'
      });
    } catch (error) {
      logger.error('Error updating play count:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: { message: 'Track not found' }
        });
      } else {
        res.status(500).json({
          success: false,
          error: { message: 'Failed to update play count' }
        });
      }
    }
  }

  /**
   * Get user's play history
   */
  static async getPlayHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const params: PlayHistoryQueryParams = req.query;

      const result = await StreamingService.getPlayHistory(userId, params);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error fetching play history:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch play history' }
      });
    }
  }

  /**
   * Get user's last played tracks
   */
  static async getLastPlayed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      if (limit > 100) {
        res.status(400).json({
          success: false,
          error: { message: 'Limit cannot exceed 100' }
        });
        return;
      }

      const tracks = await StreamingService.getLastPlayed(userId, limit);

      res.status(200).json({
        success: true,
        data: { tracks }
      });
    } catch (error) {
      logger.error('Error fetching last played tracks:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch last played tracks' }
      });
    }
  }

  /**
   * Get streaming analytics for user
   */
  static async getStreamingAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const analytics = await StreamingService.getStreamingAnalytics(userId);

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error fetching streaming analytics:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch streaming analytics' }
      });
    }
  }

  /**
   * Get user's listening preferences
   */
  static async getUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const preferences = await StreamingService.getUserPreferences(userId);

      if (!preferences) {
        // Return default preferences
        const defaultPreferences: ListeningPreferences = {
          preferredQuality: 'medium',
          autoPlay: true,
          crossfade: false,
          gaplessPlayback: false,
          volumeNormalization: true
        };

        res.status(200).json({
          success: true,
          data: defaultPreferences
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: preferences
      });
    } catch (error) {
      logger.error('Error fetching user preferences:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch user preferences' }
      });
    }
  }

  /**
   * Update user's listening preferences
   */
  static async updateUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const preferences: Partial<ListeningPreferences> = req.body;

      // Validate quality setting if provided
      if (preferences.preferredQuality && 
          !['low', 'medium', 'high', 'lossless'].includes(preferences.preferredQuality)) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid quality setting' }
        });
        return;
      }

      await StreamingService.updateUserPreferences(userId, preferences);

      res.status(200).json({
        success: true,
        message: 'User preferences updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to update user preferences' }
      });
    }
  }

  /**
   * Stream audio file endpoint
   */
  static async streamAudio(req: Request, res: Response): Promise<void> {
    try {
      const { trackId } = req.params;
      const { token, quality = 'medium' } = req.query;

      if (!token) {
        res.status(401).json({
          success: false,
          error: { message: 'Stream token is required' }
        });
        return;
      }

      // In a real implementation, you would:
      // 1. Verify the stream token
      // 2. Check if the token has expired
      // 3. Get the actual file path from your storage (local/S3/CDN)
      // 4. Stream the file with proper headers for audio streaming
      // 5. Handle range requests for seeking

      // For now, we'll return a placeholder response
      res.status(501).json({
        success: false,
        error: { message: 'Audio streaming endpoint not yet implemented' }
      });
    } catch (error) {
      logger.error('Error streaming audio:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to stream audio' }
      });
    }
  }

  /**
   * Get currently playing track for user
   */
  static async getCurrentlyPlaying(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // In a real implementation, you would track active play sessions
      // For now, we'll get the last played track
      const tracks = await StreamingService.getLastPlayed(userId, 1);

      if (tracks.length === 0) {
        res.status(200).json({
          success: true,
          data: { currentlyPlaying: null }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { currentlyPlaying: tracks[0] }
      });
    } catch (error) {
      logger.error('Error fetching currently playing:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch currently playing track' }
      });
    }
  }
}

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import {
  PlayTrackRequest,
  TrackStreamResponse,
  PlayHistoryEntry,
  LastPlayedResponse,
  PlaySession,
  UpdatePlayCountRequest,
  StreamingAnalytics,
  PlayHistoryQueryParams,
  QualitySettings,
  ListeningPreferences
} from '@/types/streaming.types';
import { sign } from 'jsonwebtoken';

export class StreamingService {
  private static readonly QUALITY_SETTINGS: QualitySettings = {
    low: { bitrate: 128, format: 'mp3' },
    medium: { bitrate: 256, format: 'mp3' },
    high: { bitrate: 320, format: 'mp3' },
    lossless: { bitrate: 1411, format: 'flac' }
  };

  /**
   * Generate stream URL and token for track
   */
  static async getTrackStream(
    trackId: string,
    userId?: string,
    request: PlayTrackRequest = { trackId }
  ): Promise<TrackStreamResponse> {
    try {
      // Verify track exists and is public
      const track = await prisma.track.findUnique({
        where: { id: trackId },
        include: {
          artist: {
            select: {
              name: true
            }
          }
        }
      });

      if (!track) {
        throw new Error('Track not found');
      }

      if (!track.isPublic) {
        throw new Error('Track is not available for streaming');
      }

      const quality = request.quality || 'medium';
      const qualityConfig = this.QUALITY_SETTINGS[quality];

      // Generate secure streaming token
      const streamToken = sign(
        {
          trackId,
          userId,
          quality,
          startTime: request.startTime || 0,
          deviceId: request.deviceId,
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      // Construct stream URL
      const baseStreamUrl = process.env.STREAM_BASE_URL || 'http://localhost:5000/api/v1/stream';
      const streamUrl = `${baseStreamUrl}/${trackId}?token=${streamToken}&quality=${quality}`;

      // Record play session if user is authenticated
      if (userId) {
        await this.recordPlaySession({
          trackId,
          startedAt: new Date().toISOString(),
          deviceId: request.deviceId,
          position: request.startTime || 0,
          quality,
          isActive: true
        }, userId);
      }

      return {
        streamUrl,
        streamToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        quality,
        bitrate: qualityConfig.bitrate,
        format: qualityConfig.format,
        trackInfo: {
          id: track.id,
          title: track.title,
          artist: track.artist.name,
          duration: track.duration,
          artworkUrl: track.artworkUrl
        }
      };
    } catch (error) {
      logger.error('Error generating track stream:', error);
      throw new Error('Failed to generate track stream');
    }
  }

  /**
   * Update play count and add to history
   */
  static async updatePlayCount(
    userId: string,
    request: UpdatePlayCountRequest
  ): Promise<void> {
    try {
      const { trackId, duration, completed } = request;

      // Only count as a play if listened for at least 30 seconds or 50% of track
      const track = await prisma.track.findUnique({
        where: { id: trackId },
        select: { duration: true, playCount: true }
      });

      if (!track) {
        throw new Error('Track not found');
      }

      const minPlayDuration = Math.min(30, track.duration * 0.5);
      const shouldCount = duration >= minPlayDuration || completed;

      await prisma.$transaction(async (tx) => {
        // Add to play history
        await tx.playHistory.create({
          data: {
            userId,
            trackId,
            duration,
            playedAt: new Date()
          }
        });

        // Update play count if criteria met
        if (shouldCount) {
          await tx.track.update({
            where: { id: trackId },
            data: {
              playCount: {
                increment: 1
              }
            }
          });
        }
      });
    } catch (error) {
      logger.error('Error updating play count:', error);
      throw new Error('Failed to update play count');
    }
  }

  /**
   * Get user's play history
   */
  static async getPlayHistory(
    userId: string,
    params: PlayHistoryQueryParams
  ): Promise<LastPlayedResponse> {
    try {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate,
        artistId,
        genreFilter
      } = params;

      const skip = (page - 1) * limit;

      // Build where clause
      let whereClause: any = {
        userId
      };

      if (startDate || endDate) {
        whereClause.playedAt = {};
        if (startDate) whereClause.playedAt.gte = new Date(startDate);
        if (endDate) whereClause.playedAt.lte = new Date(endDate);
      }

      if (artistId) {
        whereClause.track = {
          artistId
        };
      }

      if (genreFilter && genreFilter.length > 0) {
        whereClause.track = {
          ...whereClause.track,
          genre: {
            hasSome: genreFilter
          }
        };
      }

      const [history, total] = await Promise.all([
        prisma.playHistory.findMany({
          where: whereClause,
          include: {
            track: {
              include: {
                artist: {
                  select: {
                    id: true,
                    name: true,
                    profileImage: true,
                    verified: true
                  }
                },
                album: {
                  select: {
                    id: true,
                    title: true,
                    artworkUrl: true
                  }
                }
              }
            }
          },
          orderBy: {
            playedAt: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.playHistory.count({ where: whereClause })
      ]);

      const tracks = history.map(entry => this.formatPlayHistoryEntry(entry));

      return {
        tracks,
        pagination: {
          page,
          limit,
          total,
          hasNext: skip + limit < total
        }
      };
    } catch (error) {
      logger.error('Error fetching play history:', error);
      throw new Error('Failed to fetch play history');
    }
  }

  /**
   * Get user's last played tracks (recent)
   */
  static async getLastPlayed(
    userId: string,
    limit: number = 20
  ): Promise<PlayHistoryEntry[]> {
    try {
      const history = await prisma.playHistory.findMany({
        where: { userId },
        include: {
          track: {
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true,
                  verified: true
                }
              },
              album: {
                select: {
                  id: true,
                  title: true,
                  artworkUrl: true
                }
              }
            }
          }
        },
        orderBy: {
          playedAt: 'desc'
        },
        take: limit,
        distinct: ['trackId'] // Get unique tracks only
      });

      return history.map(entry => this.formatPlayHistoryEntry(entry));
    } catch (error) {
      logger.error('Error fetching last played tracks:', error);
      throw new Error('Failed to fetch last played tracks');
    }
  }

  /**
   * Get streaming analytics for user
   */
  static async getStreamingAnalytics(userId: string): Promise<StreamingAnalytics> {
    try {
      // Get total plays
      const totalPlays = await prisma.playHistory.count({
        where: { userId }
      });

      // Get unique listeners count (if admin/artist viewing their tracks)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { artist: true }
      });

      let uniqueListeners = 0;
      let topTracks: any[] = [];
      
      if (user?.artist) {
        // Get analytics for artist's tracks
        const artistTracks = await prisma.track.findMany({
          where: { artistId: user.artist.id },
          select: { id: true }
        });

        const trackIds = artistTracks.map(t => t.id);

        uniqueListeners = await prisma.playHistory.groupBy({
          by: ['userId'],
          where: {
            trackId: { in: trackIds }
          }
        }).then(groups => groups.length);

        // Get top tracks for this artist
        topTracks = await prisma.track.findMany({
          where: { artistId: user.artist.id },
          include: {
            artist: {
              select: { name: true }
            }
          },
          orderBy: { playCount: 'desc' },
          take: 10
        });
      }

      // Get average listen duration
      const playHistoryStats = await prisma.playHistory.aggregate({
        where: { userId },
        _avg: {
          duration: true
        }
      });

      // Get recent activity
      const recentActivity = await this.getLastPlayed(userId, 10);

      // Calculate completion rate (simplified)
      const completedPlays = await prisma.playHistory.count({
        where: {
          userId,
          duration: { gte: 30 } // Consider 30+ seconds as completed
        }
      });

      const completionRate = totalPlays > 0 ? (completedPlays / totalPlays) * 100 : 0;

      return {
        totalPlays,
        uniqueListeners,
        averageListenDuration: playHistoryStats._avg.duration || 0,
        completionRate,
        topTracks: topTracks.map(track => ({
          track: {
            id: track.id,
            title: track.title,
            artist: track.artist.name,
            playCount: track.playCount
          }
        })),
        recentActivity
      };
    } catch (error) {
      logger.error('Error fetching streaming analytics:', error);
      throw new Error('Failed to fetch streaming analytics');
    }
  }

  /**
   * Record play session
   */
  private static async recordPlaySession(
    session: PlaySession,
    userId: string
  ): Promise<void> {
    try {
      // For now, we'll just log the session
      // In a real implementation, you might store active sessions in Redis
      logger.info('Play session recorded:', {
        userId,
        trackId: session.trackId,
        quality: session.quality,
        deviceId: session.deviceId
      });
    } catch (error) {
      logger.error('Error recording play session:', error);
    }
  }

  /**
   * Format play history entry
   */
  private static formatPlayHistoryEntry(entry: any): PlayHistoryEntry {
    return {
      id: entry.id,
      trackId: entry.trackId,
      playedAt: entry.playedAt.toISOString(),
      duration: entry.duration,
      track: {
        id: entry.track.id,
        title: entry.track.title,
        artworkUrl: entry.track.artworkUrl,
        duration: entry.track.duration,
        artist: {
          id: entry.track.artist.id,
          name: entry.track.artist.name,
          profileImage: entry.track.artist.profileImage,
          verified: entry.track.artist.verified
        },
        album: entry.track.album ? {
          id: entry.track.album.id,
          title: entry.track.album.title,
          artworkUrl: entry.track.album.artworkUrl
        } : undefined,
        genre: entry.track.genre
      }
    };
  }

  /**
   * Get user listening preferences
   */
  static async getUserPreferences(userId: string): Promise<ListeningPreferences | null> {
    try {
      const preferences = await prisma.userPreference.findUnique({
        where: { userId },
        select: { settings: true }
      });

      if (!preferences?.settings) {
        return null;
      }

      const settings = preferences.settings as any;
      return {
        preferredQuality: settings.preferredQuality || 'medium',
        autoPlay: settings.autoPlay ?? true,
        crossfade: settings.crossfade ?? false,
        gaplessPlayback: settings.gaplessPlayback ?? false,
        volumeNormalization: settings.volumeNormalization ?? true
      };
    } catch (error) {
      logger.error('Error fetching user preferences:', error);
      return null;
    }
  }

  /**
   * Update user listening preferences
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<ListeningPreferences>
  ): Promise<void> {
    try {
      await prisma.userPreference.upsert({
        where: { userId },
        create: {
          userId,
          settings: preferences
        },
        update: {
          settings: preferences
        }
      });
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw new Error('Failed to update preferences');
    }
  }
}

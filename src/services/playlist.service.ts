import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import {
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  AddTrackToPlaylistRequest,
  RemoveTrackFromPlaylistRequest,
  ReorderPlaylistTracksRequest,
  SharePlaylistRequest,
  PlaylistWithTracks,
  PlaylistSummary,
  PlaylistDetails,
  PlaylistShareResponse,
  PlaylistQueryParams
} from '@/types/playlist.types';

export class PlaylistService {
  /**
   * Create a new playlist
   */
  static async createPlaylist(
    userId: string,
    data: CreatePlaylistRequest
  ): Promise<PlaylistSummary> {
    try {
      const playlist = await prisma.playlist.create({
        data: {
          title: data.title,
          description: data.description,
          isPublic: data.isPublic ?? true,
          artworkUrl: data.artworkUrl,
          userId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              isAdmin: true
            }
          },
          _count: {
            select: {
              tracks: true
            }
          }
        }
      });

      return this.formatPlaylistSummary(playlist, userId);
    } catch (error) {
      logger.error('Error creating playlist:', error);
      throw new Error('Failed to create playlist');
    }
  }

  /**
   * Get user's playlists
   */
  static async getUserPlaylists(
    userId: string,
    params: PlaylistQueryParams
  ): Promise<{ playlists: PlaylistSummary[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        filter = 'owned',
        sortBy = 'created',
        sortOrder = 'desc',
        search
      } = params;

      const skip = (page - 1) * limit;

      // Build where clause based on filter
      let whereClause: any = {};

      switch (filter) {
        case 'owned':
          whereClause.userId = userId;
          break;
        case 'public':
          whereClause.isPublic = true;
          break;
        case 'featured':
          whereClause = {
            isPublic: true,
            user: {
              isAdmin: true
            }
          };
          break;
      }

      // Add search filter
      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Build order by clause
      let orderByClause: any = {};
      switch (sortBy) {
        case 'title':
          orderByClause.title = sortOrder;
          break;
        case 'updated':
          orderByClause.updatedAt = sortOrder;
          break;
        case 'trackCount':
          orderByClause = {
            tracks: {
              _count: sortOrder
            }
          };
          break;
        default:
          orderByClause.createdAt = sortOrder;
      }

      const [playlists, total] = await Promise.all([
        prisma.playlist.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                isAdmin: true
              }
            },
            _count: {
              select: {
                tracks: true
              }
            }
          },
          orderBy: orderByClause,
          skip,
          take: limit
        }),
        prisma.playlist.count({ where: whereClause })
      ]);

      const formattedPlaylists = playlists.map(playlist =>
        this.formatPlaylistSummary(playlist, userId)
      );

      return { playlists: formattedPlaylists, total };
    } catch (error) {
      logger.error('Error fetching user playlists:', error);
      throw new Error('Failed to fetch playlists');
    }
  }

  /**
   * Get playlist by ID with full details
   */
  static async getPlaylistById(
    playlistId: string,
    userId?: string
  ): Promise<PlaylistDetails | null> {
    try {
      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              isAdmin: true
            }
          },
          tracks: {
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
                  _count: {
                    select: {
                      likes: true
                    }
                  }
                }
              }
            },
            orderBy: {
              position: 'asc'
            }
          },
          _count: {
            select: {
              tracks: true
            }
          }
        }
      });

      if (!playlist) {
        return null;
      }

      // Check if user can view this playlist
      if (!playlist.isPublic && playlist.userId !== userId) {
        return null;
      }

      return this.formatPlaylistDetails(playlist, userId);
    } catch (error) {
      logger.error('Error fetching playlist:', error);
      throw new Error('Failed to fetch playlist');
    }
  }

  /**
   * Update playlist
   */
  static async updatePlaylist(
    playlistId: string,
    userId: string,
    data: UpdatePlaylistRequest
  ): Promise<PlaylistSummary> {
    try {
      // Check if user owns the playlist
      const existingPlaylist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        select: { userId: true }
      });

      if (!existingPlaylist || existingPlaylist.userId !== userId) {
        throw new Error('Playlist not found or access denied');
      }

      const playlist = await prisma.playlist.update({
        where: { id: playlistId },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
          ...(data.artworkUrl !== undefined && { artworkUrl: data.artworkUrl })
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              isAdmin: true
            }
          },
          _count: {
            select: {
              tracks: true
            }
          }
        }
      });

      return this.formatPlaylistSummary(playlist, userId);
    } catch (error) {
      logger.error('Error updating playlist:', error);
      throw new Error('Failed to update playlist');
    }
  }

  /**
   * Delete playlist
   */
  static async deletePlaylist(playlistId: string, userId: string): Promise<void> {
    try {
      // Check if user owns the playlist
      const existingPlaylist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        select: { userId: true }
      });

      if (!existingPlaylist || existingPlaylist.userId !== userId) {
        throw new Error('Playlist not found or access denied');
      }

      await prisma.playlist.delete({
        where: { id: playlistId }
      });
    } catch (error) {
      logger.error('Error deleting playlist:', error);
      throw new Error('Failed to delete playlist');
    }
  }

  /**
   * Add track to playlist
   */
  static async addTrackToPlaylist(
    playlistId: string,
    userId: string,
    data: AddTrackToPlaylistRequest
  ): Promise<void> {
    try {
      // Check if user owns the playlist
      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        select: { userId: true }
      });

      if (!playlist || playlist.userId !== userId) {
        throw new Error('Playlist not found or access denied');
      }

      // Check if track exists and is public
      const track = await prisma.track.findUnique({
        where: { id: data.trackId },
        select: { isPublic: true }
      });

      if (!track || !track.isPublic) {
        throw new Error('Track not found or not available');
      }

      // Check if track is already in playlist
      const existingTrack = await prisma.playlistTrack.findUnique({
        where: {
          playlistId_trackId: {
            playlistId,
            trackId: data.trackId
          }
        }
      });

      if (existingTrack) {
        throw new Error('Track already in playlist');
      }

      // Get next position if not specified
      let position = data.position;
      if (position === undefined) {
        const lastTrack = await prisma.playlistTrack.findFirst({
          where: { playlistId },
          orderBy: { position: 'desc' },
          select: { position: true }
        });
        position = (lastTrack?.position || 0) + 1;
      }

      await prisma.playlistTrack.create({
        data: {
          playlistId,
          trackId: data.trackId,
          position
        }
      });
    } catch (error) {
      logger.error('Error adding track to playlist:', error);
      throw new Error('Failed to add track to playlist');
    }
  }

  /**
   * Remove track from playlist
   */
  static async removeTrackFromPlaylist(
    playlistId: string,
    userId: string,
    data: RemoveTrackFromPlaylistRequest
  ): Promise<void> {
    try {
      // Check if user owns the playlist
      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        select: { userId: true }
      });

      if (!playlist || playlist.userId !== userId) {
        throw new Error('Playlist not found or access denied');
      }

      await prisma.playlistTrack.deleteMany({
        where: {
          playlistId,
          trackId: data.trackId
        }
      });
    } catch (error) {
      logger.error('Error removing track from playlist:', error);
      throw new Error('Failed to remove track from playlist');
    }
  }

  /**
   * Reorder tracks in playlist
   */
  static async reorderPlaylistTracks(
    playlistId: string,
    userId: string,
    data: ReorderPlaylistTracksRequest
  ): Promise<void> {
    try {
      // Check if user owns the playlist
      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        select: { userId: true }
      });

      if (!playlist || playlist.userId !== userId) {
        throw new Error('Playlist not found or access denied');
      }

      // Update positions in a transaction
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < data.trackIds.length; i++) {
          await tx.playlistTrack.updateMany({
            where: {
              playlistId,
              trackId: data.trackIds[i]
            },
            data: {
              position: i + 1
            }
          });
        }
      });
    } catch (error) {
      logger.error('Error reordering playlist tracks:', error);
      throw new Error('Failed to reorder playlist tracks');
    }
  }

  /**
   * Share playlist
   */
  static async sharePlaylist(
    playlistId: string,
    userId: string,
    data: SharePlaylistRequest
  ): Promise<PlaylistShareResponse> {
    try {
      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        select: {
          id: true,
          title: true,
          isPublic: true,
          userId: true,
          user: {
            select: {
              name: true
            }
          }
        }
      });

      if (!playlist) {
        throw new Error('Playlist not found');
      }

      // Check if user can share this playlist
      if (!playlist.isPublic && playlist.userId !== userId) {
        throw new Error('Cannot share private playlist');
      }

      const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const shareUrl = `${baseUrl}/playlist/${playlistId}`;

      const response: PlaylistShareResponse = {
        shareUrl
      };

      if (data.shareType === 'embed') {
        response.embedCode = `<iframe src="${baseUrl}/embed/playlist/${playlistId}" width="300" height="400" frameborder="0"></iframe>`;
      }

      if (data.shareType === 'social') {
        response.socialText = `Check out "${playlist.title}" by ${playlist.user.name} on LOOOP 🎵 ${shareUrl}`;
      }

      return response;
    } catch (error) {
      logger.error('Error sharing playlist:', error);
      throw new Error('Failed to share playlist');
    }
  }

  /**
   * Format playlist summary
   */
  private static formatPlaylistSummary(playlist: any, userId?: string): PlaylistSummary {
    return {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      artworkUrl: playlist.artworkUrl,
      trackCount: playlist._count.tracks,
      isPublic: playlist.isPublic,
      isOwned: playlist.userId === userId,
      isFeatured: playlist.user.isAdmin && playlist.isPublic,
      isAdminPlaylist: playlist.user.isAdmin,
      createdAt: playlist.createdAt.toISOString(),
      updatedAt: playlist.updatedAt.toISOString(),
      createdBy: {
        id: playlist.user.id,
        name: playlist.user.name,
        username: playlist.user.username,
        isAdmin: playlist.user.isAdmin
      }
    };
  }

  /**
   * Format playlist details
   */
  private static formatPlaylistDetails(playlist: any, userId?: string): PlaylistDetails {
    const summary = this.formatPlaylistSummary(playlist, userId);
    
    const tracks = playlist.tracks.map((pt: any) => ({
      id: pt.id,
      position: pt.position,
      addedAt: pt.addedAt.toISOString(),
      track: {
        id: pt.track.id,
        title: pt.track.title,
        artworkUrl: pt.track.artworkUrl,
        duration: pt.track.duration,
        playCount: pt.track.playCount,
        likeCount: pt.track._count.likes,
        artist: {
          id: pt.track.artist.id,
          name: pt.track.artist.name,
          verified: pt.track.artist.verified,
          profileImage: pt.track.artist.profileImage
        },
        genre: pt.track.genre,
        releaseDate: pt.track.createdAt.toISOString()
      }
    }));

    const totalDuration = tracks.reduce((total, track) => total + track.track.duration, 0);

    return {
      ...summary,
      tracks,
      totalDuration
    };
  }
}

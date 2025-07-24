import { Prisma } from '@prisma/client';

/**
 * Playlist creation request
 */
export interface CreatePlaylistRequest {
  title: string;
  description?: string;
  isPublic?: boolean;
  artworkUrl?: string;
}

/**
 * Playlist update request
 */
export interface UpdatePlaylistRequest {
  title?: string;
  description?: string;
  isPublic?: boolean;
  artworkUrl?: string;
}

/**
 * Add track to playlist request
 */
export interface AddTrackToPlaylistRequest {
  trackId: string;
  position?: number;
}

/**
 * Remove track from playlist request
 */
export interface RemoveTrackFromPlaylistRequest {
  trackId: string;
}

/**
 * Reorder tracks in playlist request
 */
export interface ReorderPlaylistTracksRequest {
  trackIds: string[];
}

/**
 * Playlist sharing request
 */
export interface SharePlaylistRequest {
  shareType: 'link' | 'social' | 'embed';
  platform?: 'twitter' | 'facebook' | 'instagram' | 'whatsapp';
}

/**
 * Playlist with full track details
 */
export type PlaylistWithTracks = Prisma.PlaylistGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        username: true;
        image: true;
        isAdmin: true;
      };
    };
    tracks: {
      include: {
        track: {
          include: {
            artist: {
              select: {
                id: true;
                name: true;
                profileImage: true;
                verified: true;
              };
            };
            _count: {
              select: {
                likes: true;
              };
            };
          };
        };
      };
      orderBy: {
        position: 'asc';
      };
    };
    _count: {
      select: {
        tracks: true;
      };
    };
  };
}>;

/**
 * Playlist summary for listing
 */
export interface PlaylistSummary {
  id: string;
  title: string;
  description?: string;
  artworkUrl?: string;
  trackCount: number;
  isPublic: boolean;
  isOwned: boolean;
  isFeatured?: boolean;
  isAdminPlaylist: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    username?: string;
    isAdmin: boolean;
  };
}

/**
 * Full playlist details
 */
export interface PlaylistDetails extends PlaylistSummary {
  tracks: {
    id: string;
    position: number;
    addedAt: string;
    track: {
      id: string;
      title: string;
      artworkUrl?: string;
      duration: number;
      playCount: number;
      likeCount: number;
      artist: {
        id: string;
        name: string;
        verified: boolean;
        profileImage?: string;
      };
      genre: string[];
      releaseDate: string;
    };
  }[];
  totalDuration: number;
}

/**
 * Playlist share response
 */
export interface PlaylistShareResponse {
  shareUrl: string;
  embedCode?: string;
  socialText?: string;
}

/**
 * Playlist query parameters
 */
export interface PlaylistQueryParams {
  page?: number;
  limit?: number;
  filter?: 'owned' | 'liked' | 'public' | 'featured';
  sortBy?: 'created' | 'updated' | 'title' | 'trackCount';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

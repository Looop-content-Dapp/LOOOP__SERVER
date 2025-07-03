/**
 * Play track request
 */
export interface PlayTrackRequest {
  trackId: string;
  startTime?: number; // Start position in seconds
  quality?: 'low' | 'medium' | 'high' | 'lossless';
  deviceId?: string;
}

/**
 * Track streaming response
 */
export interface TrackStreamResponse {
  streamUrl: string;
  streamToken: string;
  expiresAt: string;
  quality: string;
  bitrate: number;
  format: string;
  trackInfo: {
    id: string;
    title: string;
    artist: string;
    duration: number;
    artworkUrl?: string;
  };
}

/**
 * Play history entry
 */
export interface PlayHistoryEntry {
  id: string;
  trackId: string;
  playedAt: string;
  duration?: number; // How long was played
  track: {
    id: string;
    title: string;
    artworkUrl?: string;
    duration: number;
    artist: {
      id: string;
      name: string;
      profileImage?: string;
      verified: boolean;
    };
    album?: {
      id: string;
      title: string;
      artworkUrl?: string;
    };
    genre: string[];
  };
}

/**
 * User's last played tracks
 */
export interface LastPlayedResponse {
  tracks: PlayHistoryEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

/**
 * Play session tracking
 */
export interface PlaySession {
  trackId: string;
  startedAt: string;
  deviceId?: string;
  position: number; // Current position in seconds
  quality: string;
  isActive: boolean;
}

/**
 * Track play count update
 */
export interface UpdatePlayCountRequest {
  trackId: string;
  duration: number; // How long the track was played
  completed: boolean; // Whether the track was played to completion
}

/**
 * Streaming analytics
 */
export interface StreamingAnalytics {
  totalPlays: number;
  uniqueListeners: number;
  averageListenDuration: number;
  completionRate: number;
  topTracks: {
    track: {
      id: string;
      title: string;
      artist: string;
      playCount: number;
    };
  }[];
  recentActivity: PlayHistoryEntry[];
}

/**
 * Play history query parameters
 */
export interface PlayHistoryQueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  artistId?: string;
  genreFilter?: string[];
}

/**
 * Track quality settings
 */
export interface QualitySettings {
  low: {
    bitrate: 128;
    format: 'mp3';
  };
  medium: {
    bitrate: 256;
    format: 'mp3';
  };
  high: {
    bitrate: 320;
    format: 'mp3';
  };
  lossless: {
    bitrate: 1411;
    format: 'flac';
  };
}

/**
 * User listening preferences
 */
export interface ListeningPreferences {
  preferredQuality: 'low' | 'medium' | 'high' | 'lossless';
  autoPlay: boolean;
  crossfade: boolean;
  gaplessPlayback: boolean;
  volumeNormalization: boolean;
}

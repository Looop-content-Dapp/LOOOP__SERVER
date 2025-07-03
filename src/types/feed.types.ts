// Music Feed Types
export interface MusicFeedItem {
  id: string;
  type: 'new_release' | 'artist_update' | 'admin_playlist' | 'hot_track' | 'community_post' | 'liked_track';
  title: string;
  description?: string;
  timestamp: string;
  data: {
    track?: FeedTrack;
    album?: FeedAlbum;
    artist?: FeedArtist;
    playlist?: FeedPlaylist;
    post?: FeedPost;
  };
  metadata?: {
    reason?: string; // Why this item appears in feed
    location?: string;
    ranking?: number;
  };
}

export interface FeedTrack {
  id: string;
  title: string;
  artworkUrl?: string;
  duration: number;
  playCount: number;
  likeCount: number;
  isLiked?: boolean;
  artist: {
    id: string;
    name: string;
    verified: boolean;
    profileImage?: string;
  };
  album?: {
    id: string;
    title: string;
    artworkUrl?: string;
  };
  genre: string[];
  releaseDate: string;
}

export interface FeedAlbum {
  id: string;
  title: string;
  artworkUrl?: string;
  releaseDate: string;
  trackCount: number;
  artist: {
    id: string;
    name: string;
    verified: boolean;
    profileImage?: string;
  };
  tracks?: FeedTrack[];
}

export interface FeedArtist {
  id: string;
  name: string;
  profileImage?: string;
  verified: boolean;
  followers: number;
  monthlyListeners: number;
  isFollowing?: boolean;
  latestRelease?: FeedTrack;
}

export interface FeedPlaylist {
  id: string;
  title: string;
  description?: string;
  artworkUrl?: string;
  trackCount: number;
  isPublic: boolean;
  isFeatured?: boolean;
  isAdminPlaylist?: boolean;
  createdBy: {
    id: string;
    name: string;
    isAdmin?: boolean;
  };
  tracks?: FeedTrack[];
}

export interface FeedPost {
  id: string;
  content: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    profileImage?: string;
    isVerified: boolean;
  };
  community?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export interface MusicFeedParams {
  page?: number;
  limit?: number;
  location?: string;
  genres?: string[];
  feedType?: 'all' | 'following' | 'new_releases' | 'hot' | 'admin_curated';
}

// Discovery Section Types
export interface DiscoverySection {
  topSongsByLocation: {
    location: string;
    tracks: FeedTrack[];
  };
  top10Albums: FeedAlbum[];
  topSongsWorldwide: FeedTrack[];
  hotPlaylist?: FeedPlaylist;
  trending: {
    artists: FeedArtist[];
    tracks: FeedTrack[];
    albums: FeedAlbum[];
  };
}

// Search Types
export interface SearchParams {
  query: string;
  type?: 'all' | 'tracks' | 'artists' | 'albums' | 'playlists' | 'users' | 'communities';
  location?: string;
  genre?: string;
  limit?: number;
  page?: number;
  sort?: 'relevance' | 'newest' | 'oldest' | 'popular' | 'unpopular';
}

export interface SearchResults {
  tracks: FeedTrack[];
  artists: FeedArtist[];
  albums: FeedAlbum[];
  playlists: FeedPlaylist[];
  users: SearchUser[];
  communities: SearchCommunity[];
  total: {
    tracks: number;
    artists: number;
    albums: number;
    playlists: number;
    users: number;
    communities: number;
  };
}

export interface SearchUser {
  id: string;
  name: string;
  username?: string;
  profileImage?: string;
  isVerified: boolean;
  followers: number;
  isFollowing?: boolean;
  bio?: string;
}

export interface SearchCommunity {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  memberCount: number;
  isJoined?: boolean;
  artist: {
    id: string;
    name: string;
    verified: boolean;
  };
  isActive: boolean;
}

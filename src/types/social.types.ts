// Social Features Types

export interface FollowRequest {
  followingId: string; // ID of user/artist being followed
}

export interface FollowResponse {
  success: boolean;
  message: string;
  data: {
    isFollowing: boolean;
    followerCount: number;
  };
}

export interface LikeRequest {
  trackId: string;
}

export interface LikeResponse {
  success: boolean;
  message: string;
  data: {
    isLiked: boolean;
    likeCount: number;
  };
}

export interface CommentRequest {
  content: string;
  postId?: string;
  trackId?: string;
  parentId?: string; // For reply comments
}

export interface CommentResponse {
  success: boolean;
  message: string;
  data: Comment;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    username?: string;
    profileImage?: string;
    isVerified: boolean;
  };
  parentId?: string;
  replies?: Comment[];
  likeCount: number;
  isLiked?: boolean;
  post?: {
    id: string;
    title?: string;
  };
  track?: {
    id: string;
    title: string;
    artist: {
      name: string;
    };
  };
}

export interface UserFeedItem {
  id: string;
  type: 'community_post' | 'new_track' | 'new_album' | 'artist_update' | 'community_joined' | 
        'admin_playlist' | 'trending_track' | 'recommended_artist' | 'recommended_track' | 'popular_track';
  timestamp: string;
  author: {
    id: string;
    name: string;
    username?: string;
    profileImage?: string;
    isVerified: boolean;
    isFollowing: boolean;
  };
  content: {
    text?: string;
    imageUrl?: string;
    track?: {
      id: string;
      title: string;
      artworkUrl?: string;
      duration: number;
    };
    album?: {
      id: string;
      title: string;
      artworkUrl?: string;
      trackCount: number;
    };
    community?: {
      id: string;
      name: string;
      imageUrl?: string;
    };
    playlist?: {
      id: string;
      title: string;
      artworkUrl?: string;
      trackCount: number;
    };
    artist?: {
      id: string;
      name: string;
      profileImage?: string;
      verified: boolean;
      followers: number;
    };
  };
  engagement: {
    likeCount: number;
    commentCount: number;
    isLiked: boolean;
  };
  community?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export interface UserFeedParams {
  page?: number;
  limit?: number;
  type?: 'all' | 'community_posts' | 'music_updates' | 'artist_updates';
}

export interface FollowingList {
  users: FollowedUser[];
  artists: FollowedArtist[];
  total: {
    users: number;
    artists: number;
  };
}

export interface FollowedUser {
  id: string;
  name: string;
  username?: string;
  profileImage?: string;
  isVerified: boolean;
  followers: number;
  bio?: string;
  followedAt: string;
  isFollowingBack: boolean;
  mutualFollowers: number;
}

export interface FollowedArtist {
  id: string;
  name: string;
  profileImage?: string;
  verified: boolean;
  followers: number;
  monthlyListeners: number;
  followedAt: string;
  latestRelease?: {
    id: string;
    title: string;
    releaseDate: string;
  };
  genres: string[];
}

export interface FollowersList {
  users: FollowerUser[];
  total: number;
}

export interface FollowerUser {
  id: string;
  name: string;
  username?: string;
  profileImage?: string;
  isVerified: boolean;
  followers: number;
  bio?: string;
  followedAt: string;
  isFollowing: boolean;
  mutualFollowers: number;
}

export interface LikedTracks {
  tracks: LikedTrack[];
  total: number;
}

export interface LikedTrack {
  id: string;
  title: string;
  artworkUrl?: string;
  duration: number;
  playCount: number;
  likeCount: number;
  likedAt: string;
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
}

export interface SocialStats {
  followers: number;
  following: number;
  likedTracks: number;
  commentsGiven: number;
  commentsReceived: number;
  totalPlayCount: number;
}

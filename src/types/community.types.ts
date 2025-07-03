// Community System Types

export interface CommunityCreateRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  monthlyPrice?: number; // For NFT access
  isActive?: boolean;
}

export interface CommunityResponse {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  memberCount: number;
  isActive: boolean;
  monthlyPrice?: number;
  createdAt: string;
  updatedAt: string;
  artist: {
    id: string;
    name: string;
    verified: boolean;
    profileImage?: string;
  };
  isJoined?: boolean;
  isMember?: boolean;
  canPost?: boolean; // True if user is the artist owner
}

export interface CommunityPostRequest {
  content: string;
  imageUrl?: string;
}

export interface CommunityPost {
  id: string;
  content: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    username?: string;
    profileImage?: string;
    isVerified: boolean;
  };
  community: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  isLiked?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface CommunityMember {
  id: string;
  user: {
    id: string;
    name: string;
    username?: string;
    profileImage?: string;
    isVerified: boolean;
  };
  joinedAt: string;
  isActive: boolean;
  role?: 'member' | 'moderator' | 'owner';
}

export interface CommunitySearchParams {
  query?: string;
  genre?: string;
  isActive?: boolean;
  hasNFTAccess?: boolean;
  limit?: number;
  page?: number;
  sortBy?: 'members' | 'created' | 'activity';
  sortOrder?: 'asc' | 'desc';
}

export interface CommunityDiscovery {
  featured: CommunityResponse[];
  popular: CommunityResponse[];
  new: CommunityResponse[];
  byGenre: {
    [genre: string]: CommunityResponse[];
  };
  recommended?: CommunityResponse[];
}

export interface CommunityStats {
  totalMembers: number;
  activeMembersToday: number;
  totalPosts: number;
  postsThisWeek: number;
  totalLikes: number;
  totalComments: number;
  growthRate: number; // Percentage
  engagementRate: number; // Percentage
}

export interface JoinCommunityRequest {
  communityId: string;
  nftTokenId?: string; // For NFT-gated communities
}

export interface JoinCommunityResponse {
  success: boolean;
  message: string;
  data: {
    isJoined: boolean;
    memberCount: number;
    requiresNFT?: boolean;
    nftVerified?: boolean;
  };
}

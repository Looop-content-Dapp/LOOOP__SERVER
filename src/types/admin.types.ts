export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'MODERATOR';
export type AdminLevel = 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';

export interface AdminPermissions {
  canApproveArtistClaims: boolean;
  canManageUsers: boolean;
  canCreatePlaylists: boolean;
  canModerateContent: boolean;
  canManageAdmins: boolean;
  canViewAnalytics: boolean;
  canManageSystem: boolean;
  canDeleteContent: boolean;
  canBanUsers: boolean;
  canManagePayments: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  adminLevel?: AdminLevel;
  permissions: string[];
  isAdmin: boolean;
  adminApprovedAt?: string;
  adminApprovedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRegistrationRequest {
  name: string;
  email: string; // Must end with @looopmusic.com
  password: string;
  adminLevel: AdminLevel;
  requestedPermissions?: string[];
  justification: string; // Why they need admin access
}

export interface AdminRegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    user: AdminUser;
    requiresApproval: boolean;
    approvalInfo?: {
      submittedAt: string;
      estimatedReviewTime: string;
    };
  };
}

export interface AdminApprovalRequest {
  userId: string;
  adminLevel: AdminLevel;
  permissions: string[];
  approvedBy: string;
  notes?: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalArtists: number;
  pendingArtistClaims: number;
  totalTracks: number;
  totalPlaylists: number;
  activeSubscriptions: number;
  recentActivity: {
    date: string;
    newUsers: number;
    newTracks: number;
    newArtistClaims: number;
  }[];
  userGrowth: {
    current: number;
    previous: number;
    percentage: number;
  };
  contentGrowth: {
    tracks: { current: number; previous: number; percentage: number };
    artists: { current: number; previous: number; percentage: number };
  };
}

export interface AdminActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  action: AdminAction;
  targetType: 'user' | 'artist' | 'track' | 'playlist' | 'claim' | 'system';
  targetId: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export type AdminAction = 
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  | 'ARTIST_CLAIM_APPROVED'
  | 'ARTIST_CLAIM_REJECTED'
  | 'ADMIN_PROMOTED'
  | 'ADMIN_DEMOTED'
  | 'PLAYLIST_CREATED'
  | 'PLAYLIST_FEATURED'
  | 'CONTENT_MODERATED'
  | 'CONTENT_DELETED'
  | 'SYSTEM_SETTING_CHANGED';

export interface UserManagementFilters {
  role?: UserRole;
  isVerified?: boolean;
  isAdmin?: boolean;
  adminLevel?: AdminLevel;
  country?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface PlaylistCreationRequest {
  title: string;
  description?: string;
  isPublic: boolean;
  isFeatured?: boolean;
  trackIds: string[];
  tags?: string[];
  artworkUrl?: string;
}

export interface FeaturedPlaylist {
  id: string;
  title: string;
  description?: string;
  artworkUrl?: string;
  trackCount: number;
  createdBy: {
    id: string;
    name: string;
    isAdmin: boolean;
  };
  isFeatured: boolean;
  featuredAt?: string;
  createdAt: string;
}

export const DEFAULT_ADMIN_PERMISSIONS: Record<AdminLevel, string[]> = {
  MODERATOR: [
    'canModerateContent',
    'canViewAnalytics'
  ],
  ADMIN: [
    'canApproveArtistClaims',
    'canManageUsers',
    'canCreatePlaylists',
    'canModerateContent',
    'canViewAnalytics',
    'canDeleteContent'
  ],
  SUPER_ADMIN: [
    'canApproveArtistClaims',
    'canManageUsers',
    'canCreatePlaylists',
    'canModerateContent',
    'canManageAdmins',
    'canViewAnalytics',
    'canManageSystem',
    'canDeleteContent',
    'canBanUsers',
    'canManagePayments'
  ]
};

export const LOOOP_ADMIN_DOMAIN = '@looopmusic.com';

export interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  uploadEnabled: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  featuredPlaylistIds: string[];
  announcements: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    active: boolean;
    expiresAt?: string;
  }[];
}

export interface ArtistSearchResult {
  id?: string;
  name: string;
  profileImage?: string;
  followers: number;
  monthlyListeners: number;
  verified: boolean;
  recentReleases?: {
    id: string;
    title: string;
    releaseDate: string;
    artworkUrl?: string;
  }[];
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    facebook?: string;
    youtube?: string;
    spotify?: string;
    appleMusic?: string;
  };
  isClaimed: boolean;
  claimedAt?: string;
}

export interface SocialLinksData {
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
  spotify?: string;
  appleMusic?: string;
  website?: string;
  soundcloud?: string;
  bandcamp?: string;
}

export interface DistributorInfo {
  provider: 'distrokid' | 'tunecore' | 'awal' | 'cd_baby' | 'unitedmasters' | 'ditto' | 'amuse' | 'other';
  accountEmail?: string;
  verificationToken?: string;
  isVerified: boolean;
  releaseIds?: string[];
}

export interface CreatorFormData {
  artistName: string;
  role: 'artist' | 'manager' | 'label_rep';
  connectionDetails: {
    fullName: string;
    email: string;
    phone: string;
  };
  websiteUrl: string;
  socialLinks: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    facebook?: string;
    youtube?: string;
    spotify?: string;
    appleMusic?: string;
    website?: string;
    soundcloud?: string;
    bandcamp?: string;
  };
  distributorInfo: {
    provider: 'distrokid' | 'tunecore' | 'awal' | 'cd_baby' | 'unitedmasters' | 'ditto' | 'amuse' | 'other' | 'none';
    accountEmail: string;
    verificationToken?: string;
    isVerified?: boolean;
  };
  hasManagement: boolean;
  managementContact: {
    name: string;
    email: string;
    phone: string;
    company: string;
  } | null;
  hasLabel: boolean;
  labelContact: {
    name: string;
    email: string;
    phone: string;
    company: string;
  } | null;
  additionalInfo: string;
  agreements: {
    termsAgreed: boolean;
    privacyAgreed: boolean;
    verificationAgreed: boolean;
  };
}

export interface ArtistClaimRequest {
  // Step 1: Artist Selection
  artistId?: string; // For existing artists
  artistName: string; // For new artists or confirmation

  // Step 2: Role and Connection
  role: 'artist' | 'manager' | 'label_rep' | 'band_member' | 'producer' | 'publisher' | 'booking_agent' | 'other';
  connectionDetails: string; // How they're connected to the artist

  // Step 3: Personal Information
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string; // For managers, labels, etc.

  // Step 4: Verification Data
  officialEmail?: string; // Official artist/band email
  websiteUrl?: string;
  socialLinks?: SocialLinksData;

  // Step 5: Evidence and Documentation
  evidenceUrls: string[]; // Screenshots, videos, documents
  distributorInfo?: DistributorInfo;

  // Step 6: Additional Information
  additionalInfo?: string;
  agreesToTerms: boolean;
  agreesToPrivacy: boolean;
}

export interface ArtistClaimResponse {
  id: string;
  status: ClaimStatus;
  artistName: string;
  artistId?: string;
  submittedAt: string;
  estimatedReviewTime: string; // e.g., "1-3 business days"
  message: string;
  trackingNumber: string; // User-friendly tracking number
}

export type ClaimStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'info_required'
  | 'distributor_verification_pending';

export type ClaimRole =
  | 'artist'
  | 'manager'
  | 'label_rep'
  | 'band_member'
  | 'producer'
  | 'publisher'
  | 'booking_agent'
  | 'other';

export interface ClaimStatusUpdate {
  status: ClaimStatus;
  message: string;
  reviewNotes?: string;
  rejectionReason?: string;
  adminUserId?: string;
  actionRequired?: {
    type: 'additional_info' | 'verification' | 'documentation';
    description: string;
    deadline?: string;
  };
}

export interface ArtistClaimFull {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };

  // Artist information
  artistId?: string;
  artist?: ArtistSearchResult;
  artistName: string;

  // Claimant information
  role: ClaimRole;
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;

  // Verification data
  officialEmail?: string;
  websiteUrl?: string;
  socialLinks?: SocialLinksData;
  distributorInfo?: DistributorInfo;
  connectionDetails?: string;
  evidenceUrls: string[];

  // Status and processing
  status: ClaimStatus;
  submissionType: 'manual' | 'distributor_verified';
  reviewNotes?: string;
  rejectionReason?: string;
  adminUserId?: string;

  // Timestamps
  submittedAt: string;
  reviewedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Computed fields
  trackingNumber: string;
  estimatedReviewTime: string;
  canResubmit: boolean;
  daysInReview: number;
}

export interface ArtistClaimSearchFilters {
  status?: ClaimStatus;
  role?: ClaimRole;
  submissionType?: 'manual' | 'distributor_verified';
  dateRange?: {
    from: string;
    to: string;
  };
  artistName?: string;
  claimantName?: string;
  page?: number;
  limit?: number;
  sortBy?: 'submittedAt' | 'reviewedAt' | 'artistName' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface ClaimStatistics {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  infoRequired: number;
  averageReviewTime: number; // in hours
  approvalRate: number; // percentage
  recentActivity: {
    date: string;
    submitted: number;
    approved: number;
    rejected: number;
  }[];
}

export interface DistributorVerificationRequest {
  provider: DistributorInfo['provider'];
  accountEmail: string;
  releaseIds?: string[];
  verificationMethod: 'email' | 'api' | 'manual';
}

export interface AdminClaimAction {
  claimId: string;
  action: 'approve' | 'reject' | 'request_info' | 'assign_reviewer';
  reason?: string;
  notes?: string;
  assigneeId?: string;
  requestedInfo?: {
    type: 'additional_documentation' | 'clarification' | 'verification';
    description: string;
    deadline?: string;
  };
}

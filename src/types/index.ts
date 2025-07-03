// Re-export all types for easy importing
export * from './wallet.types';
export * from './playlist.types';
export * from './streaming.types';

// Common type definitions that can be used across the application
import { Prisma } from '@prisma/client';

/**
 * Generic JSON type that ensures compatibility with Prisma Json
 */
export type JsonValue = Prisma.JsonValue;

/**
 * User response type for API responses
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  meta?: PaginationMeta;
}

/**
 * Database model types with relations
 */
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    artist: true;
    accounts: true;
    sessions: true;
  };
}>;

export type ArtistWithRelations = Prisma.ArtistGetPayload<{
  include: {
    user: true;
    tracks: true;
    communities: true;
  };
}>;

export type WalletWithRelations = Prisma.WalletGetPayload<{
  select: {
    email: true;
    address: true;
    isDeployed: true;
    constructorCalldata: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

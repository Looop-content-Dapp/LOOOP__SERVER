# LOOOP Music Frontend Implementation Guide

## Table of Contents

1. [Introduction](#introduction)
2. [API Base URL](#api-base-url)
3. [Authentication](#authentication)
4. [Home Feed Implementation](#home-feed-implementation)
   - [Endpoint Details](#home-feed-endpoint-details)
   - [Request Parameters](#home-feed-request-parameters)
   - [Response Structure](#home-feed-response-structure)
   - [Feed Sections](#feed-sections)
   - [Implementation Guidelines](#home-feed-implementation-guidelines)
5. [Discovery Section Implementation](#discovery-section-implementation)
   - [Endpoint Details](#discovery-endpoint-details)
   - [Request Parameters](#discovery-request-parameters)
   - [Response Structure](#discovery-response-structure)
   - [Implementation Guidelines](#discovery-implementation-guidelines)
6. [Search Content Implementation](#search-content-implementation)
   - [Endpoint Details](#search-endpoint-details)
   - [Request Parameters](#search-request-parameters)
   - [Response Structure](#search-response-structure)
   - [Implementation Guidelines](#search-implementation-guidelines)
7. [Data Models](#data-models)
8. [Error Handling](#error-handling)

## Introduction

This document provides comprehensive guidelines for implementing the frontend integration with LOOOP Music's backend API, specifically focusing on the Home Feed and Discovery endpoints. It includes all necessary details for frontend developers to successfully implement these features.

## API Base URL

All API endpoints are prefixed with the following base URL:

```
http://localhost:3001/api/v1
```

In production environments, this will be replaced with the appropriate domain.

## Authentication

Many endpoints support both authenticated and unauthenticated access. For authenticated requests, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Endpoints marked with `optionalAuth` will return personalized content when authenticated and generic content when not authenticated.

## Home Feed Implementation

### Home Feed Endpoint Details

- **Endpoint**: `GET /music/feed`
- **Authentication**: Optional
- **Controller**: `MusicFeedController.getHomeFeed`
- **Description**: Returns a personalized music feed including curated content, dive-in sections, fan recommendations, content from followed artists, artists you follow, and a daily mix of songs from all artists the user is following.

### Home Feed Request Parameters

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| page      | number | No       | 1       | Page number for pagination |
| limit     | number | No       | 20      | Number of items per page |
| feedType  | string | No       | 'all'   | Type of feed to return. Options: 'all', 'following', 'new_releases', 'hot', 'admin_curated', 'daily_mix', 'artists_you_follow' |
| location  | string | No       | -       | Filter by location |
| genres    | array  | No       | -       | Filter by genres |

### Home Feed Response Structure

```typescript
{
  success: boolean;
  data: {
    sections: {
      curated: MusicFeedItem[];
      dive_in: MusicFeedItem[];
      fans_follow: MusicFeedItem[];
      from_artists_you_follow: MusicFeedItem[];
      artists_you_follow: MusicFeedItem[];
      daily_mix: MusicFeedItem[];
    };
    items: MusicFeedItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}
```

### Feed Sections

The home feed is divided into several sections:

1. **Curated** (`curated`): New albums and releases, including both albums and individual tracks.
2. **Dive Right In** (`dive_in`): Featured playlists and popular tracks.
3. **Fans Also Follow** (`fans_follow`): Artists that are followed by fans of artists the user follows.
4. **From Artists You Follow** (`from_artists_you_follow`): Recent content from artists the user follows.
5. **Artists You Follow** (`artists_you_follow`): List of artists the user follows with their details.
6. **Daily Mix** (`daily_mix`): A randomized selection of tracks from artists the user follows.

### Home Feed Implementation Guidelines

1. **Section-Based Layout**:
   - Implement a horizontal scrolling layout for each section
   - Display section titles prominently
   - Show "See all" links for sections with more content

2. **Content Cards**:
   - Use appropriate card designs for different content types (tracks, albums, artists, playlists)
   - Include artwork, title, description, and relevant metadata
   - Implement play buttons for audio content

3. **Personalization**:
   - When authenticated, highlight personalized sections
   - Show appropriate empty states when sections have no content
   - Implement "Follow" buttons for artists in the "Fans Also Follow" section

4. **Infinite Scrolling**:
   - Implement infinite scrolling using the pagination parameters
   - Load additional content when the user scrolls to the bottom
   - Show loading indicators during content fetching

5. **Filtering**:
   - Implement filter controls for feedType, location, and genres
   - Update content dynamically when filters change
   - Preserve filter state during navigation

## Discovery Section Implementation

### Discovery Endpoint Details

- **Endpoint**: `GET /music/discover`
- **Authentication**: Optional
- **Controller**: `MusicFeedController.getDiscoverySection`
- **Description**: Returns discovery sections including charting songs by location, top songs worldwide, and top albums.

### Discovery Request Parameters

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| location  | string | No       | 'Nigeria' | Location for charting songs |

### Discovery Response Structure

```typescript
{
  success: boolean;
  data: {
    topSongsByLocation: {
      location: string;
      tracks: FeedTrack[];
    };
    top10Albums: FeedAlbum[];
    topSongsWorldwide: FeedTrack[];
    trending: {
      artists: FeedArtist[];
      tracks: FeedTrack[];
      albums: FeedAlbum[];
    };
  };
}
```

### Discovery Implementation Guidelines

1. **Layout Structure**:
   - Implement a vertical scrolling layout with distinct sections
   - Display "Charting in [Location]" section at the top
   - Follow with "Top songs worldwide" and "Top albums" sections

2. **Track List Items**:
   - Display track artwork, title, artist name, and formatted duration
   - For "Charting in [Location]" and "Top songs worldwide", use a consistent list format
   - Include play buttons for each track

3. **Album Display**:
   - Show album artwork prominently
   - Display ranking indicators (#1, #2, #3) as shown in the UI
   - Include artist name and album title

4. **Location Selection**:
   - Implement a location selector to change the "Charting in [Location]" section
   - Update content dynamically when location changes

5. **Responsive Design**:
   - Ensure the discovery page is responsive across different screen sizes
   - Adjust layout for mobile devices while maintaining all sections

## Search Content Implementation

### Search Endpoint Details

- **Endpoint**: `GET /music/search`
- **Authentication**: Optional
- **Controller**: `MusicFeedController.searchContent`
- **Description**: Searches for tracks, artists, albums, playlists, users, and communities based on a query string.

### Search Request Parameters

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| query     | string | Yes      | -       | Search query string |
| type      | string | No       | 'all'   | Type of content to search. Options: 'all', 'tracks', 'artists', 'albums', 'playlists', 'users', 'communities' |
| location  | string | No       | -       | Filter by location |
| genre     | string | No       | -       | Filter by genre |
| limit     | number | No       | 10      | Number of items per page |
| page      | number | No       | 1       | Page number for pagination |
| sort      | string | No       | -       | Sort order. Options: 'relevance', 'newest', 'oldest', 'popular', 'unpopular' |

### Search Response Structure

```typescript
{
  success: boolean;
  data: {
    results: {
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
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}
```

### Search Implementation Guidelines

1. **Search Interface**:
   - Implement a search bar with appropriate placeholder text
   - Add type filters to narrow search results
   - Include advanced search options (location, genre, sort)

2. **Results Display**:
   - Group results by content type (tracks, artists, albums, etc.)
   - Show appropriate thumbnails and metadata for each result type
   - Implement "See all" links for each content type

3. **Empty States**:
   - Display appropriate empty state messages when no results are found
   - Suggest alternative search terms or browsing options

4. **Pagination**:
   - Implement pagination controls for each content type
   - Show loading indicators during search operations
   - Preserve search state during navigation

5. **Result Actions**:
   - Add play buttons for tracks
   - Include follow/unfollow buttons for artists and users
   - Implement join/leave buttons for communities

## Data Models

### MusicFeedItem

```typescript
interface MusicFeedItem {
  id: string;
  type: 'new_release' | 'artist_update' | 'admin_playlist' | 'hot_track' | 'community_post' | 'liked_track' | 'album' | 'track' | 'profile' | 'playlist' | 'artist';
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
    reason?: string;
    location?: string;
    ranking?: number;
    section?: 'curated' | 'dive_in' | 'fans_follow' | 'from_artists_you_follow' | 'artists_you_follow' | 'daily_mix';
    playCount?: number;
    followers?: number;
    itemType?: 'track' | 'album' | 'artist' | 'playlist' | 'profile';
  };
}
```

### FeedTrack

```typescript
interface FeedTrack {
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
  formattedDuration?: string; // Format: "2:46"
}
```

### FeedAlbum

```typescript
interface FeedAlbum {
  id: string;
  title: string;
  artworkUrl?: string;
  releaseDate: string;
  trackCount: number;
  ranking?: string; // Format: "#1", "#2", etc.
  artist: {
    id: string;
    name: string;
    verified: boolean;
    profileImage?: string;
  };
  tracks?: FeedTrack[];
}
```

### FeedArtist

```typescript
interface FeedArtist {
  id: string;
  name: string;
  profileImage?: string;
  verified: boolean;
  followers: number;
  monthlyListeners: number;
  isFollowing?: boolean;
  latestRelease?: FeedTrack;
}
```

### FeedPlaylist

```typescript
interface FeedPlaylist {
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
```

## Error Handling

All API endpoints follow a consistent error response format:

```typescript
{
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}
```

Implement appropriate error handling in the frontend:

1. **Network Errors**:
   - Handle connection issues gracefully
   - Implement retry mechanisms for transient failures
   - Display user-friendly error messages

2. **Authentication Errors**:
   - Redirect to login page when authentication is required
   - Handle token expiration by refreshing or requesting re-authentication

3. **Content Errors**:
   - Display appropriate messages when content is not available
   - Implement fallback content for empty sections
   - Log detailed errors for debugging purposes

4. **Rate Limiting**:
   - Handle 429 Too Many Requests errors
   - Implement exponential backoff for retries
   - Inform users when rate limits are reached
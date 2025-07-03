# Music API Endpoints

This document describes the playlist and streaming endpoints implemented in the LOOOP Server.

## Base URL
All endpoints are prefixed with `/api/v1/music`

## Authentication
- 🔒 **Authenticated**: Requires `Authorization: Bearer <token>` header
- 🔓 **Public**: No authentication required
- 🔒/🔓 **Optional**: Works with or without authentication

---

## Playlist Endpoints

### Create Playlist
🔒 **POST** `/playlists`

Creates a new playlist for the authenticated user.

**Request Body:**
```json
{
  "title": "My Awesome Playlist",
  "description": "Collection of my favorite tracks",
  "isPublic": true,
  "artworkUrl": "https://example.com/artwork.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "playlist": {
      "id": "playlist_id",
      "title": "My Awesome Playlist",
      "description": "Collection of my favorite tracks",
      "isPublic": true,
      "artworkUrl": "https://example.com/artwork.jpg",
      "trackCount": 0,
      "isOwned": true,
      "isAdminPlaylist": false,
      "createdAt": "2023-12-01T10:00:00Z",
      "updatedAt": "2023-12-01T10:00:00Z",
      "createdBy": {
        "id": "user_id",
        "name": "John Doe",
        "username": "johndoe",
        "isAdmin": false
      }
    }
  },
  "message": "Playlist created successfully"
}
```

### Get User Playlists
🔒 **GET** `/playlists`

Gets playlists for the authenticated user with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `filter` (string): Filter type - `owned`, `public`, `featured`
- `sortBy` (string): Sort field - `created`, `updated`, `title`, `trackCount`
- `sortOrder` (string): Sort order - `asc`, `desc`
- `search` (string): Search in title and description

**Response:**
```json
{
  "success": true,
  "data": {
    "playlists": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### Get Public Playlists
🔓 **GET** `/playlists/public`

Gets all public playlists.

### Get Featured Playlists
🔓 **GET** `/playlists/featured`

Gets playlists created by admin users (featured playlists).

### Get Playlist Details
🔒/🔓 **GET** `/playlists/:playlistId`

Gets detailed information about a specific playlist including all tracks.

**Response:**
```json
{
  "success": true,
  "data": {
    "playlist": {
      "id": "playlist_id",
      "title": "My Awesome Playlist",
      "tracks": [
        {
          "id": "playlist_track_id",
          "position": 1,
          "addedAt": "2023-12-01T10:00:00Z",
          "track": {
            "id": "track_id",
            "title": "Amazing Song",
            "duration": 240,
            "playCount": 1500,
            "likeCount": 120,
            "artist": {
              "id": "artist_id",
              "name": "Great Artist",
              "verified": true
            },
            "album": {
              "id": "album_id",
              "title": "Great Album"
            }
          }
        }
      ],
      "totalDuration": 1200
    }
  }
}
```

### Update Playlist
🔒 **PUT** `/playlists/:playlistId`

Updates playlist information (only owner can update).

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "isPublic": false
}
```

### Delete Playlist
🔒 **DELETE** `/playlists/:playlistId`

Deletes a playlist (only owner can delete).

### Add Track to Playlist
🔒 **POST** `/playlists/:playlistId/tracks`

Adds a track to the playlist.

**Request Body:**
```json
{
  "trackId": "track_id",
  "position": 5
}
```

### Remove Track from Playlist
🔒 **DELETE** `/playlists/:playlistId/tracks`

Removes a track from the playlist.

**Request Body:**
```json
{
  "trackId": "track_id"
}
```

### Reorder Playlist Tracks
🔒 **PUT** `/playlists/:playlistId/reorder`

Reorders tracks in the playlist.

**Request Body:**
```json
{
  "trackIds": ["track_1", "track_3", "track_2"]
}
```

### Share Playlist
🔒 **POST** `/playlists/:playlistId/share`

Generates sharing links for the playlist.

**Request Body:**
```json
{
  "shareType": "link",
  "platform": "twitter"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://looop.music/playlist/playlist_id",
    "socialText": "Check out \"My Awesome Playlist\" by John Doe on LOOOP 🎵"
  }
}
```

---

## Streaming Endpoints

### Get Track Stream
🔒/🔓 **GET** `/stream/:trackId`

Gets streaming URL and token for a track.

**Query Parameters:**
- `startTime` (number): Start position in seconds
- `quality` (string): Audio quality - `low`, `medium`, `high`, `lossless`
- `deviceId` (string): Device identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "streamUrl": "https://stream.looop.music/track_id?token=...",
    "streamToken": "jwt_token",
    "expiresAt": "2023-12-01T11:00:00Z",
    "quality": "medium",
    "bitrate": 256,
    "format": "mp3",
    "trackInfo": {
      "id": "track_id",
      "title": "Amazing Song",
      "artist": "Great Artist",
      "duration": 240,
      "artworkUrl": "https://example.com/artwork.jpg"
    }
  }
}
```

### Update Play Count
🔒 **POST** `/stream/play-count`

Updates play count and adds entry to play history.

**Request Body:**
```json
{
  "trackId": "track_id",
  "duration": 180,
  "completed": false
}
```

### Get Play History
🔒 **GET** `/stream/history`

Gets user's play history with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `startDate` (string): Filter from date (ISO 8601)
- `endDate` (string): Filter to date (ISO 8601)
- `artistId` (string): Filter by artist
- `genreFilter` (array): Filter by genres

**Response:**
```json
{
  "success": true,
  "data": {
    "tracks": [
      {
        "id": "history_id",
        "trackId": "track_id",
        "playedAt": "2023-12-01T10:00:00Z",
        "duration": 180,
        "track": {
          "id": "track_id",
          "title": "Amazing Song",
          "artist": {
            "id": "artist_id",
            "name": "Great Artist",
            "verified": true
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 234,
      "hasNext": true
    }
  }
}
```

### Get Last Played
🔒 **GET** `/stream/last-played`

Gets user's recently played tracks (unique tracks only).

**Query Parameters:**
- `limit` (number): Number of tracks (max 100, default 20)

### Get Streaming Analytics
🔒 **GET** `/stream/analytics`

Gets streaming analytics for the user (or artist if they have an artist profile).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPlays": 1234,
    "uniqueListeners": 567,
    "averageListenDuration": 180,
    "completionRate": 85.5,
    "topTracks": [
      {
        "track": {
          "id": "track_id",
          "title": "Hit Song",
          "artist": "Great Artist",
          "playCount": 5000
        }
      }
    ],
    "recentActivity": [...]
  }
}
```

### Get User Preferences
🔒 **GET** `/stream/preferences`

Gets user's listening preferences.

**Response:**
```json
{
  "success": true,
  "data": {
    "preferredQuality": "high",
    "autoPlay": true,
    "crossfade": false,
    "gaplessPlayback": true,
    "volumeNormalization": true
  }
}
```

### Update User Preferences
🔒 **PUT** `/stream/preferences`

Updates user's listening preferences.

**Request Body:**
```json
{
  "preferredQuality": "high",
  "autoPlay": false,
  "crossfade": true
}
```

### Get Currently Playing
🔒 **GET** `/stream/currently-playing`

Gets the user's currently playing track.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentlyPlaying": {
      "id": "history_id",
      "trackId": "track_id",
      "track": {...}
    }
  }
}
```

### Stream Audio File
🔓 **GET** `/stream/:trackId/audio`

Direct audio streaming endpoint (requires valid stream token).

**Query Parameters:**
- `token` (string): Stream token from `/stream/:trackId`
- `quality` (string): Audio quality

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description"
  }
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (access denied)
- `404` - Not Found
- `409` - Conflict (e.g., track already in playlist)
- `500` - Internal Server Error

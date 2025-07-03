import { Router } from 'express';
import { MusicFeedController } from '@/controllers/music/feed.controller';
import { PlaylistController } from '@/controllers/music/playlist.controller';
import { StreamingController } from '@/controllers/music/streaming.controller';
import { requireAuth, optionalAuth } from '@/middleware/auth';

const router: Router = Router();

// Music Feed Routes
router.get('/feed', optionalAuth, MusicFeedController.getHomeFeed);
router.get('/discover', optionalAuth, MusicFeedController.getDiscoverySection);
router.get('/search', optionalAuth, MusicFeedController.searchContent);

// Playlist Routes
router.post('/playlists', requireAuth, PlaylistController.createPlaylist);
router.get('/playlists', requireAuth, PlaylistController.getUserPlaylists);
router.get('/playlists/public', PlaylistController.getPublicPlaylists);
router.get('/playlists/featured', PlaylistController.getFeaturedPlaylists);
router.get('/playlists/:playlistId', optionalAuth, PlaylistController.getPlaylistById);
router.put('/playlists/:playlistId', requireAuth, PlaylistController.updatePlaylist);
router.delete('/playlists/:playlistId', requireAuth, PlaylistController.deletePlaylist);
router.post('/playlists/:playlistId/tracks', requireAuth, PlaylistController.addTrackToPlaylist);
router.delete('/playlists/:playlistId/tracks', requireAuth, PlaylistController.removeTrackFromPlaylist);
router.put('/playlists/:playlistId/reorder', requireAuth, PlaylistController.reorderPlaylistTracks);
router.post('/playlists/:playlistId/share', requireAuth, PlaylistController.sharePlaylist);

// Streaming Routes
router.get('/stream/:trackId', optionalAuth, StreamingController.getTrackStream);
router.post('/stream/play-count', requireAuth, StreamingController.updatePlayCount);
router.get('/stream/history', requireAuth, StreamingController.getPlayHistory);
router.get('/stream/last-played', requireAuth, StreamingController.getLastPlayed);
router.get('/stream/analytics', requireAuth, StreamingController.getStreamingAnalytics);
router.get('/stream/preferences', requireAuth, StreamingController.getUserPreferences);
router.put('/stream/preferences', requireAuth, StreamingController.updateUserPreferences);
router.get('/stream/currently-playing', requireAuth, StreamingController.getCurrentlyPlaying);

// Audio streaming endpoint (for actual file streaming)
router.get('/stream/:trackId/audio', StreamingController.streamAudio);

// Health check
router.get('/health', (_req, res) => {
  res.json({ 
    message: 'Music routes are active',
    endpoints: {
      // Feed endpoints
      feed: 'GET /music/feed - Get personalized music feed',
      discover: 'GET /music/discover - Get discovery section with top tracks/albums',
      search: 'GET /music/search - Search music, artists, albums, playlists',
      
      // Playlist endpoints
      createPlaylist: 'POST /music/playlists - Create new playlist',
      getUserPlaylists: 'GET /music/playlists - Get user playlists',
      getPublicPlaylists: 'GET /music/playlists/public - Get public playlists',
      getFeaturedPlaylists: 'GET /music/playlists/featured - Get featured playlists',
      getPlaylist: 'GET /music/playlists/:id - Get playlist details',
      updatePlaylist: 'PUT /music/playlists/:id - Update playlist',
      deletePlaylist: 'DELETE /music/playlists/:id - Delete playlist',
      addTrack: 'POST /music/playlists/:id/tracks - Add track to playlist',
      removeTrack: 'DELETE /music/playlists/:id/tracks - Remove track from playlist',
      reorderTracks: 'PUT /music/playlists/:id/reorder - Reorder playlist tracks',
      sharePlaylist: 'POST /music/playlists/:id/share - Share playlist',
      
      // Streaming endpoints
      getStream: 'GET /music/stream/:trackId - Get track stream URL',
      updatePlayCount: 'POST /music/stream/play-count - Update play count',
      getHistory: 'GET /music/stream/history - Get play history',
      getLastPlayed: 'GET /music/stream/last-played - Get last played tracks',
      getAnalytics: 'GET /music/stream/analytics - Get streaming analytics',
      getPreferences: 'GET /music/stream/preferences - Get listening preferences',
      updatePreferences: 'PUT /music/stream/preferences - Update listening preferences',
      getCurrentlyPlaying: 'GET /music/stream/currently-playing - Get currently playing track',
      streamAudio: 'GET /music/stream/:trackId/audio - Stream audio file'
    }
  });
});

export default router;

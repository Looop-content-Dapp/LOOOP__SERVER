import { config } from 'dotenv';
import SpotifyWebApi from 'spotify-web-api-node';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Load environment variables
config();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET?.trim(),
});

// Automatically handle token refresh
let tokenExpirationTime = 0;

const getValidToken = async () => {
  const now = Date.now();
  if (now >= tokenExpirationTime) {
    try {
      const data = await spotifyApi.clientCredentialsGrant();
      spotifyApi.setAccessToken(data.body.access_token);
      // Set expiration time (subtract 1 minute for safety margin)
      tokenExpirationTime = now + (data.body.expires_in - 60) * 1000;
      console.log('✅ Spotify access token obtained');
    } catch (error) {
      console.error('❌ Failed to obtain Spotify token:', error.message);
      throw error;
    }
  }
  return spotifyApi.getAccessToken();
};

// Retry wrapper for rate limiting
const retryOnRateLimit = async (apiCall, maxRetries = 3, baseDelay = 1) => {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      if (error.statusCode === 429) {
        const retryAfter = error.headers?.['retry-after'] 
          ? parseInt(error.headers['retry-after'], 10) 
          : baseDelay * Math.pow(2, retries);
        
        console.log(`Rate limit hit, retrying after ${retryAfter} seconds... (${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
      } else if (error.statusCode === 401) {
        console.log('Access token expired, refreshing...');
        await getValidToken();
        retries++;
      } else {
        throw error;
      }
    }
  }

  throw lastError || new Error('Max retries reached');
};

// Transform Spotify artist data to Prisma format
const transformSpotifyArtist = (spotifyArtist, user) => {
  const biography = `${spotifyArtist.name} is an artist with ${spotifyArtist.followers?.total || 0} followers on Spotify.` +
    (spotifyArtist.genres?.length ? ` Their music spans genres including ${spotifyArtist.genres.join(', ')}.` : '');

  return {
    userId: user.id,
    name: spotifyArtist.name,
    email: `artist_${spotifyArtist.id}_${Date.now()}@spotify-import.com`,
    profileImage: spotifyArtist.images?.[0]?.url || null,
    biography,
    country: 'US', // Default as Spotify doesn't provide this
    websiteurl: spotifyArtist.external_urls?.spotify || null,
    monthlyListeners: Math.floor(Math.random() * 1000000) + 1000,
    followers: spotifyArtist.followers?.total || 0,
    verified: true,
    socialLinks: {
      spotify: spotifyArtist.external_urls?.spotify || null,
      instagram: null,
      twitter: null,
      facebook: null,
      website: null
    },
    popularity: spotifyArtist.popularity || 0,
    topTracks: [],
    roles: ['musician'],
    labels: [],
    genres: spotifyArtist.genres || [],
    artistId: spotifyArtist.id
  };
};

// Transform Spotify track data to Prisma format
const transformSpotifyTrack = (spotifyTrack, artistId, userId, songId, releaseId = null) => {
  return {
    title: spotifyTrack.name,
    version: 'Original',
    artistId,
    userId,
    songId,
    releaseId,
    duration: Math.floor((spotifyTrack.duration_ms || 0) / 1000), // Convert to seconds
    fileUrl: spotifyTrack.preview_url || 'placeholder_url',
    genre: spotifyTrack.album?.genres || ['unknown'],
    bpm: Math.floor(Math.random() * 60) + 70, // Random BPM between 70-130
    key: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][Math.floor(Math.random() * 12)],
    mood: ['Energetic', 'Calm', 'Happy', 'Melancholic'][Math.floor(Math.random() * 4)],
    tags: [],
    isPublic: true,
    playCount: Math.floor(Math.random() * 100000),
    likeCount: Math.floor(Math.random() * 10000),
    metadata: {
      spotifyId: spotifyTrack.id,
      isrc: spotifyTrack.external_ids?.isrc || null,
      popularity: spotifyTrack.popularity || 0,
      previewUrl: spotifyTrack.preview_url || null,
      trackNumber: spotifyTrack.track_number || 1,
      discNumber: spotifyTrack.disc_number || 1
    },
    credits: [{
      role: 'Primary Artist',
      artistId,
      contribution: 'Performance',
      primaryContributor: true
    }],
    lyrics: {
      syncedLyrics: [],
      plainText: null,
      language: 'en'
    },
    flags: {
      isExplicit: spotifyTrack.explicit || false,
      isInstrumental: spotifyTrack.name.toLowerCase().includes('instrumental'),
      hasLyrics: !spotifyTrack.name.toLowerCase().includes('instrumental')
    }
  };
};

// Transform Spotify album/release data to Prisma format
const transformSpotifyRelease = (spotifyAlbum, artistId) => {
  const releaseDate = spotifyAlbum.release_date ? new Date(spotifyAlbum.release_date) : new Date();
  
  return {
    title: spotifyAlbum.name,
    artistId,
    type: spotifyAlbum.album_type || 'album',
    releaseDate,
    artwork: {
      cover_image: {
        high: spotifyAlbum.images?.[0]?.url || null,
        medium: spotifyAlbum.images?.[1]?.url || null,
        low: spotifyAlbum.images?.[2]?.url || null,
        thumbnail: spotifyAlbum.images?.[2]?.url || null
      }
    },
    metadata: {
      genre: spotifyAlbum.genres?.length ? [spotifyAlbum.genres[0]] : ['unknown'],
      totalTracks: spotifyAlbum.total_tracks || 0,
      spotifyId: spotifyAlbum.id,
      language: 'en'
    },
    commercial: {
      label: spotifyAlbum.label || 'Independent',
      upc: spotifyAlbum.external_ids?.upc || `TEMP-UPC-${Date.now()}`
    },
    description: `${spotifyAlbum.name} - ${spotifyAlbum.album_type} by ${spotifyAlbum.artists?.[0]?.name || 'Unknown Artist'}`,
    verificationStatus: 'approved',
    verifiedAt: new Date(),
    analytics: {
      totalStreams: Math.floor(Math.random() * 5000000),
      uniqueListeners: Math.floor(Math.random() * 1000000),
      saves: Math.floor(Math.random() * 100000)
    }
  };
};

// Transform Spotify track to Song format
const transformSpotifyToSong = (spotifyTrack) => {
  return {
    fileUrl: spotifyTrack.preview_url || 'placeholder_url',
    duration: Math.floor((spotifyTrack.duration_ms || 0) / 1000), // Convert to seconds
    bitrate: 320,
    format: 'mp3',
    analytics: {
      totalStreams: Math.floor(Math.random() * 10000000),
      uniqueListeners: Math.floor(Math.random() * 5000000),
      playlistAdditions: Math.floor(Math.random() * 100000),
      shares: {
        total: Math.floor(Math.random() * 50000),
        platforms: {
          facebook: Math.floor(Math.random() * 20000),
          twitter: Math.floor(Math.random() * 15000),
          whatsapp: Math.floor(Math.random() * 10000),
          other: Math.floor(Math.random() * 5000)
        }
      },
      likes: Math.floor(Math.random() * 500000),
      comments: Math.floor(Math.random() * 1000),
      downloads: Math.floor(Math.random() * 50000)
    },
    streamHistory: generateStreamHistory(),
    engagement: {
      skipRate: Math.random() * 0.3,
      averageCompletionRate: Math.random() * 0.3 + 0.7,
      repeatListenRate: Math.random() * 0.5
    },
    waveform: Array.from({ length: 100 }, () => Math.random()),
    lyrics: '',
    isrc: spotifyTrack.external_ids?.isrc || `TEMP${Date.now()}${Math.floor(Math.random() * 1000)}`,
    audioQuality: {
      peak: Math.random(),
      averageVolume: Math.random() * 0.8,
      dynamicRange: Math.random() * 20
    },
    flags: {
      isExplicit: spotifyTrack.explicit || false,
      containsExplicitLanguage: spotifyTrack.explicit || false,
      isInstrumental: spotifyTrack.name.toLowerCase().includes('instrumental'),
      hasLyrics: !spotifyTrack.name.toLowerCase().includes('instrumental')
    }
  };
};

// Generate stream history for the past 30 days
const generateStreamHistory = () => {
  const streamHistory = [];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    streamHistory.push({
      date: date.toISOString(),
      streams: Math.floor(Math.random() * 10000),
      uniqueListeners: Math.floor(Math.random() * 5000)
    });
  }

  return streamHistory;
};

export {
  spotifyApi,
  getValidToken,
  retryOnRateLimit,
  transformSpotifyArtist,
  transformSpotifyTrack,
  transformSpotifyRelease,
  transformSpotifyToSong,
  prisma
};

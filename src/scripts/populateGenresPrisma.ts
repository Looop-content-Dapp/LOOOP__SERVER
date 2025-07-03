import 'dotenv/config';
import {
  spotifyApi,
  getValidToken,
  retryOnRateLimit,

} from './spotify/spotifyPrismaClient.js';
import { prisma } from '@/config/database.js';

// Predefined genres with descriptions and images
const SEED_GENRES = [
  {
    name: 'Afrobeats',
    description: 'Contemporary African popular music blending West African musical styles with jazz, soul, and funk',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop'
  },
  {
    name: 'Pop',
    description: 'Mainstream contemporary popular music characterized by catchy melodies and commercial appeal',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=300&fit=crop'
  },
  {
    name: 'Hip Hop',
    description: 'Urban music characterized by rhythmic vocals, rap, and beats',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
  },
  {
    name: 'Rock',
    description: 'Guitar-driven music spanning from classic to alternative rock',
    image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&h=300&fit=crop'
  },
  {
    name: 'Electronic',
    description: 'Computer-generated music including house, techno, and EDM',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
  },
  {
    name: 'Jazz',
    description: 'American musical style characterized by improvisation and complex harmonies',
    image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=300&fit=crop'
  },
  {
    name: 'Classical',
    description: 'Traditional Western art music with orchestral and chamber compositions',
    image: 'https://images.unsplash.com/photo-1465821185615-20b3c2fbf41b?w=400&h=300&fit=crop'
  },
  {
    name: 'Country',
    description: 'American folk music with rural roots and storytelling traditions',
    image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c9a7?w=400&h=300&fit=crop'
  },
  {
    name: 'R&B',
    description: 'Rhythm and blues music with soulful vocals and groove-based rhythms',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop'
  },
  {
    name: 'Reggae',
    description: 'Jamaican music genre with distinctive rhythm and social consciousness',
    image: 'https://images.unsplash.com/photo-1524230572899-a9b6138c0d0b?w=400&h=300&fit=crop'
  },
  {
    name: 'Blues',
    description: 'African-American musical style expressing sorrow and resilience',
    image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=300&fit=crop'
  },
  {
    name: 'Folk',
    description: 'Traditional music passed down through generations with acoustic instruments',
    image: 'https://images.unsplash.com/photo-1520637736862-4d197d17c9a7?w=400&h=300&fit=crop'
  },
  {
    name: 'Metal',
    description: 'Heavy guitar-based music with intense vocals and powerful rhythms',
    image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&h=300&fit=crop'
  },
  {
    name: 'Punk',
    description: 'Fast, aggressive rock music with anti-establishment themes',
    image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&h=300&fit=crop'
  },
  {
    name: 'Indie',
    description: 'Independent music across genres with artistic freedom and creativity',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=300&fit=crop'
  },
  {
    name: 'Alternative',
    description: 'Non-mainstream music that emerged from independent scenes',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=300&fit=crop'
  },
  {
    name: 'Soul',
    description: 'African-American music combining gospel, R&B, and pop elements',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop'
  },
  {
    name: 'Funk',
    description: 'Groove-based music with syncopated rhythms and danceable beats',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
  },
  {
    name: 'Disco',
    description: 'Dance music with four-on-the-floor beats and orchestral elements',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
  },
  {
    name: 'House',
    description: 'Electronic dance music with four-on-the-floor rhythms',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
  },
  {
    name: 'Techno',
    description: 'Electronic music with repetitive beats and futuristic sounds',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
  },
  {
    name: 'Trance',
    description: 'Electronic music with hypnotic rhythms and buildups',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
  },
  {
    name: 'Ambient',
    description: 'Atmospheric music designed to create mood and environment',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
  },
  {
    name: 'Latin',
    description: 'Music from Latin America including reggaeton, salsa, and bachata',
    image: 'https://images.unsplash.com/photo-1524230572899-a9b6138c0d0b?w=400&h=300&fit=crop'
  },
  {
    name: 'K-Pop',
    description: 'South Korean popular music known for its stylized approach and global appeal',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=300&fit=crop'
  }
];

/**
 * Normalize genre name for consistency
 */
const normalizeGenre = (genre) => {
  if (!genre || typeof genre !== 'string') return '';

  return genre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/[^\w-]/g, '')   // Remove special characters except hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with a single one
    .replace(/^-|-$/g, '');   // Remove leading/trailing hyphens
};

/**
 * Fetch available genre seeds from Spotify
 */
const fetchAvailableGenreSeeds = async () => {
  try {
    const data = await retryOnRateLimit(() =>
      spotifyApi.getAvailableGenreSeeds()
    );

    if (data.body && data.body.genres && Array.isArray(data.body.genres)) {
      return data.body.genres;
    }
  } catch (error) {
    console.warn('Error fetching genre seeds:', error.message);
  }

  return [];
};

/**
 * Create a Genre model since it doesn't exist in Prisma schema
 * We'll create a simple table to store genres
 */
const createGenreTable = async () => {
  try {
    // Check if we can create genres via raw SQL or use a separate approach
    console.log('📁 Setting up genre storage approach...');

    // Since there's no Genre model in Prisma, we'll store genres in the Artist model
    // and create a separate JSON file for genre metadata
    return true;
  } catch (error) {
    console.error('Error setting up genre storage:', error.message);
    return false;
  }
};

/**
 * Collect unique genres from artists
 */
const collectGenresFromArtists = async () => {
  try {
    console.log('🔍 Collecting genres from existing artists...');

    const artists = await prisma.artist.findMany({
      select: {
        genres: true
      },
      where: {
        genres: {
          not: {
            equals: []
          }
        }
      }
    });

    const genreSet = new Set();

    artists.forEach(artist => {
      if (artist.genres && Array.isArray(artist.genres)) {
        artist.genres.forEach(genre => {
          const normalized = normalizeGenre(genre);
          if (normalized) genreSet.add(normalized);
        });
      }
    });

    return Array.from(genreSet);
  } catch (error) {
    console.error('Error collecting genres from artists:', error.message);
    return [];
  }
};

/**
 * Enhance genre list with Spotify data
 */
const enhanceGenreList = async () => {
  try {
    console.log('🎵 Enhancing genre list with Spotify data...');

    // Start with predefined genres
    const allGenres = new Set(SEED_GENRES.map(g => normalizeGenre(g.name)).filter(Boolean));
    console.log(`Starting with ${allGenres.size} predefined genres`);

    // Get token for Spotify API
    await getValidToken();

    // Fetch available genre seeds from Spotify
    try {
      const genreSeeds = await fetchAvailableGenreSeeds();
      if (genreSeeds.length > 0) {
        console.log(`Retrieved ${genreSeeds.length} genre seeds from Spotify`);
        genreSeeds.forEach(genre => {
          const normalizedGenre = normalizeGenre(genre);
          if (normalizedGenre) allGenres.add(normalizedGenre);
        });
      }
    } catch (error) {
      console.warn('Could not fetch available genre seeds:', error.message);
    }

    // Collect genres from existing artists
    const artistGenres = await collectGenresFromArtists();
    artistGenres.forEach(genre => allGenres.add(genre));

    console.log(`Total unique genres collected: ${allGenres.size}`);
    return Array.from(allGenres);

  } catch (error) {
    console.error('Error enhancing genre list:', error.message);
    // Return fallback genres if everything fails
    return SEED_GENRES.map(g => normalizeGenre(g.name)).filter(Boolean);
  }
};

/**
 * Store genres metadata in JSON file since no Genre model exists
 */
const storeGenresMetadata = async (genres) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Create enhanced genre data with metadata
    const genreMetadata = genres.map(genreName => {
      // Find predefined genre data
      const predefinedGenre = SEED_GENRES.find(g =>
        normalizeGenre(g.name) === normalizeGenre(genreName)
      );

      if (predefinedGenre) {
        return predefinedGenre;
      }

      // Create default metadata for new genres
      return {
        name: genreName,
        description: `Music categorized as ${genreName}`,
        image: `https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=300&fit=crop&q=80&auto=format&txt=${encodeURIComponent(genreName)}`
      };
    });

    // Store in a JSON file
    const genresDir = path.join(process.cwd(), 'src', 'data');
    await fs.mkdir(genresDir, { recursive: true });

    const genresFile = path.join(genresDir, 'genres.json');
    await fs.writeFile(genresFile, JSON.stringify(genreMetadata, null, 2));

    console.log(`💾 Stored ${genreMetadata.length} genres metadata to ${genresFile}`);
    return genreMetadata;

  } catch (error) {
    console.error('Error storing genres metadata:', error.message);
    return [];
  }
};

/**
 * Main function to populate genres
 */
const populateGenres = async (options = {}) => {
  const { dryRun = false } = options;

  try {
    console.log('🚀 Starting genre population process...');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

    // Setup genre storage
    await createGenreTable();

    // Enhance genre list
    const genres = await enhanceGenreList();

    if (dryRun) {
      console.log('\n📋 DRY RUN RESULTS:');
      console.log(`Total genres that would be processed: ${genres.length}`);
      console.log('\nSample genres:');
      genres.slice(0, 10).forEach((genre, i) => {
        console.log(`  ${i + 1}. ${genre}`);
      });

      if (genres.length > 10) {
        console.log(`  ... and ${genres.length - 10} more`);
      }

      return { genres, count: genres.length };
    }

    // Store genres metadata
    const genreMetadata = await storeGenresMetadata(genres);

    console.log('\n✅ Genre population completed successfully!');
    console.log(`📊 Total genres processed: ${genres.length}`);
    console.log(`📁 Metadata stored for: ${genreMetadata.length} genres`);

    return {
      genres,
      metadata: genreMetadata,
      count: genres.length
    };

  } catch (error) {
    console.error('❌ Genre population failed:', error.message);
    throw error;
  }
};

/**
 * CLI execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const args = process.argv.slice(2);
      const dryRun = args.includes('--dry-run');
      const showList = args.includes('--show-list');

      console.log('🎵 LOOOP Genre Population Script');
      console.log('=================================\n');

      const startTime = Date.now();
      const result = await populateGenres({ dryRun });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\n⏱️  Completed in ${duration} seconds`);

      if (showList && result.genres) {
        console.log('\n📋 All Genres:');
        result.genres.forEach((genre, i) => {
          console.log(`  ${(i + 1).toString().padStart(3)}. ${genre}`);
        });
      }

      process.exit(0);
    } catch (error) {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    }
  })();
}

export {
  populateGenres,
  normalizeGenre,
  SEED_GENRES
};

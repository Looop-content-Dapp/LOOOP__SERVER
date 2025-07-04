import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  spotifyApi,
  getValidToken,
  retryOnRateLimit,
} from './spotify/spotifyPrismaClient.js';

const prisma = new PrismaClient();

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
  // ... (keep all other genre definitions)
];

/**
 * Normalize genre name for consistency
 */
const normalizeGenre = (genre: string): string => {
  if (!genre || typeof genre !== 'string') return '';

  return genre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/^-|-$/g, '')    // Remove leading/trailing hyphens
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Fetch available genre seeds from Spotify
 */
const fetchAvailableGenreSeeds = async (): Promise<string[]> => {
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
 * Store genres in the database
 */
const storeGenres = async (genres: typeof SEED_GENRES) => {
  try {
    console.log('💾 Storing genres in the database...');

    for (const genre of genres) {
      const normalizedName = normalizeGenre(genre.name);
      if (!normalizedName) continue;

      await prisma.genre.upsert({
        where: { name: normalizedName },
        update: {
          description: genre.description,
          image: genre.image
        },
        create: {
          name: normalizedName,
          description: genre.description,
          image: genre.image
        },
      });
    }

    console.log('✅ Genres stored successfully');
  } catch (error) {
    console.error('Error storing genres:', error);
    throw error;
  }
};

/**
 * Main function to populate genres
 */
const populateGenres = async () => {
  try {
    console.log('🎵 Starting genre population...');

    // Get Spotify token
    await getValidToken();

    // Store predefined genres
    await storeGenres(SEED_GENRES);

    // Fetch and store Spotify genres
    const spotifyGenres = await fetchAvailableGenreSeeds();
    const spotifyGenreObjects = spotifyGenres.map(name => ({
      name,
      description: `Genre from Spotify: ${name}`,
      image: null
    }));
    await storeGenres(spotifyGenreObjects);

    console.log('✨ Genre population completed successfully');
  } catch (error) {
    console.error('Error in genre population:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

// Run the population script
populateGenres();

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  spotifyApi,
  getValidToken,
  retryOnRateLimit,
} from './spotify/spotifyPrismaClient.js';

const prisma = new PrismaClient();

// Predefined genres
export const SEED_GENRES = [
  { name: 'Afrobeats' },
  { name: 'Pop' },
  { name: 'Hip-Hop' },
  { name: 'R&B' },
  { name: 'Dance' },
  { name: 'Electronic' },
  { name: 'Rock' },
  { name: 'Alternative' },
  { name: 'Jazz' },
  { name: 'Classical' },
  { name: 'Country' },
  { name: 'Folk' },
  { name: 'Reggae' },
  { name: 'Latin' },
  { name: 'World' }
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
        update: {},
        create: {
          name: normalizedName
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
export const populateGenres = async (options: { dryRun?: boolean } = {}) => {
  const { dryRun = false } = options;
  try {
    console.log('🎵 Starting genre population...');

    // Get Spotify token
    await getValidToken();

    if (dryRun) {
      const spotifyGenres = await fetchAvailableGenreSeeds();
      console.log('DRY RUN: Would store ' + (SEED_GENRES.length + spotifyGenres.length) + ' genres');
      return { count: SEED_GENRES.length + spotifyGenres.length };
    }

    // Store predefined genres
    await storeGenres(SEED_GENRES);

    // Fetch and store Spotify genres
    const spotifyGenres = await fetchAvailableGenreSeeds();
    const spotifyGenreObjects = spotifyGenres.map(name => ({
      name
    }));
    await storeGenres(spotifyGenreObjects);

    console.log('✨ Genre population completed successfully');
    return { count: SEED_GENRES.length + spotifyGenres.length };
  } catch (error) {
    console.error('Error in genre population:', error);
    if (!dryRun) process.exit(1);
  } finally {
    if (!dryRun) await prisma.$disconnect();
  }
};

// Run the population script
populateGenres();

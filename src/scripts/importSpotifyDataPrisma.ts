import 'dotenv/config';
import {
  spotifyApi,
  getValidToken,
  retryOnRateLimit,
  prisma
} from './spotify/spotifyPrismaClient';
import {
  importArtistsByGenre,
  importArtistByName
} from './importArtistPrisma';
import {
  populateGenres, SEED_GENRES
} from './populateGenresPrisma';


// Configuration for import limits
const IMPORT_CONFIG = {
  maxArtistsPerGenre: 3,
  maxReleases: 3,
  maxTracks: 5,
  genresToProcess: 8, // Limit genres to process
  delayBetweenGenres: 3000, // 3 seconds
  delayBetweenArtists: 2000 // 2 seconds
};

// Track overall progress
const importStats = {
  genresProcessed: 0,
  artistsImported: 0,
  releasesImported: 0,
  tracksImported: 0,
  songsImported: 0,
  errors: [],
  startTime: null,
  endTime: null
};

/**
 * Log progress with timing
 */
const logProgress = (message, type = 'info') => {
  const timestamp = new Date().toISOString().slice(11, 19);
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📊';
  console.log(`[${timestamp}] ${prefix} ${message}`);
};

/**
 * Get database statistics
 */
const getDatabaseStats = async () => {
  try {
    const [userCount, artistCount, releaseCount, trackCount, songCount] = await Promise.all([
      prisma.user.count(),
      prisma.artist.count(),
      prisma.release.count(),
      prisma.track.count(),
      prisma.song.count()
    ]);

    return {
      users: userCount,
      artists: artistCount,
      releases: releaseCount,
      tracks: trackCount,
      songs: songCount
    };
  } catch (error) {
    logProgress(`Error getting database stats: ${error.message}`, 'error');
    return null;
  }
};

/**
 * Import featured/popular artists across genres
 */
interface FeaturedOptions { dryRun?: boolean }
const importFeaturedArtists = async (options: FeaturedOptions = {}) => {
  const { dryRun = false } = options;

  // List of popular artists to ensure we get good data
  const featuredArtists = [
    'Taylor Swift',
    'Drake',
    'The Weeknd',
    'Ariana Grande',
    'Ed Sheeran',
    'Billie Eilish',
    'Dua Lipa',
    'Post Malone',
    'Olivia Rodrigo',
    'Bad Bunny'
  ];

  logProgress(`Importing ${featuredArtists.length} featured artists...`);

  const results = [];

  for (const [index, artistName] of featuredArtists.entries()) {
    try {
      logProgress(`Processing featured artist ${index + 1}/${featuredArtists.length}: ${artistName}`);

      if (dryRun) {
        logProgress(`DRY RUN: Would import ${artistName}`, 'info');
        results.push({ artist: artistName, success: true, dryRun: true });
        continue;
      }

      const result = await importArtistByName(artistName, {
        limitReleases: IMPORT_CONFIG.maxReleases,
        limitTracks: IMPORT_CONFIG.maxTracks,
        dryRun: false
      });

      if (result.imported) {
        importStats.artistsImported++;
        results.push({ artist: result.artist, success: true });
        logProgress(`Successfully imported featured artist: ${artistName}`, 'success');
      }

      // Delay between artists
      if (index < featuredArtists.length - 1) {
        await new Promise(resolve => setTimeout(resolve, IMPORT_CONFIG.delayBetweenArtists));
      }

    } catch (error) {
      logProgress(`Failed to import featured artist ${artistName}: ${error.message}`, 'error');
      importStats.errors.push({ type: 'featured_artist', name: artistName, error: error.message });
      results.push({ artist: artistName, success: false, error: error.message });
    }
  }

  return results;
};

/**
 * Import artists by genres
 */
interface GenreOptions { dryRun?: boolean }
const importArtistsByGenres = async (genresToImport, options: GenreOptions = {}) => {
  const { dryRun = false } = options;

  logProgress(`Importing artists for ${genresToImport.length} genres...`);

  const genreResults = [];

  for (const [index, genre] of genresToImport.entries()) {
    try {
      logProgress(`Processing genre ${index + 1}/${genresToImport.length}: ${genre.name}`);
      importStats.genresProcessed++;

      if (dryRun) {
        logProgress(`DRY RUN: Would import artists for genre ${genre.name}`, 'info');
        genreResults.push({ genre: genre.name, success: true, dryRun: true });
        continue;
      }

      const result = await importArtistsByGenre(genre.name, {
        limitArtists: IMPORT_CONFIG.maxArtistsPerGenre,
        limitReleases: IMPORT_CONFIG.maxReleases,
        limitTracks: IMPORT_CONFIG.maxTracks,
        dryRun: false
      });

      if (result.imported) {
        const successfulImports = result.results.filter(r => r.success).length;
        importStats.artistsImported += successfulImports;

        logProgress(`Successfully imported ${successfulImports} artists for genre: ${genre.name}`, 'success');
        genreResults.push({ genre: genre.name, success: true, artistCount: successfulImports });
      }

      // Delay between genres
      if (index < genresToImport.length - 1) {
        await new Promise(resolve => setTimeout(resolve, IMPORT_CONFIG.delayBetweenGenres));
      }

    } catch (error) {
      logProgress(`Failed to import artists for genre ${genre.name}: ${error.message}`, 'error');
      importStats.errors.push({ type: 'genre', name: genre.name, error: error.message });
      genreResults.push({ genre: genre.name, success: false, error: error.message });
    }
  }

  return genreResults;
};

/**
 * Update song URLs with sample data
 */
const updateSongUrls = async () => {
  const sampleUrls = [
    'https://cdn.trendybeatz.com/audio/Zlatan-Ft-Fola-Get-Better-1-(TrendyBeatz.com).mp3',
    'https://cdn.trendybeatz.com/audio/Blaqbonez-Ft-Young-Jonn-and-Phyno-W-For-Wetego-(TrendyBeatz.com).mp3',
    'https://cdn.trendybeatz.com/audio/Teni-Money-(TrendyBeatz.com).mp3',
    'https://cdn.trendybeatz.com/audio/Shallipopi-Laho-(TrendyBeatz.com).mp3',
    'https://cdn.trendybeatz.com/audio/Davido-Be-There-Still-(TrendyBeatz.com).mp3',
    'https://cdn.trendybeatz.com/audio/Ruger-Jay-Jay-(TrendyBeatz.com).mp3',
    'https://cdn.trendybeatz.com/audio/Ayra-Starr-All-The-Love-(TrendyBeatz.com).mp3',
    'https://cdn.trendybeatz.com/audio/Rema-Smooth-Criminal-(TrendyBeatz.com).mp3'
  ];

  try {
    logProgress('Updating song URLs with sample audio files...');

    const songs = await prisma.song.findMany({
      where: {
        fileUrl: 'placeholder_url'
      }
    });

    logProgress(`Found ${songs.length} songs with placeholder URLs`);

    let updatedCount = 0;
    for (const song of songs) {
      const randomUrl = sampleUrls[Math.floor(Math.random() * sampleUrls.length)];

      await prisma.song.update({
        where: { id: song.id },
        data: {
          fileUrl: randomUrl,
          format: 'mp3',
          bitrate: 320
        }
      });

      updatedCount++;
    }

    logProgress(`Updated ${updatedCount} song URLs`, 'success');
    return updatedCount;

  } catch (error) {
    logProgress(`Error updating song URLs: ${error.message}`, 'error');
    return 0;
  }
};

/**
 * Main import function
 */
interface ImportOptions {
  dryRun?: boolean;
  includeGenres?: boolean;
  includeFeatured?: boolean;
  genreLimit?: number;
}
const importSpotifyData = async (options: ImportOptions = {}) => {
  const {
    dryRun = false,
    includeGenres = true,
    includeFeatured = true,
    genreLimit = IMPORT_CONFIG.genresToProcess
  } = options;

  importStats.startTime = new Date();

  try {
    logProgress('🚀 Starting comprehensive Spotify data import...');
    logProgress(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

    // Get initial database stats
    const initialStats = await getDatabaseStats();
    if (initialStats) {
      logProgress(`Initial DB stats - Artists: ${initialStats.artists}, Tracks: ${initialStats.tracks}, Songs: ${initialStats.songs}`);
    }

    // Step 1: Populate genres
    let genreResults = null;
    if (includeGenres) {
      logProgress('\n📁 Step 1: Populating genres...');
      genreResults = await populateGenres({ dryRun });
      logProgress(`Genres processed: ${genreResults.count}`, 'success');
    }

    // Step 2: Import featured artists
    let featuredResults = [];
    if (includeFeatured) {
      logProgress('\n🌟 Step 2: Importing featured artists...');
      featuredResults = await importFeaturedArtists({ dryRun });
      logProgress(`Featured artists processed: ${featuredResults.length}`, 'success');
    }

    // Step 3: Import artists by genres
    let genreArtistResults = [];
    if (includeGenres) {
      logProgress('\n🎵 Step 3: Importing artists by genres...');

      // Select genres to process (limit for performance)
      const genresToImport = SEED_GENRES.slice(0, genreLimit);
      genreArtistResults = await importArtistsByGenres(genresToImport, { dryRun });
      logProgress(`Genre-based imports completed: ${genreArtistResults.length} genres processed`, 'success');
    }

    // Step 4: Update song URLs (only in live mode)
    let urlUpdateCount = 0;
    if (!dryRun) {
      logProgress('\n🔗 Step 4: Updating song URLs...');
      urlUpdateCount = await updateSongUrls();
    }

    // Final statistics
    importStats.endTime = new Date();
    const duration = ((importStats.endTime - importStats.startTime) / 1000).toFixed(2);

    // Get final database stats
    const finalStats = await getDatabaseStats();

    logProgress('\n✅ Import completed successfully!');
    logProgress(`⏱️  Total duration: ${duration} seconds`);

    if (finalStats && initialStats) {
      const artistsAdded = finalStats.artists - initialStats.artists;
      const tracksAdded = finalStats.tracks - initialStats.tracks;
      const songsAdded = finalStats.songs - initialStats.songs;

      logProgress(`📊 Database changes:`);
      logProgress(`  Artists: ${initialStats.artists} → ${finalStats.artists} (+${artistsAdded})`);
      logProgress(`  Tracks: ${initialStats.tracks} → ${finalStats.tracks} (+${tracksAdded})`);
      logProgress(`  Songs: ${initialStats.songs} → ${finalStats.songs} (+${songsAdded})`);
    }

    if (urlUpdateCount > 0) {
      logProgress(`  Song URLs updated: ${urlUpdateCount}`);
    }

    if (importStats.errors.length > 0) {
      logProgress(`⚠️  Errors encountered: ${importStats.errors.length}`);
      importStats.errors.slice(0, 5).forEach(error => {
        logProgress(`  - ${error.type}: ${error.name} - ${error.error}`, 'error');
      });
      if (importStats.errors.length > 5) {
        logProgress(`  ... and ${importStats.errors.length - 5} more errors`);
      }
    }

    return {
      success: true,
      duration: parseFloat(duration),
      stats: {
        genres: genreResults?.count || 0,
        featuredArtists: featuredResults.length,
        genreArtists: genreArtistResults.length,
        errors: importStats.errors.length,
        urlUpdates: urlUpdateCount
      },
      databaseStats: finalStats,
      errors: importStats.errors
    };

  } catch (error) {
    importStats.endTime = new Date();
    logProgress(`Fatal error during import: ${error.message}`, 'error');

    return {
      success: false,
      error: error.message,
      stats: importStats,
      errors: importStats.errors
    };
  }
};

/**
 * CLI execution
 */
if (require.main === module) {
  (async () => {
    try {
      const args = process.argv.slice(2);
      const dryRun = args.includes('--dry-run');
      const skipGenres = args.includes('--skip-genres');
      const skipFeatured = args.includes('--skip-featured');
      const genreLimit = parseInt(args.find(arg => arg.startsWith('--genre-limit='))?.split('=')[1]) || IMPORT_CONFIG.genresToProcess;

      console.log('🎵 LOOOP Comprehensive Spotify Import');
      console.log('=====================================\n');

      const options = {
        dryRun,
        includeGenres: !skipGenres,
        includeFeatured: !skipFeatured,
        genreLimit
      };

      logProgress(`Configuration:`);
      logProgress(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
      logProgress(`  Include genres: ${options.includeGenres}`);
      logProgress(`  Include featured: ${options.includeFeatured}`);
      logProgress(`  Genre limit: ${options.genreLimit}`);
      logProgress(`  Max artists per genre: ${IMPORT_CONFIG.maxArtistsPerGenre}`);
      logProgress(`  Max releases per artist: ${IMPORT_CONFIG.maxReleases}`);
      logProgress(`  Max tracks per release: ${IMPORT_CONFIG.maxTracks}\n`);

      const result = await importSpotifyData(options);

      if (result.success) {
        console.log('\n🎉 Import completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Import failed!');
        process.exit(1);
      }

    } catch (error) {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}

export {
  importSpotifyData,
  updateSongUrls,
  importFeaturedArtists,
  importArtistsByGenres,
  IMPORT_CONFIG
};

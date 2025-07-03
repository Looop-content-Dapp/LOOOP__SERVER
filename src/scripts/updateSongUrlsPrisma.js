import 'dotenv/config';
import { prisma } from './spotify/spotifyPrismaClient.js';

// Sample audio URLs for testing
const sampleAudioUrls = [
  // High quality sample tracks
  'https://cdn.trendybeatz.com/audio/Zlatan-Ft-Fola-Get-Better-1-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Blaqbonez-Ft-Young-Jonn-and-Phyno-W-For-Wetego-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Teni-Money-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Shallipopi-Laho-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Shoday-Ft-Olivetheboy-Screaming-Beauty-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/TI-Blaze-Ft-AratheJay-Mario-Remix-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/TI-Blaze-Jericho-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/TI-Blaze-My-Brother-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Solidstar-Hold-Me-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Solidstar-Shut-Down-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Solidstar-Mikasa-Sukasa-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Davido-Be-There-Still-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Davido-So-Crazy-ft-Lil-Baby-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Davido-Something-Fishy-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Davido-For-The-Road-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/OdumoduBlvck-Ft-Victony-Pity-This-Boy-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Ruger-Jay-Jay-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Ayra-Starr-All-The-Love-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Rema-Smooth-Criminal-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Rema-DND-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Rema-Baby-Is-It-A-Crime-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Olamide-Ft-Asake-New-Religion-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Olamide-Ft-Rema-Mukulu-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Olamide-No-Worries-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Blaqbonez-Like-Ice-Spice-(TrendyBeatz.com).mp3',
  'https://cdn.trendybeatz.com/audio/Davido-Ft-Odumodublvck-and-Chike-Funds-(TrendyBeatz.com).mp3'
];

/**
 * Log with timestamp
 */
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString().slice(11, 19);
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📊';
  console.log(`[${timestamp}] ${prefix} ${message}`);
};

/**
 * Get random audio URL
 */
const getRandomAudioUrl = () => {
  return sampleAudioUrls[Math.floor(Math.random() * sampleAudioUrls.length)];
};

/**
 * Update song URLs with better audio metadata
 */
const updateSongUrls = async (options = {}) => {
  const {
    batchSize = 50,
    updateAll = false,
    dryRun = false
  } = options;

  try {
    log('🔍 Analyzing song database...');

    // Get statistics
    const totalSongs = await prisma.song.count();
    const placeholderSongs = await prisma.song.count({
      where: {
        fileUrl: 'placeholder_url'
      }
    });

    log(`Total songs in database: ${totalSongs}`);
    log(`Songs with placeholder URLs: ${placeholderSongs}`);

    if (placeholderSongs === 0 && !updateAll) {
      log('No songs with placeholder URLs found. Use --update-all to update all songs.', 'info');
      return { updated: 0, total: totalSongs };
    }

    // Determine which songs to update
    const whereClause = updateAll ? {} : { fileUrl: 'placeholder_url' };
    
    const songsToUpdate = await prisma.song.findMany({
      where: whereClause,
      select: {
        id: true,
        fileUrl: true,
        duration: true,
        format: true,
        bitrate: true
      },
      take: batchSize
    });

    log(`Found ${songsToUpdate.length} songs to update`);

    if (dryRun) {
      log('DRY RUN - Would update the following songs:');
      songsToUpdate.slice(0, 10).forEach((song, index) => {
        log(`  ${index + 1}. ID: ${song.id}, Current URL: ${song.fileUrl}`);
      });
      if (songsToUpdate.length > 10) {
        log(`  ... and ${songsToUpdate.length - 10} more songs`);
      }
      return { dryRun: true, total: songsToUpdate.length };
    }

    log('🔄 Starting song URL updates...');

    let updatedCount = 0;
    let errorCount = 0;

    // Process songs in batches
    for (let i = 0; i < songsToUpdate.length; i += 10) {
      const batch = songsToUpdate.slice(i, i + 10);
      
      log(`Processing batch ${Math.floor(i / 10) + 1}/${Math.ceil(songsToUpdate.length / 10)} (${batch.length} songs)`);

      // Update each song in the batch
      const updatePromises = batch.map(async (song) => {
        try {
          const newUrl = getRandomAudioUrl();
          
          // Enhanced metadata based on URL
          const metadata = {
            fileUrl: newUrl,
            format: 'mp3',
            bitrate: 320,
            // Keep existing duration or set default
            duration: song.duration || 180,
            // Update flags if needed
            flags: {
              isExplicit: false,
              containsExplicitLanguage: false,
              isInstrumental: false,
              hasLyrics: true
            }
          };

          await prisma.song.update({
            where: { id: song.id },
            data: metadata
          });

          return { success: true, id: song.id };
        } catch (error) {
          return { success: false, id: song.id, error: error.message };
        }
      });

      // Wait for batch to complete
      const results = await Promise.all(updatePromises);
      
      // Count results
      const batchSuccesses = results.filter(r => r.success).length;
      const batchErrors = results.filter(r => !r.success).length;
      
      updatedCount += batchSuccesses;
      errorCount += batchErrors;

      // Log any errors
      results.filter(r => !r.success).forEach(result => {
        log(`Error updating song ${result.id}: ${result.error}`, 'error');
      });

      // Small delay between batches
      if (i + 10 < songsToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    log(`✅ Update completed!`);
    log(`Successfully updated: ${updatedCount} songs`);
    if (errorCount > 0) {
      log(`Errors encountered: ${errorCount} songs`, 'error');
    }

    return {
      success: true,
      updated: updatedCount,
      errors: errorCount,
      total: songsToUpdate.length
    };

  } catch (error) {
    log(`Fatal error during URL update: ${error.message}`, 'error');
    throw error;
  }
};

/**
 * Update track URLs to match song URLs
 */
const syncTrackUrls = async (options = {}) => {
  const { dryRun = false } = options;

  try {
    log('🔗 Syncing track URLs with song URLs...');

    // Find tracks that have associated songs
    const tracksWithSongs = await prisma.track.findMany({
      where: {
        songId: {
          not: null
        }
      },
      select: {
        id: true,
        fileUrl: true,
        song: {
          select: {
            id: true,
            fileUrl: true
          }
        }
      }
    });

    log(`Found ${tracksWithSongs.length} tracks with associated songs`);

    if (dryRun) {
      const needsUpdate = tracksWithSongs.filter(track => 
        track.fileUrl !== track.song?.fileUrl
      );
      log(`DRY RUN - ${needsUpdate.length} tracks would be updated`);
      return { dryRun: true, total: needsUpdate.length };
    }

    let updatedCount = 0;

    for (const track of tracksWithSongs) {
      if (track.song && track.fileUrl !== track.song.fileUrl) {
        try {
          await prisma.track.update({
            where: { id: track.id },
            data: {
              fileUrl: track.song.fileUrl
            }
          });
          updatedCount++;
        } catch (error) {
          log(`Error syncing track ${track.id}: ${error.message}`, 'error');
        }
      }
    }

    log(`Synced ${updatedCount} track URLs`, 'success');
    return { updated: updatedCount };

  } catch (error) {
    log(`Error syncing track URLs: ${error.message}`, 'error');
    throw error;
  }
};

/**
 * Main execution function
 */
const main = async (options = {}) => {
  const {
    dryRun = false,
    updateAll = false,
    syncTracks = true,
    batchSize = 50
  } = options;

  try {
    log('🎵 Starting song URL update process...');
    log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

    // Step 1: Update song URLs
    log('\n📀 Step 1: Updating song URLs...');
    const songResults = await updateSongUrls({
      batchSize,
      updateAll,
      dryRun
    });

    // Step 2: Sync track URLs (if not dry run)
    let trackResults = null;
    if (syncTracks && !dryRun) {
      log('\n🔗 Step 2: Syncing track URLs...');
      trackResults = await syncTrackUrls({ dryRun });
    }

    log('\n✅ URL update process completed!');
    
    const summary = {
      success: true,
      songs: songResults,
      tracks: trackResults
    };

    if (!dryRun) {
      log(`📊 Summary:`);
      log(`  Songs updated: ${songResults.updated || 0}`);
      if (trackResults) {
        log(`  Tracks synced: ${trackResults.updated || 0}`);
      }
      if (songResults.errors > 0) {
        log(`  Errors: ${songResults.errors}`, 'error');
      }
    }

    return summary;

  } catch (error) {
    log(`Process failed: ${error.message}`, 'error');
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
      const updateAll = args.includes('--update-all');
      const noSync = args.includes('--no-sync');
      const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 50;

      console.log('🎵 LOOOP Song URL Updater');
      console.log('========================\n');

      const options = {
        dryRun,
        updateAll,
        syncTracks: !noSync,
        batchSize
      };

      log(`Configuration:`);
      log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
      log(`  Update all songs: ${updateAll}`);
      log(`  Sync track URLs: ${options.syncTracks}`);
      log(`  Batch size: ${batchSize}\n`);

      const result = await main(options);

      if (result.success) {
        console.log('\n🎉 Update completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Update failed!');
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
  updateSongUrls,
  syncTrackUrls,
  main as updateSongUrlsMain
};

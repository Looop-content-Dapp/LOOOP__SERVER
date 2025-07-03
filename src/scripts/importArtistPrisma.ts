import 'dotenv/config';
import { 
  spotifyApi, 
  getValidToken, 
  retryOnRateLimit,
  transformSpotifyArtist,
  transformSpotifyTrack,
  transformSpotifyRelease,
  transformSpotifyToSong,
  prisma 
} from './spotify/spotifyPrismaClient.js';

// Cache to avoid duplicate processing
const processedCache = {
  artists: new Set(),
  releases: new Set(),
  tracks: new Set(),
  songs: new Set()
};

/**
 * Create or find user for the artist
 */
const createArtistUser = async (spotifyArtist) => {
  const email = `artist_${spotifyArtist.id}_${Date.now()}@spotify-import.com`;
  const username = `artist_${spotifyArtist.id}`;
  
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      console.log(`User already exists for artist: ${spotifyArtist.name}`);
      return existingUser;
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        name: spotifyArtist.name,
        email,
        password: `spotify_${spotifyArtist.id}_${Date.now()}`, // Placeholder password
        username,
        bio: `Spotify artist: ${spotifyArtist.name}`,
        isVerified: true,
        country: 'US' // Default
      }
    });

    console.log(`✅ Created user for artist: ${spotifyArtist.name}`);
    return user;

  } catch (error) {
    console.error(`❌ Failed to create user for artist ${spotifyArtist.name}:`, error.message);
    throw error;
  }
};

/**
 * Import or update artist
 */
const importArtist = async (spotifyArtist) => {
  try {
    // Check if artist already exists
    const existingArtist = await prisma.artist.findFirst({
      where: {
        artistId: spotifyArtist.id
      },
      include: {
        user: true
      }
    });

    if (existingArtist) {
      console.log(`Artist already exists: ${spotifyArtist.name}`);
      processedCache.artists.add(spotifyArtist.id);
      return existingArtist;
    }

    // Create user for the artist
    const user = await createArtistUser(spotifyArtist);

    // Transform and create artist
    const artistData = transformSpotifyArtist(spotifyArtist, user);
    
    const artist = await prisma.artist.create({
      data: artistData,
      include: {
        user: true
      }
    });

    console.log(`✅ Imported artist: ${artist.name}`);
    processedCache.artists.add(spotifyArtist.id);
    return artist;

  } catch (error) {
    console.error(`❌ Failed to import artist ${spotifyArtist.name}:`, error.message);
    throw error;
  }
};

/**
 * Import song from Spotify track
 */
const importSong = async (spotifyTrack) => {
  try {
    const songKey = spotifyTrack.id;
    
    if (processedCache.songs.has(songKey)) {
      const existingSong = await prisma.song.findFirst({
        where: {
          isrc: spotifyTrack.external_ids?.isrc || null
        }
      });
      if (existingSong) return existingSong;
    }

    // Check if song already exists by ISRC or Spotify ID
    const existingSong = await prisma.song.findFirst({
      where: {
        OR: [
          { isrc: spotifyTrack.external_ids?.isrc || null },
          { 
            AND: [
              { fileUrl: spotifyTrack.preview_url || 'placeholder_url' },
              { duration: Math.floor((spotifyTrack.duration_ms || 0) / 1000) }
            ]
          }
        ]
      }
    });

    if (existingSong) {
      console.log(`Song already exists: ${spotifyTrack.name}`);
      processedCache.songs.add(songKey);
      return existingSong;
    }

    // Create new song
    const songData = transformSpotifyToSong(spotifyTrack);
    const song = await prisma.song.create({
      data: songData
    });

    console.log(`✅ Imported song: ${spotifyTrack.name}`);
    processedCache.songs.add(songKey);
    return song;

  } catch (error) {
    console.error(`❌ Failed to import song ${spotifyTrack.name}:`, error.message);
    throw error;
  }
};

/**
 * Import release (album/EP/single)
 */
const importRelease = async (spotifyAlbum, artist) => {
  try {
    const releaseKey = `${artist.id}_${spotifyAlbum.id}`;
    
    if (processedCache.releases.has(releaseKey)) {
      const existingRelease = await prisma.release.findFirst({
        where: {
          artistId: artist.id,
          metadata: {
            path: ['spotifyId'],
            equals: spotifyAlbum.id
          }
        }
      });
      if (existingRelease) return existingRelease;
    }

    // Check if release already exists
    const existingRelease = await prisma.release.findFirst({
      where: {
        artistId: artist.id,
        metadata: {
          path: ['spotifyId'],
          equals: spotifyAlbum.id
        }
      }
    });

    if (existingRelease) {
      console.log(`Release already exists: ${spotifyAlbum.name}`);
      processedCache.releases.add(releaseKey);
      return existingRelease;
    }

    // Create new release
    const releaseData = transformSpotifyRelease(spotifyAlbum, artist.id);
    const release = await prisma.release.create({
      data: releaseData
    });

    console.log(`✅ Imported release: ${release.title}`);
    processedCache.releases.add(releaseKey);
    return release;

  } catch (error) {
    console.error(`❌ Failed to import release ${spotifyAlbum.name}:`, error.message);
    throw error;
  }
};

/**
 * Import track
 */
const importTrack = async (spotifyTrack, artist, song, release = null) => {
  try {
    const trackKey = `${artist.id}_${spotifyTrack.id}`;
    
    if (processedCache.tracks.has(trackKey)) {
      console.log(`Track already processed: ${spotifyTrack.name}`);
      return null;
    }

    // Check if track already exists
    const existingTrack = await prisma.track.findFirst({
      where: {
        artistId: artist.id,
        songId: song.id,
        metadata: {
          path: ['spotifyId'],
          equals: spotifyTrack.id
        }
      }
    });

    if (existingTrack) {
      console.log(`Track already exists: ${spotifyTrack.name}`);
      processedCache.tracks.add(trackKey);
      return existingTrack;
    }

    // Create new track
    const trackData = transformSpotifyTrack(
      spotifyTrack, 
      artist.id, 
      artist.userId, 
      song.id, 
      release?.id || null
    );
    
    const track = await prisma.track.create({
      data: trackData
    });

    console.log(`✅ Imported track: ${track.title}`);
    processedCache.tracks.add(trackKey);
    return track;

  } catch (error) {
    console.error(`❌ Failed to import track ${spotifyTrack.name}:`, error.message);
    throw error;
  }
};

/**
 * Import artist's releases and tracks
 */
const importArtistReleases = async (artist, spotifyArtistId, options = {}) => {
  const { limitReleases = 10, limitTracks = 7 } = options;
  
  try {
    await getValidToken();
    console.log(`🔍 Fetching releases for artist: ${artist.name}`);

    // Get artist's albums
    const albumsResponse = await retryOnRateLimit(() => 
      spotifyApi.getArtistAlbums(spotifyArtistId, {
        limit: limitReleases,
        include_groups: 'album,single,ep'
      })
    );

    const albums = albumsResponse.body.items;
    console.log(`Found ${albums.length} releases for ${artist.name}`);

    // Process each album
    for (const album of albums) {
      try {
        console.log(`\n📀 Processing release: ${album.name} (${album.album_type})`);

        // Import the release
        const release = await importRelease(album, artist);

        // Get tracks for this album
        const tracksResponse = await retryOnRateLimit(() => 
          spotifyApi.getAlbumTracks(album.id, { limit: limitTracks })
        );
        
        const tracks = tracksResponse.body.items;
        console.log(`  Found ${tracks.length} tracks`);

        // Process each track
        for (const track of tracks) {
          try {
            // Import song first
            const song = await importSong(track);
            
            // Import track
            await importTrack(track, artist, song, release);
            
            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (trackError) {
            console.error(`  ❌ Error importing track ${track.name}:`, trackError.message);
          }
        }

        // Delay between albums
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (albumError) {
        console.error(`❌ Error importing release ${album.name}:`, albumError.message);
      }
    }

    console.log(`✅ Completed importing releases for: ${artist.name}`);

  } catch (error) {
    console.error(`❌ Failed to import releases for artist ${spotifyArtistId}:`, error.message);
    throw error;
  }
};

/**
 * Search and import artist by name
 */
const importArtistByName = async (artistName, options = {}) => {
  const { 
    limitReleases = 5, 
    limitTracks = 7,
    dryRun = false 
  } = options;

  try {
    console.log(`🎵 Searching for artist: "${artistName}"`);
    
    await getValidToken();

    // Search for artist on Spotify
    const searchResponse = await retryOnRateLimit(() =>
      spotifyApi.searchArtists(artistName, { limit: 1 })
    );

    if (!searchResponse.body.artists.items.length) {
      throw new Error(`Artist "${artistName}" not found on Spotify`);
    }

    const spotifyArtist = searchResponse.body.artists.items[0];
    console.log(`✅ Found artist: ${spotifyArtist.name} (${spotifyArtist.followers?.total || 0} followers)`);

    if (dryRun) {
      console.log('\n📋 DRY RUN - Would import:');
      console.log(`  Artist: ${spotifyArtist.name}`);
      console.log(`  Genres: ${spotifyArtist.genres?.join(', ') || 'Unknown'}`);
      console.log(`  Popularity: ${spotifyArtist.popularity || 0}`);
      return { artist: spotifyArtist, imported: false };
    }

    // Import the artist
    const artist = await importArtist(spotifyArtist);

    // Import artist's releases and tracks
    await importArtistReleases(artist, spotifyArtist.id, {
      limitReleases,
      limitTracks
    });

    console.log('\n✅ Artist import completed successfully!');
    console.log(`📊 Import Summary:`);
    console.log(`  Artists processed: ${processedCache.artists.size}`);
    console.log(`  Releases processed: ${processedCache.releases.size}`);
    console.log(`  Songs processed: ${processedCache.songs.size}`);
    console.log(`  Tracks processed: ${processedCache.tracks.size}`);

    return { artist, imported: true };

  } catch (error) {
    console.error(`❌ Failed to import artist "${artistName}":`, error.message);
    throw error;
  }
};

/**
 * Import multiple artists by genre
 */
const importArtistsByGenre = async (genreName, options = {}) => {
  const {
    limitArtists = 5,
    limitReleases = 3,
    limitTracks = 5,
    dryRun = false
  } = options;

  try {
    console.log(`🎵 Searching for ${genreName} artists on Spotify...`);
    
    await getValidToken();

    // Search for artists by genre
    const searchResponse = await retryOnRateLimit(() =>
      spotifyApi.searchArtists(`genre:"${genreName}"`, { limit: limitArtists })
    );

    const artists = searchResponse.body.artists.items;
    console.log(`Found ${artists.length} ${genreName} artists`);

    if (dryRun) {
      console.log('\n📋 DRY RUN - Would import:');
      artists.forEach((artist, i) => {
        console.log(`  ${i + 1}. ${artist.name} (${artist.followers?.total || 0} followers)`);
      });
      return { artists, imported: false };
    }

    const results = [];

    // Process each artist
    for (const [index, spotifyArtist] of artists.entries()) {
      try {
        console.log(`\n🎤 Processing artist ${index + 1}/${artists.length}: ${spotifyArtist.name}`);

        // Import the artist
        const artist = await importArtist(spotifyArtist);

        // Import artist's releases and tracks
        await importArtistReleases(artist, spotifyArtist.id, {
          limitReleases,
          limitTracks
        });

        results.push({ artist, success: true });

        // Delay between artists
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Failed to import artist ${spotifyArtist.name}:`, error.message);
        results.push({ artist: spotifyArtist, success: false, error: error.message });
      }
    }

    console.log(`\n✅ Genre import completed for: ${genreName}`);
    console.log(`📊 Import Summary:`);
    console.log(`  Artists processed: ${processedCache.artists.size}`);
    console.log(`  Releases processed: ${processedCache.releases.size}`);
    console.log(`  Songs processed: ${processedCache.songs.size}`);
    console.log(`  Tracks processed: ${processedCache.tracks.size}`);

    return { results, imported: true };

  } catch (error) {
    console.error(`❌ Failed to import ${genreName} artists:`, error.message);
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
      const genreMode = args.includes('--genre');
      
      let searchTerm;
      let options = { dryRun };

      // Parse arguments
      if (genreMode) {
        const genreIndex = args.indexOf('--genre');
        searchTerm = args[genreIndex + 1];
        if (!searchTerm) {
          console.error('❌ Please provide a genre name after --genre');
          process.exit(1);
        }
        options.limitArtists = 3;
        options.limitReleases = 3;
        options.limitTracks = 5;
      } else {
        searchTerm = args.find(arg => !arg.startsWith('--'));
        if (!searchTerm) {
          console.error('❌ Please provide an artist name or use --genre [genre name]');
          console.log('\nUsage:');
          console.log('  node importArtistPrisma.js "Artist Name"');
          console.log('  node importArtistPrisma.js --genre "Pop"');
          console.log('  node importArtistPrisma.js "Artist Name" --dry-run');
          process.exit(1);
        }
        options.limitReleases = 5;
        options.limitTracks = 7;
      }

      console.log('🎵 LOOOP Artist Import Script');
      console.log('============================\n');
      console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
      console.log(`Search: ${genreMode ? 'Genre' : 'Artist'} - "${searchTerm}"\n`);

      const startTime = Date.now();
      
      let result;
      if (genreMode) {
        result = await importArtistsByGenre(searchTerm, options);
      } else {
        result = await importArtistByName(searchTerm, options);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n⏱️  Completed in ${duration} seconds`);

      process.exit(0);
    } catch (error) {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}

export { 
  importArtistByName,
  importArtistsByGenre,
  importArtist,
  importSong,
  importTrack,
  importRelease
};

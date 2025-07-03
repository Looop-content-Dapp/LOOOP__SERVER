# LOOOP Spotify Import Scripts (Prisma Edition)

This directory contains updated Spotify import scripts that work with Prisma ORM instead of Mongoose. These scripts allow you to import artists, releases, tracks, and songs from Spotify into your PostgreSQL database.

## 🚀 Quick Start

### Prerequisites

1. **Environment Variables**: Ensure your `.env` file contains:
   ```env
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   DATABASE_URL=your_postgresql_connection_string
   ```

2. **Database Setup**: Make sure your PostgreSQL database is running and Prisma is configured.

3. **Dependencies**: Install required packages:
   ```bash
   npm install @prisma/client spotify-web-api-node dotenv
   ```

## 📁 Script Overview

### Core Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `spotifyPrismaClient.js` | Spotify API client with Prisma integration | Import for other scripts |
| `populateGenresPrisma.js` | Populates genre metadata | `node populateGenresPrisma.js` |
| `importArtistPrisma.js` | Import individual artists or by genre | `node importArtistPrisma.js "Artist Name"` |
| `importSpotifyDataPrisma.js` | Comprehensive import of multiple artists | `node importSpotifyDataPrisma.js` |
| `updateSongUrlsPrisma.js` | Update song URLs with sample audio | `node updateSongUrlsPrisma.js` |

## 🎵 Usage Examples

### 1. Import a Single Artist

```bash
# Import Taylor Swift and her releases/tracks
node src/scripts/importArtistPrisma.js "Taylor Swift"

# Dry run to see what would be imported
node src/scripts/importArtistPrisma.js "Drake" --dry-run
```

### 2. Import Artists by Genre

```bash
# Import 3 Pop artists with their releases
node src/scripts/importArtistPrisma.js --genre "Pop"

# Import Hip Hop artists (dry run)
node src/scripts/importArtistPrisma.js --genre "Hip Hop" --dry-run
```

### 3. Comprehensive Data Import

```bash
# Import featured artists and genre-based artists
node src/scripts/importSpotifyDataPrisma.js

# Dry run to see what would be imported
node src/scripts/importSpotifyDataPrisma.js --dry-run

# Skip featured artists, only import by genres
node src/scripts/importSpotifyDataPrisma.js --skip-featured

# Limit to 5 genres
node src/scripts/importSpotifyDataPrisma.js --genre-limit=5
```

### 4. Populate Genres

```bash
# Populate genre metadata
node src/scripts/populateGenresPrisma.js

# See what genres would be created
node src/scripts/populateGenresPrisma.js --dry-run --show-list
```

### 5. Update Song URLs

```bash
# Update placeholder song URLs with sample audio
node src/scripts/updateSongUrlsPrisma.js

# Update all songs (not just placeholders)
node src/scripts/updateSongUrlsPrisma.js --update-all

# See what would be updated
node src/scripts/updateSongUrlsPrisma.js --dry-run
```

## ⚙️ Configuration

### Import Limits

The scripts include sensible defaults to avoid rate limiting:

```javascript
const IMPORT_CONFIG = {
  maxArtistsPerGenre: 3,    // Artists per genre
  maxReleases: 3,           // Releases per artist  
  maxTracks: 5,             // Tracks per release
  genresToProcess: 8,       // Total genres to process
  delayBetweenGenres: 3000, // 3 seconds
  delayBetweenArtists: 2000 // 2 seconds
};
```

### Customizing Limits

You can adjust these in the individual scripts or pass parameters:

```bash
# Limit to 5 genres in comprehensive import
node src/scripts/importSpotifyDataPrisma.js --genre-limit=5
```

## 🔄 Data Flow

### How the Import Works

1. **User Creation**: Each artist gets a corresponding User record
2. **Artist Creation**: Artist profile with Spotify metadata
3. **Release Import**: Albums, EPs, singles from the artist
4. **Song Creation**: Audio file records with metadata
5. **Track Creation**: Links songs to releases and artists

### Database Relationships

```
User (1) ←→ (1) Artist
Artist (1) ←→ (many) Release
Release (1) ←→ (many) Track
Song (1) ←→ (many) Track
```

## 🎯 Features

### ✅ What the Scripts Do

- **Rate Limiting**: Automatic handling of Spotify API rate limits
- **Duplicate Prevention**: Checks for existing records before creating
- **Error Handling**: Graceful error handling with detailed logging
- **Dry Run Mode**: Preview what would be imported without making changes
- **Progress Tracking**: Real-time progress updates with timestamps
- **Flexible Configuration**: Customizable import limits and options
- **Genre Management**: Enhanced genre handling with metadata
- **Audio URLs**: Updates placeholder URLs with working sample audio

### 🛡️ Error Handling

- Automatic retry on rate limits (429 errors)
- Token refresh on expiration (401 errors)
- Detailed error logging with context
- Graceful failure handling per item
- Summary statistics including error counts

## 📊 Database Impact

### Expected Records

For a typical run with default settings:

- **Featured Artists**: ~10 popular artists
- **Genre Artists**: ~24 artists (3 per genre × 8 genres)
- **Releases**: ~102 releases (3 per artist × 34 artists)
- **Tracks**: ~510 tracks (5 per release × 102 releases)
- **Songs**: ~510 songs (1 per track)
- **Users**: ~34 users (1 per artist)

### Storage Considerations

- Each artist: ~2KB metadata
- Each release: ~3KB metadata  
- Each track: ~4KB metadata
- Each song: ~5KB metadata

Total estimated storage: ~7MB for a full import

## 🔧 Troubleshooting

### Common Issues

1. **Spotify API Rate Limits**
   ```
   Rate limit hit, retrying after X seconds...
   ```
   *Solution*: Scripts automatically handle this with exponential backoff.

2. **Database Connection Issues**
   ```
   Error: Can't reach database server
   ```
   *Solution*: Check your `DATABASE_URL` and ensure PostgreSQL is running.

3. **Missing Environment Variables**
   ```
   Missing Spotify API credentials
   ```
   *Solution*: Verify `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`.

4. **Duplicate Key Errors**
   ```
   Unique constraint failed
   ```
   *Solution*: Scripts check for duplicates, but manual cleanup may be needed.

### Debug Mode

Enable verbose logging:

```bash
DEBUG=true node src/scripts/importSpotifyDataPrisma.js
```

## 📝 Migration from Mongoose

### Key Differences

| Aspect | Mongoose | Prisma |
|--------|----------|--------|
| Database | MongoDB | PostgreSQL |
| Queries | `Model.find()` | `prisma.model.findMany()` |
| Relationships | Refs/Population | Native joins |
| Schema | JavaScript | Prisma schema |
| Transactions | Sessions | `$transaction()` |

### Data Structure Changes

1. **Genres**: No separate Genre model, stored as arrays in Artist
2. **IDs**: UUIDs instead of ObjectIds
3. **JSON Fields**: Native JSON support in PostgreSQL
4. **Relationships**: Foreign keys instead of references

## 🚦 Performance Tips

### For Large Imports

1. **Use Smaller Batches**:
   ```bash
   node src/scripts/importSpotifyDataPrisma.js --genre-limit=3
   ```

2. **Run During Off-Peak Hours**: Spotify API is less congested

3. **Monitor Database Performance**: Watch for connection pool exhaustion

4. **Use Dry Runs First**: Test your configuration before live imports

### Optimizing Database

```sql
-- Create indexes for better performance
CREATE INDEX idx_artist_spotify_id ON artists(artist_id);
CREATE INDEX idx_release_artist_id ON releases(artist_id);
CREATE INDEX idx_track_release_id ON tracks(release_id);
CREATE INDEX idx_song_isrc ON songs(isrc);
```

## 📈 Monitoring

### Success Metrics

Check these after import:

```sql
-- Count imported records
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM artists) as artists,
  (SELECT COUNT(*) FROM releases) as releases,
  (SELECT COUNT(*) FROM tracks) as tracks,
  (SELECT COUNT(*) FROM songs) as songs;

-- Check for missing relationships
SELECT COUNT(*) FROM tracks WHERE song_id IS NULL;
SELECT COUNT(*) FROM songs WHERE file_url = 'placeholder_url';
```

### Log Analysis

Scripts provide detailed logs:

```
[12:34:56] 📊 Configuration:
[12:34:57] ✅ Successfully imported artist: Taylor Swift
[12:34:58] 📀 Processing release: 1989 (album)
[12:34:59] ✅ Import completed successfully!
```

## 🤝 Contributing

### Adding New Features

1. Follow the existing error handling patterns
2. Add dry-run support for destructive operations
3. Include progress logging with timestamps
4. Update this README with new functionality

### Code Style

- Use async/await for asynchronous operations
- Implement proper error boundaries
- Add JSDoc comments for functions
- Follow the existing naming conventions

---

**Need Help?** Check the error logs first, then review the Spotify API documentation and Prisma docs for additional context.

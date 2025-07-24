# Admin Playlist Creation Script

This document explains how to use the script for creating admin playlists with artwork from the assets directory.

## Overview

The script automatically:

1. Uploads the three images from the `/assets` directory to Cloudinary
2. Creates three featured playlists with these images as artwork
3. Adds random tracks to each playlist

## Prerequisites

- A SUPER_ADMIN user must exist in the database
- Tracks must exist in the database
- Cloudinary credentials must be properly configured in the environment variables

## Running the Script

To run the script, use the following command from the project root:

```bash
npx ts-node src/scripts/create-admin-playlists.ts
```

Or if you have a script defined in package.json:

```bash
npm run create-playlists
```

## Playlist Details

The script creates three playlists:

1. **Can't Get Enough** - Fresh tracks you can't stop playing
   - Image: cantgetEnough.jpg
   - Featured: Yes
   - Public: Yes

2. **Essential Tracks** - Must-hear music for your collection
   - Image: essential.jpg
   - Featured: Yes
   - Public: Yes

3. **Off The Radar** - Discover hidden gems and emerging artists
   - Image: offradar.jpg
   - Featured: Yes
   - Public: Yes

Each playlist will contain 10-15 random tracks from the database.

## Troubleshooting

- If the script fails with "No super admin found", you need to create a super admin user first
- If the script fails with "No tracks found", you need to seed the database with tracks first
- Check the logs for detailed error messages if the script fails

## Customization

To customize the playlists, edit the `PLAYLISTS` array in the script file. You can change:

- Titles
- Descriptions
- Image associations
- Number of tracks (modify the `trackCount` calculation)

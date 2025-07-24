import { prisma } from '../config/database';
import cloudinary from '../config/cloudinary';
import { AdminService } from '../services/admin.service';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

// Define the image file paths
const ASSETS_DIR = path.join(__dirname, '../../assets');
const IMAGE_FILES = ['cantgetEnough.jpg', 'essential.jpg', 'offradar.jpg'];

// Define playlist titles and descriptions
const PLAYLISTS = [
  {
    title: "Can't Get Enough",
    description: "Fresh tracks you can't stop playing",
    imageName: 'cantgetEnough.jpg'
  },
  {
    title: "Essential Tracks",
    description: "Must-hear music for your collection",
    imageName: 'essential.jpg'
  },
  {
    title: "Off The Radar",
    description: "Discover hidden gems and emerging artists",
    imageName: 'offradar.jpg'
  }
];

/**
 * Upload an image to Cloudinary
 */
async function uploadImageToCloudinary(imagePath: string, retries = 3): Promise<string> {
  try {
    // Check file size before uploading
    const stats = fs.statSync(imagePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    logger.info(`File size: ${fileSizeInMB.toFixed(2)} MB`);

    if (fileSizeInMB > 10) {
      throw new Error(`File size too large: ${fileSizeInMB.toFixed(2)} MB. Maximum allowed is 10 MB.`);
    }

    // Add timeout and other options to prevent request timeouts
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: 'playlists',
      resource_type: 'image',
      timeout: 120000, // 2 minute timeout
      use_filename: true,
      unique_filename: true
    });

    logger.info(`Image uploaded successfully to Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    logger.error('Error uploading image to Cloudinary:', error);

    // Implement retry mechanism for transient errors
    if (retries > 0) {
      const retryDelay = 3000; // 3 seconds
      logger.info(`Retrying upload in ${retryDelay/1000} seconds... (${retries} attempts left)`);

      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const result = await uploadImageToCloudinary(imagePath, retries - 1);
            resolve(result);
          } catch (retryError) {
            // If all retries fail, reject with the error
            reject(retryError);
          }
        }, retryDelay);
      });
    }

    // If no retries left or not a retriable error
    const errorMessage = error.message || (error.error && error.error.message) || 'Unknown error';
    throw new Error(`Failed to upload image: ${errorMessage}`);
  }
}

/**
 * Get random tracks from the database
 */
async function getRandomTracks(count: number): Promise<string[]> {
  try {
    const tracks = await prisma.track.findMany({
      select: { id: true },
      take: count,
      orderBy: { createdAt: 'desc' }
    });

    return tracks.map(track => track.id);
  } catch (error) {
    logger.error('Error fetching random tracks:', error);
    throw new Error(`Failed to fetch tracks: ${error.message}`);
  }
}

/**
 * Create admin playlists with uploaded images
 */
async function createAdminPlaylists() {
  try {
    // First, check if we have a super admin in the system
    const superAdmin = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN',
        isAdmin: true
      }
    });

    if (!superAdmin) {
      logger.error('No super admin found in the system. Please create a super admin first.');
      return;
    }

    logger.info(`Found super admin: ${superAdmin.name} (${superAdmin.id})`);

    // For each playlist configuration
    for (const playlist of PLAYLISTS) {
      try {
        // 1. Upload the image to Cloudinary
        const imagePath = path.join(ASSETS_DIR, playlist.imageName);

        if (!fs.existsSync(imagePath)) {
          logger.error(`Image file not found: ${imagePath}`);
          continue;
        }

        logger.info(`Uploading image: ${playlist.imageName}`);
        const artworkUrl = await uploadImageToCloudinary(imagePath);

      // 2. Get random tracks for the playlist (10-15 tracks per playlist)
      const trackCount = Math.floor(Math.random() * 6) + 10; // 10-15 tracks
      logger.info(`Fetching ${trackCount} random tracks for playlist: ${playlist.title}`);
      const trackIds = await getRandomTracks(trackCount);

      if (trackIds.length === 0) {
        logger.error('No tracks found in the database. Please seed tracks first.');
        continue;
      }

      // 3. Create the playlist
      logger.info(`Creating playlist: ${playlist.title}`);
      const createdPlaylist = await AdminService.createAdminPlaylist(
        superAdmin.id,
        {
          title: playlist.title,
          description: playlist.description,
          isPublic: true,
          isFeatured: true,
          trackIds,
          artworkUrl
        }
      );

      logger.info(`Successfully created playlist: ${createdPlaylist.title} (${createdPlaylist.id})`);
      } catch (playlistError) {
        logger.error(`Failed to create playlist "${playlist.title}": ${playlistError.message}`);
        logger.info('Continuing with next playlist...');
      }
    }

    logger.info('All playlists created successfully!');
  } catch (error) {
    logger.error('Error creating admin playlists:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the script
createAdminPlaylists()
  .then(() => {
    logger.info('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  });

#!/usr/bin/env node

/**
 * Migration script to flatten legacy nested starknet wallet data
 * This script handles the migration from nested `starknet` objects to flattened structure
 * and ensures all constructorCalldata is properly typed for Prisma Json compatibility
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { validateConstructorCalldata } from '../utils/artist-wallet.utils';

const prisma = new PrismaClient();

interface LegacyWalletData {
  starknet?: {
    address?: string;
    isDeployed?: boolean;
    encryptedPrivateKey?: string;
    iv?: string;
    salt?: string;
    constructorCalldata?: any;
    addressSalt?: string;
    classHash?: string;
  };
  address?: string;
  isDeployed?: boolean;
  encryptedPrivateKey?: string;
  iv?: string;
  salt?: string;
  constructorCalldata?: any;
  addressSalt?: string;
  classHash?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Flatten legacy nested starknet wallet data
 */
function flattenWalletData(walletData: LegacyWalletData): Prisma.JsonValue {
  // If there's a nested starknet object, prioritize its values
  const starknetData = walletData.starknet;
  
  return {
    address: starknetData?.address || walletData.address,
    isDeployed: starknetData?.isDeployed || walletData.isDeployed || false,
    encryptedPrivateKey: starknetData?.encryptedPrivateKey || walletData.encryptedPrivateKey,
    iv: starknetData?.iv || walletData.iv,
    salt: starknetData?.salt || walletData.salt,
    constructorCalldata: validateConstructorCalldata(
      starknetData?.constructorCalldata || walletData.constructorCalldata
    ),
    addressSalt: starknetData?.addressSalt || walletData.addressSalt,
    classHash: starknetData?.classHash || walletData.classHash,
    createdAt: walletData.createdAt ? new Date(walletData.createdAt) : new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Migrate Artist wallet data
 */
async function migrateArtistWallets(): Promise<void> {
  logger.info('Starting Artist wallet data migration...');
  
  try {
    // Find all artists with wallet data
    const artists = await prisma.artist.findMany({
      where: {
        wallet: {
          not: Prisma.JsonNull,
        },
      },
      select: {
        id: true,
        name: true,
        wallet: true,
      },
    });

    logger.info(`Found ${artists.length} artists with wallet data`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const artist of artists) {
      try {
        const walletData = artist.wallet as LegacyWalletData;
        
        // Check if migration is needed (has nested starknet object)
        if (walletData && walletData.starknet) {
          logger.info(`Migrating wallet data for artist: ${artist.name} (ID: ${artist.id})`);
          
          const flattenedData = flattenWalletData(walletData);
          
          await prisma.artist.update({
            where: { id: artist.id },
            data: {
              wallet: flattenedData,
              updatedAt: new Date(),
            },
          });
          
          migratedCount++;
          logger.info(`Successfully migrated wallet data for artist: ${artist.name}`);
        } else {
          // Check if constructorCalldata needs validation
          const currentCalldata = walletData?.constructorCalldata;
          const validatedCalldata = validateConstructorCalldata(currentCalldata);
          
          if (JSON.stringify(currentCalldata) !== JSON.stringify(validatedCalldata)) {
            logger.info(`Validating constructorCalldata for artist: ${artist.name} (ID: ${artist.id})`);
            
            const updatedData = {
              ...walletData,
              constructorCalldata: validatedCalldata,
              updatedAt: new Date(),
            };
            
            await prisma.artist.update({
              where: { id: artist.id },
              data: {
                wallet: updatedData as Prisma.JsonValue,
                updatedAt: new Date(),
              },
            });
            
            migratedCount++;
            logger.info(`Successfully validated constructorCalldata for artist: ${artist.name}`);
          } else {
            skippedCount++;
            logger.info(`Wallet data already flattened for artist: ${artist.name} (ID: ${artist.id})`);
          }
        }
      } catch (error) {
        logger.error(`Error migrating wallet data for artist ${artist.id}:`, error);
      }
    }

    logger.info(`Artist wallet migration completed. Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
  } catch (error) {
    logger.error('Error during Artist wallet migration:', error);
    throw error;
  }
}

/**
 * Migrate Wallet table constructorCalldata
 */
async function migrateWalletCalldata(): Promise<void> {
  logger.info('Starting Wallet constructorCalldata migration...');
  
  try {
    // Find all wallets with constructorCalldata
    const wallets = await prisma.wallet.findMany({
      where: {
        constructorCalldata: {
          not: Prisma.JsonNull,
        },
      },
      select: {
        email: true,
        constructorCalldata: true,
      },
    });

    logger.info(`Found ${wallets.length} wallets with constructorCalldata`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const wallet of wallets) {
      try {
        const currentCalldata = wallet.constructorCalldata;
        const validatedCalldata = validateConstructorCalldata(currentCalldata);
        
        if (JSON.stringify(currentCalldata) !== JSON.stringify(validatedCalldata)) {
          logger.info(`Validating constructorCalldata for wallet: ${wallet.email}`);
          
          await prisma.wallet.update({
            where: { email: wallet.email },
            data: {
              constructorCalldata: validatedCalldata,
              updatedAt: new Date(),
            },
          });
          
          migratedCount++;
          logger.info(`Successfully validated constructorCalldata for wallet: ${wallet.email}`);
        } else {
          skippedCount++;
        }
      } catch (error) {
        logger.error(`Error migrating constructorCalldata for wallet ${wallet.email}:`, error);
      }
    }

    logger.info(`Wallet constructorCalldata migration completed. Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
  } catch (error) {
    logger.error('Error during Wallet constructorCalldata migration:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting wallet data migration process...');
    
    await migrateArtistWallets();
    await migrateWalletCalldata();
    
    logger.info('Wallet data migration completed successfully!');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Run migration if this script is executed directly
 */
if (require.main === module) {
  main().catch((error) => {
    logger.error('Migration script failed:', error);
    process.exit(1);
  });
}

export { main as migrateWalletData, flattenWalletData, migrateArtistWallets, migrateWalletCalldata };

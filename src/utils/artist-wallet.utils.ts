import { Prisma } from '@prisma/client';
import { prisma } from '@/config/database';
import { starknetService } from '@/services/starknet.service';
import { ArtistWalletInfo, WalletInfo, ConstructorCalldata } from '@/types/wallet.types';
import { logger } from '@/utils/logger';

/**
 * Utility functions for managing Artist wallet operations
 * with flattened interface structure (no nested starknet object)
 */

/**
 * Create or update artist wallet information
 * @param artistId - The artist's ID
 * @param walletData - Flattened wallet information
 * @returns Updated artist with wallet info
 */
export async function updateArtistWallet(
  artistId: string,
  walletData: Partial<ArtistWalletInfo>
): Promise<any> {
  try {
    // Ensure constructorCalldata is compatible with Prisma Json
    const sanitizedWalletData: Prisma.JsonValue = {
      address: walletData.address,
      isDeployed: walletData.isDeployed || false,
      encryptedPrivateKey: walletData.encryptedPrivateKey,
      iv: walletData.iv,
      salt: walletData.salt,
      constructorCalldata: walletData.constructorCalldata,
      addressSalt: walletData.addressSalt,
      classHash: walletData.classHash,
      createdAt: walletData.createdAt || new Date(),
      updatedAt: new Date(),
    };

    const updatedArtist = await prisma.artist.update({
      where: { id: artistId },
      data: {
        wallet: sanitizedWalletData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        wallet: true,
        userId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    logger.info('Artist wallet updated successfully', {
      artistId,
      hasWallet: !!updatedArtist.wallet,
    });

    return updatedArtist;
  } catch (error) {
    logger.error('Error updating artist wallet:', error);
    throw new Error(`Failed to update artist wallet: ${error.message}`);
  }
}

/**
 * Get artist wallet information in flattened format
 * @param artistId - The artist's ID
 * @returns Flattened artist wallet info or null
 */
export async function getArtistWalletInfo(artistId: string): Promise<ArtistWalletInfo | null> {
  try {
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: {
        wallet: true,
      },
    });

    if (!artist || !artist.wallet) {
      return null;
    }

    // Parse the wallet data from Prisma Json
    const walletData = artist.wallet as any;
    
    return {
      address: walletData.address,
      isDeployed: walletData.isDeployed || false,
      encryptedPrivateKey: walletData.encryptedPrivateKey,
      iv: walletData.iv,
      salt: walletData.salt,
      constructorCalldata: walletData.constructorCalldata,
      addressSalt: walletData.addressSalt,
      classHash: walletData.classHash,
      createdAt: walletData.createdAt ? new Date(walletData.createdAt) : undefined,
      updatedAt: walletData.updatedAt ? new Date(walletData.updatedAt) : undefined,
    };
  } catch (error) {
    logger.error('Error retrieving artist wallet info:', error);
    throw new Error(`Failed to retrieve artist wallet info: ${error.message}`);
  }
}

/**
 * Initialize wallet for artist using their user email
 * @param artistId - The artist's ID
 * @returns Created wallet information
 */
export async function initializeArtistWallet(artistId: string): Promise<ArtistWalletInfo> {
  try {
    // Get artist with user email
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!artist) {
      throw new Error('Artist not found');
    }

    // Create wallet using starknet service
    const walletInfo: WalletInfo = await starknetService.createUserWallet(artist.user.email);

    // Convert to artist wallet format and store
    const artistWalletInfo: ArtistWalletInfo = {
      address: walletInfo.address,
      isDeployed: walletInfo.isDeployed,
      encryptedPrivateKey: walletInfo.encryptedPrivateKey,
      iv: walletInfo.iv,
      salt: walletInfo.salt,
      constructorCalldata: walletInfo.constructorCalldata,
      addressSalt: walletInfo.addressSalt,
      classHash: walletInfo.classHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Update artist with wallet info
    await updateArtistWallet(artistId, artistWalletInfo);

    logger.info('Artist wallet initialized successfully', {
      artistId,
      walletAddress: walletInfo.address,
    });

    return artistWalletInfo;
  } catch (error) {
    logger.error('Error initializing artist wallet:', error);
    throw new Error(`Failed to initialize artist wallet: ${error.message}`);
  }
}

/**
 * Deploy artist wallet
 * @param artistId - The artist's ID
 * @param funderAddress - Optional funder address
 * @param funderPrivateKey - Optional funder private key
 * @param amount - Optional funding amount
 * @returns Deployment result
 */
export async function deployArtistWallet(
  artistId: string,
  funderAddress?: string,
  funderPrivateKey?: string,
  amount?: number
): Promise<{
  address: string;
  transactionHash?: string;
  fundingTransactionHash?: string;
  status?: string;
  message: string;
}> {
  try {
    // Get artist with user email
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!artist) {
      throw new Error('Artist not found');
    }

    // Deploy wallet using starknet service
    const deploymentResult = await starknetService.deployUserWallet(
      artist.user.email,
      funderAddress || '0x0620fd15e0b464c174933b5235c72a50376379ee1528719848e144385d0a1ed4',
      funderPrivateKey || '0x05d67e95f8d5913249452a410db389110c390a36eb0e2ecb092c670ba945b8b9',
      amount
    );

    // Update artist wallet deployment status
    const currentWalletInfo = await getArtistWalletInfo(artistId);
    if (currentWalletInfo) {
      await updateArtistWallet(artistId, {
        ...currentWalletInfo,
        isDeployed: true,
        updatedAt: new Date(),
      });
    }

    logger.info('Artist wallet deployed successfully', {
      artistId,
      address: deploymentResult.address,
      transactionHash: deploymentResult.transactionHash,
    });

    return deploymentResult;
  } catch (error) {
    logger.error('Error deploying artist wallet:', error);
    throw new Error(`Failed to deploy artist wallet: ${error.message}`);
  }
}

/**
 * Get artist wallet balance
 * @param artistId - The artist's ID
 * @returns USDC balance information
 */
export async function getArtistWalletBalance(artistId: string) {
  try {
    const walletInfo = await getArtistWalletInfo(artistId);
    if (!walletInfo || !walletInfo.address) {
      throw new Error('Artist wallet not found or not initialized');
    }

    return await starknetService.getStarkNetUSDCBalance(walletInfo.address);
  } catch (error) {
    logger.error('Error getting artist wallet balance:', error);
    throw new Error(`Failed to get artist wallet balance: ${error.message}`);
  }
}

/**
 * Validate constructor calldata for Prisma Json compatibility
 * @param calldata - The constructor calldata to validate
 * @returns Validated and typed constructor calldata
 */
export function validateConstructorCalldata(calldata: any): ConstructorCalldata {
  if (calldata === null || calldata === undefined) {
    return null;
  }

  // Ensure it's compatible with Prisma Json type
  if (Array.isArray(calldata)) {
    return calldata as string[] | number[];
  }

  if (typeof calldata === 'object') {
    return calldata as Record<string, unknown>;
  }

  // If it's a primitive, wrap it in an array
  return [calldata];
}

/**
 * Migrate legacy nested starknet wallet data to flattened format
 * @param artistId - The artist's ID
 * @returns Updated artist wallet info
 */
export async function migrateLegacyWalletData(artistId: string): Promise<ArtistWalletInfo | null> {
  try {
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: {
        wallet: true,
      },
    });

    if (!artist || !artist.wallet) {
      return null;
    }

    const walletData = artist.wallet as any;

    // Check if data has nested starknet structure
    if (walletData.starknet) {
      const legacyStarknetData = walletData.starknet;
      
      // Flatten the structure
      const flattenedWalletData: ArtistWalletInfo = {
        address: legacyStarknetData.address || walletData.address,
        isDeployed: legacyStarknetData.isDeployed || walletData.isDeployed || false,
        encryptedPrivateKey: legacyStarknetData.encryptedPrivateKey || walletData.encryptedPrivateKey,
        iv: legacyStarknetData.iv || walletData.iv,
        salt: legacyStarknetData.salt || walletData.salt,
        constructorCalldata: validateConstructorCalldata(
          legacyStarknetData.constructorCalldata || walletData.constructorCalldata
        ),
        addressSalt: legacyStarknetData.addressSalt || walletData.addressSalt,
        classHash: legacyStarknetData.classHash || walletData.classHash,
        createdAt: walletData.createdAt ? new Date(walletData.createdAt) : new Date(),
        updatedAt: new Date(),
      };

      // Update with flattened structure
      await updateArtistWallet(artistId, flattenedWalletData);

      logger.info('Successfully migrated legacy wallet data for artist', { artistId });
      
      return flattenedWalletData;
    }

    // Data is already flat, just validate constructor calldata
    return {
      address: walletData.address,
      isDeployed: walletData.isDeployed || false,
      encryptedPrivateKey: walletData.encryptedPrivateKey,
      iv: walletData.iv,
      salt: walletData.salt,
      constructorCalldata: validateConstructorCalldata(walletData.constructorCalldata),
      addressSalt: walletData.addressSalt,
      classHash: walletData.classHash,
      createdAt: walletData.createdAt ? new Date(walletData.createdAt) : undefined,
      updatedAt: walletData.updatedAt ? new Date(walletData.updatedAt) : undefined,
    };
  } catch (error) {
    logger.error('Error migrating legacy wallet data:', error);
    throw new Error(`Failed to migrate legacy wallet data: ${error.message}`);
  }
}

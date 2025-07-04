import { Request, Response } from 'express';
import { nftSubscriptionService } from '@/services/starknet.service';
import { prisma } from '@/config/database';
import { createError } from '@/middleware/errorHandler';

/**
 * Create NFT collection for a community
 */
export const createCollection = async (req: Request, res: Response): Promise<void> => {
  const { email, communityId, name, symbol, description, pricePerMonth, maxSupply, imageUrl } = req.body;

  // Verify community exists and belongs to the user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw createError('User not found', 404);
  }

  const artist = await prisma.artist.findUnique({ where: { userId: user.id } });
  if (!artist) {
    throw createError('Artist profile not found', 404);
  }

  const community = await prisma.community.findFirst({
    where: {
      id: communityId,
      artistId: artist.id
    }
  });

  if (!community) {
    throw createError('Community not found or not owned by this artist', 404);
  }

  // Check if collection already exists for this community
  const existingCollection = await prisma.nFTCollection.findFirst({
    where: { communityId, isActive: true }
  });

  if (existingCollection) {
    throw createError('Active NFT collection already exists for this community', 400);
  }

  const result = await nftSubscriptionService.createCommunityCollection(
    email,
    communityId,
    {
      name,
      symbol,
      description,
      pricePerMonth: parseFloat(pricePerMonth),
      maxSupply: maxSupply ? parseInt(maxSupply) : undefined,
      imageUrl
    }
  );

  res.status(201).json({
    success: true,
    message: 'NFT collection created successfully',
    data: result
  });
};

/**
 * Get NFT collection for a community
 */
export const getCollectionByCommunity = async (req: Request, res: Response): Promise<void> => {
  const { communityId } = req.params;

  const collection = await prisma.nFTCollection.findFirst({
    where: {
      communityId,
      isActive: true
    },
    include: {
      community: {
        select: {
          name: true,
          description: true,
          imageUrl: true,
          artist: {
            select: {
              name: true,
              profileImage: true
            }
          }
        }
      }
    }
  });

  if (!collection) {
    throw createError('No active NFT collection found for this community', 404);
  }

  res.status(200).json({
    success: true,
    data: collection
  });
};

/**
 * Get all collections for an artist
 */
export const getArtistCollections = async (req: Request, res: Response): Promise<void> => {
  const { artistId } = req.params;

  const collections = await prisma.nFTCollection.findMany({
    where: {
      artistId,
      isActive: true
    },
    include: {
      community: {
        select: {
          name: true,
          description: true,
          imageUrl: true
        }
      },
      _count: {
        select: {
          memberships: {
            where: {
              isActive: true,
              expiresAt: { gt: new Date() }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    success: true,
    data: collections
  });
};

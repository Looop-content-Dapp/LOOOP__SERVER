import { Request, Response } from 'express';
import { nftSubscriptionService } from '@/services/starknet.service';
import { prisma } from '@/config/database';
import { createError } from '@/middleware/errorHandler';

/**
 * Mint NFT for community access
 */
export const mintCommunityAccess = async (req: Request, res: Response): Promise<void> => {
  const { userEmail, communityId } = req.body;

  const result = await nftSubscriptionService.mintCommunityAccess(userEmail, communityId);

  res.status(201).json({
    success: true,
    message: 'NFT minted successfully for community access',
    data: result
  });
};

/**
 * Renew NFT membership
 */
export const renewMembership = async (req: Request, res: Response): Promise<void> => {
  const { userEmail, membershipId } = req.body;

  const result = await nftSubscriptionService.renewMembership(userEmail, membershipId);

  res.status(200).json({
    success: true,
    message: 'Membership renewed successfully',
    data: result
  });
};

/**
 * Check user's access to a community
 */
export const checkCommunityAccess = async (req: Request, res: Response): Promise<void> => {
  const { userId, communityId } = req.params;

  const accessInfo = await nftSubscriptionService.checkCommunityAccess(userId, communityId);

  res.status(200).json({
    success: true,
    data: accessInfo
  });
};

/**
 * Get user's NFT memberships
 */
export const getUserMemberships = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { status = 'active' } = req.query;

  let whereClause: any = { userId };

  if (status === 'active') {
    whereClause.isActive = true;
    whereClause.expiresAt = { gt: new Date() };
  } else if (status === 'expired') {
    whereClause.OR = [
      { isActive: false },
      { expiresAt: { lte: new Date() } }
    ];
  }

  const memberships = await prisma.nFTMembership.findMany({
    where: whereClause,
    include: {
      community: {
        select: {
          id: true,
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
      },
      collection: {
        select: {
          name: true,
          pricePerMonth: true,
          currency: true,
          contractAddress: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    success: true,
    data: memberships
  });
};

/**
 * Get user's transaction history
 */
export const getUserTransactionHistory = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { type, status, limit = '50', offset = '0' } = req.query;

  const transactions = await nftSubscriptionService.getUserTransactionHistory(
    userId,
    {
      type: type as string,
      status: status as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    }
  );

  res.status(200).json({
    success: true,
    data: transactions
  });
};

/**
 * Update membership auto-renewal setting
 */
export const updateAutoRenewal = async (req: Request, res: Response): Promise<void> => {
  const { membershipId } = req.params;
  const { autoRenew } = req.body;

  // Verify membership exists and belongs to the user
  const membership = await prisma.nFTMembership.findUnique({
    where: { id: membershipId }
  });

  if (!membership) {
    throw createError('Membership not found', 404);
  }

  const updatedMembership = await prisma.nFTMembership.update({
    where: { id: membershipId },
    data: { autoRenew },
    include: {
      community: {
        select: {
          name: true,
          imageUrl: true
        }
      },
      collection: {
        select: {
          name: true,
          pricePerMonth: true,
          currency: true
        }
      }
    }
  });

  res.status(200).json({
    success: true,
    message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} successfully`,
    data: updatedMembership
  });
};

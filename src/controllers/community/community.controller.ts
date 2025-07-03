import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';
import { AuthenticatedRequest } from '@/middleware/auth';
import {
  CommunityCreateRequest,
  CommunityResponse,
  CommunityPostRequest,
  CommunityPost,
  CommunityMember,
  CommunitySearchParams,
  CommunityDiscovery,
  CommunityStats,
  JoinCommunityRequest,
  JoinCommunityResponse
} from '@/types/community.types';

export class CommunityController {

  /**
   * Create a new community (verified artists only)
   */
  static async createCommunity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { name, description, imageUrl, monthlyPrice, isActive = true } = req.body as CommunityCreateRequest;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      // Check if user is a verified artist
      const artist = await prisma.artist.findUnique({
        where: { userId },
        include: { user: true }
      });

      if (!artist || !artist.verified) {
        res.status(403).json({
          success: false,
          error: { message: 'Only verified artists can create communities' }
        });
        return;
      }

      // Check if artist already has a community
      const existingCommunity = await prisma.community.findFirst({
        where: { artistId: artist.id }
      });

      if (existingCommunity) {
        res.status(400).json({
          success: false,
          error: { message: 'Artist already has a community' }
        });
        return;
      }

      if (!name?.trim()) {
        res.status(400).json({
          success: false,
          error: { message: 'Community name is required' }
        });
        return;
      }

      // Create community
      const community = await prisma.community.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          artistId: artist.id,
          imageUrl,
          monthlyPrice: monthlyPrice ? Number(monthlyPrice) : null,
          isActive
        },
        include: {
          artist: {
            include: { user: true }
          },
          _count: {
            select: { members: true }
          }
        }
      });

      // Auto-join the artist to their own community
      await prisma.communityMember.create({
        data: {
          userId: userId,
          communityId: community.id,
          isActive: true
        }
      });

      const response: CommunityResponse = {
        id: community.id,
        name: community.name,
        description: community.description,
        imageUrl: community.imageUrl,
        memberCount: 1, // Just the artist initially
        isActive: community.isActive,
        monthlyPrice: community.monthlyPrice ? Number(community.monthlyPrice) : undefined,
        createdAt: community.createdAt.toISOString(),
        updatedAt: community.updatedAt.toISOString(),
        artist: {
          id: community.artist.id,
          name: community.artist.name,
          verified: community.artist.verified,
          profileImage: community.artist.profileImage
        },
        isJoined: true,
        isMember: true,
        canPost: true
      };

      res.status(201).json({
        success: true,
        message: 'Community created successfully',
        data: response
      });

    } catch (error) {
      logger.error('Error creating community:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to create community' }
      });
    }
  }

  /**
   * Get community details
   */
  static async getCommunity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const community = await prisma.community.findUnique({
        where: { id },
        include: {
          artist: {
            include: { user: true }
          },
          _count: {
            select: { members: true }
          }
        }
      });

      if (!community) {
        res.status(404).json({
          success: false,
          error: { message: 'Community not found' }
        });
        return;
      }

      let isJoined = false;
      let isMember = false;
      let canPost = false;

      if (userId) {
        const membership = await prisma.communityMember.findUnique({
          where: {
            userId_communityId: {
              userId,
              communityId: community.id
            }
          }
        });

        isJoined = !!membership;
        isMember = !!membership?.isActive;
        canPost = community.artist.userId === userId; // Only the artist owner can post
      }

      const response: CommunityResponse = {
        id: community.id,
        name: community.name,
        description: community.description,
        imageUrl: community.imageUrl,
        memberCount: community._count.members,
        isActive: community.isActive,
        monthlyPrice: community.monthlyPrice ? Number(community.monthlyPrice) : undefined,
        createdAt: community.createdAt.toISOString(),
        updatedAt: community.updatedAt.toISOString(),
        artist: {
          id: community.artist.id,
          name: community.artist.name,
          verified: community.artist.verified,
          profileImage: community.artist.profileImage
        },
        isJoined,
        isMember,
        canPost
      };

      res.status(200).json({
        success: true,
        data: response
      });

    } catch (error) {
      logger.error('Error fetching community:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch community' }
      });
    }
  }

  /**
   * Join a community
   */
  static async joinCommunity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { nftTokenId } = req.body as JoinCommunityRequest;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      const community = await prisma.community.findUnique({
        where: { id, isActive: true }
      });

      if (!community) {
        res.status(404).json({
          success: false,
          error: { message: 'Community not found or inactive' }
        });
        return;
      }

      // Check if already a member
      const existingMembership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: community.id
          }
        }
      });

      if (existingMembership) {
        res.status(400).json({
          success: false,
          error: { message: 'Already a member of this community' }
        });
        return;
      }

      // For NFT-gated communities, verify NFT ownership
      let nftVerified = true;
      if (community.monthlyPrice && nftTokenId) {
        const nft = await prisma.nFT.findFirst({
          where: {
            tokenId: nftTokenId,
            ownerId: userId,
            communityId: community.id,
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } }
            ]
          }
        });

        if (!nft) {
          nftVerified = false;
          res.status(403).json({
            success: false,
            error: { message: 'Valid NFT required to join this community' }
          });
          return;
        }
      }

      // Join community
      await prisma.communityMember.create({
        data: {
          userId,
          communityId: community.id,
          isActive: true
        }
      });

      // Get updated member count
      const updatedMemberCount = await prisma.communityMember.count({
        where: { communityId: community.id, isActive: true }
      });

      const response: JoinCommunityResponse = {
        success: true,
        message: 'Successfully joined community',
        data: {
          isJoined: true,
          memberCount: updatedMemberCount,
          requiresNFT: !!community.monthlyPrice,
          nftVerified
        }
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error joining community:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to join community' }
      });
    }
  }

  /**
   * Leave a community
   */
  static async leaveCommunity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      const membership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: id
          }
        }
      });

      if (!membership) {
        res.status(404).json({
          success: false,
          error: { message: 'Not a member of this community' }
        });
        return;
      }

      // Check if user is the community owner (artist)
      const community = await prisma.community.findUnique({
        where: { id },
        include: { artist: true }
      });

      if (community?.artist.userId === userId) {
        res.status(400).json({
          success: false,
          error: { message: 'Community owner cannot leave their own community' }
        });
        return;
      }

      // Remove membership
      await prisma.communityMember.delete({
        where: {
          userId_communityId: {
            userId,
            communityId: id
          }
        }
      });

      // Get updated member count
      const updatedMemberCount = await prisma.communityMember.count({
        where: { communityId: id, isActive: true }
      });

      res.status(200).json({
        success: true,
        message: 'Successfully left community',
        data: {
          isJoined: false,
          memberCount: updatedMemberCount
        }
      });

    } catch (error) {
      logger.error('Error leaving community:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to leave community' }
      });
    }
  }

  /**
   * Create a post in community (artist owner only)
   */
  static async createPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { content, imageUrl } = req.body as CommunityPostRequest;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      if (!content?.trim()) {
        res.status(400).json({
          success: false,
          error: { message: 'Post content is required' }
        });
        return;
      }

      const community = await prisma.community.findUnique({
        where: { id, isActive: true },
        include: { artist: true }
      });

      if (!community) {
        res.status(404).json({
          success: false,
          error: { message: 'Community not found or inactive' }
        });
        return;
      }

      // Check if user is the community owner (artist)
      if (community.artist.userId !== userId) {
        res.status(403).json({
          success: false,
          error: { message: 'Only the community owner can create posts' }
        });
        return;
      }

      // Create post
      const post = await prisma.post.create({
        data: {
          content: content.trim(),
          imageUrl,
          userId,
          communityId: community.id
        },
        include: {
          user: true,
          community: true,
          _count: {
            select: { comments: true }
          }
        }
      });

      const response: CommunityPost = {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        likeCount: post.likeCount,
        commentCount: post._count.comments,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        author: {
          id: post.user.id,
          name: post.user.name,
          username: post.user.username,
          profileImage: post.user.image,
          isVerified: post.user.isVerified
        },
        community: {
          id: post.community!.id,
          name: post.community!.name,
          imageUrl: post.community!.imageUrl
        },
        isLiked: false,
        canEdit: true,
        canDelete: true
      };

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: response
      });

    } catch (error) {
      logger.error('Error creating community post:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to create post' }
      });
    }
  }

  /**
   * Get community posts
   */
  static async getCommunityPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const community = await prisma.community.findUnique({
        where: { id }
      });

      if (!community) {
        res.status(404).json({
          success: false,
          error: { message: 'Community not found' }
        });
        return;
      }

      // Check if user is a member (for private communities)
      if (userId) {
        const membership = await prisma.communityMember.findUnique({
          where: {
            userId_communityId: {
              userId,
              communityId: id
            }
          }
        });

        if (!membership && community.monthlyPrice) {
          res.status(403).json({
            success: false,
            error: { message: 'Must be a member to view community posts' }
          });
          return;
        }
      }

      const posts = await prisma.post.findMany({
        where: { communityId: id },
        include: {
          user: true,
          community: true,
          _count: {
            select: { comments: true }
          }
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      });

      const totalPosts = await prisma.post.count({
        where: { communityId: id }
      });

      const postsResponse: CommunityPost[] = posts.map(post => ({
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        likeCount: post.likeCount,
        commentCount: post._count.comments,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        author: {
          id: post.user.id,
          name: post.user.name,
          username: post.user.username,
          profileImage: post.user.image,
          isVerified: post.user.isVerified
        },
        community: {
          id: post.community!.id,
          name: post.community!.name,
          imageUrl: post.community!.imageUrl
        },
        isLiked: false, // Would need to check if current user liked
        canEdit: userId === post.userId,
        canDelete: userId === post.userId
      }));

      res.status(200).json({
        success: true,
        data: {
          posts: postsResponse,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalPosts,
            pages: Math.ceil(totalPosts / Number(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching community posts:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch community posts' }
      });
    }
  }

  /**
   * Discover communities
   */
  static async discoverCommunities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      // Get featured communities (verified artists with active communities)
      const featured = await prisma.community.findMany({
        where: {
          isActive: true,
          artist: { verified: true }
        },
        include: {
          artist: true,
          _count: {
            select: { members: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      // Get popular communities (by member count)
      const popular = await prisma.community.findMany({
        where: { isActive: true },
        include: {
          artist: true,
          _count: {
            select: { members: true }
          }
        },
        orderBy: {
          members: { _count: 'desc' }
        },
        take: 10
      });

      // Get new communities
      const newCommunities = await prisma.community.findMany({
        where: { isActive: true },
        include: {
          artist: true,
          _count: {
            select: { members: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Group by genre (simplified - would need better genre categorization)
      const byGenre: { [genre: string]: CommunityResponse[] } = {};

      const communityFormatter = async (community: any): Promise<CommunityResponse> => {
        let isJoined = false;
        if (userId) {
          const membership = await prisma.communityMember.findUnique({
            where: {
              userId_communityId: {
                userId,
                communityId: community.id
              }
            }
          });
          isJoined = !!membership;
        }

        return {
          id: community.id,
          name: community.name,
          description: community.description,
          imageUrl: community.imageUrl,
          memberCount: community._count.members,
          isActive: community.isActive,
          monthlyPrice: community.monthlyPrice ? Number(community.monthlyPrice) : undefined,
          createdAt: community.createdAt.toISOString(),
          updatedAt: community.updatedAt.toISOString(),
          artist: {
            id: community.artist.id,
            name: community.artist.name,
            verified: community.artist.verified,
            profileImage: community.artist.profileImage
          },
          isJoined,
          isMember: isJoined,
          canPost: userId === community.artist.userId
        };
      };

      const discoveryData: CommunityDiscovery = {
        featured: await Promise.all(featured.map(communityFormatter)),
        popular: await Promise.all(popular.map(communityFormatter)),
        new: await Promise.all(newCommunities.map(communityFormatter)),
        byGenre
      };

      res.status(200).json({
        success: true,
        data: discoveryData
      });

    } catch (error) {
      logger.error('Error discovering communities:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to discover communities' }
      });
    }
  }

  /**
   * Search communities
   */
  static async searchCommunities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const {
        query,
        genre,
        isActive = true,
        hasNFTAccess,
        limit = 20,
        page = 1,
        sortBy = 'members',
        sortOrder = 'desc'
      } = req.query as CommunitySearchParams;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const whereConditions: any = {
        isActive: isActive === true,
        ...(query && {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { artist: { name: { contains: query, mode: 'insensitive' } } }
          ]
        }),
        ...(genre && { artist: { genres: { hasSome: [genre] } } }),
        ...(hasNFTAccess === true && { monthlyPrice: { not: null } }),
        ...(hasNFTAccess === false && { monthlyPrice: null })
      };

      const orderBy: any = {};
      if (sortBy === 'members') {
        orderBy.members = { _count: sortOrder };
      } else if (sortBy === 'created') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'activity') {
        orderBy.updatedAt = sortOrder;
      }

      const communities = await prisma.community.findMany({
        where: whereConditions,
        include: {
          artist: true,
          _count: {
            select: { members: true }
          }
        },
        skip,
        take,
        orderBy
      });

      const totalCount = await prisma.community.count({
        where: whereConditions
      });

      const communitiesResponse: CommunityResponse[] = [];

      for (const community of communities) {
        let isJoined = false;
        if (userId) {
          const membership = await prisma.communityMember.findUnique({
            where: {
              userId_communityId: {
                userId,
                communityId: community.id
              }
            }
          });
          isJoined = !!membership;
        }

        communitiesResponse.push({
          id: community.id,
          name: community.name,
          description: community.description,
          imageUrl: community.imageUrl,
          memberCount: community._count.members,
          isActive: community.isActive,
          monthlyPrice: community.monthlyPrice ? Number(community.monthlyPrice) : undefined,
          createdAt: community.createdAt.toISOString(),
          updatedAt: community.updatedAt.toISOString(),
          artist: {
            id: community.artist.id,
            name: community.artist.name,
            verified: community.artist.verified,
            profileImage: community.artist.profileImage
          },
          isJoined,
          isMember: isJoined,
          canPost: userId === community.artist.userId
        });
      }

      res.status(200).json({
        success: true,
        data: {
          communities: communitiesResponse,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / Number(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Error searching communities:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to search communities' }
      });
    }
  }

  /**
   * Get community members
   */
  static async getCommunityMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const community = await prisma.community.findUnique({
        where: { id }
      });

      if (!community) {
        res.status(404).json({
          success: false,
          error: { message: 'Community not found' }
        });
        return;
      }

      const members = await prisma.communityMember.findMany({
        where: { communityId: id, isActive: true },
        include: {
          user: true
        },
        skip,
        take,
        orderBy: { joinedAt: 'desc' }
      });

      const totalMembers = await prisma.communityMember.count({
        where: { communityId: id, isActive: true }
      });

      const membersResponse: CommunityMember[] = members.map(member => ({
        id: member.id,
        user: {
          id: member.user.id,
          name: member.user.name,
          username: member.user.username,
          profileImage: member.user.image,
          isVerified: member.user.isVerified
        },
        joinedAt: member.joinedAt.toISOString(),
        isActive: member.isActive,
        role: member.user.id === community.artistId ? 'owner' : 'member'
      }));

      res.status(200).json({
        success: true,
        data: {
          members: membersResponse,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalMembers,
            pages: Math.ceil(totalMembers / Number(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching community members:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch community members' }
      });
    }
  }
}

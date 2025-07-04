import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/database';
import { AuthenticatedRequest } from '@/middleware/auth';
import {
  FollowRequest,
  FollowResponse,
  LikeRequest,
  LikeResponse,
  CommentRequest,
  CommentResponse,
  UserFeedItem,
  UserFeedParams,
  Comment,
  SocialStats,
  FollowingList,
  FollowersList,
  LikedTracks
} from '@/types/social.types';

export class SocialController {

  /**
   * Follow/Unfollow an Artist or User
   */
  static async toggleFollow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { followingId } = req.body as FollowRequest;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      if (userId === followingId) {
        res.status(400).json({
          success: false,
          error: { message: 'Cannot follow yourself' }
        });
        return;
      }

      // Check if user exists
      const userToFollow = await prisma.user.findUnique({
        where: { id: followingId },
        include: {
          artist: true
        }
      });

      if (!userToFollow) {
        res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
        return;
      }

      // Check if already following
      const existingFollow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: followingId
          }
        }
      });

      let isFollowing: boolean;
      let message: string;

      if (existingFollow) {
        // Unfollow
        await prisma.follow.delete({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: followingId
            }
          }
        });

        // Update follower count
        if (userToFollow.artist) {
          await prisma.artist.update({
            where: { id: userToFollow.artist.id },
            data: { followers: { decrement: 1 } }
          });
        }

        isFollowing = false;
        message = 'Successfully unfollowed';
      } else {
        // Follow
        await prisma.follow.create({
          data: {
            followerId: userId,
            followingId: followingId
          }
        });

        // Update follower count
        if (userToFollow.artist) {
          await prisma.artist.update({
            where: { id: userToFollow.artist.id },
            data: { followers: { increment: 1 } }
          });
        }

        isFollowing = true;
        message = 'Successfully followed';
      }

      // Get updated follower count
      const updatedFollowerCount = await prisma.follow.count({
        where: { followingId: followingId }
      });

      const response: FollowResponse = {
        success: true,
        message,
        data: {
          isFollowing,
          followerCount: updatedFollowerCount
        }
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error toggling follow:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to toggle follow status' }
      });
    }
  }

  /**
   * Like/Unlike a Track
   */
  static async toggleLike(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { trackId } = req.body as LikeRequest;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      // Check if track exists
      const track = await prisma.track.findUnique({
        where: { id: trackId, isPublic: true }
      });

      if (!track) {
        res.status(404).json({
          success: false,
          error: { message: 'Track not found' }
        });
        return;
      }

      // Check if already liked
      const existingLike = await prisma.like.findUnique({
        where: {
          userId_trackId: {
            userId: userId,
            trackId: trackId
          }
        }
      });

      let isLiked: boolean;
      let message: string;

      if (existingLike) {
        // Unlike
        await prisma.like.delete({
          where: {
            userId_trackId: {
              userId: userId,
              trackId: trackId
            }
          }
        });

        // Update track like count
        await prisma.track.update({
          where: { id: trackId },
          data: { likeCount: { decrement: 1 } }
        });

        isLiked = false;
        message = 'Track unliked';
      } else {
        // Like
        await prisma.like.create({
          data: {
            userId: userId,
            trackId: trackId
          }
        });

        // Update track like count
        await prisma.track.update({
          where: { id: trackId },
          data: { likeCount: { increment: 1 } }
        });

        isLiked = true;
        message = 'Track liked';
      }

      // Get updated like count
      const updatedLikeCount = await prisma.like.count({
        where: { trackId: trackId }
      });

      const response: LikeResponse = {
        success: true,
        message,
        data: {
          isLiked,
          likeCount: updatedLikeCount
        }
      };

      res.status(200).json(response);

    } catch (error) {
      logger.error('Error toggling like:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to toggle like status' }
      });
    }
  }

  /**
   * Add Comment to Post or Track
   */
  static async addComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { content, postId, trackId, parentId } = req.body as CommentRequest;

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
          error: { message: 'Comment content is required' }
        });
        return;
      }

      if (!postId && !trackId) {
        res.status(400).json({
          success: false,
          error: { message: 'Either postId or trackId is required' }
        });
        return;
      }

      // Verify the post or track exists
      if (postId) {
        const post = await prisma.post.findUnique({
          where: { id: postId }
        });
        if (!post) {
          res.status(404).json({
            success: false,
            error: { message: 'Post not found' }
          });
          return;
        }
      }

      if (trackId) {
        const track = await prisma.track.findUnique({
          where: { id: trackId, isPublic: true }
        });
        if (!track) {
          res.status(404).json({
            success: false,
            error: { message: 'Track not found' }
          });
          return;
        }
      }

      // If it's a reply, verify parent comment exists
      if (parentId) {
        const parentComment = await prisma.comment.findUnique({
          where: { id: parentId }
        });
        if (!parentComment) {
          res.status(404).json({
            success: false,
            error: { message: 'Parent comment not found' }
          });
          return;
        }
      }

      // Create comment
      const comment = await prisma.comment.create({
        data: {
          content: content.trim(),
          userId: userId,
          postId: postId || null,
          trackId: trackId || null,
          parentId: parentId || null
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              isVerified: true
            }
          },
          post: {
            select: {
              id: true,
              content: true
            }
          },
          track: {
            select: {
              id: true,
              title: true,
              artist: {
                select: {
                  name: true
                }
              }
            }
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                  isVerified: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      // Update comment count on post
      if (postId) {
        await prisma.post.update({
          where: { id: postId },
          data: { commentCount: { increment: 1 } }
        });
      }

      const commentResponse: Comment = {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        author: {
          id: comment.user.id,
          name: comment.user.name,
          username: comment.user.username,
          profileImage: comment.user.image,
          isVerified: comment.user.isVerified
        },
        parentId: comment.parentId,
        replies: comment.replies.map(reply => ({
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt.toISOString(),
          updatedAt: reply.updatedAt.toISOString(),
          author: {
            id: reply.user.id,
            name: reply.user.name,
            username: reply.user.username,
            profileImage: reply.user.image,
            isVerified: reply.user.isVerified
          },
          likeCount: 0 // Would need to implement comment likes
        })),
        likeCount: 0, // Would need to implement comment likes
        post: comment.post ? {
          id: comment.post.id,
          title: comment.post.content.substring(0, 50) + '...'
        } : undefined,
        track: comment.track ? {
          id: comment.track.id,
          title: comment.track.title,
          artist: {
            name: comment.track.artist.name
          }
        } : undefined
      };

      const response: CommentResponse = {
        success: true,
        message: 'Comment added successfully',
        data: commentResponse
      };

      res.status(201).json(response);

    } catch (error) {
      logger.error('Error adding comment:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to add comment' }
      });
    }
  }

  /**
   * Get User Feed (Recent posts from followed users/artists)
   */
  static async getUserFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20, type = 'all' } = req.query as UserFeedParams;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      // Get users/artists the current user follows
      const followedUsers = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      });

      const followedUserIds = followedUsers.map(f => f.followingId);

      if (followedUserIds.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            items: [],
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: 0,
              pages: 0
            }
          }
        });
        return;
      }

      let feedItems: UserFeedItem[] = [];

      // Get community posts from followed users
      if (type === 'all' || type === 'community_posts') {
        const communityPosts = await prisma.post.findMany({
          where: {
            userId: { in: followedUserIds },
            communityId: { not: null }
          },
          include: {
            user: {
              include: {
                artist: true
              }
            },
            community: true,
            _count: {
              select: {
                comments: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(take / 3)
        });

        const communityPostItems: UserFeedItem[] = communityPosts.map(post => ({
          id: `community_post_${post.id}`,
          type: 'community_post',
          timestamp: post.createdAt.toISOString(),
          author: {
            id: post.user.id,
            name: post.user.name,
            username: post.user.username,
            profileImage: post.user.image,
            isVerified: post.user.isVerified,
            isFollowing: true
          },
          content: {
            text: post.content,
            imageUrl: post.imageUrl,
            community: post.community ? {
              id: post.community.id,
              name: post.community.name,
              imageUrl: post.community.imageUrl
            } : undefined
          },
          engagement: {
            likeCount: post.likeCount,
            commentCount: post._count.comments,
            isLiked: false // Would need to check if current user liked
          },
          community: post.community ? {
            id: post.community.id,
            name: post.community.name,
            imageUrl: post.community.imageUrl
          } : undefined
        }));

        feedItems = [...feedItems, ...communityPostItems];
      }

      // Get new tracks from followed artists
      if (type === 'all' || type === 'music_updates') {
        const newTracks = await prisma.track.findMany({
          where: {
            artist: {
              userId: { in: followedUserIds }
            },
            isPublic: true,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          include: {
            artist: {
              include: {
                user: true
              }
            },
            album: true
          },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(take / 3)
        });

        const newTrackItems: UserFeedItem[] = newTracks.map(track => ({
          id: `new_track_${track.id}`,
          type: 'new_track',
          timestamp: track.createdAt.toISOString(),
          author: {
            id: track.artist.user.id,
            name: track.artist.user.name,
            username: track.artist.user.username,
            profileImage: track.artist.user.image,
            isVerified: track.artist.user.isVerified,
            isFollowing: true
          },
          content: {
            text: `Released a new track: ${track.title}`,
            track: {
              id: track.id,
              title: track.title,
              artworkUrl: track.artworkUrl,
              duration: track.duration
            }
          },
          engagement: {
            likeCount: track.likeCount,
            commentCount: 0, // Would need to count comments on tracks
            isLiked: false
          }
        }));

        feedItems = [...feedItems, ...newTrackItems];
      }

      // Get new albums from followed artists
      if (type === 'all' || type === 'music_updates') {
        const newAlbums = await prisma.album.findMany({
          where: {
            artist: {
              userId: { in: followedUserIds }
            },
            isPublic: true,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          include: {
            artist: {
              include: {
                user: true
              }
            },
            _count: {
              select: { tracks: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(take / 4)
        });

        const newAlbumItems: UserFeedItem[] = newAlbums.map(album => ({
          id: `new_album_${album.id}`,
          type: 'new_album',
          timestamp: album.createdAt.toISOString(),
          author: {
            id: album.artist.user.id,
            name: album.artist.user.name,
            username: album.artist.user.username,
            profileImage: album.artist.user.image,
            isVerified: album.artist.user.isVerified,
            isFollowing: true
          },
          content: {
            text: `Released a new album: ${album.title}`,
            album: {
              id: album.id,
              title: album.title,
              artworkUrl: album.artworkUrl,
              trackCount: album._count.tracks
            }
          },
          engagement: {
            likeCount: 0,
            commentCount: 0,
            isLiked: false
          }
        }));

        feedItems = [...feedItems, ...newAlbumItems];
      }

      // Sort all feed items by timestamp
      feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const paginatedItems = feedItems.slice(skip, skip + take);

      res.status(200).json({
        success: true,
        data: {
          items: paginatedItems,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: feedItems.length,
            pages: Math.ceil(feedItems.length / Number(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching user feed:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch user feed' }
      });
    }
  }

  /**
   * Get User's Following List
   */
  static async getFollowing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            include: {
              artist: {
                include: {
                  user: true,
                  genres: true
                }
              },
              _count: {
                select: { followers: true }
              },

            }
          }
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      });

      const totalFollowing = await prisma.follow.count({
        where: { followerId: userId }
      });

      const users: any[] = [];
      const artists: any[] = [];

      for (const follow of following) {
        if (follow.following.artist) {
          // It's an artist
          artists.push({
            id: follow.following.artist.id,
            name: follow.following.artist.name,
            profileImage: follow.following.artist.profileImage,
            verified: follow.following.artist.verified,
            followers: follow.following.artist.followers,
            monthlyListeners: follow.following.artist.monthlyListeners,
            followedAt: follow.createdAt.toISOString(),
            genres: follow.following.artist.genres
          });
        } else {
          // It's a regular user
          users.push({
            id: follow.following.id,
            name: follow.following.name,
            username: follow.following.username,
            profileImage: follow.following.image,
            isVerified: follow.following.isVerified,
            followers: follow.following._count.followers,
            bio: follow.following.bio,
            followedAt: follow.createdAt.toISOString(),
            isFollowingBack: false, // Would need to check
            mutualFollowers: 0 // Would need to calculate
          });
        }
      }

      const response: FollowingList = {
        users,
        artists,
        total: {
          users: users.length,
          artists: artists.length
        }
      };

      res.status(200).json({
        success: true,
        data: {
          following: response,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalFollowing,
            pages: Math.ceil(totalFollowing / Number(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching following list:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch following list' }
      });
    }
  }

  /**
   * Get User's Liked Tracks
   */
  static async getLikedTracks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const likedTracks = await prisma.like.findMany({
        where: { userId },
        include: {
          track: {
            include: {
              artist: true,
              album: true
            }
          }
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      });

      const totalLiked = await prisma.like.count({
        where: { userId }
      });

      const tracks = likedTracks.map(like => ({
        id: like.track.id,
        title: like.track.title,
        artworkUrl: like.track.artworkUrl,
        duration: like.track.duration,
        playCount: like.track.playCount,
        likeCount: like.track.likeCount,
        likedAt: like.createdAt.toISOString(),
        artist: {
          id: like.track.artist.id,
          name: like.track.artist.name,
          verified: like.track.artist.verified,
          profileImage: like.track.artist.profileImage
        },
        album: like.track.album ? {
          id: like.track.album.id,
          title: like.track.album.title,
          artworkUrl: like.track.album.artworkUrl
        } : undefined,
        genre: like.track.genre
      }));

      const response: LikedTracks = {
        tracks,
        total: totalLiked
      };

      res.status(200).json({
        success: true,
        data: {
          likedTracks: response,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalLiked,
            pages: Math.ceil(totalLiked / Number(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching liked tracks:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch liked tracks' }
      });
    }
  }

  /**
   * Get Social Stats for a User
   */
  static async getSocialStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId: targetUserId } = req.params;
      const currentUserId = req.user?.id;

      const userIdToCheck = targetUserId || currentUserId;

      if (!userIdToCheck) {
        res.status(400).json({
          success: false,
          error: { message: 'User ID is required' }
        });
        return;
      }

      // Get follower/following counts
      const [followersCount, followingCount] = await Promise.all([
        prisma.follow.count({ where: { followingId: userIdToCheck } }),
        prisma.follow.count({ where: { followerId: userIdToCheck } })
      ]);

      // Get liked tracks count
      const likedTracksCount = await prisma.like.count({
        where: { userId: userIdToCheck }
      });

      // Get comments given
      const commentsGivenCount = await prisma.comment.count({
        where: { userId: userIdToCheck }
      });

      // Get total play count for user's tracks (if they're an artist)
      const user = await prisma.user.findUnique({
        where: { id: userIdToCheck },
        include: {
          artist: {
            include: {
              tracks: {
                select: { playCount: true }
              }
            }
          }
        }
      });

      const totalPlayCount = user?.artist?.tracks.reduce((sum, track) => sum + track.playCount, 0) || 0;

      const stats: SocialStats = {
        followers: followersCount,
        following: followingCount,
        likedTracks: likedTracksCount,
        commentsGiven: commentsGivenCount,
        commentsReceived: 0, // Would need to calculate comments on user's content
        totalPlayCount
      };

      res.status(200).json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      logger.error('Error fetching social stats:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch social stats' }
      });
    }
  }
}

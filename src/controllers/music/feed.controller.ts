import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import {
  MusicFeedParams,
  DiscoverySection,
  SearchParams,
  SearchResults,
  MusicFeedItem,
  FeedTrack,
  FeedAlbum,
  FeedArtist,
  FeedPlaylist
} from '@/types/feed.types';
import { prisma } from '@/config/database';



export class MusicFeedController {

  /**
   * Get Music Home Feed
   * Includes new releases, followed artists, admin playlists, hottest tracks
   */
  static async getHomeFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20, feedType = 'all', location, genres } = req.query as MusicFeedParams;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      let feedItems: MusicFeedItem[] = [];

      // Get new releases
      if (feedType === 'all' || feedType === 'new_releases') {
        const newReleases = await prisma.track.findMany({
          where: {
            isPublic: true,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            },
            ...(genres?.length && { genre: { hasSome: genres as string[] } })
          },
          include: {
            artist: true,
            album: true,
            _count: {
              select: { likes: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(take / 4)
        });

        const newReleaseItems: MusicFeedItem[] = newReleases.map(track => ({
          id: `new_release_${track.id}`,
          type: 'new_release',
          title: `New release: ${track.title}`,
          description: `By ${track.artist.name}`,
          timestamp: track.createdAt.toISOString(),
          data: {
            track: {
              id: track.id,
              title: track.title,
              artworkUrl: track.artworkUrl,
              duration: track.duration,
              playCount: track.playCount,
              likeCount: track._count.likes,
              artist: {
                id: track.artist.id,
                name: track.artist.name,
                verified: track.artist.verified,
                profileImage: track.artist.profileImage
              },
              album: track.album ? {
                id: track.album.id,
                title: track.album.title,
                artworkUrl: track.album.artworkUrl
              } : undefined,
              genre: track.genre,
              releaseDate: track.createdAt.toISOString()
            }
          }
        }));

        feedItems = [...feedItems, ...newReleaseItems];
      }

      // Get tracks from followed artists
      if (userId && (feedType === 'all' || feedType === 'following')) {
        const followedArtists = await prisma.follow.findMany({
          where: { followerId: userId },
          include: {
            following: {
              include: {
                artist: {
                  include: {
                    tracks: {
                      where: {
                        isPublic: true,
                        createdAt: {
                          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // Last 14 days
                        }
                      },
                      include: {
                        album: true,
                        _count: {
                          select: { likes: true }
                        }
                      },
                      orderBy: { createdAt: 'desc' },
                      take: 3
                    }
                  }
                }
              }
            }
          },
          take: 10
        });

        for (const follow of followedArtists) {
          if (follow.following.artist?.tracks) {
            const artistUpdateItems: MusicFeedItem[] = follow.following.artist.tracks.map(track => ({
              id: `artist_update_${track.id}`,
              type: 'artist_update',
              title: `${follow.following.artist!.name} released ${track.title}`,
              timestamp: track.createdAt.toISOString(),
              data: {
                track: {
                  id: track.id,
                  title: track.title,
                  artworkUrl: track.artworkUrl,
                  duration: track.duration,
                  playCount: track.playCount,
                  likeCount: track._count.likes,
                  artist: {
                    id: follow.following.artist!.id,
                    name: follow.following.artist!.name,
                    verified: follow.following.artist!.verified,
                    profileImage: follow.following.artist!.profileImage
                  },
                  album: track.album ? {
                    id: track.album.id,
                    title: track.album.title,
                    artworkUrl: track.album.artworkUrl
                  } : undefined,
                  genre: track.genre,
                  releaseDate: track.createdAt.toISOString()
                }
              }
            }));

            feedItems = [...feedItems, ...artistUpdateItems];
          }
        }
      }

      // Get admin playlists (featured playlists)
      if (feedType === 'all' || feedType === 'admin_curated') {
        const adminPlaylists = await prisma.playlist.findMany({
          where: {
            isPublic: true,
            user: {
              isAdmin: true
            }
          },
          include: {
            user: true,
            tracks: {
              include: {
                track: {
                  include: {
                    artist: true,
                    album: true,
                    _count: {
                      select: { likes: true }
                    }
                  }
                }
              },
              take: 5
            },
            _count: {
              select: { tracks: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(take / 6)
        });

        const adminPlaylistItems: MusicFeedItem[] = adminPlaylists.map(playlist => ({
          id: `admin_playlist_${playlist.id}`,
          type: 'admin_playlist',
          title: `Featured playlist: ${playlist.title}`,
          description: playlist.description,
          timestamp: playlist.createdAt.toISOString(),
          data: {
            playlist: {
              id: playlist.id,
              title: playlist.title,
              description: playlist.description,
              artworkUrl: playlist.artworkUrl,
              trackCount: playlist._count.tracks,
              isPublic: playlist.isPublic,
              isFeatured: true,
              isAdminPlaylist: true,
              createdBy: {
                id: playlist.user.id,
                name: playlist.user.name,
                isAdmin: playlist.user.isAdmin
              },
              tracks: playlist.tracks.map(pt => ({
                id: pt.track.id,
                title: pt.track.title,
                artworkUrl: pt.track.artworkUrl,
                duration: pt.track.duration,
                playCount: pt.track.playCount,
                likeCount: pt.track._count.likes,
                artist: {
                  id: pt.track.artist.id,
                  name: pt.track.artist.name,
                  verified: pt.track.artist.verified,
                  profileImage: pt.track.artist.profileImage
                },
                album: pt.track.album ? {
                  id: pt.track.album.id,
                  title: pt.track.album.title,
                  artworkUrl: pt.track.album.artworkUrl
                } : undefined,
                genre: pt.track.genre,
                releaseDate: pt.track.createdAt.toISOString()
              }))
            }
          }
        }));

        feedItems = [...feedItems, ...adminPlaylistItems];
      }

      // Get hottest tracks (based on play count and recent activity)
      if (feedType === 'all' || feedType === 'hot') {
        const hotTracks = await prisma.track.findMany({
          where: {
            isPublic: true,
            playCount: { gt: 100 },
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          include: {
            artist: true,
            album: true,
            _count: {
              select: { likes: true }
            }
          },
          orderBy: [
            { playCount: 'desc' },
            { createdAt: 'desc' }
          ],
          take: Math.floor(take / 4)
        });

        const hotTrackItems: MusicFeedItem[] = hotTracks.map(track => ({
          id: `hot_track_${track.id}`,
          type: 'hot_track',
          title: `Trending: ${track.title}`,
          description: `${track.playCount} plays`,
          timestamp: track.createdAt.toISOString(),
          data: {
            track: {
              id: track.id,
              title: track.title,
              artworkUrl: track.artworkUrl,
              duration: track.duration,
              playCount: track.playCount,
              likeCount: track._count.likes,
              artist: {
                id: track.artist.id,
                name: track.artist.name,
                verified: track.artist.verified,
                profileImage: track.artist.profileImage
              },
              album: track.album ? {
                id: track.album.id,
                title: track.album.title,
                artworkUrl: track.album.artworkUrl
              } : undefined,
              genre: track.genre,
              releaseDate: track.createdAt.toISOString()
            }
          },
          metadata: {
            reason: 'Trending track',
            ranking: track.playCount
          }
        }));

        feedItems = [...feedItems, ...hotTrackItems];
      }

      // Sort feed items by timestamp
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
      logger.error('Error fetching music feed:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch music feed'
        }
      });
    }
  }

  /**
   * Get Discovery Section
   * Top songs by location, top 10 albums, worldwide hits
   */
  static async getDiscoverySection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { location = 'worldwide' } = req.query;

      // Get top songs by location (mock implementation - would need location tracking)
      const topSongsByLocation = await prisma.track.findMany({
        where: {
          isPublic: true,
          playCount: { gt: 50 }
        },
        include: {
          artist: true,
          album: true,
          _count: {
            select: { likes: true }
          }
        },
        orderBy: { playCount: 'desc' },
        take: 10
      });

      // Get top 10 albums
      const top10Albums = await prisma.album.findMany({
        where: {
          isPublic: true,
          tracks: {
            some: {
              playCount: { gt: 100 }
            }
          }
        },
        include: {
          artist: true,
          tracks: {
            include: {
              _count: {
                select: { likes: true }
              }
            },
            orderBy: { playCount: 'desc' },
            take: 3
          },
          _count: {
            select: { tracks: true }
          }
        },
        orderBy: {
          tracks: {
            _count: 'desc'
          }
        },
        take: 10
      });

      // Get top songs worldwide
      const topSongsWorldwide = await prisma.track.findMany({
        where: {
          isPublic: true,
          playCount: { gt: 1000 }
        },
        include: {
          artist: true,
          album: true,
          _count: {
            select: { likes: true }
          }
        },
        orderBy: { playCount: 'desc' },
        take: 20
      });

      // Get trending data
      const trendingArtists = await prisma.artist.findMany({
        where: {
          verified: true,
          tracks: {
            some: {
              playCount: { gt: 500 },
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          }
        },
        include: {
          tracks: {
            where: {
              isPublic: true
            },
            orderBy: { playCount: 'desc' },
            take: 1
          }
        },
        orderBy: { monthlyListeners: 'desc' },
        take: 10
      });

      const discoveryData: DiscoverySection = {
        topSongsByLocation: {
          location: location as string,
          tracks: topSongsByLocation.map(track => ({
            id: track.id,
            title: track.title,
            artworkUrl: track.artworkUrl,
            duration: track.duration,
            playCount: track.playCount,
            likeCount: track._count.likes,
            artist: {
              id: track.artist.id,
              name: track.artist.name,
              verified: track.artist.verified,
              profileImage: track.artist.profileImage
            },
            album: track.album ? {
              id: track.album.id,
              title: track.album.title,
              artworkUrl: track.album.artworkUrl
            } : undefined,
            genre: track.genre,
            releaseDate: track.createdAt.toISOString()
          }))
        },
        top10Albums: top10Albums.map(album => ({
          id: album.id,
          title: album.title,
          artworkUrl: album.artworkUrl,
          releaseDate: album.releaseDate?.toISOString() || album.createdAt.toISOString(),
          trackCount: album._count.tracks,
          artist: {
            id: album.artist.id,
            name: album.artist.name,
            verified: album.artist.verified,
            profileImage: album.artist.profileImage
          },
          tracks: album.tracks.map(track => ({
            id: track.id,
            title: track.title,
            artworkUrl: track.artworkUrl,
            duration: track.duration,
            playCount: track.playCount,
            likeCount: track._count.likes,
            artist: {
              id: album.artist.id,
              name: album.artist.name,
              verified: album.artist.verified,
              profileImage: album.artist.profileImage
            },
            genre: track.genre,
            releaseDate: track.createdAt.toISOString()
          }))
        })),
        topSongsWorldwide: topSongsWorldwide.map(track => ({
          id: track.id,
          title: track.title,
          artworkUrl: track.artworkUrl,
          duration: track.duration,
          playCount: track.playCount,
          likeCount: track._count.likes,
          artist: {
            id: track.artist.id,
            name: track.artist.name,
            verified: track.artist.verified,
            profileImage: track.artist.profileImage
          },
          album: track.album ? {
            id: track.album.id,
            title: track.album.title,
            artworkUrl: track.album.artworkUrl
          } : undefined,
          genre: track.genre,
          releaseDate: track.createdAt.toISOString()
        })),
        trending: {
          artists: trendingArtists.map(artist => ({
            id: artist.id,
            name: artist.name,
            profileImage: artist.profileImage,
            verified: artist.verified,
            followers: artist.followers,
            monthlyListeners: artist.monthlyListeners,
            latestRelease: artist.tracks[0] ? {
              id: artist.tracks[0].id,
              title: artist.tracks[0].title,
              artworkUrl: artist.tracks[0].artworkUrl,
              duration: artist.tracks[0].duration,
              playCount: artist.tracks[0].playCount,
              likeCount: 0, // Would need to add count
              artist: {
                id: artist.id,
                name: artist.name,
                verified: artist.verified,
                profileImage: artist.profileImage
              },
              genre: artist.tracks[0].genre,
              releaseDate: artist.tracks[0].createdAt.toISOString()
            } : undefined
          })),
          tracks: topSongsWorldwide.slice(0, 10).map(track => ({
            id: track.id,
            title: track.title,
            artworkUrl: track.artworkUrl,
            duration: track.duration,
            playCount: track.playCount,
            likeCount: track._count.likes,
            artist: {
              id: track.artist.id,
              name: track.artist.name,
              verified: track.artist.verified,
              profileImage: track.artist.profileImage
            },
            album: track.album ? {
              id: track.album.id,
              title: track.album.title,
              artworkUrl: track.album.artworkUrl
            } : undefined,
            genre: track.genre,
            releaseDate: track.createdAt.toISOString()
          })),
          albums: top10Albums.slice(0, 5).map(album => ({
            id: album.id,
            title: album.title,
            artworkUrl: album.artworkUrl,
            releaseDate: album.releaseDate?.toISOString() || album.createdAt.toISOString(),
            trackCount: album._count.tracks,
            artist: {
              id: album.artist.id,
              name: album.artist.name,
              verified: album.artist.verified,
              profileImage: album.artist.profileImage
            }
          }))
        }
      };

      res.status(200).json({
        success: true,
        data: discoveryData
      });

    } catch (error) {
      logger.error('Error fetching discovery section:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch discovery section'
        }
      });
    }
  }

  /**
   * Search Music, Artists, Albums, Playlists
   */
  static async searchContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        query,
        type = 'all',
        location,
        genre,
        limit = 10,
        page = 1
      } = req.query as unknown as SearchParams;

      if (!query) {
        res.status(400).json({
          success: false,
          error: { message: 'Search query is required' }
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const searchResults: SearchResults = {
        tracks: [],
        artists: [],
        albums: [],
        playlists: [],
        users: [],
        communities: [],
        total: {
          tracks: 0,
          artists: 0,
          albums: 0,
          playlists: 0,
          users: 0,
          communities: 0
        }
      };

      // Search tracks
      if (type === 'all' || type === 'tracks') {
        const tracks = await prisma.track.findMany({
          where: {
            isPublic: true,
            OR: [
              { title: { contains: query as string, mode: 'insensitive' } },
              { artist: { name: { contains: query as string, mode: 'insensitive' } } },
              { genre: { hasSome: [query as string] } },
              { tags: { hasSome: [query as string] } }
            ],
            ...(genre && { genre: { hasSome: [genre] } })
          },
          include: {
            artist: true,
            album: true,
            _count: {
              select: { likes: true }
            }
          },
          skip: type === 'tracks' ? skip : 0,
          take: type === 'tracks' ? take : Math.min(take, 5),
          orderBy: { playCount: 'desc' }
        });

        const totalTracks = await prisma.track.count({
          where: {
            isPublic: true,
            OR: [
              { title: { contains: query as string, mode: 'insensitive' } },
              { artist: { name: { contains: query as string, mode: 'insensitive' } } },
              { genre: { hasSome: [query as string] } },
              { tags: { hasSome: [query as string] } }
            ],
            ...(genre && { genre: { hasSome: [genre] } })
          }
        });

        searchResults.tracks = tracks.map(track => ({
          id: track.id,
          title: track.title,
          artworkUrl: track.artworkUrl,
          duration: track.duration,
          playCount: track.playCount,
          likeCount: track._count.likes,
          artist: {
            id: track.artist.id,
            name: track.artist.name,
            verified: track.artist.verified,
            profileImage: track.artist.profileImage
          },
          album: track.album ? {
            id: track.album.id,
            title: track.album.title,
            artworkUrl: track.album.artworkUrl
          } : undefined,
          genre: track.genre,
          releaseDate: track.createdAt.toISOString()
        }));

        searchResults.total.tracks = totalTracks;
      }

      // Search artists
      if (type === 'all' || type === 'artists') {
        const artists = await prisma.artist.findMany({
          where: {
            OR: [
              { name: { contains: query as string, mode: 'insensitive' } },
              { genres: { hasSome: [query as string] } }
            ]
          },
          include: {
            tracks: {
              where: { isPublic: true },
              orderBy: { playCount: 'desc' },
              take: 1
            }
          },
          skip: type === 'artists' ? skip : 0,
          take: type === 'artists' ? take : Math.min(take, 5),
          orderBy: { monthlyListeners: 'desc' }
        });

        const totalArtists = await prisma.artist.count({
          where: {
            OR: [
              { name: { contains: query as string, mode: 'insensitive' } },
              { genres: { hasSome: [query as string] } }
            ]
          }
        });

        searchResults.artists = artists.map(artist => ({
          id: artist.id,
          name: artist.name,
          profileImage: artist.profileImage,
          verified: artist.verified,
          followers: artist.followers,
          monthlyListeners: artist.monthlyListeners,
          latestRelease: artist.tracks[0] ? {
            id: artist.tracks[0].id,
            title: artist.tracks[0].title,
            artworkUrl: artist.tracks[0].artworkUrl,
            duration: artist.tracks[0].duration,
            playCount: artist.tracks[0].playCount,
            likeCount: 0,
            artist: {
              id: artist.id,
              name: artist.name,
              verified: artist.verified,
              profileImage: artist.profileImage
            },
            genre: artist.tracks[0].genre,
            releaseDate: artist.tracks[0].createdAt.toISOString()
          } : undefined
        }));

        searchResults.total.artists = totalArtists;
      }

      // Search albums
      if (type === 'all' || type === 'albums') {
        const albums = await prisma.album.findMany({
          where: {
            isPublic: true,
            OR: [
              { title: { contains: query as string, mode: 'insensitive' } },
              { artist: { name: { contains: query as string, mode: 'insensitive' } } }
            ]
          },
          include: {
            artist: true,
            _count: {
              select: { tracks: true }
            }
          },
          skip: type === 'albums' ? skip : 0,
          take: type === 'albums' ? take : Math.min(take, 5),
          orderBy: { createdAt: 'desc' }
        });

        const totalAlbums = await prisma.album.count({
          where: {
            isPublic: true,
            OR: [
              { title: { contains: query as string, mode: 'insensitive' } },
              { artist: { name: { contains: query as string, mode: 'insensitive' } } }
            ]
          }
        });

        searchResults.albums = albums.map(album => ({
          id: album.id,
          title: album.title,
          artworkUrl: album.artworkUrl,
          releaseDate: album.releaseDate?.toISOString() || album.createdAt.toISOString(),
          trackCount: album._count.tracks,
          artist: {
            id: album.artist.id,
            name: album.artist.name,
            verified: album.artist.verified,
            profileImage: album.artist.profileImage
          }
        }));

        searchResults.total.albums = totalAlbums;
      }

      // Search playlists
      if (type === 'all' || type === 'playlists') {
        const playlists = await prisma.playlist.findMany({
          where: {
            isPublic: true,
            OR: [
              { title: { contains: query as string, mode: 'insensitive' } },
              { description: { contains: query as string, mode: 'insensitive' } }
            ]
          },
          include: {
            user: true,
            _count: {
              select: { tracks: true }
            }
          },
          skip: type === 'playlists' ? skip : 0,
          take: type === 'playlists' ? take : Math.min(take, 5),
          orderBy: { createdAt: 'desc' }
        });

        const totalPlaylists = await prisma.playlist.count({
          where: {
            isPublic: true,
            OR: [
              { title: { contains: query as string, mode: 'insensitive' } },
              { description: { contains: query as string, mode: 'insensitive' } }
            ]
          }
        });

        searchResults.playlists = playlists.map(playlist => ({
          id: playlist.id,
          title: playlist.title,
          description: playlist.description,
          artworkUrl: playlist.artworkUrl,
          trackCount: playlist._count.tracks,
          isPublic: playlist.isPublic,
          isAdminPlaylist: playlist.user.isAdmin,
          createdBy: {
            id: playlist.user.id,
            name: playlist.user.name,
            isAdmin: playlist.user.isAdmin
          }
        }));

        searchResults.total.playlists = totalPlaylists;
      }

      res.status(200).json({
        success: true,
        data: {
          results: searchResults,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: Object.values(searchResults.total).reduce((a, b) => a + b, 0)
          }
        }
      });

    } catch (error) {
      logger.error('Error searching content:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to search content'
        }
      });
    }
  }
}

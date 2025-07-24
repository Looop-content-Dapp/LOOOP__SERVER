import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';
import {
  MusicFeedParams,
  DiscoverySection,
  SearchParams,
  SearchResults,
  MusicFeedItem,
} from '@/types/feed.types';
import { prisma } from '@/config/database';



export class MusicFeedController {

  /**
   * Get Music Home Feed
   * Includes curated content, dive-in sections, fan recommendations, content from followed artists,
   * artists you follow, and a daily mix of songs from all artists the user is following
   */
  static async getHomeFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20, feedType = 'all', location, genres } = req.query as MusicFeedParams;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      // Structure to hold different sections of the feed
      const feedSections = {
        curated: [] as MusicFeedItem[],
        dive_in: [] as MusicFeedItem[],
        fans_follow: [] as MusicFeedItem[],
        from_artists_you_follow: [] as MusicFeedItem[],
        artists_you_follow: [] as MusicFeedItem[],
        daily_mix: [] as MusicFeedItem[]
      };

      let feedItems: MusicFeedItem[] = [];

      // Get curated content - new albums and releases
      if (feedType === 'all' || feedType === 'new_releases') {
        // Get new albums
        const newAlbums = await prisma.release.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          include: {
            artist: {
              select: {
                id: true,
                name: true,
                verified: true,
                profileImage: true
              }
            },
            tracks: {
              take: 5,
              include: {
                _count: {
                  select: { likes: true }
                },
                release: {
                  select: {
                    id: true,
                    title: true,
                    artwork: true
                  }
                },
                song: true
              }
            },
            _count: {
              select: { tracks: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(take / 3)
        });

        const albumItems: MusicFeedItem[] = newAlbums.map(album => ({
          id: `album_${album.id}`,
          type: 'album',
          title: album.title,
          description: album.artist.name,
          timestamp: album.createdAt.toISOString(),
          data: {
            album: {
              id: album.id,
              title: album.title,
              artworkUrl: album.artwork && typeof album.artwork === 'object' ? String((album.artwork as any).cover_image?.high || (album.artwork as any).cover_image?.medium || (album.artwork as any).cover_image?.low) : undefined,
              releaseDate: album.createdAt.toISOString(),
              trackCount: album._count.tracks,
              artist: {
                id: album.artistId,
                name: album.artist.name,
                verified: album.artist.verified,
                profileImage: album.artist.profileImage
              },
              tracks: album.tracks.map(track => ({
                id: track.id,
                  title: track.title,
                  artworkUrl: track.artworkUrl || (track.release?.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined),
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
            }
          },
          metadata: {
            section: 'curated',
            itemType: 'album'
          }
        }));

        feedSections.curated = [...feedSections.curated, ...albumItems];

        // Get new tracks
        const newTracks = await prisma.track.findMany({
          where: {
            isPublic: true,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            },
            ...(genres?.length && { genre: { hasSome: genres as string[] } })
          },
          include: {
            artist: {
              select: {
                id: true,
                name: true,
                verified: true,
                profileImage: true
              }
            },
            release: {
              select: {
                id: true,
                title: true,
                artwork: true
              },
            },
            _count: {
              select: { likes: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(take / 4)
        });

        const newTrackItems: MusicFeedItem[] = newTracks.map(track => ({
          id: `track_${track.id}`,
          type: 'track',
          title: track.title,
          description: `By ${track.artist.name}`,
          timestamp: track.createdAt.toISOString(),
          data: {
            track: {
              id: track.id,
              title: track.title,
              artworkUrl: track?.release?.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined,
              duration: track.duration,
              playCount: track.playCount,
              likeCount: track._count.likes,
              artist: {
                id: track.artist.id,
                name: track.artist.name,
                verified: track.artist.verified,
                profileImage: track.artist.profileImage
              },
              album: track.release ? {
              id: track.release.id,
              title: track.release.title,
              artworkUrl: track.release.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined
            } : undefined,
              genre: track.genre,
              releaseDate: track.createdAt.toISOString()
            }
          },
          metadata: {
            section: 'curated',
            itemType: 'track'
          }
        }));

        feedSections.curated = [...feedSections.curated, ...newTrackItems];
      }

      // Get content from artists you follow
      if (userId && (feedType === 'all' || feedType === 'following')) {
        const follows = await prisma.follow.findMany({
          where: { followerId: userId },
          take: 10
        });

        if (follows.length > 0) {
          const followedArtistIds = follows.map(follow => follow.followingId);

          // Get followed artists with their recent content
          const followedArtists = await prisma.artist.findMany({
            where: {
              id: {
                in: followedArtistIds
              }
            },
            include: {
              tracks: {
                where: {
                  isPublic: true,
                  createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                  }
                },
                include: {
                  artist: {
                    select: {
                      id: true,
                      name: true,
                      verified: true,
                      profileImage: true
                    }
                  },
                  release: {
                    select: {
                      id: true,
                      title: true,
                      artwork: true
                    }
                  },
                  _count: {
                    select: { likes: true }
                  }
                },
                orderBy: { createdAt: 'desc' },
                take: 3
              },
              releases: {
                where: {
                  type: 'album',
                  createdAt: {
                    gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // Last 60 days
                  }
                },
                orderBy: { createdAt: 'desc' },
                take: 2,
                include: {
                  _count: {
                    select: { tracks: true }
                  }
                }
              }
            }
          });

          // Process followed artists' content
          for (const artist of followedArtists) {
            // Add artist's tracks
            if (artist.tracks && artist.tracks.length > 0) {
              const artistTrackItems: MusicFeedItem[] = artist.tracks.map(track => ({
                id: `artist_track_${track.id}`,
                type: 'track',
                title: track.title,
                description: `${artist.name}`,
                timestamp: track.createdAt.toISOString(),
                data: {
                  track: {
                    id: track.id,
                    title: track.title,
                    artworkUrl: track.artworkUrl || (track.release?.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined),
                    duration: track.duration,
                    playCount: track.playCount,
                    likeCount: track._count.likes,
                    artist: {
                      id: artist.id,
                      name: artist.name,
                      verified: artist.verified,
                      profileImage: artist.profileImage
                    },
                    album: track.release ? {
                      id: track.release.id,
                      title: track.release.title,
                      artworkUrl: track.release.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined
                    } : undefined,
                    genre: track.genre,
                    releaseDate: track.createdAt.toISOString()
                  }
                },
                metadata: {
                  section: 'from_artists_you_follow',
                  itemType: 'track'
                }
              }));

              feedSections.from_artists_you_follow = [...feedSections.from_artists_you_follow, ...artistTrackItems];
            }

            // Add artist's albums
            if (artist.releases && artist.releases.length > 0) {
              const artistAlbumItems: MusicFeedItem[] = artist.releases.map(album => ({
                id: `artist_album_${album.id}`,
                type: 'album',
                title: album.title,
                description: artist.name,
                timestamp: album.createdAt.toISOString(),
                data: {
                  album: {
                    id: album.id,
                    title: album.title,
                    artworkUrl: album.artwork && typeof album.artwork === 'object' ? String((album.artwork as any).cover_image?.high || (album.artwork as any).cover_image?.medium || (album.artwork as any).cover_image?.low) : undefined,
                    releaseDate: album.createdAt.toISOString(),
                    trackCount: album._count.tracks,
                    artist: {
                      id: artist.id,
                      name: artist.name,
                      verified: artist.verified,
                      profileImage: artist.profileImage
                    }
                  }
                },
                metadata: {
                  section: 'from_artists_you_follow',
                  itemType: 'album'
                }
              }));

              feedSections.from_artists_you_follow = [...feedSections.from_artists_you_follow, ...artistAlbumItems];
            }
          }
        }
      }

      // Get 'Dive right in' section - featured playlists and popular tracks
      if (feedType === 'all' || feedType === 'admin_curated') {
        // Get featured playlists
        const featuredPlaylists = await prisma.playlist.findMany({
          where: {
            isPublic: true,
            user: {
              isAdmin: true
            }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                isAdmin: true
              }
            },
            tracks: {
              include: {
                track: {
                  include: {
                    artist: {
                      select: {
                        id: true,
                        name: true,
                        verified: true,
                        profileImage: true
                      }
                    },
                    release: {
                      select: {
                        id: true,
                        title: true,
                        artwork: true
                      }
                    },
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

        const playlistItems: MusicFeedItem[] = featuredPlaylists.map(playlist => ({
          id: `playlist_${playlist.id}`,
          type: 'playlist',
          title: playlist.title,
          description: playlist.description || 'Made for you',
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
                  artworkUrl: pt.track.artworkUrl || (pt.track.release?.artwork && typeof pt.track.release.artwork === 'object' ? String((pt.track.release.artwork as any).cover_image?.high || (pt.track.release.artwork as any).cover_image?.medium || (pt.track.release.artwork as any).cover_image?.low) : undefined),
                  duration: pt.track.duration,
                  playCount: pt.track.playCount,
                  likeCount: pt.track._count.likes,
                artist: {
                  id: pt.track.artist.id,
                  name: pt.track.artist.name,
                  verified: pt.track.artist.verified,
                  profileImage: pt.track.artist.profileImage
                },
                album: pt.track.release ? {
                  id: pt.track.release.id,
                  title: pt.track.release.title,
                  artworkUrl: pt.track.release.artwork && typeof pt.track.release.artwork === 'object' ? String((pt.track.release.artwork as any).cover_image?.high || (pt.track.release.artwork as any).cover_image?.medium || (pt.track.release.artwork as any).cover_image?.low) : undefined
                } : undefined,
                genre: pt.track.genre,
                releaseDate: pt.track.createdAt.toISOString()
              }))
            }
          },
          metadata: {
            section: 'dive_in',
            itemType: 'playlist',
            playCount: playlist.tracks.reduce((sum, pt) => sum + (pt.track.playCount || 0), 0)
          }
        }));

        feedSections.dive_in = [...feedSections.dive_in, ...playlistItems];
      }

      // Get more tracks for 'Dive right in' section (popular tracks)
      if (feedType === 'all' || feedType === 'hot') {
        const popularTracks = await prisma.track.findMany({
          where: {
            isPublic: true,
            playCount: { gt: 100 },
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          include: {
            artist: {
              select: {
                id: true,
                name: true,
                verified: true,
                profileImage: true
              }
            },
            release: {
              select: {
                id: true,
                title: true,
                artwork: true
              }
            },
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

        const popularTrackItems: MusicFeedItem[] = popularTracks.map(track => ({
          id: `popular_track_${track.id}`,
          type: 'track',
          title: track.title,
          description: `${track.playCount.toLocaleString()} plays`,
          timestamp: track.createdAt.toISOString(),
          data: {
            track: {
              id: track.id,
                title: track.title,
                artworkUrl: track.artworkUrl || (track.release?.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined),
                duration: track.duration,
                playCount: track.playCount,
                likeCount: track._count.likes,
              artist: {
                id: track.artist.id,
                name: track.artist.name,
                verified: track.artist.verified,
                profileImage: track.artist.profileImage
              },
              album: track.release ? {
                    id: track.release.id,
                    title: track.release.title,
                    artworkUrl: track.release.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined
                  } : undefined,
              genre: track.genre,
              releaseDate: track.createdAt.toISOString()
            }
          },
          metadata: {
            section: 'dive_in',
            itemType: 'track',
            playCount: track.playCount
          }
        }));

        feedSections.dive_in = [...feedSections.dive_in, ...popularTrackItems];
      }

      // Get 'Fans of X also follow' section
      if (userId) {
        // Find a recent artist that the user follows
        const userFollows = await prisma.follow.findFirst({
          where: { followerId: userId },
          orderBy: { createdAt: 'desc' }
        });

        if (userFollows) {
          // Get the artist details
          const followedArtist = await prisma.artist.findUnique({
            where: { id: userFollows.followingId }
          });

          if (followedArtist) {
            // Find other popular artists that fans of this artist also follow
            // First get followers of this artist
            const artistFollowers = await prisma.follow.findMany({
              where: { followingId: followedArtist.id },
              select: { followerId: true }
            });

            const followerIds = artistFollowers.map(f => f.followerId);

            // Find artists that these followers also follow
            const similarArtistFollows = await prisma.follow.findMany({
              where: {
                followerId: { in: followerIds },
                followingId: { not: followedArtist.id } // Exclude the original artist
              },
              select: { followingId: true }
            });

            // Get unique artist IDs
            const similarArtistIds = [...new Set(similarArtistFollows.map(f => f.followingId))];

            // Get the artist details
            const similarArtists = await prisma.artist.findMany({
              where: { id: { in: similarArtistIds } },
              take: 3
            });

            const similarArtistItems: MusicFeedItem[] = await Promise.all(similarArtists.map(async (artist) => {
              // Count followers for each artist
              const followerCount = await prisma.follow.count({
                where: { followingId: artist.id }
              });

              return {
                id: `similar_artist_${artist.id}`,
                type: 'artist',
                title: artist.name,
                description: `${followerCount.toLocaleString()} followers`,
                timestamp: new Date().toISOString(),
                data: {
                  artist: {
                    id: artist.id,
                    name: artist.name,
                    profileImage: artist.profileImage,
                    verified: artist.verified,
                    followers: followerCount,
                    monthlyListeners: 0, // This would need to be calculated
                    isFollowing: false
                  }
                },
                metadata: {
                  section: 'fans_follow',
                  itemType: 'artist',
                  followers: followerCount,
                  reason: `Fans of ${followedArtist.name} also follow`
                }
              };
            }));

            feedSections.fans_follow = [...feedSections.fans_follow, ...similarArtistItems];
          }
        }
      }

      // Get 'Artists you follow' section
      if (userId && (feedType === 'all' || feedType === 'following')) {
        // Get all artists the user follows
        const userFollowedArtists = await prisma.follow.findMany({
          where: { followerId: userId },
          orderBy: { createdAt: 'desc' }
        });

        if (userFollowedArtists.length > 0) {
          const followedArtistIds = userFollowedArtists.map(follow => follow.followingId);

          // Get the artist details
          const followedArtists = await prisma.artist.findMany({
            where: { id: { in: followedArtistIds } },
            take: 10
          });

          const followedArtistItems: MusicFeedItem[] = await Promise.all(followedArtists.map(async (artist) => {
            // Count followers for each artist
            const followerCount = await prisma.follow.count({
              where: { followingId: artist.id }
            });

            return {
              id: `followed_artist_${artist.id}`,
              type: 'artist',
              title: artist.name,
              description: `${followerCount.toLocaleString()} followers`,
              timestamp: new Date().toISOString(),
              data: {
                artist: {
                  id: artist.id,
                  name: artist.name,
                  profileImage: artist.profileImage,
                  verified: artist.verified,
                  followers: followerCount,
                  monthlyListeners: artist.monthlyListeners || 0,
                  isFollowing: true
                }
              },
              metadata: {
                section: 'artists_you_follow',
                itemType: 'artist',
                followers: followerCount
              }
            };
          }));

          feedSections.artists_you_follow = [...feedSections.artists_you_follow, ...followedArtistItems];
        }
      }

      // Get 'Daily Mix' section - songs from all artists the user follows
      if (userId && (feedType === 'all' || feedType === 'daily_mix')) {
        // Get all artists the user follows
        const userFollowedArtists = await prisma.follow.findMany({
          where: { followerId: userId },
          select: { followingId: true }
        });

        if (userFollowedArtists.length > 0) {
          const followedArtistIds = userFollowedArtists.map(follow => follow.followingId);

          // Get a random selection of tracks from these artists
          // Using a more complex query to get a diverse mix of tracks
          const dailyMixTracks = await prisma.track.findMany({
            where: {
              artistId: { in: followedArtistIds },
              isPublic: true
            },
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  verified: true,
                  profileImage: true
                }
              },
              release: {
                select: {
                  id: true,
                  title: true,
                  artwork: true
                }
              },
              _count: {
                select: { likes: true }
              }
            },
            // Use a mix of ordering to get diverse results
            orderBy: [
              // Mix of popular and recent tracks
              { playCount: 'desc' },
              { createdAt: 'desc' }
            ],
            take: 20 // Get enough tracks for a good mix
          });

          // Shuffle the tracks to create a more random mix
          const shuffledTracks = [...dailyMixTracks].sort(() => Math.random() - 0.5);

          const dailyMixItems: MusicFeedItem[] = shuffledTracks.map(track => ({
            id: `daily_mix_${track.id}`,
            type: 'track',
            title: track.title,
            description: `By ${track.artist.name}`,
            timestamp: track.createdAt.toISOString(),
            data: {
              track: {
                id: track.id,
                title: track.title,
                artworkUrl: track.artworkUrl || (track.release?.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined),
                duration: track.duration,
                playCount: track.playCount,
                likeCount: track._count.likes,
                artist: {
                  id: track.artist.id,
                  name: track.artist.name,
                  verified: track.artist.verified,
                  profileImage: track.artist.profileImage
                },
                album: track.release ? {
            id: track.release.id,
            title: track.release.title,
            artworkUrl: track.release.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined
          } : undefined,
                genre: track.genre,
                releaseDate: track.createdAt.toISOString()
              }
            },
            metadata: {
              section: 'daily_mix',
              itemType: 'track',
              reason: 'From artists you follow'
            }
          }));

          feedSections.daily_mix = [...feedSections.daily_mix, ...dailyMixItems];
        }
      }

      // Combine all sections into feedItems
      Object.values(feedSections).forEach(section => {
        feedItems = [...feedItems, ...section];
      });

      // Sort feed items by timestamp within each section
      Object.keys(feedSections).forEach(sectionKey => {
        feedSections[sectionKey].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });

      // Apply pagination to the combined feed if needed
      const paginatedItems = feedItems.slice(skip, skip + take);

      res.status(200).json({
        success: true,
        data: {
          sections: {
            curated: feedSections.curated.slice(0, Math.min(feedSections.curated.length, 10)),
            dive_in: feedSections.dive_in.slice(0, Math.min(feedSections.dive_in.length, 10)),
            fans_follow: feedSections.fans_follow.slice(0, Math.min(feedSections.fans_follow.length, 10)),
            from_artists_you_follow: feedSections.from_artists_you_follow.slice(0, Math.min(feedSections.from_artists_you_follow.length, 10)),
            artists_you_follow: feedSections.artists_you_follow.slice(0, Math.min(feedSections.artists_you_follow.length, 10)),
            daily_mix: feedSections.daily_mix.slice(0, Math.min(feedSections.daily_mix.length, 10))
          },
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
  /**
   * Get Discovery Section
   * Includes charting by location, top songs worldwide, and top albums
   * Formatted to match the UI display with appropriate track durations and metadata
   */
  static async getDiscoverySection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { location = 'Nigeria' } = req.query;

      // Get charting songs by location (matching "Charting in Nigeria" from UI)
      const chartingByLocation = await prisma.track.findMany({
        where: {
          isPublic: true,
          playCount: { gt: 50 }
        },
        include: {
          artist: true,
          release: true,
          _count: {
            select: { likes: true }
          }
        },
        orderBy: { playCount: 'desc' },
        take: 6 // Showing 6 tracks in the UI
      });

      // Get top songs worldwide (matching "Top songs worldwide" from UI)
      const topSongsWorldwide = await prisma.track.findMany({
        where: {
          isPublic: true,
          playCount: { gt: 1000 }
        },
        include: {
          artist: true,
          release: true,
          _count: {
            select: { likes: true }
          }
        },
        orderBy: { playCount: 'desc' },
        take: 6 // Showing 6 tracks in the UI
      });

      // Get top albums (matching "Top albums" from UI)
      const topAlbums = await prisma.release.findMany({
        where: {
          type: 'album',
          tracks: {
            some: {
              playCount: { gt: 100 }
            }
          }
        },
        include: {
          artist: true,
          _count: {
            select: { tracks: true }
          }
        },
        orderBy: {
          tracks: {
            _count: 'desc'
          }
        },
        take: 3 // Showing 3 albums with ranking in the UI
      });

      // Format charting tracks to match UI display
      const formattedChartingTracks = chartingByLocation.map(track => ({
        id: track.id,
        title: track.title,
        artworkUrl: track.artworkUrl || (track.release?.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined),
        duration: track.duration,
        // Format duration as "2:46" as shown in UI
        formattedDuration: `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`,
        playCount: track.playCount,
        likeCount: track._count.likes,
        artist: {
          id: track.artist.id,
          name: track.artist.name,
          verified: track.artist.verified,
          profileImage: track.artist.profileImage
        },
        album: track.release ? {
            id: track.release.id,
            title: track.release.title,
            artworkUrl: track.release.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined
          } : undefined,
        genre: track.genre,
        releaseDate: track.createdAt.toISOString()
      }));

      // Format worldwide tracks to match UI display
      const formattedWorldwideTracks = topSongsWorldwide.map(track => ({
        id: track.id,
        title: track.title,
        artworkUrl: track.artworkUrl || (track.release?.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined),
        duration: track.duration,
        // Format duration as "2:46" as shown in UI
        formattedDuration: `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`,
        playCount: track.playCount,
        likeCount: track._count.likes,
        artist: {
          id: track.artist.id,
          name: track.artist.name,
          verified: track.artist.verified,
          profileImage: track.artist.profileImage
        },
        album: track.release ? {
          id: track.release.id,
          title: track.release.title,
          artworkUrl: track.release.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined
        } : undefined,
        genre: track.genre,
        releaseDate: track.createdAt.toISOString()
      }));

      // Format albums with ranking as shown in UI (#1, #2, etc.)
      const formattedTopAlbums = topAlbums.map((album, index) => ({
        id: album.id,
        title: album.title,
        artworkUrl: album.artwork && typeof album.artwork === 'object' ? String((album.artwork as any).cover_image?.high || (album.artwork as any).cover_image?.medium || (album.artwork as any).cover_image?.low) : undefined,
        ranking: `#${index + 1}`, // Add ranking as shown in UI
        releaseDate: album.releaseDate?.toISOString() || album.createdAt.toISOString(),
        trackCount: album._count.tracks,
        artist: {
          id: album.artist.id,
          name: album.artist.name,
          verified: album.artist.verified,
          profileImage: album.artist.profileImage
        }
      }));

      const discoveryData: DiscoverySection = {
        topSongsByLocation: {
          location: location as string,
          tracks: formattedChartingTracks
        },
        top10Albums: formattedTopAlbums,
        topSongsWorldwide: formattedWorldwideTracks,
        trending: {
          artists: [], // Not shown in the current UI view
          tracks: [], // Not shown in the current UI view
          albums: [] // Not shown in the current UI view
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
              { genre: { has: query } },
              { tags: { hasSome: [query as string] } }
            ],
            ...(genre && { genre: { has: genre } })
          },
          include: {
            artist: true,
            release: true,
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
            ...(genre && { genre: { has: genre } })
          }
        });

        searchResults.tracks = tracks.map(track => ({
          id: track.id,
          title: track.title,
          artworkUrl: track.artworkUrl || (track.release?.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined),
          duration: track.duration,
          playCount: track.playCount,
          likeCount: track._count.likes,
          artist: {
            id: track.artist.id,
            name: track.artist.name,
            verified: track.artist.verified,
            profileImage: track.artist.profileImage
          },
          album: track.release ? {
            id: track.release.id,
            title: track.release.title,
            artworkUrl: track.release.artwork && typeof track.release.artwork === 'object' ? String((track.release.artwork as any).cover_image?.high || (track.release.artwork as any).cover_image?.medium || (track.release.artwork as any).cover_image?.low) : undefined
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
              { genres: { some: { genre: { name: { contains: query as string, mode: 'insensitive' } } } } }
            ]
          },
          include: {
            tracks: {
              where: { isPublic: true },
              orderBy: { playCount: 'desc' },
              take: 1,
              include: {
                release: true
              }
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
              { genres: { some: { genre: { name: { contains: query as string, mode: 'insensitive' } } } } }
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
            artworkUrl: artist.tracks[0].artworkUrl || (artist.tracks[0].release?.artwork && typeof artist.tracks[0].release.artwork === 'object' ? String((artist.tracks[0].release.artwork as any).cover_image?.high || (artist.tracks[0].release.artwork as any).cover_image?.medium || (artist.tracks[0].release.artwork as any).cover_image?.low) : undefined),
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
        const albums = await prisma.release.findMany({
          where: {
            type: 'album',
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

        const totalAlbums = await prisma.release.count({
          where: {
            type: 'album',
            OR: [
              { title: { contains: query as string, mode: 'insensitive' } },
              { artist: { name: { contains: query as string, mode: 'insensitive' } } }
            ]
          }
        });

        searchResults.albums = albums.map(album => ({
          id: album.id,
          title: album.title,
          artworkUrl: album.artwork && typeof album.artwork === 'object' ? String((album.artwork as any).cover_image?.high || (album.artwork as any).cover_image?.medium || (album.artwork as any).cover_image?.low) : undefined,
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

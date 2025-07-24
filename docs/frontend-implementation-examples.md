# LOOOP Music Frontend Implementation Examples

## Table of Contents

1. [Introduction](#introduction)
2. [Home Feed Implementation Examples](#home-feed-implementation-examples)
3. [Discovery Section Implementation Examples](#discovery-section-implementation-examples)
4. [Search Implementation Examples](#search-implementation-examples)
5. [Common Components](#common-components)

## Introduction

This document provides practical implementation examples for the LOOOP Music frontend, complementing the main implementation guide. It includes code snippets, component structures, and best practices for implementing the home feed, discovery section, and search functionality.

## Home Feed Implementation Examples

### Fetching the Home Feed

```typescript
// Example using React and Axios
import axios from 'axios';
import { useState, useEffect } from 'react';
import { MusicFeedResponse } from '../types/feed.types';

const HomeFeed = () => {
  const [feedData, setFeedData] = useState<MusicFeedResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedType, setFeedType] = useState<string>('all');
  
  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get('http://localhost:3001/api/v1/music/feed', {
          headers,
          params: {
            feedType,
            page: 1,
            limit: 20
          }
        });
        
        setFeedData(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch feed data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeed();
  }, [feedType]);
  
  // Render feed sections
  return (
    <div className="home-feed">
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      
      {feedData && (
        <>
          {/* Curated Section */}
          <FeedSection 
            title="New Releases" 
            items={feedData.data.sections.curated} 
            seeAllLink="/new-releases" 
          />
          
          {/* Dive In Section */}
          <FeedSection 
            title="Dive Right In" 
            items={feedData.data.sections.dive_in} 
            seeAllLink="/popular" 
          />
          
          {/* Artists You Follow Section */}
          <FeedSection 
            title="Artists You Follow" 
            items={feedData.data.sections.artists_you_follow} 
            seeAllLink="/following/artists" 
          />
          
          {/* Daily Mix Section */}
          <FeedSection 
            title="Daily Mix" 
            items={feedData.data.sections.daily_mix} 
            seeAllLink="/daily-mix" 
          />
          
          {/* From Artists You Follow Section */}
          <FeedSection 
            title="From Artists You Follow" 
            items={feedData.data.sections.from_artists_you_follow} 
            seeAllLink="/following/content" 
          />
          
          {/* Fans Also Follow Section */}
          <FeedSection 
            title="Fans Also Follow" 
            items={feedData.data.sections.fans_follow} 
            seeAllLink="/recommended-artists" 
          />
        </>
      )}
    </div>
  );
};
```

### Feed Section Component

```typescript
import { MusicFeedItem } from '../types/feed.types';
import { Link } from 'react-router-dom';

interface FeedSectionProps {
  title: string;
  items: MusicFeedItem[];
  seeAllLink?: string;
}

const FeedSection = ({ title, items, seeAllLink }: FeedSectionProps) => {
  if (!items || items.length === 0) {
    return null; // Don't render empty sections
  }
  
  return (
    <section className="feed-section">
      <div className="section-header">
        <h2>{title}</h2>
        {seeAllLink && (
          <Link to={seeAllLink} className="see-all-link">
            See all
          </Link>
        )}
      </div>
      
      <div className="items-container">
        {items.map(item => (
          <FeedItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
};
```

### Feed Item Card Component

```typescript
import { MusicFeedItem } from '../types/feed.types';

interface FeedItemCardProps {
  item: MusicFeedItem;
}

const FeedItemCard = ({ item }: FeedItemCardProps) => {
  // Determine what type of content to render based on item.type and item.metadata.itemType
  const renderContent = () => {
    switch (item.type) {
      case 'track':
        return <TrackCard track={item.data.track!} />
      case 'album':
        return <AlbumCard album={item.data.album!} />
      case 'artist':
        return <ArtistCard artist={item.data.artist!} />
      case 'playlist':
        return <PlaylistCard playlist={item.data.playlist!} />
      default:
        return <GenericCard item={item} />
    }
  };
  
  return (
    <div className="feed-item-card">
      {renderContent()}
    </div>
  );
};
```

## Discovery Section Implementation Examples

### Fetching the Discovery Section

```typescript
// Example using React and Axios
import axios from 'axios';
import { useState, useEffect } from 'react';
import { DiscoverySectionResponse } from '../types/feed.types';

const DiscoveryPage = () => {
  const [discoveryData, setDiscoveryData] = useState<DiscoverySectionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<string>('Nigeria');
  
  useEffect(() => {
    const fetchDiscoveryData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const response = await axios.get('http://localhost:3001/api/v1/music/discover', {
          headers,
          params: { location }
        });
        
        setDiscoveryData(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch discovery data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDiscoveryData();
  }, [location]);
  
  // Render discovery sections
  return (
    <div className="discovery-page">
      <h1>Discover</h1>
      
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      
      {discoveryData && (
        <>
          {/* Location Selector */}
          <div className="location-selector">
            <label>Location:</label>
            <select 
              value={location} 
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="Nigeria">Nigeria</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              {/* Add more locations */}
            </select>
          </div>
          
          {/* Charting in Location Section */}
          <section className="discovery-section">
            <div className="section-header">
              <h2>Charting in {discoveryData.data.topSongsByLocation.location}</h2>
              <Link to="/charts" className="see-all-link">See all</Link>
            </div>
            
            <div className="tracks-list">
              {discoveryData.data.topSongsByLocation.tracks.map(track => (
                <TrackListItem key={track.id} track={track} />
              ))}
            </div>
          </section>
          
          {/* Top Songs Worldwide Section */}
          <section className="discovery-section">
            <div className="section-header">
              <h2>Top songs worldwide</h2>
              <Link to="/charts/worldwide" className="see-all-link">See all</Link>
            </div>
            
            <div className="tracks-list">
              {discoveryData.data.topSongsWorldwide.map(track => (
                <TrackListItem key={track.id} track={track} />
              ))}
            </div>
          </section>
          
          {/* Top Albums Section */}
          <section className="discovery-section">
            <div className="section-header">
              <h2>Top albums</h2>
              <Link to="/charts/albums" className="see-all-link">See all</Link>
            </div>
            
            <div className="albums-grid">
              {discoveryData.data.top10Albums.map(album => (
                <AlbumCard key={album.id} album={album} showRanking={true} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
```

### Track List Item Component

```typescript
import { FeedTrack } from '../types/feed.types';
import { PlayButton } from '../components/PlayButton';

interface TrackListItemProps {
  track: FeedTrack;
}

const TrackListItem = ({ track }: TrackListItemProps) => {
  return (
    <div className="track-list-item">
      <div className="track-artwork">
        <img src={track.artworkUrl || '/default-track.png'} alt={track.title} />
        <PlayButton trackId={track.id} />
      </div>
      
      <div className="track-info">
        <h3 className="track-title">{track.title}</h3>
        <p className="track-artist">{track.artist.name}</p>
      </div>
      
      <div className="track-duration">
        {track.formattedDuration || `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`}
      </div>
    </div>
  );
};
```

### Album Card Component with Ranking

```typescript
import { FeedAlbum } from '../types/feed.types';
import { Link } from 'react-router-dom';

interface AlbumCardProps {
  album: FeedAlbum;
  showRanking?: boolean;
}

const AlbumCard = ({ album, showRanking = false }: AlbumCardProps) => {
  return (
    <div className="album-card">
      <div className="album-artwork">
        <img src={album.artworkUrl || '/default-album.png'} alt={album.title} />
        {showRanking && album.ranking && (
          <div className="album-ranking">{album.ranking}</div>
        )}
      </div>
      
      <div className="album-info">
        <h3 className="album-title">
          <Link to={`/albums/${album.id}`}>{album.title}</Link>
        </h3>
        <p className="album-artist">
          <Link to={`/artists/${album.artist.id}`}>{album.artist.name}</Link>
        </p>
      </div>
    </div>
  );
};
```

## Search Implementation Examples

### Search Component

```typescript
import { useState } from 'react';
import axios from 'axios';
import { SearchResults } from '../types/feed.types';

const SearchPage = () => {
  const [query, setQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<string>('all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get('http://localhost:3001/api/v1/music/search', {
        headers,
        params: {
          query,
          type: searchType,
          limit: 10,
          page: 1
        }
      });
      
      setResults(response.data.data.results);
      setError(null);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="search-page">
      <h1>Search</h1>
      
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artists, songs, albums and playlists"
          className="search-input"
        />
        
        <select 
          value={searchType} 
          onChange={(e) => setSearchType(e.target.value)}
          className="search-type-selector"
        >
          <option value="all">All</option>
          <option value="tracks">Tracks</option>
          <option value="artists">Artists</option>
          <option value="albums">Albums</option>
          <option value="playlists">Playlists</option>
          <option value="users">Users</option>
          <option value="communities">Communities</option>
        </select>
        
        <button type="submit" className="search-button">
          Search
        </button>
      </form>
      
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      
      {results && (
        <div className="search-results">
          {/* Tracks Results */}
          {results.tracks.length > 0 && (
            <section className="results-section">
              <div className="section-header">
                <h2>Tracks</h2>
                {results.total.tracks > results.tracks.length && (
                  <Link to={`/search/tracks?q=${encodeURIComponent(query)}`} className="see-all-link">
                    See all ({results.total.tracks})
                  </Link>
                )}
              </div>
              
              <div className="tracks-list">
                {results.tracks.map(track => (
                  <TrackListItem key={track.id} track={track} />
                ))}
              </div>
            </section>
          )}
          
          {/* Artists Results */}
          {results.artists.length > 0 && (
            <section className="results-section">
              <div className="section-header">
                <h2>Artists</h2>
                {results.total.artists > results.artists.length && (
                  <Link to={`/search/artists?q=${encodeURIComponent(query)}`} className="see-all-link">
                    See all ({results.total.artists})
                  </Link>
                )}
              </div>
              
              <div className="artists-grid">
                {results.artists.map(artist => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </section>
          )}
          
          {/* Albums Results */}
          {results.albums.length > 0 && (
            <section className="results-section">
              <div className="section-header">
                <h2>Albums</h2>
                {results.total.albums > results.albums.length && (
                  <Link to={`/search/albums?q=${encodeURIComponent(query)}`} className="see-all-link">
                    See all ({results.total.albums})
                  </Link>
                )}
              </div>
              
              <div className="albums-grid">
                {results.albums.map(album => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </section>
          )}
          
          {/* Playlists Results */}
          {results.playlists.length > 0 && (
            <section className="results-section">
              <div className="section-header">
                <h2>Playlists</h2>
                {results.total.playlists > results.playlists.length && (
                  <Link to={`/search/playlists?q=${encodeURIComponent(query)}`} className="see-all-link">
                    See all ({results.total.playlists})
                  </Link>
                )}
              </div>
              
              <div className="playlists-grid">
                {results.playlists.map(playlist => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            </section>
          )}
          
          {/* No Results */}
          {Object.values(results.total).reduce((a, b) => a + b, 0) === 0 && (
            <div className="no-results">
              <p>No results found for "{query}"</p>
              <p>Try different keywords or check your spelling</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

## Common Components

### Play Button Component

```typescript
import { useState } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

interface PlayButtonProps {
  trackId: string;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const PlayButton = ({ trackId, size = 'medium', showText = false }: PlayButtonProps) => {
  const { currentTrackId, isPlaying, playTrack, pauseTrack } = useAudioPlayer();
  const isCurrentTrack = currentTrackId === trackId;
  
  const handleClick = () => {
    if (isCurrentTrack && isPlaying) {
      pauseTrack();
    } else {
      playTrack(trackId);
    }
  };
  
  return (
    <button 
      className={`play-button ${size} ${isCurrentTrack && isPlaying ? 'playing' : ''}`}
      onClick={handleClick}
      aria-label={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
    >
      <span className="icon">
        {isCurrentTrack && isPlaying ? '❚❚' : '▶'}
      </span>
      {showText && (
        <span className="text">
          {isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
        </span>
      )}
    </button>
  );
};
```

### Artist Card Component

```typescript
import { FeedArtist } from '../types/feed.types';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';
import axios from 'axios';

interface ArtistCardProps {
  artist: FeedArtist;
}

const ArtistCard = ({ artist }: ArtistCardProps) => {
  const { isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState<boolean>(artist.isFollowing || false);
  const [followersCount, setFollowersCount] = useState<number>(artist.followers);
  
  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (isFollowing) {
        // Unfollow
        await axios.delete(`http://localhost:3001/api/v1/artists/${artist.id}/follow`, { headers });
        setFollowersCount(prev => prev - 1);
      } else {
        // Follow
        await axios.post(`http://localhost:3001/api/v1/artists/${artist.id}/follow`, {}, { headers });
        setFollowersCount(prev => prev + 1);
      }
      
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Failed to toggle follow status:', err);
    }
  };
  
  return (
    <div className="artist-card">
      <div className="artist-image">
        <Link to={`/artists/${artist.id}`}>
          <img 
            src={artist.profileImage || '/default-artist.png'} 
            alt={artist.name} 
          />
        </Link>
      </div>
      
      <div className="artist-info">
        <h3 className="artist-name">
          <Link to={`/artists/${artist.id}`}>
            {artist.name}
            {artist.verified && <span className="verified-badge">✓</span>}
          </Link>
        </h3>
        
        <p className="artist-followers">
          {followersCount.toLocaleString()} followers
        </p>
      </div>
      
      <button 
        className={`follow-button ${isFollowing ? 'following' : ''}`}
        onClick={handleFollowToggle}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  );
};
```

These examples provide a starting point for implementing the frontend components needed to interact with the LOOOP Music API. Adapt them to your specific UI design and state management approach as needed.
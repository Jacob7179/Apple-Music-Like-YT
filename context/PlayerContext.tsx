import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Song, PlayerState, RepeatMode, Playlist } from '../types';
import { INITIAL_SONGS } from '../constants';

interface PlayerContextType {
  state: PlayerState;
  playSong: (song: Song, newQueue?: Song[]) => void;
  togglePlay: () => void;
  setVolume: (vol: number) => void;
  setQueue: (songs: Song[]) => void;
  playNext: (forceIndex?: number) => void;
  playPrevious: () => void;
  updateProgress: (currentTime: number, duration: number) => void;
  toggleLyrics: () => void;
  toggleQueue: () => void;
  toggleLike: (song: Song) => void;
  seekTo: (time: number) => void;
  clearSeek: () => void;
  markUnplayable: (videoId: string) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  // Playlist Actions
  createPlaylist: (title: string, initialSongs?: Song[]) => void;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, title: string) => void;
  addSongToPlaylist: (playlistId: string, song: Song) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  toggleFollowArtist: (artist: string) => void;
  // Settings Actions
  updateArtistMapping: (mapping: Record<string, string>) => void;
  resolveArtist: (rawName: string) => string;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PlayerState>(() => {
    // Lazy initialization to prevent overwriting localStorage with empty defaults
    let initialLikes: Song[] = [];
    let initialPlaylists: Playlist[] = [];
    let initialFollows: string[] = [];
    let initialMapping: Record<string, string> = {};

    try {
      if (typeof window !== 'undefined') {
        const savedLikes = localStorage.getItem('uMusic_likedSongs');
        const savedPlaylists = localStorage.getItem('uMusic_playlists');
        const savedFollows = localStorage.getItem('uMusic_followedArtists');
        const savedMapping = localStorage.getItem('uMusic_artistMapping');

        if (savedLikes) {
          initialLikes = JSON.parse(savedLikes);
        }

        if (savedPlaylists) {
          initialPlaylists = JSON.parse(savedPlaylists);
          // Clean up old default playlists if they exist, keep only custom ones or restored ones
          initialPlaylists = initialPlaylists.filter(p => p.isCustom);
        }

        if (savedFollows) {
          initialFollows = JSON.parse(savedFollows);
        }

        if (savedMapping) {
          initialMapping = JSON.parse(savedMapping);
        }
      }
    } catch (e) {
      console.error("Failed to load data from local storage", e);
    }

    return {
      currentSong: null,
      isPlaying: false,
      queue: [],
      volume: 80,
      progress: 0,
      duration: 0,
      currentTime: 0,
      isLyricsVisible: false,
      isQueueVisible: false,
      likedSongs: initialLikes,
      playlists: initialPlaylists,
      seekTime: null,
      unplayableIds: [],
      repeatMode: RepeatMode.OFF,
      isShuffle: false,
      followedArtists: initialFollows,
      artistMapping: initialMapping
    };
  });

  // Save playlists whenever they change
  useEffect(() => {
      if (state.playlists) {
          localStorage.setItem('uMusic_playlists', JSON.stringify(state.playlists));
      }
  }, [state.playlists]);

  // Save liked songs
  useEffect(() => {
      if (state.likedSongs) {
          localStorage.setItem('uMusic_likedSongs', JSON.stringify(state.likedSongs));
      }
  }, [state.likedSongs]);

  // Save followed artists
  useEffect(() => {
      if (state.followedArtists) {
          localStorage.setItem('uMusic_followedArtists', JSON.stringify(state.followedArtists));
      }
  }, [state.followedArtists]);

  // Save artist mapping
  useEffect(() => {
    if (state.artistMapping) {
        localStorage.setItem('uMusic_artistMapping', JSON.stringify(state.artistMapping));
    }
  }, [state.artistMapping]);

  const playSong = useCallback((song: Song, newQueue?: Song[]) => {
    setState(prev => {
        let queue = prev.queue;
        if (newQueue) {
            queue = newQueue.filter((item, index, self) =>
                index === self.findIndex((t) => t.id === item.id)
            );
        } else if (!prev.queue.find(s => s.id === song.id)) {
            queue = [song, ...prev.queue];
        }

        return {
            ...prev,
            currentSong: song,
            isPlaying: true,
            queue
        };
    });
  }, []);

  const togglePlay = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);
  
  const setIsPlaying = useCallback((isPlaying: boolean) => {
    setState(prev => ({ ...prev, isPlaying }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
  }, []);

  const setQueue = useCallback((newQueue: Song[]) => {
    const uniqueQueue = newQueue.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
    );
    setState(prev => ({ ...prev, queue: uniqueQueue }));
  }, []);

  const playNext = useCallback(() => {
    setState(prev => {
      if (!prev.currentSong || prev.queue.length === 0) return prev;
      
      let nextIndex = -1;
      const currentIndex = prev.queue.findIndex(s => s.id === prev.currentSong?.id);

      if (prev.isShuffle) {
          nextIndex = Math.floor(Math.random() * prev.queue.length);
          if (prev.queue.length > 1 && nextIndex === currentIndex) {
              nextIndex = (nextIndex + 1) % prev.queue.length;
          }
      } else {
          nextIndex = currentIndex + 1;
      }

      if (nextIndex >= prev.queue.length) {
          if (prev.repeatMode === RepeatMode.ALL) {
              nextIndex = 0;
          } else {
              // Even if we stop, we keep state ready
              return { ...prev, isPlaying: false, progress: 0, currentTime: 0 };
          }
      }

      return {
        ...prev,
        currentSong: prev.queue[nextIndex],
        isPlaying: true
      };
    });
  }, []);

  const playPrevious = useCallback(() => {
    setState(prev => {
      if (!prev.currentSong || prev.queue.length === 0) return prev;
      
      if (prev.currentTime > 3) {
          return { ...prev, seekTime: 0, isPlaying: true };
      }

      let prevIndex = -1;
      const currentIndex = prev.queue.findIndex(s => s.id === prev.currentSong?.id);

      if (prev.isShuffle) {
           prevIndex = Math.floor(Math.random() * prev.queue.length);
      } else {
           prevIndex = currentIndex - 1;
      }

      if (prevIndex < 0) {
          if (prev.repeatMode === RepeatMode.ALL) {
              prevIndex = prev.queue.length - 1;
          } else {
              prevIndex = 0;
          }
      }

      return {
        ...prev,
        currentSong: prev.queue[prevIndex],
        isPlaying: true
      };
    });
  }, []);

  const updateProgress = useCallback((currentTime: number, duration: number) => {
    setState(prev => ({
        ...prev,
        currentTime,
        duration,
        progress: duration > 0 ? (currentTime / duration) * 100 : 0
    }));
  }, []);

  const toggleLyrics = useCallback(() => {
    setState(prev => ({ ...prev, isLyricsVisible: !prev.isLyricsVisible }));
  }, []);

  const toggleQueue = useCallback(() => {
    setState(prev => ({ ...prev, isQueueVisible: !prev.isQueueVisible }));
  }, []);

  const toggleLike = useCallback((song: Song) => {
    setState(prev => {
        const isLiked = prev.likedSongs.some(s => s.id === song.id);
        let newLikedSongs;
        
        if (isLiked) {
            newLikedSongs = prev.likedSongs.filter(s => s.id !== song.id);
        } else {
            newLikedSongs = [song, ...prev.likedSongs];
        }
        
        return { ...prev, likedSongs: newLikedSongs };
    });
  }, []);

  const toggleFollowArtist = useCallback((artist: string) => {
      setState(prev => {
          const isFollowed = prev.followedArtists.includes(artist);
          let newFollows;
          if (isFollowed) {
              newFollows = prev.followedArtists.filter(a => a !== artist);
          } else {
              newFollows = [...prev.followedArtists, artist];
          }
          return { ...prev, followedArtists: newFollows };
      });
  }, []);

  const seekTo = useCallback((time: number) => {
      setState(prev => ({ ...prev, seekTime: time }));
  }, []);

  const clearSeek = useCallback(() => {
      setState(prev => ({ ...prev, seekTime: null }));
  }, []);

  const markUnplayable = useCallback((videoId: string) => {
      setState(prev => ({
          ...prev,
          unplayableIds: [...prev.unplayableIds, videoId]
      }));
  }, []);

  const toggleRepeat = useCallback(() => {
      setState(prev => {
          let nextMode = RepeatMode.OFF;
          if (prev.repeatMode === RepeatMode.OFF) nextMode = RepeatMode.ALL;
          else if (prev.repeatMode === RepeatMode.ALL) nextMode = RepeatMode.ONE;
          else nextMode = RepeatMode.OFF;
          
          return { ...prev, repeatMode: nextMode };
      });
  }, []);

  const toggleShuffle = useCallback(() => {
      setState(prev => ({ ...prev, isShuffle: !prev.isShuffle }));
  }, []);

  // Playlist Management
  const createPlaylist = useCallback((title: string, initialSongs: Song[] = []) => {
      const newPlaylist: Playlist = {
          id: `pl_${Date.now()}`,
          title,
          isCustom: true,
          songs: initialSongs,
          description: "My Playlist",
          cover: initialSongs.length > 0 ? initialSongs[0].thumbnail : `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=random`
      };
      setState(prev => ({ ...prev, playlists: [...prev.playlists, newPlaylist] }));
  }, []);

  const deletePlaylist = useCallback((id: string) => {
      setState(prev => ({ ...prev, playlists: prev.playlists.filter(p => p.id !== id) }));
  }, []);

  const renamePlaylist = useCallback((id: string, title: string) => {
      setState(prev => ({
          ...prev,
          playlists: prev.playlists.map(p => p.id === id ? { ...p, title } : p)
      }));
  }, []);

  const addSongToPlaylist = useCallback((playlistId: string, song: Song) => {
      setState(prev => {
          const updatedPlaylists = prev.playlists.map(p => {
              if (p.id === playlistId) {
                  // Check duplication
                  if (p.songs.find(s => s.id === song.id)) return p;
                  
                  // Use first song art as cover if it's default
                  let newCover = p.cover;
                  if (p.songs.length === 0) newCover = song.thumbnail;

                  return { ...p, songs: [...p.songs, song], cover: newCover };
              }
              return p;
          });
          return { ...prev, playlists: updatedPlaylists };
      });
  }, []);

  const removeSongFromPlaylist = useCallback((playlistId: string, songId: string) => {
      setState(prev => ({
          ...prev,
          playlists: prev.playlists.map(p => {
              if (p.id === playlistId) {
                  return { ...p, songs: p.songs.filter(s => s.id !== songId) };
              }
              return p;
          })
      }));
  }, []);

  const updateArtistMapping = useCallback((mapping: Record<string, string>) => {
    setState(prev => ({ ...prev, artistMapping: mapping }));
  }, []);

  const resolveArtist = useCallback((rawName: string) => {
    return state.artistMapping[rawName] || rawName;
  }, [state.artistMapping]);

  return (
    <PlayerContext.Provider value={{ 
        state, playSong, togglePlay, setVolume, setQueue, playNext, playPrevious, 
        updateProgress, toggleLyrics, toggleQueue, toggleLike, seekTo, clearSeek, 
        markUnplayable, toggleRepeat, toggleShuffle,
        createPlaylist, deletePlaylist, renamePlaylist, addSongToPlaylist, removeSongFromPlaylist,
        setIsPlaying, toggleFollowArtist, updateArtistMapping, resolveArtist
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
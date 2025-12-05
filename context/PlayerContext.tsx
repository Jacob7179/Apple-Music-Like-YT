

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Song, PlayerState } from '../types';

interface PlayerContextType {
  state: PlayerState;
  playSong: (song: Song, newQueue?: Song[]) => void;
  togglePlay: () => void;
  setVolume: (vol: number) => void;
  setQueue: (songs: Song[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  updateProgress: (currentTime: number, duration: number) => void;
  toggleLyrics: () => void;
  toggleQueue: () => void;
  toggleLike: (song: Song) => void;
  seekTo: (time: number) => void;
  clearSeek: () => void;
  markUnplayable: (videoId: string) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    queue: [],
    volume: 80,
    progress: 0,
    duration: 0,
    currentTime: 0,
    isLyricsVisible: false,
    isQueueVisible: false,
    likedSongs: [],
    seekTime: null,
    unplayableIds: []
  });

  // Load liked songs from local storage on mount
  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem('uMusic_likedSongs');
      if (savedLikes) {
        const parsedLikes = JSON.parse(savedLikes);
        if (Array.isArray(parsedLikes)) {
            setState(prev => ({ ...prev, likedSongs: parsedLikes }));
        }
      }
    } catch (e) {
      console.error("Failed to load liked songs from local storage", e);
    }
  }, []);

  const playSong = useCallback((song: Song, newQueue?: Song[]) => {
    setState(prev => {
        let queue = prev.queue;
        if (newQueue) {
            // Deduplicate newQueue based on unique videoId
            queue = newQueue.filter((item, index, self) =>
                index === self.findIndex((t) => t.id === item.id)
            );
        } else if (!prev.queue.find(s => s.id === song.id)) {
            // Add to queue if not present
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

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
  }, []);

  const setQueue = useCallback((newQueue: Song[]) => {
    // Deduplicate when setting queue directly
    const uniqueQueue = newQueue.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
    );
    setState(prev => ({ ...prev, queue: uniqueQueue }));
  }, []);

  const playNext = useCallback(() => {
    setState(prev => {
      if (!prev.currentSong || prev.queue.length === 0) return prev;
      
      const currentIndex = prev.queue.findIndex(s => s.id === prev.currentSong?.id);
      let nextIndex = (currentIndex + 1) % prev.queue.length;
      
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
      const currentIndex = prev.queue.findIndex(s => s.id === prev.currentSong?.id);
      const prevIndex = (currentIndex - 1 + prev.queue.length) % prev.queue.length;
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
            // Add to start
            newLikedSongs = [song, ...prev.likedSongs];
        }
        
        // Save to local storage
        try {
            localStorage.setItem('uMusic_likedSongs', JSON.stringify(newLikedSongs));
        } catch (e) {
            console.error("Failed to save likes", e);
        }
        
        return { ...prev, likedSongs: newLikedSongs };
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

  return (
    <PlayerContext.Provider value={{ state, playSong, togglePlay, setVolume, setQueue, playNext, playPrevious, updateProgress, toggleLyrics, toggleQueue, toggleLike, seekTo, clearSeek, markUnplayable }}>
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
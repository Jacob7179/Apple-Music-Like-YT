
import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Icons } from './Icons';

// Fix: Extend Window interface for YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

// Helper to format time
const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const PlayerBar: React.FC = () => {
  const { state, togglePlay, setVolume, playNext, playPrevious, updateProgress, toggleLyrics, toggleQueue, toggleLike, seekTo, clearSeek, markUnplayable } = usePlayer();
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);

  // Load YouTube Iframe API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsPlayerReady(true);
      return;
    }

    if (!window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = () => {
        setIsPlayerReady(true);
      };
    }

    if (!document.getElementById('yt-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-api-script';
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize Player & Handle Song Changes
  useEffect(() => {
    if (!isPlayerReady || !state.currentSong) return;

    if (!playerRef.current) {
      playerRef.current = new window.YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: state.currentSong.videoId,
        playerVars: {
          'playsinline': 1,
          'controls': 0,
          'autoplay': 1,
          'disablekb': 1,
          'fs': 0,
          'enablejsapi': 1,
          'origin': window.location.origin,
          'rel': 0,
          'iv_load_policy': 3 // Hide annotations
        },
        events: {
          'onReady': (event: any) => {
             event.target.setVolume(state.volume);
             if (state.isPlaying) {
               event.target.playVideo();
             }
          },
          'onStateChange': (event: any) => {
             // YT.PlayerState.ENDED = 0
             if (event.data === 0) {
                playNext();
             }
          },
          'onError': (event: any) => {
              console.warn("YouTube Player Error:", event.data);
              // Error 150/101 = Restricted
              if (state.currentSong) {
                  markUnplayable(state.currentSong.videoId);
                  console.log(`Marking ${state.currentSong.title} as unplayable and skipping.`);
                  // Short delay then skip
                  setTimeout(() => playNext(), 500);
              }
          }
        }
      });
    } else {
        const currentVideoId = typeof playerRef.current.getVideoData === 'function' 
            ? playerRef.current.getVideoData().video_id 
            : null;
        
        if (currentVideoId !== state.currentSong.videoId) {
            playerRef.current.loadVideoById(state.currentSong.videoId);
        }
    }
  }, [isPlayerReady, state.currentSong]); 

  // Control Playback State (Pause/Play)
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      if (state.isPlaying) {
        const playerState = playerRef.current.getPlayerState();
        if (playerState !== 1 && playerState !== 3) { 
             playerRef.current.playVideo();
        }
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [state.isPlaying, state.currentSong]);

  // Volume Control
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
        playerRef.current.setVolume(state.volume);
        setIsMuted(state.volume === 0);
    }
  }, [state.volume]);

  // Handle Seek Requests from Context (e.g., from LyricsOverlay)
  useEffect(() => {
      if (state.seekTime !== null && playerRef.current && typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(state.seekTime, true);
          clearSeek();
      }
  }, [state.seekTime, clearSeek]);

  // Progress Interval
  useEffect(() => {
    const interval = setInterval(() => {
      // Don't update from player if user is dragging
      if (!isDragging && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const pState = playerRef.current.getPlayerState();
        if (pState === 1 || pState === 3) {
            const currentTime = playerRef.current.getCurrentTime();
            const duration = playerRef.current.getDuration();
            if (currentTime && duration) {
                updateProgress(currentTime, duration);
            }
        }
      }
    }, 200); // 200ms for smoother updates
    return () => clearInterval(interval);
  }, [updateProgress, isDragging]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      setLocalProgress(val);
      if (!isDragging) {
          // If not dragging (e.g. click), seek immediately
          const seekToTime = (val / 100) * state.duration;
          seekTo(seekToTime);
      }
  };

  const handleSeekStart = () => {
      setIsDragging(true);
      setLocalProgress(state.progress);
  };

  const handleSeekEnd = (e: React.MouseEvent | React.TouchEvent) => {
      setIsDragging(false);
      const seekToTime = (localProgress / 100) * state.duration;
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(seekToTime, true);
          updateProgress(seekToTime, state.duration);
      }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  const isLiked = state.currentSong && state.likedSongs.some(s => s.id === state.currentSong?.id);
  
  // Use local progress while dragging, otherwise state progress
  const displayProgress = isDragging ? localProgress : state.progress;

  return (
    <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 h-[64px] md:h-[88px] bg-[#1e1e1e]/95 backdrop-blur-xl border-t border-white/5 z-[100] flex items-center justify-between px-4 md:px-6 select-none shadow-[0_-5px_20px_rgba(0,0,0,0.3)] transition-all duration-300">
      <div className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden -z-10">
         <div id="yt-player"></div>
      </div>

      {/* Mobile Progress Bar (Thin line at top) */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-[2px] bg-white/10">
         <div className="h-full bg-[#fa2d48]" style={{ width: `${displayProgress}%` }}></div>
      </div>

      {/* Track Info */}
      <div 
        className="flex items-center flex-1 md:w-[30%] md:min-w-[200px] overflow-hidden cursor-pointer md:cursor-default"
        onClick={() => window.innerWidth < 768 && toggleLyrics()}
      >
        {state.currentSong ? (
          <>
            <div className="relative group flex-shrink-0">
               <img 
                src={state.currentSong.thumbnail} 
                alt="Album Art" 
                className={`w-10 h-10 md:w-12 md:h-12 rounded-[4px] shadow-sm object-cover bg-neutral-800 border border-white/5`}
               />
               <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center rounded-[4px] cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleLyrics(); }}>
                   <Icons.SkipForward className="-rotate-90 text-white" size={16} />
               </div>
            </div>
            <div className="ml-3 flex flex-col justify-center overflow-hidden mr-4">
              <span className="text-[13px] font-medium text-white/90 truncate cursor-default leading-tight" title={state.currentSong.title}>
                {state.currentSong.title}
              </span>
              <span className="text-[11px] text-gray-400 truncate cursor-pointer hover:underline hover:text-white/80 transition mt-0.5">
                {state.currentSong.artist}
              </span>
            </div>
            {/* Desktop Like Button */}
             <button 
                onClick={(e) => { e.stopPropagation(); state.currentSong && toggleLike(state.currentSong); }}
                className={`hidden md:block p-1.5 rounded-full hover:bg-white/10 transition-all active:scale-95 ${isLiked ? 'text-[#fa2d48]' : 'text-gray-500'}`}
            >
                <Icons.Heart size={16} fill={isLiked ? "currentColor" : "none"} />
            </button>
          </>
        ) : (
            <div className="flex items-center gap-3 opacity-30">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-[4px]"></div>
                <div className="flex items-center">
                    <Icons.Music size={20} className="text-white" />
                </div>
            </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="flex md:hidden items-center space-x-4 pr-1">
         <button 
            onClick={togglePlay} 
            disabled={!state.currentSong}
            className={`p-2 text-white transition ${!state.currentSong ? 'opacity-50' : ''}`}
         >
             {state.isPlaying ? <Icons.Pause fill="currentColor" size={24} /> : <Icons.Play fill="currentColor" size={24} />}
         </button>
         <button 
            onClick={playNext}
            disabled={!state.currentSong}
            className="text-gray-300 active:text-white"
         >
             <Icons.SkipForward fill="currentColor" size={26} />
         </button>
      </div>

      {/* Desktop Controls */}
      <div className="hidden md:flex flex-col items-center w-[40%] max-w-xl">
        <div className="flex items-center space-x-5 mb-1.5">
            <button className="text-gray-400 hover:text-white transition active:scale-95 p-2 rounded-lg hover:bg-white/5">
                <Icons.Shuffle size={16} />
            </button>
            <button 
                onClick={playPrevious} 
                className="text-gray-200 hover:text-white transition active:scale-90"
                disabled={!state.currentSong}
            >
                <Icons.SkipBack fill="currentColor" size={22} />
            </button>
            <button 
                onClick={togglePlay} 
                disabled={!state.currentSong}
                className={`w-[38px] h-[38px] flex items-center justify-center bg-white rounded-md text-black hover:scale-105 active:scale-95 transition shadow-sm ${!state.currentSong ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {state.isPlaying ? <Icons.Pause fill="currentColor" size={20} /> : <Icons.Play fill="currentColor" className="ml-0.5" size={20} />}
            </button>
            <button 
                onClick={playNext} 
                className="text-gray-200 hover:text-white transition active:scale-90"
                disabled={!state.currentSong}
            >
                <Icons.SkipForward fill="currentColor" size={22} />
            </button>
            <button className="text-gray-400 hover:text-white transition active:scale-95 p-2 rounded-lg hover:bg-white/5">
                <Icons.Repeat size={16} />
            </button>
        </div>
        
        {/* Progress Bar Group */}
        <div className="w-full flex items-center space-x-2 text-[10px] text-gray-400 font-medium group">
            <span className="w-8 text-right font-variant-numeric tabular-nums">{formatTime(state.currentTime)}</span>
            <div className="flex-1 h-[3px] bg-[#3a3a3c] rounded-full relative overflow-visible cursor-pointer group/slider">
                 <div 
                    className="absolute top-0 left-0 h-full bg-[#8e8e93] group-hover/slider:bg-[#fa2d48] rounded-full transition-colors"
                    style={{ width: `${displayProgress}%` }}
                 ></div>
                 <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={displayProgress || 0}
                    onChange={handleSeekChange}
                    onMouseDown={handleSeekStart}
                    onMouseUp={handleSeekEnd}
                    onTouchStart={handleSeekStart}
                    onTouchEnd={handleSeekEnd}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
            </div>
            <span className="w-8 font-variant-numeric tabular-nums">{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Desktop Volume & Extras */}
      <div className="hidden md:flex items-center justify-end w-[30%] space-x-1">
        <button 
            className={`transition p-2 rounded-md ${state.isLyricsVisible ? 'text-white bg-white/20' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            onClick={toggleLyrics}
            title="Lyrics"
        >
            <Icons.MessageSquareQuote size={18} fill={state.isLyricsVisible ? "currentColor" : "none"} />
        </button>
        
        <div className="flex items-center w-24 group relative px-2">
            <button onClick={() => setVolume(isMuted ? 50 : 0)} className="text-gray-400 mr-2 group-hover:text-white transition">
                {isMuted ? <Icons.VolumeX size={16} /> : <Icons.Volume2 size={16} />}
            </button>
            <input 
                type="range" 
                min="0" 
                max="100" 
                value={state.volume}
                onChange={handleVolumeChange}
                className="w-full h-[3px] bg-[#3a3a3c] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100"
                style={{
                    background: `linear-gradient(to right, #ffffff ${state.volume}%, #3a3a3c ${state.volume}%)`
                }}
            />
        </div>
        <button 
            onClick={toggleQueue} 
            className={`transition p-2 rounded-md ${state.isQueueVisible ? 'text-[#fa2d48] bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
        >
            <Icons.ListMusic size={18} />
        </button>
      </div>
    </div>
  );
};

export default PlayerBar;

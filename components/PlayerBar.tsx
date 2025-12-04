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
  const { state, togglePlay, setVolume, playNext, playPrevious, updateProgress, toggleLyrics, toggleLike } = usePlayer();
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

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
              // Error 150/101/153 = Restricted or Not Found.
              // Skip to next song automatically.
              if (errorCount < 3) {
                  console.log(`Skipping restricted song (${errorCount + 1}/3)...`);
                  setErrorCount(prev => prev + 1);
                  setTimeout(() => {
                      playNext();
                  }, 1000);
              } else {
                  console.error("Too many playback errors. Stopping queue.");
                  setErrorCount(0); // Reset to allow retry later
              }
          }
        }
      });
    } else {
        const currentVideoId = typeof playerRef.current.getVideoData === 'function' 
            ? playerRef.current.getVideoData().video_id 
            : null;
        
        // Always load if ID changed, or if we are supposed to be playing but aren't
        if (currentVideoId !== state.currentSong.videoId) {
            playerRef.current.loadVideoById(state.currentSong.videoId);
            // Reset error count on new song load
            setErrorCount(0);
        }
    }
  }, [isPlayerReady, state.currentSong]); 

  // Control Playback State (Pause/Play)
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      if (state.isPlaying) {
        // Force play if state is playing
        const playerState = playerRef.current.getPlayerState();
        // 1=Playing, 3=Buffering, 5=Cued, -1=Unstarted
        if (playerState !== 1 && playerState !== 3) { 
             playerRef.current.playVideo();
        }
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [state.isPlaying, state.currentSong]); // Check on song change too

  // Volume Control
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
        playerRef.current.setVolume(state.volume);
        setIsMuted(state.volume === 0);
    }
  }, [state.volume]);

  // Progress Interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        // Only update if playing or buffering
        const pState = playerRef.current.getPlayerState();
        if (pState === 1 || pState === 3) {
            const currentTime = playerRef.current.getCurrentTime();
            const duration = playerRef.current.getDuration();
            if (currentTime && duration) {
                updateProgress(currentTime, duration);
            }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [updateProgress]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const seekTo = (Number(e.target.value) / 100) * state.duration;
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(seekTo, true);
          updateProgress(seekTo, state.duration);
      }
  };

  const isLiked = state.currentSong && state.likedSongs.some(s => s.id === state.currentSong?.id);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[88px] bg-[#1e1e1e]/95 backdrop-blur-xl border-t border-white/5 z-[100] flex items-center justify-between px-6 select-none shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
      {/* 
        Hidden Player: 
        Opacity 0 makes it invisible but rendered.
        Dimensions 1px to avoid layout issues but ensure rendering.
      */}
      <div className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden -z-10">
         <div id="yt-player"></div>
      </div>

      {/* Track Info */}
      <div className="flex items-center w-[30%] min-w-[200px]">
        {state.currentSong ? (
          <>
            <div className="relative group flex-shrink-0">
               <img 
                src={state.currentSong.thumbnail} 
                alt="Album Art" 
                className={`w-12 h-12 rounded-[4px] shadow-sm object-cover bg-neutral-800 border border-white/5`}
               />
                {/* Hover overlay for art expand? Not in player bar typically */}
            </div>
            <div className="ml-3 flex flex-col justify-center overflow-hidden mr-4">
              <span className="text-[13px] font-medium text-white/90 truncate cursor-default leading-tight" title={state.currentSong.title}>
                {state.currentSong.title}
              </span>
              <span className="text-[11px] text-gray-400 truncate cursor-pointer hover:underline hover:text-white/80 transition mt-0.5">
                {state.currentSong.artist}
              </span>
            </div>
             <button 
                onClick={() => state.currentSong && toggleLike(state.currentSong)}
                className={`p-1.5 rounded-full hover:bg-white/10 transition-all active:scale-95 ${isLiked ? 'text-[#fa2d48]' : 'text-gray-500'}`}
            >
                <Icons.Heart size={16} fill={isLiked ? "currentColor" : "none"} />
            </button>
          </>
        ) : (
            <div className="flex items-center gap-3 opacity-30">
                <div className="w-12 h-12 bg-white/20 rounded-[4px]"></div>
                <div className="flex items-center">
                    <Icons.Music size={20} className="text-white" />
                </div>
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center w-[40%] max-w-xl">
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
                    style={{ width: `${state.progress}%` }}
                 ></div>
                 <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={state.progress || 0}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
            </div>
            <span className="w-8 font-variant-numeric tabular-nums">{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Volume & Extras */}
      <div className="flex items-center justify-end w-[30%] space-x-1">
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
        <button className="text-gray-400 hover:text-[#fa2d48] p-2 hover:bg-white/10 rounded-md transition">
            <Icons.ListMusic size={18} />
        </button>
      </div>
    </div>
  );
};

export default PlayerBar;
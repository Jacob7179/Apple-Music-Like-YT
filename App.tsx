import React, { useState, useEffect, useRef } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import BottomNav from './components/BottomNav';
import { View, Song, Playlist } from './types';
import { INITIAL_SONGS } from './constants';
import { searchYouTube, getLyrics, LyricLine } from './services/geminiService';
import { Icons } from './components/Icons';

// --- Subcomponents ---

const SongCard: React.FC<{ 
    song: Song; 
    onClick: () => void; 
    isLiked?: boolean; 
    onToggleLike?: (e: React.MouseEvent) => void;
    isActive?: boolean;
    isPlaying?: boolean;
    onMenuClick?: (e: React.MouseEvent, song: Song) => void;
    displayArtist?: string;
}> = ({ song, onClick, isLiked, onToggleLike, isActive, isPlaying, onMenuClick, displayArtist }) => (
  <div 
    onClick={onClick}
    className="group flex flex-col w-full cursor-pointer"
  >
    <div className="relative aspect-square mb-2 overflow-hidden rounded-[8px] shadow-lg bg-neutral-800">
      <img 
        src={song.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=random`} 
        alt={song.title} 
        className={`w-full h-full object-cover transition duration-500 group-hover:scale-105 ${isActive && isPlaying ? 'brightness-75' : ''}`}
        loading="lazy"
        onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=333&color=fff`;
        }}
      />
      {/* Overlay: Always show animation if playing, or show play button on hover */}
      <div className={`absolute inset-0 bg-black/20 transition flex items-end justify-between p-2 ${isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
         <div className="w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-lg">
             {isActive && isPlaying ? (
                 <Icons.Volume2 fill="white" size={14} className="animate-pulse" />
             ) : (
                 <Icons.Play fill="white" className="ml-0.5" size={14} />
             )}
         </div>
         {onMenuClick && (
            <button 
                onClick={(e) => onMenuClick(e, song)} 
                className="w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-lg hover:bg-black/80"
            >
                <Icons.MoreHorizontal size={16} />
            </button>
         )}
      </div>
    </div>
    <div className="flex justify-between items-start">
        <div className="flex flex-col overflow-hidden w-full">
            <h3 className={`font-normal text-[13px] truncate leading-tight mb-0.5 ${isActive ? 'text-[#fa2d48]' : 'text-white/90'}`}>{song.title}</h3>
            <p className="text-gray-400 text-[13px] truncate group-hover:text-white/70 transition">{displayArtist || song.artist}</p>
        </div>
    </div>
  </div>
);

const SongRow: React.FC<{ 
    song: Song; 
    index: number; 
    onClick: () => void; 
    isActive: boolean;
    isPlaying?: boolean;
    isLiked: boolean;
    onToggleLike: (e: React.MouseEvent) => void;
    onMenuClick: (e: React.MouseEvent, song: Song) => void;
    displayArtist?: string;
}> = ({ song, index, onClick, isActive, isPlaying, isLiked, onToggleLike, onMenuClick, displayArtist }) => (
    <div 
        onClick={onClick}
        className={`group flex items-center py-2 px-3 md:px-4 rounded-md hover:bg-white/10 transition-colors cursor-pointer select-none ${isActive ? 'bg-white/10' : ''}`}
    >
        {/* Index / Play Icon */}
        <div className="w-6 md:w-8 text-center text-gray-500 text-sm font-medium mr-2 flex justify-center">
            <span className="group-hover:hidden block">
                {isActive ? (
                    isPlaying ? <Icons.Volume2 size={14} className="text-[#fa2d48] animate-pulse" /> : <span className="text-[#fa2d48]">{index + 1}</span>
                ) : index + 1}
            </span>
            <span className="hidden group-hover:block text-white">
                {isActive && isPlaying ? <Icons.Volume2 size={12} className="text-[#fa2d48]" /> : <Icons.Play fill="currentColor" size={12} />}
            </span>
        </div>

        {/* Thumbnail */}
        <div className="w-10 h-10 rounded-[4px] overflow-hidden mr-3 md:mr-4 flex-shrink-0 shadow-sm bg-neutral-800 relative">
            <img 
                src={song.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=random`} 
                className={`w-full h-full object-cover ${isActive && isPlaying ? 'opacity-70' : ''}`}
                alt=""
                onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=333&color=fff`;
                }}
            />
             {isActive && isPlaying && (
                 <div className="absolute inset-0 flex items-center justify-center">
                      <Icons.Volume2 size={16} className="text-white drop-shadow-md animate-pulse" />
                 </div>
             )}
        </div>

        {/* Title & Artist */}
        <div className="flex-1 min-w-0 pr-2 md:pr-4">
            <h4 className={`text-[13px] md:text-[14px] truncate mb-0.5 ${isActive ? 'text-[#fa2d48]' : 'text-white'}`}>
                {song.title}
            </h4>
            <p className="text-[11px] md:text-[12px] text-gray-400 truncate group-hover:text-white/70 transition-colors">
                {displayArtist || song.artist}
            </p>
        </div>

        {/* Album (Mock) */}
        <div className="hidden md:block w-1/3 min-w-0 pr-4">
            <p className="text-[13px] text-gray-400 truncate group-hover:text-white/70 transition-colors">
                {song.title}
            </p>
        </div>

        {/* Duration (Mock) */}
        <div className="hidden sm:block w-12 text-right text-[12px] text-gray-500 font-variant-numeric tabular-nums group-hover:text-gray-300">
            3:45
        </div>
        
        {/* Actions */}
        <div className="w-16 md:w-20 flex justify-end items-center space-x-1">
             <button 
                onClick={onToggleLike}
                className={`p-1.5 rounded-full hover:bg-white/10 transition ${isLiked ? 'text-[#fa2d48] opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}
            >
                <Icons.Heart size={16} fill={isLiked ? "currentColor" : "none"} />
            </button>
            <button
                onClick={(e) => onMenuClick(e, song)}
                className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 opacity-0 group-hover:opacity-100 transition"
            >
                <Icons.MoreHorizontal size={16} />
            </button>
        </div>
    </div>
);

// Skeleton for loading results quickly
const SkeletonLoader = () => (
    <div className="space-y-4 pt-4">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse px-4">
                <div className="w-10 h-10 bg-white/10 rounded-md"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-1/3"></div>
                    <div className="h-3 bg-white/10 rounded w-1/4"></div>
                </div>
            </div>
        ))}
    </div>
);

// Helper to format time
const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const QueueSidebar: React.FC = () => {
    const { state, playSong, togglePlay, resolveArtist } = usePlayer();

    if (!state.isQueueVisible) return null;

    const handleQueueClick = (song: Song) => {
        if (state.currentSong?.id === song.id) {
            // Prevent pause on click, ensure playing
            if (!state.isPlaying) togglePlay();
        } else {
            playSong(song, state.queue);
        }
    };

    return (
        <div className="absolute top-0 right-0 h-full w-full md:w-[300px] bg-[#1c1c1e] md:border-l border-white/10 shadow-2xl z-[150] md:z-[50] flex flex-col backdrop-blur-3xl pt-safe pb-32 md:pb-24 animate-in slide-in-from-right duration-300">
             {/* Mobile specific close header or normal header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between mt-12 md:mt-0">
                <h2 className="text-lg font-bold text-white">Playing Next</h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {state.queue.map((song, index) => {
                    const isCurrent = state.currentSong?.id === song.id;
                    const displayArtist = resolveArtist(song.artist);
                    return (
                        <div 
                            key={`${song.id}-${index}`} 
                            className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-white/10 transition group ${isCurrent ? 'bg-white/5' : ''}`}
                            onClick={() => handleQueueClick(song)}
                        >
                            <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 mr-3">
                                <img src={song.thumbnail} className="w-full h-full object-cover" alt={song.title} />
                                {isCurrent && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                         {state.isPlaying ? (
                                             <Icons.Volume2 size={16} className="text-[#fa2d48] animate-pulse" />
                                         ) : (
                                             <Icons.Play size={16} fill="white" />
                                         )}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isCurrent ? 'text-[#fa2d48]' : 'text-white'}`}>{song.title}</p>
                                <p className="text-xs text-gray-400 truncate">{displayArtist}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const LyricsOverlay: React.FC = () => {
    const { state, toggleLyrics, togglePlay, playNext, playPrevious, seekTo, toggleQueue, resolveArtist } = usePlayer();
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [loading, setLoading] = useState(false);
    const [localProgress, setLocalProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [fetchedSongId, setFetchedSongId] = useState<string | null>(null);
    const [isInitialScroll, setIsInitialScroll] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeLineRef = useRef<HTMLParagraphElement>(null);

    // Fetch lyrics logic with caching behavior
    useEffect(() => {
        if (!state.currentSong) return;

        // If the song changed, reset lyrics state and tracker
        if (state.currentSong.id !== fetchedSongId) {
             setLyrics([]); 
             // We don't update fetchedSongId here, we wait for the fetch to start
        }

        // Only fetch if lyrics are visible and we haven't fetched for this song ID yet
        if (state.isLyricsVisible && state.currentSong.id !== fetchedSongId) {
            setLoading(true);
            const currentId = state.currentSong.id;
            setFetchedSongId(currentId); // Optimistically mark as fetching for this ID

            getLyrics(state.currentSong.title, state.currentSong.artist, state.duration || 200)
                .then(data => {
                    // Only update if we are still on the same song
                    if (currentId === state.currentSong?.id) {
                        setLyrics(data);
                    }
                    setLoading(false);
                });
        }
    }, [state.currentSong, state.isLyricsVisible, state.duration, fetchedSongId]);

    // Reset initial scroll when lyrics become visible
    useEffect(() => {
        if (state.isLyricsVisible) {
            setIsInitialScroll(true);
        }
    }, [state.isLyricsVisible]);

    // Find active line index
    const activeIndex = lyrics.findIndex((line, i) => {
        const nextLineTime = lyrics[i + 1]?.time ?? Infinity;
        return state.currentTime >= line.time && state.currentTime < nextLineTime;
    });

    // Auto-scroll active line into view
    useEffect(() => {
        if (activeLineRef.current && scrollRef.current && !loading && !isDragging) {
            const behavior = isInitialScroll ? 'auto' : 'smooth';
            
            activeLineRef.current.scrollIntoView({
                behavior: behavior,
                block: 'center',
            });
            
            if (isInitialScroll) {
                // Wait slightly for layout/animation before enabling smooth scroll
                setTimeout(() => setIsInitialScroll(false), 200);
            }
        }
    }, [activeIndex, loading, isDragging, isInitialScroll]);

    // Slider logic
    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setLocalProgress(val);
        if (!isDragging) {
            const seekToTime = (val / 100) * state.duration;
            seekTo(seekToTime);
        }
    };
    const handleSeekStart = () => { setIsDragging(true); setLocalProgress(state.progress); };
    const handleSeekEnd = () => { 
        setIsDragging(false);
        const seekToTime = (localProgress / 100) * state.duration;
        seekTo(seekToTime);
    };
    const displayProgress = isDragging ? localProgress : state.progress;

    const resolvedArtist = state.currentSong ? resolveArtist(state.currentSong.artist) : '';

    if (!state.isLyricsVisible || !state.currentSong) return null;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#1c1c1e] animate-in fade-in slide-in-from-bottom-10 duration-300">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <img 
                    src={state.currentSong.thumbnail} 
                    className="w-full h-full object-cover blur-[80px] opacity-40 scale-150 saturate-200" 
                    alt="" 
                />
                <div className="absolute inset-0 bg-black/40"></div>
            </div>

            {/* Top Bar (Close) */}
            <div className="relative z-50 flex justify-end p-6 md:p-8 pt-safe">
                 <button 
                    onClick={toggleLyrics}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-lg hover:scale-110 active:scale-95"
                >
                    <Icons.VolumeX size={20} className="rotate-45" />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden pb-4 md:pb-0 max-w-7xl mx-auto w-full">
                 
                 {/* Left Side: Album Art (Desktop) */}
                 <div className="hidden md:flex flex-col justify-center items-end w-[45%] h-full p-12 pr-16 sticky top-0">
                     <div className="w-full max-w-[400px] aspect-square shadow-[0_30px_80px_-10px_rgba(0,0,0,0.6)] rounded-[12px] overflow-hidden relative border border-white/10">
                        <img 
                            src={state.currentSong.thumbnail} 
                            className="w-full h-full object-cover" 
                            alt={state.currentSong.title} 
                        />
                     </div>
                     <div className="mt-8 text-right max-w-[400px] w-full">
                         <h2 className="text-4xl font-bold text-white mb-2 leading-tight drop-shadow-md tracking-tight">{state.currentSong.title}</h2>
                         <h3 className="text-2xl text-white/60 font-medium drop-shadow-sm">{resolvedArtist}</h3>
                     </div>
                 </div>

                 {/* Right Side: Lyrics List */}
                 <div 
                    ref={scrollRef}
                    className="flex-1 h-full overflow-y-auto custom-scrollbar mask-image-b pb-32 md:pb-0"
                 >
                    <div className="min-h-full flex flex-col justify-start md:justify-center items-start p-6 md:p-12 md:pl-0 pt-10">
                        
                        {/* Mobile Album Art Header */}
                        <div className="md:hidden flex flex-col items-center mb-8 w-full text-center sticky top-0 z-20 pb-4">
                             <div className="w-64 h-64 rounded-xl shadow-2xl mb-6 overflow-hidden border border-white/10">
                                <img src={state.currentSong.thumbnail} className="w-full h-full object-cover" alt="" />
                             </div>
                             <div>
                                <h2 className="text-2xl font-bold text-white mb-1">{state.currentSong.title}</h2>
                                <h3 className="text-lg text-white/60">{resolvedArtist}</h3>
                            </div>
                        </div>

                        {loading ? (
                             <div className="space-y-8 w-full max-w-2xl animate-pulse px-4">
                                <div className="h-12 bg-white/10 rounded-lg w-3/4"></div>
                                <div className="h-12 bg-white/10 rounded-lg w-2/3"></div>
                                <div className="h-12 bg-white/10 rounded-lg w-1/2"></div>
                             </div>
                        ) : lyrics.length > 0 ? (
                            <div className="w-full max-w-3xl px-4 md:px-0">
                                {lyrics.map((line, i) => {
                                    const isActive = i === activeIndex;
                                    return (
                                        <p 
                                            key={i}
                                            ref={isActive ? activeLineRef : null}
                                            className={`
                                                mb-8 md:mb-10 text-[28px] md:text-[40px] font-bold leading-[1.3] font-sans tracking-tight transition-all duration-500 ease-out origin-left cursor-pointer
                                                ${isActive ? 'text-white scale-100 blur-0 opacity-100' : 'text-white/40 scale-[0.98] blur-[0.5px] hover:text-white/80 hover:blur-0'}
                                                ${line.text.trim() === '' ? 'h-8' : ''}
                                            `}
                                            onClick={() => seekTo(line.time)}
                                        >
                                            {line.text}
                                        </p>
                                    );
                                })}
                                <div className="h-64"></div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center w-full h-full text-white/50">
                                <p className="text-2xl">Lyrics not available</p>
                            </div>
                        )}
                    </div>
                 </div>
            </div>

            {/* Bottom Controls Panel (Lyrics View) */}
            <div className="relative z-50 w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-6 md:pt-12 pb-12 md:pb-8 px-6 md:px-16 flex flex-col gap-4">
                {/* Progress Bar */}
                <div className="w-full flex items-center space-x-4 text-xs font-medium text-white/60">
                    <span className="w-10 text-right">{formatTime(state.currentTime)}</span>
                    <div className="flex-1 h-1.5 bg-white/20 rounded-full relative group cursor-pointer">
                         <div 
                            className="absolute top-0 left-0 h-full bg-white/90 rounded-full transition-all"
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
                    <span className="w-10">{formatTime(state.duration)}</span>
                </div>

                {/* Transport Controls */}
                <div className="flex items-center justify-between md:justify-center gap-4 md:gap-12 px-4">
                     <button className="md:hidden text-white/40" onClick={toggleQueue}>
                         <Icons.ListMusic size={24} />
                     </button>
                     
                     <div className="flex items-center gap-8 md:gap-12">
                         <button onClick={playPrevious} className="text-white/70 hover:text-white transition active:scale-90 p-2">
                            <Icons.SkipBack className="w-8 h-8 md:w-10 md:h-10" fill="currentColor" />
                        </button>
                        <button 
                            onClick={togglePlay} 
                            className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition shadow-2xl"
                        >
                            {state.isPlaying ? <Icons.Pause className="w-9 h-9 md:w-10 md:h-10" fill="currentColor" /> : <Icons.Play className="ml-1 w-9 h-9 md:w-10 md:h-10" fill="currentColor" />}
                        </button>
                        <button onClick={() => playNext()} className="text-white/70 hover:text-white transition active:scale-90 p-2">
                            <Icons.SkipForward className="w-8 h-8 md:w-10 md:h-10" fill="currentColor" />
                        </button>
                     </div>

                     <button className="md:hidden text-white/40">
                         <Icons.MoreHorizontal size={24} />
                     </button>
                </div>
            </div>
        </div>
    );
};

interface MainContentProps {
    view: View;
    searchQuery: string;
    onSearch: (q: string) => void;
    setView: (v: View) => void;
    onBack: () => void;
    canGoBack: boolean;
    selectedArtist: string | null;
    setSelectedArtist: (a: string | null) => void;
    selectedPlaylistId: string | null;
    setSelectedPlaylistId: (id: string | null) => void;
}

const ContextMenu: React.FC<{ 
    position: { x: number, y: number } | null; 
    onClose: () => void;
    song: Song | null;
}> = ({ position, onClose, song }) => {
    const { state, createPlaylist, addSongToPlaylist, toggleLike } = usePlayer();
    
    if (!position || !song) return null;

    const handleCreatePlaylist = () => {
        const title = prompt("New Playlist Name:");
        if (title) {
            createPlaylist(title, [song]); // Add current song to new playlist
        }
        onClose();
    };

    const handleAddToPlaylist = (pid: string) => {
        addSongToPlaylist(pid, song);
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 z-[9999]" 
            onClick={onClose}
        >
            <div 
                className="absolute bg-[#2c2c2e] border border-white/10 rounded-lg shadow-2xl p-1.5 w-56 flex flex-col text-sm animate-in fade-in zoom-in-95 duration-100 origin-top-right"
                style={{ 
                    top: Math.min(position.y, window.innerHeight - 300), 
                    left: Math.min(position.x - 200, window.innerWidth - 240) // Anchor left 
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider truncate border-b border-white/10 mb-1">
                    {song.title}
                </div>
                <button 
                    onClick={() => { toggleLike(song); onClose(); }}
                    className="flex items-center space-x-2 px-2 py-2 rounded hover:bg-white/10 transition text-left"
                >
                    <Icons.Heart size={16} />
                    <span>{state.likedSongs.some(s => s.id === song.id) ? 'Remove from Library' : 'Add to Library'}</span>
                </button>
                 <div className="border-t border-white/10 my-1"></div>
                 <div className="px-2 py-1 text-xs text-gray-500">Add to Playlist</div>
                 <div className="max-h-40 overflow-y-auto custom-scrollbar">
                    {state.playlists.filter(p => p.isCustom).map(p => (
                        <button 
                            key={p.id}
                            onClick={() => handleAddToPlaylist(p.id)}
                            className="flex items-center space-x-2 px-2 py-2 rounded hover:bg-white/10 transition text-left w-full"
                        >
                            <Icons.ListMusic size={16} />
                            <span className="truncate">{p.title}</span>
                        </button>
                    ))}
                 </div>
                 <button 
                    onClick={handleCreatePlaylist}
                    className="flex items-center space-x-2 px-2 py-2 rounded hover:bg-white/10 transition text-left text-[#fa2d48]"
                >
                    <Icons.Plus size={16} />
                    <span>New Playlist...</span>
                </button>
            </div>
        </div>
    );
};

const MainContent: React.FC<MainContentProps> = ({ view, searchQuery, onSearch, setView, onBack, canGoBack, selectedArtist, setSelectedArtist, selectedPlaylistId, setSelectedPlaylistId }) => {
  const { playSong, togglePlay, toggleLike, state, createPlaylist, deletePlaylist, renamePlaylist, removeSongFromPlaylist, toggleFollowArtist, updateArtistMapping, resolveArtist } = usePlayer();
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortOption, setSortOption] = useState<'title' | 'artist' | 'added'>('added');
  
  // Context Menu State
  const [contextMenuPos, setContextMenuPos] = useState<{x: number, y: number} | null>(null);
  const [contextMenuSong, setContextMenuSong] = useState<Song | null>(null);

  const handleMenuClick = (e: React.MouseEvent, song: Song) => {
      e.stopPropagation();
      e.preventDefault();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setContextMenuSong(song);
  };

  const closeMenu = () => {
      setContextMenuPos(null);
      setContextMenuSong(null);
  };

  // Trigger search when searchQuery changes
  useEffect(() => {
      if (searchQuery) {
          setIsSearching(true);
          setSearchResults([]); // Clear previous results immediately for speed perception
          searchYouTube(searchQuery).then(results => {
              // Filter unplayable songs immediately if possible, though strict filtering happens at render
              setSearchResults(results);
              setIsSearching(false);
          });
      }
  }, [searchQuery]);

  const handlePlay = (song: Song, contextList: Song[]) => {
      if (state.currentSong?.id === song.id) {
          // Prevent pause on click, ensure playing
          if (!state.isPlaying) togglePlay();
      } else {
          playSong(song, contextList);
      }
  };

  const greeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good Morning";
      if (hour < 18) return "Good Afternoon";
      return "Good Evening";
  };

  // Helper to filter blocked songs
  const visibleSongs = (songs: Song[]) => songs.filter(s => !state.unplayableIds.includes(s.videoId));
  
  // Aggregate all songs from INITIAL and Liked
  const allSongs = [...INITIAL_SONGS, ...state.likedSongs].filter((song, index, self) =>
      index === self.findIndex((t) => t.id === song.id)
  );

  // --- Views ---

  const renderHome = () => (
    <div className="pb-12">
        <div className="mb-6 mt-2 border-b border-white/5 pb-4">
             <h1 className="text-[28px] md:text-[32px] font-bold text-white tracking-tight leading-tight">{greeting()}</h1>
        </div>
        
        {/* Featured Playlists */}
        {state.playlists.length > 0 && (
            <div className="mb-10">
                 <div className="flex justify-between items-end mb-4">
                    <h3 className="text-xl font-bold text-white">Made For You</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {state.playlists.slice(0, 3).map((p, i) => (
                          <div 
                            key={p.id} 
                            onClick={() => { setSelectedPlaylistId(p.id); setView(View.PLAYLIST_DETAILS); }}
                            className="group relative h-48 md:h-64 rounded-[12px] overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300"
                          >
                              <img src={p.cover} className="w-full h-full object-cover transition duration-700 group-hover:scale-105" alt={p.title} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                              <div className="absolute bottom-0 left-0 p-6 w-full">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                                        {p.isCustom ? "My Playlist" : "Playlist"}
                                    </p>
                                    <p className="text-2xl font-bold text-white leading-tight mb-2">{p.title}</p>
                                    <p className="text-sm text-gray-300 line-clamp-1">{p.description}</p>
                              </div>
                              <div 
                                className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0 z-10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (p.songs.length > 0) {
                                        handlePlay(p.songs[0], p.songs);
                                    }
                                }}
                              >
                                    <div className="w-10 h-10 bg-[#fa2d48] rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition transform">
                                        <Icons.Play fill="currentColor" size={18} className="ml-1" />
                                    </div>
                              </div>
                          </div>
                     ))}
                 </div>
            </div>
        )}

        {/* New Releases Horizontal Scroll */}
        <div className="mb-8">
            <div className="flex items-end space-x-2 mb-4 group cursor-pointer w-fit" onClick={() => setView(View.SEE_ALL)}>
                <h3 className="text-xl font-bold text-white group-hover:text-[#fa2d48] transition-colors">New Releases</h3>
                <Icons.ChevronRight className="mb-0.5 text-gray-500 group-hover:text-[#fa2d48] transition-colors" size={20} />
            </div>
            
            <div className="flex space-x-6 overflow-x-auto pb-6 scrollbar-hide -mx-4 md:-mx-8 px-4 md:px-8 snap-x">
                {visibleSongs(INITIAL_SONGS).map((song) => (
                    <div key={song.id} className="flex-shrink-0 w-[150px] md:w-[170px] snap-start">
                        <SongCard 
                            song={song} 
                            onClick={() => handlePlay(song, visibleSongs(INITIAL_SONGS))} 
                            isActive={state.currentSong?.id === song.id}
                            isPlaying={state.isPlaying}
                            isLiked={state.likedSongs.some(s => s.id === song.id)}
                            onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                            onMenuClick={handleMenuClick}
                            displayArtist={resolveArtist(song.artist)}
                        />
                    </div>
                ))}
            </div>
        </div>

        {/* Trending Now */}
        <div className="mb-8">
            <div className="flex items-end space-x-2 mb-4 group cursor-pointer w-fit" onClick={() => setView(View.SEE_ALL)}>
                <h3 className="text-xl font-bold text-white group-hover:text-[#fa2d48] transition-colors">Trending Now</h3>
                <Icons.ChevronRight className="mb-0.5 text-gray-500 group-hover:text-[#fa2d48] transition-colors" size={20} />
            </div>
            <div className="flex space-x-6 overflow-x-auto pb-6 scrollbar-hide -mx-4 md:-mx-8 px-4 md:px-8 snap-x">
                {visibleSongs(INITIAL_SONGS).slice().reverse().map((song) => (
                    <div key={song.id} className="flex-shrink-0 w-[150px] md:w-[170px] snap-start">
                        <SongCard 
                            song={song} 
                            onClick={() => handlePlay(song, visibleSongs(INITIAL_SONGS))} 
                            isActive={state.currentSong?.id === song.id}
                            isPlaying={state.isPlaying}
                            isLiked={state.likedSongs.some(s => s.id === song.id)}
                            onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                            onMenuClick={handleMenuClick}
                            displayArtist={resolveArtist(song.artist)}
                        />
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const renderSeeAll = () => (
      <div className="pt-2 pb-12">
           <div className="flex items-center space-x-2 mb-6">
                {canGoBack && (
                    <button className="pr-2 text-white hover:text-white/70" onClick={onBack}>
                        <Icons.SkipBack className="rotate-0" size={24} />
                    </button>
                )}
                <h1 className="text-[28px] md:text-[32px] font-bold text-white">New Releases</h1>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
                {visibleSongs(INITIAL_SONGS).map((song) => (
                    <SongCard 
                        key={song.id}
                        song={song} 
                        onClick={() => handlePlay(song, visibleSongs(INITIAL_SONGS))} 
                        isActive={state.currentSong?.id === song.id}
                        isPlaying={state.isPlaying}
                        isLiked={state.likedSongs.some(s => s.id === song.id)}
                        onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                        onMenuClick={handleMenuClick}
                        displayArtist={resolveArtist(song.artist)}
                    />
                ))}
           </div>
      </div>
  );
  
  const renderRadio = () => (
    <div className="pt-2 pb-12">
        <h1 className="text-[28px] md:text-[32px] font-bold text-white mb-6">Radio Stations</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {['Classic Rock', 'Pop Hits', 'Jazz Vibes', 'Lo-Fi Study', 'Hip-Hop Classics', 'Electronic Focus'].map((station, i) => (
                <div 
                    key={station}
                    className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all duration-300"
                    onClick={() => {
                        // Just play a random selection for now as a "Station"
                        const randomStart = Math.floor(Math.random() * (INITIAL_SONGS.length - 5));
                        const stationSongs = INITIAL_SONGS.slice(randomStart, randomStart + 10);
                        if(stationSongs.length > 0) handlePlay(stationSongs[0], stationSongs);
                    }}
                >
                    <img src={`https://picsum.photos/400/400?random=${i + 20}`} className="w-full h-full object-cover" alt={station} />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition"></div>
                    <div className="absolute bottom-0 left-0 p-4">
                         <p className="text-sm font-bold uppercase tracking-wider text-white/80 mb-1">Station</p>
                         <h3 className="text-xl font-bold text-white">{station}</h3>
                    </div>
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                        <div className="w-12 h-12 bg-[#fa2d48] rounded-full flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition">
                            <Icons.Play fill="currentColor" size={20} className="ml-1" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderSearch = () => (
    <div className="pt-2">
        {/* Search Input for Mobile */}
        <div className="md:hidden mb-6">
            <div className="relative group">
                <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#fa2d48] transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder="Search Artists, Songs, Lyrics" 
                    className="w-full bg-[#2c2c2e] text-white/90 pl-9 pr-3 py-2.5 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-[#fa2d48]/50 focus:bg-[#3a3a3c] placeholder-gray-500 transition-all"
                    defaultValue={searchQuery}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onSearch(e.currentTarget.value);
                    }}
                />
            </div>
        </div>

        <h1 className="text-[24px] md:text-[32px] font-bold text-white mb-6">
            {searchQuery ? `Results for "${searchQuery}"` : "Browse"}
        </h1>
        
        {isSearching ? (
             <SkeletonLoader />
        ) : searchQuery && visibleSongs(searchResults).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Icons.Search size={48} className="mb-4 opacity-50" />
                <p className="text-lg">No results found.</p>
                <p className="text-sm">Try searching for a different song or artist.</p>
            </div>
        ) : visibleSongs(searchResults).length > 0 && searchQuery ? (
            <div>
                <h3 className="text-lg font-bold text-white mb-4">Top Results</h3>
                <div className="bg-[#1c1c1e] divide-y divide-white/5 border-t border-white/5">
                    {visibleSongs(searchResults).map((song, index) => (
                        <SongRow 
                            key={song.id} 
                            song={song} 
                            index={index}
                            onClick={() => handlePlay(song, [song])} // Fix: Play specific song as single queue
                            isActive={state.currentSong?.id === song.id}
                            isPlaying={state.isPlaying}
                            isLiked={state.likedSongs.some(s => s.id === song.id)}
                            onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                            onMenuClick={handleMenuClick}
                            displayArtist={resolveArtist(song.artist)}
                        />
                    ))}
                </div>
            </div>
        ) : (
            // Default "Browse" Categories when no search query
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
                 {['Pop', 'Hip-Hop', 'Dance', 'Electronic', 'R&B', 'Alternative', 'Rock', 'K-Pop'].map((genre, i) => (
                     <div key={genre} className="h-28 md:h-32 rounded-lg bg-[#2c2c2e] hover:bg-[#3a3a3c] transition cursor-pointer relative overflow-hidden p-4 group">
                         <h3 className="text-lg font-bold text-white z-10 relative">{genre}</h3>
                         <div className={`absolute -bottom-2 -right-2 w-20 h-20 rounded-lg transform rotate-12 bg-gradient-to-br from-blue-500 to-purple-600 opacity-80 group-hover:scale-110 transition duration-500`}></div>
                     </div>
                 ))}
            </div>
        )}
    </div>
  );

  const renderArtistDetail = () => {
    if (!selectedArtist) return renderLibrary('artists');
    
    // Resolve master artist
    const masterArtist = resolveArtist(selectedArtist);
    
    // Aggregate songs for the MASTER artist (checking aliases)
    const artistSongs = visibleSongs(allSongs.filter(s => resolveArtist(s.artist) === masterArtist));
    
    // Deduplicate songs by ID
    const uniqueArtistSongs = artistSongs.filter((song, index, self) =>
        index === self.findIndex((t) => t.id === song.id)
    );

    const isFollowed = state.followedArtists.includes(masterArtist);
    
    const artistImage = uniqueArtistSongs[0]?.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(masterArtist)}&background=random`;

    return (
        <div className="-mx-4 md:-mx-8 -mt-8">
             <div className="relative h-[250px] md:h-[350px] flex items-end p-6 md:p-8 overflow-hidden mb-4">
                 {/* Back Button */}
                 {canGoBack && (
                     <button 
                        onClick={onBack}
                        className="absolute top-4 left-4 md:top-8 md:left-8 z-30 flex items-center space-x-2 bg-black/40 hover:bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg transition text-white"
                     >
                         <Icons.SkipBack className="rotate-0" size={16} />
                         <span className="text-sm font-medium">Back</span>
                     </button>
                 )}

                 <div className="absolute inset-0 z-0">
                      <img src={artistImage} className="w-full h-full object-cover blur-[60px] opacity-40 scale-125" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-[#1c1c1e]/60 to-transparent"></div>
                 </div>
                 
                 <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end space-y-6 md:space-y-0 md:space-x-8 w-full max-w-5xl mx-auto">
                     <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden shadow-2xl border-4 border-[#1c1c1e] flex-shrink-0 bg-neutral-800">
                         <img src={artistImage} className="w-full h-full object-cover" alt={masterArtist} />
                     </div>
                     <div className="text-center md:text-left flex-1">
                         <h1 className="text-3xl md:text-6xl font-bold text-white mb-2 tracking-tight drop-shadow-md">{masterArtist}</h1>
                         <p className="text-gray-300 font-medium mb-6 drop-shadow-sm">Artist &bull; {uniqueArtistSongs.length} Songs</p>
                         <div className="flex items-center justify-center md:justify-start gap-4">
                             {uniqueArtistSongs.length > 0 && (
                                <button onClick={() => handlePlay(uniqueArtistSongs[0], uniqueArtistSongs)} className="flex items-center space-x-2 bg-[#fa2d48] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#d61e35] transition shadow-lg active:scale-95">
                                    <Icons.Play fill="currentColor" size={18} />
                                    <span>Play</span>
                                </button>
                             )}
                             <button onClick={() => toggleFollowArtist(masterArtist)} className={`flex items-center justify-center px-6 py-3 rounded-full font-semibold transition border ${isFollowed ? 'bg-transparent border-white/20 text-white hover:border-white' : 'bg-[#fa2d48]/10 text-[#fa2d48] border-[#fa2d48] hover:bg-[#fa2d48]/20'}`}>
                                 <span>{isFollowed ? 'Following' : 'Follow'}</span>
                             </button>
                             <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-md">
                                <Icons.MoreHorizontal size={20} />
                             </button>
                         </div>
                     </div>
                 </div>
             </div>

             <div className="px-4 md:px-8 pb-32 max-w-6xl mx-auto">
                 <h2 className="text-2xl font-bold text-white mb-6">Top Songs</h2>
                 {uniqueArtistSongs.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                         <Icons.Mic2 size={48} className="mb-4 opacity-50" />
                         <p>No songs found for this artist.</p>
                     </div>
                 ) : (
                    <div className="bg-[#1c1c1e] divide-y divide-white/5 border-t border-white/5">
                        {uniqueArtistSongs.map((song, index) => (
                            <SongRow 
                                key={song.id} 
                                song={song} 
                                index={index}
                                onClick={() => handlePlay(song, uniqueArtistSongs)} 
                                isActive={state.currentSong?.id === song.id}
                                isPlaying={state.isPlaying}
                                isLiked={state.likedSongs.some(s => s.id === song.id)}
                                onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                                onMenuClick={handleMenuClick}
                                displayArtist={masterArtist}
                            />
                        ))}
                    </div>
                 )}
             </div>
        </div>
    );
  };

  const renderSettings = () => {
      // Logic for grouping artists
      const uniqueRawArtists = Array.from(new Set(allSongs.map(s => s.artist)));
      
      // Group by Master Artist
      const groupedArtists: Record<string, string[]> = {};
      
      uniqueRawArtists.forEach(raw => {
          const master = resolveArtist(raw);
          if (!groupedArtists[master]) {
              groupedArtists[master] = [];
          }
          if (raw !== master) {
              groupedArtists[master].push(raw);
          }
      });

      // Ensure Masters that are also Raw Artists exist in the keys even if they have no aliases
      uniqueRawArtists.forEach(raw => {
         if(!groupedArtists[raw] && resolveArtist(raw) === raw) {
             groupedArtists[raw] = [];
         }
      });

      const handleDragStart = (e: React.DragEvent, artistName: string) => {
          e.dataTransfer.setData("artist", artistName);
      };

      const handleDrop = (e: React.DragEvent, targetMaster: string) => {
          e.preventDefault();
          const draggedArtist = e.dataTransfer.getData("artist");
          if (!draggedArtist || draggedArtist === targetMaster) return;
          
          // Map dragged artist to target master
          const newMapping = { ...state.artistMapping, [draggedArtist]: targetMaster };
          
          // If dragged artist was a master, remap its children
          if (groupedArtists[draggedArtist]) {
              groupedArtists[draggedArtist].forEach(child => {
                  newMapping[child] = targetMaster;
              });
          }
          
          updateArtistMapping(newMapping);
      };

      const handleUnmerge = (alias: string) => {
           const newMapping = { ...state.artistMapping };
           delete newMapping[alias];
           updateArtistMapping(newMapping);
      }

      return (
          <div className="pt-2 pb-12 max-w-4xl mx-auto">
              <h1 className="text-[28px] md:text-[32px] font-bold text-white mb-2">Settings</h1>
              <p className="text-gray-400 mb-8">Manage your library preferences.</p>
              
              <div className="bg-[#2c2c2e] rounded-xl overflow-hidden p-6 mb-8">
                  <h2 className="text-xl font-bold text-white mb-4">Artist Arrangement</h2>
                  <p className="text-sm text-gray-400 mb-6">Drag and drop artist names to merge them. The top name will be the display name.</p>
                  
                  <div className="space-y-4">
                      {Object.keys(groupedArtists).sort().map(master => (
                          <div 
                            key={master}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, master)}
                            className="bg-[#1c1c1e] border border-white/5 rounded-lg p-4"
                          >
                              <div 
                                draggable 
                                onDragStart={(e) => handleDragStart(e, master)}
                                className="flex items-center space-x-3 cursor-grab active:cursor-grabbing"
                              >
                                  <div className="p-2 bg-white/5 rounded text-gray-400">
                                      <Icons.ListMusic size={16} />
                                  </div>
                                  <span className="text-white font-medium text-lg">{master}</span>
                                  {groupedArtists[master].length > 0 && (
                                      <span className="text-xs bg-[#fa2d48] text-white px-2 py-0.5 rounded-full">Group</span>
                                  )}
                              </div>

                              {/* Aliases */}
                              {groupedArtists[master].length > 0 && (
                                  <div className="mt-3 pl-10 space-y-2 border-l-2 border-white/10 ml-4">
                                      {groupedArtists[master].map(alias => (
                                          <div key={alias} className="flex items-center justify-between text-sm text-gray-400 bg-white/5 p-2 rounded">
                                              <span>{alias}</span>
                                              <button 
                                                onClick={() => handleUnmerge(alias)}
                                                className="text-gray-500 hover:text-white"
                                                title="Unmerge"
                                              >
                                                  <Icons.VolumeX size={14} className="rotate-45" />
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  };

  const renderLibrary = (filter: 'songs' | 'artists' | 'albums' | 'playlists' | 'recent' = 'recent') => {
      const liked = visibleSongs(state.likedSongs);

      // Mobile Portal Navigation for Library Root
      if (filter === 'recent' && view === View.LIBRARY) {
          return (
              <div className="pt-2 pb-12">
                   <h1 className="text-[32px] font-bold text-white mb-6">Library</h1>
                   
                   {/* Mobile Portal Grid */}
                   <div className="md:hidden grid grid-cols-2 gap-4 mb-8">
                       {[
                           { label: 'Playlists', icon: Icons.ListMusic, view: View.LIBRARY_PLAYLISTS },
                           { label: 'Artists', icon: Icons.Mic2, view: View.LIBRARY_ARTISTS },
                           { label: 'Albums', icon: Icons.Library, view: View.LIBRARY_ALBUMS },
                           { label: 'Songs', icon: Icons.Music, view: View.LIBRARY_SONGS },
                       ].map((item) => (
                           <div 
                                key={item.label}
                                onClick={() => setView(item.view)}
                                className="bg-[#2c2c2e] p-4 rounded-xl flex flex-col items-start active:bg-[#3a3a3c] transition"
                           >
                               <item.icon className="text-[#fa2d48] mb-2" size={24} />
                               <span className="font-semibold text-lg">{item.label}</span>
                           </div>
                       ))}
                   </div>

                   <h2 className="text-xl font-bold text-white mb-4">Recently Added</h2>
                   {liked.length === 0 ? (
                        <p className="text-gray-500">No songs added yet.</p>
                   ) : (
                        <div className="bg-transparent">
                            {liked.slice(0, 20).map((song, index) => (
                                <SongRow 
                                    key={song.id} 
                                    song={song} 
                                    index={index}
                                    onClick={() => handlePlay(song, liked)} 
                                    isActive={state.currentSong?.id === song.id}
                                    isPlaying={state.isPlaying}
                                    isLiked={true}
                                    onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                                    onMenuClick={handleMenuClick}
                                    displayArtist={resolveArtist(song.artist)}
                                />
                            ))}
                        </div>
                   )}
              </div>
          );
      }
      
      // Sort logic for Song view
      let sortedSongs = [...liked];
      const toggleSort = () => {
          if (sortOption === 'added') setSortOption('title');
          else if (sortOption === 'title') setSortOption('artist');
          else setSortOption('added');
      };
      
      const sortLabel = {
          'title': 'Title',
          'artist': 'Artist',
          'added': 'Recently Added'
      }[sortOption];

      if (filter === 'songs') {
        if (sortOption === 'title') sortedSongs.sort((a,b) => a.title.localeCompare(b.title));
        else if (sortOption === 'artist') sortedSongs.sort((a,b) => resolveArtist(a.artist).localeCompare(resolveArtist(b.artist)));
        // 'added' is default (index 0 is newest)
      } else {
        // Default sort for other views (e.g. recent for library root if not portal)
         sortedSongs = liked; 
      }

      return (
        <div className="pt-2">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                    {/* Back button only on mobile detail views */}
                    {canGoBack && (
                         <button className="md:hidden pr-2" onClick={onBack}>
                            <Icons.SkipBack className="rotate-0" size={20} />
                        </button>
                    )}
                    <h1 className="text-[28px] md:text-[32px] font-bold text-white capitalize">{filter === 'recent' ? 'Library' : filter}</h1>
                </div>
                {filter === 'songs' && (
                    <div 
                        onClick={toggleSort}
                        className="text-sm text-[#fa2d48] font-medium cursor-pointer hover:underline select-none"
                    >
                        Sort by: {sortLabel}
                    </div>
                )}
            </div>

            {(liked.length === 0 && state.followedArtists.length === 0 && filter !== 'playlists' && filter !== 'artists' && filter !== 'albums') ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
                    <div className="bg-[#2c2c2e] p-6 rounded-full mb-4">
                        <Icons.Music className="opacity-40" size={40} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No Music</h2>
                    <p className="text-sm">Songs you add to your library will appear here.</p>
                </div>
            ) : filter === 'artists' ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8 gap-4">
                  {/* Derive Artists from ALL songs (liked + initial) + Followed Artists using RESOLVED names */}
                  {Array.from(new Set([...allSongs.map(s => resolveArtist(s.artist)), ...state.followedArtists]))
                      .sort((a, b) => a.localeCompare(b))
                      .map(artist => {
                          // Find first song that resolves to this artist for thumbnail
                          let artSong = allSongs.find(s => resolveArtist(s.artist) === artist);
                          const thumbnail = artSong?.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist)}&background=random`;
                          
                          // Count TOTAL songs in app for this artist, not just liked
                          const songCount = allSongs.filter(s => resolveArtist(s.artist) === artist).length;

                          return (
                              <div 
                                key={artist} 
                                onClick={() => { setSelectedArtist(artist); setView(View.LIBRARY_ARTIST_DETAIL); }}
                                className="group flex flex-col items-center p-4 rounded-xl hover:bg-white/5 transition cursor-pointer"
                              >
                                  <div className="w-24 h-24 md:w-32 md:h-32 lg:w-44 lg:h-44 rounded-full overflow-hidden mb-4 shadow-lg bg-neutral-800 border border-white/5">
                                       <img src={thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={artist} />
                                  </div>
                                  <h3 className="text-white font-medium text-base text-center truncate w-full">{artist}</h3>
                                  <p className="text-xs text-gray-500 mt-1">{songCount > 0 ? `${songCount} Songs` : 'Following'}</p>
                              </div>
                          );
                  })}
              </div>
            ) : filter === 'albums' ? (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8 gap-4">
                  {/* Group ALL songs by Resolved Artist/Album */}
                  {Object.entries(allSongs.reduce((acc, song) => {
                      const key = resolveArtist(song.artist) || 'Unknown Artist';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(song);
                      return acc;
                  }, {} as Record<string, Song[]>)).map(([artist, songs]) => (
                      <div 
                        key={artist}
                        onClick={() => { setSelectedArtist(artist); setView(View.LIBRARY_ARTIST_DETAIL); }}
                        className="group flex flex-col cursor-pointer"
                      >
                           {/* Stacked Folder Effect */}
                           <div className="relative aspect-square mb-3 group-hover:scale-[1.02] transition duration-300 mt-2">
                                {/* Background Card 2 */}
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-[85%] h-full bg-white/5 rounded-[4px] border border-white/5 z-0"></div>
                                {/* Background Card 1 */}
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-[92%] h-full bg-white/10 rounded-[4px] border border-white/5 z-10"></div>
                                {/* Main Card */}
                                <div className="relative w-full h-full rounded-[6px] overflow-hidden shadow-2xl bg-neutral-800 z-20 border border-white/10">
                                     <img 
                                        src={songs[0].thumbnail} 
                                        alt={artist}
                                        className="w-full h-full object-cover"
                                     />
                                     {/* Overlay: Pass click to parent (View Album) by NOT having onClick here */}
                                     <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                         {/* Play Button: Stops propagation to Play instead of View */}
                                         <div 
                                            className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (songs.length > 0) handlePlay(songs[0], songs);
                                            }}
                                         >
                                             <Icons.Play fill="white" className="ml-0.5" size={20} />
                                         </div>
                                     </div>
                                </div>
                           </div>
                           
                           <div className="flex flex-col px-1">
                                <h3 className="font-bold text-white text-[15px] truncate">{artist}</h3>
                                <p className="text-gray-400 text-xs font-medium">{songs.length} Songs</p>
                           </div>
                      </div>
                  ))}
               </div>
            ) : filter === 'playlists' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div 
                        onClick={() => {
                            const name = prompt("Enter Playlist Name");
                            if (name) createPlaylist(name);
                        }}
                        className="flex items-center p-4 bg-[#2c2c2e]/50 rounded-xl cursor-pointer hover:bg-[#3a3a3c] transition border border-dashed border-white/20 h-20"
                    >
                        <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-md mr-4">
                            <Icons.Plus size={24} className="text-[#fa2d48]" />
                        </div>
                        <span className="font-medium text-[#fa2d48]">New Playlist</span>
                    </div>

                    {state.playlists.map(p => (
                        <div key={p.id} className="flex items-center p-4 bg-[#2c2c2e] rounded-xl cursor-pointer hover:bg-[#3a3a3c] transition h-20" onClick={() => { setSelectedPlaylistId(p.id); setView(View.PLAYLIST_DETAILS); }}>
                             <img src={p.cover} className="w-12 h-12 rounded-md mr-4 object-cover bg-neutral-800" alt="" />
                             <div className="flex-1 min-w-0">
                                <span className="font-bold text-lg block truncate">{p.title}</span>
                                <span className="text-xs text-gray-500">{p.songs.length} songs</span>
                             </div>
                        </div>
                    ))}
                </div>
            ) : (
                // SONG VIEW (List of Songs) - Uses sortedSongs (Liked Only)
                <div className="bg-transparent">
                     {/* List Header */}
                     <div className="flex items-center px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-white/10 mb-2">
                         <div className="w-8 md:w-12 text-center">#</div>
                         <div className="w-10 md:w-14"></div>
                         <div className="flex-1">Title</div>
                         <div className="hidden md:block w-1/3">Album</div>
                         <div className="hidden sm:block w-12 text-right"><Icons.Clock size={14} /></div>
                         <div className="w-8 md:w-10"></div>
                     </div>

                    {sortedSongs.map((song, index) => (
                        <SongRow 
                            key={song.id} 
                            song={song} 
                            index={index}
                            onClick={() => handlePlay(song, sortedSongs)} 
                            isActive={state.currentSong?.id === song.id}
                            isPlaying={state.isPlaying}
                            isLiked={true}
                            onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                            onMenuClick={handleMenuClick}
                            displayArtist={resolveArtist(song.artist)}
                        />
                    ))}
                </div>
            )}
        </div>
      );
  }

  const renderPlaylist = (playlistId: string) => {
      const playlist = state.playlists.find(p => p.id === playlistId);
      
      if (!playlist) return renderLibrary('playlists');
      
      // Use stored songs from state (stable)
      const displaySongs = playlist.songs;

      const handleRename = () => {
          const newName = prompt("Rename Playlist", playlist.title);
          if (newName) renamePlaylist(playlist.id, newName);
      };

      const handleDelete = () => {
          if (confirm(`Delete playlist "${playlist.title}"?`)) {
              deletePlaylist(playlist.id);
              setView(View.LIBRARY_PLAYLISTS);
          }
      };

      const handleRemoveSong = (e: React.MouseEvent, sId: string) => {
          e.stopPropagation();
          removeSongFromPlaylist(playlist.id, sId);
      };

      return (
        <div className="-mx-4 md:-mx-8 -mt-8">
            {/* Playlist Header */}
            <div className="relative h-[350px] md:h-[400px] flex items-end p-6 md:p-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-[#1c1c1e] z-0"></div>
                <img src={playlist.cover} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 blur-sm" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-[#1c1c1e]/40 to-transparent z-10"></div>
                
                 {/* Back Button */}
                 {canGoBack && (
                     <button 
                        onClick={onBack}
                        className="absolute top-4 left-4 md:top-8 md:left-8 z-30 flex items-center space-x-2 bg-black/40 hover:bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg transition text-white"
                     >
                         <Icons.SkipBack className="rotate-0" size={16} />
                         <span className="text-sm font-medium">Back</span>
                     </button>
                 )}

                <div className="relative z-20 flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-8 w-full">
                    <div className="w-40 h-40 md:w-56 md:h-56 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-md overflow-hidden flex-shrink-0 bg-neutral-800">
                         <img src={playlist.cover} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex flex-col text-center md:text-left flex-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2">{playlist.isCustom ? 'My Playlist' : 'Playlist'}</span>
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2 md:mb-4">
                            <h1 className="text-3xl md:text-6xl font-bold text-white tracking-tight shadow-sm truncate">{playlist.title}</h1>
                            {playlist.isCustom && (
                                <button onClick={handleRename} className="text-gray-400 hover:text-white p-1"><Icons.MoreHorizontal size={20}/></button>
                            )}
                        </div>
                        <p className="text-gray-300 font-medium mb-4 md:mb-6 text-sm md:text-base">{playlist.description}</p>
                        <div className="flex items-center justify-center md:justify-start space-x-4">
                            {displaySongs.length > 0 && (
                                <button onClick={() => handlePlay(displaySongs[0], displaySongs)} className="flex items-center space-x-2 bg-[#fa2d48] text-white px-6 md:px-8 py-2 md:py-3 rounded-full font-semibold hover:bg-[#d61e35] transition shadow-lg active:scale-95">
                                    <Icons.Play fill="currentColor" size={20} />
                                    <span>Play</span>
                                </button>
                            )}
                            {playlist.isCustom && (
                                <button onClick={handleDelete} className="flex items-center justify-center px-4 py-2 rounded-full bg-white/10 hover:bg-red-500/20 text-red-500 transition border border-red-500/50">
                                    <span className="text-sm font-medium">Delete</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Song List */}
            <div className="px-4 md:px-8 pb-32">
                 {displaySongs.length === 0 ? (
                      <div className="py-12 text-center text-gray-500">
                          <p>No songs in this playlist yet.</p>
                      </div>
                 ) : (
                    <>
                        <div className="flex items-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-white/5 mb-2 sticky top-0 bg-[#1c1c1e] z-30">
                            <div className="w-8 md:w-12 text-center">#</div>
                            <div className="w-10 md:w-14"></div>
                            <div className="flex-1">Title</div>
                            <div className="hidden md:block w-1/3">Album</div>
                            <div className="hidden sm:block w-12 text-right"><Icons.Clock size={14} /></div>
                            <div className="w-8 md:w-10"></div>
                        </div>

                        {displaySongs.map((song, index) => (
                            <div key={`${song.id}-${index}`} className="relative group">
                                <SongRow 
                                    song={song} 
                                    index={index}
                                    onClick={() => handlePlay(song, displaySongs)} 
                                    isActive={state.currentSong?.id === song.id}
                                    isPlaying={state.isPlaying}
                                    isLiked={state.likedSongs.some(s => s.id === song.id)}
                                    onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                                    onMenuClick={handleMenuClick}
                                    displayArtist={resolveArtist(song.artist)}
                                />
                                {playlist.isCustom && (
                                    <div className="absolute right-20 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition hidden md:block">
                                        <button onClick={(e) => handleRemoveSong(e, song.id)} className="text-gray-500 hover:text-white p-2" title="Remove from Playlist">
                                            <Icons.VolumeX size={14} className="rotate-45" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                 )}
            </div>
        </div>
      );
  }

  // --- Render Logic ---
  let content;
  switch (view) {
      case View.HOME: content = renderHome(); break;
      case View.SEE_ALL: content = renderSeeAll(); break;
      case View.SEARCH: content = renderSearch(); break;
      case View.RADIO: content = renderRadio(); break;
      case View.LIBRARY: content = renderLibrary('recent'); break;
      case View.LIBRARY_SONGS: content = renderLibrary('songs'); break;
      case View.LIBRARY_ARTISTS: content = renderLibrary('artists'); break;
      case View.LIBRARY_ALBUMS: content = renderLibrary('albums'); break;
      case View.LIBRARY_PLAYLISTS: content = renderLibrary('playlists'); break;
      case View.LIBRARY_ARTIST_DETAIL: content = renderArtistDetail(); break;
      case View.PLAYLIST_DETAILS: content = renderPlaylist(selectedPlaylistId || ''); break;
      case View.SETTINGS: content = renderSettings(); break;
      default: content = renderHome(); break;
  }

  return (
    <div 
        className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 scroll-smooth pb-28 md:pb-24"
        onClick={closeMenu}
    >
        {content}
        <ContextMenu position={contextMenuPos} onClose={closeMenu} song={contextMenuSong} />
    </div>
  );
};

const AppContent: React.FC = () => {
    const [view, setView] = useState<View>(View.HOME);
    const [searchQuery, setSearchQuery] = useState("");
    const [history, setHistory] = useState<View[]>([]);
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

    const handleSetView = (newView: View) => {
        if (newView !== view) {
            setHistory(prev => [...prev, view]);
            setView(newView);
        }
    };

    const handleBack = () => {
        const prev = history[history.length - 1];
        if (prev) {
            setHistory(h => h.slice(0, -1));
            setView(prev);
        }
    };

    const handleSearch = (q: string) => {
        setSearchQuery(q);
        if (view !== View.SEARCH) {
             setHistory(prev => [...prev, view]);
             setView(View.SEARCH);
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#1c1c1e] text-white overflow-hidden font-sans selection:bg-[#fa2d48] selection:text-white touch-none">
            <Sidebar 
                currentView={view} 
                setView={handleSetView} 
                onSearch={handleSearch}
                onPlaylistSelect={(id) => { setSelectedPlaylistId(id); handleSetView(View.PLAYLIST_DETAILS); }}
            />
            
            <div className="flex-1 flex flex-col relative h-full overflow-hidden">
                <MainContent 
                    view={view}
                    searchQuery={searchQuery}
                    onSearch={handleSearch}
                    setView={handleSetView}
                    onBack={handleBack}
                    canGoBack={history.length > 0}
                    selectedArtist={selectedArtist}
                    setSelectedArtist={setSelectedArtist}
                    selectedPlaylistId={selectedPlaylistId}
                    setSelectedPlaylistId={setSelectedPlaylistId}
                />

                <LyricsOverlay />
                <QueueSidebar />
                <PlayerBar onArtistClick={(artist) => { setSelectedArtist(artist); handleSetView(View.LIBRARY_ARTIST_DETAIL); }} />
                <BottomNav currentView={view} setView={handleSetView} />
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <PlayerProvider>
            <AppContent />
        </PlayerProvider>
    );
};

export default App;
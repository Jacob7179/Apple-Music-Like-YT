
import React, { useState, useEffect, useRef } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import BottomNav from './components/BottomNav';
import { View, Song } from './types';
import { INITIAL_SONGS, MOCK_PLAYLISTS } from './constants';
import { searchYouTube, getLyrics, LyricLine } from './services/geminiService';
import { Icons } from './components/Icons';

// --- Subcomponents ---

const SongCard: React.FC<{ song: Song; onClick: () => void; isLiked?: boolean; onToggleLike?: (e: React.MouseEvent) => void }> = ({ song, onClick, isLiked, onToggleLike }) => (
  <div 
    onClick={onClick}
    className="group flex flex-col p-2 md:p-3 -mx-2 md:-mx-3 rounded-lg hover:bg-white/5 transition-colors duration-200 cursor-pointer"
  >
    <div className="relative aspect-square mb-3 overflow-hidden rounded-[6px] shadow-md bg-neutral-800">
      <img 
        src={song.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=random`} 
        alt={song.title} 
        className="w-full h-full object-cover transition duration-500" 
        loading="lazy"
        onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=333&color=fff`;
        }}
      />
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-end justify-start p-2">
         <div className="w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
             <Icons.Play fill="white" className="ml-0.5" size={14} />
         </div>
      </div>
    </div>
    <div className="flex justify-between items-start">
        <div className="flex flex-col overflow-hidden w-full">
            <h3 className="text-white/90 font-normal text-[13px] truncate leading-tight mb-0.5">{song.title}</h3>
            <p className="text-gray-400 text-[13px] truncate">{song.artist}</p>
        </div>
    </div>
  </div>
);

const SongRow: React.FC<{ 
    song: Song; 
    index: number; 
    onClick: () => void; 
    isActive: boolean;
    isLiked: boolean;
    onToggleLike: (e: React.MouseEvent) => void 
}> = ({ song, index, onClick, isActive, isLiked, onToggleLike }) => (
    <div 
        onClick={onClick}
        className={`group flex items-center py-2 px-3 md:px-4 rounded-md hover:bg-white/10 transition-colors cursor-pointer select-none ${isActive ? 'bg-white/10' : ''}`}
    >
        {/* Index / Play Icon */}
        <div className="w-6 md:w-8 text-center text-gray-500 text-sm font-medium mr-2 flex justify-center">
            <span className="group-hover:hidden block">{isActive ? <Icons.Volume2 size={14} className="text-[#fa2d48] animate-pulse" /> : index + 1}</span>
            <span className="hidden group-hover:block text-white">
                <Icons.Play fill="currentColor" size={12} />
            </span>
        </div>

        {/* Thumbnail */}
        <div className="w-10 h-10 rounded-[4px] overflow-hidden mr-3 md:mr-4 flex-shrink-0 shadow-sm bg-neutral-800">
            <img 
                src={song.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=random`} 
                className="w-full h-full object-cover" 
                alt=""
                onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=333&color=fff`;
                }}
            />
        </div>

        {/* Title & Artist */}
        <div className="flex-1 min-w-0 pr-2 md:pr-4">
            <h4 className={`text-[13px] md:text-[14px] truncate mb-0.5 ${isActive ? 'text-[#fa2d48]' : 'text-white'}`}>
                {song.title}
            </h4>
            <p className="text-[11px] md:text-[12px] text-gray-400 truncate group-hover:text-white/70 transition-colors">
                {song.artist}
            </p>
        </div>

        {/* Album (Mock) */}
        <div className="hidden md:block w-1/3 min-w-0 pr-4">
            <p className="text-[13px] text-gray-400 truncate group-hover:text-white/70 transition-colors">
                {song.title} - Single
            </p>
        </div>

        {/* Duration (Mock) */}
        <div className="hidden sm:block w-12 text-right text-[12px] text-gray-500 font-variant-numeric tabular-nums group-hover:text-gray-300">
            3:45
        </div>
        
        {/* Actions */}
        <div className="w-8 md:w-10 flex justify-end">
             <button 
                onClick={onToggleLike}
                className={`p-1.5 rounded-full hover:bg-white/10 transition ${isLiked ? 'text-[#fa2d48] opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}
            >
                <Icons.Heart size={16} fill={isLiked ? "currentColor" : "none"} />
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
    const { state, playSong } = usePlayer();

    if (!state.isQueueVisible) return null;

    return (
        <div className="absolute top-0 right-0 h-full w-full md:w-[300px] bg-[#1c1c1e] md:border-l border-white/10 shadow-2xl z-[150] md:z-[50] flex flex-col backdrop-blur-3xl pt-safe pb-32 md:pb-24 animate-in slide-in-from-right duration-300">
             {/* Mobile specific close header or normal header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between mt-12 md:mt-0">
                <h2 className="text-lg font-bold text-white">Playing Next</h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {state.queue.map((song, index) => {
                    const isCurrent = state.currentSong?.id === song.id;
                    return (
                        <div 
                            key={`${song.id}-${index}`} 
                            className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-white/10 transition group ${isCurrent ? 'bg-white/5' : ''}`}
                            onClick={() => playSong(song, state.queue)}
                        >
                            <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 mr-3">
                                <img src={song.thumbnail} className="w-full h-full object-cover" alt={song.title} />
                                {isCurrent && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                         <Icons.Volume2 size={16} className="text-[#fa2d48] animate-pulse" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isCurrent ? 'text-[#fa2d48]' : 'text-white'}`}>{song.title}</p>
                                <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const LyricsOverlay: React.FC = () => {
    const { state, toggleLyrics, togglePlay, playNext, playPrevious, seekTo, toggleQueue } = usePlayer();
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
                         <h3 className="text-2xl text-white/60 font-medium drop-shadow-sm">{state.currentSong.artist}</h3>
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
                                <h3 className="text-lg text-white/60">{state.currentSong.artist}</h3>
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
                            <Icons.SkipBack size={32} md:size={40} fill="currentColor" />
                        </button>
                        <button 
                            onClick={togglePlay} 
                            className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition shadow-2xl"
                        >
                            {state.isPlaying ? <Icons.Pause size={36} md:size={40} fill="currentColor" /> : <Icons.Play size={36} md:size={40} fill="currentColor" className="ml-1" />}
                        </button>
                        <button onClick={playNext} className="text-white/70 hover:text-white transition active:scale-90 p-2">
                            <Icons.SkipForward size={32} md:size={40} fill="currentColor" />
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
    selectedArtist: string | null;
    setSelectedArtist: (a: string | null) => void;
}

const MainContent: React.FC<MainContentProps> = ({ view, searchQuery, onSearch, setView, selectedArtist, setSelectedArtist }) => {
  const { playSong, toggleLike, state } = usePlayer();
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
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
      playSong(song, contextList);
  };

  const greeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good Morning";
      if (hour < 18) return "Good Afternoon";
      return "Good Evening";
  };

  // Helper to filter blocked songs
  const visibleSongs = (songs: Song[]) => songs.filter(s => !state.unplayableIds.includes(s.videoId));

  // --- Views ---

  const renderHome = () => (
    <div className="pb-12">
        <div className="mb-6 mt-2 border-b border-white/5 pb-4">
             <h1 className="text-[28px] md:text-[32px] font-bold text-white tracking-tight leading-tight">{greeting()}</h1>
        </div>
        
        {/* Featured Playlists */}
        <div className="mb-10">
             <div className="flex justify-between items-end mb-4 px-1">
                <h3 className="text-xl font-bold text-white">Made For You</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {MOCK_PLAYLISTS.slice(0, 3).map((p, i) => (
                      <div key={p.id} className="group relative h-48 md:h-64 rounded-[12px] overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300">
                          <img src={p.cover} className="w-full h-full object-cover transition duration-700 group-hover:scale-105" alt={p.title} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                          <div className="absolute bottom-0 left-0 p-6 w-full">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1">
                                    {i === 0 ? "New Music Mix" : "Station"}
                                </p>
                                <p className="text-2xl font-bold text-white leading-tight mb-2">{p.title}</p>
                                <p className="text-sm text-gray-300 line-clamp-1">Featuring Ed Sheeran, The Weeknd, and more.</p>
                          </div>
                          <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                                <div className="w-10 h-10 bg-[#fa2d48] rounded-full flex items-center justify-center text-white shadow-lg">
                                    <Icons.Play fill="currentColor" size={18} className="ml-1" />
                                </div>
                          </div>
                      </div>
                 ))}
             </div>
        </div>

        {/* New Releases Horizontal Scroll */}
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-xl font-bold text-white">New Releases</h3>
                <button className="text-[#fa2d48] text-[13px] font-medium hover:underline">See All</button>
            </div>
            
            <div className="flex space-x-5 overflow-x-auto pb-6 scrollbar-hide -mx-4 md:-mx-8 px-4 md:px-8 snap-x">
                {visibleSongs(INITIAL_SONGS).map((song) => (
                    <div key={song.id} className="flex-shrink-0 w-[140px] md:w-[160px] snap-start">
                        <SongCard 
                            song={song} 
                            onClick={() => handlePlay(song, visibleSongs(INITIAL_SONGS))} 
                            isLiked={state.likedSongs.some(s => s.id === song.id)}
                            onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                        />
                    </div>
                ))}
            </div>
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
                            onClick={() => handlePlay(song, visibleSongs(searchResults))} 
                            isActive={state.currentSong?.id === song.id}
                            isLiked={state.likedSongs.some(s => s.id === song.id)}
                            onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
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
    const artistSongs = visibleSongs(state.likedSongs.filter(s => s.artist === selectedArtist));
    const artistImage = artistSongs[0]?.thumbnail;

    return (
        <div className="-mx-4 md:-mx-8 -mt-8">
             <div className="relative h-[250px] md:h-[300px] flex items-end p-6 md:p-8 overflow-hidden mb-4">
                 {/* Back Button */}
                 <button 
                    onClick={() => setView(View.LIBRARY_ARTISTS)}
                    className="absolute top-4 left-4 md:top-8 md:left-8 z-30 flex items-center space-x-2 bg-black/40 hover:bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg transition text-white"
                 >
                     <Icons.SkipBack className="rotate-0" size={16} />
                     <span className="text-sm font-medium">Back to Artists</span>
                 </button>

                 <div className="absolute inset-0 z-0">
                      <img src={artistImage} className="w-full h-full object-cover blur-[50px] opacity-30 scale-125" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] to-transparent"></div>
                 </div>
                 <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6 w-full">
                     <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-2xl border-4 border-[#1c1c1e] flex-shrink-0">
                         <img src={artistImage} className="w-full h-full object-cover" alt={selectedArtist} />
                     </div>
                     <div className="text-center md:text-left">
                         <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{selectedArtist}</h1>
                         <p className="text-gray-400 font-medium">{artistSongs.length} Songs in Library</p>
                     </div>
                 </div>
             </div>

             <div className="px-4 md:px-8 pb-32">
                 {/* Controls */}
                 <div className="flex items-center justify-center md:justify-start space-x-4 mb-6">
                     <button onClick={() => handlePlay(artistSongs[0], artistSongs)} className="flex items-center space-x-2 bg-[#fa2d48] text-white px-6 py-2.5 rounded-full font-semibold hover:bg-[#d61e35] transition shadow-md active:scale-95">
                        <Icons.Play fill="currentColor" size={18} />
                        <span>Play</span>
                     </button>
                     <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-[#fa2d48] transition">
                        <Icons.Shuffle size={18} />
                     </button>
                 </div>

                 <h2 className="text-xl font-bold text-white mb-4">Songs</h2>
                 <div className="bg-[#1c1c1e] divide-y divide-white/5 border-t border-white/5">
                    {artistSongs.map((song, index) => (
                        <SongRow 
                            key={song.id} 
                            song={song} 
                            index={index}
                            onClick={() => handlePlay(song, artistSongs)} 
                            isActive={state.currentSong?.id === song.id}
                            isLiked={true}
                            onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                        />
                    ))}
                </div>
             </div>
        </div>
    );
  };

  const renderLibrary = (filter: 'songs' | 'artists' | 'albums' = 'songs') => {
      const liked = visibleSongs(state.likedSongs);

      return (
        <div className="pt-2">
             <div className="flex items-center justify-between mb-6">
                <h1 className="text-[28px] md:text-[32px] font-bold text-white capitalize">{filter}</h1>
                {filter === 'songs' && <div className="text-sm text-[#fa2d48] font-medium cursor-pointer hover:underline">Sort By</div>}
            </div>

            {liked.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
                    <div className="bg-[#2c2c2e] p-6 rounded-full mb-4">
                        <Icons.Music className="opacity-40" size={40} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No Music</h2>
                    <p className="text-sm">Songs you add to your library will appear here.</p>
                </div>
            ) : filter === 'artists' ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8 gap-4">
                  {Array.from(new Set(liked.map(s => s.artist))).map(artist => {
                      const artSong = liked.find(s => s.artist === artist);
                      return (
                          <div 
                            key={artist} 
                            onClick={() => { setSelectedArtist(artist); setView(View.LIBRARY_ARTIST_DETAIL); }}
                            className="group flex flex-col items-center p-4 rounded-xl hover:bg-white/5 transition cursor-pointer"
                          >
                              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-44 lg:h-44 rounded-full overflow-hidden mb-4 shadow-lg bg-neutral-800 border border-white/5">
                                   <img src={artSong?.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={artist} />
                              </div>
                              <h3 className="text-white font-medium text-base text-center truncate w-full">{artist}</h3>
                              <p className="text-xs text-gray-500 mt-1">{liked.filter(s => s.artist === artist).length} Songs</p>
                          </div>
                      );
                  })}
              </div>
            ) : filter === 'albums' ? (
              // ALBUM VIEW (Grid of "Albums" - simulating by using Song data but distinct grid view)
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8 gap-4">
                  {/* Grouping songs by artist and treating them as albums for visual purposes */}
                   {liked.map(song => (
                        <div key={song.id} className="flex flex-col">
                             <SongCard 
                                song={song} 
                                onClick={() => handlePlay(song, liked)} 
                                isLiked={true} 
                                onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                            />
                        </div>
                   ))}
               </div>
            ) : (
                // SONG VIEW (List of Songs)
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

                    {liked.slice().reverse().map((song, index) => (
                        <SongRow 
                            key={song.id} 
                            song={song} 
                            index={index}
                            onClick={() => handlePlay(song, liked)} 
                            isActive={state.currentSong?.id === song.id}
                            isLiked={true}
                            onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                        />
                    ))}
                </div>
            )}
        </div>
      );
  }

  const renderPlaylist = (title: string) => {
      // Create a deterministic "random" set of songs for the playlist view
      const playlistSongs = visibleSongs([...INITIAL_SONGS, ...INITIAL_SONGS].slice(0, 8)); 
      
      return (
        <div className="-mx-4 md:-mx-8 -mt-8">
            {/* Playlist Header */}
            <div className="relative h-[350px] md:h-[400px] flex items-end p-6 md:p-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-[#1c1c1e] z-0"></div>
                <img src={`https://picsum.photos/800/800?random=${title}`} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 blur-sm" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-[#1c1c1e]/40 to-transparent z-10"></div>
                
                <div className="relative z-20 flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-8 w-full">
                    <div className="w-40 h-40 md:w-56 md:h-56 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-md overflow-hidden flex-shrink-0">
                         <img src={`https://picsum.photos/800/800?random=${title}`} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex flex-col text-center md:text-left">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2">Playlist</span>
                        <h1 className="text-3xl md:text-6xl font-bold text-white mb-2 md:mb-4 tracking-tight shadow-sm">{title}</h1>
                        <p className="text-gray-300 font-medium mb-4 md:mb-6 text-sm md:text-base">Apple Music Chill • Updated Yesterday</p>
                        <div className="flex items-center justify-center md:justify-start space-x-4">
                            <button onClick={() => handlePlay(playlistSongs[0], playlistSongs)} className="flex items-center space-x-2 bg-[#fa2d48] text-white px-6 md:px-8 py-2 md:py-3 rounded-full font-semibold hover:bg-[#d61e35] transition shadow-lg active:scale-95">
                                <Icons.Play fill="currentColor" size={20} />
                                <span>Play</span>
                            </button>
                            <button className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/10 hover:bg-white/20 text-[#fa2d48] transition">
                                <Icons.Shuffle size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Song List */}
            <div className="px-4 md:px-8 pb-32">
                 {/* List Header */}
                 <div className="flex items-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-white/5 mb-2 sticky top-0 bg-[#1c1c1e] z-30">
                     <div className="w-8 md:w-12 text-center">#</div>
                     <div className="w-10 md:w-14"></div>
                     <div className="flex-1">Title</div>
                     <div className="hidden md:block w-1/3">Album</div>
                     <div className="hidden sm:block w-12 text-right"><Icons.Clock size={14} /></div>
                     <div className="w-8 md:w-10"></div>
                 </div>

                {playlistSongs.map((song, index) => (
                    <SongRow 
                        key={`${song.id}-${index}`} 
                        song={song} 
                        index={index}
                        onClick={() => handlePlay(song, playlistSongs)} 
                        isActive={state.currentSong?.id === song.id}
                        isLiked={state.likedSongs.some(s => s.id === song.id)}
                        onToggleLike={(e) => { e.stopPropagation(); toggleLike(song); }}
                    />
                ))}
            </div>
        </div>
      );
  }

  // --- Render Logic ---
  let content;
  switch (view) {
      case View.HOME: content = renderHome(); break;
      case View.SEARCH: content = renderSearch(); break;
      case View.LIBRARY: 
      case View.LIBRARY_SONGS: content = renderLibrary('songs'); break;
      case View.LIBRARY_ARTISTS: content = renderLibrary('artists'); break;
      case View.LIBRARY_ALBUMS: content = renderLibrary('albums'); break;
      case View.LIBRARY_ARTIST_DETAIL: content = renderArtistDetail(); break;
      case View.PLAYLIST_CHILL: content = renderPlaylist('Chill Mix'); break;
      case View.PLAYLIST_TOP: content = renderPlaylist('Top Hits'); break;
      default: content = renderPlaylist('Playlist'); break;
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 scroll-smooth pb-36 md:pb-32">
        {content}
    </div>
  );
};

// --- App Component with State Management ---

const AppContent: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>(View.HOME);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentView(View.SEARCH);
    };

    const handleNav = (view: View) => {
        setCurrentView(view);
        if (view !== View.SEARCH) {
            setSearchQuery("");
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#1c1c1e] text-white overflow-hidden font-sans selection:bg-[#fa2d48] selection:text-white">
            <Sidebar currentView={currentView} setView={handleNav} onSearch={handleSearch} />
            <div className="flex-1 relative h-full overflow-hidden flex flex-col">
                <MainContent 
                    view={currentView} 
                    searchQuery={searchQuery} 
                    onSearch={handleSearch} 
                    setView={handleNav}
                    selectedArtist={selectedArtist}
                    setSelectedArtist={setSelectedArtist}
                />
                <LyricsOverlay />
                <QueueSidebar />
            </div>
            <PlayerBar />
            <BottomNav currentView={currentView} setView={handleNav} />
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

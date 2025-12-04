import React, { useState, useEffect } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import { View, Song } from './types';
import { INITIAL_SONGS, MOCK_PLAYLISTS } from './constants';
import { searchYouTube, getLyrics } from './services/geminiService';
import { Icons } from './components/Icons';

// --- Subcomponents ---

const SongCard: React.FC<{ song: Song; onClick: () => void; isLiked?: boolean; onToggleLike?: (e: React.MouseEvent) => void }> = ({ song, onClick, isLiked, onToggleLike }) => (
  <div 
    onClick={onClick}
    className="group flex flex-col p-3 -mx-3 rounded-lg hover:bg-white/5 transition-colors duration-200 cursor-pointer"
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
        className={`group flex items-center py-2 px-4 rounded-md hover:bg-white/10 transition-colors cursor-pointer select-none ${isActive ? 'bg-white/10' : ''}`}
    >
        {/* Index / Play Icon */}
        <div className="w-8 text-center text-gray-500 text-sm font-medium mr-2 flex justify-center">
            <span className="group-hover:hidden block">{isActive ? <Icons.Volume2 size={14} className="text-[#fa2d48] animate-pulse" /> : index + 1}</span>
            <span className="hidden group-hover:block text-white">
                <Icons.Play fill="currentColor" size={12} />
            </span>
        </div>

        {/* Thumbnail */}
        <div className="w-10 h-10 rounded-[4px] overflow-hidden mr-4 flex-shrink-0 shadow-sm bg-neutral-800">
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
        <div className="flex-1 min-w-0 pr-4">
            <h4 className={`text-[14px] truncate mb-0.5 ${isActive ? 'text-[#fa2d48]' : 'text-white'}`}>
                {song.title}
            </h4>
            <p className="text-[12px] text-gray-400 truncate group-hover:text-white/70 transition-colors">
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
        <div className="w-10 flex justify-end">
             <button 
                onClick={onToggleLike}
                className={`p-1.5 rounded-full hover:bg-white/10 transition ${isLiked ? 'text-[#fa2d48] opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}
            >
                <Icons.Heart size={16} fill={isLiked ? "currentColor" : "none"} />
            </button>
        </div>
    </div>
);

const LyricsOverlay: React.FC = () => {
    const { state, toggleLyrics } = usePlayer();
    const [lyrics, setLyrics] = useState<string>("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (state.currentSong && state.isLyricsVisible) {
            setLoading(true);
            setLyrics("");
            getLyrics(state.currentSong.title, state.currentSong.artist)
                .then(text => {
                    setLyrics(text);
                    setLoading(false);
                });
        }
    }, [state.currentSong, state.isLyricsVisible]);

    if (!state.isLyricsVisible || !state.currentSong) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#1c1c1e] animate-in fade-in duration-300">
            {/* Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <img 
                    src={state.currentSong.thumbnail} 
                    className="w-full h-full object-cover blur-[100px] opacity-40 scale-150 saturate-200" 
                    alt="" 
                />
                <div className="absolute inset-0 bg-black/20"></div>
            </div>

            {/* Controls Header */}
            <div className="relative z-50 flex justify-end p-8">
                <button 
                    onClick={toggleLyrics}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all"
                >
                    <Icons.VolumeX size={16} className="rotate-45" />
                </button>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col md:flex-row h-full overflow-hidden pb-32 max-w-7xl mx-auto w-full">
                 
                 {/* Left Side: Album Art */}
                 <div className="hidden md:flex flex-col justify-center items-end w-[45%] h-full p-12 pr-16 sticky top-0">
                     <div className="w-full max-w-[380px] aspect-square shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)] rounded-[12px] overflow-hidden relative border border-white/10">
                        <img 
                            src={state.currentSong.thumbnail} 
                            className="w-full h-full object-cover" 
                            alt={state.currentSong.title} 
                        />
                     </div>
                     <div className="mt-8 text-right max-w-[380px] w-full">
                         <h2 className="text-3xl font-bold text-white mb-2 leading-tight drop-shadow-md tracking-tight">{state.currentSong.title}</h2>
                         <h3 className="text-xl text-white/60 font-medium drop-shadow-sm">{state.currentSong.artist}</h3>
                     </div>
                 </div>

                 {/* Right Side: Lyrics */}
                 <div className="flex-1 h-full overflow-y-auto custom-scrollbar scroll-smooth mask-image-b">
                    <div className="min-h-full flex flex-col justify-start md:justify-center items-start p-8 md:p-12 md:pl-0 pt-20 pb-48">
                        {/* Mobile Header */}
                        <div className="md:hidden flex flex-col items-center mb-10 w-full text-center sticky top-0 bg-transparent z-20 pb-4">
                             <div className="w-64 h-64 rounded-xl shadow-2xl mb-6 overflow-hidden border border-white/10">
                                <img src={state.currentSong.thumbnail} className="w-full h-full object-cover" alt="" />
                             </div>
                             <div>
                                <h2 className="text-2xl font-bold text-white mb-1">{state.currentSong.title}</h2>
                                <h3 className="text-lg text-white/60">{state.currentSong.artist}</h3>
                            </div>
                        </div>

                        {loading ? (
                             <div className="space-y-6 w-full max-w-2xl animate-pulse px-4">
                                <div className="h-10 bg-white/10 rounded-lg w-3/4"></div>
                                <div className="h-10 bg-white/10 rounded-lg w-2/3"></div>
                                <div className="h-10 bg-white/10 rounded-lg w-1/2"></div>
                             </div>
                        ) : (
                            <div className="text-[32px] md:text-[44px] font-bold leading-[1.3] text-white/50 font-sans tracking-tight max-w-3xl px-4 md:px-0">
                                {lyrics.split('\n').map((line, i) => (
                                    <p 
                                        key={i} 
                                        className={`mb-8 transition-all duration-500 origin-left ${
                                            line.trim() === '' ? 'h-0 mb-4' : 'hover:text-white hover:scale-[1.01] hover:blur-none cursor-default'
                                        }`}
                                    >
                                        {line}
                                    </p>
                                ))}
                                <div className="h-32"></div>
                            </div>
                        )}
                    </div>
                 </div>
            </div>
        </div>
    );
};

interface MainContentProps {
    view: View;
    searchQuery: string;
    onSearch: (q: string) => void;
}

const MainContent: React.FC<MainContentProps> = ({ view, searchQuery, onSearch }) => {
  const { playSong, toggleLike, state } = usePlayer();
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Trigger search when searchQuery changes
  useEffect(() => {
      if (searchQuery) {
          setIsSearching(true);
          setSearchResults([]); // Clear previous results
          searchYouTube(searchQuery).then(results => {
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

  // --- Views ---

  const renderHome = () => (
    <div className="pb-12">
        <div className="mb-6 mt-2 border-b border-white/5 pb-4">
             <h1 className="text-[32px] font-bold text-white tracking-tight leading-tight">{greeting()}</h1>
        </div>
        
        {/* Featured Playlists */}
        <div className="mb-10">
             <div className="flex justify-between items-end mb-4 px-1">
                <h3 className="text-xl font-bold text-white">Made For You</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {MOCK_PLAYLISTS.slice(0, 3).map((p, i) => (
                      <div key={p.id} className="group relative h-64 rounded-[12px] overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300">
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
            
            <div className="flex space-x-5 overflow-x-auto pb-6 scrollbar-hide -mx-8 px-8 snap-x">
                {INITIAL_SONGS.map((song) => (
                    <div key={song.id} className="flex-shrink-0 w-[160px] snap-start">
                        <SongCard 
                            song={song} 
                            onClick={() => handlePlay(song, INITIAL_SONGS)} 
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
        <h1 className="text-[32px] font-bold text-white mb-6">
            {searchQuery ? `Results for "${searchQuery}"` : "Browse"}
        </h1>
        
        {isSearching ? (
             <div className="flex justify-center py-20">
                 <div className="animate-spin h-8 w-8 border-2 border-[#fa2d48] border-t-transparent rounded-full"></div>
             </div>
        ) : searchQuery && searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Icons.Search size={48} className="mb-4 opacity-50" />
                <p className="text-lg">No results found.</p>
                <p className="text-sm">Try searching for a different song or artist.</p>
            </div>
        ) : searchResults.length > 0 && searchQuery ? (
            <div>
                <h3 className="text-lg font-bold text-white mb-4">Top Results</h3>
                <div className="bg-[#1c1c1e] divide-y divide-white/5 border-t border-white/5">
                    {searchResults.map((song, index) => (
                        <SongRow 
                            key={song.id} 
                            song={song} 
                            index={index}
                            onClick={() => handlePlay(song, searchResults)} 
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
                     <div key={genre} className="h-32 rounded-lg bg-[#2c2c2e] hover:bg-[#3a3a3c] transition cursor-pointer relative overflow-hidden p-4 group">
                         <h3 className="text-lg font-bold text-white z-10 relative">{genre}</h3>
                         <div className={`absolute -bottom-2 -right-2 w-20 h-20 rounded-lg transform rotate-12 bg-gradient-to-br from-blue-500 to-purple-600 opacity-80 group-hover:scale-110 transition duration-500`}></div>
                     </div>
                 ))}
            </div>
        )}
    </div>
  );

  const renderLibrary = (filter: 'songs' | 'artists' | 'albums' = 'songs') => {
      const liked = state.likedSongs;

      return (
        <div className="pt-2">
             <div className="flex items-center justify-between mb-6">
                <h1 className="text-[32px] font-bold text-white capitalize">{filter}</h1>
                <div className="text-sm text-[#fa2d48] font-medium cursor-pointer hover:underline">Sort By</div>
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
                          <div key={artist} className="group flex flex-col items-center p-4 rounded-xl hover:bg-white/5 transition cursor-pointer">
                              <div className="w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden mb-4 shadow-lg bg-neutral-800 border border-white/5">
                                   <img src={artSong?.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={artist} />
                              </div>
                              <h3 className="text-white font-medium text-base text-center truncate w-full">{artist}</h3>
                          </div>
                      );
                  })}
              </div>
            ) : (
                <div className="bg-transparent">
                     {/* List Header */}
                     <div className="flex items-center px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-white/10 mb-2">
                         <div className="w-12 text-center">#</div>
                         <div className="w-14"></div>
                         <div className="flex-1">Title</div>
                         <div className="hidden md:block w-1/3">Album</div>
                         <div className="hidden sm:block w-12 text-right"><Icons.Clock size={14} /></div>
                         <div className="w-10"></div>
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
      const playlistSongs = [...INITIAL_SONGS, ...INITIAL_SONGS].slice(0, 8); 
      
      return (
        <div className="-mx-8 -mt-8">
            {/* Playlist Header */}
            <div className="relative h-[400px] flex items-end p-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-[#1c1c1e] z-0"></div>
                <img src={`https://picsum.photos/800/800?random=${title}`} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 blur-sm" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-[#1c1c1e]/40 to-transparent z-10"></div>
                
                <div className="relative z-20 flex flex-col md:flex-row items-center md:items-end space-y-6 md:space-y-0 md:space-x-8 w-full">
                    <div className="w-56 h-56 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-md overflow-hidden flex-shrink-0">
                         <img src={`https://picsum.photos/800/800?random=${title}`} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex flex-col text-center md:text-left">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2">Playlist</span>
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight shadow-sm">{title}</h1>
                        <p className="text-gray-300 font-medium mb-6">Apple Music Chill • Updated Yesterday</p>
                        <div className="flex items-center justify-center md:justify-start space-x-4">
                            <button onClick={() => handlePlay(playlistSongs[0], playlistSongs)} className="flex items-center space-x-2 bg-[#fa2d48] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#d61e35] transition shadow-lg active:scale-95">
                                <Icons.Play fill="currentColor" size={20} />
                                <span>Play</span>
                            </button>
                            <button className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-[#fa2d48] transition">
                                <Icons.Shuffle size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Song List */}
            <div className="px-8 pb-32">
                 {/* List Header */}
                 <div className="flex items-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-white/5 mb-2 sticky top-0 bg-[#1c1c1e] z-30">
                     <div className="w-12 text-center">#</div>
                     <div className="w-14"></div>
                     <div className="flex-1">Title</div>
                     <div className="hidden md:block w-1/3">Album</div>
                     <div className="hidden sm:block w-12 text-right"><Icons.Clock size={14} /></div>
                     <div className="w-10"></div>
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

  return (
    <div className="flex-1 h-full overflow-y-auto pb-32 relative custom-scrollbar bg-[#1c1c1e] scroll-smooth">
        <div className="px-8 pt-8 min-h-screen max-w-[1920px] mx-auto">
            {view === View.HOME && renderHome()}
            {view === View.SEARCH && renderSearch()}
            {(view === View.LIBRARY || view === View.LIBRARY_SONGS) && renderLibrary('songs')}
            {view === View.LIBRARY_ARTISTS && renderLibrary('artists')}
            {view === View.LIBRARY_ALBUMS && renderLibrary('songs')}
            {view === View.PLAYLIST_CHILL && renderPlaylist("Chill Mix")}
            {view === View.PLAYLIST_TOP && renderPlaylist("Top Hits")}
        </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (q: string) => {
      setSearchQuery(q);
      setCurrentView(View.SEARCH);
  }

  const handleNav = (view: View) => {
      setCurrentView(view);
      // Clear search if explicitly navigating to Browse (which reuses Search view) or Home
      if (view === View.SEARCH || view === View.HOME) {
          setSearchQuery(""); 
      }
  }

  return (
    <PlayerProvider>
      <div className="flex h-screen w-full bg-[#1c1c1e] text-white overflow-hidden font-sans selection:bg-[#fa2d48] selection:text-white">
        <Sidebar currentView={currentView} setView={handleNav} onSearch={handleSearch} />
        <div className="flex-1 relative h-full overflow-hidden flex flex-col">
            <MainContent view={currentView} searchQuery={searchQuery} onSearch={handleSearch} />
            <LyricsOverlay />
        </div>
        <PlayerBar />
      </div>
    </PlayerProvider>
  );
};

export default App;
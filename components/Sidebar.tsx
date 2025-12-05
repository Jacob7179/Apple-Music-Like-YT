import React, { useState } from 'react';
import { View } from '../types';
import { Icons } from './Icons';
import { Maximize2, Minimize2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  onSearch: (query: string) => void;
  onPlaylistSelect: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onSearch, onPlaylistSelect }) => {
  const [searchVal, setSearchVal] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { state, createPlaylist } = usePlayer();

  const handleSearchSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      onSearch(searchVal);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => setIsFullScreen(true));
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => setIsFullScreen(false));
        }
    }
  };

  const navItems = [
    { id: View.HOME, label: 'Home', icon: Icons.Home },
    { id: View.SEARCH, label: 'Browse', icon: Icons.Browse }, 
    { id: View.RADIO, label: 'Radio', icon: Icons.Radio }, 
  ];

  const libraryItems = [
    { id: View.LIBRARY, label: 'Recently Added', icon: Icons.Clock },
    { id: View.LIBRARY_ARTISTS, label: 'Artists', icon: Icons.Mic2 },
    { id: View.LIBRARY_ALBUMS, label: 'Albums', icon: Icons.Library },
    { id: View.LIBRARY_SONGS, label: 'Songs', icon: Icons.Music },
  ];

  const handleCreatePlaylist = () => {
      const name = prompt("New Playlist Name");
      if (name) createPlaylist(name);
  };

  return (
    <div className="w-[260px] h-full bg-[#1e1e1e]/95 flex flex-col pt-6 pb-4 px-3 border-r border-white/5 shadow-2xl z-20 hidden md:flex backdrop-blur-xl">
      {/* Search Input in Sidebar (Mac/iPad style) */}
      <div className="px-2 mb-6">
        <div className="relative group">
            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#fa2d48] transition-colors" size={16} />
            <input 
                type="text" 
                placeholder="Search" 
                className="w-full bg-[#2c2c2e] text-white/90 pl-9 pr-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#fa2d48]/50 focus:bg-[#3a3a3c] placeholder-gray-500 transition-all"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={handleSearchSubmit}
            />
        </div>
      </div>

      <div className="space-y-1 mb-8">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-[15px] font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-[#3a3a3c] text-[#fa2d48]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-[#fa2d48]' : 'text-current'} strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="px-3 mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Library</h3>
      </div>
      <div className="space-y-1 mb-8">
        {libraryItems.map((item) => {
            const isActive = currentView === item.id;
            return (
                <button 
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-[15px] transition-all ${
                        isActive ? 'bg-[#3a3a3c] text-[#fa2d48]' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <item.icon size={20} strokeWidth={2} />
                    <span>{item.label}</span>
                </button>
            );
        })}
      </div>
      
      <div className="px-3 mb-2 flex items-center justify-between group">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Playlists</h3>
        <button onClick={handleCreatePlaylist}>
            <Icons.Plus size={14} className="text-gray-500 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-white transition" />
        </button>
      </div>
      <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar mb-4">
         {state.playlists.map((pl) => {
            // Check if this playlist is currently selected in Details view
            const isActive = false; // Simplified logic, main selection state is in App
            return (
                <button 
                    key={pl.id}
                    onClick={() => onPlaylistSelect(pl.id)}
                    className={`w-full text-left px-3 py-2 text-[15px] rounded-md transition truncate ${
                        isActive ? 'bg-[#3a3a3c] text-[#fa2d48]' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    {pl.title}
                </button>
            )
         })}
      </div>

      <div className="px-3 mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Settings</h3>
         <button
            onClick={() => setView(View.SETTINGS)}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-[15px] font-medium transition-all duration-200 ${
            currentView === View.SETTINGS
                ? 'bg-[#3a3a3c] text-[#fa2d48]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
            <Icons.Settings size={20} strokeWidth={2} />
            <span>Settings</span>
        </button>
      </div>

      <div className="pt-4 border-t border-white/5 px-2">
          <button 
            onClick={toggleFullScreen}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
              {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              <span className="text-[14px]">Full Screen</span>
          </button>
      </div>
    </div>
  );
};

export default Sidebar;
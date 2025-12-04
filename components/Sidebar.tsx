import React, { useState } from 'react';
import { View } from '../types';
import { Icons } from './Icons';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  onSearch: (query: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onSearch }) => {
  const [searchVal, setSearchVal] = useState("");

  const handleSearchSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      onSearch(searchVal);
      // Do not call setView(View.SEARCH) here, as it is handled by onSearch in the parent
      // and calling it directly via setView (which maps to handleNav) would clear the search query.
    }
  };

  const navItems = [
    { id: View.HOME, label: 'Home', icon: Icons.Home },
    { id: View.SEARCH, label: 'Browse', icon: Icons.Browse }, // Using SEARCH view logic for Browse mock for now
    { id: View.PLAYLIST_TOP, label: 'Radio', icon: Icons.Radio }, // Mock Radio
  ];

  const libraryItems = [
    { id: View.LIBRARY, label: 'Recently Added', icon: Icons.Clock },
    { id: View.LIBRARY_ARTISTS, label: 'Artists', icon: Icons.Mic2 },
    { id: View.LIBRARY_ALBUMS, label: 'Albums', icon: Icons.Library },
    { id: View.LIBRARY_SONGS, label: 'Songs', icon: Icons.Music },
  ];

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
        <Icons.Plus size={14} className="text-gray-500 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-white transition" />
      </div>
      <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
         {[
             { id: View.PLAYLIST_CHILL, label: 'Chill Mix' },
             { id: View.PLAYLIST_TOP, label: 'Top Hits' },
             { id: 'p3', label: 'Gym Flow' },
             { id: 'p4', label: 'Late Night' },
             { id: 'p5', label: 'Focus' }
         ].map((pl) => {
            const isActive = currentView === pl.id;
            return (
                <button 
                    key={pl.id}
                    onClick={() => setView(pl.id as View)}
                    className={`w-full text-left px-3 py-2 text-[15px] rounded-md transition truncate ${
                        isActive ? 'bg-[#3a3a3c] text-[#fa2d48]' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    {pl.label}
                </button>
            )
         })}
      </div>
    </div>
  );
};

export default Sidebar;
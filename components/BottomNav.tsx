
import React from 'react';
import { View } from '../types';
import { Icons } from './Icons';

interface BottomNavProps {
  currentView: View;
  setView: (view: View) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  const items = [
    { id: View.HOME, label: 'Home', icon: Icons.Home },
    { id: View.SEARCH, label: 'Browse', icon: Icons.Browse },
    { id: View.PLAYLIST_TOP, label: 'Radio', icon: Icons.Radio },
    { id: View.LIBRARY, label: 'Library', icon: Icons.Library },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-[#1e1e1e]/95 backdrop-blur-xl border-t border-white/10 z-[90] flex justify-around items-center px-2 pb-safe select-none">
      {items.map((item) => {
        const isActive = currentView === item.id || (item.id === View.LIBRARY && [View.LIBRARY_SONGS, View.LIBRARY_ALBUMS, View.LIBRARY_ARTISTS, View.LIBRARY_ARTIST_DETAIL].includes(currentView));
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform ${isActive ? 'text-[#fa2d48]' : 'text-gray-400'}`}
          >
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        )
      })}
    </div>
  );
};

export default BottomNav;

import React from 'react';
import { Radio, ArrowRightLeft, Radar, BookOpen, Clock } from 'lucide-react';
import { AppViewMode } from '../types';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../context/ThemeContext';

interface BottomNavigationProps {
  currentMode: AppViewMode;
  onSelectMode: (mode: AppViewMode) => void;
  unreadCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentMode,
  onSelectMode,
  unreadCount = 0,
}) => {
  const { isDark } = useTheme();

  const navItems = [
    {
      id: 'walkie_talkie' as AppViewMode,
      label: 'Walkie',
      sub: 'PTT Mesh',
      icon: Radio,
    },
    {
      id: 'dual_translator' as AppViewMode,
      label: 'Dual Talk',
      sub: 'Face-to-Face',
      icon: ArrowRightLeft,
    },
    {
      id: 'mesh_radar' as AppViewMode,
      label: 'Radar',
      sub: 'P2P Nodes',
      icon: Radar,
    },
    {
      id: 'phrasebook' as AppViewMode,
      label: 'Phrases',
      sub: 'Offline SOS',
      icon: BookOpen,
    },
    {
      id: 'history' as AppViewMode,
      label: 'Audio Log',
      sub: 'Transcripts',
      icon: Clock,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  return (
    <nav
      className={
        isDark
          ? 'bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-1 py-1 sm:px-2 sm:py-1.5 select-none z-30 shrink-0 pb-[max(0.25rem,env(safe-area-inset-bottom))]'
          : 'neo-glass-panel border-t border-white/85 px-1.5 py-1.5 sm:px-3 sm:py-2 select-none z-30 shadow-[0_-10px_35px_rgba(180,195,230,0.2)] shrink-0 pb-[max(0.35rem,env(safe-area-inset-bottom))]'
      }
    >
      <div className="max-w-xl mx-auto flex items-stretch justify-between gap-0.5 sm:gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentMode === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                audioEngine.triggerHaptic(25);
                onSelectMode(item.id);
              }}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 sm:px-1.5 rounded-xl sm:rounded-2xl transition-all relative ${
                isActive
                  ? isDark
                    ? 'text-emerald-400 font-bold bg-zinc-900/60'
                    : 'text-purple-600 font-bold bg-white/70 shadow-xs'
                  : isDark
                  ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-white/40'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'
                  }`}
                />
                {item.badge && (
                  <span
                    className={`absolute -top-1 -right-2 text-[8px] sm:text-[9px] font-bold rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center font-mono ${
                      isDark
                        ? 'bg-emerald-500 text-black'
                        : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9.5px] sm:text-[10px] tracking-tight mt-0.5 sm:mt-1 leading-tight font-mono truncate max-w-full text-center">
                {item.label}
              </span>
              <span
                className={`text-[7.5px] sm:text-[8px] font-mono leading-none mt-0.5 hidden sm:inline truncate max-w-full ${
                  isDark ? 'text-zinc-600' : 'text-slate-400'
                }`}
              >
                {item.sub}
              </span>

              {isActive && (
                <div
                  className={`w-3.5 sm:w-5 h-0.5 rounded-full mt-0.5 sm:mt-1 ${
                    isDark
                      ? 'bg-emerald-400'
                      : 'bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 shadow-sm'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

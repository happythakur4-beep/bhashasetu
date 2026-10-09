import React, { useState, useEffect } from 'react';
import {
  Radio,
  Wifi,
  WifiOff,
  Battery,
  Volume2,
  VolumeX,
  Cpu,
  Sun,
  Moon,
  Sparkles,
  Settings,
} from 'lucide-react';
import { ChannelNumber, RadioChannel } from '../types';
import { RADIO_CHANNELS } from '../services/languageRegistry';
import { meshNetwork } from '../services/meshNetwork';
import { useTheme } from '../context/ThemeContext';

interface HeaderBarProps {
  currentChannel: ChannelNumber;
  onSelectChannel: (channel: ChannelNumber) => void;
  isOnline: boolean;
  hasGeminiKey: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenRadar: () => void;
  onOpenSettings?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentChannel,
  onSelectChannel,
  isOnline,
  hasGeminiKey,
  isMuted,
  onToggleMute,
  onOpenRadar,
  onOpenSettings,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [timeStr, setTimeStr] = useState('');
  const [localNode, setLocalNode] = useState(meshNetwork.getLocalNode());
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeChannelConfig = RADIO_CHANNELS.find((c) => c.channel === currentChannel) || RADIO_CHANNELS[2];

  return (
    <header
      className={
        isDark
          ? 'bg-zinc-950 border-b border-zinc-800/80 text-zinc-100 select-none z-30 relative'
          : 'neo-glass-panel border-b border-white/80 text-slate-800 shadow-[0_4px_20px_rgba(180,195,225,0.14)] select-none z-30 relative'
      }
    >
      {/* Android Top Tactical System Bar */}
      <div
        className={
          isDark
            ? 'flex items-center justify-between px-3 py-1 text-xs font-mono text-zinc-400 border-b border-zinc-900 bg-black/40'
            : 'flex items-center justify-between px-3 py-1 text-xs font-mono text-slate-500 border-b border-white/60 bg-white/40 backdrop-blur-md'
        }
      >
        <div className="flex items-center space-x-2">
          <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
            {timeStr || '12:00 PM'}
          </span>
          <span className={isDark ? 'text-zinc-600' : 'text-slate-300'}>|</span>
          <span className={`truncate max-w-[130px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
            {localNode.name}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Engine status indicator */}
          <div
            className="flex items-center space-x-1"
            title={
              hasGeminiKey && isOnline
                ? 'Gemini 3.8 Live & Transcribe Active'
                : 'Offline Local Lexicon & Dialect Engine Active'
            }
          >
            <Cpu
              className={`w-3 h-3 ${
                hasGeminiKey && isOnline
                  ? isDark ? 'text-emerald-400' : 'text-purple-600'
                  : isDark ? 'text-amber-400' : 'text-amber-600'
              }`}
            />
            <span
              className={`text-[10px] uppercase font-bold tracking-wider ${
                hasGeminiKey && isOnline
                  ? isDark ? 'text-emerald-400' : 'text-purple-600 font-semibold'
                  : isDark ? 'text-amber-400' : 'text-amber-600 font-semibold'
              }`}
            >
              {hasGeminiKey && isOnline ? 'Gemini AI' : 'Offline Mesh'}
            </span>
          </div>

          <span className={isDark ? 'text-zinc-700' : 'text-slate-300'}>·</span>

          {/* Network Connection */}
          <div className="flex items-center space-x-1">
            {isOnline ? (
              <Wifi className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-blue-500'}`} />
            ) : (
              <WifiOff className={`w-3 h-3 ${isDark ? 'text-amber-500' : 'text-rose-500'}`} />
            )}
            <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <span className={isDark ? 'text-zinc-700' : 'text-slate-300'}>·</span>

          {/* Battery */}
          <div className={`flex items-center space-x-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            <Battery className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`} />
            <span className="text-[10px]">{localNode.batteryLevel || 94}%</span>
          </div>
        </div>
      </div>

      {/* Main Tactical Radio Frequency Bar */}
      <div
        className={
          isDark
            ? 'flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950'
            : 'flex items-center justify-between px-3 py-2 bg-white/50 backdrop-blur-md'
        }
      >
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <button
              onClick={() => setShowChannelDropdown(!showChannelDropdown)}
              className={
                isDark
                  ? `flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-left font-mono transition-all ${
                      activeChannelConfig.isEmergency
                        ? 'bg-red-950/80 border-red-500/60 text-red-200 ring-1 ring-red-500/30'
                        : 'bg-zinc-800/90 border-zinc-700 text-zinc-200 hover:bg-zinc-750'
                    }`
                  : `flex items-center space-x-2 px-3 py-1.5 rounded-2xl text-left font-mono transition-all neo-gel-button ${
                      activeChannelConfig.isEmergency
                        ? 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-300/80 text-rose-700'
                        : 'text-slate-800 hover:shadow-md'
                    }`
              }
            >
              <Radio
                className={`w-4 h-4 ${
                  activeChannelConfig.isEmergency
                    ? isDark ? 'text-red-400 animate-pulse' : 'text-rose-500 animate-pulse'
                    : isDark ? 'text-emerald-400' : 'text-purple-500'
                }`}
              />
              <div>
                <div
                  className={`text-[11px] font-bold tracking-wider leading-none flex items-center gap-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-500'
                  }`}
                >
                  <span>CH-{activeChannelConfig.channel}</span>
                  <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>·</span>
                  <span className={isDark ? 'text-amber-400' : 'text-pink-600 font-bold'}>
                    {activeChannelConfig.frequency}
                  </span>
                </div>
                <div
                  className={`text-xs font-semibold truncate max-w-[150px] sm:max-w-[210px] ${
                    isDark ? '' : 'text-slate-800'
                  }`}
                >
                  {activeChannelConfig.name}
                </div>
              </div>
            </button>

            {/* Channel Selection Dropdown */}
            {showChannelDropdown && (
              <div
                className={
                  isDark
                    ? 'absolute top-full left-0 mt-1.5 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100'
                    : 'absolute top-full left-0 mt-1.5 w-76 neo-glass-panel rounded-3xl p-2 z-50 shadow-[0_20px_50px_rgba(150,170,220,0.3)] border border-white/95 animate-in fade-in zoom-in-95 duration-100'
                }
              >
                <div
                  className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider border-b mb-1 ${
                    isDark ? 'text-zinc-400 border-zinc-800' : 'text-slate-500 border-slate-200/60 font-semibold'
                  }`}
                >
                  Select Mesh Frequency
                </div>
                {RADIO_CHANNELS.map((ch) => (
                  <button
                    key={ch.channel}
                    onClick={() => {
                      onSelectChannel(ch.channel);
                      setShowChannelDropdown(false);
                    }}
                    className={
                      isDark
                        ? `w-full text-left p-2 rounded-lg text-xs font-mono flex items-start space-x-2.5 transition-colors ${
                            ch.channel === currentChannel
                              ? 'bg-zinc-800 text-zinc-100 border border-zinc-600'
                              : 'text-zinc-300 hover:bg-zinc-800/60'
                          }`
                        : `w-full text-left p-2.5 rounded-2xl text-xs font-mono flex items-start space-x-2.5 transition-all ${
                            ch.channel === currentChannel
                              ? 'bg-gradient-to-r from-blue-50/90 via-purple-50/90 to-pink-50/90 text-purple-900 border border-purple-200/80 shadow-sm font-bold'
                              : 'text-slate-700 hover:bg-white/60'
                          }`
                    }
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        ch.isEmergency
                          ? 'bg-rose-500 animate-pulse'
                          : isDark ? 'bg-emerald-400' : 'bg-gradient-to-br from-blue-400 to-purple-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">
                          CH-{ch.channel}: {ch.frequency}
                        </span>
                        {ch.isEmergency && (
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              isDark ? 'text-red-400' : 'text-rose-600'
                            }`}
                          >
                            SOS
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] truncate ${isDark ? 'text-zinc-400' : 'text-slate-600 font-medium'}`}>
                        {ch.name}
                      </div>
                      <div className={`text-[10px] line-clamp-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        {ch.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action icons right */}
        <div className="flex items-center space-x-1.5">
          {/* Settings / Language Pack Manager button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className={
                isDark
                  ? 'p-2 rounded-lg border bg-zinc-850 border-zinc-750 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors'
                  : 'neo-gel-button p-2 rounded-2xl text-purple-600 hover:text-purple-700 hover:scale-105 active:scale-95 transition-all shadow-sm'
              }
              title="Language Pack Manager & Offline TTS Settings"
              aria-label="Settings and Language Packs"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className={
              isDark
                ? 'p-2 rounded-lg border bg-zinc-850 border-zinc-750 text-amber-400 hover:bg-zinc-800 transition-colors'
                : 'neo-gel-button p-2 rounded-2xl text-purple-600 hover:text-purple-700 hover:scale-105 active:scale-95 transition-all shadow-sm'
            }
            title={isDark ? 'Switch to Neo-Glassmorphism Light Mode' : 'Switch to Tactical Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Mute/Sound toggle */}
          <button
            onClick={onToggleMute}
            className={
              isDark
                ? `p-2 rounded-lg border transition-colors ${
                    isMuted
                      ? 'bg-red-950/40 border-red-800/50 text-red-400'
                      : 'bg-zinc-850 border-zinc-750 text-zinc-300 hover:bg-zinc-800'
                  }`
                : `p-2 rounded-2xl transition-all neo-gel-button ${
                    isMuted
                      ? 'bg-rose-50 text-rose-500 border-rose-200'
                      : 'text-slate-600 hover:text-slate-800'
                  }`
            }
            title={isMuted ? 'Radio Speaker Muted' : 'Radio Speaker Active'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Mesh Radar quick trigger */}
          <button
            onClick={onOpenRadar}
            className={
              isDark
                ? 'flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/50 transition-colors text-xs font-mono'
                : 'flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/15 border border-purple-200/80 text-purple-700 hover:shadow-md transition-all text-xs font-mono neo-gel-button'
            }
            title="Open Local Mesh Peer Radar"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isDark ? 'bg-emerald-400' : 'bg-pink-500'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isDark ? 'bg-emerald-500' : 'bg-purple-600'
                }`}
              ></span>
            </span>
            <span className="font-semibold hidden sm:inline">RADAR</span>
          </button>
        </div>
      </div>
    </header>
  );
};

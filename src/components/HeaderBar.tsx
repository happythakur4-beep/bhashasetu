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
  Share2,
  Check,
  HelpCircle,
  Activity,
  AlertCircle,
  Brain,
} from 'lucide-react';
import { ChannelNumber, RadioChannel } from '../types';
import { RADIO_CHANNELS } from '../services/languageRegistry';
import { meshNetwork } from '../services/meshNetwork';
import { peerMesh, PeerStatus } from '../services/peerMesh';
import { useTheme } from '../context/ThemeContext';
import { DiagnosticsModal } from './DiagnosticsModal';
import { OnboardingModal } from './OnboardingModal';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderBarProps {
  currentChannel: ChannelNumber;
  onSelectChannel: (channel: ChannelNumber) => void;
  isOnline: boolean;
  hasGeminiKey: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenRadar?: () => void;
  onOpenSettings?: () => void;
  onOpenWordLearning?: () => void;
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
  onOpenWordLearning,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [timeStr, setTimeStr] = useState('');
  const [localNode, setLocalNode] = useState(meshNetwork.getLocalNode());
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState(peerMesh.getRoomCode() || '');
  const [peerStatus, setPeerStatus] = useState<PeerStatus>(peerMesh.getStatus());
  const [peerCount, setPeerCount] = useState<number>(peerMesh.getPeerCount());
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const unsub = peerMesh.onStatusChange((status, count) => {
      setPeerStatus(status);
      setPeerCount(count);
      const activeRoom = peerMesh.getRoomCode();
      if (activeRoom && activeRoom !== roomCodeInput) {
        setRoomCodeInput(activeRoom);
      }
    });
    return () => unsub();
  }, [roomCodeInput]);

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

  const handleShareClick = () => {
    const code = roomCodeInput || peerMesh.getRoomCode() || '4829';
    if (!roomCodeInput) setRoomCodeInput(code);
    if (peerMesh.getRoomCode() !== code) peerMesh.joinRoom(code);

    const link = peerMesh.getShareLink(code);
    navigator.clipboard.writeText(link);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);

    if (peerMesh.isLocalhost()) {
      alert(`Room Link Copied: ${link}\n\n⚠️ Note: You are currently on localhost. To connect a physical phone over the Internet, make sure you open the deployed public app URL on both devices!`);
    }
  };

  return (
    <header
      className={
        isDark
          ? 'bg-zinc-950 border-b border-zinc-800/80 text-zinc-100 select-none z-30 relative'
          : 'neo-glass-panel border-b border-white/80 text-slate-800 shadow-[0_4px_20px_rgba(180,195,225,0.14)] select-none z-30 relative'
      }
    >
      {/* Top System Bar */}
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
          {/* Internet / Cloud status */}
          <div className="flex items-center space-x-1">
            {isOnline ? (
              <Wifi className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <span className={isDark ? 'text-zinc-700' : 'text-slate-300'}>·</span>

          {/* AI Server Key indicator */}
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
            hasGeminiKey ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60' : 'bg-amber-950/80 text-amber-300 border border-amber-600/60'
          }`}>
            {hasGeminiKey ? 'Gemini AI' : 'Offline Lexicon'}
          </span>
        </div>
      </div>

      {/* Main Tactical Intercom Frequency & Room Bar */}
      <div
        className={
          isDark
            ? 'flex items-center justify-between px-3 py-2 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950'
            : 'flex items-center justify-between px-3 py-2 bg-white/50 backdrop-blur-md'
        }
      >
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {/* Virtual Channel / Talkgroup Selector */}
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
                  className={`text-[10px] font-bold tracking-wider leading-none flex items-center gap-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-500'
                  }`}
                >
                  <span>TALKGROUP CH-{activeChannelConfig.channel}</span>
                </div>
                <div
                  className={`text-xs font-semibold truncate max-w-[130px] sm:max-w-[180px] ${
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
                  Select Room Virtual Talkgroup
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
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">CH-{ch.channel}: {ch.name}</span>
                      </div>
                      <div className="text-[10px] opacity-75">{ch.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4-digit Room Code & Real Room Status */}
          <div className="flex items-center space-x-1.5">
            <div className="flex items-center space-x-1">
              <input
                type="text"
                maxLength={6}
                placeholder="Room #"
                value={roomCodeInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setRoomCodeInput(val);
                  if (val.length >= 3) {
                    peerMesh.joinRoom(val);
                  }
                }}
                className={`w-20 px-2 py-1.5 text-xs font-mono rounded-lg border text-center outline-none transition-all ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-emerald-500'
                    : 'bg-white/80 border-slate-300 text-slate-800 focus:border-purple-500 shadow-sm'
                }`}
              />
              <button
                onClick={() => {
                  if (roomCodeInput.length >= 3) {
                    peerMesh.joinRoom(roomCodeInput);
                  } else {
                    const code = Math.floor(1000 + Math.random() * 9000).toString();
                    setRoomCodeInput(code);
                    peerMesh.joinRoom(code);
                  }
                }}
                className={`px-2 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                  peerStatus === 'connected'
                    ? isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                }`}
                title="Join or Create Room"
              >
                {peerStatus === 'connected' ? 'Linked' : 'Join'}
              </button>
            </div>

            {/* Share Link Button */}
            <button
              onClick={handleShareClick}
              className={`p-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 transition-all ${
                copiedShareLink
                  ? 'bg-emerald-500 text-white border-emerald-600'
                  : isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                  : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white shadow-sm'
              }`}
              title="Copy Room Link to open on mobile phone"
            >
              {copiedShareLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copiedShareLink ? 'Copied!' : 'Share'}</span>
            </button>

            {/* Truthful Room Connection State Badge */}
            {peerStatus === 'connected' && (
              <span className={`px-2 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                isDark ? 'bg-emerald-950/90 border border-emerald-600 text-emerald-300' : 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              }`}>
                🟢 Linked to {peerCount} Peer [{peerMesh.getRoomCode() || roomCodeInput}]
              </span>
            )}
            {peerStatus === 'waiting' && (
              <span className={`px-2 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                isDark ? 'bg-amber-950/80 border border-amber-600/80 text-amber-300 animate-pulse' : 'bg-amber-50 border border-amber-300 text-amber-800 animate-pulse'
              }`}
              title="Waiting for other phone or laptop to join this room code"
              >
                🟡 Waiting for Peer [{peerMesh.getRoomCode() || roomCodeInput}]
              </span>
            )}
            {peerStatus === 'connecting' && (
              <span className="px-2 py-1 rounded-full text-[10px] font-mono text-zinc-400 bg-zinc-800 animate-pulse">
                ⏳ Connecting...
              </span>
            )}
            {peerStatus === 'disconnected' && (
              <span className={`px-2 py-1 rounded-full text-[10px] font-mono shrink-0 ${
                isDark ? 'text-zinc-400 bg-zinc-850 border border-zinc-750' : 'text-slate-500 bg-slate-100 border border-slate-200'
              }`}>
                ⚪ No Room
              </span>
            )}
            {peerStatus === 'error' && (
              <span className="px-2 py-1 rounded-full text-[10px] font-mono text-red-300 bg-red-950/80 border border-red-500/80 shrink-0">
                ⚠️ Room Disconnected
              </span>
            )}
          </div>
        </div>

        {/* Right Action Icons: Guide, Diagnostics, Theme, Mute, Radar */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Onboarding Guide Button */}
          <button
            onClick={() => setShowOnboarding(true)}
            className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs font-mono ${
              isDark ? 'bg-zinc-850 border-zinc-750 text-purple-400 hover:bg-zinc-800' : 'bg-white border-slate-200 text-purple-700 shadow-xs'
            }`}
            title="Two-Device Connection Guide"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden lg:inline">Guide</span>
          </button>

          {/* Voice Word Learning Button */}
          {onOpenWordLearning && (
            <button
              onClick={onOpenWordLearning}
              className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs font-mono ${
                isDark
                  ? 'bg-purple-950/60 border-purple-800/80 text-purple-300 hover:bg-purple-900/60'
                  : 'bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100 shadow-xs font-bold'
              }`}
              title="Interactive Voice Word Learning & Dialect Model"
            >
              <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
              <span className="hidden lg:inline">Learn Word</span>
            </button>
          )}

          {/* Install PWA Button */}
          <PWAInstallButton variant="compact" />

          {/* Diagnostics Modal Button */}
          <button
            onClick={() => setShowDiagnostics(true)}
            className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs font-mono ${
              isDark ? 'bg-zinc-850 border-zinc-750 text-blue-400 hover:bg-zinc-800' : 'bg-white border-slate-200 text-blue-700 shadow-xs'
            }`}
            title="System & Health Diagnostics"
          >
            <Activity className="w-4 h-4" />
            <span className="hidden lg:inline">Health</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={
              isDark
                ? 'p-1.5 rounded-lg border bg-zinc-850 border-zinc-750 text-amber-400 hover:bg-zinc-800 transition-colors'
                : 'neo-gel-button p-1.5 rounded-2xl text-purple-600 hover:text-purple-700 transition-all shadow-sm'
            }
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Speaker Mute/Unmute */}
          <button
            onClick={onToggleMute}
            className={
              isDark
                ? `p-1.5 rounded-lg border transition-colors ${
                    isMuted
                      ? 'bg-red-950/40 border-red-800/50 text-red-400'
                      : 'bg-zinc-850 border-zinc-750 text-zinc-300 hover:bg-zinc-800'
                  }`
                : `p-1.5 rounded-2xl transition-all neo-gel-button ${
                    isMuted
                      ? 'bg-rose-50 text-rose-500 border-rose-200'
                      : 'text-slate-600 hover:text-slate-800'
                  }`
            }
            title={isMuted ? 'Speaker Muted' : 'Speaker Active'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
      />

      {/* Onboarding Guide Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </header>
  );
};

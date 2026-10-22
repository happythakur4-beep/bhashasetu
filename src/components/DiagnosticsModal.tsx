import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, RefreshCw, Cpu, Volume2, Mic, Wifi, Server, Activity } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { peerMesh, RemotePeer } from '../services/peerMesh';
import { audioEngine } from '../services/audioEngine';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audioCtxState, setAudioCtxState] = useState<string>('unknown');
  const [micMime, setMicMime] = useState<string>('');
  const [roomPeers, setRoomPeers] = useState<RemotePeer[]>([]);
  const [testChimePlaying, setTestChimePlaying] = useState(false);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setServerHealth(data);
      }
    } catch (e) {
      setServerHealth({ status: 'error', error: 'Failed to contact server' });
    } finally {
      setIsLoading(false);
    }

    try {
      const ctx = audioEngine.getAudioContext();
      setAudioCtxState(ctx.state);
    } catch {
      setAudioCtxState('unavailable');
    }

    setMicMime(audioEngine.getSupportedMimeType() || 'Standard MediaRecorder');
    setRoomPeers(peerMesh.getRemotePeers());
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const roomStatus = peerMesh.getStatus();
  const roomCode = peerMesh.getRoomCode();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-white/80 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3 mb-4 border-zinc-700/50">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-purple-500" />
            <h2 className="text-base font-mono font-bold tracking-wide">System &amp; Health Diagnostics</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDiagnostics}
              disabled={isLoading}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Refresh Diagnostics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 text-xs font-mono">
          {/* 1. Room Transport Section */}
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between font-bold mb-2">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Wifi className="w-4 h-4" />
                <span>Room Transport (/rooms WebSocket)</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                roomStatus === 'connected' ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' :
                roomStatus === 'waiting' ? 'bg-amber-950 text-amber-300 border border-amber-600' :
                'bg-zinc-800 text-zinc-400'
              }`}>
                {roomStatus}
              </span>
            </div>
            <div className="space-y-1 opacity-90">
              <div>Room Code: <span className="font-bold text-purple-400">{roomCode || 'None (Join a room to connect)'}</span></div>
              <div>Confirmed Remote Peers: <span className="font-bold">{roomPeers.length}</span></div>
              {roomPeers.length === 0 && roomStatus === 'waiting' && (
                <div className="text-amber-400/90 text-[11px] mt-1">
                  ⚠️ Waiting for second device. Enter Room Code <strong>{roomCode}</strong> on your phone or share link.
                </div>
              )}
              {roomPeers.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1">
                  <div className="text-[10px] uppercase opacity-75 font-bold">Connected Participants:</div>
                  {roomPeers.map((p) => (
                    <div key={p.clientId} className="flex justify-between items-center text-[11px] bg-zinc-900/60 p-1.5 rounded">
                      <span>{p.name} ({p.state})</span>
                      <span className="text-emerald-400 font-bold">Online</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. Server & Gemini API Models Section */}
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between font-bold mb-2">
              <span className="flex items-center gap-1.5 text-blue-400">
                <Server className="w-4 h-4" />
                <span>Server &amp; Gemini AI Models</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                serverHealth?.hasGeminiKey ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' : 'bg-amber-950 text-amber-300 border border-amber-600'
              }`}>
                {serverHealth?.hasGeminiKey ? 'API Key Active' : 'Offline Lexicon Only'}
              </span>
            </div>
            <div className="space-y-1 opacity-90">
              <div>Translation Model: <span className="font-bold text-zinc-200">{serverHealth?.models?.translate || 'gemini-3.8-flash'}</span></div>
              <div>Speech TTS Model: <span className="font-bold text-zinc-200">{serverHealth?.models?.tts || 'gemini-3.8-flash-lite-tts'}</span></div>
              <div>Transcription Model: <span className="font-bold text-zinc-200">{serverHealth?.models?.transcribe || 'gemini-3.5-transcribe'}</span></div>
              <div>Live Session Model: <span className="font-bold text-zinc-200">{serverHealth?.models?.live || 'gemini-3.8-live'}</span></div>
              <div>Active Rooms on Server: <span className="font-bold">{serverHealth?.rooms?.activeRooms ?? 0}</span></div>
            </div>
          </div>

          {/* 3. Audio & Speaker Status Section */}
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between font-bold mb-2">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Volume2 className="w-4 h-4" />
                <span>Audio Output &amp; Speaker</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                audioCtxState === 'running' ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' : 'bg-amber-950 text-amber-300 border border-amber-600'
              }`}>
                {audioCtxState}
              </span>
            </div>
            <div className="space-y-1.5 opacity-90">
              <div>AudioContext State: <strong>{audioCtxState}</strong></div>
              <div>Web Audio Unlock: {audioCtxState === 'running' ? '✅ Unlocked for immediate playback' : '⚠️ Suspended (Click Test Speaker to unlock)'}</div>
              <button
                onClick={async () => {
                  setTestChimePlaying(true);
                  await audioEngine.unlockAudio();
                  await audioEngine.playSpeakerTestChime();
                  setAudioCtxState(audioEngine.getAudioContext().state);
                  setTestChimePlaying(false);
                }}
                disabled={testChimePlaying}
                className="mt-1 px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500 font-bold flex items-center gap-1.5 transition-all text-xs"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{testChimePlaying ? 'Playing Chime...' : 'Test Speaker Audio'}</span>
              </button>
            </div>
          </div>

          {/* 4. Microphone & Speech Recognition Section */}
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between font-bold mb-2">
              <span className="flex items-center gap-1.5 text-pink-400">
                <Mic className="w-4 h-4" />
                <span>Microphone &amp; STT Engine</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-800 text-zinc-300">
                {audioEngine.isSpeechRecognitionSupported() ? 'Web Speech API + Server' : 'Server Transcribe Fallback'}
              </span>
            </div>
            <div className="space-y-1 opacity-90">
              <div>Supported Recording MIME: <strong>{micMime || 'audio/webm'}</strong></div>
              <div>Browser SpeechRecognition: {audioEngine.isSpeechRecognitionSupported() ? 'Supported natively' : 'Not supported in this browser (Server audio transcription active)'}</div>
            </div>
          </div>

          {/* 5. Two-Device Network Requirements Notice */}
          <div className="p-3 rounded-2xl bg-zinc-800/40 border border-zinc-700/60 text-[11px] text-zinc-400 space-y-1">
            <div className="font-bold text-zinc-200">ℹ️ Two-Device Connection Note:</div>
            <div>
              Both devices (Laptop and Phone) must access the same public server URL over the Internet. Opening <code>localhost</code> on a mobile phone will not connect.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

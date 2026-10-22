import React from 'react';
import { X, Smartphone, Laptop, Volume2, ArrowRight, CheckCircle2, ShieldCheck, Radio, Wifi } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { peerMesh } from '../services/peerMesh';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom?: (code: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onJoinRoom }) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const roomCode = peerMesh.getRoomCode() || '4829';
  const shareLink = peerMesh.getShareLink(roomCode);
  const isLocalhost = peerMesh.isLocalhost();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-white/80 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3 mb-4 border-zinc-700/50">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-purple-500" />
            <div>
              <h2 className="text-base font-mono font-bold tracking-wide">Two-Device Setup Guide</h2>
              <span className="text-[11px] font-mono text-zinc-400">लैपटॉप और फोन कनेक्शन गाइड (Hindi &amp; English)</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-mono">
          {/* Step 1: Open Room on Both Devices */}
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 font-bold text-sm mb-1 text-purple-400">
              <span className="w-5 h-5 rounded-full bg-purple-900 text-purple-200 flex items-center justify-center text-[10px]">1</span>
              <span>Open Same Room on Laptop &amp; Phone (एक ही रूम में जुड़ें)</span>
            </div>
            <p className="opacity-90 leading-relaxed">
              Enter the same 4-digit Room Code (e.g. <strong>{roomCode}</strong>) on both devices.
            </p>
            {isLocalhost && (
              <div className="mt-2 p-2 rounded-xl bg-amber-950/70 border border-amber-600/60 text-amber-300 text-[11px] leading-relaxed">
                ⚠️ <strong>Important Note:</strong> You are currently on <code>localhost</code>. To connect a physical phone over the Internet, you must open the public deployed Cloud Run / App URL on both devices, not <code>localhost</code>.
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  alert('Room link copied! Open this on your mobile phone: ' + shareLink);
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all text-xs flex items-center gap-1.5"
              >
                <span>Copy Mobile Room Link</span>
              </button>
              <span className="text-[11px] opacity-75">Room: {roomCode}</span>
            </div>
          </div>

          {/* Step 2: Confirm Presence */}
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 font-bold text-sm mb-1 text-emerald-400">
              <span className="w-5 h-5 rounded-full bg-emerald-900 text-emerald-200 flex items-center justify-center text-[10px]">2</span>
              <span>Confirm Real Peer Linked (कनेक्शन की पुष्टि)</span>
            </div>
            <p className="opacity-90 leading-relaxed">
              Both devices will show a green badge: <strong>🟢 Linked to 1 Peer [{roomCode}]</strong> once connected. If alone, it shows <strong>🟡 Waiting for Peer</strong>.
            </p>
          </div>

          {/* Step 3: Enable Speaker on Phone */}
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 font-bold text-sm mb-1 text-blue-400">
              <span className="w-5 h-5 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center text-[10px]">3</span>
              <span>Enable Speaker on Receiver Phone (स्पीकर चालू करें)</span>
            </div>
            <p className="opacity-90 leading-relaxed">
              Mobile browsers block audio playback until user interacts with the page. Tap <strong>'Test / Enable Speaker'</strong> on the phone to allow incoming translated speech to play aloud.
            </p>
          </div>

          {/* Step 4: Language Selection */}
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 font-bold text-sm mb-1 text-pink-400">
              <span className="w-5 h-5 rounded-full bg-pink-900 text-pink-200 flex items-center justify-center text-[10px]">4</span>
              <span>Select Languages &amp; Talk (भाषा चुनें और बात करें)</span>
            </div>
            <p className="opacity-90 leading-relaxed">
              On Laptop, select your language (e.g. Hindi). On Phone, select target language (e.g. English or Odia). Hold PTT or use Quick Test Calls to speak &rarr; Hear translated voice on phone immediately!
            </p>
          </div>

          {/* Step 5: Privacy */}
          <div className="p-3 rounded-2xl bg-zinc-800/40 border border-zinc-700/60 text-[11px] text-zinc-400 space-y-1">
            <div className="font-bold text-zinc-200">🔒 Privacy &amp; Security:</div>
            <div>
              Voice &amp; text packets are processed securely via Google Gemini API over encrypted WSS/HTTPS.
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all text-xs"
          >
            Got It! Start Communicating
          </button>
        </div>
      </div>
    </div>
  );
};

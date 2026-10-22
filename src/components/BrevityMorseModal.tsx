import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Radio,
  Send,
  Zap,
  Play,
  X,
  Shield,
  ShieldAlert,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Sliders,
  Layers,
  Sparkles,
  Activity,
  Maximize2,
} from 'lucide-react';
import { LanguageCode } from '../types';
import { audioEngine } from '../services/audioEngine';
import { meshNetwork } from '../services/meshNetwork';

export interface BrevityCodeItem {
  id: string;
  code: string;
  english: string;
  hindi: string;
  category: 'status' | 'contact' | 'extraction' | 'navigation';
  morse: string;
  priority: 'normal' | 'urgent' | 'sos';
  description: string;
}

export const BREVITY_CODES: BrevityCodeItem[] = [
  {
    id: 'sitrep',
    code: 'SITREP',
    english: 'Situation Report',
    hindi: 'स्थिति रिपोर्ट भेजें',
    category: 'status',
    morse: '... .. - .-. . .--.',
    priority: 'normal',
    description: 'Request or broadcast current squad situation and operational status.',
  },
  {
    id: 'wilco',
    code: 'WILCO',
    english: 'Will Comply',
    hindi: 'आदेश माना, पालन करेंगे',
    category: 'status',
    morse: '.-- .. .-.. -.-. ---',
    priority: 'normal',
    description: 'Acknowledge received order and confirm immediate execution.',
  },
  {
    id: 'roger',
    code: 'ROGER',
    english: 'Understood & Received',
    hindi: 'संदेश प्राप्त हुआ',
    category: 'status',
    morse: '.-. --- --. . .-.',
    priority: 'normal',
    description: 'Confirm clear reception of last radio transmission.',
  },
  {
    id: 'hold_pos',
    code: 'HOLD POS',
    english: 'Hold Current Position',
    hindi: 'वर्तमान स्थान पर रुकें',
    category: 'status',
    morse: '.... --- .-.. -.. / .--. --- ...',
    priority: 'urgent',
    description: 'Order squad members to cease movement and hold defensive ground.',
  },
  {
    id: 'all_clear',
    code: 'ALL CLEAR',
    english: 'Area Secure & Clear',
    hindi: 'क्षेत्र पूरी तरह सुरक्षित',
    category: 'status',
    morse: '.- .-.. .-.. / -.-. .-.. . .- .-.',
    priority: 'normal',
    description: 'Confirm hazards, obstacles, or hostile targets have been cleared.',
  },
  {
    id: 'contact_n',
    code: 'CONTACT NORTH',
    english: 'Obstacle/Contact North',
    hindi: 'उत्तर दिशा में संपर्क/रुकावट',
    category: 'contact',
    morse: '-.-. --- -. - .- -.-. - / -.----.',
    priority: 'urgent',
    description: 'Report visual or radar contact in the Northern sector.',
  },
  {
    id: 'visual_contact',
    code: 'VISUAL CONTACT',
    english: 'Target Spotted',
    hindi: 'लक्ष्य दिखाई दिया',
    category: 'contact',
    morse: '...- .. ... ..- .- .-.. / -.-. --- -. - .- -.-. -',
    priority: 'urgent',
    description: 'Confirm direct line-of-sight visual contact with primary target.',
  },
  {
    id: 'secure_zone',
    code: 'SECURE ZONE',
    english: 'Zone Perimeter Safe',
    hindi: 'सुरक्षित घेरा स्थापित',
    category: 'contact',
    morse: '... . -.-. ..- .-. . / --.. --- -. .',
    priority: 'normal',
    description: 'Establish secure perimeter checkpoint in current sector.',
  },
  {
    id: 'extract_req',
    code: 'EXTRACTION NEEDED',
    english: 'Immediate Extraction',
    hindi: 'तत्काल निकासी की आवश्यकता',
    category: 'extraction',
    morse: '. -..- - .-. .- -.-. - .. --- -.',
    priority: 'sos',
    description: 'Request immediate squad pick-up and vehicle extraction.',
  },
  {
    id: 'medevac',
    code: 'MEDEVAC REQUIRED',
    english: 'Medical Aid Required',
    hindi: 'चिकित्सा सहायता आवश्यक',
    category: 'extraction',
    morse: '-- . -.. . ...- .- -.-.',
    priority: 'sos',
    description: 'Request urgent medical evacuation for injured personnel.',
  },
  {
    id: 'supplies_low',
    code: 'SUPPLIES LOW',
    english: 'Replenishment Needed',
    hindi: 'रसद/सामग्री कम हो गई',
    category: 'extraction',
    morse: '... ..- .-- .--. .-.. .. . ... / .-.. --- .--',
    priority: 'urgent',
    description: 'Report depleted battery, food, or communication equipment.',
  },
  {
    id: 'eta_5m',
    code: 'ETA 5M',
    english: 'Arriving in 5 Minutes',
    hindi: '5 मिनट में आगमन',
    category: 'navigation',
    morse: '. - .- / ..... --',
    priority: 'normal',
    description: 'Update estimated arrival time at destination point.',
  },
  {
    id: 'waypoint',
    code: 'EN ROUTE WAYPOINT',
    english: 'Moving to Waypoint',
    hindi: 'वेपॉइंट की ओर अग्रसर',
    category: 'navigation',
    morse: '. -. / .-. --- ..- - .',
    priority: 'normal',
    description: 'Confirm current unit navigation toward assigned GPS coordinate.',
  },
  {
    id: 'fall_back',
    code: 'FALL BACK',
    english: 'Tactical Withdrawal',
    hindi: 'पीछे हटें / सुरक्षित स्थान पर जाएं',
    category: 'navigation',
    morse: '..-. .- .-.. .-.. / -... .- -.-. -.-',
    priority: 'urgent',
    description: 'Order squad to retreat to secondary rally point.',
  },
];

interface BrevityMorseModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  currentChannel: number;
  onTransmitted?: (code: string, isSilent: boolean) => void;
}

export const BrevityMorseModal: React.FC<BrevityMorseModalProps> = ({
  isOpen,
  onClose,
  sourceLang,
  targetLang,
  currentChannel,
  onTransmitted,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'status' | 'contact' | 'extraction' | 'navigation'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customText, setCustomText] = useState('');
  const [isMorsePlaying, setIsMorsePlaying] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState<{ symbol: string; active: boolean } | null>(null);
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [morseWpm, setMorseWpm] = useState(18);
  const [morsePitch, setMorsePitch] = useState(750);
  const [lastTransmittedCode, setLastTransmittedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredCodes = BREVITY_CODES.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesQuery =
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hindi.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const handlePlayMorse = async (text: string) => {
    if (isMorsePlaying) return;
    setIsMorsePlaying(true);
    try {
      await audioEngine.playMorseCode(text, morseWpm, morsePitch, (symbol, active) => {
        setActiveSymbol({ symbol, active });
      });
    } finally {
      setIsMorsePlaying(false);
      setActiveSymbol(null);
    }
  };

  const handleTransmitBrevity = (item: BrevityCodeItem, silent: boolean) => {
    audioEngine.triggerHaptic(60);

    // If not silent mode, play acoustic Morse tone locally
    if (!silent) {
      handlePlayMorse(item.code);
    } else {
      audioEngine.playRogerBeep();
    }

    // Transmit mesh packet
    meshNetwork.transmitPacket({
      channel: currentChannel as any,
      senderLang: sourceLang,
      targetLang: targetLang,
      originalText: `[BREVITY CODE ${item.code}] ${item.english}`,
      translatedText: item.hindi,
      phoneticText: item.morse,
      isEmergency: item.priority === 'sos',
    });

    setLastTransmittedCode(item.code);
    onTransmitted?.(item.code, silent);

    setTimeout(() => setLastTransmittedCode(null), 3000);
  };

  const handleTransmitCustomMorse = () => {
    if (!customText.trim()) return;
    const morsePattern = audioEngine.textToMorse(customText);

    audioEngine.triggerHaptic([40, 30, 40]);
    handlePlayMorse(customText);

    meshNetwork.transmitPacket({
      channel: currentChannel as any,
      senderLang: sourceLang,
      targetLang: targetLang,
      originalText: `[MORSE BROADCAST] ${customText.toUpperCase()}`,
      translatedText: customText.toUpperCase(),
      phoneticText: morsePattern,
      isEmergency: false,
    });

    setLastTransmittedCode(`CUSTOM: ${customText.toUpperCase()}`);
    setCustomText('');
    setTimeout(() => setLastTransmittedCode(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header HUD */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
              {activeSymbol?.active && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-wide text-white uppercase">
                  Tactical Brevity & Morse Mode
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                  CH {currentChannel} SILENT DISPATCH
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Silent single-tap tactical phrases & acoustic Morse code mesh transmission
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Visual Flashing Signal Beacon */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-[10px] uppercase font-mono text-slate-400">Signal LED</span>
              <div
                className={`w-4 h-4 rounded-full transition-all duration-75 shadow-lg ${
                  activeSymbol?.active
                    ? 'bg-amber-400 shadow-amber-400/80 scale-125 ring-2 ring-amber-300'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Transmission Notification HUD */}
        {lastTransmittedCode && (
          <div className="flex items-center justify-between px-5 py-2.5 bg-emerald-950/80 border-b border-emerald-500/30 text-emerald-300 text-xs font-mono animate-in slide-in-from-top-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>BROADCAST SENT TO MESH CH {currentChannel}: <strong className="text-white">{lastTransmittedCode}</strong></span>
            </div>
            <span className="text-[10px] text-emerald-400/80 uppercase">DISPATCHED</span>
          </div>
        )}

        {/* Operational Toolbar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Codes' },
              { id: 'status', label: 'Status & Orders' },
              { id: 'contact', label: 'Contact' },
              { id: 'extraction', label: 'Extraction & Aid' },
              { id: 'navigation', label: 'Navigation' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wide transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Silent Mode Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code or meaning..."
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-48"
            />

            <button
              onClick={() => setIsSilentMode(!isSilentMode)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
                isSilentMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Silent mode prevents audio TTS output on receiver units"
            >
              {isSilentMode ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isSilentMode ? 'Silent Ops: ON' : 'Audio Tone: ON'}</span>
            </button>
          </div>
        </div>

        {/* Brevity Code Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[50vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCodes.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between p-3.5 bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-950/40"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-black text-emerald-400 tracking-wider">
                        {item.code}
                      </span>
                      {item.priority === 'sos' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/40 rounded">
                          SOS EMERGENCY
                        </span>
                      )}
                      {item.priority === 'urgent' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                          URGENT
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handlePlayMorse(item.code)}
                      disabled={isMorsePlaying}
                      className="p-1 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                      title="Preview acoustic Morse code tone"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="mt-1 text-xs font-bold text-white">{item.english}</h4>
                  <p className="text-[11px] text-slate-400 font-medium">{item.hindi}</p>

                  <div className="mt-2 py-1 px-2 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] text-amber-300/90 tracking-widest overflow-x-auto whitespace-nowrap">
                    {item.morse}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleTransmitBrevity(item, true)}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center space-x-1"
                  >
                    <VolumeX className="w-3 h-3 text-slate-400" />
                    <span>Silent Dispatch</span>
                  </button>

                  <button
                    onClick={() => handleTransmitBrevity(item, false)}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-1 shadow-md shadow-emerald-900/30"
                  >
                    <Send className="w-3 h-3" />
                    <span>Transmit Tone</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredCodes.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              No brevity codes found matching "{searchQuery}". Try a different category or search term.
            </div>
          )}
        </div>

        {/* Custom Morse Transmitter Studio */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                Custom Morse Studio & Speed Config
              </h3>
            </div>

            <div className="flex items-center space-x-4 text-[10px] font-mono text-slate-400">
              <label className="flex items-center space-x-1.5">
                <span>Speed:</span>
                <input
                  type="range"
                  min="12"
                  max="30"
                  value={morseWpm}
                  onChange={(e) => setMorseWpm(Number(e.target.value))}
                  className="w-16 accent-emerald-500"
                />
                <span className="text-emerald-400">{morseWpm} WPM</span>
              </label>

              <label className="flex items-center space-x-1.5">
                <span>Pitch:</span>
                <input
                  type="range"
                  min="550"
                  max="950"
                  step="25"
                  value={morsePitch}
                  onChange={(e) => setMorsePitch(Number(e.target.value))}
                  className="w-16 accent-emerald-500"
                />
                <span className="text-amber-400">{morsePitch} Hz</span>
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTransmitCustomMorse()}
              placeholder="Type custom text (e.g. RECON ALPHA READY)..."
              className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono uppercase"
            />

            <button
              onClick={() => handlePlayMorse(customText || 'SOS')}
              disabled={isMorsePlaying}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1"
              title="Test play custom Morse tone locally"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>Preview</span>
            </button>

            <button
              onClick={handleTransmitCustomMorse}
              disabled={!customText.trim() || isMorsePlaying}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Morse</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

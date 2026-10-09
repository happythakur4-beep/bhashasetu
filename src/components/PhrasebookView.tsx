import React, { useState } from 'react';
import {
  Volume2,
  Shield,
  Send,
  Search,
  HardDrive,
} from 'lucide-react';
import { ChannelNumber, ConversationMessage, LanguageCode, PhraseItem } from '../types';
import { OFFLINE_PHRASEBOOK, SUPPORTED_LANGUAGES } from '../services/languageRegistry';
import { audioEngine } from '../services/audioEngine';
import { meshNetwork } from '../services/meshNetwork';
import { useTheme } from '../context/ThemeContext';

interface PhrasebookViewProps {
  currentChannel: ChannelNumber;
  activeLanguage: LanguageCode;
  onNewMessage: (msg: ConversationMessage) => void;
  isMuted: boolean;
  onOpenPackManager?: () => void;
}

export const PhrasebookView: React.FC<PhrasebookViewProps> = ({
  currentChannel,
  activeLanguage,
  onNewMessage,
  isMuted,
  onOpenPackManager,
}) => {
  const { isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLanguage, setDisplayLanguage] = useState<LanguageCode>(activeLanguage);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Phrases' },
    { id: 'emergency', label: '🚨 Emergency SOS' },
    { id: 'directions', label: '🧭 Highway & Routes' },
    { id: 'medical', label: '🏥 Medical' },
    { id: 'food', label: '🍲 Food & Water' },
    { id: 'general', label: '🤝 Greetings' },
  ];

  const filteredPhrases = OFFLINE_PHRASEBOOK.filter((item: PhraseItem) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCat;

    const matchesSearch =
      item.english.toLowerCase().includes(query) ||
      item.hindi.text.includes(query) ||
      item.hindi.phonetic.toLowerCase().includes(query) ||
      item.odia.text.includes(query) ||
      item.odia.phonetic.toLowerCase().includes(query) ||
      item.mandali.text.includes(query) ||
      item.mandali.phonetic.toLowerCase().includes(query);

    return matchesCat && matchesSearch;
  });

  const handlePlaySpeech = (text: string, lang: LanguageCode) => {
    audioEngine.triggerHaptic(40);
    audioEngine.speak(text, lang);
  };

  const handleBroadcastPhrase = (phrase: PhraseItem) => {
    audioEngine.playRogerBeep();

    const targetLangData =
      displayLanguage === 'mjl'
        ? phrase.mandali
        : displayLanguage === 'or'
        ? phrase.odia
        : displayLanguage === 'hi'
        ? phrase.hindi
        : { text: phrase.english, phonetic: phrase.english };

    meshNetwork.transmitPacket({
      channel: currentChannel,
      senderLang: displayLanguage,
      targetLang: 'en',
      originalText: targetLangData.text,
      translatedText: phrase.english,
      phoneticText: targetLangData.phonetic,
      isEmergency: phrase.category === 'emergency',
    });

    const msg: ConversationMessage = {
      id: `pb_${Date.now()}`,
      sender: 'self',
      senderName: 'You (Broadcasted Phrase)',
      sourceLang: displayLanguage,
      targetLang: 'en',
      originalText: targetLangData.text,
      translatedText: phrase.english,
      phoneticText: targetLangData.phonetic,
      timestamp: Date.now(),
      isOffline: true,
      engine: 'offline-lexicon',
      channel: currentChannel,
    };
    onNewMessage(msg);

    if (!isMuted) {
      audioEngine.speak(targetLangData.text, displayLanguage);
    }

    setBroadcastFeedback(`Broadcasted: "${targetLangData.text}" on CH-${currentChannel}`);
    setTimeout(() => setBroadcastFeedback(null), 3500);
  };

  return (
    <div className="flex-1 max-w-xl mx-auto w-full px-3 py-2 space-y-3 overflow-y-auto z-10 relative">
      {/* Search & Language Bar */}
      <div
        className={
          isDark
            ? 'bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 shadow-lg space-y-2.5'
            : 'neo-glass-panel rounded-3xl p-3.5 space-y-2.5 border border-white/95 text-slate-800'
        }
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className={`text-sm font-bold font-mono flex items-center gap-1.5 ${
                isDark ? 'text-zinc-100' : 'text-slate-900'
              }`}
            >
              <Shield className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-purple-600'}`} />
              <span>OFFLINE INTERSTATE PHRASEBOOK</span>
            </h3>
            <p
              className={`text-[11px] font-mono ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}
            >
              100% offline speech &amp; mesh broadcast in zero-network areas
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenPackManager && (
              <button
                onClick={onOpenPackManager}
                className={
                  isDark
                    ? 'p-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-emerald-400 border border-zinc-750 text-xs font-mono flex items-center gap-1 transition-colors'
                    : 'p-1.5 px-2.5 rounded-2xl neo-gel-button text-purple-700 hover:text-purple-900 text-xs font-mono font-bold flex items-center gap-1 shadow-xs transition-all'
                }
                title="Manage Offline Speech Packs"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Packs</span>
              </button>
            )}

            {/* Quick Target Language Picker */}
            <div
              className={`flex items-center gap-1 p-1 rounded-2xl font-mono text-xs ${
                isDark ? 'bg-zinc-800' : 'bg-white/70 border border-white/90 shadow-inner'
              }`}
            >
            {(['hi', 'mjl', 'or', 'en'] as LanguageCode[]).map((code) => {
              const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
              return (
                <button
                  key={code}
                  onClick={() => setDisplayLanguage(code)}
                  className={`px-2 py-1 rounded-xl text-xs font-bold transition-all ${
                    displayLanguage === code
                      ? isDark
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xs'
                      : isDark
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {code === 'mjl' ? 'Mandali' : lang?.name}
                </button>
              );
            })}
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-3 top-2.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emergency, route, food phrases in Hindi, Mandali, Odia..."
            className={
              isDark
                ? 'w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono'
                : 'w-full neo-glass-card rounded-2xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono border border-white/90 shadow-sm'
            }
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={
                isDark
                  ? `px-2.5 py-1 rounded-xl text-[11px] whitespace-nowrap transition-colors border ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 font-bold'
                        : 'bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`
                  : `px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-all border ${
                      selectedCategory === cat.id
                        ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold border-white/80 shadow-xs'
                        : 'neo-gel-button text-slate-600 hover:text-slate-900 border-white/90 shadow-2xs'
                    }`
              }
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {broadcastFeedback && (
        <div
          className={`p-2.5 rounded-2xl text-xs font-mono animate-in fade-in flex items-center justify-between ${
            isDark
              ? 'bg-emerald-950/80 border border-emerald-600/70 text-emerald-200'
              : 'bg-purple-100/90 border border-purple-300 text-purple-900 shadow-sm'
          }`}
        >
          <span>📻 {broadcastFeedback}</span>
        </div>
      )}

      {/* Phrases Cards List */}
      <div className="space-y-2.5">
        {filteredPhrases.length === 0 ? (
          <div
            className={`text-center p-8 font-mono text-xs ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}
          >
            No phrases matching &quot;{searchQuery}&quot; found in offline lexicon.
          </div>
        ) : (
          filteredPhrases.map((phrase) => {
            const isEmergency = phrase.category === 'emergency';
            const currentLangData =
              displayLanguage === 'mjl'
                ? phrase.mandali
                : displayLanguage === 'or'
                ? phrase.odia
                : displayLanguage === 'hi'
                ? phrase.hindi
                : { text: phrase.english, phonetic: phrase.english };

            return (
              <div
                key={phrase.id}
                className={
                  isDark
                    ? `p-3.5 rounded-2xl border transition-all ${
                        isEmergency
                          ? 'bg-red-950/30 border-red-800/40 hover:border-red-700/60'
                          : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                      }`
                    : `p-3.5 rounded-3xl border transition-all ${
                        isEmergency
                          ? 'bg-gradient-to-r from-rose-50 to-pink-50/90 border-rose-300/80 shadow-xs text-rose-950'
                          : 'neo-glass-panel border-white/95 text-slate-800 hover:shadow-md'
                      }`
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div
                      className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider ${
                        isDark ? 'text-zinc-400' : 'text-slate-500 font-semibold'
                      }`}
                    >
                      <span className={isDark ? 'font-bold text-zinc-300' : 'font-bold text-slate-700'}>
                        {phrase.english}
                      </span>
                    </div>

                    {/* Regional Native Text */}
                    <div
                      className={`text-base sm:text-lg font-bold mt-1 ${
                        isDark ? 'text-zinc-100' : 'text-slate-900'
                      }`}
                    >
                      {currentLangData.text}
                    </div>

                    {/* Phonetic Pronunciation Guide */}
                    <div
                      className={`text-xs font-mono mt-0.5 italic ${
                        isDark ? 'text-amber-300/90' : 'text-purple-600 font-medium'
                      }`}
                    >
                      Pronounce: &quot;{currentLangData.phonetic}&quot;
                    </div>

                    {/* Secondary Languages quick view */}
                    <div
                      className={`mt-2 pt-2 border-t grid grid-cols-2 gap-1.5 text-[11px] font-mono ${
                        isDark ? 'border-zinc-800/70 text-zinc-400' : 'border-slate-200/70 text-slate-500'
                      }`}
                    >
                      {displayLanguage !== 'mjl' && (
                        <div>
                          <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>Mandali (HP): </span>
                          <span className={isDark ? 'text-zinc-300' : 'text-slate-700 font-medium'}>
                            {phrase.mandali.text}
                          </span>
                        </div>
                      )}
                      {displayLanguage !== 'or' && (
                        <div>
                          <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>Odia: </span>
                          <span className={isDark ? 'text-zinc-300' : 'text-slate-700 font-medium'}>
                            {phrase.odia.text}
                          </span>
                        </div>
                      )}
                      {displayLanguage !== 'hi' && (
                        <div>
                          <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>Hindi: </span>
                          <span className={isDark ? 'text-zinc-300' : 'text-slate-700 font-medium'}>
                            {phrase.hindi.text}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => handlePlaySpeech(currentLangData.text, displayLanguage)}
                      className={
                        isDark
                          ? 'p-2 rounded-xl bg-zinc-850 hover:bg-zinc-750 text-zinc-200 border border-zinc-750 transition-colors'
                          : 'p-2 rounded-2xl neo-gel-button text-purple-600 hover:text-purple-800 hover:scale-105 transition-all shadow-xs'
                      }
                      title="Speak phrase out loud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleBroadcastPhrase(phrase)}
                      className={
                        isDark
                          ? 'p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 transition-colors'
                          : 'p-2 rounded-2xl neo-gel-button text-pink-600 hover:text-pink-800 hover:scale-105 transition-all shadow-xs'
                      }
                      title="Transmit phrase across mesh radio channel"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

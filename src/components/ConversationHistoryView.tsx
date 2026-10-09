import React, { useState } from 'react';
import {
  Volume2,
  Trash2,
  Download,
  Star,
  Copy,
  Check,
  Clock,
  Search,
} from 'lucide-react';
import { ConversationMessage } from '../types';
import { audioEngine } from '../services/audioEngine';
import { SUPPORTED_LANGUAGES } from '../services/languageRegistry';
import { useTheme } from '../context/ThemeContext';

interface ConversationHistoryViewProps {
  messages: ConversationMessage[];
  onClearHistory: () => void;
  onToggleStar: (id: string) => void;
}

export const ConversationHistoryView: React.FC<ConversationHistoryViewProps> = ({
  messages,
  onClearHistory,
  onToggleStar,
}) => {
  const { isDark } = useTheme();
  const [filterStarred, setFilterStarred] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredMessages = messages.filter((msg) => {
    if (filterStarred && !msg.isStarred) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      msg.originalText.toLowerCase().includes(q) ||
      msg.translatedText.toLowerCase().includes(q) ||
      msg.phoneticText.toLowerCase().includes(q) ||
      msg.senderName.toLowerCase().includes(q)
    );
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportHistory = () => {
    const lines = messages.map((m) => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      return `[${time}] ${m.senderName} (${m.sourceLang} -> ${m.targetLang}):\nOriginal: ${m.originalText}\nTranslated: ${m.translatedText}\nPhonetic: ${m.phoneticText}\n`;
    });
    const blob = new Blob([lines.join('\n---\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BhashaSetu_Transcript_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 max-w-xl mx-auto w-full px-3 py-2 space-y-3 overflow-y-auto z-10 relative">
      {/* Top Controls */}
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
              <Clock className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-purple-600'}`} />
              <span>VOICE LOG &amp; CONVERSATION HISTORY</span>
            </h3>
            <p
              className={`text-[11px] font-mono ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}
            >
              {messages.length} audio transmissions recorded
            </p>
          </div>

          <div className="flex items-center space-x-1.5">
            {messages.length > 0 && (
              <>
                <button
                  onClick={handleExportHistory}
                  className={
                    isDark
                      ? 'p-2 rounded-xl bg-zinc-850 hover:bg-zinc-750 text-zinc-300 border border-zinc-750 transition-colors'
                      : 'p-2 rounded-2xl neo-gel-button text-purple-700 hover:text-purple-900 transition-all shadow-xs'
                  }
                  title="Export text transcript"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClearHistory}
                  className={
                    isDark
                      ? 'p-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/40 transition-colors'
                      : 'p-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all shadow-xs'
                  }
                  title="Clear all history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter and Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversation history..."
              className={
                isDark
                  ? 'w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono'
                  : 'w-full neo-glass-card rounded-2xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono border border-white/90 shadow-sm'
              }
            />
          </div>

          <button
            onClick={() => setFilterStarred(!filterStarred)}
            className={
              isDark
                ? `flex items-center space-x-1 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
                    filterStarred
                      ? 'bg-amber-950/80 border-amber-600/70 text-amber-300 font-bold'
                      : 'bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`
                : `flex items-center space-x-1 px-3 py-2 rounded-2xl border text-xs font-mono transition-all ${
                    filterStarred
                      ? 'bg-amber-100/90 border-amber-300 text-amber-800 font-bold shadow-xs'
                      : 'neo-gel-button text-slate-600 hover:text-slate-800 border-white/90'
                  }`
            }
          >
            <Star
              className={`w-3.5 h-3.5 ${
                filterStarred
                  ? 'fill-amber-400 text-amber-400'
                  : isDark
                  ? 'text-zinc-600'
                  : 'text-slate-400'
              }`}
            />
            <span>Starred</span>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="space-y-2.5">
        {filteredMessages.length === 0 ? (
          <div
            className={`text-center p-8 rounded-3xl font-mono text-xs ${
              isDark
                ? 'bg-zinc-900/40 border border-zinc-800/60 text-zinc-500'
                : 'neo-glass-panel border-white/90 text-slate-400 shadow-sm'
            }`}
          >
            No conversation transmissions found. Transmit voice on Walkie-Talkie or Dual Mode to see records.
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const sourceLang = SUPPORTED_LANGUAGES.find((l) => l.code === msg.sourceLang);
            const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === msg.targetLang);

            return (
              <div
                key={msg.id}
                className={
                  isDark
                    ? `p-3.5 rounded-2xl border transition-all ${
                        msg.sender === 'self'
                          ? 'bg-zinc-900/90 border-zinc-800'
                          : 'bg-zinc-850/90 border-emerald-900/40'
                      }`
                    : `p-3.5 rounded-3xl border transition-all shadow-xs ${
                        msg.sender === 'self'
                          ? 'neo-glass-panel border-white/95 text-slate-800'
                          : 'bg-gradient-to-r from-blue-50/90 to-purple-50/70 border-purple-200/90 text-slate-800'
                      }`
                }
              >
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-bold ${
                        msg.sender === 'self'
                          ? isDark ? 'text-zinc-300' : 'text-slate-800'
                          : isDark ? 'text-emerald-400' : 'text-purple-700'
                      }`}
                    >
                      {msg.senderName}
                    </span>
                    {msg.channel && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          isDark
                            ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            : 'bg-white/80 text-slate-600 border-slate-200/70 font-semibold'
                        }`}
                      >
                        CH-{msg.channel}
                      </span>
                    )}
                  </div>

                  <div className={`flex items-center space-x-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    <span className="text-[11px]">{timeStr}</span>
                    <button
                      onClick={() => onToggleStar(msg.id)}
                      className={`p-1 ${isDark ? 'hover:text-amber-400' : 'hover:text-amber-500'}`}
                      title="Star this message"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          msg.isStarred
                            ? 'fill-amber-400 text-amber-400'
                            : isDark
                            ? 'text-zinc-600'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Spoken original */}
                <div className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  <span
                    className={`text-[10px] font-mono uppercase mr-1 ${
                      isDark ? 'text-zinc-500' : 'text-slate-400'
                    }`}
                  >
                    {sourceLang?.name}:
                  </span>
                  &quot;{msg.originalText}&quot;
                </div>

                {/* Translated output */}
                <div
                  className={`mt-2 p-2.5 rounded-2xl border flex items-start justify-between ${
                    isDark
                      ? 'bg-zinc-950/70 border-zinc-800/80'
                      : 'bg-white/85 border-white/90 shadow-2xs'
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <div
                      className={`text-[10px] font-mono uppercase font-bold ${
                        isDark ? 'text-emerald-400' : 'text-purple-600'
                      }`}
                    >
                      {targetLang?.name} ({targetLang?.nativeName}):
                    </div>
                    <div className={`text-sm font-bold mt-0.5 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                      {msg.translatedText}
                    </div>
                    <div
                      className={`text-xs font-mono mt-0.5 italic animate-phonetic-appear ${
                        isDark ? 'text-amber-300/80' : 'text-pink-600 font-medium'
                      }`}
                      style={{ animationDelay: '80ms' }}
                    >
                      Phonetic: &quot;{msg.phoneticText}&quot;
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleCopy(msg.translatedText, msg.id)}
                      className={
                        isDark
                          ? 'p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-750 text-zinc-300 transition-colors'
                          : 'p-2 rounded-2xl neo-gel-button text-slate-600 hover:text-purple-700 transition-all'
                      }
                      title="Copy translated text"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (msg.audioBase64) {
                          audioEngine.playAudioBase64(msg.audioBase64);
                        } else {
                          audioEngine.speak(msg.translatedText, msg.targetLang);
                        }
                      }}
                      className={
                        isDark
                          ? 'p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 transition-colors'
                          : 'p-2 rounded-2xl neo-gel-button text-purple-600 hover:text-purple-800 transition-all shadow-xs'
                      }
                      title="Play speech audio"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
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

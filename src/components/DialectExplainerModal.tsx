import React from 'react';
import { Volume2, BookOpen } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { useTheme } from '../context/ThemeContext';

interface DialectExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DialectExplainerModal: React.FC<DialectExplainerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const mandaliExamples = [
    { native: 'तुसां जो नमस्कार', phonetic: 'Tusan jo namaskar', english: 'Greetings to you (Polite)', notes: 'Mandali honorific form using "तुसां" instead of "आप"' },
    { native: 'कुथु जांदे?', phonetic: 'Kuthu jaande?', english: 'Where are you going?', notes: '"कुथु" replaces Hindi "कहाँ", and "-दे" suffix denotes continuous action' },
    { native: 'तुहाड़ा नां के है?', phonetic: 'Tuhada naah ke hai?', english: 'What is your name?', notes: '"के" replaces Hindi "क्या", "नां" means name' },
    { native: 'केड़ा हाल चाल है?', phonetic: 'Keda haal chaal hai?', english: 'How are you / How is everything?', notes: '"केड़ा" is the Mandali interrogative for "कैसा"' },
    { native: 'मां जो पाणी चहिदा', phonetic: 'Maan jo paani chahida', english: 'I need drinking water', notes: '"मां जो" means "to me", "चहिदा" means needed' },
    { native: 'इथी सड़का परा इक दुर्घटना होयी', phonetic: 'Ithi sadka para ik durghatna hoyi', english: 'An accident occurred here on the road', notes: '"इथी" means "here", "तिथी" means "there"' },
  ];

  const odiaExamples = [
    { native: 'ନମସ୍କାର, ଆପଣ କେମିତି ଅଛନ୍ତି?', phonetic: 'Namaskara, aapana kemiti achhanti?', english: 'Greetings, how are you?', notes: 'Formal and respectful across Odisha' },
    { native: 'ଏହି ରାସ୍ତାଟି କୁଆଡ଼େ ଯାଉଛି?', phonetic: 'Ehi rastati kuade jauchhi?', english: 'Where does this road lead?', notes: '"କୁଆଡ଼େ" means "where / which direction"' },
    { native: 'ମୋତେ ସାହାଯ୍ୟ କରନ୍ତୁ', phonetic: 'Mote sahayya karantu', english: 'Please help me', notes: 'Emergency assistance phrase' },
    { native: 'ଧନ୍ୟବାଦ, ଭଲ ଲାଗିଲା', phonetic: 'Dhanyabada, bhala lagila', english: 'Thank you, nice meeting you', notes: 'Expressions of gratitude' },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150 ${
        isDark ? 'bg-black/75' : 'bg-slate-900/30'
      }`}
    >
      <div
        className={
          isDark
            ? 'w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200'
            : 'w-full max-w-lg neo-glass-panel border border-white/95 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200 text-slate-800'
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200/80 bg-white/70'
          }`}
        >
          <div className="flex items-center space-x-2">
            <BookOpen className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-purple-600'}`} />
            <div>
              <h3 className={`text-base font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                Interstate Dialect &amp; Script Guide
              </h3>
              <p className={`text-xs font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Mandali (Himachal) &amp; Odia (Odisha) Linguistic Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              isDark
                ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                : 'bg-white/80 text-slate-500 hover:text-slate-800 border border-slate-200'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Section 1: Mandali */}
          <div
            className={`border rounded-2xl p-3.5 space-y-3 ${
              isDark
                ? 'bg-zinc-950/70 border-zinc-800'
                : 'bg-gradient-to-br from-amber-50/70 via-purple-50/50 to-pink-50/50 border-amber-200/60 shadow-xs'
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-2 ${
                isDark ? 'border-zinc-800/80' : 'border-amber-200/60'
              }`}
            >
              <div>
                <span
                  className={`text-sm font-bold font-mono ${
                    isDark ? 'text-amber-400' : 'text-amber-800'
                  }`}
                >
                  🏔️ Mandali / Mandyali (माण्डली / मण्डयाली)
                </span>
                <span className={`text-xs block font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Himachal Pradesh · Mandi Valley · Western Pahadi
                </span>
              </div>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase border ${
                  isDark
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-amber-100 text-amber-800 border-amber-300 shadow-2xs'
                }`}
              >
                Pahadi Branch
              </span>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
              Mandali is a Western Pahadi language spoken in the central Mandi district of Himachal Pradesh. Historically written in the indigenous <strong>Takri</strong> script, it is now primarily rendered in Devanagari. It features distinct pronominal forms (<em>हौं/मां, तुसां</em>), unique adverbs of place (<em>इथी, तिथी, कुथु</em>), and verbal suffixes (-दे).
            </p>

            <div className="space-y-2 pt-1">
              <span
                className={`text-[11px] font-mono uppercase font-bold block ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}
              >
                Key Spoken Phrases &amp; Pronunciation:
              </span>
              {mandaliExamples.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex items-start justify-between ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800/80'
                      : 'bg-white/85 border-white/95 shadow-2xs'
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <div className={`text-xs font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                      {item.native}
                    </div>
                    <div
                      className={`text-[11px] font-mono italic ${
                        isDark ? 'text-amber-300' : 'text-amber-700 font-medium'
                      }`}
                    >
                      Phonetic: &quot;{item.phonetic}&quot;
                    </div>
                    <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                      {item.english}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 font-mono ${
                        isDark ? 'text-zinc-500' : 'text-slate-400'
                      }`}
                    >
                      ℹ️ {item.notes}
                    </div>
                  </div>
                  <button
                    onClick={() => audioEngine.speak(item.native, 'mjl')}
                    className={
                      isDark
                        ? 'p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors'
                        : 'p-2 rounded-2xl neo-gel-button text-amber-700 hover:scale-105 transition-all shadow-xs'
                    }
                    title="Listen to pronunciation"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Odia */}
          <div
            className={`border rounded-2xl p-3.5 space-y-3 ${
              isDark
                ? 'bg-zinc-950/70 border-zinc-800'
                : 'bg-gradient-to-br from-blue-50/70 via-purple-50/50 to-pink-50/50 border-blue-200/60 shadow-xs'
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-2 ${
                isDark ? 'border-zinc-800/80' : 'border-blue-200/60'
              }`}
            >
              <div>
                <span
                  className={`text-sm font-bold font-mono ${
                    isDark ? 'text-sky-400' : 'text-blue-800'
                  }`}
                >
                  🌊 Odia (ଓଡ଼ିଆ)
                </span>
                <span className={`text-xs block font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Odisha · Eastern India · Classical Language
                </span>
              </div>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase border ${
                  isDark
                    ? 'bg-sky-950 text-sky-300 border-sky-800'
                    : 'bg-blue-100 text-blue-800 border-blue-300 shadow-2xs'
                }`}
              >
                Classical
              </span>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
              Odia is an Indo-Aryan language designated as a Classical Language of India. It uses its own distinctive rounded script developed historically to prevent palm-leaf manuscripts from tearing. The language features rich honorific distinction (<em>ଆପଣ, ତୁମେ, ତୁ</em>) and precise locatives.
            </p>

            <div className="space-y-2 pt-1">
              <span
                className={`text-[11px] font-mono uppercase font-bold block ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}
              >
                Key Spoken Phrases:
              </span>
              {odiaExamples.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex items-start justify-between ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800/80'
                      : 'bg-white/85 border-white/95 shadow-2xs'
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <div className={`text-xs font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                      {item.native}
                    </div>
                    <div
                      className={`text-[11px] font-mono italic ${
                        isDark ? 'text-sky-300' : 'text-blue-700 font-medium'
                      }`}
                    >
                      Phonetic: &quot;{item.phonetic}&quot;
                    </div>
                    <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                      {item.english}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 font-mono ${
                        isDark ? 'text-zinc-500' : 'text-slate-400'
                      }`}
                    >
                      ℹ️ {item.notes}
                    </div>
                  </div>
                  <button
                    onClick={() => audioEngine.speak(item.native, 'or')}
                    className={
                      isDark
                        ? 'p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors'
                        : 'p-2 rounded-2xl neo-gel-button text-blue-700 hover:scale-105 transition-all shadow-xs'
                    }
                    title="Listen to pronunciation"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-3 border-t flex justify-end ${
            isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200/80 bg-white/70'
          }`}
        >
          <button
            onClick={onClose}
            className={
              isDark
                ? 'px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-mono text-xs font-bold transition-colors'
                : 'px-4 py-2 neo-gel-button text-slate-800 hover:text-purple-700 rounded-2xl font-mono text-xs font-bold transition-all shadow-xs'
            }
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

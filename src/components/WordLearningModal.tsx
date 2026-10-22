import React, { useState, useEffect } from 'react';
import { Sparkles, Check, X, Brain, BookOpen, Volume2, Plus } from 'lucide-react';
import { customVocabularyService, LearnedWord } from '../services/customVocabularyService';
import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../services/languageRegistry';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface WordLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSourceWord?: string;
  initialTranslation?: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  onWordConfirmed?: (word: LearnedWord) => void;
}

export const WordLearningModal: React.FC<WordLearningModalProps> = ({
  isOpen,
  onClose,
  initialSourceWord = '',
  initialTranslation = '',
  sourceLang,
  targetLang,
  onWordConfirmed,
}) => {
  const { isDark } = useTheme();

  const [sourceWord, setSourceWord] = useState(initialSourceWord);
  const [targetTranslation, setTargetTranslation] = useState(initialTranslation);
  const [phonetic, setPhonetic] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('Dialect Vocabulary');
  const [learnedList, setLearnedList] = useState<LearnedWord[]>([]);
  const [activeTab, setActiveTab] = useState<'learn' | 'dictionary'>('learn');

  useEffect(() => {
    setSourceWord(initialSourceWord);
    setTargetTranslation(initialTranslation);
    if (initialSourceWord) {
      setPhonetic(initialSourceWord);
    }
  }, [initialSourceWord, initialTranslation]);

  useEffect(() => {
    const unsub = customVocabularyService.subscribe((list) => setLearnedList(list));
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const sourceLangName = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang)?.name || sourceLang;
  const targetLangName = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang;

  const handleConfirmAndTeach = () => {
    if (!sourceWord.trim() || !targetTranslation.trim()) return;

    audioEngine.triggerHaptic([40, 60]);
    audioEngine.playRogerBeep();

    const newWord = customVocabularyService.addLearnedWord({
      sourceWord: sourceWord.trim(),
      targetTranslation: targetTranslation.trim(),
      phonetic: phonetic.trim() || sourceWord.trim(),
      sourceLang,
      targetLang,
      category,
      notes: notes.trim() || `User confirmed ${sourceLangName} -> ${targetLangName} voice learning`,
    });

    if (onWordConfirmed) {
      onWordConfirmed(newWord);
    }

    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-150 ${
        isDark ? 'bg-black/80' : 'bg-slate-900/40'
      }`}
      onClick={onClose}
    >
      <div
        className={
          isDark
            ? 'w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200'
            : 'w-full max-w-lg bg-white border border-slate-300 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-slate-900'
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          className={`px-4 py-3.5 border-b flex items-center justify-between ${
            isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-2 rounded-2xl ${
                isDark
                  ? 'bg-purple-950/80 text-purple-400 border border-purple-800/60'
                  : 'bg-purple-100 text-purple-800 border border-purple-200'
              }`}
            >
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={`text-sm font-bold font-mono tracking-tight ${
                    isDark ? 'text-zinc-100' : 'text-slate-900'
                  }`}
                >
                  INTERACTIVE VOICE LEARNING
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    isDark
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : 'bg-purple-100 text-purple-900 border border-purple-300'
                  }`}
                >
                  AI Model Update
                </span>
              </div>
              <p
                className={`text-[11px] font-mono ${
                  isDark ? 'text-zinc-400' : 'text-slate-700'
                }`}
              >
                Confirm new regional dialect word to teach the active BhashaSetu model
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              isDark
                ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                : 'bg-slate-200 text-slate-700 hover:text-slate-900'
            }`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`flex border-b px-4 ${
            isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-slate-200 bg-slate-100/60'
          }`}
        >
          <button
            onClick={() => setActiveTab('learn')}
            className={`py-2.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'learn'
                ? isDark
                  ? 'border-purple-400 text-purple-400'
                  : 'border-purple-700 text-purple-900 font-extrabold'
                : isDark
                ? 'border-transparent text-zinc-400 hover:text-zinc-200'
                : 'border-transparent text-slate-700 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Teach Word</span>
          </button>

          <button
            onClick={() => setActiveTab('dictionary')}
            className={`py-2.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'dictionary'
                ? isDark
                  ? 'border-purple-400 text-purple-400'
                  : 'border-purple-700 text-purple-900 font-extrabold'
                : isDark
                ? 'border-transparent text-zinc-400 hover:text-zinc-200'
                : 'border-transparent text-slate-700 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Learned Model Lexicon ({learnedList.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'learn' ? (
            <div className="space-y-3.5">
              <div
                className={`p-3 rounded-2xl border text-xs font-mono flex items-center gap-2 ${
                  isDark
                    ? 'bg-purple-950/30 border-purple-900/50 text-purple-300'
                    : 'bg-purple-50 border-purple-200 text-purple-950 font-medium'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
                <span>
                  New dialect vocabulary confirmed here will immediately update the local AI model
                  for all future speech translations in {sourceLangName} &amp; {targetLangName}.
                </span>
              </div>

              {/* Source Word Input */}
              <div className="space-y-1">
                <label className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                  New Dialect Term ({sourceLangName}):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sourceWord}
                    onChange={(e) => setSourceWord(e.target.value)}
                    placeholder="e.g. कुथु / Dassa / इथी"
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900 font-semibold'
                    }`}
                  />
                  <button
                    onClick={() => audioEngine.speak(sourceWord, sourceLang)}
                    disabled={!sourceWord.trim()}
                    className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center gap-1 shrink-0 ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                        : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 font-bold'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Speak</span>
                  </button>
                </div>
              </div>

              {/* Target Translation Input */}
              <div className="space-y-1">
                <label className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                  Confirmed Meaning / Translation ({targetLangName}):
                </label>
                <input
                  type="text"
                  value={targetTranslation}
                  onChange={(e) => setTargetTranslation(e.target.value)}
                  placeholder="e.g. कहाँ (Where) / बताइए"
                  className={`w-full px-3 py-2 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900 font-semibold'
                  }`}
                />
              </div>

              {/* Phonetic & Category Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                    Phonetic Transliteration:
                  </label>
                  <input
                    type="text"
                    value={phonetic}
                    onChange={(e) => setPhonetic(e.target.value)}
                    placeholder="e.g. Kuthu"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                    Category / Context:
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                        : 'bg-slate-50 border-slate-300 text-slate-900 font-semibold'
                    }`}
                  >
                    <option value="Dialect Term">Dialect Term</option>
                    <option value="Location / Direction">Location / Direction</option>
                    <option value="Emergency / Medical">Emergency / Medical</option>
                    <option value="Food &amp; Commerce">Food &amp; Commerce</option>
                    <option value="Greeting / Respect">Greeting / Respect</option>
                  </select>
                </div>
              </div>

              {/* Context Notes */}
              <div className="space-y-1">
                <label className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                  Linguistic Context / Native Speaker Notes (Optional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Mandali Pahadi place adverb used in Himachal valleys"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          ) : (
            /* Dictionary Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className={`font-bold ${isDark ? 'text-zinc-300' : 'text-slate-900'}`}>
                  Active Model Learned Vocabulary ({learnedList.length} words)
                </span>
                <span className={isDark ? 'text-zinc-500' : 'text-slate-700'}>
                  Synced locally
                </span>
              </div>

              {learnedList.length === 0 ? (
                <div className={`p-6 text-center text-xs font-mono rounded-2xl border ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-200 text-slate-700'}`}>
                  No custom learned words yet. Use the &quot;Teach Word&quot; tab to add new vocabulary.
                </div>
              ) : (
                <div className="space-y-2">
                  {learnedList.map((word) => (
                    <div
                      key={word.id}
                      className={`p-3 rounded-2xl border text-xs font-mono flex items-center justify-between ${
                        isDark
                          ? 'bg-zinc-950/80 border-zinc-800 text-zinc-200'
                          : 'bg-slate-50 border-slate-300 text-slate-900 shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-purple-600 dark:text-purple-400">
                            {word.sourceWord}
                          </span>
                          <span className={isDark ? 'text-zinc-500' : 'text-slate-700'}>→</span>
                          <span className="font-bold">{word.targetTranslation}</span>
                        </div>
                        <div className={`text-[10px] mt-0.5 flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>
                          <span>Phonetic: {word.phonetic || word.sourceWord}</span>
                          <span>•</span>
                          <span>Used {word.usageCount} times</span>
                        </div>
                      </div>

                      <button
                        onClick={() => customVocabularyService.removeLearnedWord(word.id)}
                        className={`p-1.5 rounded-lg text-xs hover:text-red-500 transition-colors ${
                          isDark ? 'text-zinc-500 hover:bg-zinc-800' : 'text-slate-700 hover:bg-rose-50'
                        }`}
                        title="Delete word from model"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div
          className={`px-4 py-3 border-t flex items-center justify-between ${
            isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl font-mono text-xs font-semibold ${
              isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Cancel / Skip
          </button>

          {activeTab === 'learn' && (
            <button
              onClick={handleConfirmAndTeach}
              disabled={!sourceWord.trim() || !targetTranslation.trim()}
              className={`px-4 py-1.5 rounded-2xl font-mono text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                !sourceWord.trim() || !targetTranslation.trim()
                  ? 'opacity-50 cursor-not-allowed bg-slate-400 text-white'
                  : isDark
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-purple-700 hover:bg-purple-800 text-white'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Confirm &amp; Teach Model</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

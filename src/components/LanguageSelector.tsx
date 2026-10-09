import React from 'react';
import { Check, Info, Globe, Sparkles, HardDrive } from 'lucide-react';
import { LanguageCode, LanguageConfig } from '../types';
import { SUPPORTED_LANGUAGES } from '../services/languageRegistry';
import { useTheme } from '../context/ThemeContext';

interface LanguageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLang: LanguageCode;
  onSelectLang: (lang: LanguageCode) => void;
  title: string;
  subtitle?: string;
  excludeLang?: LanguageCode;
  onOpenPackManager?: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  isOpen,
  onClose,
  selectedLang,
  onSelectLang,
  title,
  subtitle,
  excludeLang,
  onOpenPackManager,
}) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150 ${
        isDark ? 'bg-black/70' : 'bg-slate-900/25'
      }`}
    >
      <div
        className={
          isDark
            ? 'w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200'
            : 'w-full max-w-md neo-glass-panel border border-white/95 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200 text-slate-800'
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-slate-200/80 bg-white/70'
          }`}
        >
          <div>
            <h3
              className={`text-base font-bold flex items-center gap-2 ${
                isDark ? 'text-zinc-100' : 'text-slate-900'
              }`}
            >
              <Globe className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-purple-600'}`} />
              {title}
            </h3>
            {subtitle && (
              <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                {subtitle}
              </p>
            )}
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

        {/* Notice for Mandali & Regional Dialects */}
        <div
          className={`px-4 py-2.5 text-xs flex items-start gap-2 border-b ${
            isDark
              ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300/90'
              : 'bg-gradient-to-r from-blue-50/90 to-purple-50/90 border-purple-200/60 text-purple-900'
          }`}
        >
          <Sparkles
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              isDark ? 'text-emerald-400' : 'text-purple-600'
            }`}
          />
          <span>
            <strong>Interstate Dialect Bridge:</strong> Full support for{' '}
            <strong>Mandali / Mandyali (Himachal)</strong>, <strong>Odia (Odisha)</strong>,{' '}
            <strong>Hindi</strong>, and <strong>English</strong> with offline phonetics.
          </span>
        </div>

        {/* List of Languages */}
        <div
          className={`p-3 overflow-y-auto space-y-2 flex-1 divide-y ${
            isDark ? 'divide-zinc-800/40' : 'divide-slate-200/40'
          }`}
        >
          {SUPPORTED_LANGUAGES.map((lang: LanguageConfig) => {
            const isSelected = selectedLang === lang.code;
            const isExcluded = excludeLang === lang.code;

            return (
              <button
                key={lang.code}
                disabled={isExcluded}
                onClick={() => {
                  onSelectLang(lang.code);
                  onClose();
                }}
                className={
                  isDark
                    ? `w-full text-left p-3 pt-3 rounded-xl transition-all flex items-start justify-between ${
                        isSelected
                          ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-100'
                          : isExcluded
                          ? 'opacity-40 cursor-not-allowed bg-zinc-900/40'
                          : 'bg-zinc-850/60 border border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-200'
                      }`
                    : `w-full text-left p-3 pt-3 rounded-2xl transition-all flex items-start justify-between ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-100/90 via-purple-100/90 to-pink-100/80 border border-purple-300 text-purple-950 shadow-xs'
                          : isExcluded
                          ? 'opacity-40 cursor-not-allowed'
                          : 'neo-gel-button border-white/95 text-slate-800 hover:shadow-xs'
                      }`
                }
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-base font-bold ${
                        isDark ? 'text-zinc-100' : 'text-slate-900'
                      }`}
                    >
                      {lang.name}
                    </span>
                    <span
                      className={`text-sm font-semibold px-2 py-0.5 rounded-full border ${
                        isDark
                          ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800/40'
                          : 'text-purple-700 bg-purple-100 border-purple-200 shadow-2xs'
                      }`}
                    >
                      {lang.nativeName}
                    </span>
                    {lang.isDialect && (
                      <span
                        className={`text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                          isDark
                            ? 'bg-amber-950/60 border-amber-800/50 text-amber-300'
                            : 'bg-pink-100 border-pink-200 text-pink-700'
                        }`}
                      >
                        Dialect
                      </span>
                    )}
                  </div>

                  <div
                    className={`text-xs mt-1 flex items-center gap-1 font-mono ${
                      isDark ? 'text-zinc-400' : 'text-slate-500'
                    }`}
                  >
                    <span className={isDark ? 'text-zinc-300 font-semibold' : 'text-slate-700 font-semibold'}>
                      {lang.state}
                    </span>
                    <span>·</span>
                    <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>{lang.region}</span>
                  </div>

                  {/* Sample phrase with phonetic transliteration */}
                  <div
                    className={`mt-2 text-xs rounded-xl p-2 font-mono border ${
                      isDark
                        ? 'bg-zinc-900/90 border-zinc-800'
                        : 'bg-white/80 border-white/95 shadow-2xs'
                    }`}
                  >
                    <div className={`font-medium ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                      {lang.greetingExample.native}
                    </div>
                    <div
                      className={`text-[11px] italic ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}
                    >
                      Phonetic: &quot;{lang.greetingExample.phonetic}&quot;
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  {isSelected && (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isDark
                          ? 'bg-emerald-500 text-black'
                          : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xs'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Offline Pack Manager link */}
        {onOpenPackManager && (
          <div
            className={`px-4 py-2 border-t ${
              isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-slate-200/60 bg-white/50'
            }`}
          >
            <button
              onClick={() => {
                onClose();
                onOpenPackManager();
              }}
              className={
                isDark
                  ? 'w-full py-2 px-3 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-emerald-400 border border-emerald-900/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors'
                  : 'w-full py-2 px-3 rounded-2xl neo-gel-button text-purple-700 hover:text-purple-900 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-xs'
              }
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Manage Offline Speech Packs (Hindi, Odia, Mandali)</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div
          className={`p-3 border-t text-[11px] text-center flex items-center justify-center gap-1.5 font-mono ${
            isDark
              ? 'border-zinc-800 bg-zinc-950/60 text-zinc-500'
              : 'border-slate-200/80 bg-white/70 text-slate-500'
          }`}
        >
          <Info className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-purple-500'}`} />
          <span>Extensible registry: Plug in additional state languages anytime</span>
        </div>
      </div>
    </div>
  );
};

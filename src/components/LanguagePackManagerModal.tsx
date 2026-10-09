import React, { useState, useEffect } from 'react';
import {
  Download,
  Trash2,
  Volume2,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Sliders,
  ShieldCheck,
  ChevronRight,
  Database,
  Radio,
} from 'lucide-react';
import {
  languagePackService,
  LanguagePack,
  PackPreferences,
} from '../services/languagePackService';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface LanguagePackManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguagePackManagerModal: React.FC<LanguagePackManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isDark } = useTheme();
  const [packs, setPacks] = useState<LanguagePack[]>([]);
  const [prefs, setPrefs] = useState<PackPreferences>(languagePackService.getPreferences());
  const [activeTab, setActiveTab] = useState<'packs' | 'settings'>('packs');
  const [playingPackId, setPlayingPackId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = languagePackService.subscribe((updatedPacks, updatedPrefs) => {
      setPacks(updatedPacks);
      setPrefs(updatedPrefs);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const totalInstalledMb = languagePackService.getTotalInstalledSizeMb();
  const installedCount = packs.filter((p) => p.status === 'installed').length;
  const storageMaxMb = 512; // Mobile app offline storage allocation
  const storagePercentage = Math.min(100, (totalInstalledMb / storageMaxMb) * 100);

  const handleTestVoice = async (packId: string) => {
    setPlayingPackId(packId);
    try {
      await languagePackService.playPackSample(packId);
    } finally {
      setPlayingPackId(null);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-150 ${
        isDark ? 'bg-black/75' : 'bg-slate-900/30'
      }`}
      onClick={onClose}
    >
      <div
        className={
          isDark
            ? 'w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in slide-in-from-bottom duration-200'
            : 'w-full max-w-xl neo-glass-panel border border-white/95 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in slide-in-from-bottom duration-200 text-slate-800'
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          className={`px-4 py-3.5 border-b flex items-center justify-between ${
            isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-slate-200/80 bg-white/75'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-2 rounded-2xl ${
                isDark
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : 'bg-gradient-to-tr from-blue-500/15 via-purple-500/15 to-pink-500/20 text-purple-600 border border-purple-200'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={`text-sm font-bold font-mono tracking-tight ${
                    isDark ? 'text-zinc-100' : 'text-slate-900'
                  }`}
                >
                  LANGUAGE PACK MANAGER
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isDark
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      : 'bg-purple-100 text-purple-700 border border-purple-200'
                  }`}
                >
                  {installedCount}/{packs.length} Active
                </span>
              </div>
              <p
                className={`text-[11px] font-mono ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}
              >
                High-Quality Offline Speech Synthesis for Hindi, Odia &amp; Mandali
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              isDark
                ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                : 'bg-white/90 text-slate-500 hover:text-slate-800 border border-slate-200/80 shadow-xs'
            }`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`flex border-b px-4 ${
            isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-slate-200/60 bg-white/40'
          }`}
        >
          <button
            onClick={() => {
              audioEngine.triggerHaptic(20);
              setActiveTab('packs');
            }}
            className={`py-2.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'packs'
                ? isDark
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-purple-600 text-purple-700'
                : isDark
                ? 'border-transparent text-zinc-400 hover:text-zinc-200'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Speech Packs ({packs.length})</span>
          </button>

          <button
            onClick={() => {
              audioEngine.triggerHaptic(20);
              setActiveTab('settings');
            }}
            className={`py-2.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'settings'
                ? isDark
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-purple-600 text-purple-700'
                : isDark
                ? 'border-transparent text-zinc-400 hover:text-zinc-200'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Voice Audio Settings</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'packs' ? (
            <>
              {/* Storage & Quick Action Header */}
              <div
                className={
                  isDark
                    ? 'p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-2.5'
                    : 'p-3.5 rounded-3xl bg-white/70 border border-white/90 shadow-xs space-y-2.5'
                }
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-purple-600'}`} />
                    <span className="font-bold">Offline Storage Cache</span>
                  </div>
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-600 font-semibold'}>
                    {totalInstalledMb.toFixed(1)} MB / {storageMaxMb} MB
                  </span>
                </div>

                {/* Storage Meter Bar */}
                <div className="w-full h-2 rounded-full overflow-hidden bg-zinc-700/30">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDark
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500'
                    }`}
                    style={{ width: `${Math.max(4, storagePercentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span
                    className={`text-[10px] font-mono ${
                      isDark ? 'text-zinc-500' : 'text-slate-500'
                    }`}
                  >
                    Zero internet needed once packs are downloaded
                  </span>

                  <button
                    onClick={() => {
                      audioEngine.triggerHaptic(30);
                      languagePackService.downloadAllPriorityPacks();
                    }}
                    className={
                      isDark
                        ? 'px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900 transition-colors flex items-center gap-1'
                        : 'px-3 py-1 rounded-2xl text-[11px] font-mono font-bold neo-gel-button text-purple-700 hover:text-purple-900 shadow-xs flex items-center gap-1'
                    }
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Hindi, Odia &amp; Mandali</span>
                  </button>
                </div>
              </div>

              {/* Language Packs List */}
              <div className="space-y-3">
                {packs.map((pack) => {
                  const isInstalled = pack.status === 'installed';
                  const isDownloading = pack.status === 'downloading';
                  const isPriority = ['hi', 'or', 'mjl'].includes(pack.langCode);

                  return (
                    <div
                      key={pack.id}
                      className={
                        isDark
                          ? `p-3.5 rounded-2xl border transition-all ${
                              isInstalled
                                ? 'bg-zinc-850/80 border-zinc-750'
                                : 'bg-zinc-900/60 border-zinc-800/80 opacity-90'
                            }`
                          : `p-3.5 rounded-3xl border transition-all ${
                              isInstalled
                                ? 'neo-glass-panel border-white/95 shadow-xs'
                                : 'bg-white/50 border-slate-200/70'
                            }`
                      }
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span
                              className={`text-sm font-bold font-mono ${
                                isDark ? 'text-zinc-100' : 'text-slate-900'
                              }`}
                            >
                              {pack.name}
                            </span>

                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                isDark
                                  ? 'bg-zinc-800 text-amber-300 border border-zinc-700'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold'
                              }`}
                            >
                              {pack.nativeName}
                            </span>

                            {isPriority && (
                              <span
                                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                                  isDark
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-pink-100 text-pink-700 font-bold border border-pink-200'
                                }`}
                              >
                                Core Dialect
                              </span>
                            )}
                          </div>

                          <div
                            className={`text-[11px] font-mono mt-0.5 ${
                              isDark ? 'text-zinc-400' : 'text-slate-600'
                            }`}
                          >
                            {pack.region}
                          </div>

                          <div
                            className={`text-[10px] font-mono mt-1 flex items-center space-x-2 ${
                              isDark ? 'text-zinc-500' : 'text-slate-400'
                            }`}
                          >
                            <span>{pack.sizeMb} MB</span>
                            <span>•</span>
                            <span>{pack.version}</span>
                            {pack.lastUpdated && (
                              <>
                                <span>•</span>
                                <span>Updated: {pack.lastUpdated}</span>
                              </>
                            )}
                          </div>

                          {/* Features */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pack.features.map((feat, idx) => (
                              <span
                                key={idx}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                                  isDark
                                    ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/60'
                                    : 'bg-slate-100/90 text-slate-700 border border-slate-200/60'
                                }`}
                              >
                                {feat}
                              </span>
                            ))}
                          </div>

                          {/* Sample Phrase Preview */}
                          <div
                            className={`mt-2.5 p-2 rounded-xl text-xs font-mono flex flex-col gap-0.5 ${
                              isDark
                                ? 'bg-zinc-950/60 border border-zinc-800/80 text-zinc-300'
                                : 'bg-slate-50 border border-slate-200/60 text-slate-800'
                            }`}
                          >
                            <span className="text-[10px] font-semibold text-purple-600 dark:text-emerald-400">
                              Voice Sample:
                            </span>
                            <span className="italic">&quot;{pack.samplePhrase}&quot;</span>
                            <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                              Phonetic: &quot;{pack.phoneticSample}&quot;
                            </span>
                          </div>
                        </div>

                        {/* Actions Right */}
                        <div className="flex flex-col items-end space-y-2 shrink-0">
                          {isInstalled ? (
                            <>
                              <div
                                className={`flex items-center gap-1 text-xs font-mono font-bold ${
                                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Installed</span>
                              </div>

                              <button
                                onClick={() => handleTestVoice(pack.id)}
                                disabled={playingPackId === pack.id}
                                className={
                                  isDark
                                    ? 'px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50'
                                    : 'px-3 py-1.5 rounded-2xl neo-gel-button text-purple-700 hover:text-purple-900 text-xs font-mono flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50'
                                }
                                title="Play voice synthesis test"
                              >
                                <Volume2
                                  className={`w-3.5 h-3.5 ${
                                    playingPackId === pack.id ? 'animate-bounce text-pink-500' : ''
                                  }`}
                                />
                                <span>{playingPackId === pack.id ? 'Speaking...' : 'Test Voice'}</span>
                              </button>

                              <button
                                onClick={() => languagePackService.deletePack(pack.id)}
                                className={
                                  isDark
                                    ? 'p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors'
                                    : 'p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors'
                                }
                                title="Delete offline pack to free storage"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : isDownloading ? (
                            <div className="flex flex-col items-end space-y-1">
                              <div
                                className={`text-xs font-mono font-bold flex items-center gap-1 ${
                                  isDark ? 'text-amber-400' : 'text-purple-600'
                                }`}
                              >
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>{pack.downloadProgress}%</span>
                              </div>
                              <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 transition-all duration-200"
                                  style={{ width: `${pack.downloadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => languagePackService.downloadPack(pack.id)}
                              className={
                                isDark
                                  ? 'px-3 py-1.5 rounded-xl bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors'
                                  : 'px-3 py-1.5 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95'
                              }
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Settings & Voice Audio Fine-Tuning Tab */
            <div className="space-y-4">
              <div
                className={
                  isDark
                    ? 'p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-4'
                    : 'p-4 rounded-3xl neo-glass-panel border-white/95 space-y-4 shadow-xs'
                }
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4
                      className={`text-xs font-bold font-mono ${
                        isDark ? 'text-zinc-100' : 'text-slate-900'
                      }`}
                    >
                      Prefer Offline Speech Synthesis
                    </h4>
                    <p
                      className={`text-[11px] font-mono ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}
                    >
                      Prioritize local downloaded packs for instantaneous voice playback
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.preferOfflineVoice}
                    onChange={(e) =>
                      languagePackService.updatePreferences({ preferOfflineVoice: e.target.checked })
                    }
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                </div>

                <div className="border-t border-zinc-800/40 dark:border-zinc-800/80 pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <label
                      className={`text-xs font-mono font-bold ${
                        isDark ? 'text-zinc-200' : 'text-slate-800'
                      }`}
                    >
                      Speech Rate (Speed): {prefs.speechRate.toFixed(2)}x
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}
                    >
                      {prefs.speechRate < 0.95
                        ? 'Slow & Clear (Highways)'
                        : prefs.speechRate > 1.05
                        ? 'Rapid Intercom'
                        : 'Natural Cadence'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.25"
                    step="0.05"
                    value={prefs.speechRate}
                    onChange={(e) =>
                      languagePackService.updatePreferences({ speechRate: parseFloat(e.target.value) })
                    }
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                <div className="border-t border-zinc-800/40 dark:border-zinc-800/80 pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <label
                      className={`text-xs font-mono font-bold ${
                        isDark ? 'text-zinc-200' : 'text-slate-800'
                      }`}
                    >
                      Pitch Intonation: {prefs.speechPitch.toFixed(2)}
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}
                    >
                      {prefs.speechPitch === 1.0 ? 'Default Accent' : 'Tuned Modulation'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.2"
                    step="0.05"
                    value={prefs.speechPitch}
                    onChange={(e) =>
                      languagePackService.updatePreferences({ speechPitch: parseFloat(e.target.value) })
                    }
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                <div className="border-t border-zinc-800/40 dark:border-zinc-800/80 pt-3 flex items-center justify-between">
                  <div>
                    <h4
                      className={`text-xs font-bold font-mono ${
                        isDark ? 'text-zinc-100' : 'text-slate-900'
                      }`}
                    >
                      Auto-Preload Emergency Phrases
                    </h4>
                    <p
                      className={`text-[11px] font-mono ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}
                    >
                      Keeps critical medical, disaster, and rescue audio ready instantly
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.autoDownloadEmergencyPhrases}
                    onChange={(e) =>
                      languagePackService.updatePreferences({
                        autoDownloadEmergencyPhrases: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                </div>

                <div className="border-t border-zinc-800/40 dark:border-zinc-800/80 pt-3 flex items-center justify-between">
                  <div>
                    <h4
                      className={`text-xs font-bold font-mono ${
                        isDark ? 'text-zinc-100' : 'text-slate-900'
                      }`}
                    >
                      Tactile Haptic on Speech Finish
                    </h4>
                    <p
                      className={`text-[11px] font-mono ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}
                    >
                      Vibrates mobile device when speech synthesis finishes reading
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.hapticOnSpeechComplete}
                    onChange={(e) =>
                      languagePackService.updatePreferences({
                        hapticOnSpeechComplete: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Offline Engine Architecture Info Card */}
              <div
                className={`p-3.5 rounded-2xl border text-xs font-mono space-y-1.5 ${
                  isDark
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                    : 'bg-gradient-to-r from-blue-50/80 to-purple-50/80 border-purple-200 text-purple-900'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Radio className="w-4 h-4" />
                  <span>Mandali, Odia &amp; Hindi Offline Pipeline</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  When disconnected from cellular networks or deep in mountain valleys, BhashaSetu
                  uses embedded neural phoneme rules, Takri-to-Devanagari dialect morphology, and local
                  speech synthesis engines to guarantee that interstate travelers can always be heard
                  and understood.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div
          className={`px-4 py-3 border-t flex items-center justify-between ${
            isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-slate-200/80 bg-white/75'
          }`}
        >
          <span
            className={`text-[11px] font-mono ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}
          >
            Offline Voice Engine: Ready
          </span>

          <button
            onClick={onClose}
            className={
              isDark
                ? 'px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-mono text-xs font-bold transition-colors'
                : 'px-4 py-1.5 rounded-2xl neo-gel-button text-purple-800 hover:text-purple-950 font-mono text-xs font-bold shadow-xs'
            }
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

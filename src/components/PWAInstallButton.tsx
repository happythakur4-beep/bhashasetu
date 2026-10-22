import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTheme } from '../context/ThemeContext';

interface PWAInstallButtonProps {
  variant?: 'banner' | 'button' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { isDark } = useTheme();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (variant === 'compact') {
    if (isInstallable) {
      return (
        <button
          onClick={install}
          className={
            isDark
              ? 'px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1 transition-all shadow-xs'
              : 'px-2.5 py-1 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold flex items-center gap-1 transition-all shadow-xs'
          }
          title="Install BhashaSetu App on Android or Desktop"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      );
    }

    if (isIOS) {
      return (
        <>
          <button
            onClick={() => setShowIOSGuide(true)}
            className={
              isDark
                ? 'px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold flex items-center gap-1 transition-all border border-zinc-700'
                : 'px-2.5 py-1 rounded-2xl neo-gel-button text-purple-700 font-mono text-xs font-bold flex items-center gap-1 transition-all'
            }
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install iOS</span>
          </button>

          {showIOSGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
              <div
                className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-purple-500" />
                    <span>Install on iPhone / iPad</span>
                  </h3>
                  <button onClick={() => setShowIOSGuide(false)} className="p-1 rounded-full hover:bg-zinc-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ol className="text-xs space-y-2 font-sans leading-relaxed text-slate-600 dark:text-zinc-300">
                  <li>1. Tap the <strong>Share</strong> icon in Safari toolbar.</li>
                  <li>2. Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>3. Tap <strong>Add</strong> to install BhashaSetu as a native app.</li>
                </ol>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-4 w-full py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold transition-all"
                >
                  Got It
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    return null;
  }

  // Banner variant for home/settings
  return (
    <div
      className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs ${
        isDark ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' : 'bg-purple-50 border-purple-200 text-purple-900'
      }`}
    >
      <div className="flex items-center gap-2">
        <Smartphone className="w-4 h-4 shrink-0 text-emerald-400" />
        <div>
          <div className="font-bold font-mono">Install BhashaSetu Field App</div>
          <div className="text-[10px] opacity-80">Full screen PTT walkie-talkie &amp; offline dialect access</div>
        </div>
      </div>

      {isInstallable ? (
        <button
          onClick={install}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shrink-0 transition-all shadow-xs flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
      ) : isIOS ? (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold shrink-0 transition-all shadow-xs"
        >
          iOS Guide
        </button>
      ) : null}
    </div>
  );
};

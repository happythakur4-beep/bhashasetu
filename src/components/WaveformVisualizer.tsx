import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Mic, Activity, Radio, Volume2 } from 'lucide-react';

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color?: 'emerald' | 'amber' | 'red' | 'purple';
  barCount?: number;
  showMetrics?: boolean;
  mode?: 'bars' | 'wave' | 'hybrid';
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  analyser,
  isActive,
  color = 'emerald',
  barCount = 32,
  showMetrics = true,
  mode = 'hybrid',
}) => {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Peak hold array for falling peak dots
  const peakHoldRef = useRef<number[]>(new Array(barCount).fill(0));
  
  // Real-time audio metrics state
  const [metrics, setMetrics] = useState({
    db: -60,
    levelPct: 0,
    isClipping: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let freqArray: Uint8Array | null = null;
    let timeArray: Uint8Array | null = null;

    if (analyser) {
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      const bufferLength = analyser.frequencyBinCount;
      freqArray = new Uint8Array(bufferLength);
      timeArray = new Uint8Array(bufferLength);
    }

    let lastMetricsUpdate = Date.now();

    const render = () => {
      const container = containerRef.current;
      if (container && canvas) {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = Math.floor(rect.width * dpr);
        const targetHeight = Math.floor(rect.height * dpr);

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        }
      }

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Determine palette based on color prop and theme
      let primaryColor = isDark ? '#10b981' : '#8b5cf6'; // Emerald or Violet
      let secondaryColor = isDark ? '#34d399' : '#a855f7';
      let glowColor = isDark ? 'rgba(16, 185, 129, 0.5)' : 'rgba(139, 92, 246, 0.4)';
      let peakColor = isDark ? '#6ee7b7' : '#c084fc';

      if (color === 'red' || isActive) {
        primaryColor = isDark ? '#ef4444' : '#f43f5e'; // Red / Rose
        secondaryColor = isDark ? '#f87171' : '#fb7185';
        glowColor = isDark ? 'rgba(239, 68, 68, 0.6)' : 'rgba(244, 63, 94, 0.5)';
        peakColor = isDark ? '#fca5a5' : '#fda4af';
      } else if (color === 'amber') {
        primaryColor = isDark ? '#f59e0b' : '#ec4899';
        secondaryColor = isDark ? '#fbbf24' : '#f472b6';
        glowColor = isDark ? 'rgba(245, 158, 11, 0.5)' : 'rgba(236, 72, 153, 0.4)';
        peakColor = isDark ? '#fde68a' : '#fbcfe8';
      }

      const padding = 8;
      const drawWidth = width - padding * 2;
      const drawHeight = height - padding * 2;
      const barWidth = Math.max(2, Math.floor((drawWidth / barCount) - 2));
      const gap = (drawWidth - barCount * barWidth) / (barCount - 1);

      let currentRms = 0;

      if (isActive && analyser && freqArray && timeArray) {
        analyser.getByteFrequencyData(freqArray as any);
        analyser.getByteTimeDomainData(timeArray as any);

        // Calculate RMS loudness level
        let sum = 0;
        for (let i = 0; i < timeArray.length; i++) {
          const v = (timeArray[i] - 128) / 128;
          sum += v * v;
        }
        currentRms = Math.sqrt(sum / timeArray.length);

        // Draw Equalizer Bars
        if (mode === 'bars' || mode === 'hybrid') {
          for (let i = 0; i < barCount; i++) {
            // Mirror frequency index for centered audio visualizer feel
            const freqIndex = Math.floor(Math.abs(i - barCount / 2) / (barCount / 2) * (freqArray.length * 0.85));
            const rawVal = freqArray[freqIndex] || 0;
            const normVal = rawVal / 255;
            const targetBarHeight = Math.max(4, normVal * drawHeight);

            const x = padding + i * (barWidth + gap);
            const y = padding + (drawHeight - targetBarHeight) / 2;

            // Gradient Fill
            const grad = ctx.createLinearGradient(x, y, x, y + targetBarHeight);
            grad.addColorStop(0, secondaryColor);
            grad.addColorStop(1, primaryColor);

            ctx.fillStyle = grad;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = Math.min(12, normVal * 16);

            // Draw rounded bar
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, targetBarHeight, 3);
            ctx.fill();

            // Peak Hold decay logic
            const currentPeak = peakHoldRef.current[i] || 0;
            if (targetBarHeight >= currentPeak) {
              peakHoldRef.current[i] = targetBarHeight;
            } else {
              peakHoldRef.current[i] = Math.max(0, currentPeak - 1.8);
            }

            // Draw Peak Hold Dot
            const peakY = padding + (drawHeight - peakHoldRef.current[i]) / 2;
            ctx.fillStyle = peakColor;
            ctx.shadowBlur = 4;
            ctx.fillRect(x, Math.max(padding, peakY - 2), barWidth, 2);
          }
        }

        // Draw Smooth Oscilloscope Time-Domain Curve Overlay
        if (mode === 'wave' || mode === 'hybrid') {
          ctx.beginPath();
          ctx.strokeStyle = secondaryColor;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 8;

          const sliceWidth = drawWidth / timeArray.length;
          let x = padding;

          for (let i = 0; i < timeArray.length; i++) {
            const v = timeArray[i] / 128.0;
            const y = padding + (v * drawHeight) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }
          ctx.stroke();
        }

      } else if (isActive) {
        // Fallback Animated Synthetic Wave when Active
        const time = Date.now() * 0.006;
        let syntheticSum = 0;

        for (let i = 0; i < barCount; i++) {
          const sinVal = Math.sin(time + i * 0.35) * Math.cos(time * 0.6 + i * 0.15);
          const normVal = Math.abs(sinVal);
          syntheticSum += normVal;

          const targetBarHeight = Math.max(6, normVal * (drawHeight * 0.8));
          const x = padding + i * (barWidth + gap);
          const y = padding + (drawHeight - targetBarHeight) / 2;

          ctx.fillStyle = primaryColor;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 8;

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, targetBarHeight, 2);
          ctx.fill();
        }

        currentRms = (syntheticSum / barCount) * 0.6;
      } else {
        // Standby / Idle Flatline State
        const idleColor = isDark ? '#27272a' : '#e2e8f0';
        for (let i = 0; i < barCount; i++) {
          const x = padding + i * (barWidth + gap);
          const y = padding + (drawHeight - 2) / 2;
          ctx.fillStyle = idleColor;
          ctx.shadowBlur = 0;
          ctx.fillRect(x, y, barWidth, 2);
        }
      }

      // Periodically update HUD metrics state (every ~100ms) to avoid React state thrashing
      const now = Date.now();
      if (now - lastMetricsUpdate > 100) {
        lastMetricsUpdate = now;
        const levelPct = Math.min(100, Math.round(currentRms * 180));
        const db = levelPct > 0 ? Math.round(20 * Math.log10(currentRms + 0.001)) : -60;
        setMetrics({
          db: Math.max(-60, db),
          levelPct,
          isClipping: levelPct > 92,
        });
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isActive, color, barCount, mode, isDark]);

  return (
    <div
      ref={containerRef}
      className={
        isDark
          ? 'w-full flex flex-col bg-zinc-950/90 rounded-2xl p-2.5 border border-zinc-800/90 shadow-inner space-y-1.5'
          : 'w-full flex flex-col neo-glass-card rounded-3xl p-3 border border-white/95 shadow-xs space-y-1.5'
      }
    >
      {/* Real-time Waveform HUD Header */}
      {showMetrics && (
        <div className="flex items-center justify-between text-[10px] font-mono font-bold px-1 select-none">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                isActive
                  ? metrics.isClipping
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-red-500 animate-pulse'
                  : isDark
                  ? 'bg-zinc-600'
                  : 'bg-slate-400'
              }`}
            />
            <span className={isActive ? (isDark ? 'text-red-400' : 'text-rose-700') : isDark ? 'text-zinc-400' : 'text-slate-600'}>
              {isActive ? '🔴 MIC TRANSMITTING' : '🎙️ STANDBY'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>
              {isActive ? `${metrics.db} dB` : 'AUDIO READY'}
            </span>
            <div className="w-12 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-800 overflow-hidden border border-zinc-700/50">
              <div
                className={`h-full transition-all duration-75 ${
                  metrics.isClipping
                    ? 'bg-red-500'
                    : isActive
                    ? 'bg-emerald-400'
                    : 'bg-zinc-600'
                }`}
                style={{ width: `${metrics.levelPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Real-time Canvas Rendering Box */}
      <div className="w-full h-11 sm:h-12 relative overflow-hidden rounded-xl">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
};


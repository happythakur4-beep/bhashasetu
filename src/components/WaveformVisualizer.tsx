import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color?: 'emerald' | 'amber' | 'red';
  barCount?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  analyser,
  isActive,
  color = 'emerald',
  barCount = 28,
}) => {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dataArray: any = null;
    if (analyser) {
      analyser.fftSize = 64;
      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / barCount - 2;

      let primaryColor = isDark ? '#10b981' : '#a855f7'; // emerald in dark, purple in light
      let glowColor = isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(168, 85, 247, 0.35)';

      if (color === 'amber') {
        primaryColor = isDark ? '#f59e0b' : '#ec4899';
        glowColor = isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(236, 72, 153, 0.35)';
      } else if (color === 'red') {
        primaryColor = isDark ? '#ef4444' : '#f43f5e';
        glowColor = isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(244, 63, 94, 0.4)';
      }

      if (isActive && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * dataArray.length);
          const value = dataArray[dataIndex] || 0;
          const barHeight = Math.max(4, (value / 255) * (height - 4));
          const x = i * (barWidth + 2);
          const y = (height - barHeight) / 2;

          ctx.fillStyle = primaryColor;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 6;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      } else if (isActive) {
        const time = Date.now() * 0.008;
        for (let i = 0; i < barCount; i++) {
          const sinVal = Math.sin(time + i * 0.4) * Math.cos(time * 0.5 + i * 0.2);
          const barHeight = Math.max(6, Math.abs(sinVal) * (height * 0.85));
          const x = i * (barWidth + 2);
          const y = (height - barHeight) / 2;

          ctx.fillStyle = primaryColor;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 6;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      } else {
        const idleColor = isDark ? '#3f3f46' : '#cbd5e1';
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + 2);
          const y = (height - 3) / 2;
          ctx.fillStyle = idleColor;
          ctx.shadowBlur = 0;
          ctx.fillRect(x, y, barWidth, 3);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isActive, color, barCount, isDark]);

  return (
    <div
      className={
        isDark
          ? 'w-full h-10 flex items-center justify-center bg-zinc-950/80 rounded-lg p-1 border border-zinc-800/80'
          : 'w-full h-10 flex items-center justify-center neo-glass-card rounded-2xl p-1 border border-white/90 shadow-2xs'
      }
    >
      <canvas
        ref={canvasRef}
        width={320}
        height={36}
        className="w-full h-full block"
      />
    </div>
  );
};

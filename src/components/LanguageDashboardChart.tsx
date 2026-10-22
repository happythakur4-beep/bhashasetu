import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { ConversationMessage } from '../types';
import { SUPPORTED_LANGUAGES } from '../services/languageRegistry';
import { BarChart2, PieChart as PieIcon, Sparkles, Activity, Layers } from 'lucide-react';

interface LanguageDashboardChartProps {
  messages: ConversationMessage[];
  isDark: boolean;
}

const DIALECT_COLOR_MAP: Record<string, string> = {
  mjl: '#f59e0b', // Amber for Mandali Pahadi
  hi: '#8b5cf6',  // Purple for Hindi
  or: '#0284c7',  // Sky Blue for Odia
  en: '#ec4899',  // Pink for English
  pa: '#10b981',  // Emerald for Punjabi
  bn: '#3b82f6',  // Blue for Bengali
  mr: '#f97316',  // Orange for Marathi
};

const DEFAULT_COLORS = ['#8b5cf6', '#f59e0b', '#0284c7', '#ec4899', '#10b981', '#f97316'];

export const LanguageDashboardChart: React.FC<LanguageDashboardChartProps> = ({
  messages,
  isDark,
}) => {
  // Aggregate frequency of SOURCE languages across all session history messages
  const sourceChartData = useMemo(() => {
    const frequencyMap: Record<string, { code: string; name: string; nativeName: string; count: number; percent: number }> = {};
    const totalMsgs = messages.length;

    messages.forEach((msg) => {
      if (!frequencyMap[msg.sourceLang]) {
        const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === msg.sourceLang);
        frequencyMap[msg.sourceLang] = {
          code: msg.sourceLang,
          name: langObj?.name || msg.sourceLang.toUpperCase(),
          nativeName: langObj?.nativeName || msg.sourceLang,
          count: 0,
          percent: 0,
        };
      }
      frequencyMap[msg.sourceLang].count += 1;
    });

    const items = Object.values(frequencyMap).map((item) => ({
      ...item,
      percent: totalMsgs > 0 ? Math.round((item.count / totalMsgs) * 100) : 0,
    }));

    return items.sort((a, b) => b.count - a.count);
  }, [messages]);

  // Aggregate frequency of TARGET languages for secondary breakdown
  const targetChartData = useMemo(() => {
    const frequencyMap: Record<string, { code: string; name: string; nativeName: string; count: number }> = {};

    messages.forEach((msg) => {
      if (!frequencyMap[msg.targetLang]) {
        const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === msg.targetLang);
        frequencyMap[msg.targetLang] = {
          code: msg.targetLang,
          name: langObj?.name || msg.targetLang.toUpperCase(),
          nativeName: langObj?.nativeName || msg.targetLang,
          count: 0,
        };
      }
      frequencyMap[msg.targetLang].count += 1;
    });

    return Object.values(frequencyMap).sort((a, b) => b.count - a.count);
  }, [messages]);

  const topSourceDialect = sourceChartData[0];
  const totalTransmissions = messages.length;
  const offlineCount = messages.filter((m) => m.isOffline).length;
  const offlinePercent = totalTransmissions > 0 ? Math.round((offlineCount / totalTransmissions) * 100) : 0;

  if (messages.length === 0) {
    return (
      <div
        className={`p-4 rounded-2xl border text-center font-mono text-xs ${
          isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400' : 'bg-white/80 border-slate-200 text-slate-700'
        }`}
      >
        <BarChart2 className="w-5 h-5 mx-auto mb-1 opacity-50 text-purple-500" />
        <span>No conversation history recorded yet. Transmit voice on Walkie-Talkie or Dual Mode to visualize source language distribution.</span>
      </div>
    );
  }

  return (
    <div
      className={
        isDark
          ? 'p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3.5 shadow-md'
          : 'p-3.5 rounded-3xl neo-glass-panel border border-white/95 space-y-3.5 shadow-sm text-slate-800'
      }
    >
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-3 gap-2 font-mono">
        <div
          className={`p-2.5 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-zinc-950/80 border-zinc-800 text-zinc-200' : 'bg-white/90 border-slate-200/90 shadow-xs'
          }`}
        >
          <span className={`text-[10px] uppercase font-mono ${isDark ? 'text-zinc-400' : 'text-slate-700 font-bold'}`}>
            Primary Source Dialect
          </span>
          <div className="mt-1">
            <span className="text-xs font-bold text-amber-500 font-mono block truncate">
              {topSourceDialect ? topSourceDialect.name : 'N/A'}
            </span>
            <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-700 font-medium'}`}>
              {topSourceDialect ? `${topSourceDialect.count} msgs (${topSourceDialect.percent}%)` : '0'}
            </span>
          </div>
        </div>

        <div
          className={`p-2.5 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-zinc-950/80 border-zinc-800 text-zinc-200' : 'bg-white/90 border-slate-200/90 shadow-xs'
          }`}
        >
          <span className={`text-[10px] uppercase font-mono ${isDark ? 'text-zinc-400' : 'text-slate-700 font-bold'}`}>
            Unique Source Dialects
          </span>
          <div className="mt-1">
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono block">
              {sourceChartData.length} Dialects
            </span>
            <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-700 font-medium'}`}>
              {totalTransmissions} total spoken
            </span>
          </div>
        </div>

        <div
          className={`p-2.5 rounded-xl border flex flex-col justify-between ${
            isDark ? 'bg-zinc-950/80 border-zinc-800 text-zinc-200' : 'bg-white/90 border-slate-200/90 shadow-xs'
          }`}
        >
          <span className={`text-[10px] uppercase font-mono ${isDark ? 'text-zinc-400' : 'text-slate-700 font-bold'}`}>
            Offline Fallbacks
          </span>
          <div className="mt-1">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono block">
              {offlinePercent}%
            </span>
            <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-700 font-medium'}`}>
              {offlineCount} phrasebook
            </span>
          </div>
        </div>
      </div>

      {/* Visual Recharts Bar Chart: Source Dialect Distribution */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            <BarChart2 className="w-4 h-4 text-purple-600 dark:text-emerald-400" />
            <span className={isDark ? 'text-zinc-200' : 'text-slate-900'}>Source Language Frequency (Spoken Dialects)</span>
          </div>
          <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-700 font-bold'}`}>
            Recharts Distribution
          </span>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="h-48 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sourceChartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: isDark ? '#a1a1aa' : '#1e293b', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}
                axisLine={{ stroke: isDark ? '#3f3f46' : '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: isDark ? '#a1a1aa' : '#1e293b', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: isDark ? '#3f3f46' : '#cbd5e1' }}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-mono shadow-xl border ${
                          isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-slate-900 text-white border-slate-800'
                        }`}
                      >
                        <div className="font-bold">{data.name} ({data.nativeName})</div>
                        <div className="text-[11px] text-amber-400 font-bold mt-0.5">
                          {data.count} spoken transmissions ({data.percent}% of session)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {sourceChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={DIALECT_COLOR_MAP[entry.code] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Target Languages Breakdown Summary */}
        <div className="pt-2.5 border-t border-zinc-800/40 dark:border-zinc-800/80">
          <div className="flex items-center justify-between text-xs font-mono font-bold mb-1.5">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className={isDark ? 'text-zinc-200' : 'text-slate-900'}>Target Translation Languages Breakdown</span>
            </div>
            <span className={isDark ? 'text-zinc-500' : 'text-slate-700'}>
              {targetChartData.length} target dialects
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {targetChartData.map((t) => (
              <span
                key={t.code}
                className={`text-[10px] font-mono px-2 py-1 rounded-lg border font-bold flex items-center gap-1 ${
                  isDark
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
                    : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: DIALECT_COLOR_MAP[t.code] || '#8b5cf6' }}
                />
                <span>{t.name}:</span>
                <span className="text-purple-600 dark:text-purple-400">{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

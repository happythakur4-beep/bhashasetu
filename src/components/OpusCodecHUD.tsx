import React, { useState, useEffect } from 'react';
import {
  Zap,
  Sliders,
  Activity,
  CheckCircle2,
  Cpu,
  Wifi,
  BarChart3,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Layers,
  ArrowDownToLine,
  Shield,
  Play,
  Check,
} from 'lucide-react';
import {
  opusCodec,
  OpusCompressionConfig,
  OpusCompressionStats,
  OPUS_BITRATE_PRESETS,
  OpusBitrateKbps,
  OpusApplicationMode,
  OpusFrameSizeMs,
} from '../services/opusCodec';
import { audioEngine } from '../services/audioEngine';

interface OpusCodecHUDProps {
  latestStats?: OpusCompressionStats | null;
  className?: string;
  isCompact?: boolean;
}

export const OpusCodecHUD: React.FC<OpusCodecHUDProps> = ({
  latestStats,
  className = '',
  isCompact = false,
}) => {
  const [config, setConfig] = useState<OpusCompressionConfig>(opusCodec.getConfig());
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [activeTab, setActiveTab] = useState<'presets' | 'inspector' | 'advanced'>('presets');
  const [sampleTestStats, setSampleTestStats] = useState<OpusCompressionStats | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const unsubscribe = opusCodec.subscribe((updated) => {
      setConfig(updated);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleEnabled = (enabled: boolean) => {
    audioEngine.triggerHaptic(40);
    opusCodec.updateConfig({ enabled });
  };

  const handleSelectBitrate = (bitrateKbps: OpusBitrateKbps) => {
    audioEngine.triggerHaptic(30);
    opusCodec.updateConfig({ bitrateKbps });
  };

  const handleSelectApplication = (application: OpusApplicationMode) => {
    audioEngine.triggerHaptic(30);
    opusCodec.updateConfig({ application });
  };

  const handleSelectFrameSize = (frameSizeMs: OpusFrameSizeMs) => {
    audioEngine.triggerHaptic(30);
    opusCodec.updateConfig({ frameSizeMs });
  };

  const handleRunSampleCompressionTest = async () => {
    setIsTesting(true);
    audioEngine.triggerHaptic(50);

    // Create a 3-second mock audio buffer payload (approx 144 KB uncompressed 24kHz 16-bit PCM)
    const mockAudioBase64 = 'data:audio/wav;base64,' + 'A'.repeat(120000);
    const result = await opusCodec.compressAudioPayload(mockAudioBase64, config);

    setTimeout(() => {
      setSampleTestStats(result.stats);
      setIsTesting(false);
    }, 200);
  };

  const statsToDisplay = sampleTestStats || latestStats;

  // Active bitrate preset
  const activePreset = OPUS_BITRATE_PRESETS.find((p) => p.bitrateKbps === config.bitrateKbps) || OPUS_BITRATE_PRESETS[2];

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${
        config.enabled
          ? 'bg-slate-900/90 border-emerald-500/40 text-slate-100 dark:bg-slate-900/90'
          : 'bg-slate-900/60 border-slate-700/60 text-slate-300'
      } ${className}`}
    >
      {/* Header bar */}
      <div className="p-3 sm:p-4 flex items-center justify-between gap-3 bg-slate-950/40 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              config.enabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm tracking-wide text-white flex items-center gap-1.5">
                Opus Audio Codec Pipeline
              </span>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                  config.enabled
                    ? activePreset.badgeColor
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {config.enabled ? `${config.bitrateKbps} kbps ${config.application.toUpperCase()}` : 'DISABLED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              {config.enabled
                ? `Low-latency transmission filter • ${activePreset.useCase}`
                : 'Passthrough raw uncompressed audio payload'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Master Enable Toggle */}
          <button
            type="button"
            onClick={() => handleToggleEnabled(!config.enabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border shadow-sm ${
              config.enabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                config.enabled ? 'bg-white animate-ping' : 'bg-slate-500'
              }`}
            />
            {config.enabled ? 'Opus ON' : 'Opus OFF'}
          </button>

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-colors"
            title={isExpanded ? 'Collapse HUD' : 'Expand Opus Controls'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls & Telemetry Dashboard */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-4 text-xs">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Bitrate Presets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inspector')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'inspector'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Packet Inspector
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'advanced'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Encoder Modes
            </button>
          </div>

          {/* TAB 1: Bitrate Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-slate-400">
                Select target bitrate for mesh transmission. Lower bitrates maximize mesh range and withstand weak signals.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OPUS_BITRATE_PRESETS.map((preset) => {
                  const isSelected = config.bitrateKbps === preset.bitrateKbps;
                  return (
                    <button
                      key={preset.bitrateKbps}
                      type="button"
                      onClick={() => handleSelectBitrate(preset.bitrateKbps)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-md'
                          : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold flex items-center gap-1.5 text-slate-100">
                          {preset.label}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Use case:</span>
                        <span className="font-mono text-emerald-400">{preset.useCase}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Packet Telemetry Inspector */}
          {activeTab === 'inspector' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Live Audio Compression Telemetry
                </span>
                <button
                  type="button"
                  onClick={handleRunSampleCompressionTest}
                  disabled={isTesting}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 transition-all"
                >
                  <Play className="w-3 h-3" />
                  {isTesting ? 'Testing...' : 'Test Encoder Sample'}
                </button>
              </div>

              {statsToDisplay ? (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                  {/* Bandwidth Savings Gauge */}
                  <div>
                    <div className="flex items-center justify-between text-slate-300 mb-1">
                      <span>Bandwidth Saved</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {statsToDisplay.savingsPercent}% Reduction
                      </span>
                    </div>

                    {/* Progress visual bar */}
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 flex">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${Math.max(8, statsToDisplay.savingsPercent)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Original Size</div>
                      <div className="font-mono font-semibold text-slate-200 mt-0.5">
                        {formatBytes(statsToDisplay.originalSizeBytes)}
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Opus Payload</div>
                      <div className="font-mono font-semibold text-emerald-400 mt-0.5">
                        {formatBytes(statsToDisplay.compressedSizeBytes)}
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Encoder Latency</div>
                      <div className="font-mono font-semibold text-amber-400 mt-0.5">
                        ~{statsToDisplay.compressionLatencyMs} ms
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Packets / Frame</div>
                      <div className="font-mono font-semibold text-blue-400 mt-0.5">
                        {statsToDisplay.packetsCount} pkts ({config.frameSizeMs}ms)
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center text-slate-400">
                  <Info className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                  No audio packets transmitted yet in this session. Tap "Test Encoder Sample" to run an immediate Opus benchmark.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Advanced Encoder Options */}
          {activeTab === 'advanced' && (
            <div className="space-y-3">
              {/* Application Profile */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Opus Sub-band Profile
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['voip', 'audio', 'low-delay'] as OpusApplicationMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleSelectApplication(mode)}
                      className={`py-2 px-2 rounded-xl border text-center font-mono font-semibold capitalize transition-all ${
                        config.application === mode
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {mode === 'voip' ? 'VoIP Speech' : mode === 'audio' ? 'Audio HD' : 'Low Delay'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Size */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Packet Frame Framing Size
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([10, 20, 40, 60] as OpusFrameSizeMs[]).map((ms) => (
                    <button
                      key={ms}
                      type="button"
                      onClick={() => handleSelectFrameSize(ms)}
                      className={`py-1.5 px-2 rounded-xl border text-center font-mono text-xs transition-all ${
                        config.frameSizeMs === ms
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {ms} ms
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

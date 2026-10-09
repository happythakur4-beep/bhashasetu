import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import {
  Radio,
  ExternalLink,
  Signal,
  MapPin,
  Sparkles,
  Play,
  CloudRain,
  Mountain,
  Building2,
  Wifi,
  Activity,
} from 'lucide-react';
import { MeshNode, ChannelNumber } from '../types';
import { meshNetwork } from '../services/meshNetwork';
import { audioEngine } from '../services/audioEngine';
import { SUPPORTED_LANGUAGES } from '../services/languageRegistry';
import { useTheme } from '../context/ThemeContext';

const D3Sparkline: React.FC<{ data: { time: number; value: number }[]; isDark: boolean; isStale: boolean }> = ({ data, isDark, isStale }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 280;
    const height = 36;
    const margin = { top: 3, right: 3, bottom: 3, left: 3 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const now = Date.now();
    const minTime = now - 60000;
    const maxTime = now;

    const xScale = d3.scaleLinear()
      .domain([minTime, maxTime])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([-100, -35])
      .range([innerHeight, 0]);

    if (data && data.length > 0) {
      const line = d3.line<{ time: number; value: number }>()
        .x(d => xScale(d.time))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

      const area = d3.area<{ time: number; value: number }>()
        .x(d => xScale(d.time))
        .y0(innerHeight)
        .y1(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

      const strokeColor = isStale ? '#f59e0b' : (isDark ? '#34d399' : '#9333ea');
      const fillColor = isStale ? 'rgba(245, 158, 11, 0.15)' : (isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(147, 51, 234, 0.15)');

      g.append('path')
        .datum(data)
        .attr('fill', fillColor)
        .attr('d', area);

      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1.8)
        .attr('d', line);
    }
  }, [data, isDark, isStale]);

  return (
    <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-zinc-700/30">
      <span className={`text-[10px] font-mono font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
        60s Signal Fluctuation (RSSI):
      </span>
      <div className="overflow-hidden rounded-md bg-zinc-950/40 px-1 border border-zinc-800/50">
        <svg ref={svgRef} width={280} height={36} className="overflow-visible" />
      </div>
    </div>
  );
};

interface MeshRadarViewProps {
  currentChannel: ChannelNumber;
  onSelectChannel: (channel: ChannelNumber) => void;
  onSelectPeerToTalk: (node: MeshNode) => void;
}

export const MeshRadarView: React.FC<MeshRadarViewProps> = ({
  currentChannel,
  onSelectChannel,
  onSelectPeerToTalk,
}) => {
  const { isDark } = useTheme();
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [localNode, setLocalNode] = useState<MeshNode>(meshNetwork.getLocalNode());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [callsign, setCallsign] = useState(localNode.name);
  const [homeState, setHomeState] = useState(localNode.state);
  const [simulatedFeedback, setSimulatedFeedback] = useState<string | null>(null);

  // Environmental Signal Propagation & Fluctuation Simulator state
  const [environment, setEnvironment] = useState<'open' | 'mountain' | 'urban' | 'storm'>('mountain');
  const [signalTelemetry, setSignalTelemetry] = useState<Record<string, { rssi: number; snr: number; quality: number; jitter: string }>>({});
  const [signalHistory, setSignalHistory] = useState<Record<string, { time: number; value: number }[]>>({});

  useEffect(() => {
    const unsub = meshNetwork.onNodesChange((list) => {
      setNodes(list);
    });
    return () => unsub();
  }, []);

  // Simulate fluctuating signal based on distance and environment factors
  useEffect(() => {
    const updateSignalTelemetry = () => {
      const telemetry: Record<string, { rssi: number; snr: number; quality: number; jitter: string }> = {};
      const now = Date.now();
      const newHistory: Record<string, { time: number; value: number }[]> = { ...signalHistory };

      nodes.forEach((node) => {
        if (node.isLocalUser) return;
        const dist = node.distanceMeters || 100;
        
        // Environment path loss attenuation multiplier
        let envLoss = 1.0;
        let noiseFloor = -105;
        if (environment === 'mountain') envLoss = 1.35;
        else if (environment === 'urban') envLoss = 1.65;
        else if (environment === 'storm') envLoss = 1.95;
        else if (environment === 'open') envLoss = 0.85;

        // Distance attenuation + micro-jitter
        const randomJitter = (Math.random() * 6) - 3; // -3 to +3 dBm
        const baseRssi = -38 - Math.floor((dist / 14) * envLoss) + randomJitter;
        const clampedRssi = Math.max(-98, Math.min(-42, Math.round(baseRssi)));
        
        // Signal-to-Noise Ratio (SNR in dB)
        const snr = Math.max(3, Math.round((clampedRssi - noiseFloor) / 3.2));
        
        // Signal Quality percentage
        const quality = Math.max(12, Math.min(100, Math.round(((clampedRssi + 95) / 53) * 100)));
        
        const jitters = ['±0.9dB', '±1.8dB', '±2.7dB', '±0.5dB', '±3.2dB'];
        const jitter = jitters[Math.floor(Math.random() * jitters.length)];

        telemetry[node.id] = { rssi: clampedRssi, snr, quality, jitter };

        const existingPoints = newHistory[node.id] || [];
        const updatedPoints = [...existingPoints, { time: now, value: clampedRssi }].filter(p => now - p.time <= 60000);
        newHistory[node.id] = updatedPoints;
      });

      setSignalTelemetry(telemetry);
      setSignalHistory(newHistory);
    };

    updateSignalTelemetry();
    const interval = setInterval(updateSignalTelemetry, 2200);
    return () => clearInterval(interval);
  }, [nodes, environment]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    meshNetwork.updateLocalNode({
      name: callsign.trim() || localNode.name,
      state: homeState.trim() || localNode.state,
    });
    setLocalNode(meshNetwork.getLocalNode());
    setIsEditingProfile(false);
  };

  // Open second tab to test multi-node mesh communication live
  const handleOpenSecondWindow = () => {
    window.open(window.location.href, '_blank');
  };

  // Trigger simulated incoming peer radio transmission for testing cross-state dialects
  const handleSimulateTransmission = (scenario: 'mandali' | 'odia' | 'hindi' | 'sos') => {
    audioEngine.playSquelchStatic(80);

    if (scenario === 'mandali') {
      meshNetwork.triggerSimulatedPeerTransmission({
        nodeId: 'node_hp_mandi_01',
        originalText: 'तुसां जो नमस्कार! कुथु जांदे? मां जो रस्ता दस्सा।',
        translatedText: 'Greetings to you! Where are you going? Please show me the road.',
        phoneticText: 'Tusan jo namaskar! Kuthu jaande? Maan jo rasta dassa.',
        sourceLang: 'mjl',
        targetLang: 'en',
      });
      setSimulatedFeedback('Simulated transmission received from HP-Mandi-Relief in Mandali (माण्डली)');
    } else if (scenario === 'odia') {
      meshNetwork.triggerSimulatedPeerTransmission({
        nodeId: 'node_od_puri_02',
        originalText: 'ନମସ୍କାର! ନିକଟତମ ବସ ଷ୍ଟାଣ୍ଡ କିମ୍ବା ରେଳ ଷ୍ଟେସନ କେତେ ଦୂର?',
        translatedText: 'Greetings! How far is the nearest bus stand or railway station?',
        phoneticText: 'Namaskara! Nikatatama bus stand kimba railway station kete doora?',
        sourceLang: 'or',
        targetLang: 'en',
      });
      setSimulatedFeedback('Simulated transmission received from OD-Coastal-Unit in Odia (ଓଡ଼ିଆ)');
    } else if (scenario === 'hindi') {
      meshNetwork.triggerSimulatedPeerTransmission({
        nodeId: 'node_dl_highway_03',
        originalText: 'हाईवे पर आगे जाम है, कृपया दूसरा रास्ता लें।',
        translatedText: 'Heavy jam ahead on the highway, please take the alternate route.',
        phoneticText: 'Highway par aage jam hai, kripya doosra rasta lein.',
        sourceLang: 'hi',
        targetLang: 'en',
      });
      setSimulatedFeedback('Simulated transmission received from DL-Highway in Hindi (हिन्दी)');
    } else if (scenario === 'sos') {
      audioEngine.playEmergencyAlert();
      meshNetwork.triggerSimulatedPeerTransmission({
        nodeId: 'node_sos_emergency_04',
        originalText: 'यहाँ हाईवे पर एक दुर्घटना हो गई है! तुरंत एम्बुलेंस भेजें।',
        translatedText: 'An accident has occurred on the highway! Dispatch ambulance immediately.',
        phoneticText: 'Yahan highway par ek durghatna ho gayi hai! Turant ambulance bhejein.',
        sourceLang: 'hi',
        targetLang: 'en',
        isEmergency: true,
      });
      setSimulatedFeedback('PRIORITY SOS EMERGENCY broadcast received across all channels!');
    }

    setTimeout(() => setSimulatedFeedback(null), 4000);
  };

  return (
    <div className="flex-1 max-w-xl mx-auto w-full px-3 py-2 space-y-3 overflow-y-auto z-10 relative">
      {/* Radar Header & Multi-Window Test Banner */}
      <div
        className={
          isDark
            ? 'bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 shadow-lg'
            : 'neo-glass-panel rounded-3xl p-3.5 border border-white/95 text-slate-800'
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <span className="flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isDark ? 'bg-emerald-400' : 'bg-purple-500'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isDark ? 'bg-emerald-500' : 'bg-purple-600'
                  }`}
                ></span>
              </span>
            </div>
            <div>
              <h3
                className={`text-sm font-bold font-mono flex items-center gap-1.5 ${
                  isDark ? 'text-zinc-100' : 'text-slate-900'
                }`}
              >
                <span>LOCAL MESH RADAR</span>
                <span className={isDark ? 'text-zinc-600' : 'text-slate-300'}>·</span>
                <span
                  className={`text-xs font-normal ${
                    isDark ? 'text-emerald-400' : 'text-purple-600 font-semibold'
                  }`}
                >
                  {nodes.length} Nodes Discovered
                </span>
              </h3>
              <p
                className={`text-[11px] font-mono ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}
              >
                Peer-to-peer offline radio routing over local airwaves
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenSecondWindow}
            className={
              isDark
                ? 'flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900 transition-colors text-xs font-mono font-bold'
                : 'flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl neo-gel-button text-purple-700 hover:text-purple-800 transition-all text-xs font-mono font-bold shadow-xs'
            }
            title="Open another window on this machine to test live bi-directional P2P talk!"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open 2nd Tab</span>
          </button>
        </div>

        {/* Tactical Simulated Radar Visual Screen */}
        <div
          className={
            isDark
              ? 'mt-3 relative w-full h-36 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center'
              : 'mt-3 relative w-full h-36 bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-pink-50/80 rounded-2xl border border-white/90 shadow-inner overflow-hidden flex items-center justify-center'
          }
        >
          {/* Concentric distance rings */}
          <div
            className={`absolute w-24 h-24 rounded-full border ${
              isDark ? 'border-emerald-900/50' : 'border-purple-300/40'
            }`}
          />
          <div
            className={`absolute w-36 h-36 rounded-full border ${
              isDark ? 'border-emerald-900/40' : 'border-blue-300/35'
            }`}
          />
          <div
            className={`absolute w-48 h-48 rounded-full border ${
              isDark ? 'border-emerald-900/25' : 'border-pink-300/30'
            }`}
          />
          <div
            className={`absolute w-full h-[1px] ${
              isDark ? 'bg-emerald-950' : 'bg-purple-200/50'
            }`}
          />
          <div
            className={`absolute h-full w-[1px] ${
              isDark ? 'bg-emerald-950' : 'bg-purple-200/50'
            }`}
          />

          {/* Sweeping radar scanner line */}
          <div
            className={`absolute top-1/2 left-1/2 w-28 h-[1px] origin-left animate-spin ${
              isDark
                ? 'bg-gradient-to-r from-emerald-500 to-transparent'
                : 'bg-gradient-to-r from-purple-500 to-transparent'
            }`}
            style={{ animationDuration: '4s' }}
          />

          {/* Center User Node */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-3.5 h-3.5 rounded-full ring-4 ${
                isDark
                  ? 'bg-emerald-400 ring-emerald-500/30'
                  : 'bg-purple-600 ring-purple-400/40'
              }`}
            />
            <span
              className={`text-[9px] font-mono font-bold mt-1 ${
                isDark ? 'text-emerald-300' : 'text-purple-800'
              }`}
            >
              YOU ({localNode.name.split('-')[0]})
            </span>
          </div>

          {/* Plotted Peer Nodes on Radar */}
          <div className="absolute top-5 left-10 flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-500/40 animate-pulse" />
            <span
              className={`text-[8px] font-mono font-semibold ${
                isDark ? 'text-amber-300' : 'text-amber-700'
              }`}
            >
              HP-Mandi
            </span>
          </div>

          <div className="absolute bottom-6 right-12 flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-sky-500/40 animate-pulse" />
            <span
              className={`text-[8px] font-mono font-semibold ${
                isDark ? 'text-sky-300' : 'text-blue-700'
              }`}
            >
              OD-Puri
            </span>
          </div>

          <div className="absolute top-8 right-16 flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400 ring-2 ring-red-500/40 animate-pulse" />
            <span
              className={`text-[8px] font-mono font-semibold ${
                isDark ? 'text-red-300' : 'text-rose-700'
              }`}
            >
              SOS-Post
            </span>
          </div>
        </div>
      </div>

      {/* Environmental Signal Propagation & Fluctuation Simulator Card */}
      <div
        className={
          isDark
            ? 'bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 space-y-2'
            : 'neo-glass-panel rounded-3xl p-3.5 space-y-2.5 border border-white/95 text-slate-800'
        }
      >
        <div
          className={`flex items-center justify-between text-xs font-mono font-bold ${
            isDark ? 'text-zinc-300' : 'text-slate-800'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Activity className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-purple-600'}`} />
            <span>ENVIRONMENTAL SIGNAL PROPAGATION</span>
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
              isDark ? 'bg-zinc-800 text-emerald-400' : 'bg-purple-100 text-purple-700'
            }`}
          >
            Live RSSI Jitter Active
          </span>
        </div>

        <p className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Select terrain and weather factors to simulate fluctuating mesh connectivity, attenuation, and SNR across peer nodes:
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {[
            { id: 'open', label: 'Open Valley / Hwy', icon: Wifi, desc: 'Clear line of sight · Stable' },
            { id: 'mountain', label: 'Mountain Ridge', icon: Mountain, desc: 'Terrain attenuation · Moderate' },
            { id: 'urban', label: 'Urban Concrete', icon: Building2, desc: 'Multipath fading · Jittery' },
            { id: 'storm', label: 'Monsoon Storm', icon: CloudRain, desc: 'Atmospheric noise · Low SNR' },
          ].map((env) => {
            const Icon = env.icon;
            const isSelected = environment === env.id;
            return (
              <button
                key={env.id}
                onClick={() => setEnvironment(env.id as any)}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-start space-x-2 ${
                  isSelected
                    ? isDark
                      ? 'bg-emerald-950/70 border-emerald-600 text-emerald-200 shadow-sm'
                      : 'bg-purple-100/90 border-purple-400 text-purple-900 shadow-sm'
                    : isDark
                    ? 'bg-zinc-850/70 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'bg-white/70 border-white text-slate-600 hover:bg-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? (isDark ? 'text-emerald-400' : 'text-purple-600') : (isDark ? 'text-zinc-500' : 'text-slate-400')}`} />
                <div>
                  <div className="font-bold">{env.label}</div>
                  <div className={`text-[10px] ${isSelected ? (isDark ? 'text-emerald-300/80' : 'text-purple-700/80') : (isDark ? 'text-zinc-500' : 'text-slate-400')}`}>
                    {env.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Simulation & Dialect Stress-Test Controller */}
      <div
        className={
          isDark
            ? 'bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3'
            : 'neo-glass-panel rounded-3xl p-3.5 border border-white/95 text-slate-800'
        }
      >
        <div
          className={`flex items-center justify-between text-xs font-mono font-bold mb-2 ${
            isDark ? 'text-zinc-300' : 'text-slate-800'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-purple-600'}`} />
            <span>INTERSTATE PEER TRANSMISSION SIMULATOR</span>
          </span>
          <span
            className={`text-[10px] uppercase font-normal ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}
          >
            Demo Chatter
          </span>
        </div>

        {simulatedFeedback && (
          <div
            className={`mb-2 p-2.5 rounded-2xl text-xs font-mono animate-in fade-in ${
              isDark
                ? 'bg-emerald-950/80 border border-emerald-600/60 text-emerald-200'
                : 'bg-purple-100/90 border border-purple-300 text-purple-900 shadow-xs'
            }`}
          >
            {simulatedFeedback}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <button
            onClick={() => handleSimulateTransmission('mandali')}
            className={
              isDark
                ? 'p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-left transition-colors flex items-start space-x-2'
                : 'p-2.5 rounded-2xl neo-gel-button text-left transition-all hover:scale-[1.01] flex items-start space-x-2'
            }
          >
            <Play className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            <div>
              <div className={`font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>Himachal Mandi</div>
              <div className={`text-[10px] font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Mandali Dialect</div>
              <div className={`text-[10px] line-clamp-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>&quot;तुसां कुथु जांदे?&quot;</div>
            </div>
          </button>

          <button
            onClick={() => handleSimulateTransmission('odia')}
            className={
              isDark
                ? 'p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-left transition-colors flex items-start space-x-2'
                : 'p-2.5 rounded-2xl neo-gel-button text-left transition-all hover:scale-[1.01] flex items-start space-x-2'
            }
          >
            <Play className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? 'text-sky-400' : 'text-blue-500'}`} />
            <div>
              <div className={`font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>Odisha Coastal</div>
              <div className={`text-[10px] font-semibold ${isDark ? 'text-sky-400' : 'text-blue-600'}`}>Odia Language</div>
              <div className={`text-[10px] line-clamp-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>&quot;ନମସ୍କାର, କେମିତି ଅଛନ୍ତି?&quot;</div>
            </div>
          </button>

          <button
            onClick={() => handleSimulateTransmission('hindi')}
            className={
              isDark
                ? 'p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-left transition-colors flex items-start space-x-2'
                : 'p-2.5 rounded-2xl neo-gel-button text-left transition-all hover:scale-[1.01] flex items-start space-x-2'
            }
          >
            <Play className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? 'text-emerald-400' : 'text-purple-500'}`} />
            <div>
              <div className={`font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>Delhi Highway</div>
              <div className={`text-[10px] font-semibold ${isDark ? 'text-emerald-400' : 'text-purple-600'}`}>Hindi Logistics</div>
              <div className={`text-[10px] line-clamp-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>&quot;आगे हाईवे जाम है&quot;</div>
            </div>
          </button>

          <button
            onClick={() => handleSimulateTransmission('sos')}
            className={
              isDark
                ? 'p-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-700/50 text-left transition-colors flex items-start space-x-2'
                : 'p-2.5 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-300 text-left transition-all hover:scale-[1.01] flex items-start space-x-2 shadow-xs'
            }
          >
            <Play className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <div className={`font-bold ${isDark ? 'text-red-200' : 'text-rose-800'}`}>Highway SOS</div>
              <div className={`text-[10px] font-semibold ${isDark ? 'text-red-400' : 'text-rose-600'}`}>Emergency Relief</div>
              <div className={`text-[10px] line-clamp-1 ${isDark ? 'text-red-300/70' : 'text-rose-600/80'}`}>&quot;दुर्घटना सहायता&quot;</div>
            </div>
          </button>
        </div>
      </div>

      {/* Discovered Peer Nodes List */}
      <div
        className={
          isDark
            ? 'bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 space-y-2'
            : 'neo-glass-panel rounded-3xl p-3.5 space-y-2.5 border border-white/95 text-slate-800'
        }
      >
        <div
          className={`flex items-center justify-between text-xs font-mono border-b pb-2 ${
            isDark ? 'text-zinc-400 border-zinc-800' : 'text-slate-500 border-slate-200/80 font-semibold'
          }`}
        >
          <span>DISCOVERED FIELD NODES ({nodes.length})</span>
          <span>SIGNAL / CHANNEL</span>
        </div>

        <div className="space-y-2">
          {nodes.map((node) => {
            const lang = SUPPORTED_LANGUAGES.find((l) => l.code === node.activeLanguage);
            const isLocal = node.id === localNode.id;

            const diffSec = isLocal ? 0 : Math.max(0, Math.floor((Date.now() - node.lastSeen) / 1000));
            let lastSeenText = 'Last seen: Just now';
            if (!isLocal) {
              if (diffSec >= 3600) {
                const hrs = Math.floor(diffSec / 3600);
                lastSeenText = `Last seen: ${hrs}h ago`;
              } else if (diffSec >= 60) {
                const mins = Math.floor(diffSec / 60);
                lastSeenText = `Last seen: ${mins}m ago`;
              } else if (diffSec >= 15) {
                lastSeenText = `Last seen: ${diffSec}s ago`;
              }
            } else {
              lastSeenText = 'Status: Active (Live)';
            }

            const isStale = !isLocal && diffSec > 180; // > 3 mins is stale
            const estimatedLatencyMs = Math.round(15 + Math.abs(node.signalDbm) * 0.5 + (node.distanceMeters || 100) * 0.03);

            return (
              <div
                key={node.id}
                className={
                  isDark
                    ? `p-3 rounded-xl border flex flex-col transition-colors ${
                        isStale
                          ? 'bg-amber-950/20 border-amber-800/40 opacity-85'
                          : isLocal
                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-100'
                          : 'bg-zinc-850/80 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                      }`
                    : `p-3 rounded-2xl border flex flex-col transition-all shadow-xs ${
                        isStale
                          ? 'bg-amber-50/70 border-amber-200 opacity-95'
                          : isLocal
                          ? 'bg-gradient-to-r from-blue-50/90 to-purple-50/80 border-purple-300 text-slate-800'
                          : 'neo-glass-card hover:bg-white/80 border-white/95 text-slate-800'
                      }`
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-2.5">
                    <div
                      className={`p-2 rounded-xl mt-0.5 relative ${
                        isLocal
                          ? isDark
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'bg-purple-100 text-purple-700'
                          : isStale
                          ? isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Radio className="w-4 h-4" />
                      <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ${isDark ? 'ring-zinc-900' : 'ring-white'} ${isStale ? 'bg-amber-500 animate-pulse' : isLocal ? 'bg-emerald-500' : 'bg-emerald-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                          {node.name}
                        </span>
                        {isLocal && (
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                              isDark
                                ? 'bg-emerald-500 text-black'
                                : 'bg-purple-600 text-white shadow-xs'
                            }`}
                          >
                            This Device
                          </span>
                        )}
                        {isStale && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md font-bold uppercase ${
                              isDark
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            Stale Link
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-xs font-mono mt-0.5 flex items-center gap-1 ${
                          isDark ? 'text-zinc-400' : 'text-slate-500'
                        }`}
                      >
                        <MapPin className={`w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                        <span>{node.state}</span>
                        <span>·</span>
                        <span className={`font-semibold ${isDark ? 'text-amber-400' : 'text-purple-600'}`}>
                          {lang?.name}
                        </span>
                      </div>
                      {/* Last seen & Latency Label */}
                      <div
                        className={`text-[10px] font-mono mt-1 flex items-center gap-1.5 ${
                          isStale
                            ? isDark ? 'text-amber-400 font-semibold' : 'text-amber-700 font-semibold'
                            : isDark ? 'text-zinc-400' : 'text-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${isStale ? 'bg-amber-500' : 'bg-emerald-400'}`} />
                          <span>{lastSeenText}</span>
                        </span>
                        <span>·</span>
                        <span className="opacity-90">~{estimatedLatencyMs}ms latency</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    {(() => {
                      const tele = signalTelemetry[node.id] || { rssi: node.signalDbm, snr: 12, quality: 75, jitter: '±1.5dB' };
                      const bars = tele.quality > 75 ? 4 : tele.quality > 50 ? 3 : tele.quality > 25 ? 2 : 1;
                      return (
                        <>
                          <div
                            className={`text-xs font-bold flex items-center justify-end gap-1 ${
                              isDark ? 'text-zinc-300' : 'text-slate-700'
                            }`}
                          >
                            <div className="flex items-end space-x-0.5 h-3">
                              <span className={`w-1 rounded-full ${bars >= 1 ? (isDark ? 'text-emerald-400 bg-emerald-400' : 'bg-purple-600') : 'bg-zinc-600'} h-1.5`} />
                              <span className={`w-1 rounded-full ${bars >= 2 ? (isDark ? 'text-emerald-400 bg-emerald-400' : 'bg-purple-600') : 'bg-zinc-600'} h-2`} />
                              <span className={`w-1 rounded-full ${bars >= 3 ? (isDark ? 'text-emerald-400 bg-emerald-400' : 'bg-purple-600') : 'bg-zinc-600'} h-2.5`} />
                              <span className={`w-1 rounded-full ${bars >= 4 ? (isDark ? 'text-emerald-400 bg-emerald-400' : 'bg-purple-600') : 'bg-zinc-600'} h-3`} />
                            </div>
                            <span>{tele.rssi} dBm</span>
                          </div>
                          <div className={`text-[10px] mt-0.5 flex items-center justify-end gap-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            <span>SNR:{tele.snr}dB</span>
                            <span>·</span>
                            <span className={tele.quality < 40 ? 'text-amber-500 animate-pulse font-bold' : ''}>{tele.quality}% ({tele.jitter})</span>
                          </div>
                        </>
                      );
                    })()}
                    <div className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                      CH-{node.channel} · ~{node.distanceMeters || 120}m
                    </div>

                    {!isLocal && (
                      <button
                        onClick={() => onSelectPeerToTalk(node)}
                        className={
                          isDark
                            ? 'mt-1.5 px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-200 border border-zinc-700 font-bold'
                            : 'mt-1.5 px-2.5 py-0.5 rounded-full neo-gel-button text-[10px] text-purple-700 font-bold hover:shadow-xs'
                        }
                      >
                        Hail Unit
                      </button>
                    )}
                  </div>
                </div>

                {/* D3 Sparkline Chart */}
                <D3Sparkline data={signalHistory[node.id] || []} isDark={isDark} isStale={isStale} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Local Node Profile & Callsign Editor */}
      <div
        className={
          isDark
            ? 'bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3'
            : 'neo-glass-panel rounded-3xl p-3.5 border border-white/95 text-slate-800'
        }
      >
        <div
          className={`flex items-center justify-between text-xs font-mono mb-2 ${
            isDark ? 'text-zinc-400' : 'text-slate-500 font-semibold'
          }`}
        >
          <span>LOCAL NODE CALLSIGN</span>
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className={`underline text-xs font-medium ${
              isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-purple-600 hover:text-purple-800'
            }`}
          >
            {isEditingProfile ? 'Cancel' : 'Edit Unit Callsign'}
          </button>
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-2 font-mono text-xs">
            <div>
              <label className={`text-[10px] block mb-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                Unit Name / Callsign:
              </label>
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                className={
                  isDark
                    ? 'w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-zinc-100'
                    : 'w-full neo-glass-card rounded-2xl p-2.5 text-slate-800 border border-white/90 focus:outline-none focus:ring-2 focus:ring-purple-400'
                }
              />
            </div>
            <div>
              <label className={`text-[10px] block mb-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                Assigned State / Region:
              </label>
              <input
                type="text"
                value={homeState}
                onChange={(e) => setHomeState(e.target.value)}
                className={
                  isDark
                    ? 'w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-zinc-100'
                    : 'w-full neo-glass-card rounded-2xl p-2.5 text-slate-800 border border-white/90 focus:outline-none focus:ring-2 focus:ring-purple-400'
                }
              />
            </div>
            <button
              type="submit"
              className={
                isDark
                  ? 'w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold font-mono text-xs'
                  : 'w-full py-2.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-95 text-white rounded-2xl font-bold font-mono text-xs shadow-md'
              }
            >
              Save Mesh Identity
            </button>
          </form>
        ) : (
          <div
            className={
              isDark
                ? 'p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-between font-mono text-xs'
                : 'p-3 bg-white/70 rounded-2xl border border-white/90 flex items-center justify-between font-mono text-xs shadow-xs'
            }
          >
            <div>
              <span className={`font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                {localNode.name}
              </span>
              <span className={`block text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                {localNode.state}
              </span>
            </div>
            <span
              className={`text-[10px] font-bold ${
                isDark ? 'text-emerald-400' : 'text-purple-600'
              }`}
            >
              READY TO BROADCAST
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

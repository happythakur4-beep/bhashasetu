import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Signal,
  Zap,
  MapPin,
  Activity,
  Battery,
  ShieldAlert,
  Compass,
  Maximize2,
  RefreshCw,
  SlidersHorizontal,
  Volume2,
  Wifi,
  X,
  Play,
  Layers,
  CircleDot,
  Share2,
} from 'lucide-react';
import {
  meshTopologyService,
  ExtendedTacticalNode,
  HopVector,
  RadarRangeMeters,
  MapDisplayMode,
} from '../services/meshTopologyService';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../services/audioEngine';

interface TacticalMeshMapProps {
  onSelectPeerToTalk?: (node: ExtendedTacticalNode) => void;
  className?: string;
}

export const TacticalMeshMap: React.FC<TacticalMeshMapProps> = ({
  onSelectPeerToTalk,
  className = '',
}) => {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [nodes, setNodes] = useState<ExtendedTacticalNode[]>([]);
  const [hopVectors, setHopVectors] = useState<HopVector[]>([]);
  const [rangeMeters, setRangeMeters] = useState<RadarRangeMeters>(100);
  const [displayMode, setDisplayMode] = useState<MapDisplayMode>('polar_radar');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [lastPingCount, setLastPingCount] = useState<number | null>(null);

  // Force-directed layout physics nodes state
  const physicsNodesRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());

  // Subscribe to mesh topology updates
  useEffect(() => {
    const unsub = meshTopologyService.subscribe((updatedNodes, updatedVectors) => {
      setNodes(updatedNodes);
      setHopVectors(updatedVectors);
    });
    setRangeMeters(meshTopologyService.getRangeMeters());
    setDisplayMode(meshTopologyService.getDisplayMode());
    return () => unsub();
  }, []);

  // Selected node object
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // Render loop using HTML5 2D Canvas with 60fps sweep animation & hop particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let sweepAngleRad = 0;
    let particleOffset = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(centerX, centerY) - 24;

      // 1. Clear canvas background
      ctx.clearRect(0, 0, width, height);

      // Dark space obsidian vs light tactical theme colors
      const bgFill = isDark ? '#090d16' : '#f8fafc';
      const gridStroke = isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(203, 213, 225, 0.8)';
      const ringTextFill = isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.8)';
      const selfColor = isDark ? '#10b981' : '#7c3aed';
      const peerColor = isDark ? '#06b6d4' : '#2563eb';
      const warningColor = '#f59e0b';
      const emergencyColor = '#ef4444';

      // Background rect
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Polar Radar or Force Topology Mode
      if (displayMode === 'polar_radar') {
        // --- POLAR RADAR CANVAS RENDER ---

        // Concentric Range Rings (25%, 50%, 75%, 100%)
        const ringSteps = [0.25, 0.5, 0.75, 1.0];
        ringSteps.forEach((step) => {
          const r = maxRadius * step;
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.strokeStyle = gridStroke;
          ctx.lineWidth = step === 1.0 ? 1.5 : 1;
          ctx.setLineDash(step === 1.0 ? [] : [4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Labeled distance coordinate
          const distLabel = `${Math.round(rangeMeters * step)}m`;
          ctx.fillStyle = ringTextFill;
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText(distLabel, centerX + 6, centerY - r + 12);
        });

        // Cardinal Grid Crosshairs (N, S, E, W axes)
        ctx.beginPath();
        ctx.moveTo(centerX - maxRadius, centerY);
        ctx.lineTo(centerX + maxRadius, centerY);
        ctx.moveTo(centerX, centerY - maxRadius);
        ctx.lineTo(centerX, centerY + maxRadius);
        ctx.strokeStyle = gridStroke;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cardinal Heading Labels
        ctx.fillStyle = ringTextFill;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N 000°', centerX, centerY - maxRadius - 10);
        ctx.fillText('S 180°', centerX, centerY + maxRadius + 10);
        ctx.fillText('E 090°', centerX + maxRadius + 14, centerY);
        ctx.fillText('W 270°', centerX - maxRadius - 14, centerY);

        // Rotating Sweeping Radar Ray
        sweepAngleRad = (sweepAngleRad + 0.02) % (Math.PI * 2);

        // Sweep cone arc shadow
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, maxRadius, sweepAngleRad - 0.35, sweepAngleRad);
        ctx.closePath();
        const sweepGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          maxRadius
        );
        sweepGrad.addColorStop(
          0,
          isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(124, 58, 237, 0.2)'
        );
        sweepGrad.addColorStop(
          1,
          isDark ? 'rgba(6, 182, 212, 0.02)' : 'rgba(124, 58, 237, 0.02)'
        );
        ctx.fillStyle = sweepGrad;
        ctx.fill();

        // Leading Sweep Line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + maxRadius * Math.cos(sweepAngleRad),
          centerY + maxRadius * Math.sin(sweepAngleRad)
        );
        ctx.strokeStyle = isDark ? 'rgba(6, 182, 212, 0.85)' : 'rgba(124, 58, 237, 0.85)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Draw Multi-Hop Vector Lines
        hopVectors.forEach((vector) => {
          const fromNode = nodes.find((n) => n.id === vector.fromNodeId);
          const toNode = nodes.find((n) => n.id === vector.toNodeId);
          if (!fromNode || !toNode) return;

          const getPos = (n: ExtendedTacticalNode) => {
            if (n.isLocalUser) return { x: centerX, y: centerY };
            const angleRad = ((n.azimuthDeg - 90) * Math.PI) / 180;
            const normDist = Math.min(1.0, n.estimatedDistanceMeters / rangeMeters);
            const r = normDist * maxRadius;
            return {
              x: centerX + r * Math.cos(angleRad),
              y: centerY + r * Math.sin(angleRad),
            };
          };

          const p1 = getPos(fromNode);
          const p2 = getPos(toNode);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = isDark ? 'rgba(6, 182, 212, 0.4)' : 'rgba(124, 58, 237, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Animated pulse particle moving along vector
          const progress = (particleOffset % 100) / 100;
          const px = p1.x + (p2.x - p1.x) * progress;
          const py = p1.y + (p2.y - p1.y) * progress;

          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? '#38bdf8' : '#a855f7';
          ctx.fill();
        });

        // Draw Nodes
        nodes.forEach((node) => {
          let nx = centerX;
          let ny = centerY;

          if (!node.isLocalUser) {
            const angleRad = ((node.azimuthDeg - 90) * Math.PI) / 180;
            const normDist = Math.min(1.0, node.estimatedDistanceMeters / rangeMeters);
            const r = normDist * maxRadius;
            nx = centerX + r * Math.cos(angleRad);
            ny = centerY + r * Math.sin(angleRad);
          }

          const isSelected = selectedNodeId === node.id;

          // Outer selection or ping pulse ring
          if (isSelected || node.isPinging) {
            ctx.beginPath();
            ctx.arc(nx, ny, 16 + Math.sin(Date.now() / 150) * 4, 0, Math.PI * 2);
            ctx.strokeStyle = node.role === 'sos_beacon' ? emergencyColor : isDark ? '#38bdf8' : '#7c3aed';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Node Base Circle
          ctx.beginPath();
          ctx.arc(nx, ny, node.isLocalUser ? 9 : 7, 0, Math.PI * 2);
          if (node.isLocalUser) {
            ctx.fillStyle = selfColor;
          } else if (node.role === 'sos_beacon') {
            ctx.fillStyle = emergencyColor;
          } else if (node.role === 'repeater_relay') {
            ctx.fillStyle = warningColor;
          } else {
            ctx.fillStyle = peerColor;
          }
          ctx.fill();

          ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Node Callsign Label
          ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
          ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const labelText = node.isLocalUser ? 'YOU (LOCAL)' : node.name.split('-')[0];
          ctx.fillText(labelText, nx, ny + 10);

          // Node Distance / Telemetry Subtext
          if (!node.isLocalUser) {
            ctx.fillStyle = ringTextFill;
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText(`${node.estimatedDistanceMeters.toFixed(0)}m · ${node.signalDbm}dBm`, nx, ny + 22);
          }
        });
      } else {
        // --- FORCE-DIRECTED MESH TOPOLOGY CANVAS RENDER ---
        const physics = physicsNodesRef.current;

        // Initialize physics positions if missing
        nodes.forEach((node) => {
          if (!physics.has(node.id)) {
            const angle = Math.random() * Math.PI * 2;
            const dist = node.isLocalUser ? 0 : 60 + Math.random() * 80;
            physics.set(node.id, {
              x: centerX + Math.cos(angle) * dist,
              y: centerY + Math.sin(angle) * dist,
              vx: 0,
              vy: 0,
            });
          }
        });

        // Simple spring physics step
        nodes.forEach((n1) => {
          const p1 = physics.get(n1.id);
          if (!p1) return;

          if (n1.isLocalUser) {
            // Anchor local node at center
            p1.x = centerX;
            p1.y = centerY;
            return;
          }

          // Center attraction
          const dxCenter = centerX - p1.x;
          const dyCenter = centerY - p1.y;
          p1.vx += dxCenter * 0.002;
          p1.vy += dyCenter * 0.002;

          // Repulsion from other nodes
          nodes.forEach((n2) => {
            if (n1.id === n2.id) return;
            const p2 = physics.get(n2.id);
            if (!p2) return;
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distSq = dx * dx + dy * dy + 100;
            const force = 1200 / distSq;
            p1.vx += (dx / Math.sqrt(distSq)) * force;
            p1.vy += (dy / Math.sqrt(distSq)) * force;
          });

          // Apply velocity with damping
          p1.vx *= 0.82;
          p1.vy *= 0.82;
          p1.x += p1.vx;
          p1.y += p1.vy;

          // Bound within canvas
          p1.x = Math.max(30, Math.min(width - 30, p1.x));
          p1.y = Math.max(30, Math.min(height - 30, p1.y));
        });

        // Draw Hop Vector Mesh Links
        hopVectors.forEach((vector) => {
          const p1 = physics.get(vector.fromNodeId);
          const p2 = physics.get(vector.toNodeId);
          if (!p1 || !p2) return;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = isDark ? 'rgba(6, 182, 212, 0.5)' : 'rgba(124, 58, 237, 0.5)';
          ctx.lineWidth = Math.max(1, (vector.quality / 100) * 3);
          ctx.stroke();
        });

        // Draw Force Nodes
        nodes.forEach((node) => {
          const p = physics.get(node.id);
          if (!p) return;

          const isSelected = selectedNodeId === node.id;

          ctx.beginPath();
          ctx.arc(p.x, p.y, node.isLocalUser ? 10 : 8, 0, Math.PI * 2);
          ctx.fillStyle = node.isLocalUser
            ? selfColor
            : node.role === 'sos_beacon'
            ? emergencyColor
            : node.role === 'repeater_relay'
            ? warningColor
            : peerColor;
          ctx.fill();
          ctx.strokeStyle = isSelected ? (isDark ? '#38bdf8' : '#7c3aed') : isDark ? '#ffffff' : '#0f172a';
          ctx.lineWidth = isSelected ? 3 : 1.5;
          ctx.stroke();

          ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(node.name, p.x, p.y + 16);
        });
      }

      particleOffset = (particleOffset + 1.2) % 100;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, hopVectors, rangeMeters, displayMode, selectedNodeId, isDark]);

  // Canvas click handler to select node blips
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY) - 24;

    let clickedNode: ExtendedTacticalNode | null = null;

    if (displayMode === 'polar_radar') {
      nodes.forEach((node) => {
        let nx = centerX;
        let ny = centerY;
        if (!node.isLocalUser) {
          const angleRad = ((node.azimuthDeg - 90) * Math.PI) / 180;
          const normDist = Math.min(1.0, node.estimatedDistanceMeters / rangeMeters);
          const r = normDist * maxRadius;
          nx = centerX + r * Math.cos(angleRad);
          ny = centerY + r * Math.sin(angleRad);
        }

        const distSq = (clickX - nx) ** 2 + (clickY - ny) ** 2;
        if (distSq <= 24 ** 2) {
          clickedNode = node;
        }
      });
    } else {
      nodes.forEach((node) => {
        const p = physicsNodesRef.current.get(node.id);
        if (!p) return;
        const distSq = (clickX - p.x) ** 2 + (clickY - p.y) ** 2;
        if (distSq <= 24 ** 2) {
          clickedNode = node;
        }
      });
    }

    if (clickedNode) {
      setSelectedNodeId((clickedNode as ExtendedTacticalNode).id);
      audioEngine.triggerHaptic(30);
    } else {
      setSelectedNodeId(null);
    }
  };

  const handlePingAll = async () => {
    setIsPinging(true);
    const res = await meshTopologyService.pingAllNodes();
    setLastPingCount(res.pingCount);
    setIsPinging(false);
  };

  return (
    <div className={`flex flex-col h-full w-full ${className}`}>
      {/* Tactical Canvas Header Toolbar */}
      <div
        className={
          isDark
            ? 'flex flex-wrap items-center justify-between p-2.5 bg-zinc-900/90 border-b border-zinc-800 gap-2 text-xs font-mono'
            : 'flex flex-wrap items-center justify-between p-3 bg-white/90 border-b border-slate-200/80 gap-2 text-xs font-mono shadow-xs'
        }
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-1.5">
            <Radio className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-purple-600'}`} />
            <span className={`font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              TACTICAL MESH MAP
            </span>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              isDark ? 'bg-zinc-800 text-emerald-400' : 'bg-purple-100 text-purple-700'
            }`}
          >
            {nodes.length} Nodes Active
          </span>
        </div>

        {/* Zoom & Mode Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Range Selector */}
          <div className="flex items-center rounded-xl overflow-hidden border border-zinc-700/60 p-0.5 bg-zinc-950/40">
            {([25, 50, 100, 250] as RadarRangeMeters[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRangeMeters(r);
                  meshTopologyService.setRangeMeters(r);
                  audioEngine.triggerHaptic(20);
                }}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold transition-all rounded-lg ${
                  rangeMeters === r
                    ? isDark
                      ? 'bg-emerald-500 text-black shadow-xs'
                      : 'bg-purple-600 text-white shadow-xs'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}m
              </button>
            ))}
          </div>

          {/* Mode Switcher (Polar Radar vs Force Topology) */}
          <div className="flex items-center rounded-xl overflow-hidden border border-zinc-700/60 p-0.5 bg-zinc-950/40">
            <button
              onClick={() => {
                setDisplayMode('polar_radar');
                meshTopologyService.setDisplayMode('polar_radar');
                audioEngine.triggerHaptic(20);
              }}
              className={`p-1.5 rounded-lg transition-all ${
                displayMode === 'polar_radar'
                  ? isDark
                    ? 'bg-emerald-500 text-black'
                    : 'bg-purple-600 text-white'
                  : isDark
                  ? 'text-zinc-400'
                  : 'text-slate-600'
              }`}
              title="Polar Radar View"
            >
              <CircleDot className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setDisplayMode('force_topology');
                meshTopologyService.setDisplayMode('force_topology');
                audioEngine.triggerHaptic(20);
              }}
              className={`p-1.5 rounded-lg transition-all ${
                displayMode === 'force_topology'
                  ? isDark
                    ? 'bg-emerald-500 text-black'
                    : 'bg-purple-600 text-white'
                  : isDark
                  ? 'text-zinc-400'
                  : 'text-slate-600'
              }`}
              title="Force Mesh Network Topology"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Acoustic Ping Button */}
          <button
            onClick={handlePingAll}
            disabled={isPinging}
            className={
              isDark
                ? 'flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 hover:bg-emerald-900 transition-all font-bold text-xs'
                : 'flex items-center space-x-1 px-2.5 py-1 rounded-2xl neo-gel-button text-purple-700 font-bold text-xs shadow-xs'
            }
            title="Send acoustic radar ping signal to measure round-trip latency"
          >
            <Activity className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Pinging...' : 'Ping Mesh'}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative min-h-[260px] bg-zinc-950 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={480}
          height={320}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair max-w-lg object-contain"
        />

        {/* Selected Peer Telemetry Drawer / HUD Inspector */}
        {selectedNode && (
          <div
            className={
              isDark
                ? 'absolute bottom-2 left-2 right-2 p-3 bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 text-xs font-mono space-y-2'
                : 'absolute bottom-2 left-2 right-2 p-3.5 neo-glass-panel rounded-3xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 text-xs font-mono space-y-2 text-slate-800 border border-white/95'
            }
          >
            <div className="flex items-center justify-between border-b pb-1.5 border-zinc-700/40">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    selectedNode.isLocalUser
                      ? 'bg-emerald-500'
                      : selectedNode.role === 'sos_beacon'
                      ? 'bg-rose-500 animate-ping'
                      : 'bg-sky-400'
                  }`}
                />
                <span className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  {selectedNode.name}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${
                    isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {selectedNode.role.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-1.5 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                <span className="text-zinc-500 block text-[9px]">ESTIMATED DISTANCE</span>
                <span className="font-bold text-emerald-400">{selectedNode.estimatedDistanceMeters.toFixed(1)} m</span>
              </div>
              <div className="p-1.5 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                <span className="text-zinc-500 block text-[9px]">SIGNAL / SNR</span>
                <span className="font-bold text-sky-400">{selectedNode.signalDbm} dBm ({selectedNode.snrDb}dB)</span>
              </div>
              <div className="p-1.5 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                <span className="text-zinc-500 block text-[9px]">PING LATENCY</span>
                <span className="font-bold text-amber-400">{selectedNode.pingLatencyMs} ms</span>
              </div>
              <div className="p-1.5 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                <span className="text-zinc-500 block text-[9px]">BATTERY / ROUTE</span>
                <span className="font-bold text-zinc-300">{selectedNode.batteryPercent}% · {selectedNode.hopPath.join('➔')}</span>
              </div>
            </div>

            {/* Action Bar */}
            {!selectedNode.isLocalUser && onSelectPeerToTalk && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onSelectPeerToTalk(selectedNode)}
                  className={
                    isDark
                      ? 'flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold font-mono text-xs flex items-center justify-center space-x-1.5 shadow-sm'
                      : 'flex-1 py-1.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold font-mono text-xs flex items-center justify-center space-x-1.5 shadow-md'
                  }
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Hail Unit &amp; Tune Talkgroup</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

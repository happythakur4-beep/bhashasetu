import { MeshNode } from '../types';
import { meshNetwork } from './meshNetwork';
import { audioEngine } from './audioEngine';

export type TacticalNodeRole = 'command_center' | 'repeater_relay' | 'mobile_field_unit' | 'sos_beacon';

export interface HopVector {
  fromNodeId: string;
  toNodeId: string;
  quality: number; // 0 - 100
  rssi: number; // dBm
  latencyMs: number;
}

export interface ExtendedTacticalNode extends MeshNode {
  azimuthDeg: number;       // Angle around radar (0 - 360 deg)
  estimatedDistanceMeters: number; // FSPL & RTT calculated distance
  role: TacticalNodeRole;
  batteryPercent: number;
  snrDb: number;            // Signal-to-Noise ratio
  packetLossRatePercent: number;
  pingLatencyMs: number;
  jitterMs: number;
  hopPath: string[];        // Multi-hop route IDs, e.g. ['local', 'relay_1', 'peer_2']
  isPinging?: boolean;
}

export type RadarRangeMeters = 25 | 50 | 100 | 250 | 500;
export type MapDisplayMode = 'polar_radar' | 'force_topology';

type TopologyListener = (nodes: ExtendedTacticalNode[], hopVectors: HopVector[]) => void;

class MeshTopologyService {
  private tacticalNodes: Map<string, ExtendedTacticalNode> = new Map();
  private hopVectors: HopVector[] = [];
  private listeners: Set<TopologyListener> = new Set();
  private selectedRangeMeters: RadarRangeMeters = 100;
  private displayMode: MapDisplayMode = 'polar_radar';
  private selectedNodeId: string | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Listen to meshNetwork discovered nodes
    meshNetwork.onNodesDiscovered((rawNodes) => {
      this.syncNodes(rawNodes);
    });

    // Start tick loop for azimuth drift, distance micro-jitter, and topology updates
    this.intervalTimer = setInterval(() => {
      this.tickTelemetry();
    }, 1800);
  }

  private syncNodes(rawNodes: MeshNode[]) {
    const currentIds = new Set(rawNodes.map((n) => n.id));

    // Remove nodes that disappeared
    for (const id of Array.from(this.tacticalNodes.keys())) {
      if (!currentIds.has(id)) {
        this.tacticalNodes.delete(id);
      }
    }

    // Add or update existing
    rawNodes.forEach((node, index) => {
      const existing = this.tacticalNodes.get(node.id);
      if (existing) {
        // Update signal & distance
        existing.signalDbm = node.signalDbm;
        existing.lastSeen = node.lastSeen;
        existing.channel = node.channel;
        existing.activeLanguage = node.activeLanguage;
        existing.name = node.name;
        existing.state = node.state;
      } else {
        // Assign tactical properties deterministically or semi-randomly
        const azimuthDeg = node.isLocalUser
          ? 0
          : (index * 85 + 45) % 360;

        let role: TacticalNodeRole = 'mobile_field_unit';
        if (node.id.includes('sos') || node.name.toLowerCase().includes('sos')) {
          role = 'sos_beacon';
        } else if (node.id.includes('relay') || node.name.toLowerCase().includes('relief')) {
          role = 'repeater_relay';
        } else if (node.isLocalUser) {
          role = 'command_center';
        }

        const distance = node.isLocalUser ? 0 : node.distanceMeters || (30 + index * 35);
        const snrDb = Math.max(4, Math.round((node.signalDbm + 100) / 3));

        const newNode: ExtendedTacticalNode = {
          ...node,
          azimuthDeg,
          estimatedDistanceMeters: distance,
          role,
          batteryPercent: node.isLocalUser ? 98 : Math.floor(65 + Math.random() * 30),
          snrDb,
          packetLossRatePercent: Math.max(0, Math.floor((Math.abs(node.signalDbm) - 50) / 4)),
          pingLatencyMs: Math.round(12 + Math.abs(node.signalDbm) * 0.4),
          jitterMs: Math.round(1 + Math.random() * 4),
          hopPath: node.isLocalUser ? ['self'] : ['self', node.id],
        };

        this.tacticalNodes.set(node.id, newNode);
      }
    });

    this.recalculateHopVectors();
    this.notify();
  }

  private tickTelemetry() {
    let changed = false;
    const localNode = Array.from(this.tacticalNodes.values()).find((n) => n.isLocalUser);

    this.tacticalNodes.forEach((node) => {
      if (node.isLocalUser) return;

      // Small distance and angle micro-jitter to simulate continuous spatial movement & RF fading
      const distDelta = (Math.random() - 0.5) * 1.5;
      const newDist = Math.max(8, Math.min(480, node.estimatedDistanceMeters + distDelta));
      node.estimatedDistanceMeters = Math.round(newDist * 10) / 10;

      // Micro azimuth drift
      node.azimuthDeg = (node.azimuthDeg + (Math.random() - 0.5) * 0.4 + 360) % 360;

      // FSPL math: Free Space Path Loss distance approximation
      // RSSI ≈ -20*log10(d) - 38 + noise
      const fsplRssi = Math.round(-38 - 20 * Math.log10(Math.max(1, node.estimatedDistanceMeters)) + (Math.random() * 3 - 1.5));
      node.signalDbm = Math.max(-98, Math.min(-35, fsplRssi));
      node.snrDb = Math.max(3, Math.round((node.signalDbm + 105) / 2.8));
      node.pingLatencyMs = Math.round(10 + Math.abs(node.signalDbm) * 0.35 + node.estimatedDistanceMeters * 0.05);

      changed = true;
    });

    if (changed) {
      this.recalculateHopVectors();
      this.notify();
    }
  }

  private recalculateHopVectors() {
    const nodes = Array.from(this.tacticalNodes.values());
    const localNode = nodes.find((n) => n.isLocalUser);
    if (!localNode) return;

    const vectors: HopVector[] = [];
    const relays = nodes.filter((n) => !n.isLocalUser && n.role === 'repeater_relay');

    nodes.forEach((node) => {
      if (node.isLocalUser) return;

      if (relays.length > 0 && node.estimatedDistanceMeters > 120 && node.role !== 'repeater_relay') {
        // Multi-hop routing through nearest relay
        const relay = relays[0];
        node.hopPath = ['self', relay.id, node.id];

        vectors.push({
          fromNodeId: localNode.id,
          toNodeId: relay.id,
          quality: Math.min(100, Math.max(20, 100 - relay.estimatedDistanceMeters / 2)),
          rssi: relay.signalDbm,
          latencyMs: relay.pingLatencyMs,
        });

        vectors.push({
          fromNodeId: relay.id,
          toNodeId: node.id,
          quality: Math.min(100, Math.max(15, 100 - node.estimatedDistanceMeters / 3)),
          rssi: node.signalDbm,
          latencyMs: node.pingLatencyMs,
        });
      } else {
        // Direct link
        node.hopPath = ['self', node.id];
        vectors.push({
          fromNodeId: localNode.id,
          toNodeId: node.id,
          quality: Math.min(100, Math.max(10, 100 - node.estimatedDistanceMeters / 2.5)),
          rssi: node.signalDbm,
          latencyMs: node.pingLatencyMs,
        });
      }
    });

    this.hopVectors = vectors;
  }

  public getNodes(): ExtendedTacticalNode[] {
    return Array.from(this.tacticalNodes.values());
  }

  public getHopVectors(): HopVector[] {
    return this.hopVectors;
  }

  public getRangeMeters(): RadarRangeMeters {
    return this.selectedRangeMeters;
  }

  public setRangeMeters(range: RadarRangeMeters) {
    this.selectedRangeMeters = range;
    this.notify();
  }

  public getDisplayMode(): MapDisplayMode {
    return this.displayMode;
  }

  public setDisplayMode(mode: MapDisplayMode) {
    this.displayMode = mode;
    this.notify();
  }

  public getSelectedNodeId(): string | null {
    return this.selectedNodeId;
  }

  public setSelectedNodeId(id: string | null) {
    this.selectedNodeId = id;
    this.notify();
  }

  public async pingAllNodes(): Promise<{ success: boolean; pingCount: number }> {
    audioEngine.triggerHaptic([30, 50, 80]);
    audioEngine.playSquelchStatic(70);

    // Play high-tech acoustic radar ping sound effect
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio context fallback ignored
    }

    // Set pinging state on nodes
    this.tacticalNodes.forEach((node) => {
      if (!node.isLocalUser) {
        node.isPinging = true;
      }
    });
    this.notify();

    return new Promise((resolve) => {
      setTimeout(() => {
        this.tacticalNodes.forEach((node) => {
          node.isPinging = false;
          node.pingLatencyMs = Math.max(8, node.pingLatencyMs + Math.floor(Math.random() * 5 - 2));
        });
        this.notify();
        resolve({ success: true, pingCount: this.tacticalNodes.size - 1 });
      }, 900);
    });
  }

  public subscribe(listener: TopologyListener): () => void {
    this.listeners.add(listener);
    listener(this.getNodes(), this.getHopVectors());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const nodes = this.getNodes();
    const vectors = this.getHopVectors();
    this.listeners.forEach((l) => l(nodes, vectors));
  }
}

export const meshTopologyService = new MeshTopologyService();

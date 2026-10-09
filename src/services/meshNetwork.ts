import { ChannelNumber, LanguageCode, MeshNode, MeshPacket } from '../types';

export type MeshEventListener = (packet: MeshPacket) => void;
export type NodeDiscoveryListener = (nodes: MeshNode[]) => void;

interface HeartbeatMessage {
  type: 'HEARTBEAT';
  node: MeshNode;
}

interface RadioPacketMessage {
  type: 'MESH_PACKET';
  packet: MeshPacket;
}

interface PingMessage {
  type: 'PING';
  fromId: string;
  toId: string;
  timestamp: number;
}

type MeshWireMessage = HeartbeatMessage | RadioPacketMessage | PingMessage;

class MeshNetworkManager {
  private channelName = 'bhashasetu_mesh_v1';
  private broadcastChannel: BroadcastChannel | null = null;
  private localNode: MeshNode;
  private discoveredNodes: Map<string, MeshNode> = new Map();
  private packetListeners: Set<MeshEventListener> = new Set();
  private nodeListeners: Set<NodeDiscoveryListener> = new Set();
  private processedPacketIds: Set<string> = new Set();
  private heartbeatInterval: number | null = null;
  private pruneInterval: number | null = null;
  private simulatedNodes: MeshNode[] = [];
  private simulationTimer: number | null = null;

  constructor() {
    const savedName = typeof localStorage !== 'undefined' ? localStorage.getItem('bhashasetu_node_name') : null;
    const savedState = typeof localStorage !== 'undefined' ? localStorage.getItem('bhashasetu_node_state') : null;
    const savedLang = typeof localStorage !== 'undefined' ? (localStorage.getItem('bhashasetu_node_lang') as LanguageCode) : null;

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.localNode = {
      id: `node_${Date.now()}_${randomSuffix}`,
      name: savedName || `Setu-Unit-${randomSuffix}`,
      state: savedState || 'Himachal Pradesh (Mandi)',
      activeLanguage: savedLang || 'mjl',
      lastSeen: Date.now(),
      signalDbm: -42,
      channel: 3, // Default Public intercom
      isLocalUser: true,
      batteryLevel: 94,
      distanceMeters: 0,
    };

    this.initSimulatedNodes();
    this.initTransport();
  }

  // Initialize simulated nodes from different Indian states for testing & field training
  private initSimulatedNodes() {
    this.simulatedNodes = [
      {
        id: 'node_hp_mandi_01',
        name: 'HP-Mandi-Relief (Himachal)',
        state: 'Himachal Pradesh',
        activeLanguage: 'mjl',
        lastSeen: Date.now(),
        signalDbm: -58,
        channel: 3,
        isLocalUser: false,
        batteryLevel: 88,
        distanceMeters: 140,
      },
      {
        id: 'node_od_puri_02',
        name: 'OD-Coastal-Unit (Odisha)',
        state: 'Odisha',
        activeLanguage: 'or',
        lastSeen: Date.now(),
        signalDbm: -67,
        channel: 3,
        isLocalUser: false,
        batteryLevel: 79,
        distanceMeters: 420,
      },
      {
        id: 'node_dl_highway_03',
        name: 'DL-Highway-Logistics (Delhi)',
        state: 'Delhi NCR',
        activeLanguage: 'hi',
        lastSeen: Date.now(),
        signalDbm: -49,
        channel: 2,
        isLocalUser: false,
        batteryLevel: 92,
        distanceMeters: 85,
      },
      {
        id: 'node_sos_emergency_04',
        name: 'NH-Disaster-Coord (Emergency)',
        state: 'National Highway Post',
        activeLanguage: 'en',
        lastSeen: Date.now(),
        signalDbm: -52,
        channel: 1,
        isLocalUser: false,
        batteryLevel: 99,
        distanceMeters: 60,
      },
    ];

    // Add them to discovered nodes
    this.simulatedNodes.forEach((node) => {
      this.discoveredNodes.set(node.id, node);
    });
  }

  private initTransport() {
    if (typeof window === 'undefined') return;

    try {
      this.broadcastChannel = new BroadcastChannel(this.channelName);
      this.broadcastChannel.onmessage = (event: MessageEvent<MeshWireMessage>) => {
        this.handleIncomingWireMessage(event.data);
      };
    } catch (err) {
      console.warn('BroadcastChannel not supported in this environment:', err);
    }

    // Start periodic heartbeat broadcast
    this.heartbeatInterval = window.setInterval(() => {
      this.broadcastHeartbeat();
    }, 3000);

    // Prune stale nodes (not seen in > 15 seconds)
    this.pruneInterval = window.setInterval(() => {
      const now = Date.now();
      let changed = false;
      this.discoveredNodes.forEach((node, id) => {
        if (!node.isLocalUser && !id.startsWith('node_hp_') && !id.startsWith('node_od_') && !id.startsWith('node_dl_') && !id.startsWith('node_sos_')) {
          if (now - node.lastSeen > 16000) {
            this.discoveredNodes.delete(id);
            changed = true;
          }
        }
      });
      if (changed) {
        this.notifyNodeListeners();
      }
    }, 5000);

    // Initial heartbeat
    setTimeout(() => this.broadcastHeartbeat(), 200);
  }

  private handleIncomingWireMessage(data: MeshWireMessage) {
    if (!data || !data.type) return;

    if (data.type === 'HEARTBEAT') {
      const remoteNode = data.node;
      if (remoteNode.id === this.localNode.id) return; // Ignore own echo

      this.discoveredNodes.set(remoteNode.id, {
        ...remoteNode,
        isLocalUser: false,
        lastSeen: Date.now(),
        // Simulate minor RSSI jitter
        signalDbm: Math.max(-95, Math.min(-45, remoteNode.signalDbm + (Math.floor(Math.random() * 5) - 2))),
      });
      this.notifyNodeListeners();
    } else if (data.type === 'MESH_PACKET') {
      const packet = data.packet;
      // Deduplicate
      if (this.processedPacketIds.has(packet.id)) return;
      this.processedPacketIds.add(packet.id);

      // Keep deduplication set compact
      if (this.processedPacketIds.size > 200) {
        const first = this.processedPacketIds.values().next().value;
        if (first) this.processedPacketIds.delete(first);
      }

      // Check channel match (unless emergency SOS which rings on all channels)
      if (packet.channel === this.localNode.channel || packet.isEmergency) {
        this.packetListeners.forEach((listener) => {
          try {
            listener(packet);
          } catch (e) {
            console.error('Packet listener error:', e);
          }
        });
      }
    }
  }

  public getLocalNode(): MeshNode {
    return { ...this.localNode };
  }

  public updateLocalNode(updates: Partial<MeshNode>) {
    this.localNode = { ...this.localNode, ...updates };

    if (typeof localStorage !== 'undefined') {
      if (updates.name) localStorage.setItem('bhashasetu_node_name', updates.name);
      if (updates.state) localStorage.setItem('bhashasetu_node_state', updates.state);
      if (updates.activeLanguage) localStorage.setItem('bhashasetu_node_lang', updates.activeLanguage);
    }

    this.broadcastHeartbeat();
  }

  public setChannel(channel: ChannelNumber) {
    this.localNode.channel = channel;
    this.broadcastHeartbeat();
  }

  public broadcastHeartbeat() {
    if (!this.broadcastChannel) return;
    const msg: HeartbeatMessage = {
      type: 'HEARTBEAT',
      node: { ...this.localNode, lastSeen: Date.now() },
    };
    try {
      this.broadcastChannel.postMessage(msg);
    } catch (e) {
      console.warn('Broadcast heartbeat error:', e);
    }
  }

  // Transmit voice/text packet across mesh network
  public transmitPacket(packetData: Omit<MeshPacket, 'id' | 'senderId' | 'senderName' | 'senderState' | 'timestamp' | 'hopCount' | 'rssi'>): MeshPacket {
    const packet: MeshPacket = {
      ...packetData,
      id: `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      senderId: this.localNode.id,
      senderName: this.localNode.name,
      senderState: this.localNode.state,
      timestamp: Date.now(),
      hopCount: 1,
      rssi: -45,
    };

    // Mark as seen so we don't re-process locally
    this.processedPacketIds.add(packet.id);

    // Broadcast over BroadcastChannel to other tabs/windows
    if (this.broadcastChannel) {
      const msg: RadioPacketMessage = {
        type: 'MESH_PACKET',
        packet,
      };
      try {
        this.broadcastChannel.postMessage(msg);
      } catch (e) {
        console.warn('Error broadcasting mesh packet:', e);
      }
    }

    return packet;
  }

  // Simulate an incoming transmission from a remote state (e.g. Mandali driver or Odia caller)
  public triggerSimulatedPeerTransmission(params: {
    nodeId: string;
    originalText: string;
    translatedText: string;
    phoneticText: string;
    sourceLang: LanguageCode;
    targetLang: LanguageCode;
    isEmergency?: boolean;
  }): MeshPacket {
    const peerNode = this.discoveredNodes.get(params.nodeId) || this.simulatedNodes[0];

    const packet: MeshPacket = {
      id: `sim_pkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channel: this.localNode.channel,
      senderId: peerNode.id,
      senderName: peerNode.name,
      senderState: peerNode.state,
      senderLang: params.sourceLang,
      targetLang: params.targetLang,
      originalText: params.originalText,
      translatedText: params.translatedText,
      phoneticText: params.phoneticText,
      timestamp: Date.now(),
      hopCount: 2,
      rssi: peerNode.signalDbm,
      isEmergency: params.isEmergency,
    };

    // Deliver to listeners
    this.packetListeners.forEach((listener) => {
      try {
        listener(packet);
      } catch (err) {
        console.error('Simulated packet delivery error:', err);
      }
    });

    return packet;
  }

  public getDiscoveredNodes(): MeshNode[] {
    return Array.from(this.discoveredNodes.values());
  }

  public onPacket(listener: MeshEventListener): () => void {
    this.packetListeners.add(listener);
    return () => {
      this.packetListeners.delete(listener);
    };
  }

  public onNodesChange(listener: NodeDiscoveryListener): () => void {
    this.nodeListeners.add(listener);
    listener(this.getDiscoveredNodes());
    return () => {
      this.nodeListeners.delete(listener);
    };
  }

  private notifyNodeListeners() {
    const list = this.getDiscoveredNodes();
    this.nodeListeners.forEach((listener) => {
      try {
        listener(list);
      } catch (e) {
        console.error('Node listener error:', e);
      }
    });
  }

  public cleanup() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.pruneInterval) clearInterval(this.pruneInterval);
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.packetListeners.clear();
    this.nodeListeners.clear();
  }
}

export const meshNetwork = new MeshNetworkManager();

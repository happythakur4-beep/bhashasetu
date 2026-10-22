import { ChannelNumber, LanguageCode, MeshNode, MeshPacket } from '../types';
import { peerMesh, RemotePeer } from './peerMesh';

export type MeshEventListener = (packet: MeshPacket) => void;
export type NodeDiscoveryListener = (nodes: MeshNode[]) => void;

class MeshNetworkManager {
  private localNode: MeshNode;
  private discoveredNodes: Map<string, MeshNode> = new Map();
  private packetListeners: Set<MeshEventListener> = new Set();
  private nodeListeners: Set<NodeDiscoveryListener> = new Set();
  private processedPacketIds: Set<string> = new Set();
  private isDemoMode: boolean = false;
  private demoNodes: MeshNode[] = [];

  constructor() {
    const savedName = typeof localStorage !== 'undefined' ? localStorage.getItem('bhashasetu_node_name') : null;
    const savedState = typeof localStorage !== 'undefined' ? localStorage.getItem('bhashasetu_node_state') : null;
    const savedLang = typeof localStorage !== 'undefined' ? (localStorage.getItem('bhashasetu_node_lang') as LanguageCode) : null;

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.localNode = {
      id: peerMesh.getClientId() || `node_${Date.now()}_${randomSuffix}`,
      name: savedName || `Setu-Unit-${randomSuffix}`,
      state: savedState || 'Himachal Pradesh (Mandi)',
      activeLanguage: savedLang || 'hi',
      lastSeen: Date.now(),
      signalDbm: -45,
      channel: 3, // Default Public intercom talkgroup
      isLocalUser: true,
    };

    this.initDemoNodesList();
    this.initPresenceListener();
  }

  // Demo simulation nodes - only used when user explicitly enables Demo Mode
  private initDemoNodesList() {
    this.demoNodes = [
      {
        id: 'demo_hp_mandi_01',
        name: '[DEMO] HP-Mandi-Relief',
        state: 'Himachal Pradesh (Simulated)',
        activeLanguage: 'mjl',
        lastSeen: Date.now(),
        signalDbm: -58,
        channel: 3,
        isLocalUser: false,
      },
      {
        id: 'demo_od_puri_02',
        name: '[DEMO] OD-Coastal-Unit',
        state: 'Odisha (Simulated)',
        activeLanguage: 'or',
        lastSeen: Date.now(),
        signalDbm: -67,
        channel: 3,
        isLocalUser: false,
      },
      {
        id: 'demo_dl_highway_03',
        name: '[DEMO] DL-Highway-Logistics',
        state: 'Delhi NCR (Simulated)',
        activeLanguage: 'hi',
        lastSeen: Date.now(),
        signalDbm: -49,
        channel: 2,
        isLocalUser: false,
      },
    ];
  }

  // Hook into peerMesh room presence: true peers in the same room
  private initPresenceListener() {
    // Listen to real room presence changes from server WebSocket
    peerMesh.onPresenceChange((remotePeers: RemotePeer[]) => {
      this.syncDiscoveredNodes(remotePeers);
    });

    // Listen to real room packets
    peerMesh.onPacket((packet: MeshPacket) => {
      this.handleIncomingPacket(packet);
    });

    // Initial sync
    this.syncDiscoveredNodes(peerMesh.getRemotePeers());
  }

  // Update discovered nodes from actual room peers
  private syncDiscoveredNodes(remotePeers: RemotePeer[]) {
    this.discoveredNodes.clear();

    // 1. Add local user
    this.discoveredNodes.set(this.localNode.id, {
      ...this.localNode,
      lastSeen: Date.now(),
      isLocalUser: true,
    });

    // 2. Add real remote peers in the room
    remotePeers.forEach((peer) => {
      this.discoveredNodes.set(peer.clientId, {
        id: peer.clientId,
        name: peer.name,
        state: peer.state,
        activeLanguage: (peer.language as LanguageCode) || 'hi',
        lastSeen: Date.now(),
        signalDbm: -45, // real internet room link
        channel: this.localNode.channel,
        isLocalUser: false,
      });
    });

    // 3. If demo mode is explicitly turned on by user, include demo nodes
    if (this.isDemoMode) {
      this.demoNodes.forEach((node) => {
        this.discoveredNodes.set(node.id, {
          ...node,
          lastSeen: Date.now(),
        });
      });
    }

    this.notifyNodeListeners();
  }

  private handleIncomingPacket(packet: MeshPacket) {
    if (!packet || !packet.id) return;

    if (this.processedPacketIds.has(packet.id)) return;
    this.processedPacketIds.add(packet.id);

    if (this.processedPacketIds.size > 200) {
      const first = this.processedPacketIds.values().next().value;
      if (first) this.processedPacketIds.delete(first);
    }

    // Update peer last seen
    if (packet.senderId && this.discoveredNodes.has(packet.senderId)) {
      const node = this.discoveredNodes.get(packet.senderId)!;
      this.discoveredNodes.set(packet.senderId, {
        ...node,
        lastSeen: Date.now(),
      });
      this.notifyNodeListeners();
    }

    // Channel check: match talkgroup or emergency priority
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

    peerMesh.updateClientProfile(this.localNode.name, this.localNode.state, this.localNode.activeLanguage);
    this.syncDiscoveredNodes(peerMesh.getRemotePeers());
  }

  public setChannel(channel: ChannelNumber) {
    this.localNode.channel = channel;
    this.syncDiscoveredNodes(peerMesh.getRemotePeers());
  }

  // Transmit voice/text packet across room network
  public transmitPacket(packetData: Omit<MeshPacket, 'id' | 'senderId' | 'senderName' | 'senderState' | 'timestamp' | 'hopCount' | 'rssi'>): MeshPacket {
    const currentClientId = peerMesh.getClientId() || this.localNode.id;
    this.localNode.id = currentClientId;

    const packet: MeshPacket = {
      ...packetData,
      id: `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      senderId: currentClientId,
      senderName: this.localNode.name,
      senderState: this.localNode.state,
      timestamp: Date.now(),
      hopCount: 1,
      rssi: -45,
    };

    // Mark as seen so we don't re-process locally
    this.processedPacketIds.add(packet.id);

    // Broadcast over WebSocket room transport to other members
    peerMesh.broadcastPacket(packet);

    return packet;
  }

  // Demo mode toggle (Default: OFF)
  public isDemoModeActive(): boolean {
    return this.isDemoMode;
  }

  public setDemoMode(enabled: boolean) {
    this.isDemoMode = enabled;
    this.syncDiscoveredNodes(peerMesh.getRemotePeers());
  }

  // Explicit demo simulation trigger - only enabled when requested
  public triggerSimulatedPeerTransmission(params: {
    nodeId: string;
    originalText: string;
    translatedText: string;
    phoneticText: string;
    sourceLang: LanguageCode;
    targetLang: LanguageCode;
    isEmergency?: boolean;
  }): MeshPacket {
    this.isDemoMode = true;
    this.syncDiscoveredNodes(peerMesh.getRemotePeers());

    const peerNode = this.demoNodes.find((n) => n.id === params.nodeId) || this.demoNodes[0];

    const packet: MeshPacket = {
      id: `sim_pkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channel: params.isEmergency ? 1 : this.localNode.channel,
      senderId: peerNode.id,
      senderName: peerNode.name,
      senderState: peerNode.state,
      senderLang: params.sourceLang,
      targetLang: params.targetLang,
      originalText: params.originalText,
      translatedText: params.translatedText,
      phoneticText: params.phoneticText,
      timestamp: Date.now(),
      hopCount: 1,
      rssi: -55,
      isEmergency: params.isEmergency,
    };

    this.handleIncomingPacket(packet);
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

  public onNodesDiscovered(listener: NodeDiscoveryListener): () => void {
    this.nodeListeners.add(listener);
    listener(this.getDiscoveredNodes());
    return () => {
      this.nodeListeners.delete(listener);
    };
  }

  private notifyNodeListeners() {
    const nodes = this.getDiscoveredNodes();
    this.nodeListeners.forEach((listener) => {
      try {
        listener(nodes);
      } catch (e) {
        console.error('Node listener error:', e);
      }
    });
  }
}

export const meshNetwork = new MeshNetworkManager();

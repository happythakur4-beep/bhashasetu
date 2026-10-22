import { MeshPacket } from '../types';

export type PeerStatus = 'disconnected' | 'connecting' | 'waiting' | 'connected' | 'error';

export interface RemotePeer {
  clientId: string;
  name: string;
  state: string;
  language: string;
  joinedAt: number;
}

export interface PeerErrorMessage {
  code: string;
  message: string;
}

export type PeerPacketListener = (packet: MeshPacket) => void;
export type PeerAudioListener = (audioBase64: string, packet?: MeshPacket) => void;
export type PeerStatusListener = (status: PeerStatus, otherPeerCount: number, peers: RemotePeer[]) => void;
export type PeerPresenceListener = (peers: RemotePeer[]) => void;
export type PeerErrorListener = (error: PeerErrorMessage) => void;

class RoomTransportManager {
  private ws: WebSocket | null = null;
  private currentRoomCode: string = '';
  private clientId: string = '';
  private clientName: string = '';
  private clientState: string = '';
  private clientLang: string = 'hi';

  private status: PeerStatus = 'disconnected';
  private remotePeers: Map<string, RemotePeer> = new Map();

  private packetListeners: Set<PeerPacketListener> = new Set();
  private audioListeners: Set<PeerAudioListener> = new Set();
  private statusListeners: Set<PeerStatusListener> = new Set();
  private presenceListeners: Set<PeerPresenceListener> = new Set();
  private errorListeners: Set<PeerErrorListener> = new Set();

  private processedPacketIds: Set<string> = new Set();

  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private manualDisconnect = false;
  private socketGeneration = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      // Use sessionStorage for unique per-tab/session client identity so two tabs do not collide
      let tabSessionId = sessionStorage.getItem('bhashasetu_session_id');
      if (!tabSessionId) {
        tabSessionId = `peer_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
        sessionStorage.setItem('bhashasetu_session_id', tabSessionId);
      }
      this.clientId = tabSessionId;

      // User profile (name, station, language) is preserved in localStorage
      this.clientName = localStorage.getItem('bhashasetu_node_name') || `Unit-${this.clientId.slice(-4)}`;
      this.clientState = localStorage.getItem('bhashasetu_node_state') || 'Interstate Station';
      this.clientLang = localStorage.getItem('bhashasetu_node_lang') || 'hi';

      // Auto-join room from URL query param if present (?room=XXXX)
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom && /^\d{3,8}$/.test(urlRoom)) {
        setTimeout(() => {
          this.joinRoom(urlRoom);
        }, 500);
      }
    }
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getRoomCode(): string {
    return this.currentRoomCode;
  }

  public getStatus(): PeerStatus {
    return this.status;
  }

  // Real count of confirmed OTHER participants in this room
  public getPeerCount(): number {
    return this.remotePeers.size;
  }

  public getRemotePeers(): RemotePeer[] {
    return Array.from(this.remotePeers.values());
  }

  // Generate safe shareable room URL
  public getShareLink(roomCode: string): string {
    if (typeof window === 'undefined') return '';
    const cleanUrl = window.location.origin + window.location.pathname;
    return `${cleanUrl}?room=${roomCode}`;
  }

  // Check if current host is localhost (which cannot be opened directly from a physical mobile phone)
  public isLocalhost(): boolean {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  }

  public updateClientProfile(name: string, state: string, lang: string) {
    this.clientName = name;
    this.clientState = state;
    this.clientLang = lang;
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentRoomCode) {
      this.ws.send(
        JSON.stringify({
          type: 'join_room',
          roomCode: this.currentRoomCode,
          clientId: this.clientId,
          name: this.clientName,
          state: this.clientState,
          language: this.clientLang,
        })
      );
    }
  }

  public joinRoom(roomCode: string) {
    if (!roomCode) return;
    const cleanCode = roomCode.trim();
    if (!cleanCode) return;

    if (this.currentRoomCode === cleanCode && (this.status === 'connected' || this.status === 'waiting')) {
      return;
    }

    this.manualDisconnect = false;
    this.clearTimers();
    this.socketGeneration++;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.currentRoomCode = cleanCode;
    this.remotePeers.clear();
    this.reconnectAttempts = 0;
    this.setStatus('connecting');

    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (typeof window === 'undefined' || !this.currentRoomCode) return;

    const currentGen = ++this.socketGeneration;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/rooms`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (currentGen !== this.socketGeneration) return;
        console.log(`[RoomTransport] Connected to server WebSocket. Joining room ${this.currentRoomCode}...`);
        this.reconnectAttempts = 0;

        // Send join_room request with participant metadata
        this.ws?.send(
          JSON.stringify({
            type: 'join_room',
            roomCode: this.currentRoomCode,
            clientId: this.clientId,
            name: this.clientName,
            state: this.clientState,
            language: this.clientLang,
          })
        );

        // Start ping heartbeat every 10 seconds
        this.pingInterval = setInterval(() => {
          if (currentGen !== this.socketGeneration) return;
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 10000);
      };

      this.ws.onmessage = (event) => {
        if (currentGen !== this.socketGeneration) return;
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (e) {
          console.warn('[RoomTransport] Failed to parse room message:', e);
        }
      };

      this.ws.onclose = () => {
        if (currentGen !== this.socketGeneration) return;
        this.clearTimers();
        if (this.manualDisconnect) {
          this.setStatus('disconnected');
          return;
        }

        console.log('[RoomTransport] WebSocket disconnected. Attempting reconnect...');
        this.remotePeers.clear();
        this.setStatus('connecting');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        if (currentGen !== this.socketGeneration) return;
        console.warn('[RoomTransport] WebSocket error:', err);
      };
    } catch (e) {
      if (currentGen !== this.socketGeneration) return;
      console.error('[RoomTransport] Failed to create WebSocket connection:', e);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.manualDisconnect || !this.currentRoomCode) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
    this.reconnectTimer = setTimeout(() => {
      if (!this.manualDisconnect && this.currentRoomCode) {
        this.connectWebSocket();
      }
    }, delay);
  }

  private handleServerMessage(msg: any) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'error': {
        console.warn('[RoomTransport] Server error notice:', msg.code, msg.message);
        const errObj: PeerErrorMessage = {
          code: msg.code || 'SERVER_ERROR',
          message: msg.message || 'Server error',
        };
        this.errorListeners.forEach((l) => {
          try {
            l(errObj);
          } catch {}
        });
        break;
      }

      case 'room_joined': {
        // If server assigned a collision-safe ID, adopt it
        if (msg.clientId && msg.clientId !== this.clientId) {
          this.clientId = msg.clientId;
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('bhashasetu_session_id', this.clientId);
          }
        }

        // Initial room ACK with existing peers
        this.remotePeers.clear();
        if (Array.isArray(msg.peers)) {
          msg.peers.forEach((peer: RemotePeer) => {
            if (peer.clientId !== this.clientId) {
              this.remotePeers.set(peer.clientId, peer);
            }
          });
        }

        // True state: connected ONLY if at least 1 other participant is confirmed!
        if (this.remotePeers.size >= 1) {
          this.setStatus('connected');
        } else {
          this.setStatus('waiting');
        }
        this.notifyPresence();
        break;
      }

      case 'peer_joined': {
        if (msg.peer && msg.peer.clientId && msg.peer.clientId !== this.clientId) {
          this.remotePeers.set(msg.peer.clientId, msg.peer);
          this.setStatus('connected');
          this.notifyPresence();
        }
        break;
      }

      case 'peer_left': {
        if (msg.clientId) {
          this.remotePeers.delete(msg.clientId);
          if (this.remotePeers.size >= 1) {
            this.setStatus('connected');
          } else {
            this.setStatus('waiting');
          }
          this.notifyPresence();
        }
        break;
      }

      case 'room_presence': {
        if (Array.isArray(msg.peers)) {
          this.remotePeers.clear();
          msg.peers.forEach((peer: RemotePeer) => {
            if (peer.clientId !== this.clientId) {
              this.remotePeers.set(peer.clientId, peer);
            }
          });

          if (this.remotePeers.size >= 1) {
            this.setStatus('connected');
          } else {
            this.setStatus('waiting');
          }
          this.notifyPresence();
        }
        break;
      }

      case 'packet': {
        if (msg.packet && msg.packet.id) {
          const packet = msg.packet as MeshPacket;

          // Deduplication: ignore already processed packet IDs
          if (this.processedPacketIds.has(packet.id)) {
            return;
          }
          this.processedPacketIds.add(packet.id);

          // Bound cache size
          if (this.processedPacketIds.size > 200) {
            const firstKey = this.processedPacketIds.values().next().value;
            if (firstKey) this.processedPacketIds.delete(firstKey);
          }

          // Dispatch to packet listeners
          this.packetListeners.forEach((listener) => {
            try {
              listener(packet);
            } catch (e) {
              console.error('Packet listener error:', e);
            }
          });

          // If packet contains translated audio, dispatch to audio listeners
          if (packet.audioBase64) {
            this.audioListeners.forEach((listener) => {
              try {
                listener(packet.audioBase64!, packet);
              } catch (e) {
                console.error('Audio listener error:', e);
              }
            });
          }
        }
        break;
      }

      default:
        break;
    }
  }

  // Broadcast single packet with translated audio and text to OTHER room members
  public broadcastPacket(packet: MeshPacket): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.currentRoomCode) {
      console.warn('[RoomTransport] Cannot broadcast packet: socket not open');
      return false;
    }

    // Mark as locally processed so we don't re-dispatch
    this.processedPacketIds.add(packet.id);

    try {
      this.ws.send(
        JSON.stringify({
          type: 'packet',
          roomCode: this.currentRoomCode,
          packet,
          senderId: this.clientId,
        })
      );
      return true;
    } catch (e) {
      console.error('[RoomTransport] Error broadcasting packet:', e);
      return false;
    }
  }

  // Audio broadcasting is unified into broadcastPacket to prevent duplicate playbacks
  public broadcastAudio(audioBase64: string, packet?: MeshPacket) {
    if (packet) {
      this.broadcastPacket({ ...packet, audioBase64 });
    }
  }

  public disconnect() {
    this.manualDisconnect = true;
    this.clearTimers();

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN && this.currentRoomCode) {
        try {
          this.ws.send(
            JSON.stringify({
              type: 'leave_room',
              roomCode: this.currentRoomCode,
              clientId: this.clientId,
            })
          );
        } catch {}
      }
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.currentRoomCode = '';
    this.remotePeers.clear();
    this.setStatus('disconnected');
    this.notifyPresence();
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private setStatus(status: PeerStatus) {
    this.status = status;
    const peers = this.getRemotePeers();
    this.statusListeners.forEach((listener) => {
      try {
        listener(status, this.remotePeers.size, peers);
      } catch {}
    });
  }

  private notifyPresence() {
    const peers = this.getRemotePeers();
    this.presenceListeners.forEach((listener) => {
      try {
        listener(peers);
      } catch {}
    });
  }

  public onPacket(listener: PeerPacketListener): () => void {
    this.packetListeners.add(listener);
    return () => {
      this.packetListeners.delete(listener);
    };
  }

  public onAudio(listener: PeerAudioListener): () => void {
    this.audioListeners.add(listener);
    return () => {
      this.audioListeners.delete(listener);
    };
  }

  public onStatusChange(listener: PeerStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status, this.remotePeers.size, this.getRemotePeers());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public onPresenceChange(listener: PeerPresenceListener): () => void {
    this.presenceListeners.add(listener);
    listener(this.getRemotePeers());
    return () => {
      this.presenceListeners.delete(listener);
    };
  }

  public onError(listener: PeerErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }
}

export const peerMesh = new RoomTransportManager();

import { WebSocket } from 'ws';

export interface RoomPeer {
  ws: WebSocket;
  clientId: string;
  name: string;
  state: string;
  language: string;
  joinedAt: number;
  lastPing: number;
  isAlive: boolean;
}

export interface RoomSocketContext {
  currentRoomCode: string;
  currentClientId: string;
  isAlive: boolean;
}

export interface PacketPayload {
  id: string;
  channel?: number;
  senderId?: string;
  senderName?: string;
  senderState?: string;
  senderLang?: string;
  targetLang?: string;
  originalText?: string;
  translatedText?: string;
  phoneticText?: string;
  audioBase64?: string;
  audioDurationMs?: number;
  timestamp?: number;
  isEmergency?: boolean;
  engine?: string;
  isOffline?: boolean;
  confidence?: number;
  dialectNotes?: string;
  ttsWarning?: string;
}

export class RoomRelayService {
  // In-memory rooms: roomCode -> (clientId -> RoomPeer)
  private rooms = new Map<string, Map<string, RoomPeer>>();

  public getRoomsCount(): number {
    return this.rooms.size;
  }

  public getTotalPeersCount(): number {
    let count = 0;
    this.rooms.forEach((peerMap) => {
      count += peerMap.size;
    });
    return count;
  }

  public getRoomPeers(roomCode: string): RoomPeer[] {
    const peerMap = this.rooms.get(roomCode);
    return peerMap ? Array.from(peerMap.values()) : [];
  }

  // Remove client from a room cleanly.
  // If socket is provided, remove ONLY if the socket matches the owning socket!
  public removeClientFromRoom(roomCode: string, clientId: string, socket?: WebSocket): boolean {
    const peerMap = this.rooms.get(roomCode);
    if (!peerMap) return false;

    const existingPeer = peerMap.get(clientId);
    if (!existingPeer) return false;

    // Guard against old socket close removing a newly joined participant
    if (socket && existingPeer.ws !== socket) {
      return false;
    }

    peerMap.delete(clientId);

    // Notify other peers
    this.broadcastToRoom(roomCode, {
      type: 'peer_left',
      roomCode,
      clientId,
    });
    this.broadcastPresence(roomCode);

    if (peerMap.size === 0) {
      this.rooms.delete(roomCode);
    }
    return true;
  }

  // Broadcast message ONLY to OTHER room members
  public broadcastToRoom(roomCode: string, message: object, senderClientId?: string) {
    const peerMap = this.rooms.get(roomCode);
    if (!peerMap) return;

    const data = JSON.stringify(message);
    peerMap.forEach((peer, cId) => {
      if (senderClientId && cId === senderClientId) {
        return; // Never echo back to sender
      }
      if (peer.ws.readyState === WebSocket.OPEN) {
        try {
          peer.ws.send(data);
        } catch (e) {
          console.warn(`[RoomRelay] Error sending to peer ${cId}:`, e);
        }
      }
    });
  }

  // Broadcast presence to all participants in a room
  public broadcastPresence(roomCode: string) {
    const peerMap = this.rooms.get(roomCode);
    if (!peerMap) return;

    const peersList = Array.from(peerMap.values()).map((p) => ({
      clientId: p.clientId,
      name: p.name,
      state: p.state,
      language: p.language,
      joinedAt: p.joinedAt,
    }));

    peerMap.forEach((peer) => {
      if (peer.ws.readyState === WebSocket.OPEN) {
        const otherPeers = peersList.filter((p) => p.clientId !== peer.clientId);
        try {
          peer.ws.send(
            JSON.stringify({
              type: 'room_presence',
              roomCode,
              peerCount: otherPeers.length,
              peers: otherPeers,
            })
          );
        } catch {}
      }
    });
  }

  // Attach a WebSocket to the room relay service
  public handleConnection(ws: WebSocket) {
    const context: RoomSocketContext = {
      currentRoomCode: '',
      currentClientId: '',
      isAlive: true,
    };

    ws.on('pong', () => {
      context.isAlive = true;
    });

    ws.on('message', (raw) => {
      this.handleSocketMessage(ws, context, raw);
    });

    ws.on('close', () => {
      if (context.currentRoomCode && context.currentClientId) {
        this.removeClientFromRoom(context.currentRoomCode, context.currentClientId, ws);
      }
    });

    ws.on('error', (err) => {
      console.warn(`[RoomRelay] Socket error for ${context.currentClientId}:`, err?.message);
      if (context.currentRoomCode && context.currentClientId) {
        this.removeClientFromRoom(context.currentRoomCode, context.currentClientId, ws);
      }
    });

    return context;
  }

  public handleSocketMessage(ws: WebSocket, context: RoomSocketContext, raw: any) {
    try {
      const msg = JSON.parse(raw.toString());
      if (!msg || typeof msg !== 'object') return;

      switch (msg.type) {
        case 'join_room': {
          const { roomCode, clientId, name, state, language } = msg;
          if (!roomCode || !clientId) {
            ws.send(
              JSON.stringify({
                type: 'error',
                code: 'INVALID_JOIN',
                message: 'Missing roomCode or clientId in join request',
              })
            );
            return;
          }

          // Leave previous room if switching
          if (context.currentRoomCode && context.currentClientId) {
            this.removeClientFromRoom(context.currentRoomCode, context.currentClientId, ws);
          }

          const targetRoom = String(roomCode).trim();
          let assignedClientId = String(clientId).trim();

          if (!this.rooms.has(targetRoom)) {
            this.rooms.set(targetRoom, new Map());
          }

          const peerMap = this.rooms.get(targetRoom)!;

          // Check for collision: if another socket already holds this clientId in the same room,
          // assign collision-safe per-session suffix so old socket is not erased blindly
          if (peerMap.has(assignedClientId)) {
            const existing = peerMap.get(assignedClientId)!;
            if (existing.ws !== ws) {
              assignedClientId = `${assignedClientId}_${Math.random().toString(36).substring(2, 6)}`;
            }
          }

          context.currentRoomCode = targetRoom;
          context.currentClientId = assignedClientId;

          const newPeer: RoomPeer = {
            ws,
            clientId: assignedClientId,
            name: name || `Unit-${assignedClientId.slice(-4)}`,
            state: state || 'Field Station',
            language: language || 'hi',
            joinedAt: Date.now(),
            lastPing: Date.now(),
            isAlive: true,
          };

          peerMap.set(assignedClientId, newPeer);

          // Send ACK to joining client
          const otherPeers = Array.from(peerMap.values())
            .filter((p) => p.clientId !== assignedClientId)
            .map((p) => ({
              clientId: p.clientId,
              name: p.name,
              state: p.state,
              language: p.language,
              joinedAt: p.joinedAt,
            }));

          ws.send(
            JSON.stringify({
              type: 'room_joined',
              roomCode: targetRoom,
              clientId: assignedClientId,
              peerCount: otherPeers.length,
              peers: otherPeers,
            })
          );

          // Notify other peers in the room
          this.broadcastToRoom(
            targetRoom,
            {
              type: 'peer_joined',
              roomCode: targetRoom,
              peer: {
                clientId: assignedClientId,
                name: newPeer.name,
                state: newPeer.state,
                language: newPeer.language,
                joinedAt: newPeer.joinedAt,
              },
            },
            assignedClientId
          );

          this.broadcastPresence(targetRoom);
          break;
        }

        case 'packet': {
          // 1. Must be joined to a room
          if (!context.currentRoomCode || !context.currentClientId) {
            ws.send(
              JSON.stringify({
                type: 'error',
                code: 'NOT_JOINED',
                message: 'Must join a room before transmitting packets',
              })
            );
            return;
          }

          // 2. Cross-room spoofing prevention
          if (msg.roomCode && String(msg.roomCode).trim() !== context.currentRoomCode) {
            ws.send(
              JSON.stringify({
                type: 'error',
                code: 'CROSS_ROOM_SPOOF',
                message: 'Cannot transmit to a different room than your joined room',
              })
            );
            return;
          }

          const rawPacket = msg.packet;
          if (!rawPacket || typeof rawPacket !== 'object' || !rawPacket.id) {
            ws.send(
              JSON.stringify({
                type: 'error',
                code: 'INVALID_PACKET',
                message: 'Packet missing required fields or id',
              })
            );
            return;
          }

          // 3. Schema and payload bounded size validation
          const packetId = String(rawPacket.id).slice(0, 128);
          const origText = String(rawPacket.originalText || '').slice(0, 5000);
          const transText = String(rawPacket.translatedText || '').slice(0, 5000);
          const phonText = String(rawPacket.phoneticText || '').slice(0, 5000);

          let audioBase64: string | undefined = undefined;
          if (typeof rawPacket.audioBase64 === 'string') {
            // Cap at ~2.5MB payload
            if (rawPacket.audioBase64.length > 2.5 * 1024 * 1024) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  code: 'PAYLOAD_TOO_LARGE',
                  message: 'Audio payload exceeds maximum 2.5MB limit',
                })
              );
              return;
            }
            audioBase64 = rawPacket.audioBase64;
          }

          // 4. SENDER IDENTITY SPOOF PREVENTION: Enforce sender identity server-side!
          const sanitizedPacket: PacketPayload = {
            ...rawPacket,
            id: packetId,
            senderId: context.currentClientId, // Server-authoritative sender ID
            originalText: origText,
            translatedText: transText,
            phoneticText: phonText,
            audioBase64,
            timestamp: typeof rawPacket.timestamp === 'number' ? rawPacket.timestamp : Date.now(),
          };

          // Route strictly by bound currentRoomCode, never client-spoofed room
          this.broadcastToRoom(
            context.currentRoomCode,
            {
              type: 'packet',
              roomCode: context.currentRoomCode,
              packet: sanitizedPacket,
              senderId: context.currentClientId,
            },
            context.currentClientId
          );
          break;
        }

        case 'leave_room': {
          if (context.currentRoomCode && context.currentClientId) {
            this.removeClientFromRoom(context.currentRoomCode, context.currentClientId, ws);
            context.currentRoomCode = '';
            context.currentClientId = '';
          }
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        }

        default:
          break;
      }
    } catch (e: any) {
      console.warn('[RoomRelay] Message parse error:', e?.message);
    }
  }

  // Sweep dead sockets
  public sweepDeadSockets() {
    this.rooms.forEach((peerMap, roomCode) => {
      peerMap.forEach((peer, clientId) => {
        if (peer.ws.readyState !== WebSocket.OPEN) {
          this.removeClientFromRoom(roomCode, clientId, peer.ws);
        }
      });
    });
  }
}

export const roomRelay = new RoomRelayService();

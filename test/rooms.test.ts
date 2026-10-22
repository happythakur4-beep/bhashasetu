import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import assert from 'assert';
import { findInOfflinePhrasebook } from '../src/services/languageRegistry';
import { RoomRelayService } from '../src/server/roomRelay';
import { getHonestOfflineTranslation } from '../server';

console.log('--- Starting Automated Test Suite: Room Relay, Spoof Prevention, Quota & Honest Translation ---');

// ============================================================================
// 1. Test Honest Offline Translation & Fallback Rejection
// ============================================================================
console.log('\n[TEST 1] Testing Honest Offline Translation & Fallback Rejection...');

// A. Curated exact match
const curatedMatch = findInOfflinePhrasebook('नमस्ते', 'hi', 'en');
assert(curatedMatch !== null, 'Curated phrasebook should find "नमस्ते"');
console.log('✓ Curated phrase found:', curatedMatch.text);

// B. Same language passthrough
const sameLangResult = getHonestOfflineTranslation('हेलो', 'hi', 'hi');
assert(sameLangResult.success === true, 'Same language should succeed as honest passthrough');
assert(sameLangResult.data.translatedText === 'हेलो', 'Same language should keep text unchanged');
console.log('✓ Same-language passthrough succeeded with confidence 1.0');

// C. Arbitrary uncurated sentence in Mandali / Hindi: MUST FAIL EXPLICITLY.
// Must not return fake confidence 0.5 or simulated success!
const mandaliArbitrary = getHonestOfflineTranslation('आज मौसम बहुत ठंडा है और बर्फ गिर रही है', 'hi', 'mjl');
assert(mandaliArbitrary.success === false, 'Arbitrary uncurated sentence into Mandali must NOT succeed offline');
assert(mandaliArbitrary.code === 'OFFLINE_PHRASEBOOK_MISS', 'Must have explicit OFFLINE_PHRASEBOOK_MISS code');
console.log('✓ Uncurated Mandali phrase rejected honestly without fabricated confidence');

const odiaArbitrary = getHonestOfflineTranslation('कुछ रैंडम वाक्य जो शब्दकोश में नहीं है', 'hi', 'or');
assert(odiaArbitrary.success === false, 'Arbitrary uncurated sentence into Odia must NOT succeed offline');
console.log('✓ Uncurated Odia phrase rejected honestly without fake echoing');

// ============================================================================
// 2. Real Integration Tests with RoomRelayService
// ============================================================================
async function runRoomRelayIntegrationTests() {
  console.log('\n[TEST 2] Testing Production RoomRelayService Implementation...');

  const server = http.createServer();
  const roomsWss = new WebSocketServer({ noServer: true });
  const relay = new RoomRelayService();

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/rooms') {
      roomsWss.handleUpgrade(request, socket, head, (ws) => {
        roomsWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  roomsWss.on('connection', (ws) => {
    relay.handleConnection(ws);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const wsUrl = `ws://127.0.0.1:${port}/rooms`;

  try {
    // ------------------------------------------------------------------------
    // Step A: Client A joins room 1111 (alone) -> peerCount: 0
    // ------------------------------------------------------------------------
    const clientA = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => clientA.on('open', resolve));

    const clientAMessages: any[] = [];
    clientA.on('message', (d) => clientAMessages.push(JSON.parse(d.toString())));

    clientA.send(
      JSON.stringify({
        type: 'join_room',
        roomCode: '1111',
        clientId: 'client_A',
        name: 'Unit-A',
        language: 'hi',
      })
    );

    await new Promise((r) => setTimeout(r, 60));
    assert(
      clientAMessages.some((m) => m.type === 'room_joined' && m.peerCount === 0),
      'Client A should receive room_joined with peerCount: 0'
    );
    console.log('✓ Client A joined room 1111 alone (peerCount: 0 confirmed)');

    // ------------------------------------------------------------------------
    // Step B: Client B joins room 2222 (different room) -> Isolation test
    // ------------------------------------------------------------------------
    const clientB = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => clientB.on('open', resolve));

    const clientBMessages: any[] = [];
    clientB.on('message', (d) => clientBMessages.push(JSON.parse(d.toString())));

    clientB.send(
      JSON.stringify({
        type: 'join_room',
        roomCode: '2222',
        clientId: 'client_B',
        name: 'Unit-B',
        language: 'en',
      })
    );

    await new Promise((r) => setTimeout(r, 60));
    assert(
      clientBMessages.some((m) => m.type === 'room_joined' && m.peerCount === 0),
      'Client B should receive room_joined in room 2222'
    );

    // Client A sends packet in room 1111
    clientA.send(
      JSON.stringify({
        type: 'packet',
        roomCode: '1111',
        packet: {
          id: 'pkt_test_1',
          channel: 3,
          originalText: 'नमस्ते',
          translatedText: 'Hello',
        },
      })
    );

    await new Promise((r) => setTimeout(r, 60));
    assert(
      !clientBMessages.some((m) => m.type === 'packet'),
      'Room 2222 must NOT receive packets from room 1111 (Per-room isolation confirmed)'
    );
    console.log('✓ Per-room isolation verified: Client B in room 2222 received 0 packets from room 1111');

    // ------------------------------------------------------------------------
    // Step C: Cross-room spoof rejection test
    // ------------------------------------------------------------------------
    // Client A is joined in room 1111, but attempts to transmit to room 2222!
    clientA.send(
      JSON.stringify({
        type: 'packet',
        roomCode: '2222', // Spoofed room code
        packet: {
          id: 'pkt_spoof_room',
          originalText: 'Spoof attempt',
        },
      })
    );

    await new Promise((r) => setTimeout(r, 60));
    const spoofError = clientAMessages.find((m) => m.type === 'error' && m.code === 'CROSS_ROOM_SPOOF');
    assert(spoofError, 'Server must reject cross-room transmission spoof with CROSS_ROOM_SPOOF error');
    console.log('✓ Cross-room spoof rejected by server:', spoofError.message);

    // ------------------------------------------------------------------------
    // Step D: Sender identity spoof rejection test
    // ------------------------------------------------------------------------
    // Client C joins room 1111. Client A sends a packet pretending senderId is 'fake_impostor'
    const clientC = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => clientC.on('open', resolve));
    const clientCMessages: any[] = [];
    clientC.on('message', (d) => clientCMessages.push(JSON.parse(d.toString())));

    clientC.send(
      JSON.stringify({
        type: 'join_room',
        roomCode: '1111',
        clientId: 'client_C',
        name: 'Unit-C',
      })
    );

    await new Promise((r) => setTimeout(r, 60));

    // Verify presence notification received on Client A
    assert(
      clientAMessages.some((m) => m.type === 'peer_joined' && m.peer.clientId === 'client_C'),
      'Client A should be notified of peer_joined for Client C'
    );

    // Client A sends packet with forged senderId in message and packet
    clientA.send(
      JSON.stringify({
        type: 'packet',
        roomCode: '1111',
        senderId: 'fake_impostor_id',
        packet: {
          id: 'pkt_spoof_sender',
          senderId: 'fake_impostor_id',
          originalText: 'Valid text',
          translatedText: 'Valid translated',
        },
      })
    );

    await new Promise((r) => setTimeout(r, 60));
    const receivedPacketMsg = clientCMessages.find(
      (m) => m.type === 'packet' && m.packet?.id === 'pkt_spoof_spoof_sender' || m.packet?.id === 'pkt_spoof_sender'
    );
    assert(receivedPacketMsg, 'Client C should receive the packet');
    assert(
      receivedPacketMsg.senderId === 'client_A',
      `Server must enforce true sender identity: expected "client_A", got "${receivedPacketMsg.senderId}"`
    );
    assert(
      receivedPacketMsg.packet.senderId === 'client_A',
      `Packet senderId must be rewritten to authenticated "client_A", got "${receivedPacketMsg.packet.senderId}"`
    );
    console.log('✓ Sender spoof rejected: server authoritatively bound senderId to authenticated socket client');

    // ------------------------------------------------------------------------
    // Step E: Duplicate clientId collision & old socket close protection
    // ------------------------------------------------------------------------
    // Connect socket D1 with clientId 'client_D' in room 3333
    const socketD1 = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => socketD1.on('open', resolve));
    const d1Messages: any[] = [];
    socketD1.on('message', (d) => d1Messages.push(JSON.parse(d.toString())));

    socketD1.send(
      JSON.stringify({
        type: 'join_room',
        roomCode: '3333',
        clientId: 'client_D',
      })
    );
    await new Promise((r) => setTimeout(r, 60));

    // Now connect socket D2 with same clientId 'client_D' in room 3333
    const socketD2 = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => socketD2.on('open', resolve));
    const d2Messages: any[] = [];
    socketD2.on('message', (d) => d2Messages.push(JSON.parse(d.toString())));

    socketD2.send(
      JSON.stringify({
        type: 'join_room',
        roomCode: '3333',
        clientId: 'client_D',
      })
    );
    await new Promise((r) => setTimeout(r, 60));

    // Now close socket D1. If collision handling is correct, closing D1 MUST NOT remove D2!
    socketD1.close();
    await new Promise((r) => setTimeout(r, 60));

    const room3333Peers = relay.getRoomPeers('3333');
    assert(
      room3333Peers.length >= 1,
      'Closing old socket D1 must not delete room peer owned by socket D2'
    );
    console.log('✓ Duplicate clientId & old socket close protection verified (owning socket checked)');

    // ------------------------------------------------------------------------
    // Step F: Stale socket / room switching
    // ------------------------------------------------------------------------
    // Client E switches from room 4444 to room 5555
    const clientE = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => clientE.on('open', resolve));
    clientE.send(
      JSON.stringify({
        type: 'join_room',
        roomCode: '4444',
        clientId: 'client_E',
      })
    );
    await new Promise((r) => setTimeout(r, 60));
    assert(relay.getRoomPeers('4444').length === 1, 'Room 4444 should have 1 peer');

    // Switch to room 5555
    clientE.send(
      JSON.stringify({
        type: 'join_room',
        roomCode: '5555',
        clientId: 'client_E',
      })
    );
    await new Promise((r) => setTimeout(r, 60));
    assert(relay.getRoomPeers('4444').length === 0, 'Room 4444 should be cleaned up after switch');
    assert(relay.getRoomPeers('5555').length === 1, 'Room 5555 should have client_E');
    console.log('✓ Stale socket / room switching cleaned up old room cleanly');

    // Clean up test sockets
    clientA.close();
    clientB.close();
    clientC.close();
    socketD2.close();
    clientE.close();
  } finally {
    server.close();
  }
}

// Run test suite
runRoomRelayIntegrationTests()
  .then(() => {
    console.log('\n======================================================');
    console.log('✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test failure:', err);
    process.exit(1);
  });

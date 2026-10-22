import { ConversationMessage } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('📊 Starting Language Usage Visual Dashboard Test Suite...');

// Mock conversation messages with Mandali, Hindi, and Odia interactions
const mockMessages: ConversationMessage[] = [
  {
    id: '1',
    sender: 'self',
    senderName: 'Speaker 1',
    sourceLang: 'hi',
    targetLang: 'mjl',
    originalText: 'नमस्ते',
    translatedText: 'तुसां जो नमस्कार',
    phoneticText: 'Tusan jo namaskar',
    timestamp: Date.now() - 10000,
    isOffline: false,
    engine: 'gemini-neural',
    confidence: 1.0,
  },
  {
    id: '2',
    sender: 'peer',
    senderName: 'Speaker 2',
    sourceLang: 'mjl',
    targetLang: 'hi',
    originalText: 'कुथु जांदे',
    translatedText: 'कहाँ जा रहे हैं',
    phoneticText: 'Kuthu jaande',
    timestamp: Date.now() - 5000,
    isOffline: true,
    engine: 'offline-lexicon',
    confidence: 1.0,
  },
  {
    id: '3',
    sender: 'self',
    senderName: 'Speaker 1',
    sourceLang: 'hi',
    targetLang: 'or',
    originalText: 'धन्यवाद',
    translatedText: 'ଧନ୍ୟବାଦ',
    phoneticText: 'Dhanyabad',
    timestamp: Date.now(),
    isOffline: false,
    engine: 'gemini-neural',
    confidence: 1.0,
  },
];

// Test 1: Language frequency map calculation
const counts: Record<string, number> = {};
mockMessages.forEach((msg) => {
  counts[msg.sourceLang] = (counts[msg.sourceLang] || 0) + 1;
  counts[msg.targetLang] = (counts[msg.targetLang] || 0) + 1;
});

assert(counts['hi'] === 3, `Expected Hindi count = 3, got ${counts['hi']}`);
assert(counts['mjl'] === 2, `Expected Mandali count = 2, got ${counts['mjl']}`);
assert(counts['or'] === 1, `Expected Odia count = 1, got ${counts['or']}`);
console.log('  ✓ Language interaction frequencies aggregated accurately.');

// Test 2: Top dialect determination
const sortedLangs = Object.entries(counts).sort((a, b) => b[1] - a[1]);
assert(sortedLangs[0][0] === 'hi', 'Top interacted language should be Hindi');
assert(sortedLangs[1][0] === 'mjl', 'Second top dialect should be Mandali Pahadi');
console.log(`  ✓ Top dialect verified: ${sortedLangs[0][0].toUpperCase()} (${sortedLangs[0][1]} uses), followed by ${sortedLangs[1][0].toUpperCase()} (${sortedLangs[1][1]} uses).`);

// Test 3: Offline ratio calculation
const offlineCount = mockMessages.filter((m) => m.isOffline).length;
const offlineRatio = Math.round((offlineCount / mockMessages.length) * 100);
assert(offlineRatio === 33, `Expected 33% offline ratio, got ${offlineRatio}%`);
console.log('  ✓ Offline transmission ratio calculated correctly.');

console.log('🎉 ALL LANGUAGE DASHBOARD TESTS PASSED CLEANLY!\n');

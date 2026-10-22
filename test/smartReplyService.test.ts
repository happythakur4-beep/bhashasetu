import { smartReplyService } from '../src/services/smartReplyService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('🧪 Running Smart Reply NLP Service Tests...\n');

// Test 1: Default replies when no prior message exists
const defaultReplies = smartReplyService.generateSmartReplies({
  lastMessageText: '',
  userLang: 'hi',
});
assert(defaultReplies.length >= 4, 'Default replies generated 4 options');
assert(defaultReplies.some((r) => r.text.includes('समझ गया') || r.text.includes('Roger')), 'Includes Roger/Understood option');

// Test 2: Location query detection
const locationReplies = smartReplyService.generateSmartReplies({
  lastMessageText: 'आप कहाँ जा रहे हैं?',
  userLang: 'hi',
});
assert(
  locationReplies.some((r) => r.text.includes('रास्ते में') || r.text.includes('घर') || r.text.includes('स्टैंड')),
  'Location question generated relevant location responses'
);

// Test 3: Emergency / SOS query detection
const sosReplies = smartReplyService.generateSmartReplies({
  lastMessageText: 'मदद चाहिए इमरजेंसी!',
  userLang: 'hi',
});
assert(
  sosReplies.some((r) => r.text.includes('तुरंत') || r.text.includes('सुरक्षित') || r.text.includes('डॉक्टर')),
  'Emergency input generated urgent assistance responses'
);

// Test 4: Mandali dialect localized smart replies
const mandaliReplies = smartReplyService.generateSmartReplies({
  lastMessageText: 'तुसां कुथु जांदे?',
  userLang: 'mjl',
});
assert(
  mandaliReplies.some((r) => r.text.includes('मां') || r.text.includes('जी') || r.text.includes('हौ')),
  'Mandali dialect generated authentic Pahadi response options'
);

// Test 5: English smart replies
const englishReplies = smartReplyService.generateSmartReplies({
  lastMessageText: 'Where are you going?',
  userLang: 'en',
});
assert(
  englishReplies.some((r) => r.text.toLowerCase().includes('way') || r.text.toLowerCase().includes('arriving')),
  'English generated clear English response options'
);

console.log('\n🎉 All Smart Reply NLP Service tests passed successfully!');

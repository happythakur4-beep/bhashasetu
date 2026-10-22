import { customVocabularyService } from '../src/services/customVocabularyService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🧠 Starting Interactive Voice Word Learning Test Suite...');

// Test 1: Initial Vocabulary Model State
const initialWords = customVocabularyService.getLearnedWords();
assert(Array.isArray(initialWords), 'getLearnedWords must return an array');
assert(initialWords.length >= 3, 'Initial seed dictionary should contain seed Mandali terms');
console.log(`  ✓ Initial vocabulary model verified with ${initialWords.length} terms.`);

// Test 2: Adding a New Dialect Word & Confirming
const newWord = customVocabularyService.addLearnedWord({
  sourceWord: 'सड़क',
  targetTranslation: 'सड़क (Highway)',
  phonetic: 'Sadak',
  sourceLang: 'hi',
  targetLang: 'mjl',
  category: 'Infrastructure',
  notes: 'Custom highway route word',
});

assert(newWord.id.startsWith('learned_'), 'New learned word should have valid ID');
const updatedWords = customVocabularyService.getLearnedWords();
const found = updatedWords.find((w) => w.sourceWord === 'सड़क');
assert(found !== undefined, 'Newly added word must be present in vocabulary model');
console.log('  ✓ Interactive word learning confirmed and added to vocabulary model.');

// Test 3: Detecting Potential Unlearned Dialect Words
const unlearnedCandidates = customVocabularyService.detectPotentialNewWords(
  'कुथु जांदे पहाड़ी रास्ता',
  'mjl'
);
assert(Array.isArray(unlearnedCandidates), 'detectPotentialNewWords must return candidate array');
console.log(`  ✓ Unlearned dialect candidates detected: [ ${unlearnedCandidates.join(', ')} ]`);

// Test 4: Applying Custom Vocabulary Substitutions
const appliedResult = customVocabularyService.applyLearnedVocabulary(
  'तुसां इथी कुथु जांदे',
  'mjl',
  'hi'
);
assert(typeof appliedResult.text === 'string', 'applyLearnedVocabulary should return transformed text');
assert(appliedResult.appliedWords.length > 0, 'Learned vocabulary words should be matched and applied');
console.log(`  ✓ Vocabulary substitution applied successfully: "${appliedResult.text}"`);

// Cleanup test word
customVocabularyService.removeLearnedWord(newWord.id);
console.log('  ✓ Cleanup verified.');

console.log('🎉 ALL VOICE WORD LEARNING TESTS PASSED CLEANLY!\n');

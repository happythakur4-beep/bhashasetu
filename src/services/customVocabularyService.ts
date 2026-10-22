import { LanguageCode } from '../types';

export interface LearnedWord {
  id: string;
  sourceWord: string;
  targetTranslation: string;
  phonetic?: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  category?: string;
  learnedAt: string;
  usageCount: number;
  notes?: string;
}

const STORAGE_KEY = 'bhashasetu_custom_vocabulary_v1';

// Initial pre-learned regional vocabulary seeds
const SEED_LEARNED_WORDS: LearnedWord[] = [
  {
    id: 'seed_1',
    sourceWord: 'कुथु',
    targetTranslation: 'कहाँ (Where)',
    phonetic: 'Kuthu',
    sourceLang: 'mjl',
    targetLang: 'hi',
    category: 'Location Interrogative',
    learnedAt: '2026-10-10T08:00:00.000Z',
    usageCount: 5,
    notes: 'Mandali Pahadi adverb of place for "where"',
  },
  {
    id: 'seed_2',
    sourceWord: 'दस्सा',
    targetTranslation: 'बताइए (Tell / Guide)',
    phonetic: 'Dassa',
    sourceLang: 'mjl',
    targetLang: 'hi',
    category: 'Imperative Verb',
    learnedAt: '2026-10-10T08:15:00.000Z',
    usageCount: 3,
    notes: 'Mandali verb for "tell" or "direct"',
  },
  {
    id: 'seed_3',
    sourceWord: 'इथी',
    targetTranslation: 'यहाँ (Here)',
    phonetic: 'Ithi',
    sourceLang: 'mjl',
    targetLang: 'hi',
    category: 'Location Adverb',
    learnedAt: '2026-10-10T08:30:00.000Z',
    usageCount: 2,
    notes: 'Mandali adverb for "here"',
  },
];

type CustomVocabListener = (words: LearnedWord[]) => void;

class CustomVocabularyService {
  private learnedWords: LearnedWord[] = [];
  private listeners: Set<CustomVocabListener> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.learnedWords = JSON.parse(raw);
        } else {
          this.learnedWords = [...SEED_LEARNED_WORDS];
          this.save();
        }
      } catch (err) {
        console.warn('Failed to load custom vocabulary:', err);
        this.learnedWords = [...SEED_LEARNED_WORDS];
      }
    } else {
      this.learnedWords = [...SEED_LEARNED_WORDS];
    }
  }

  private save() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.learnedWords));
      } catch (err) {
        console.warn('Failed to save custom vocabulary:', err);
      }
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.learnedWords]));
  }

  public subscribe(listener: CustomVocabListener): () => void {
    this.listeners.add(listener);
    listener([...this.learnedWords]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getLearnedWords(): LearnedWord[] {
    return [...this.learnedWords];
  }

  public addLearnedWord(data: Omit<LearnedWord, 'id' | 'learnedAt' | 'usageCount'>): LearnedWord {
    const existingIndex = this.learnedWords.findIndex(
      (w) =>
        w.sourceWord.trim().toLowerCase() === data.sourceWord.trim().toLowerCase() &&
        w.sourceLang === data.sourceLang
    );

    let newWord: LearnedWord;

    if (existingIndex >= 0) {
      newWord = {
        ...this.learnedWords[existingIndex],
        targetTranslation: data.targetTranslation,
        phonetic: data.phonetic || this.learnedWords[existingIndex].phonetic,
        notes: data.notes || this.learnedWords[existingIndex].notes,
        usageCount: this.learnedWords[existingIndex].usageCount + 1,
      };
      this.learnedWords[existingIndex] = newWord;
    } else {
      newWord = {
        id: `learned_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sourceWord: data.sourceWord.trim(),
        targetTranslation: data.targetTranslation.trim(),
        phonetic: data.phonetic?.trim(),
        sourceLang: data.sourceLang,
        targetLang: data.targetLang,
        category: data.category || 'Dialect Term',
        learnedAt: new Date().toISOString(),
        usageCount: 1,
        notes: data.notes?.trim(),
      };
      this.learnedWords.unshift(newWord);
    }

    this.save();
    return newWord;
  }

  public removeLearnedWord(id: string) {
    this.learnedWords = this.learnedWords.filter((w) => w.id !== id);
    this.save();
  }

  public incrementUsage(id: string) {
    const word = this.learnedWords.find((w) => w.id === id);
    if (word) {
      word.usageCount += 1;
      this.save();
    }
  }

  /**
   * Scans text for potential unlearned or rare dialect words.
   * Returns candidates that might benefit from interactive user confirmation & learning.
   */
  public detectPotentialNewWords(text: string, sourceLang: LanguageCode): string[] {
    if (!text || text.trim().length < 2) return [];

    // Split text into words (supporting Devanagari & Latin)
    const tokens = text
      .trim()
      .split(/[\s,।!?॥"']+/);

    const candidates: string[] = [];

    for (const rawToken of tokens) {
      const token = rawToken.replace(/[^\p{L}\p{M}]/gu, '').trim();
      if (!token || token.length < 2) continue;

      // Skip common Hindi/English stop words
      const commonStopWords = [
        'है', 'हैं', 'था', 'थी', 'थे', 'में', 'पर', 'से', 'को', 'का', 'की', 'के',
        'और', 'या', 'तो', 'यह', 'वह', 'आप', 'हम', 'मैं', 'तुम', 'नहीं', 'जी',
        'is', 'are', 'was', 'were', 'the', 'a', 'an', 'to', 'in', 'on', 'at', 'for'
      ];

      if (commonStopWords.includes(token.toLowerCase()) || commonStopWords.includes(token)) {
        continue;
      }

      // Check if already learned
      const alreadyLearned = this.learnedWords.some(
        (w) => w.sourceWord.toLowerCase() === token.toLowerCase() && w.sourceLang === sourceLang
      );

      if (!alreadyLearned && !candidates.includes(token)) {
        candidates.push(token);
      }
    }

    return candidates.slice(0, 3); // Max 3 candidates per sentence
  }

  /**
   * Applies custom learned vocabulary substitutions to an existing translation text.
   */
  public applyLearnedVocabulary(
    text: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode
  ): { text: string; appliedWords: LearnedWord[] } {
    if (!text) return { text, appliedWords: [] };

    let resultText = text;
    const appliedWords: LearnedWord[] = [];

    const relevantWords = this.learnedWords.filter(
      (w) =>
        (w.sourceLang === sourceLang && w.targetLang === targetLang) ||
        (w.sourceLang === targetLang && w.targetLang === sourceLang)
    );

    for (const item of relevantWords) {
      const pattern = new RegExp(`\\b${item.sourceWord}\\b|${item.sourceWord}`, 'gi');
      if (pattern.test(resultText)) {
        resultText = resultText.replace(pattern, item.targetTranslation);
        appliedWords.push(item);
        this.incrementUsage(item.id);
      }
    }

    return { text: resultText, appliedWords };
  }
}

export const customVocabularyService = new CustomVocabularyService();

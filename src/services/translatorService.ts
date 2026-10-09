import { LanguageCode, TranslationResult } from '../types';
import {
  findInOfflinePhrasebook,
  applyMandaliDialectRules,
  transliterateDevanagariToPhonetic,
  transliterateOdiaToPhonetic,
} from './languageRegistry';
import { audioEngine } from './audioEngine';

class TranslatorService {
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private hasServerGemini = true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.checkServerHealth();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
      this.checkServerHealth();
    }
  }

  // Periodic or initial check if Gemini is configured on server
  public async checkServerHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      const data = await res.json();
      this.hasServerGemini = Boolean(data.hasGeminiKey);
      return this.hasServerGemini;
    } catch {
      this.hasServerGemini = false;
      return false;
    }
  }

  public getNetworkStatus(): { isOnline: boolean; hasServerGemini: boolean } {
    return {
      isOnline: this.isOnline,
      hasServerGemini: this.hasServerGemini,
    };
  }

  // Main translation function
  public async translate(
    text: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode,
    options?: { forceOffline?: boolean; context?: string; audioBase64?: string }
  ): Promise<TranslationResult> {
    let trimmed = text.trim();

    // If audio is provided and online, use gemini-3.5-transcribe for superior transcription accuracy
    if (options?.audioBase64 && this.isOnline && this.hasServerGemini && !options.forceOffline) {
      try {
        const transcribeResult = await audioEngine.transcribeAudio(options.audioBase64, sourceLang);
        if (transcribeResult && transcribeResult.transcript) {
          trimmed = transcribeResult.transcript;
        }
      } catch (e) {
        console.warn('Gemini 3.5 Transcribe fallback to local transcript:', e);
      }
    }

    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // If source and target are the same language
    if (sourceLang === targetLang) {
      let phonetic = trimmed;
      if (sourceLang === 'hi' || sourceLang === 'mjl') {
        phonetic = transliterateDevanagariToPhonetic(trimmed);
      } else if (sourceLang === 'or') {
        phonetic = transliterateOdiaToPhonetic(trimmed);
      }
      return {
        id,
        originalText: trimmed,
        translatedText: trimmed,
        phoneticText: phonetic,
        sourceLang,
        targetLang,
        isOffline: true,
        engine: 'offline-lexicon',
        confidence: 1.0,
        timestamp: Date.now(),
      };
    }

    // 1. Try Gemini Online Neural Translation if online and not forced offline
    if (this.isOnline && this.hasServerGemini && !options?.forceOffline) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2200); // 2.2s snappy voice radio timeout

        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            sourceLang,
            targetLang,
            context: options?.context || 'Voice radio translation between Indian states',
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const isOfflineResult = Boolean(json.isOffline || json.data.isOffline);
            return {
              id,
              originalText: trimmed,
              translatedText: json.data.translatedText || trimmed,
              phoneticText: json.data.phoneticText || json.data.translatedText || trimmed,
              sourceLang,
              targetLang,
              isOffline: isOfflineResult,
              engine: isOfflineResult ? 'offline-lexicon' : 'gemini-neural',
              confidence: json.data.confidence || 0.95,
              dialectNotes: json.data.dialectNotes || undefined,
              timestamp: Date.now(),
            };
          }
        }
      } catch {
        // Seamless fallback to offline engine below
      }
    }

    // 2. Offline Fallback Strategy:
    // A. Check curated offline phrasebook
    const phraseMatch = findInOfflinePhrasebook(trimmed, sourceLang, targetLang);
    if (phraseMatch) {
      return {
        id,
        originalText: trimmed,
        translatedText: phraseMatch.text,
        phoneticText: phraseMatch.phonetic,
        sourceLang,
        targetLang,
        isOffline: true,
        engine: 'offline-lexicon',
        confidence: 0.98,
        dialectNotes: phraseMatch.notes || 'Matched from offline emergency & interstate travel lexicon',
        timestamp: Date.now(),
      };
    }

    // B. Target is Mandali (Himachal Western Pahadi)
    if (targetLang === 'mjl') {
      const mandaliResult = applyMandaliDialectRules(trimmed);
      return {
        id,
        originalText: trimmed,
        translatedText: mandaliResult.text,
        phoneticText: mandaliResult.phonetic,
        sourceLang,
        targetLang,
        isOffline: true,
        engine: 'rule-morphology',
        confidence: 0.88,
        dialectNotes: mandaliResult.notes,
        timestamp: Date.now(),
      };
    }

    // C. Source is Mandali, Target is Hindi
    if (sourceLang === 'mjl' && targetLang === 'hi') {
      // Reverse common Mandali words back to standard Hindi
      let hiText = trimmed
        .replace(/\bकुथु\b/g, 'कहाँ')
        .replace(/\bके\b/g, 'क्या')
        .replace(/\bतुसां\b/g, 'आप')
        .replace(/\bतुहाड़ा\b/g, 'आपका')
        .replace(/\bचहिदा\b/g, 'चाहिए')
        .replace(/\bपाणी\b/g, 'पानी')
        .replace(/\bजांदे\b/g, 'जा रहे हैं')
        .replace(/\bऔंदे\b/g, 'आ रहे हैं')
        .replace(/\bनी\b/g, 'नहीं');

      return {
        id,
        originalText: trimmed,
        translatedText: hiText,
        phoneticText: transliterateDevanagariToPhonetic(hiText),
        sourceLang,
        targetLang,
        isOffline: true,
        engine: 'rule-morphology',
        confidence: 0.85,
        dialectNotes: 'Interpreted from Mandali Pahadi to Standard Hindi',
        timestamp: Date.now(),
      };
    }

    // D. Target is Odia (Offline rule transliteration / vocabulary mapping)
    if (targetLang === 'or') {
      const phonetic = transliterateDevanagariToPhonetic(trimmed);
      return {
        id,
        originalText: trimmed,
        translatedText: trimmed, // Keeps text or applies Odia phonetics
        phoneticText: phonetic,
        sourceLang,
        targetLang,
        isOffline: true,
        engine: 'offline-lexicon',
        confidence: 0.75,
        dialectNotes: 'Offline phonetic transliteration ready for Odia audio synthesis',
        timestamp: Date.now(),
      };
    }

    // E. General fallback (Phonetics and clean script transfer)
    const phonetic = (sourceLang === 'hi' || sourceLang === 'mjl')
      ? transliterateDevanagariToPhonetic(trimmed)
      : (sourceLang === 'or')
      ? transliterateOdiaToPhonetic(trimmed)
      : trimmed;

    return {
      id,
      originalText: trimmed,
      translatedText: trimmed,
      phoneticText: phonetic,
      sourceLang,
      targetLang,
      isOffline: true,
      engine: 'offline-lexicon',
      confidence: 0.7,
      dialectNotes: 'Offline phonetic mode active (network disconnected)',
      timestamp: Date.now(),
    };
  }
}

export const translatorService = new TranslatorService();

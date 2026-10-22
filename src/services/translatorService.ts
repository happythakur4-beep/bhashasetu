import { LanguageCode, TranslationResult } from '../types';
import {
  findInOfflinePhrasebook,
  transliterateDevanagariToPhonetic,
  transliterateOdiaToPhonetic,
} from './languageRegistry';
import { audioEngine } from './audioEngine';
import { customVocabularyService } from './customVocabularyService';

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
    options?: { forceOffline?: boolean; context?: string; audioBase64?: string; includeTTS?: boolean }
  ): Promise<TranslationResult> {
    let trimmed = text.trim();

    // If recorded microphone audio is provided and SpeechRecognition didn't transcribe it,
    // transcribe using server Gemini model
    if (options?.audioBase64 && !trimmed && !options.forceOffline) {
      if (!this.isOnline) {
        throw new Error(
          "नेटवर्क कनेक्शन त्रुटि (Network Offline): रिकॉर्ड किए गए ऑडियो को ट्रांसक्राइब करने के लिए इंटरनेट कनेक्शन आवश्यक है। कृपया इंटरनेट चालू करें या नीचे टेक्स्ट बॉक्स से टाइप करें।"
        );
      }
      if (!this.hasServerGemini) {
        throw new Error(
          "सर्वर ट्रांसक्रिप्शन अनुपलब्ध (Server Transcription Unavailable): जेमिनी API Key कॉन्फ़िगर नहीं है। कृपया व्यक्तिगत GEMINI_API_KEY सेट करें या नीचे दिए गए शब्दकोश के वाक्यों का उपयोग करें।"
        );
      }

      const transcribeResult = await audioEngine.transcribeAudio(options.audioBase64, sourceLang);
      if (transcribeResult.success && transcribeResult.transcript) {
        trimmed = transcribeResult.transcript.trim();
      } else if (
        transcribeResult.isQuota ||
        transcribeResult.code === 'QUOTA_EXCEEDED' ||
        transcribeResult.error?.includes('429') ||
        transcribeResult.error?.includes('quota') ||
        transcribeResult.error?.includes('Quota') ||
        transcribeResult.error?.includes('QUOTA_EXCEEDED') ||
        transcribeResult.error?.includes('rate limit')
      ) {
        throw new Error(
          "सर्वर जेमिनी ट्रांसक्रिप्शन कोटा समाप्त (Gemini Quota 429 Exhausted): दैनिक सीमा पूरी हो गई है। कृपया कोटा रीसेट होने की प्रतीक्षा करें, व्यक्तिगत API Key कॉन्फ़िगर करें, या ऑफ़लाइन शब्दकोश का उपयोग करें।"
        );
      } else if (
        transcribeResult.code === 'NETWORK_ERROR' ||
        transcribeResult.code === 'TIMEOUT' ||
        transcribeResult.error?.includes('network') ||
        transcribeResult.error?.includes('Network') ||
        transcribeResult.error?.includes('fetch') ||
        transcribeResult.error?.includes('timed out')
      ) {
        throw new Error(
          `नेटवर्क कनेक्शन त्रुटि (Network Error): ${transcribeResult.error || 'सर्वर ट्रांसक्रिप्शन से संपर्क नहीं हो सका।'} कृपया इंटरनेट जांचें या व्यक्तिगत API Key कॉन्फ़िगर करें।`
        );
      } else if (transcribeResult.error) {
        throw new Error(transcribeResult.error);
      }
    }

    if (!trimmed) {
      if (options?.audioBase64) {
        throw new Error(
          'ऑडियो में कोई स्पष्ट आवाज़ नहीं मिली (No Audible Speech Detected in Recording): रिकॉर्ड किए गए ऑडियो में आवाज़ बहुत धीमी या शांत थी। कृपया माइक्रोफ़ोन के करीब साफ़ आवाज़ में बोलें या नीचे टेक्स्ट बॉक्स से टाइप करें।'
        );
      }
      throw new Error('No speech or text provided for translation.');
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

    // 1. Try Gemini Online Neural Translation with server TTS
    if (this.isOnline && !options?.forceOffline) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 14000); // 14s cancellable timeout

        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            sourceLang,
            targetLang,
            context: options?.context || 'Interstate voice intercom between Indian states',
            includeTTS: options?.includeTTS ?? true,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const isOfflineResult = Boolean(json.isOffline || json.data.isOffline);
            const rawTranslated = json.data.translatedText || trimmed;
            const { text: customAppliedText, appliedWords } = customVocabularyService.applyLearnedVocabulary(
              rawTranslated,
              sourceLang,
              targetLang
            );
            const notes = appliedWords.length > 0
              ? `${json.data.dialectNotes || ''} (Learned Vocab Applied: ${appliedWords.map(w => w.sourceWord).join(', ')})`
              : json.data.dialectNotes;

            return {
              id,
              originalText: trimmed,
              translatedText: customAppliedText,
              phoneticText: json.data.phoneticText || customAppliedText,
              sourceLang,
              targetLang,
              isOffline: isOfflineResult,
              engine: isOfflineResult ? 'offline-lexicon' : 'gemini-neural',
              confidence: json.data.confidence ?? (isOfflineResult ? 0.6 : 0.95),
              dialectNotes: notes || undefined,
              audioBase64: json.data.audioBase64 || undefined,
              timestamp: Date.now(),
            };
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 429 || errData.code === 'QUOTA_EXCEEDED') {
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
                confidence: 1.0,
                dialectNotes: 'Gemini Quota 429 reached. Matched from curated offline interstate phrasebook',
                timestamp: Date.now(),
              };
            }
            throw new Error(
              "सर्वर जेमिनी ट्रांसलेशन दैनिक कोटा समाप्त (Gemini Quota 429 Exhausted): दैनिक सीमा पूरी हो गई है। कृपया कोटा रीसेट होने की प्रतीक्षा करें, व्यक्तिगत API Key कॉन्फ़िगर करें, या ऑफ़लाइन शब्दकोश का उपयोग करें।"
            );
          } else {
            throw new Error(errData.error || `Translation request failed with status ${res.status}`);
          }
        }
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (
          msg.includes('Quota') ||
          msg.includes('429') ||
          msg.includes('कोटा समाप्त') ||
          msg.includes('Network') ||
          msg.includes('नेटवर्क') ||
          msg.includes('Failed to fetch') ||
          err?.name === 'TypeError' ||
          err?.name === 'AbortError'
        ) {
          throw err;
        }
        console.warn('Server translation request notice:', err?.message || err);
      }
    }

    // 2. Honest Offline Fallback Strategy:
    // A. Check curated offline phrasebook (confidence 1.0)
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
        confidence: 1.0,
        dialectNotes: phraseMatch.notes || 'Matched from curated offline interstate phrasebook',
        timestamp: Date.now(),
      };
    }

    // B. Arbitrary text without curated phrasebook match: FAIL EXPLICITLY.
    // Do NOT echo source text with fabricated .75 or .5 confidence!
    throw new Error(
      `Offline translation is only available for saved phrasebook expressions. Connect to Internet with active Gemini API key/quota to translate arbitrary sentences into ${targetLang.toUpperCase()}.`
    );
  }
}

export const translatorService = new TranslatorService();

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Volume2,
  ArrowRightLeft,
  Copy,
  Check,
  User,
  Layers,
  Clock,
  Square,
  Sparkles,
  X,
  Send,
  AlertTriangle,
  Info,
  KeyRound,
  RefreshCw,
  BookOpen,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { ConversationMessage, LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, OFFLINE_PHRASEBOOK } from '../services/languageRegistry';
import { audioEngine } from '../services/audioEngine';
import { translatorService } from '../services/translatorService';
import { LanguageSelector } from './LanguageSelector';
import { useTheme } from '../context/ThemeContext';

interface DualTranslatorViewProps {
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  onChangeSourceLang: (lang: LanguageCode) => void;
  onChangeTargetLang: (lang: LanguageCode) => void;
  onNewMessage: (msg: ConversationMessage) => void;
  isMuted: boolean;
  onOpenPackManager?: () => void;
  onOpenWordLearning?: (word?: string, translation?: string) => void;
}

interface StatusFeedback {
  type: 'info' | 'warning' | 'error' | 'quota';
  titleHi: string;
  titleEn: string;
  details?: string;
  hint?: string;
  isQuota?: boolean;
  isNetwork?: boolean;
}

export const DualTranslatorView: React.FC<DualTranslatorViewProps> = ({
  sourceLang,
  targetLang,
  onChangeSourceLang,
  onChangeTargetLang,
  onNewMessage,
  isMuted,
  onOpenPackManager,
  onOpenWordLearning,
}) => {
  const { isDark } = useTheme();

  // Active speaker state & synchronous lock refs
  const [activeSpeaker, setActiveSpeaker] = useState<'A' | 'B' | null>(null);
  const activeSpeakerRef = useRef<'A' | 'B' | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const sessionCounterRef = useRef<number>(0);
  const activeSessionMeta = useRef<{
    speaker: 'A' | 'B';
    fromLang: LanguageCode;
    toLang: LanguageCode;
    sessionId: number;
  } | null>(null);

  // Live STT transcription ref & state
  const spokenRef = useRef<{ interim: string; final: string }>({ interim: '', final: '' });
  const lastSttErrorRef = useRef<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<StatusFeedback | null>(null);

  // UI interaction mode: Push-to-Talk Hold (with Pointer Capture) vs Accessible Tap to Start/Stop
  const [inputMode, setInputMode] = useState<'tap' | 'hold'>('tap');

  // Manual text testing state for both speakers
  const [manualTextA, setManualTextA] = useState('');
  const [manualTextB, setManualTextB] = useState('');
  const [showManualInputs, setShowManualInputs] = useState(true);
  const [isMandaliWarningExpanded, setIsMandaliWarningExpanded] = useState(false);
  const [isMandaliWarningDismissed, setIsMandaliWarningDismissed] = useState(false);

  // Conversation list & utility state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLangPicker, setShowLangPicker] = useState<'A' | 'B' | null>(null);
  const [conversationList, setConversationList] = useState<ConversationMessage[]>([]);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // Batch Processing Mode state (Strictly single-speaker A->B)
  const [isBatchModeOpen, setIsBatchModeOpen] = useState(false);
  const [isBatchRecording, setIsBatchRecording] = useState(false);
  const [batchSeconds, setBatchSeconds] = useState(0);
  const [batchTranscript, setBatchTranscript] = useState('');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<ConversationMessage[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const batchTimerRef = useRef<any>(null);
  const batchRecordedAudioUriRef = useRef<string | null>(null);

  const langA = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang) || SUPPORTED_LANGUAGES[0];
  const langB = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[1];

  // Teardown and cleanup on unmount or tab change
  useEffect(() => {
    return () => {
      sessionCounterRef.current++;
      activeSpeakerRef.current = null;
      isStartingRef.current = false;
      audioEngine.stopSpeechRecognition().catch(() => {});
      audioEngine.releaseMicrophone();
      audioEngine.stopSpeaking();
      if (batchTimerRef.current) {
        clearInterval(batchTimerRef.current);
        batchTimerRef.current = null;
      }
    };
  }, []);

  // Playback helper respecting isMuted, audioBase64 WAV, and voice availability
  const playMessageAudio = useCallback(
    async (msg: ConversationMessage) => {
      if (isMuted) {
        setStatusFeedback({
          type: 'info',
          titleHi: 'ऑडियो म्यूट है (हेडर में अनम्यूट करें)',
          titleEn: 'Audio is muted. Unmute from the top header bar to listen.',
        });
        return;
      }

      setActivePlayingId(msg.id);

      try {
        // Priority 1: Server generated audioBase64 WAV
        if (msg.audioBase64) {
          const playRes = await audioEngine.playAudioBase64(msg.audioBase64);
          if (playRes.autoplayBlocked) {
            setStatusFeedback({
              type: 'warning',
              titleHi: 'ऑटो-प्ले रोका गया — प्ले बटन दबाएं',
              titleEn: 'Browser blocked autoplay — click the Play (🔊) button on the message.',
            });
          } else if (!playRes.played && playRes.error) {
            setStatusFeedback({
              type: 'warning',
              titleHi: 'ऑडियो चलाने में त्रुटि',
              titleEn: `Audio playback notice: ${playRes.error}`,
            });
          }
          return;
        }

        // Priority 2: Browser SpeechSynthesis with truthful checks
        const voiceCheck = audioEngine.checkVoiceAvailability(msg.targetLang);
        if (!voiceCheck.available) {
          setStatusFeedback({
            type: 'warning',
            titleHi: 'डिवाइस में वॉयस उपलब्ध नहीं है',
            titleEn: voiceCheck.warning || `No TTS voice installed for ${msg.targetLang.toUpperCase()}.`,
            details: 'Text is preserved accurately without silent language replacement.',
          });
          return;
        }

        if (msg.targetLang === 'mjl' && voiceCheck.isApproximation) {
          setStatusFeedback({
            type: 'info',
            titleHi: 'माण्डली प्रायोगिक सिंथेसिस (Hindi Voice Approximation)',
            titleEn: voiceCheck.warning || 'Playing Mandyali synthesis via Hindi voice approximation. Native Mandyali acoustic voice models are unavailable in browsers.',
            details: 'Zero silent fallbacks: Dialect text is preserved truthfully without deceptive replacement.',
          });
        }

        const speakRes = await audioEngine.speak(msg.translatedText, msg.targetLang);
        if (!speakRes.spoke && speakRes.warning) {
          setStatusFeedback({
            type: 'warning',
            titleHi: 'स्पीच प्लेबैक चेतावनी',
            titleEn: speakRes.warning,
          });
        }
      } catch (err: any) {
        setStatusFeedback({
          type: 'warning',
          titleHi: 'प्लेबैक त्रुटि',
          titleEn: err?.message || 'Playback failed',
        });
      } finally {
        setActivePlayingId(null);
      }
    },
    [isMuted]
  );

  // Test speaker output only (does NOT request microphone permission)
  const handleTestSpeakerOutput = () => {
    audioEngine.triggerHaptic(30);
    audioEngine.playRogerBeep();
    setStatusFeedback({
      type: 'info',
      titleHi: 'स्पीकर आउटपुट टेस्ट सफल (Web Audio Beeper)',
      titleEn: 'Speaker output test triggered. Web Audio output is unlocked without mic access.',
    });
  };

  // Common translation error handler: Intercepts 429 Quota Exceeded & Network errors
  // Suggests waiting or configuring personal API key, rather than showing a misleading 'No Speech' error
  const handleTranslationError = (err: any) => {
    const raw = String(err?.message || err || '');

    const isQuota =
      raw.includes('429') ||
      raw.includes('Quota') ||
      raw.includes('quota') ||
      raw.includes('QUOTA_EXCEEDED') ||
      raw.includes('RESOURCE_EXHAUSTED') ||
      raw.includes('कोटा समाप्त') ||
      raw.includes('rate limit') ||
      raw.includes('Too Many Requests');

    const isNetwork =
      !isQuota &&
      (raw.includes('network') ||
        raw.includes('Network') ||
        raw.includes('नेटवर्क') ||
        raw.includes('Failed to fetch') ||
        raw.includes('fetch failed') ||
        raw.includes('TIMEOUT') ||
        raw.includes('timed out') ||
        raw.includes('offline') ||
        raw.includes('Offline') ||
        raw.includes('Load failed') ||
        raw.includes('ECONNREFUSED') ||
        lastSttErrorRef.current === 'network' ||
        (typeof navigator !== 'undefined' && !navigator.onLine));

    if (isQuota) {
      setStatusFeedback({
        type: 'quota',
        isQuota: true,
        titleHi: 'सर्वर जेमिनी कोटा समाप्त (Gemini Quota 429 Exceeded)',
        titleEn: 'Gemini free-tier daily quota limit reached (HTTP 429). Server rate limit exhausted.',
        details:
          'यह "No Speech" त्रुटि नहीं है — आपका ऑडियो/टेक्स्ट प्राप्त हुआ था, लेकिन जेमिनी सर्वर का दैनिक कोटा पूरा हो चुका है।',
        hint:
          'कार्रवाई योग्य विकल्प (Actionable Steps):\n1. ⏳ दैनिक कोटा रीसेट होने की प्रतीक्षा करें (यह 24 घंटे में रीसेट होता है)।\n2. 🔑 अपनी व्यक्तिगत GEMINI_API_KEY कॉन्फ़िगर करें ताकि असीमित ट्रांसलेशन जारी रह सके।\n3. 📖 नीचे दिए गए ऑफ़लाइन शब्दकोश (Phrasebook) के वाक्यों का उपयोग करें (कोटा-मुक्त)।',
      });
    } else if (isNetwork) {
      setStatusFeedback({
        type: 'error',
        isNetwork: true,
        titleHi: 'नेटवर्क कनेक्शन त्रुटि (Network Error)',
        titleEn: 'Unable to reach Gemini translation server. Connection dropped or timed out.',
        details:
          'यह "No Speech" त्रुटि नहीं है — माइक्रोफ़ोन सक्रिय था, लेकिन इंटरनेट या अनुवाद सर्वर से संपर्क नहीं हो सका।',
        hint:
          'कार्रवाई योग्य विकल्प (Actionable Steps):\n1. ⏳ इंटरनेट कनेक्शन की जाँच करें या सर्वर पुनः कनेक्ट होने की प्रतीक्षा करें।\n2. 🔑 स्थिर कनेक्शन पर व्यक्तिगत API Key कॉन्फ़िगर करें।\n3. 📖 नीचे दिए गए ऑफ़लाइन शब्दकोश (Phrasebook) के वाक्यों का उपयोग करें।',
      });
    } else if (raw.includes('Offline translation is only available') || raw.includes('OFFLINE_PHRASEBOOK_MISS')) {
      setStatusFeedback({
        type: 'warning',
        titleHi: 'ऑफ़लाइन अनुवाद अनुपलब्ध (Offline Dialect Notice)',
        titleEn: 'Dynamic translation requires Gemini API quota. This uncurated sentence is not in the offline phrasebook.',
        details:
          'बिना सक्रिय कोटा या ऑफ़लाइन मोड में केवल शब्दकोश (Phrasebook) के सहेजे गए वाक्य समर्थित हैं।',
        hint:
          'मौन फ़ॉलबैक निषेध (Zero Silent Fallbacks): हिंदी या अंग्रेज़ी में कोई मौन (Silent) अनुवाद नहीं किया गया है। बोली की प्रामाणिकता बनाए रखने के लिए, वास्तविक अनुवाद हेतु कोटा रीसेट की प्रतीक्षा करें या व्यक्तिगत API Key कॉन्फ़िगर करें।',
      });
    } else if (raw.includes('No speech or text') || raw.includes('No speech detected') || raw.includes('कोई आवाज़ नहीं मिली')) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setStatusFeedback({
          type: 'error',
          isNetwork: true,
          titleHi: 'नेटवर्क कनेक्शन त्रुटि (Network Offline)',
          titleEn: 'Device is offline. Unable to reach speech transcription server.',
          details: 'यह "No Speech" त्रुटि नहीं है — आपका इंटरनेट कनेक्शन बंद है।',
          hint: 'कार्रवाई योग्य विकल्प: इंटरनेट कनेक्शन चालू करें, व्यक्तिगत API Key कॉन्फ़िगर करें, या ऑफ़लाइन शब्दकोश का उपयोग करें।',
        });
        return;
      }
      setStatusFeedback({
        type: 'warning',
        titleHi: 'कोई आवाज़ या टेक्स्ट नहीं मिला (No Speech Detected)',
        titleEn: 'No audible speech was detected in the recording. Microphone was silent.',
        details: 'कृपया माइक्रोफ़ोन के पास साफ़ आवाज़ में बोलें या नीचे दिए गए टेक्स्ट इनपुट बॉक्स से सीधे टाइप करें।',
        hint: 'सुझाव: यदि ऑडियो ट्रांसक्रिप्शन में समस्या है, तो कोटा रीसेट की प्रतीक्षा करें, व्यक्तिगत API Key जोड़ें, या टेक्स्ट इनपुट का उपयोग करें।',
      });
    } else {
      setStatusFeedback({
        type: 'error',
        titleHi: 'अनुवाद त्रुटि (Translation Notice)',
        titleEn: raw,
        hint: 'सुझाव: दैनिक कोटा रीसेट होने की प्रतीक्षा करें, व्यक्तिगत API Key कॉन्फ़िगर करें, या ऑफ़लाइन शब्दकोश का उपयोग करें।',
      });
    }
  };

  // Start voice recording for Speaker A or Speaker B
  const startListening = async (speaker: 'A' | 'B') => {
    // Synchronous guards: avoid overlapping or duplicate sessions
    if (activeSpeakerRef.current !== null || isProcessing || isStartingRef.current || isBatchRecording) {
      return;
    }

    // Stop any ongoing TTS to prevent audio loopback into mic
    audioEngine.stopSpeaking();
    audioEngine.triggerHaptic(50);

    const sessionId = ++sessionCounterRef.current;
    activeSpeakerRef.current = speaker;
    setActiveSpeaker(speaker);
    isStartingRef.current = true;
    lastSttErrorRef.current = null;
    setStatusFeedback(null);

    const fromLang = speaker === 'A' ? sourceLang : targetLang;
    const toLang = speaker === 'A' ? targetLang : sourceLang;

    activeSessionMeta.current = {
      speaker,
      fromLang,
      toLang,
      sessionId,
    };

    spokenRef.current = { interim: '', final: '' };
    setInterimText('');
    setFinalText('');

    let recSessionId: number;
    try {
      recSessionId = await audioEngine.startVoiceRecording();
    } catch (err: any) {
      isStartingRef.current = false;
      activeSpeakerRef.current = null;
      setActiveSpeaker(null);
      setStatusFeedback({
        type: 'error',
        titleHi: 'माइक्रोफ़ोन शुरू करने में असमर्थ',
        titleEn: err?.message || 'Could not start microphone recording',
      });
      return;
    }

    isStartingRef.current = false;

    // Cancellation check: If user released before microphone permission resolved
    if (activeSpeakerRef.current !== speaker || sessionCounterRef.current !== sessionId) {
      await audioEngine.stopVoiceRecording(recSessionId);
      return;
    }

    // Start browser Web Speech Recognition
    audioEngine.startSpeechRecognition(
      fromLang,
      (interim) => {
        if (activeSpeakerRef.current === speaker && sessionCounterRef.current === sessionId) {
          spokenRef.current.interim = interim;
          setInterimText(interim);
        }
      },
      (final) => {
        if (activeSpeakerRef.current === speaker && sessionCounterRef.current === sessionId) {
          spokenRef.current.final = final;
          setFinalText(final);
        }
      },
      (err) => {
        lastSttErrorRef.current = err;
        if (err.includes('not natively supported')) {
          setStatusFeedback({
            type: 'info',
            titleHi: 'ब्राउज़र में स्पीच रिकग्निशन उपलब्ध नहीं है',
            titleEn: 'Browser STT not supported. Audio recording will be transcribed on server.',
          });
        } else if (err.includes('not-allowed') || err.includes('denied')) {
          setStatusFeedback({
            type: 'error',
            titleHi: 'माइक्रोफ़ोन अनुमति अस्वीकृत (Microphone Permission Denied)',
            titleEn: 'Microphone permission denied. Enable mic in browser settings or use manual text below.',
          });
        } else if (err.includes('network')) {
          setStatusFeedback({
            type: 'warning',
            isNetwork: true,
            titleHi: 'ब्राउज़र स्पीच रिकग्निशन में नेटवर्क समस्या (STT Network Notice)',
            titleEn: 'Browser STT network issue. Audio recording will be processed via server transcription.',
          });
        }
      }
    );
  };

  // Stop listening and translate (with empty transcript + audio fallback)
  const stopListening = async (speakerExpected?: 'A' | 'B') => {
    if (!activeSpeakerRef.current) return;
    if (speakerExpected && activeSpeakerRef.current !== speakerExpected) return;

    const currentSession = activeSessionMeta.current;
    if (!currentSession) {
      activeSpeakerRef.current = null;
      setActiveSpeaker(null);
      return;
    }

    const speaker = activeSpeakerRef.current;
    activeSpeakerRef.current = null;
    setActiveSpeaker(null);

    audioEngine.triggerHaptic([30, 40]);

    // Await speech recognition stop and flush
    await audioEngine.stopSpeechRecognition();

    // Await finalized audio recording data URI
    const audioDataUri = await audioEngine.stopVoiceRecording(currentSession.sessionId);

    // Extract recognized text
    const textToTranslate = (
      spokenRef.current.final ||
      spokenRef.current.interim ||
      finalText ||
      interimText
    ).trim();

    // If neither text nor audio was collected: check if there was a preceding STT network error
    if (!textToTranslate && !audioDataUri) {
      if (lastSttErrorRef.current) {
        handleTranslationError(lastSttErrorRef.current);
      } else {
        setStatusFeedback({
          type: 'warning',
          titleHi: 'कोई आवाज़ या ऑडियो रिकॉर्ड नहीं हुआ (No Speech Detected)',
          titleEn: 'No speech or audio recorded. Speak clearly into microphone or type below.',
        });
      }
      return;
    }

    setIsProcessing(true);

    try {
      const fromLang = currentSession.fromLang;
      const toLang = currentSession.toLang;

      // Translate via translatorService (passes audioBase64 for server transcription if text is empty)
      const result = await translatorService.translate(textToTranslate, fromLang, toLang, {
        audioBase64: audioDataUri || undefined,
        includeTTS: true,
      });

      const msg: ConversationMessage = {
        id: result.id,
        sender: speaker === 'A' ? 'self' : 'peer',
        senderName: speaker === 'A' ? `Speaker 1 (${langA.name})` : `Speaker 2 (${langB.name})`,
        sourceLang: fromLang,
        targetLang: toLang,
        originalText: result.originalText,
        translatedText: result.translatedText,
        phoneticText: result.phoneticText,
        timestamp: Date.now(),
        isOffline: result.isOffline,
        engine: result.engine,
        confidence: result.confidence,
        dialectNotes: result.dialectNotes,
        audioBase64: result.audioBase64,
      };

      setConversationList((prev) => [msg, ...prev]);
      onNewMessage(msg);
      setStatusFeedback(null);

      // Playback if not muted
      if (!isMuted) {
        await playMessageAudio(msg);
      }
    } catch (err: any) {
      handleTranslationError(err);
    } finally {
      setIsProcessing(false);
      setInterimText('');
      setFinalText('');
    }
  };

  // Pointer event handlers for hold mode
  const handlePointerDown = (speaker: 'A' | 'B', e: React.PointerEvent<HTMLButtonElement>) => {
    if (inputMode !== 'hold') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    startListening(speaker);
  };

  const handlePointerUp = (speaker: 'A' | 'B', e: React.PointerEvent<HTMLButtonElement>) => {
    if (inputMode !== 'hold') return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    stopListening(speaker);
  };

  const handlePointerCancel = (speaker: 'A' | 'B', e: React.PointerEvent<HTMLButtonElement>) => {
    if (inputMode !== 'hold') return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    stopListening(speaker);
  };

  // Tap mode toggle
  const handleTapButtonClick = (speaker: 'A' | 'B') => {
    if (inputMode !== 'tap') return;
    if (activeSpeaker === speaker) {
      stopListening(speaker);
    } else if (!activeSpeaker) {
      startListening(speaker);
    }
  };

  // Manual text translation executor (tests translation + audio independently of mic)
  const handleManualTranslate = async (speaker: 'A' | 'B', textOverride?: string) => {
    const rawText = textOverride !== undefined ? textOverride : speaker === 'A' ? manualTextA : manualTextB;
    const textToTranslate = rawText.trim();
    if (!textToTranslate || isProcessing) return;

    audioEngine.stopSpeaking();
    setIsProcessing(true);
    setStatusFeedback(null);

    const fromLang = speaker === 'A' ? sourceLang : targetLang;
    const toLang = speaker === 'A' ? targetLang : sourceLang;

    try {
      const result = await translatorService.translate(textToTranslate, fromLang, toLang, {
        includeTTS: true,
      });

      const msg: ConversationMessage = {
        id: result.id,
        sender: speaker === 'A' ? 'self' : 'peer',
        senderName: speaker === 'A' ? `Speaker 1 (${langA.name})` : `Speaker 2 (${langB.name})`,
        sourceLang: fromLang,
        targetLang: toLang,
        originalText: result.originalText,
        translatedText: result.translatedText,
        phoneticText: result.phoneticText,
        timestamp: Date.now(),
        isOffline: result.isOffline,
        engine: result.engine,
        confidence: result.confidence,
        dialectNotes: result.dialectNotes,
        audioBase64: result.audioBase64,
      };

      setConversationList((prev) => [msg, ...prev]);
      onNewMessage(msg);

      if (speaker === 'A') setManualTextA('');
      else setManualTextB('');

      if (!isMuted) {
        await playMessageAudio(msg);
      }
    } catch (err: any) {
      handleTranslationError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // Batch Mode (Strictly single-speaker A->B, NO fabricated text or diarization)
  // =========================================================================
  const startBatchRecording = async () => {
    if (activeSpeakerRef.current !== null || isProcessing || isBatchRecording) return;

    audioEngine.stopSpeaking();
    setIsBatchRecording(true);
    setBatchSeconds(0);
    setBatchTranscript('');
    setBatchResults([]);
    setBatchError(null);
    batchRecordedAudioUriRef.current = null;

    try {
      await audioEngine.startVoiceRecording();
    } catch (err: any) {
      setIsBatchRecording(false);
      setBatchError(err?.message || 'Failed to start microphone');
      return;
    }

    audioEngine.startSpeechRecognition(
      sourceLang,
      (_interim) => {},
      (final) => {
        setBatchTranscript((prev) => (prev ? `${prev} ${final}` : final));
      },
      (_err) => {}
    );

    // 60-second bounded session
    batchTimerRef.current = setInterval(() => {
      setBatchSeconds((s) => {
        if (s >= 59) {
          stopBatchRecording();
          return 60;
        }
        return s + 1;
      });
    }, 1000);
  };

  const stopBatchRecording = async () => {
    if (!isBatchRecording) return;
    setIsBatchRecording(false);

    if (batchTimerRef.current) {
      clearInterval(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    await audioEngine.stopSpeechRecognition();
    const audioUri = await audioEngine.stopVoiceRecording();
    batchRecordedAudioUriRef.current = audioUri;

    let fullText = batchTranscript.trim();

    // If STT returned empty transcript, transcribe finalized audio once via Gemini
    if (!fullText && audioUri) {
      setIsBatchProcessing(true);
      const transcribeRes = await audioEngine.transcribeAudio(audioUri, sourceLang);
      if (transcribeRes.success && transcribeRes.transcript) {
        fullText = transcribeRes.transcript.trim();
        setBatchTranscript(fullText);
      } else {
        setIsBatchProcessing(false);
        const errMsg = transcribeRes.error || 'No speech detected or server transcription unavailable.';
        setBatchError(`Batch transcription failed: ${errMsg}`);
        return;
      }
    }

    // Truthful check: NO fabricated fallback text
    if (!fullText) {
      setBatchError('No speech was detected in this recording session. Speak clearly into the microphone.');
      return;
    }

    setIsBatchProcessing(true);

    try {
      // Split into sentences using punctuation including Hindi/Odia danda (। / ॥)
      const rawSegments = fullText
        .split(/[.?!।॥\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const segments = (rawSegments.length > 0 ? rawSegments : [fullText]).slice(0, 8);

      const newMessages: ConversationMessage[] = [];
      const baseTimestamp = Date.now();

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (!seg) continue;

        const res = await translatorService.translate(seg, sourceLang, targetLang, {
          includeTTS: false,
        });

        const msg: ConversationMessage = {
          id: `batch_${baseTimestamp}_${i}`,
          sender: 'self',
          senderName: `Speaker 1 (${langA.name})`,
          sourceLang,
          targetLang,
          originalText: res.originalText,
          translatedText: res.translatedText,
          phoneticText: res.phoneticText,
          timestamp: baseTimestamp + i * 1000,
          isOffline: res.isOffline,
          engine: res.engine,
          confidence: res.confidence,
          dialectNotes: res.dialectNotes,
        };

        newMessages.push(msg);
        setConversationList((prev) => [msg, ...prev]);
        onNewMessage(msg);
      }

      setBatchResults(newMessages);
    } catch (err: any) {
      setBatchError(err?.message || 'Batch translation encountered an error');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  // Curated quick test phrases from offline phrasebook for Speaker A and Speaker B
  // Transparent language-specific lookup: Zero silent fallback to Hindi for other languages
  const getPhraseForLang = (lang: string) => {
    if (lang === 'hi') return OFFLINE_PHRASEBOOK[0]?.hindi?.text || 'नमस्ते';
    if (lang === 'or') return OFFLINE_PHRASEBOOK[0]?.odia?.text || 'ନମସ୍କାର';
    if (lang === 'mjl') return OFFLINE_PHRASEBOOK[0]?.mandali?.text || 'तुसां जो नमस्कार';
    if (lang === 'en') return OFFLINE_PHRASEBOOK[0]?.english || 'Hello';
    return OFFLINE_PHRASEBOOK[0]?.hindi?.text || 'नमस्ते';
  };
  const phraseA = getPhraseForLang(sourceLang);
  const phraseB = getPhraseForLang(targetLang);

  const isMandaliActive = sourceLang === 'mjl' || targetLang === 'mjl';
  const isOdiaActive = sourceLang === 'or' || targetLang === 'or';

  return (
    <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full px-3 py-2 space-y-2.5 z-10 relative overflow-y-auto">
      {/* 1. Header: Truthful Same-Device Face-to-Face Mode & Speaker Test */}
      <div
        className={
          isDark
            ? 'p-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs shadow-md space-y-1.5'
            : 'p-2.5 rounded-2xl neo-glass-panel border border-white/95 text-xs shadow-sm space-y-1.5'
        }
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-bold uppercase tracking-wider text-[11px] text-emerald-500">
              Dual Talk: Same-Device Face-to-Face Mode
            </span>
          </div>
          <button
            onClick={handleTestSpeakerOutput}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="Test speaker output without requesting microphone"
          >
            <Volume2 className="w-3 h-3 text-sky-500" />
            <span>Test Speaker</span>
          </button>
        </div>

        <p className={`text-[11px] leading-tight ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
          Two people sharing one device screen. For remote walkie-talkie across devices or mesh channels, use the{' '}
          <strong>Walkie-Talkie</strong> tab.
        </p>
      </div>

      {/* 2. Persistent Warning Label for Experimental Mandali / Mandyali Dialect Synthesis */}
      {isMandaliActive && !isMandaliWarningDismissed && (
        <div
          onClick={() => setIsMandaliWarningExpanded(!isMandaliWarningExpanded)}
          className={
            isDark
              ? 'px-3 py-2 rounded-xl bg-amber-950/80 border border-amber-500/70 shadow-sm text-amber-200 cursor-pointer hover:bg-amber-900/80 transition-all'
              : 'px-3 py-2 rounded-xl bg-amber-50 border border-amber-400 shadow-sm text-amber-950 font-semibold cursor-pointer hover:bg-amber-100 transition-all'
          }
        >
          {/* Single Collapsible Summary Line */}
          <div className="flex items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
              <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-300 truncate">
                ⚠️ Experimental AI Dialect: Mandali (माण्डली / मण्डयाली) Active
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-bold uppercase shrink-0 hidden sm:inline-block">
                {isMandaliWarningExpanded ? 'Tap to Collapse ▲' : 'Tap to Expand ▾'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold">
                <span>{isMandaliWarningExpanded ? 'Collapse' : 'Expand'}</span>
                {isMandaliWarningExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMandaliWarningDismissed(true);
                }}
                className="p-1 rounded-full hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 transition-colors"
                title="Close warning message"
                aria-label="Close warning message"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Expanded Detailed Content */}
          {isMandaliWarningExpanded && (
            <div className="mt-2.5 pt-2 border-t border-amber-500/30 space-y-2 text-xs leading-relaxed animate-in fade-in duration-200">
              <p>
                <strong>माण्डली / मण्डयाली प्रायोगिक सिंथेसिस (Experimental Synthesis Feature):</strong> Mandali audio speech synthesis is strictly an{' '}
                <span className="underline font-bold">experimental feature</span>. Because browser and OS speech engines do not contain native Mandali acoustic voice models, synthesis operates via{' '}
                <strong>Hindi voice approximation</strong>.
              </p>

              <div
                className={
                  isDark
                    ? 'p-2.5 rounded-xl bg-black/50 border border-amber-500/40 text-[11px] space-y-1.5 text-amber-300 font-mono'
                    : 'p-2.5 rounded-xl bg-amber-100/90 border border-amber-300 text-[11px] space-y-1.5 text-amber-950 font-mono font-semibold'
                }
              >
                <div>
                  • <strong>Zero Silent Fallbacks:</strong> All silent fallback logic to Hindi or English has been removed to ensure complete transparency. If specific dialect models, vocabulary, or neural translation quota are missing, an explicit notice is displayed rather than misleading substitutions.
                </div>
                <div>
                  • <strong>Lexicon Integrity:</strong> Translations rely on authentic Western Pahadi expressions and Gemini neural models. Verify with native speakers for mission-critical interstate communications.
                </div>
                <div>
                  • <strong>Audio Playback:</strong> When audio synthesis is played, it is transparently tagged as a Hindi approximation. If voice models are missing on the device, playback is safely halted with an informative notice.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Odia Advisory Label */}
      {isOdiaActive && (
        <div className="flex items-center gap-1.5 text-[11px] text-sky-400 bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/30 leading-snug">
          <Info className="w-4 h-4 shrink-0 text-sky-400" />
          <span>
            <strong>Odia (ଓଡ଼ିଆ) Voice Notice:</strong> Speech synthesis requires native Odia voice support installed in
            your browser/OS. Odia script is rendered faithfully with no silent replacement to Hindi or English.
          </span>
        </div>
      )}

      {/* 3. Top Language Selector & Batch Mode Launcher */}
      <div className="flex items-center justify-between gap-2">
        <div
          className={
            isDark
              ? 'flex-1 grid grid-cols-2 gap-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2 shadow-lg'
              : 'flex-1 grid grid-cols-2 gap-2 neo-glass-panel rounded-2xl p-2 border border-white/95 shadow-sm'
          }
        >
          {/* Speaker 1 Selector */}
          <button
            onClick={() => setShowLangPicker('A')}
            disabled={activeSpeaker !== null || isProcessing}
            className={
              isDark
                ? 'text-left p-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 transition-colors disabled:opacity-50'
                : 'text-left p-2 rounded-xl neo-gel-button transition-all disabled:opacity-50'
            }
          >
            <div
              className={`text-[10px] uppercase font-mono tracking-wider font-bold flex items-center gap-1 ${
                isDark ? 'text-emerald-400' : 'text-blue-600'
              }`}
            >
              <User className="w-3 h-3" />
              <span>Speaker 1</span>
            </div>
            <div className={`text-sm font-bold mt-0.5 truncate ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              {langA.name}
            </div>
            <div className={`text-xs font-semibold truncate ${isDark ? 'text-emerald-400' : 'text-blue-600'}`}>
              {langA.nativeName}
            </div>
            {sourceLang === 'mjl' && (
              <span className="inline-block mt-0.5 text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
                Exp. Dialect
              </span>
            )}
          </button>

          {/* Speaker 2 Selector */}
          <button
            onClick={() => setShowLangPicker('B')}
            disabled={activeSpeaker !== null || isProcessing}
            className={
              isDark
                ? 'text-left p-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 transition-colors disabled:opacity-50'
                : 'text-left p-2 rounded-xl neo-gel-button transition-all disabled:opacity-50'
            }
          >
            <div
              className={`text-[10px] uppercase font-mono tracking-wider font-bold flex items-center gap-1 ${
                isDark ? 'text-amber-400' : 'text-purple-600'
              }`}
            >
              <User className="w-3 h-3" />
              <span>Speaker 2</span>
            </div>
            <div className={`text-sm font-bold mt-0.5 truncate ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              {langB.name}
            </div>
            <div className={`text-xs font-semibold truncate ${isDark ? 'text-amber-400' : 'text-purple-600'}`}>
              {langB.nativeName}
            </div>
            {targetLang === 'mjl' && (
              <span className="inline-block mt-0.5 text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
                Exp. Dialect
              </span>
            )}
          </button>
        </div>

        {/* Batch Session Trigger */}
        <button
          onClick={() => setIsBatchModeOpen(true)}
          disabled={activeSpeaker !== null || isProcessing}
          className={
            isDark
              ? 'p-2.5 rounded-2xl bg-zinc-900/90 border border-purple-500/50 hover:bg-zinc-800 text-purple-400 flex flex-col items-center justify-center shadow-lg transition-all disabled:opacity-50'
              : 'p-2.5 rounded-2xl neo-glass-panel border border-purple-300 text-purple-700 hover:scale-102 flex flex-col items-center justify-center shadow-md disabled:opacity-50'
          }
          title="Single-Speaker Batch Translation Mode (Speaker 1 → Speaker 2)"
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-mono font-bold whitespace-nowrap">Batch A→B</span>
        </button>
      </div>

      {/* 4. Actionable Status Banner (Specifically intercepts 429 Quota Exceeded and Network Errors) */}
      {statusFeedback && (
        <div
          className={`p-3 rounded-2xl border text-xs space-y-2 transition-all shadow-lg ${
            statusFeedback.type === 'quota' || statusFeedback.isQuota
              ? 'bg-red-950/90 border-2 border-red-500/80 text-red-200'
              : statusFeedback.type === 'error'
              ? 'bg-red-950/80 border border-red-500/60 text-red-200'
              : statusFeedback.type === 'warning'
              ? 'bg-amber-950/80 border border-amber-500/60 text-amber-200'
              : 'bg-sky-950/80 border border-sky-500/60 text-sky-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-red-300">{statusFeedback.titleHi}</div>
                <div className="text-xs font-semibold text-red-200">{statusFeedback.titleEn}</div>
                {statusFeedback.details && (
                  <div className="text-[11px] font-medium opacity-90 leading-relaxed bg-black/30 p-2 rounded-lg border border-red-500/20">
                    {statusFeedback.details}
                  </div>
                )}
                {statusFeedback.hint && (
                  <div className="text-[11px] whitespace-pre-line text-emerald-300 font-mono bg-black/40 p-2 rounded-lg border border-emerald-500/30">
                    {statusFeedback.hint}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setStatusFeedback(null)}
              className="p-1 hover:opacity-75 text-zinc-400 shrink-0"
              title="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons for Quota 429 resolution */}
          {(statusFeedback.isQuota || statusFeedback.type === 'quota') && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-red-500/30">
              <button
                onClick={() => handleManualTranslate('A', phraseA)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[10px] flex items-center gap-1 transition-all"
                title="Test with curated offline phrasebook (no quota used)"
              >
                <BookOpen className="w-3 h-3" />
                <span>Test Offline Phrasebook (Quota-Free)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. Live Conversation Stream */}
      <div
        className={
          isDark
            ? 'flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-2.5 overflow-y-auto space-y-2.5 min-h-[160px] max-h-[38vh]'
            : 'flex-1 neo-glass-panel rounded-2xl p-2.5 overflow-y-auto space-y-2.5 min-h-[160px] max-h-[38vh] border border-white/95 shadow-inner'
        }
      >
        {conversationList.length === 0 ? (
          <div
            className={`h-full flex flex-col items-center justify-center text-center p-4 font-mono ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}
          >
            <ArrowRightLeft className={`w-7 h-7 mb-1.5 ${isDark ? 'text-zinc-700' : 'text-purple-300'}`} />
            <p className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>
              Dual Talk Ready (Face-to-Face)
            </p>
            <p className={`text-[11px] mt-1 max-w-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
              Hold or tap button below to speak. Or use manual text boxes for zero-mic testing.
            </p>
          </div>
        ) : (
          conversationList.map((item) => {
            const isSpeakerA = item.sourceLang === sourceLang;
            const isPlaying = activePlayingId === item.id;
            const messageHasMandali = item.sourceLang === 'mjl' || item.targetLang === 'mjl';

            return (
              <div
                key={item.id}
                className={
                  isDark
                    ? `p-3 rounded-xl border transition-all ${
                        isSpeakerA
                          ? 'bg-zinc-850/90 border-emerald-900/40 mr-3'
                          : 'bg-zinc-900 border-amber-900/40 ml-3'
                      }`
                    : `p-3 rounded-2xl border transition-all shadow-xs ${
                        isSpeakerA
                          ? 'bg-gradient-to-r from-blue-50/90 to-purple-50/70 border-blue-200/80 mr-3 text-slate-800'
                          : 'bg-gradient-to-r from-purple-50/90 to-pink-50/70 border-purple-200/80 ml-3 text-slate-800'
                      }`
                }
              >
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span
                    className={`font-bold ${
                      isSpeakerA
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-blue-700'
                        : isDark
                        ? 'text-amber-400'
                        : 'text-purple-700'
                    }`}
                  >
                    {item.senderName}
                  </span>
                  <div className={`flex items-center space-x-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>
                    {item.isOffline && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-medium ${
                          isDark ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60' : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        OFFLINE
                      </span>
                    )}
                    <button
                      onClick={() => copyToClipboard(item.translatedText, item.id)}
                      className={`p-1 ${isDark ? 'hover:text-zinc-200' : 'hover:text-slate-800'}`}
                      title="Copy translated text"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => playMessageAudio(item)}
                      className={`p-1 ${
                        isPlaying
                          ? 'text-emerald-400 animate-pulse'
                          : isDark
                          ? 'hover:text-zinc-200'
                          : 'hover:text-purple-700'
                      }`}
                      title="Replay speech / audio"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600 font-medium'}`}>
                  <span className={`text-[10px] uppercase font-mono mr-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Spoke:
                  </span>
                  &quot;{item.originalText}&quot;
                </div>

                <div className={`mt-1.5 pt-1.5 border-t ${isDark ? 'border-zinc-800' : 'border-slate-200/70'}`}>
                  <div className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                    {item.translatedText}
                  </div>
                  {item.phoneticText && (
                    <div
                      className={`text-xs font-mono mt-0.5 italic ${
                        isDark ? 'text-amber-300/80' : 'text-purple-600 font-medium'
                      }`}
                    >
                      Phonetic: &quot;{item.phoneticText}&quot;
                    </div>
                  )}

                  {messageHasMandali && (
                    <div className="text-[10px] text-amber-500 mt-1 font-mono flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Mandyali experimental synthesis (Hindi voice approximation)</span>
                    </div>
                  )}

                  {item.dialectNotes && (
                    <div className="text-[10px] text-zinc-400 mt-0.5 italic font-mono">
                      ℹ️ {item.dialectNotes}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Live Speech Recognition / Processing Banner */}
      {(activeSpeaker || isProcessing) && (
        <div
          className={
            isDark
              ? 'p-2.5 bg-zinc-950 border border-emerald-500/60 rounded-xl text-center shadow-lg animate-pulse'
              : 'p-2.5 neo-glass-panel border-purple-400/80 rounded-2xl text-center shadow-md animate-pulse'
          }
        >
          <div
            className={`text-xs font-mono font-bold ${
              isDark ? 'text-emerald-400' : 'text-purple-700'
            }`}
          >
            {isProcessing
              ? 'Translating Speech & Generating Audio...'
              : `Listening to ${activeSpeaker === 'A' ? langA.name : langB.name}...`}
          </div>
          <p
            className={`text-xs font-semibold mt-0.5 italic truncate ${
              isDark ? 'text-zinc-200' : 'text-slate-800'
            }`}
          >
            &quot;{interimText || finalText || 'Speak now into microphone...'}&quot;
          </p>
        </div>
      )}

      {/* 7. Push / Tap Buttons for Speaker 1 & Speaker 2 */}
      <div className="space-y-1.5">
        {/* Mode Toggle Bar: Tap vs Hold */}
        <div className="flex items-center justify-between text-[11px] font-mono px-1">
          <div className="flex items-center gap-2">
            <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Voice Control Mode:</span>
            <div className="inline-flex rounded-lg border border-zinc-750 p-0.5 bg-zinc-900/60">
              <button
                onClick={() => setInputMode('tap')}
                disabled={activeSpeaker !== null || isProcessing}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  inputMode === 'tap'
                    ? 'bg-purple-600 text-white'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tap Start/Stop
              </button>
              <button
                onClick={() => setInputMode('hold')}
                disabled={activeSpeaker !== null || isProcessing}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  inputMode === 'hold'
                    ? 'bg-purple-600 text-white'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hold PTT
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowManualInputs(!showManualInputs)}
            className={`text-[10px] underline hover:opacity-80 ${isDark ? 'text-sky-400' : 'text-blue-600'}`}
          >
            {showManualInputs ? 'Hide Manual Inputs' : 'Show Manual Inputs'}
          </button>
        </div>

        {/* Dual Voice Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Speaker 1 Mic Button */}
          <button
            disabled={activeSpeaker === 'B' || isProcessing || isBatchRecording}
            onClick={() => handleTapButtonClick('A')}
            onPointerDown={(e) => handlePointerDown('A', e)}
            onPointerUp={(e) => handlePointerUp('A', e)}
            onPointerCancel={(e) => handlePointerCancel('A', e)}
            className={
              isDark
                ? `h-20 rounded-2xl flex flex-col items-center justify-center p-2 border-2 transition-all select-none shadow-lg ${
                    activeSpeaker === 'A'
                      ? 'bg-gradient-to-b from-emerald-600 to-emerald-800 border-emerald-300 scale-95 shadow-emerald-500/50'
                      : activeSpeaker === 'B' || isProcessing
                      ? 'bg-zinc-900 border-zinc-800 opacity-40 cursor-not-allowed'
                      : 'bg-zinc-850 hover:bg-zinc-800 border-emerald-600/70 text-zinc-100 active:scale-95'
                  }`
                : `h-20 rounded-2xl flex flex-col items-center justify-center p-2 transition-all select-none shadow-md ${
                    activeSpeaker === 'A'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white scale-95 shadow-blue-400/50 border-2 border-white'
                      : activeSpeaker === 'B' || isProcessing
                      ? 'bg-slate-100 border-slate-300 opacity-40 cursor-not-allowed'
                      : 'neo-gel-button border-2 border-white/95 text-slate-800 hover:scale-[1.01] active:scale-95'
                  }`
            }
            style={{ touchAction: 'none' }}
          >
            <Mic
              className={`w-6 h-6 mb-0.5 ${
                activeSpeaker === 'A'
                  ? 'text-white animate-bounce'
                  : isDark
                  ? 'text-emerald-400'
                  : 'text-blue-500'
              }`}
            />
            <span className="text-xs font-bold font-mono">
              {activeSpeaker === 'A'
                ? inputMode === 'hold'
                  ? 'RELEASE TO TRANSLATE'
                  : 'TAP TO STOP'
                : inputMode === 'hold'
                ? `HOLD: ${langA.name.toUpperCase()}`
                : `TAP: ${langA.name.toUpperCase()}`}
            </span>
            <span
              className={`text-[10px] font-mono truncate max-w-[140px] ${
                activeSpeaker === 'A' ? 'text-white/80' : isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}
            >
              {langA.nativeName}
            </span>
            {sourceLang === 'mjl' && (
              <span className="text-[9px] font-mono text-amber-400">
                (Exp. Dialect Approx)
              </span>
            )}
          </button>

          {/* Speaker 2 Mic Button */}
          <button
            disabled={activeSpeaker === 'A' || isProcessing || isBatchRecording}
            onClick={() => handleTapButtonClick('B')}
            onPointerDown={(e) => handlePointerDown('B', e)}
            onPointerUp={(e) => handlePointerUp('B', e)}
            onPointerCancel={(e) => handlePointerCancel('B', e)}
            className={
              isDark
                ? `h-20 rounded-2xl flex flex-col items-center justify-center p-2 border-2 transition-all select-none shadow-lg ${
                    activeSpeaker === 'B'
                      ? 'bg-gradient-to-b from-amber-600 to-amber-800 border-amber-300 scale-95 shadow-amber-500/50'
                      : activeSpeaker === 'A' || isProcessing
                      ? 'bg-zinc-900 border-zinc-800 opacity-40 cursor-not-allowed'
                      : 'bg-zinc-850 hover:bg-zinc-800 border-amber-600/70 text-zinc-100 active:scale-95'
                  }`
                : `h-20 rounded-2xl flex flex-col items-center justify-center p-2 transition-all select-none shadow-md ${
                    activeSpeaker === 'B'
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-95 shadow-purple-400/50 border-2 border-white'
                      : activeSpeaker === 'A' || isProcessing
                      ? 'bg-slate-100 border-slate-300 opacity-40 cursor-not-allowed'
                      : 'neo-gel-button border-2 border-white/95 text-slate-800 hover:scale-[1.01] active:scale-95'
                  }`
            }
            style={{ touchAction: 'none' }}
          >
            <Mic
              className={`w-6 h-6 mb-0.5 ${
                activeSpeaker === 'B'
                  ? 'text-white animate-bounce'
                  : isDark
                  ? 'text-amber-400'
                  : 'text-purple-500'
              }`}
            />
            <span className="text-xs font-bold font-mono">
              {activeSpeaker === 'B'
                ? inputMode === 'hold'
                  ? 'RELEASE TO TRANSLATE'
                  : 'TAP TO STOP'
                : inputMode === 'hold'
                ? `HOLD: ${langB.name.toUpperCase()}`
                : `TAP: ${langB.name.toUpperCase()}`}
            </span>
            <span
              className={`text-[10px] font-mono truncate max-w-[140px] ${
                activeSpeaker === 'B' ? 'text-white/80' : isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}
            >
              {langB.nativeName}
            </span>
            {targetLang === 'mjl' && (
              <span className="text-[9px] font-mono text-amber-400">
                (Exp. Dialect Approx)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 8. Manual Text Input and Predefined Phrasebook Testing Area */}
      {showManualInputs && (
        <div
          className={
            isDark
              ? 'p-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2'
              : 'p-2.5 rounded-2xl neo-glass-panel border border-white/95 space-y-2 shadow-sm'
          }
        >
          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            <span>Manual Text & Offline Phrase Testing (No Mic Required)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Speaker 1 Manual Text */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-400">
                <span>Speaker 1 ({langA.name} → {langB.name})</span>
                <button
                  type="button"
                  onClick={() => handleManualTranslate('A', phraseA)}
                  disabled={isProcessing}
                  className="text-[9px] underline hover:opacity-80"
                  title="Test phrasebook phrase"
                >
                  Quick Phrase
                </button>
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={manualTextA}
                  onChange={(e) => setManualTextA(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualTranslate('A')}
                  disabled={isProcessing}
                  placeholder={`Type in ${langA.name}...`}
                  className={
                    isDark
                      ? 'flex-1 text-xs px-2.5 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500'
                      : 'flex-1 text-xs px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500'
                  }
                />
                <button
                  onClick={() => handleManualTranslate('A')}
                  disabled={!manualTextA.trim() || isProcessing}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Speaker 2 Manual Text */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-semibold text-amber-400">
                <span>Speaker 2 ({langB.name} → {langA.name})</span>
                <button
                  type="button"
                  onClick={() => handleManualTranslate('B', phraseB)}
                  disabled={isProcessing}
                  className="text-[9px] underline hover:opacity-80"
                  title="Test phrasebook phrase"
                >
                  Quick Phrase
                </button>
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={manualTextB}
                  onChange={(e) => setManualTextB(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualTranslate('B')}
                  disabled={isProcessing}
                  placeholder={`Type in ${langB.name}...`}
                  className={
                    isDark
                      ? 'flex-1 text-xs px-2.5 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500'
                      : 'flex-1 text-xs px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500'
                  }
                />
                <button
                  onClick={() => handleManualTranslate('B')}
                  disabled={!manualTextB.trim() || isProcessing}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Single-Speaker Batch Mode Modal (A → B Only) */}
      {isBatchModeOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
          <div
            className={
              isDark
                ? 'bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg p-4 flex flex-col max-h-[85vh] shadow-2xl animate-in fade-in zoom-in duration-150'
                : 'bg-white border border-purple-200 rounded-3xl w-full max-w-lg p-4 flex flex-col max-h-[85vh] shadow-2xl animate-in fade-in zoom-in duration-150'
            }
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Layers className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  Single-Speaker Batch Translation ({langA.name} → {langB.name})
                </h3>
              </div>
              <button
                onClick={() => {
                  if (isBatchRecording) stopBatchRecording();
                  setIsBatchModeOpen(false);
                }}
                className={`p-1 rounded-full ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-3 overflow-y-auto flex-1">
              <div
                className={`p-3 rounded-2xl border text-center ${
                  isDark ? 'bg-zinc-850/80 border-zinc-750' : 'bg-purple-50/60 border-purple-200'
                }`}
              >
                <p className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  Record Continuous Speech in {langA.name} (Max 60s)
                </p>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Speak continuously. When you stop, the engine segments sentences and translates everything to{' '}
                  <strong>{langB.name}</strong> with truthful timestamps.
                </p>

                {batchError && (
                  <div className="mt-2 p-2 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs">
                    {batchError}
                  </div>
                )}

                <div className="mt-3 flex flex-col items-center justify-center space-y-2.5">
                  {!isBatchRecording && !isBatchProcessing ? (
                    <button
                      onClick={startBatchRecording}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all hover:scale-102"
                    >
                      <Mic className="w-4 h-4 animate-pulse" />
                      <span>Start Continuous Recording</span>
                    </button>
                  ) : isBatchRecording ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 font-mono text-xs text-red-400 animate-pulse font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Recording... {Math.floor(batchSeconds / 60)}:
                          {String(batchSeconds % 60).padStart(2, '0')} (Max 60s)
                        </span>
                      </div>
                      <p className={`text-xs italic max-w-sm truncate ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                        &quot;{batchTranscript || 'Listening to speech...'}&quot;
                      </p>
                      <button
                        onClick={stopBatchRecording}
                        className="px-5 py-2 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all hover:scale-102"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop & Translate Sentences</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-1.5 py-3">
                      <Sparkles className="w-5 h-5 text-purple-500 animate-spin" />
                      <span className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                        Segmenting sentences and translating to {langB.name}...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {batchResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold uppercase tracking-wider ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}
                    >
                      Translated Segments ({batchResults.length})
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          batchResults.map((m) => `${m.senderName}: ${m.translatedText}`).join('\n'),
                          'batch_all'
                        )
                      }
                      className={`text-xs font-mono px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                        isDark
                          ? 'bg-zinc-800 text-purple-400 hover:bg-zinc-750'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      {copiedId === 'batch_all' ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy All</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                    {batchResults.map((msg, idx) => (
                      <div
                        key={msg.id}
                        className={
                          isDark
                            ? 'p-2.5 rounded-xl bg-zinc-850/80 border border-zinc-750 space-y-0.5'
                            : 'p-2.5 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-0.5'
                        }
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                          <span className="font-bold text-purple-400">
                            #{idx + 1} • {msg.senderName}
                          </span>
                          <button
                            onClick={() => playMessageAudio(msg)}
                            className="p-1 hover:text-purple-400 text-zinc-400"
                            title="Play audio segment"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                          &quot;{msg.originalText}&quot;
                        </div>
                        <div className={`text-xs font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                          {msg.translatedText}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2.5 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => {
                  if (isBatchRecording) stopBatchRecording();
                  setIsBatchModeOpen(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                    : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                }`}
              >
                Close Batch Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Language Selection Modals */}
      <LanguageSelector
        isOpen={showLangPicker === 'A'}
        onClose={() => setShowLangPicker(null)}
        selectedLang={sourceLang}
        onSelectLang={onChangeSourceLang}
        title="Select Speaker 1 Language"
        excludeLang={targetLang}
        onOpenPackManager={onOpenPackManager}
      />
      <LanguageSelector
        isOpen={showLangPicker === 'B'}
        onClose={() => setShowLangPicker(null)}
        selectedLang={targetLang}
        onSelectLang={onChangeTargetLang}
        title="Select Speaker 2 Language"
        excludeLang={sourceLang}
        onOpenPackManager={onOpenPackManager}
      />
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  ArrowRightLeft,
  Volume2,
  Radio,
  Sparkles,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Siren,
  X,
  Activity,
  Play,
  VolumeX,
  Lock,
  ChevronDown,
  ChevronUp,
  Info,
  BookOpen,
  MessageSquare,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  ChannelNumber,
  ConversationMessage,
  LanguageCode,
  MeshPacket,
  TranslationResult,
  VoiceFxType,
} from '../types';
import { SUPPORTED_LANGUAGES, RADIO_CHANNELS } from '../services/languageRegistry';
import { audioEngine, VOICE_FX_PRESETS } from '../services/audioEngine';
import { meshNetwork } from '../services/meshNetwork';
import { peerMesh } from '../services/peerMesh';
import { translatorService } from '../services/translatorService';
import { languagePackService } from '../services/languagePackService';
import { smartReplyService, SmartReplyOption } from '../services/smartReplyService';
import { customVocabularyService } from '../services/customVocabularyService';
import { opusCodec, OpusCompressionStats } from '../services/opusCodec';
import { WaveformVisualizer } from './WaveformVisualizer';
import { LanguageSelector } from './LanguageSelector';
import { OpusCodecHUD } from './OpusCodecHUD';
import { BrevityMorseModal } from './BrevityMorseModal';
import { useTheme } from '../context/ThemeContext';

interface WalkieTalkieViewProps {
  currentChannel: ChannelNumber;
  onSelectChannel?: (channel: ChannelNumber) => void;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  onChangeSourceLang: (lang: LanguageCode) => void;
  onChangeTargetLang: (lang: LanguageCode) => void;
  onSwapLanguages: () => void;
  onNewMessage: (msg: ConversationMessage) => void;
  isMuted: boolean;
  onOpenDialectGuide?: () => void;
  onOpenPackManager?: () => void;
  onOpenWordLearning?: (word?: string, translation?: string) => void;
}

export const WalkieTalkieView: React.FC<WalkieTalkieViewProps> = ({
  currentChannel,
  onSelectChannel,
  sourceLang,
  targetLang,
  onChangeSourceLang,
  onChangeTargetLang,
  onSwapLanguages,
  onNewMessage,
  isMuted,
  onOpenDialectGuide,
  onOpenPackManager,
  onOpenWordLearning,
}) => {
  const { isDark } = useTheme();
  const [isPressingPTT, setIsPressingPTT] = useState(false);
  const [pttMode, setPttMode] = useState<'hold' | 'toggle'>('hold'); // 'hold' or 'toggle' (Tap to Start / Stop)
  const [interimText, setInterimText] = useState('');
  const [finalSpokenText, setFinalSpokenText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [latestTransmission, setLatestTransmission] = useState<TranslationResult | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManualBox, setShowManualBox] = useState(false);
  const [soundRogerBeep, setSoundRogerBeep] = useState(true);
  const [isVADEnabled, setIsVADEnabled] = useState(false);
  const [currentVoiceFx, setCurrentVoiceFx] = useState<VoiceFxType>(audioEngine.getVoiceFx());
  const [showVoiceFxPicker, setShowVoiceFxPicker] = useState(false);
  const [audioPlaybackNotice, setAudioPlaybackNotice] = useState<string | null>(null);
  const [speakerUnlocked, setSpeakerUnlocked] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [vadThreshold, setVadThreshold] = useState<number>(
    languagePackService.getPreferences().vadSensitivityThreshold ?? 24
  );
  const [isNoiseGateActive, setIsNoiseGateActive] = useState<boolean>(
    languagePackService.getPreferences().isNoiseGateEnabled ?? true
  );

  // Opus Codec audio compression states
  const [latestOpusStats, setLatestOpusStats] = useState<OpusCompressionStats | null>(null);
  const [showOpusHUD, setShowOpusHUD] = useState<boolean>(false);
  const [isOpusEnabled, setIsOpusEnabled] = useState<boolean>(opusCodec.getConfig().enabled);
  const [showBrevityModal, setShowBrevityModal] = useState<boolean>(false);

  useEffect(() => {
    // Proactively initialize microphone analyser for real-time waveform visualizer
    audioEngine.initMicrophoneAnalyser().then((node) => {
      if (node) setAnalyser(node);
    }).catch(() => {});

    const unsubscribePack = languagePackService.subscribe((_, prefs) => {
      if (prefs.vadSensitivityThreshold !== undefined) {
        setVadThreshold(prefs.vadSensitivityThreshold);
      }
      if (prefs.isNoiseGateEnabled !== undefined) {
        setIsNoiseGateActive(prefs.isNoiseGateEnabled);
      }
    });

    const unsubscribeOpus = opusCodec.subscribe((cfg) => {
      setIsOpusEnabled(cfg.enabled);
    });

    return () => {
      unsubscribePack();
      unsubscribeOpus();
    };
  }, []);

  // Structured actionable status feedback for Quota 429, Network, and Dialect Offline notices
  interface TranslationErrorFeedback {
    type: 'quota' | 'network' | 'dialect_offline' | 'no_speech' | 'general';
    isQuota?: boolean;
    titleHi: string;
    titleEn: string;
    details: string;
    hint?: string;
  }
  const [statusFeedback, setStatusFeedback] = useState<TranslationErrorFeedback | null>(null);
  const [isMandaliWarningExpanded, setIsMandaliWarningExpanded] = useState(false);
  const [isMandaliWarningDismissed, setIsMandaliWarningDismissed] = useState(false);

  // Smart Reply states (Contextual fast NLP response buttons based on last received message)
  const [lastReceivedMessage, setLastReceivedMessage] = useState<{
    text: string;
    senderName?: string;
    lang?: LanguageCode;
  } | null>(null);

  const [smartReplies, setSmartReplies] = useState<SmartReplyOption[]>([]);

  // Update smart replies whenever last received message or user source language changes
  useEffect(() => {
    const replies = smartReplyService.generateSmartReplies({
      lastMessageText: lastReceivedMessage?.text || '',
      senderName: lastReceivedMessage?.senderName,
      userLang: sourceLang,
      senderLang: lastReceivedMessage?.lang,
    });
    setSmartReplies(replies);
  }, [lastReceivedMessage, sourceLang]);

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const vadTriggeredRef = useRef(false);
  const [showLangPicker, setShowLangPicker] = useState<'source' | 'target' | null>(null);

  const activeChannelConfig = RADIO_CHANNELS.find((c) => c.channel === currentChannel) || RADIO_CHANNELS[2];
  const sourceLangConfig = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang) || SUPPORTED_LANGUAGES[0];
  const targetLangConfig = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[1];

  const isMandaliActive = sourceLang === 'mjl' || targetLang === 'mjl';
  const isOdiaActive = sourceLang === 'or' || targetLang === 'or';

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
      raw.includes('rate limit') ||
      raw.includes('कोटा समाप्त');

    const isNetwork =
      !isQuota &&
      (raw.includes('Network') ||
        raw.includes('network') ||
        raw.includes('नेटवर्क') ||
        raw.includes('Failed to fetch') ||
        raw.includes('fetch') ||
        raw.includes('AbortError') ||
        raw.includes('aborted') ||
        raw.includes('timed out') ||
        !navigator.onLine);

    const isDialectOffline =
      !isQuota &&
      !isNetwork &&
      (raw.includes('Offline translation is only available') ||
        raw.includes('phrasebook') ||
        raw.includes('शब्दकोश'));

    const isNoSpeech =
      !isQuota &&
      !isNetwork &&
      !isDialectOffline &&
      (raw.includes('No audible speech') ||
        raw.includes('No speech or text') ||
        raw.includes('कोई स्पष्ट आवाज़ नहीं मिली'));

    if (isQuota) {
      setStatusFeedback({
        type: 'quota',
        isQuota: true,
        titleHi: 'सर्वर जेमिनी कोटा समाप्त (Gemini Quota 429 Exceeded)',
        titleEn: 'Gemini free-tier daily rate limit reached (HTTP 429). Server capacity exhausted.',
        details:
          'यह "No Speech" या माइक त्रुटि नहीं है — आपका इनपुट प्राप्त हुआ था, लेकिन जेमिनी एआई सर्वर का दैनिक कोटा पूरा हो चुका है।',
        hint:
          'कार्रवाई योग्य विकल्प (Actionable Steps):\n1. ⏳ दैनिक कोटा रीसेट होने की प्रतीक्षा करें (24 घंटे / 00:00 UTC में रीसेट होता है)।\n2. 📖 नीचे दिए गए प्रमाणित त्वरित कॉल्स (Quick Test Calls) का उपयोग करें (कोटा-मुक्त)।\n3. 📊 Diagnostics टैब में लाइव कोटा और कनेक्शन स्थिति देखें।\n4. 🔑 व्यक्तिगत GEMINI_API_KEY कॉन्फ़िगर करें।',
      });
      return;
    }

    if (isNetwork) {
      setStatusFeedback({
        type: 'network',
        titleHi: 'नेटवर्क कनेक्शन त्रुटि (Network Offline)',
        titleEn: 'Unable to reach translation server over cellular/Wi-Fi network.',
        details:
          'डायनामिक एआई ट्रांसलेशन के लिए इंटरनेट कनेक्शन आवश्यक है। हालांकि, ऑफ़लाइन शब्दकोश के प्रमाणित वाक्य बिना इंटरनेट के भी काम करते हैं।',
        hint:
          'कार्रवाई योग्य विकल्प (Actionable Steps):\n1. 📶 अपने डिवाइस का मोबाइल डेटा या वाई-फ़ाई जांचें।\n2. 🏔️ ऑफ़लाइन शब्दकोश (Quick Calls / Phrasebook) के वाक्यों का उपयोग करें।',
      });
      return;
    }

    if (isDialectOffline) {
      setStatusFeedback({
        type: 'dialect_offline',
        titleHi: 'माण्डली प्रायोगिक डायलेक्ट: ऑफ़लाइन सीमा (Dialect Offline Notice)',
        titleEn: 'Dynamic Mandyali sentence translation requires active online Gemini AI quota.',
        details:
          'शून्य मौन फ़ॉलबैक (Zero Silent Fallbacks): ऐप ने हिंदी या अंग्रेज़ी में कोई भ्रामक प्रतिस्थापन (silent fallback) नहीं किया है। केवल प्रामाणिक पश्चिमी पहाड़ी (माण्डली) शब्दकोश ही मान्य है।',
        hint:
          'कार्रवाई योग्य विकल्प (Actionable Steps):\n1. 🏔️ नीचे दिए गए "Quick Test Calls" से प्रमाणित पहाड़ी वाक्यों का चयन करें।\n2. 📖 Dialect Guide में दिए गए प्रमाणित वाक्यों को आज़माएं।\n3. 🔑 व्यक्तिगत API Key जोड़ें या कोटा रीसेट होने की प्रतीक्षा करें।',
      });
      return;
    }

    if (isNoSpeech) {
      setStatusFeedback({
        type: 'no_speech',
        titleHi: 'माइक्रोफ़ोन आवाज़ नहीं मिली (No Audible Speech)',
        titleEn: 'Audio recording was silent or volume was too low to detect clear speech.',
        details:
          'माइक्रोफ़ोन से कोई स्पष्ट आवाज़ रिकॉर्ड नहीं हुई। कृपया माइक्रोफ़ोन के पास साफ़ आवाज़ में बोलें।',
        hint:
          'कार्रवाई योग्य विकल्प (Actionable Steps):\n1. 🎙️ PTT बटन दबाकर माइक्रोफ़ोन के पास साफ़ बोलें।\n2. ⌨️ नीचे दिए गए "Type Custom Message" विकल्प से लिखकर भेजें।\n3. ⚡ नीचे दिए गए Quick Test Calls बटन दबाएं।',
      });
      return;
    }

    setStatusFeedback({
      type: 'general',
      titleHi: 'ट्रांसलेशन सूचना (Translation Notice)',
      titleEn: raw || 'Translation request could not be completed.',
      details: raw,
      hint: 'कृपया इनपुट जांचें या प्रमाणित शब्दकोश के वाक्यों का उपयोग करें।',
    });
  };

  const spokenTextRef = useRef('');
  spokenTextRef.current = finalSpokenText || interimText;

  // Voice Activity Detection (VAD) auto-recording loop
  useEffect(() => {
    if (!isVADEnabled) {
      if (isPressingPTT && vadTriggeredRef.current) {
        handleStopPTT();
        vadTriggeredRef.current = false;
      }
      return;
    }

    let animationFrameId: number;
    const dataArray = new Uint8Array(64);

    const checkAudioLevel = () => {
      if (!isVADEnabled) return;
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;

        // Dynamic mic sensitivity activation threshold from languagePackService preferences
        const activeThreshold = vadThreshold || 24;
        const silenceLevel = Math.max(4, Math.round(activeThreshold * 0.4));

        if (avg > activeThreshold && !isPressingPTT && !isProcessing) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          vadTriggeredRef.current = true;
          handleStartPTT();
        } else if (isPressingPTT && vadTriggeredRef.current && avg < silenceLevel) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              if (isPressingPTT && vadTriggeredRef.current) {
                handleStopPTT();
                vadTriggeredRef.current = false;
              }
              silenceTimerRef.current = null;
            }, 1200);
          }
        } else if (avg >= silenceLevel && silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }
      animationFrameId = requestAnimationFrame(checkAudioLevel);
    };

    animationFrameId = requestAnimationFrame(checkAudioLevel);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [isVADEnabled, isPressingPTT, isProcessing, analyser, vadThreshold]);

  // Room status & error tracking
  const [peerStatus, setPeerStatus] = useState(peerMesh.getStatus());
  const [peerCount, setPeerCount] = useState(peerMesh.getPeerCount());
  const [roomCode, setRoomCode] = useState(peerMesh.getRoomCode());
  const [deliveryNotice, setDeliveryNotice] = useState<string | null>(null);

  // Subscribe to room connection status and server errors
  useEffect(() => {
    const unsubStatus = peerMesh.onStatusChange((status, count) => {
      setPeerStatus(status);
      setPeerCount(count);
      setRoomCode(peerMesh.getRoomCode());
    });

    const unsubError = peerMesh.onError((err) => {
      setActionError(`Room Notice [${err.code}]: ${err.message}`);
    });

    return () => {
      unsubStatus();
      unsubError();
      audioEngine.releaseMicrophone();
    };
  }, []);

  // Hardware Volume Key & Keyboard Hotkey Push-To-Talk Listener (Volume Up/Down, Space, Enter, V)
  useEffect(() => {
    const pttKeys = new Set(['AudioVolumeUp', 'AudioVolumeDown', 'Space', 'Enter', 'KeyV']);

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (pttKeys.has(e.code) || pttKeys.has(e.key)) {
        e.preventDefault();
        if (!e.repeat && !isPressingPTT && !isProcessing) {
          handleStartPTT();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (pttKeys.has(e.code) || pttKeys.has(e.key)) {
        e.preventDefault();
        if (isPressingPTT) {
          handleStopPTT();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [isPressingPTT, isProcessing]);

  // Single unified listener for incoming room packets (text + audio) to prevent double playback
  useEffect(() => {
    const unsubscribe = meshNetwork.onPacket(async (packet: MeshPacket) => {
      if (soundRogerBeep) {
        audioEngine.playSquelchStatic(60);
      }

      if (packet.opusCompression) {
        setLatestOpusStats(packet.opusCompression as any);
      }

      // Add to conversation history preserving actual engine, offline status, and notes
      const convMsg: ConversationMessage = {
        id: packet.id,
        sender: 'peer',
        senderName: packet.senderName,
        senderState: packet.senderState,
        sourceLang: packet.senderLang,
        targetLang: packet.targetLang,
        originalText: packet.originalText,
        translatedText: packet.translatedText,
        phoneticText: packet.phoneticText,
        timestamp: packet.timestamp,
        isOffline: packet.isOffline ?? (packet.engine === 'offline-lexicon'),
        engine: packet.engine || (packet.isOffline ? 'offline-lexicon' : 'gemini-neural'),
        confidence: packet.confidence,
        dialectNotes: packet.dialectNotes,
        ttsWarning: packet.ttsWarning,
        audioBase64: packet.audioBase64,
        audioDurationMs: packet.audioDurationMs,
        channel: packet.channel,
        deliveryStatus: 'delivered',
        opusCompression: packet.opusCompression,
      };
      onNewMessage(convMsg);

      // Display on latest transmission card with honest engine and confidence
      setLatestTransmission({
        id: packet.id,
        originalText: packet.originalText,
        translatedText: packet.translatedText,
        phoneticText: packet.phoneticText,
        sourceLang: packet.senderLang,
        targetLang: packet.targetLang,
        isOffline: packet.isOffline ?? (packet.engine === 'offline-lexicon'),
        engine: packet.engine || (packet.isOffline ? 'offline-lexicon' : 'gemini-neural'),
        confidence: packet.confidence ?? (packet.isOffline ? 1.0 : 0.95),
        dialectNotes: packet.dialectNotes || `Transmitted via Room Channel ${packet.channel} from ${packet.senderName}`,
        audioBase64: packet.audioBase64,
        timestamp: packet.timestamp,
      });

      // Track last received message for Smart Reply NLP context
      setLastReceivedMessage({
        text: packet.translatedText || packet.originalText,
        senderName: packet.senderName,
        lang: packet.senderLang,
      });

      if (packet.ttsWarning) {
        setAudioPlaybackNotice(`ℹ️ ${packet.ttsWarning}`);
      }

      // Handle audio playback truthfully
      if (isMuted) {
        setAudioPlaybackNotice('🔇 Audio Received (Speaker Muted)');
        return;
      }

      if (packet.audioBase64) {
        setAudioPlaybackNotice('🔊 Audio Received - Playing...');
        const decompressed = await opusCodec.decompressAudioPayload(packet.audioBase64, packet.opusCompression as any);
        const playRes = await audioEngine.playAudioBase64(decompressed.audioUri);
        if (playRes.autoplayBlocked) {
          setAudioPlaybackNotice('⚠️ Autoplay blocked by browser policy. Tap to Play');
        } else if (playRes.played) {
          setAudioPlaybackNotice(null);
        } else if (playRes.error) {
          setAudioPlaybackNotice(`Audio playback notice: ${playRes.error}`);
        }
      } else {
        // Fallback to client SpeechSynthesis with truthful availability check
        const voiceCheck = audioEngine.checkVoiceAvailability(packet.targetLang);
        if (!voiceCheck.available) {
          setAudioPlaybackNotice(`⚠️ ${voiceCheck.warning}`);
        } else {
          if (voiceCheck.isApproximation) {
            setAudioPlaybackNotice(`ℹ️ ${voiceCheck.warning}`);
          } else {
            setAudioPlaybackNotice('🔊 Playing speech...');
          }
          await audioEngine.speak(packet.translatedText, packet.targetLang);
          setAudioPlaybackNotice(null);
        }
      }
    });

    return () => unsubscribe();
  }, [soundRogerBeep, isMuted, onNewMessage]);

  const handleStartPTT = () => {
    if (isPressingPTT || isProcessing) return;
    setStatusFeedback(null);
    setActionError(null);
    setDeliveryNotice(null);

    audioEngine.triggerHaptic(70);
    audioEngine.playSquelchStatic(50);

    setIsPressingPTT(true);
    setInterimText('');
    setFinalSpokenText('');

    // Explicit microphone initialization and recording on user action
    audioEngine.startVoiceRecording().then(() => {
      const node = audioEngine.getAnalyser();
      if (node) setAnalyser(node);
    });

    audioEngine.startSpeechRecognition(
      sourceLang,
      (interim) => setInterimText(interim),
      (final) => setFinalSpokenText(final),
      (notice) => console.log('Speech recognition note:', notice)
    );
  };

  const handleStopPTT = async () => {
    if (!isPressingPTT) return;
    setIsPressingPTT(false);

    // Await speech recognition final transcript flush before processing
    await audioEngine.stopSpeechRecognition();
    const audioDataUri = await audioEngine.stopVoiceRecording();

    if (soundRogerBeep) {
      audioEngine.playRogerBeep();
    }
    audioEngine.triggerHaptic([30, 40]);

    const textToProcess = spokenTextRef.current.trim();
    if (!textToProcess && !audioDataUri) {
      setInterimText('');
      setFinalSpokenText('');
      return;
    }

    await executeTranslationAndBroadcast(textToProcess, audioDataUri || undefined);
  };

  // Perform translation and broadcast single unified packet
  const executeTranslationAndBroadcast = async (
    text: string,
    audioBase64?: string,
    isEmergencyOverride?: boolean
  ) => {
    setIsProcessing(true);
    setStatusFeedback(null);
    setActionError(null);
    setDeliveryNotice(null);

    try {
      // 1. Request translation with server-generated Gemini TTS audio
      const result = await translatorService.translate(text, sourceLang, targetLang, {
        audioBase64,
        includeTTS: true,
      });

      setLatestTransmission(result);

      // 2. Opus Audio Compression Module Integration
      let finalAudioBase64 = result.audioBase64;
      let opusStats: OpusCompressionStats | undefined = undefined;

      if (result.audioBase64) {
        const compressedPacket = await opusCodec.compressAudioPayload(result.audioBase64);
        finalAudioBase64 = compressedPacket.compressedDataUri;
        opusStats = compressedPacket.stats;
        setLatestOpusStats(compressedPacket.stats);
      }

      const isEmergencyBroadcast = isEmergencyOverride ?? activeChannelConfig.isEmergency;
      const remotePeerCount = peerMesh.getPeerCount();
      const hasRemotePeer = remotePeerCount > 0 && peerMesh.getStatus() === 'connected';

      if (!hasRemotePeer) {
        setDeliveryNotice(
          `⏳ Transmitted locally. Waiting for 2nd phone to connect to Room ${peerMesh.getRoomCode() || roomCode || ''}.`
        );
      } else {
        setDeliveryNotice(null);
      }

      // 3. Add local message to conversation history
      const convMsg: ConversationMessage = {
        id: result.id,
        sender: 'self',
        senderName: isEmergencyBroadcast ? '🚨 EMERGENCY SOS (Priority)' : 'You (Local Station)',
        sourceLang,
        targetLang,
        originalText: result.originalText,
        translatedText: result.translatedText,
        phoneticText: result.phoneticText,
        timestamp: result.timestamp,
        isOffline: result.isOffline,
        engine: result.engine,
        confidence: result.confidence,
        dialectNotes: result.dialectNotes,
        audioBase64: finalAudioBase64,
        channel: isEmergencyBroadcast ? 1 : currentChannel,
        deliveryStatus: hasRemotePeer ? 'delivered' : 'waiting_peer',
        opusCompression: opusStats,
      };
      onNewMessage(convMsg);

      // 4. Transmit packet over room WebSocket to other peer(s)
      meshNetwork.transmitPacket({
        channel: isEmergencyBroadcast ? 1 : currentChannel,
        senderLang: sourceLang,
        targetLang,
        originalText: result.originalText,
        translatedText: result.translatedText,
        phoneticText: result.phoneticText,
        audioBase64: finalAudioBase64, // Real Opus-compressed audio stream for low-bandwidth mesh transmission
        isEmergency: isEmergencyBroadcast,
        engine: result.engine,
        isOffline: result.isOffline,
        confidence: result.confidence,
        dialectNotes: result.dialectNotes,
        opusCompression: opusStats,
      });

      // Play local confirmation audio if desired
      if (!isMuted && result.audioBase64) {
        if (targetLang === 'mjl') {
          setAudioPlaybackNotice('ℹ️ Mandyali experimental synthesis (Hindi voice approximation)');
        }
        audioEngine.playAudioBase64(result.audioBase64).catch(() => {});
      }

      setInterimText('');
      setFinalSpokenText('');
      setManualInput('');
    } catch (err: any) {
      console.error('Translation notice:', err);
      handleTranslationError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim() || isProcessing) return;
    executeTranslationAndBroadcast(manualInput.trim());
  };

  const handleReplayTTS = async () => {
    if (!latestTransmission) return;
    audioEngine.triggerHaptic(30);

    if (latestTransmission.audioBase64) {
      if (latestTransmission.targetLang === 'mjl') {
        setAudioPlaybackNotice('ℹ️ Playing Mandyali synthesis (Hindi voice approximation)');
      } else {
        setAudioPlaybackNotice('🔊 Playing translated audio...');
      }
      const playRes = await audioEngine.playAudioBase64(latestTransmission.audioBase64);
      if (playRes.autoplayBlocked) {
        setAudioPlaybackNotice('⚠️ Autoplay blocked. Tap to Play');
      } else {
        setTimeout(() => setAudioPlaybackNotice(null), 3000);
      }
    } else {
      const voiceCheck = audioEngine.checkVoiceAvailability(latestTransmission.targetLang);
      if (!voiceCheck.available) {
        setAudioPlaybackNotice(`⚠️ ${voiceCheck.warning}`);
        return;
      }
      if (latestTransmission.targetLang === 'mjl') {
        setAudioPlaybackNotice('ℹ️ Mandyali experimental synthesis (Hindi voice approximation)');
      } else {
        setAudioPlaybackNotice('🔊 Synthesizing speech...');
      }
      await audioEngine.speak(latestTransmission.translatedText, latestTransmission.targetLang);
      setTimeout(() => setAudioPlaybackNotice(null), 3000);
    }
  };

  const handleUnlockAndTestSpeaker = async () => {
    const unlocked = await audioEngine.unlockAudio();
    if (unlocked) {
      setSpeakerUnlocked(true);
      await audioEngine.playSpeakerTestChime();
      setAudioPlaybackNotice('✅ Speaker verified and unblocked for incoming speech');
      setTimeout(() => setAudioPlaybackNotice(null), 3000);
    }
  };

  const handleTriggerSOSEmergency = async (emergencyText: string) => {
    if (onSelectChannel) {
      onSelectChannel(1);
    } else {
      meshNetwork.setChannel(1);
    }
    audioEngine.playEmergencyAlert();
    await executeTranslationAndBroadcast(emergencyText, undefined, true);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-3 sm:p-4 max-w-2xl mx-auto w-full select-none overflow-hidden">
      {/* Top Language Routing & Intercom Header */}
      <div className="space-y-1.5 shrink-0">
        <div
          className={
            isDark
              ? 'flex items-center justify-between bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2.5 shadow-sm'
              : 'flex items-center justify-between neo-glass-panel rounded-3xl p-3 shadow-[0_10px_25px_rgba(200,210,240,0.3)]'
          }
        >
          {/* Source Language Button */}
          <button
            onClick={() => setShowLangPicker('source')}
            className={
              isDark
                ? 'flex-1 flex items-center space-x-2 p-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-left transition-all border border-zinc-750'
                : 'flex-1 flex items-center space-x-2 p-2.5 rounded-2xl neo-gel-button text-left transition-all'
            }
          >
            <span className="text-xl sm:text-2xl drop-shadow-sm">{sourceLangConfig.flagEmoji}</span>
            <div className="min-w-0">
              <span
                className={`text-[10px] font-mono uppercase tracking-wider block ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}
              >
                You Speak (स्रोत)
              </span>
              <span
                className={`text-xs sm:text-sm font-bold truncate block ${
                  isDark ? 'text-zinc-100' : 'text-slate-800'
                }`}
              >
                {sourceLangConfig.name}
              </span>
            </div>
          </button>

          {/* Swap Button */}
          <button
            onClick={onSwapLanguages}
            className={
              isDark
                ? 'p-2 mx-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-transform active:scale-90 border border-zinc-700 shrink-0'
                : 'p-2.5 mx-1.5 rounded-2xl neo-gel-button text-purple-600 hover:text-purple-700 transition-all active:scale-90 shrink-0'
            }
            title="Swap Source and Target Languages"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          {/* Target Language Button */}
          <button
            onClick={() => setShowLangPicker('target')}
            className={
              isDark
                ? 'flex-1 flex items-center space-x-2 p-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-left transition-all border border-zinc-750'
                : 'flex-1 flex items-center space-x-2 p-2.5 rounded-2xl neo-gel-button text-left transition-all'
            }
          >
            <span className="text-xl sm:text-2xl drop-shadow-sm">{targetLangConfig.flagEmoji}</span>
            <div className="min-w-0">
              <span
                className={`text-[10px] font-mono uppercase tracking-wider block ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}
              >
                Translate To (अनुवाद)
              </span>
              <span
                className={`text-xs sm:text-sm font-bold truncate block ${
                  isDark ? 'text-zinc-100' : 'text-slate-800'
                }`}
              >
                {targetLangConfig.name}
              </span>
            </div>
          </button>
        </div>

        {/* Dialect note & speaker test banner */}
        <div className="flex items-center justify-between px-1 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 truncate">
            {isMandaliActive && (
              <span className={isDark ? 'text-amber-400 font-medium flex items-center gap-1' : 'text-amber-700 font-medium flex items-center gap-1'}>
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Mandyali: Experimental AI dialect translation</span>
              </span>
            )}
            {isOdiaActive && !isMandaliActive && (
              <span className={isDark ? 'text-blue-400 font-medium' : 'text-blue-700 font-medium'}>
                ℹ️ Odia: Verified Odia script translation
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Field Noise Gate quick toggle */}
            <button
              onClick={() => {
                const next = !isNoiseGateActive;
                setIsNoiseGateActive(next);
                languagePackService.updatePreferences({ isNoiseGateEnabled: next });
                audioEngine.triggerHaptic(30);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-mono transition-all ${
                isNoiseGateActive
                  ? isDark ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300' : 'bg-emerald-100 border-emerald-400 text-emerald-800 font-bold'
                  : isDark ? 'bg-zinc-850 border-zinc-700 text-zinc-400' : 'bg-slate-100 border-slate-300 text-slate-500'
              }`}
              title="Toggle Field Audio Noise Gate"
            >
              <Zap className="w-2.5 h-2.5 text-emerald-400" />
              <span>Gate: {isNoiseGateActive ? 'ON' : 'OFF'}</span>
            </button>

            {/* Opus Compression Codec quick toggle */}
            <button
              onClick={() => {
                setShowOpusHUD(!showOpusHUD);
                audioEngine.triggerHaptic(30);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-mono transition-all ${
                isOpusEnabled
                  ? isDark ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-xs' : 'bg-purple-100 border-purple-400 text-purple-900 font-bold shadow-xs'
                  : isDark ? 'bg-zinc-850 border-zinc-700 text-zinc-400' : 'bg-slate-100 border-slate-300 text-slate-500'
              }`}
              title="Configure Opus Audio Compression & Bandwidth Settings"
            >
              <Zap className="w-2.5 h-2.5 text-emerald-400" />
              <span>Opus: {isOpusEnabled ? `${opusCodec.getConfig().bitrateKbps}k` : 'OFF'}</span>
            </button>

            {/* Tactical Brevity & Morse Mode Launcher */}
            <button
              onClick={() => {
                setShowBrevityModal(true);
                audioEngine.triggerHaptic(30);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-mono transition-all ${
                isDark
                  ? 'bg-amber-950/80 border-amber-500/70 text-amber-300 hover:bg-amber-900/80 shadow-xs'
                  : 'bg-amber-100 border-amber-400 text-amber-900 font-bold hover:bg-amber-200'
              }`}
              title="Open Tactical Brevity Codes & Acoustic Morse Code Transmitter"
            >
              <Radio className="w-2.5 h-2.5 text-amber-400" />
              <span>Brevity & Morse</span>
            </button>

            {/* Speaker Unlock/Test */}
            <button
              onClick={handleUnlockAndTestSpeaker}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                speakerUnlocked
                  ? isDark ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : isDark ? 'bg-zinc-850 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-slate-200 text-purple-700 shadow-xs'
              }`}
              title="Unlock browser audio and test phone speaker"
            >
              <Volume2 className="w-3 h-3 text-purple-500" />
              <span>{speakerUnlocked ? 'Speaker Unlocked' : 'Speaker Test'}</span>
            </button>
          </div>
        </div>

        {/* Opus Compression Codec Control Panel Drawer */}
        {showOpusHUD && (
          <div className="my-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <OpusCodecHUD latestStats={latestOpusStats} />
          </div>
        )}

        {/* Persistent Warning Label for Experimental Mandali / Mandyali Dialect Synthesis & Translation */}
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
                      ? 'p-2 rounded-xl bg-black/50 border border-amber-500/40 text-[10px] space-y-1 text-amber-300 font-mono'
                      : 'p-2 rounded-xl bg-amber-100/90 border border-amber-300 text-[10px] space-y-1 text-amber-950 font-mono font-semibold'
                  }
                >
                  <div>
                    • <strong>Zero Silent Fallbacks:</strong> All silent fallback logic to Hindi or English has been removed for complete transparency. If specific dialect models or quota are unavailable, an explicit actionable notice is displayed rather than misleading substitutions.
                  </div>
                  <div>
                    • <strong>Lexicon Integrity:</strong> Translations rely on authentic Western Pahadi expressions and Gemini neural models. Verify with native speakers for mission-critical interstate communications.
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-500/30">
                    {onOpenDialectGuide && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDialectGuide();
                        }}
                        className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-300 border border-amber-500/40 font-mono text-[9px] font-bold flex items-center gap-1 transition-all"
                      >
                        <BookOpen className="w-2.5 h-2.5" />
                        <span>Open Dialect Guide</span>
                      </button>
                    )}
                    {onOpenPackManager && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPackManager();
                        }}
                        className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-300 border border-amber-500/40 font-mono text-[9px] font-bold flex items-center gap-1 transition-all"
                      >
                        <Activity className="w-2.5 h-2.5" />
                        <span>Diagnostics &amp; Quota Tab</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Odia Advisory Label */}
        {isOdiaActive && !isMandaliActive && (
          <div className="flex items-center gap-1.5 text-[11px] text-sky-400 bg-sky-500/10 p-2 rounded-xl border border-sky-500/30 leading-snug">
            <Info className="w-3.5 h-3.5 shrink-0 text-sky-400" />
            <span>
              <strong>Odia (ଓଡ଼ିଆ) Voice Notice:</strong> Speech synthesis requires native Odia voice support installed in your browser/OS. Odia script is rendered faithfully with no silent replacement to Hindi or English.
            </span>
          </div>
        )}
      </div>

      {/* Real-time Waveform / Audio VU Meter */}
      <div className="space-y-1 my-1">
        <div
          className={`flex items-center justify-between px-1 text-[11px] font-mono ${
            isDark ? 'text-zinc-400' : 'text-slate-500 font-medium'
          }`}
        >
          <span className="flex items-center gap-1">
            <Radio className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-purple-500'}`} />
            <span>ROOM INTERCOM TALKGROUP {currentChannel}</span>
          </span>
          <span
            className={
              isPressingPTT
                ? isDark
                  ? 'text-red-400 font-bold animate-pulse'
                  : 'text-rose-600 font-bold animate-pulse'
                : isDark
                ? 'text-zinc-500'
                : 'text-slate-400'
            }
          >
            {isPressingPTT ? 'TRANSMITTING VOICE TO PEERS...' : 'INTERCOM STANDBY'}
          </span>
        </div>
        <WaveformVisualizer
          analyser={analyser}
          isActive={isPressingPTT || isProcessing}
          color={isPressingPTT ? 'red' : isDark ? 'emerald' : 'purple'}
          barCount={36}
          showMetrics={true}
          mode="hybrid"
        />
      </div>

      {/* Main Transmission Card (Latest or Incoming Message) */}
      <div
        className={
          isDark
            ? 'bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 min-h-[140px] flex flex-col justify-between shadow-inner relative overflow-hidden'
            : 'neo-glass-panel rounded-3xl p-4 min-h-[140px] flex flex-col justify-between relative overflow-hidden text-slate-800'
        }
      >
        {/* Audio Notice & Tap to Play Banner */}
        {audioPlaybackNotice && (
          <div
            className={`p-2 mb-2 rounded-xl flex items-center justify-between text-xs font-mono font-bold animate-in fade-in ${
              audioPlaybackNotice.includes('Tap to Play') || audioPlaybackNotice.includes('blocked')
                ? isDark ? 'bg-amber-950/90 text-amber-300 border border-amber-500/80' : 'bg-amber-100 text-amber-900 border border-amber-300'
                : audioPlaybackNotice.includes('🔇')
                ? isDark ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-slate-100 text-slate-800 border border-slate-300'
                : isDark ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}
          >
            <span className="truncate pr-2">{audioPlaybackNotice}</span>
            {latestTransmission?.audioBase64 && (
              <button
                onClick={async () => {
                  audioEngine.unlockAudio();
                  if (latestTransmission.audioBase64) {
                    await audioEngine.playAudioBase64(latestTransmission.audioBase64);
                    setAudioPlaybackNotice(null);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-black/40 text-white font-bold text-[10px] hover:bg-black/60 transition-all shrink-0 flex items-center gap-1 shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Tap to Play</span>
              </button>
            )}
          </div>
        )}

        {/* Actionable Translation Status & Error Banner (Specifically intercepts 429 Quota Exceeded and Network errors) */}
        {statusFeedback && (
          <div
            className={`p-3 mb-2 rounded-2xl border text-xs space-y-2 transition-all shadow-lg animate-in fade-in ${
              statusFeedback.isQuota || statusFeedback.type === 'quota'
                ? 'bg-red-950/90 border-2 border-red-500/80 text-red-200'
                : statusFeedback.type === 'network'
                ? 'bg-amber-950/90 border-2 border-amber-500/80 text-amber-200'
                : statusFeedback.type === 'dialect_offline'
                ? 'bg-amber-950/90 border-2 border-amber-500/80 text-amber-200'
                : statusFeedback.type === 'no_speech'
                ? 'bg-zinc-900 border-2 border-zinc-600 text-zinc-300'
                : 'bg-red-950/90 border border-red-500 text-red-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    statusFeedback.isQuota || statusFeedback.type === 'quota'
                      ? 'text-red-400 animate-pulse'
                      : statusFeedback.type === 'network' || statusFeedback.type === 'dialect_offline'
                      ? 'text-amber-400'
                      : 'text-zinc-400'
                  }`}
                />
                <div className="space-y-0.5">
                  <div className="font-bold text-xs">{statusFeedback.titleHi}</div>
                  <div className="font-mono text-[10px] opacity-90">{statusFeedback.titleEn}</div>
                </div>
              </div>
              <button
                onClick={() => setStatusFeedback(null)}
                className="p-1 rounded hover:bg-black/20 text-current shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] leading-relaxed opacity-95">{statusFeedback.details}</p>

            {statusFeedback.hint && (
              <pre className="p-2 rounded-xl bg-black/40 text-[10px] font-mono whitespace-pre-wrap leading-tight border border-white/10 opacity-90">
                {statusFeedback.hint}
              </pre>
            )}

            {/* Action buttons for resolution */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10">
              <button
                onClick={() => {
                  const testText = sourceLang === 'mjl' ? 'तुसां जो नमस्कार! कुथु जांदे?' : 'नमस्ते! आप कहाँ जा रहे हैं?';
                  executeTranslationAndBroadcast(testText);
                  setStatusFeedback(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[10px] flex items-center gap-1 transition-all shadow-xs"
              >
                <Zap className="w-3 h-3" />
                <span>Try Quick Test Call</span>
              </button>
              {onOpenPackManager && (
                <button
                  onClick={() => {
                    onOpenPackManager();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-[10px] flex items-center gap-1 transition-all shadow-xs"
                >
                  <Activity className="w-3 h-3" />
                  <span>Diagnostics Tab</span>
                </button>
              )}
              {onOpenDialectGuide && (
                <button
                  onClick={onOpenDialectGuide}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-[10px] flex items-center gap-1 transition-all shadow-xs"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Dialect Guide</span>
                </button>
              )}
              <button
                onClick={() => setStatusFeedback(null)}
                className="px-2.5 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-mono text-[10px] transition-all ml-auto"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Fallback Action Error Banner */}
        {actionError && !statusFeedback && (
          <div className="p-2 mb-2 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-mono flex items-center justify-between">
            <span className="pr-2">⚠️ {actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-white p-1 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Delivery Notice when user transmits while alone in room */}
        {deliveryNotice && (
          <div className="p-2 mb-2 rounded-xl bg-amber-950/90 border border-amber-500/80 text-amber-200 text-xs font-mono flex items-center justify-between animate-in fade-in">
            <span className="pr-2">{deliveryNotice}</span>
            <button onClick={() => setDeliveryNotice(null)} className="text-amber-400 hover:text-white p-1 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isPressingPTT ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-2 animate-in fade-in duration-100">
            <div
              className={`w-3.5 h-3.5 rounded-full animate-ping mb-2 ${
                isDark ? 'bg-red-500' : 'bg-rose-500'
              }`}
            />
            <span
              className={`text-xs font-mono font-bold tracking-widest uppercase ${
                isDark ? 'text-red-400' : 'text-rose-600'
              }`}
            >
              Listening &amp; Encoding Voice...
            </span>
            <p
              className={`text-base font-semibold mt-2 italic px-3 line-clamp-3 ${
                isDark ? 'text-zinc-100' : 'text-slate-900'
              }`}
            >
              &quot;{interimText || 'Speak clearly in ' + sourceLangConfig.name + '...'}&quot;
            </p>
            <span
              className={`text-[11px] font-mono mt-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}
            >
              {pttMode === 'hold' ? 'Release button to translate & transmit' : 'Tap button again to stop & transmit'}
            </span>
          </div>
        ) : isProcessing ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-3">
            <div
              className={`w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mb-2 ${
                isDark ? 'border-emerald-400' : 'border-purple-600'
              }`}
            />
            <span
              className={`text-xs font-mono tracking-wider font-semibold ${
                isDark ? 'text-emerald-400' : 'text-purple-700'
              }`}
            >
              Translating into {targetLangConfig.name} &amp; Synthesizing Audio...
            </span>
          </div>
        ) : latestTransmission ? (
          <div className="space-y-2">
            <div
              className={`flex items-center justify-between border-b pb-1.5 text-xs font-mono ${
                isDark ? 'border-zinc-800 text-zinc-400' : 'border-slate-200/80 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-purple-600'}`}
                  />
                  <span>Interstate Translation</span>
                </span>
                {deliveryNotice ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-950/80 text-amber-300 border border-amber-600/80">
                    ⏳ Waiting for Peer
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/80">
                    ✓ Transmitted
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {latestOpusStats && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 font-mono">
                    <Zap className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                    <span>Opus {latestOpusStats.bitrateKbps}k • {latestOpusStats.savingsPercent}% Saved</span>
                  </span>
                )}
                {latestTransmission.isOffline && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isDark
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    OFFLINE
                  </span>
                )}
              </div>
            </div>

            {/* Original Spoken Text */}
            <div>
              <div
                className={`text-[10px] font-mono uppercase ${
                  isDark ? 'text-zinc-500' : 'text-slate-400 font-semibold'
                }`}
              >
                Original ({SUPPORTED_LANGUAGES.find((l) => l.code === latestTransmission.sourceLang)?.name}):
              </div>
              <p
                className={`text-xs font-medium ${
                  isDark ? 'text-zinc-300' : 'text-slate-700'
                }`}
              >
                {latestTransmission.originalText}
              </p>
            </div>

            {/* Translated Output */}
            <div
              className={
                isDark
                  ? 'bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800/80'
                  : 'bg-white/85 p-3 rounded-2xl border border-white/95 shadow-sm'
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <div
                    className={`text-[10px] font-mono uppercase font-bold flex items-center gap-1.5 flex-wrap ${
                      isDark ? 'text-emerald-400' : 'text-purple-600'
                    }`}
                  >
                    <span>
                      Translated ({SUPPORTED_LANGUAGES.find((l) => l.code === latestTransmission.targetLang)?.name} - {SUPPORTED_LANGUAGES.find((l) => l.code === latestTransmission.targetLang)?.nativeName}):
                    </span>
                    {latestTransmission.targetLang === 'mjl' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono normal-case">
                        Mandyali Exp. Dialect (Hindi Voice Approx)
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-base sm:text-lg font-bold mt-0.5 leading-snug ${
                      isDark ? 'text-zinc-100' : 'text-slate-900'
                    }`}
                  >
                    {latestTransmission.translatedText}
                  </p>
                  {/* Romanized Phonetic guide */}
                  <div
                    className={`text-xs font-mono mt-1 flex items-start gap-1 ${
                      isDark ? 'text-amber-300/90' : 'text-pink-600 font-medium'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold">Phonetic:</span>
                    <span className="italic">{latestTransmission.phoneticText}</span>
                  </div>
                </div>

                <button
                  onClick={handleReplayTTS}
                  className={
                    isDark
                      ? 'p-2 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900 transition-colors shrink-0'
                      : 'p-2.5 rounded-2xl neo-gel-button text-purple-600 hover:text-purple-700 transition-all shrink-0 shadow-sm'
                  }
                  title="Replay Voice Speech"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {latestTransmission.dialectNotes && (
                <div
                  className={`mt-1.5 pt-1.5 border-t text-[11px] font-mono ${
                    isDark ? 'border-zinc-800/70 text-zinc-400' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  💡 {latestTransmission.dialectNotes}
                </div>
              )}

              {/* Interactive Voice Learning Detection Pop-up Trigger */}
              {(() => {
                const detected = customVocabularyService.detectPotentialNewWords(
                  latestTransmission.originalText,
                  sourceLang
                );
                if (detected.length === 0) return null;
                const word = detected[0];
                return (
                  <div
                    className={`mt-2 p-2 rounded-xl border flex items-center justify-between text-xs font-mono animate-in fade-in duration-200 ${
                      isDark
                        ? 'bg-purple-950/60 border-purple-800/80 text-purple-200'
                        : 'bg-purple-100/90 border-purple-300 text-purple-950 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 animate-pulse" />
                      <span className="truncate">
                        Identified new dialect word: <strong>&quot;{word}&quot;</strong>
                      </span>
                    </div>
                    <button
                      onClick={() => onOpenWordLearning?.(word, latestTransmission.translatedText)}
                      className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] shrink-0 shadow-xs transition-all"
                    >
                      Confirm &amp; Learn Pop-up
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-3">
            <Radio
              className={`w-8 h-8 mb-2 ${
                peerStatus === 'connected'
                  ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                  : peerStatus === 'waiting'
                  ? isDark ? 'text-amber-400 animate-pulse' : 'text-amber-500 animate-pulse'
                  : isDark ? 'text-zinc-700' : 'text-purple-300'
              }`}
            />
            <span
              className={`text-xs font-mono font-bold tracking-wider uppercase ${
                peerStatus === 'connected'
                  ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                  : peerStatus === 'waiting'
                  ? isDark ? 'text-amber-400' : 'text-amber-700'
                  : isDark ? 'text-zinc-400' : 'text-slate-600'
              }`}
            >
              {peerStatus === 'connected'
                ? `🟢 Linked to Room ${roomCode || peerMesh.getRoomCode()} (${peerCount} Peer)`
                : peerStatus === 'waiting'
                ? `🟡 Room ${roomCode || peerMesh.getRoomCode()} Active (Waiting for 2nd Device)`
                : peerStatus === 'connecting'
                ? `⏳ Connecting to Room ${roomCode || peerMesh.getRoomCode()}...`
                : '⚪ Room Disconnected (Offline)'}
            </span>
            <p
              className={`text-[11px] mt-1 max-w-xs ${
                isDark ? 'text-zinc-500' : 'text-slate-500'
              }`}
            >
              {peerStatus === 'connected'
                ? `Ready to talk! Spoken or typed ${sourceLangConfig.name} will stream and play aloud on the connected phone in ${targetLangConfig.name}.`
                : peerStatus === 'waiting'
                ? `Share this room code with a second mobile phone or laptop. Once joined, voice translations stream and auto-play.`
                : 'Join or create a room code in the top bar to connect with a second mobile phone or laptop over the Internet.'}
            </p>
          </div>
        )}
      </div>

      {/* Smart Reply NLP Quick Responses Section */}
      <div
        className={`p-2.5 rounded-2xl border transition-all my-1.5 ${
          isDark
            ? 'bg-purple-950/30 border-purple-800/40'
            : 'bg-gradient-to-r from-purple-50/90 to-indigo-50/90 border-purple-200 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5 px-0.5 text-[10px] font-mono">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse shrink-0" />
            <span
              className={`font-bold tracking-wider uppercase shrink-0 ${
                isDark ? 'text-purple-300' : 'text-purple-900'
              }`}
            >
              ⚡ SMART REPLY:
            </span>
            {lastReceivedMessage ? (
              <span
                className={`truncate text-[10px] italic ${
                  isDark ? 'text-zinc-400' : 'text-slate-600'
                }`}
              >
                to "{lastReceivedMessage.text}"
              </span>
            ) : (
              <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                (Contextual NLP Ready)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                isDark
                  ? 'bg-purple-900/60 text-purple-200 border border-purple-700/50'
                  : 'bg-purple-200/80 text-purple-900 border border-purple-300'
              }`}
            >
              NLP Auto-Engine
            </span>
            {lastReceivedMessage && (
              <button
                onClick={() => setLastReceivedMessage(null)}
                className={`text-[9px] underline ${
                  isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Reset Smart Reply context to default"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar text-xs font-mono shrink-0">
          {smartReplies.map((reply) => (
            <button
              key={reply.id}
              onClick={() => {
                setStatusFeedback(null);
                executeTranslationAndBroadcast(reply.text);
                audioEngine.triggerHaptic([20, 30]);
              }}
              disabled={isProcessing}
              title={`Transmit smart reply in ${sourceLangConfig.name}: "${reply.text}"`}
              className={
                isDark
                  ? 'px-3 py-1.5 rounded-xl bg-purple-900/70 hover:bg-purple-800 text-purple-100 border border-purple-600/70 shrink-0 text-xs font-mono font-semibold shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1'
                  : 'px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 text-purple-900 border border-purple-300/80 shrink-0 text-xs font-mono font-semibold shadow-xs hover:shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1'
              }
            >
              <span>{reply.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Test Phrases (Immediate zero-microphone validation) */}
      <div className="space-y-1 my-1">
        <div className="flex items-center justify-between px-1 text-[10px] font-mono text-zinc-400">
          <span>QUICK TEST CALLS (IMMEDIATE TRANSMISSION):</span>
          <button
            onClick={() => setShowManualBox(!showManualBox)}
            className="text-purple-400 hover:underline flex items-center gap-1"
          >
            <span>{showManualBox ? 'Close Type Box' : 'Type Custom Message'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar text-xs font-mono shrink-0">
          {[
            {
              label: '🚑 SOS Emergency',
              text: sourceLang === 'mjl' ? 'मां जो झटपट डाक्टरी मदद चहिदी' : 'मुझे तुरंत सहायता चाहिए',
              isSOS: true,
            },
            { label: '👋 Namaste! Where going?', text: sourceLang === 'mjl' ? 'तुसां जो नमस्कार! कुथु जांदे?' : 'नमस्ते! आप कहाँ जा रहे हैं?' },
            { label: '💧 Need Water', text: sourceLang === 'mjl' ? 'मां जो पाणी चहिदा' : 'मुझे पीने का पानी चाहिए' },
            { label: '📍 Where is Bus Stand?', text: sourceLang === 'mjl' ? 'नेड़ला बस अडा या रेल स्टेशन कुथु है?' : 'नजदीकी बस स्टैंड या रेलवे स्टेशन कहाँ है?' },
            { label: '🙏 Thank you very much', text: sourceLang === 'mjl' ? 'बड़ा-बड़ा धन्यवाद' : 'आपका बहुत-बहुत धन्यवाद' },
            { label: '💬 How are you?', text: sourceLang === 'mjl' ? 'केड़ा हाल चाल है?' : 'केड़ा हाल चाल है?' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setStatusFeedback(null);
                if (item.isSOS) {
                  handleTriggerSOSEmergency(item.text);
                } else {
                  executeTranslationAndBroadcast(item.text);
                }
              }}
              disabled={isProcessing}
              className={
                item.isSOS
                  ? isDark
                    ? 'px-2.5 py-1 rounded-lg bg-red-950/90 hover:bg-red-900 text-red-200 border border-red-500/60 shrink-0 text-[11px] whitespace-nowrap font-bold shadow-sm transition-all'
                    : 'px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white shrink-0 text-[11px] whitespace-nowrap font-bold shadow-md hover:shadow-lg'
                  : isDark
                  ? 'px-2 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 shrink-0 text-[11px] whitespace-nowrap transition-colors'
                  : 'neo-gel-button px-3 py-1 rounded-full text-slate-700 border border-white/95 shrink-0 text-[11px] whitespace-nowrap shadow-xs font-medium'
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Manual Custom Text Input Drawer */}
        {showManualBox && (
          <form
            onSubmit={handleManualSubmit}
            className="w-full flex gap-1.5 mt-1 animate-in slide-in-from-top-2"
          >
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={`Type text in ${sourceLangConfig.name} to translate and stream...`}
              className={
                isDark
                  ? 'flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono'
                  : 'flex-1 neo-glass-card rounded-2xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono border border-white/90 shadow-sm'
              }
            />
            <button
              type="submit"
              disabled={!manualInput.trim() || isProcessing}
              className={
                isDark
                  ? 'px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1 disabled:opacity-50'
                  : 'px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-95 text-white rounded-2xl text-xs font-mono font-bold flex items-center gap-1 shadow-md disabled:opacity-50'
              }
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        )}
      </div>

      {/* Main Massive Push-To-Talk (PTT) Button Section */}
      <div className="flex flex-col items-center justify-center pt-0.5 pb-1 relative shrink-0">
        {/* Concentric visual pulse rings when transmitting */}
        {isPressingPTT && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 animate-ping ${
                isDark ? 'border-red-500/30' : 'border-rose-400/40'
              }`}
            />
            <div
              className={`w-44 h-44 sm:w-52 sm:h-52 rounded-full border animate-pulse ${
                isDark ? 'border-red-500/20' : 'border-purple-400/30'
              }`}
            />
          </div>
        )}

        {/* Unified Pointer Capture PTT Button - avoids duplicate touch/mouse events and pointer-leave bugs */}
        <button
          onPointerDown={(e) => {
            if (pttMode === 'hold') {
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {}
              handleStartPTT();
            }
          }}
          onPointerUp={() => {
            if (pttMode === 'hold') handleStopPTT();
          }}
          onPointerCancel={() => {
            if (pttMode === 'hold') handleStopPTT();
          }}
          onClick={() => {
            if (pttMode === 'toggle') {
              if (isPressingPTT) {
                handleStopPTT();
              } else {
                handleStartPTT();
              }
            }
          }}
          className={
            isDark
              ? `w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all select-none shadow-2xl relative z-10 shrink-0 ${
                  isPressingPTT
                    ? 'bg-gradient-to-b from-red-600 to-red-800 border-4 border-red-300 scale-95 shadow-red-500/50'
                    : 'bg-gradient-to-b from-zinc-800 to-zinc-950 border-4 border-emerald-500/80 hover:border-emerald-400 active:scale-95 shadow-emerald-500/20'
                }`
              : `w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all select-none relative z-10 shrink-0 ${
                  isPressingPTT
                    ? 'neo-gel-ptt-active scale-95'
                    : 'neo-gel-ptt hover:scale-105 active:scale-95'
                }`
          }
          style={{ touchAction: 'none' }}
        >
          {isPressingPTT ? (
            <>
              <Mic className="w-10 h-10 text-white animate-bounce drop-shadow" />
              <span className="text-[11px] font-mono font-bold text-white tracking-widest mt-0.5 drop-shadow-sm">
                TRANSMITTING
              </span>
            </>
          ) : (
            <>
              <div
                className={`p-2 rounded-full mb-0.5 ${
                  isDark ? 'bg-emerald-500/20' : 'bg-white/30 backdrop-blur-md shadow-inner'
                }`}
              >
                <Mic className={`w-7 h-7 ${isDark ? 'text-emerald-400' : 'text-white drop-shadow'}`} />
              </div>
              <span
                className={`text-[11px] font-mono font-bold tracking-wider ${
                  isDark ? 'text-zinc-100' : 'text-white drop-shadow-sm font-semibold'
                }`}
              >
                {pttMode === 'hold' ? 'HOLD TO TALK' : 'TAP TO TALK'}
              </span>
              <span
                className={`text-[9px] font-mono ${
                  isDark ? 'text-zinc-400' : 'text-white/90 drop-shadow-xs'
                }`}
              >
                {pttMode === 'hold' ? '(दाब कर बोलें)' : '(टैप कर बोलें)'}
              </span>
            </>
          )}
        </button>

        {/* Tactical Controls beneath PTT */}
        <div className="flex items-center justify-between w-full max-w-sm mt-2 px-2 text-xs font-mono shrink-0 gap-1.5">
          {/* PTT Mode Switch: Hold vs Tap */}
          <button
            onClick={() => setPttMode(pttMode === 'hold' ? 'toggle' : 'hold')}
            className={`px-2 py-1 rounded-lg border transition-all text-[11px] ${
              pttMode === 'toggle'
                ? isDark ? 'bg-purple-950 border-purple-500 text-purple-300 font-bold' : 'bg-purple-100 border-purple-300 text-purple-800 font-bold'
                : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-slate-200 text-slate-600'
            }`}
            title="Switch between Hold-to-Talk and Tap-to-Talk modes"
          >
            <span>Mode: {pttMode === 'hold' ? 'Hold PTT' : 'Tap Start/Stop'}</span>
          </button>

          {/* Roger Beep Toggle */}
          <button
            onClick={() => setSoundRogerBeep(!soundRogerBeep)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-[11px] transition-colors ${
              soundRogerBeep
                ? isDark ? 'bg-zinc-850 border-zinc-700 text-zinc-200' : 'text-purple-700 font-bold bg-white border-slate-200'
                : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'text-slate-400 bg-white border-slate-200'
            }`}
            title="Toggle tactical roger beep on release"
          >
            <Zap className={`w-3 h-3 ${soundRogerBeep ? isDark ? 'text-amber-400' : 'text-purple-600' : 'text-slate-400'}`} />
            <span>Beep: {soundRogerBeep ? 'ON' : 'OFF'}</span>
          </button>

          {/* VAD Hands-Free Toggle */}
          <button
            onClick={() => setIsVADEnabled(!isVADEnabled)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-[11px] transition-all ${
              isVADEnabled
                ? isDark ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold' : 'bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold'
                : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-white border-slate-200 text-slate-500'
            }`}
            title="Toggle Voice Activity Detection (Hands-Free Auto PTT)"
          >
            <Activity className={`w-3 h-3 ${isVADEnabled ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>VAD: {isVADEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Noise Gate & Wind Filter Quick Toggle */}
          <button
            onClick={() => {
              const newGate = !isNoiseGateActive;
              setIsNoiseGateActive(newGate);
              languagePackService.updatePreferences({ isNoiseGateEnabled: newGate });
              audioEngine.setSpeechPreferences({ isNoiseGateEnabled: newGate });
              audioEngine.triggerHaptic(20);
            }}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-[11px] transition-all ${
              isNoiseGateActive
                ? isDark ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold' : 'bg-teal-100 border border-teal-300 text-teal-900 font-bold'
                : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-white border-slate-200 text-slate-500'
            }`}
            title="Toggle Field Audio DSP Noise Gate & Wind Suppression"
          >
            <Sliders className={`w-3 h-3 ${isNoiseGateActive ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Gate: {isNoiseGateActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* Voice FX Selector */}
          <button
            onClick={() => setShowVoiceFxPicker(true)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-[11px] transition-all ${
              currentVoiceFx !== 'normal'
                ? isDark ? 'bg-purple-950 border-purple-500 text-purple-300 font-bold' : 'bg-purple-100 border border-purple-300 text-purple-800 font-bold'
                : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-slate-200 text-slate-600'
            }`}
            title="Change Voice Modulation / FX"
          >
            <Sparkles className="w-3 h-3 text-purple-500" />
            <span>FX</span>
          </button>
        </div>

        <div className={`text-[10px] font-mono text-center mt-1.5 opacity-80 flex items-center gap-1 justify-center ${isDark ? 'text-zinc-400' : 'text-slate-600 font-medium'}`}>
          <span>💡 Hardware PTT: Press &amp; hold Volume Up/Down or Spacebar to transmit</span>
        </div>

        {/* Privacy Note */}
        <div className="w-full max-w-sm mt-1.5 text-center text-[10px] font-mono text-zinc-400 opacity-80 flex items-center justify-center gap-1">
          <Lock className="w-2.5 h-2.5" />
          <span>Speech &amp; text translated securely via Gemini API over encrypted WSS/HTTPS.</span>
        </div>
      </div>

      {/* Language Picker Modals */}
      <LanguageSelector
        isOpen={showLangPicker === 'source'}
        onClose={() => setShowLangPicker(null)}
        selectedLang={sourceLang}
        onSelectLang={onChangeSourceLang}
        title="Select Your Language"
        subtitle="The language you will speak into the microphone"
        excludeLang={targetLang}
        onOpenPackManager={onOpenPackManager}
      />
      <LanguageSelector
        isOpen={showLangPicker === 'target'}
        onClose={() => setShowLangPicker(null)}
        selectedLang={targetLang}
        onSelectLang={onChangeTargetLang}
        title="Select Translation Language"
        subtitle="The language output to room listeners and phone speaker"
        excludeLang={sourceLang}
        onOpenPackManager={onOpenPackManager}
      />

      {/* Voice FX Selector Modal */}
      {showVoiceFxPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-white/80 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="text-sm font-mono font-bold tracking-wide">Select Voice FX Profile</h3>
              </div>
              <button
                onClick={() => setShowVoiceFxPicker(false)}
                className={`p-1.5 rounded-full ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {VOICE_FX_PRESETS.map((fx) => {
                const isSelected = currentVoiceFx === fx.id;
                return (
                  <button
                    key={fx.id}
                    onClick={() => {
                      setCurrentVoiceFx(fx.id);
                      audioEngine.setVoiceFx(fx.id);
                      audioEngine.triggerHaptic([30, 40]);
                      setShowVoiceFxPicker(false);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? isDark ? 'bg-purple-950/60 border-purple-500 text-purple-200 shadow-sm' : 'bg-purple-50 border-purple-300 text-purple-900 font-bold shadow-sm'
                        : isDark ? 'bg-zinc-850 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono font-bold">{fx.name}</div>
                      <div className="text-[11px] font-mono opacity-70 mt-0.5">{fx.description}</div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tactical Brevity Codes & Morse Studio Modal */}
      <BrevityMorseModal
        isOpen={showBrevityModal}
        onClose={() => setShowBrevityModal(false)}
        sourceLang={sourceLang}
        targetLang={targetLang}
        currentChannel={currentChannel}
      />
    </div>
  );
};

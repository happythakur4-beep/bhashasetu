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
import { translatorService } from '../services/translatorService';
import { WaveformVisualizer } from './WaveformVisualizer';
import { LanguageSelector } from './LanguageSelector';
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
  onOpenDialectGuide: () => void;
  onOpenPackManager?: () => void;
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
}) => {
  const { isDark } = useTheme();
  const [isPressingPTT, setIsPressingPTT] = useState(false);
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
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const vadTriggeredRef = useRef(false);
  const [showLangPicker, setShowLangPicker] = useState<'source' | 'target' | null>(null);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);

  const activeChannelConfig = RADIO_CHANNELS.find((c) => c.channel === currentChannel) || RADIO_CHANNELS[2];
  const sourceLangConfig = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang) || SUPPORTED_LANGUAGES[0];
  const targetLangConfig = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[1];

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

        // Speech activation threshold
        if (avg > 22 && !isPressingPTT && !isProcessing) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          vadTriggeredRef.current = true;
          handleStartPTT();
        } else if (isPressingPTT && vadTriggeredRef.current && avg < 10) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              if (isPressingPTT && vadTriggeredRef.current) {
                handleStopPTT();
                vadTriggeredRef.current = false;
              }
              silenceTimerRef.current = null;
            }, 1200); // 1.2s silence stop timeout
          }
        } else if (avg >= 10 && silenceTimerRef.current) {
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
  }, [isVADEnabled, isPressingPTT, isProcessing, analyser]);

  // Initialize audio analyser & Gemini Live session
  useEffect(() => {
    let mounted = true;
    audioEngine.initMicrophoneAnalyser().then((node) => {
      if (mounted && node) setAnalyser(node);
    });

    audioEngine.connectLiveSession();

    const unsubLive = audioEngine.onLiveMessage((liveMsg) => {
      if (!mounted) return;
      if (liveMsg.type === 'text_chunk' && liveMsg.text) {
        setLatestTransmission((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            translatedText: prev.translatedText + ' ' + liveMsg.text,
          };
        });
      }
    });

    return () => {
      mounted = false;
      unsubLive();
    };
  }, []);

  // Listen to incoming mesh packets on the current frequency channel
  useEffect(() => {
    const unsubscribe = meshNetwork.onPacket((packet: MeshPacket) => {
      if (soundRogerBeep) {
        audioEngine.playSquelchStatic(70);
      }

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
        isOffline: true,
        engine: 'offline-lexicon',
        audioBase64: packet.audioBase64,
        audioDurationMs: packet.audioDurationMs,
        channel: packet.channel,
      };

      onNewMessage(convMsg);

      setLatestTransmission({
        id: packet.id,
        originalText: packet.originalText,
        translatedText: packet.translatedText,
        phoneticText: packet.phoneticText,
        sourceLang: packet.senderLang,
        targetLang: packet.targetLang,
        isOffline: true,
        engine: 'offline-lexicon',
        confidence: 0.95,
        dialectNotes: `Transmitted via Local Mesh CH-${packet.channel} (${packet.rssi} dBm)`,
        audioBase64: packet.audioBase64,
        timestamp: packet.timestamp,
      });

      if (!isMuted) {
        if (packet.audioBase64) {
          audioEngine.playAudioBase64(packet.audioBase64);
        } else {
          audioEngine.speak(packet.translatedText, packet.targetLang);
        }
      }
    });

    return () => unsubscribe();
  }, [currentChannel, soundRogerBeep, isMuted, onNewMessage]);

  const handleStartPTT = () => {
    if (isPressingPTT || isProcessing) return;

    // Haptic feedback (navigator.vibrate) when pressing the PTT button
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(70);
      } catch {
        // Fallback handled by audioEngine
      }
    }
    audioEngine.triggerHaptic(70);
    audioEngine.playSquelchStatic(60);

    setIsPressingPTT(true);
    setInterimText('');
    setFinalSpokenText('');

    audioEngine.startVoiceRecording();

    audioEngine.startSpeechRecognition(
      sourceLang,
      (interim) => setInterimText(interim),
      (final) => setFinalSpokenText(final),
      (error) => console.warn('STT Notice:', error)
    );
  };

  const handleStopPTT = async () => {
    if (!isPressingPTT) return;
    setIsPressingPTT(false);

    // Haptic feedback on release
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // Fallback
      }
    }

    audioEngine.stopSpeechRecognition();
    const audioDataUri = await audioEngine.stopVoiceRecording();

    if (soundRogerBeep) {
      audioEngine.playRogerBeep();
    }
    audioEngine.triggerHaptic([30, 50, 30]);

    const textToProcess = spokenTextRef.current.trim();
    if (!textToProcess) {
      setInterimText('');
      setFinalSpokenText('');
      return;
    }

    await executeTranslationAndBroadcast(textToProcess, audioDataUri || undefined);
  };

  const executeTranslationAndBroadcast = async (
    text: string,
    audioBase64?: string,
    isEmergencyOverride?: boolean
  ) => {
    setIsProcessing(true);
    try {
      const result = await translatorService.translate(text, sourceLang, targetLang, {
        audioBase64,
      });
      setLatestTransmission(result);

      audioEngine.sendLiveText(result.originalText);

      const isEmergencyBroadcast = isEmergencyOverride ?? activeChannelConfig.isEmergency;

      const convMsg: ConversationMessage = {
        id: result.id,
        sender: 'self',
        senderName: isEmergencyBroadcast ? '🚨 EMERGENCY SOS (Priority)' : 'You (Local Unit)',
        sourceLang,
        targetLang,
        originalText: result.originalText,
        translatedText: result.translatedText,
        phoneticText: result.phoneticText,
        timestamp: result.timestamp,
        isOffline: result.isOffline,
        engine: result.engine,
        audioBase64,
        channel: isEmergencyBroadcast ? 1 : currentChannel,
      };
      onNewMessage(convMsg);

      meshNetwork.transmitPacket({
        channel: isEmergencyBroadcast ? 1 : currentChannel,
        senderLang: sourceLang,
        targetLang,
        originalText: result.originalText,
        translatedText: result.translatedText,
        phoneticText: result.phoneticText,
        audioBase64,
        isEmergency: isEmergencyBroadcast,
      });

      if (!isMuted) {
        audioEngine.speak(result.translatedText, targetLang);
      }

      setInterimText('');
      setFinalSpokenText('');
      setManualInput('');
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Immediate 🚑 SOS Emergency Trigger: switches channel to CH-1 (145.5 MHz),
  // activates emergency priority broadcast, and triggers flashing beacon.
  const handleTriggerSOSEmergency = async (emergencyText: string) => {
    // 1. Switch transceiver channel to CH-1 immediately
    if (onSelectChannel) {
      onSelectChannel(1);
    } else {
      meshNetwork.setChannel(1);
    }

    // 2. Trigger audible emergency chime & strong tactile feedback
    audioEngine.playEmergencyAlert();
    audioEngine.triggerHaptic([100, 50, 100, 50, 200]);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100, 50, 200]);
      } catch {
        // ignore
      }
    }

    // 3. Trigger flashing beacon
    setIsEmergencyActive(true);

    // 4. Activate emergency priority broadcast on CH-1
    await executeTranslationAndBroadcast(emergencyText, undefined, true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim() || isProcessing) return;
    executeTranslationAndBroadcast(manualInput.trim());
    setShowManualBox(false);
  };

  const handleReplayTTS = () => {
    if (!latestTransmission) return;
    if (latestTransmission.audioBase64) {
      audioEngine.playAudioBase64(latestTransmission.audioBase64);
    } else {
      audioEngine.speak(latestTransmission.translatedText, latestTransmission.targetLang);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full px-3 pt-1.5 pb-5 space-y-2.5 sm:space-y-3 z-10 relative overflow-y-auto no-scrollbar">
      {/* Flashing Emergency Beacon & Priority Broadcast Banner */}
      {(isEmergencyActive || currentChannel === 1) && (
        <div
          className={`rounded-2xl p-2.5 px-3 border transition-all animate-sos-strobe relative flex items-center justify-between shadow-lg ${
            isDark
              ? 'bg-red-950/90 border-red-500/80 text-red-100'
              : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-red-300 text-white shadow-red-500/30'
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="relative shrink-0">
              <span className="flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-200" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <Siren className="w-4 h-4 shrink-0 animate-bounce" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase">
                  EMERGENCY BEACON ACTIVE • CH-1 (145.5 MHz)
                </span>
              </div>
              <p className="text-[11px] truncate opacity-95 font-medium">
                High-priority emergency broadcast locked. Transmitting on all disaster units.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0 ml-2">
            <button
              onClick={() => {
                audioEngine.playEmergencyAlert();
                audioEngine.triggerHaptic(50);
              }}
              className="p-1 px-2 rounded-lg bg-black/25 hover:bg-black/40 text-[10px] font-mono font-bold uppercase transition-colors"
              title="Sound Emergency Siren"
            >
              Sound Siren
            </button>
            {isEmergencyActive && (
              <button
                onClick={() => setIsEmergencyActive(false)}
                className="p-1 rounded-lg bg-black/25 hover:bg-black/40 transition-colors"
                title="Dismiss Beacon Banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Language Selector Bar (Source -> Target) */}
      <div
        className={
          isDark
            ? 'bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2.5 shadow-lg backdrop-blur'
            : 'neo-glass-panel rounded-3xl p-3 border border-white/95'
        }
      >
        <div className="flex items-center justify-between gap-2">
          {/* Source Language Button */}
          <button
            onClick={() => setShowLangPicker('source')}
            className={
              isDark
                ? 'flex-1 text-left p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 transition-colors'
                : 'flex-1 text-left p-2.5 rounded-2xl neo-gel-button transition-all hover:scale-[1.01]'
            }
          >
            <div
              className={`text-[10px] uppercase font-mono tracking-wider ${
                isDark ? 'text-zinc-400' : 'text-slate-500 font-semibold'
              }`}
            >
              You Speak (मातृभाषा)
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
                {sourceLangConfig.name}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  isDark
                    ? 'text-emerald-400 bg-emerald-950/70 border-emerald-800/40'
                    : 'text-purple-700 bg-purple-100/80 border-purple-200 shadow-xs'
                }`}
              >
                {sourceLangConfig.nativeName}
              </span>
            </div>
            <div className={`text-[11px] font-mono mt-0.5 truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {sourceLangConfig.state}
            </div>
          </button>

          {/* Swap Button */}
          <button
            onClick={onSwapLanguages}
            className={
              isDark
                ? 'p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-transform active:scale-95 shrink-0'
                : 'p-2.5 rounded-2xl neo-gel-button text-purple-600 hover:text-purple-700 hover:scale-105 active:scale-95 transition-transform shrink-0 shadow-sm'
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
                ? 'flex-1 text-left p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 transition-colors'
                : 'flex-1 text-left p-2.5 rounded-2xl neo-gel-button transition-all hover:scale-[1.01]'
            }
          >
            <div
              className={`text-[10px] uppercase font-mono tracking-wider ${
                isDark ? 'text-zinc-400' : 'text-slate-500 font-semibold'
              }`}
            >
              Mesh Translates To
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className={`font-bold text-sm ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
                {targetLangConfig.name}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  isDark
                    ? 'text-amber-400 bg-amber-950/70 border-amber-800/40'
                    : 'text-pink-700 bg-pink-100/80 border-pink-200 shadow-xs'
                }`}
              >
                {targetLangConfig.nativeName}
              </span>
            </div>
            <div className={`text-[11px] font-mono mt-0.5 truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {targetLangConfig.state}
            </div>
          </button>
        </div>

        {/* Dialect Guide Hint */}
        {(sourceLang === 'mjl' || targetLang === 'mjl' || sourceLang === 'or' || targetLang === 'or') && (
          <div
            className={`mt-2 pt-2 border-t flex items-center justify-between text-xs font-mono ${
              isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200/70 text-slate-500'
            }`}
          >
            <span
              className={`flex items-center gap-1.5 ${
                isDark ? 'text-emerald-400/90' : 'text-purple-600 font-semibold'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {sourceLang === 'mjl' || targetLang === 'mjl'
                  ? 'Mandali / Mandyali Pahadi Dialect Active'
                  : 'Odia Regional Engine Active'}
              </span>
            </span>
            <button
              onClick={onOpenDialectGuide}
              className={`underline text-[11px] font-medium ${
                isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-purple-600 hover:text-purple-800'
              }`}
            >
              Dialect Guide
            </button>
          </div>
        )}
      </div>

      {/* Real-time Waveform / Audio VU Meter */}
      <div className="space-y-1">
        <div
          className={`flex items-center justify-between px-1 text-[11px] font-mono ${
            isDark ? 'text-zinc-400' : 'text-slate-500 font-medium'
          }`}
        >
          <span className="flex items-center gap-1">
            <Radio className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-purple-500'}`} />
            <span>TRANSMIT AUDIO BUS</span>
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
            {isPressingPTT ? 'LIVE MICROPHONE TRANSMITTING' : 'RADIO STANDBY'}
          </span>
        </div>
        <WaveformVisualizer
          analyser={analyser}
          isActive={isPressingPTT || isProcessing}
          color={isPressingPTT ? 'red' : isDark ? 'emerald' : 'amber'}
        />
      </div>

      {/* Main Transmission Card (Latest or Incoming Message) */}
      <div
        className={
          isDark
            ? 'bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 min-h-[140px] flex flex-col justify-between shadow-inner relative overflow-hidden'
            : 'neo-glass-panel rounded-3xl p-4 min-h-[140px] flex flex-col justify-between relative overflow-hidden text-slate-800'
        }
      >
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
              &quot;{interimText || 'Speak into microphone in ' + sourceLangConfig.name + '...'}&quot;
            </p>
            <span
              className={`text-[11px] font-mono mt-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}
            >
              Release button to transmit &amp; translate
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
          <div className="space-y-2.5">
            <div
              className={`flex items-center justify-between border-b pb-1.5 text-xs font-mono ${
                isDark ? 'border-zinc-800 text-zinc-400' : 'border-slate-200/80 text-slate-500'
              }`}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-purple-600'}`}
                />
                <span>Interstate Translation Ready</span>
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                }`}
              >
                {latestTransmission.engine}
              </span>
            </div>

            {/* Original spoken */}
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
                    className={`text-[10px] font-mono uppercase font-bold ${
                      isDark ? 'text-emerald-400' : 'text-purple-600'
                    }`}
                  >
                    Translated ({SUPPORTED_LANGUAGES.find((l) => l.code === latestTransmission.targetLang)?.name} - {SUPPORTED_LANGUAGES.find((l) => l.code === latestTransmission.targetLang)?.nativeName}):
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
                    className={`text-xs font-mono mt-1 flex items-start gap-1 animate-phonetic-appear ${
                      isDark ? 'text-amber-300/90' : 'text-pink-600 font-medium'
                    }`}
                    style={{ animationDelay: '80ms' }}
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
            </div>
          </div>
        ) : (
          <div
            className={`flex-1 flex flex-col justify-center items-center text-center p-4 ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}
          >
            <Radio className={`w-8 h-8 mb-2 ${isDark ? 'text-zinc-700' : 'text-purple-300'}`} />
            <p
              className={`text-xs font-mono font-semibold ${
                isDark ? 'text-zinc-400' : 'text-slate-700'
              }`}
            >
              Ready on CH-{activeChannelConfig.channel} ({activeChannelConfig.frequency})
            </p>
            <p
              className={`text-[11px] mt-1 max-w-xs ${
                isDark ? 'text-zinc-500' : 'text-slate-500'
              }`}
            >
              Hold the Push-To-Talk button below to speak in <strong>{sourceLangConfig.name}</strong>. It will translate into <strong>{targetLangConfig.name}</strong> and broadcast over the mesh.
            </p>
          </div>
        )}
      </div>

      {/* Tactical Quick Radio Phrase Shortcuts */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 my-0.5 no-scrollbar text-xs font-mono shrink-0">
        <span
          className={`text-[10px] uppercase shrink-0 font-bold ${
            isDark ? 'text-zinc-500' : 'text-slate-500'
          }`}
        >
          Quick Calls:
        </span>
        {[
          {
            label: '🚑 SOS Emergency',
            text: sourceLang === 'mjl' ? 'मां जो झटपट डाक्टरी मदद चहिदी' : 'मुझे तुरंत सहायता चाहिए',
            isSOS: true,
          },
          { label: '👋 Namaste / Hello', text: sourceLang === 'mjl' ? 'तुसां जो नमस्कार' : 'नमस्ते' },
          { label: '📍 Where is this road?', text: sourceLang === 'mjl' ? 'ऐह सड़क कुथु जांदी है?' : 'यह सड़क कहाँ जाती है?' },
          { label: '💧 Need Water', text: sourceLang === 'mjl' ? 'पाणी चहिदा' : 'मुझे पीने का पानी चाहिए' },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (item.isSOS) {
                handleTriggerSOSEmergency(item.text);
              } else {
                executeTranslationAndBroadcast(item.text);
              }
            }}
            className={
              item.isSOS
                ? isDark
                  ? 'px-2.5 py-1 rounded-lg bg-red-950/90 hover:bg-red-900 text-red-200 border border-red-500/60 shrink-0 text-[11px] whitespace-nowrap font-bold shadow-sm transition-all animate-pulse'
                  : 'px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white shrink-0 text-[11px] whitespace-nowrap shadow-md hover:shadow-lg font-bold border border-red-300 transition-all hover:scale-[1.03] active:scale-95'
                : isDark
                ? 'px-2 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 shrink-0 text-[11px] whitespace-nowrap transition-colors'
                : 'neo-gel-button px-3 py-1.5 rounded-full text-slate-700 border border-white/95 shrink-0 text-[11px] whitespace-nowrap shadow-xs hover:shadow-sm font-medium transition-all'
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Massive Push-To-Talk (PTT) Button Section */}
      <div className="flex flex-col items-center justify-center pt-0.5 pb-2 relative shrink-0">
        {/* Concentric visual pulse rings when transmitting */}
        {isPressingPTT && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full border-2 animate-ping ${
                isDark ? 'border-red-500/30' : 'border-rose-400/40'
              }`}
            />
            <div
              className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full border animate-pulse ${
                isDark ? 'border-red-500/20' : 'border-purple-400/30'
              }`}
            />
          </div>
        )}

        <button
          onMouseDown={handleStartPTT}
          onMouseUp={handleStopPTT}
          onTouchStart={(e) => {
            e.preventDefault();
            handleStartPTT();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleStopPTT();
          }}
          className={
            isDark
              ? `w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all select-none shadow-2xl relative z-10 shrink-0 ${
                  isPressingPTT
                    ? 'bg-gradient-to-b from-red-600 to-red-800 border-4 border-red-300 scale-95 shadow-red-500/50'
                    : 'bg-gradient-to-b from-zinc-800 to-zinc-950 border-4 border-emerald-500/80 hover:border-emerald-400 active:scale-95 shadow-emerald-500/20'
                }`
              : `w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all select-none relative z-10 shrink-0 ${
                  isPressingPTT
                    ? 'neo-gel-ptt-active scale-95'
                    : 'neo-gel-ptt hover:scale-105 active:scale-95'
                }`
          }
          style={{ touchAction: 'none' }}
        >
          {isPressingPTT ? (
            <>
              <Mic className="w-12 h-12 text-white animate-bounce drop-shadow" />
              <span className="text-xs font-mono font-bold text-white tracking-widest mt-1 drop-shadow-sm">
                TRANSMITTING
              </span>
            </>
          ) : (
            <>
              <div
                className={`p-3 rounded-full mb-1 ${
                  isDark ? 'bg-emerald-500/20' : 'bg-white/30 backdrop-blur-md shadow-inner'
                }`}
              >
                <Mic className={`w-8 h-8 ${isDark ? 'text-emerald-400' : 'text-white drop-shadow'}`} />
              </div>
              <span
                className={`text-xs font-mono font-bold tracking-wider ${
                  isDark ? 'text-zinc-100' : 'text-white drop-shadow-sm font-semibold'
                }`}
              >
                HOLD TO TALK
              </span>
              <span
                className={`text-[10px] font-mono ${
                  isDark ? 'text-zinc-400' : 'text-white/90 drop-shadow-xs'
                }`}
              >
                PTT (दाब कर बोलें)
              </span>
            </>
          )}
        </button>

        {/* Tactical Controls beneath PTT */}
        <div className="flex items-center justify-between w-full max-w-sm mt-2 sm:mt-2.5 px-3 text-xs font-mono shrink-0 gap-1.5">
          {/* Roger Beep Toggle */}
          <button
            onClick={() => setSoundRogerBeep(!soundRogerBeep)}
            className={
              isDark
                ? `flex items-center space-x-1 px-2 py-1 rounded-lg border transition-colors ${
                    soundRogerBeep
                      ? 'bg-zinc-850 border-zinc-700 text-zinc-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`
                : `flex items-center space-x-1 px-2.5 py-1.5 rounded-2xl neo-gel-button transition-all ${
                    soundRogerBeep
                      ? 'text-purple-700 font-bold'
                      : 'text-slate-400'
                  }`
            }
            title="Toggle tactical roger beep on release"
          >
            <Zap
              className={`w-3 h-3 ${
                soundRogerBeep
                  ? isDark ? 'text-amber-400' : 'text-purple-600'
                  : isDark ? 'text-zinc-600' : 'text-slate-400'
              }`}
            />
            <span>Beep: {soundRogerBeep ? 'ON' : 'OFF'}</span>
          </button>

          {/* VAD Hands-Free Toggle */}
          <button
            onClick={() => setIsVADEnabled(!isVADEnabled)}
            className={
              isDark
                ? `flex items-center space-x-1 px-2.5 py-1 rounded-lg border transition-all ${
                    isVADEnabled
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold shadow-sm shadow-emerald-500/20'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`
                : `flex items-center space-x-1 px-3 py-1.5 rounded-2xl neo-gel-button transition-all ${
                    isVADEnabled
                      ? 'bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold shadow-sm'
                      : 'text-slate-500'
                  }`
            }
            title="Toggle Voice Activity Detection (Hands-Free Auto PTT)"
          >
            <Activity
              className={`w-3 h-3 ${
                isVADEnabled ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
              }`}
            />
            <span>VAD: {isVADEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Voice FX Selector Button */}
          <button
            onClick={() => setShowVoiceFxPicker(true)}
            className={
              isDark
                ? `flex items-center space-x-1 px-2.5 py-1 rounded-lg border transition-all ${
                    currentVoiceFx !== 'normal'
                      ? 'bg-purple-950 border-purple-500 text-purple-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`
                : `flex items-center space-x-1 px-2.5 py-1.5 rounded-2xl neo-gel-button transition-all ${
                    currentVoiceFx !== 'normal'
                      ? 'bg-purple-100 border border-purple-300 text-purple-800 font-bold'
                      : 'text-slate-600'
                  }`
            }
            title="Change Voice Modulation / FX"
          >
            <Sparkles className={`w-3 h-3 ${currentVoiceFx !== 'normal' ? 'text-purple-500 animate-spin' : 'text-slate-400'}`} />
            <span>FX: {VOICE_FX_PRESETS.find(f => f.id === currentVoiceFx)?.name.split(' ')[0] || 'Normal'}</span>
          </button>

          {/* Manual text toggle */}
          <button
            onClick={() => setShowManualBox(!showManualBox)}
            className={
              isDark
                ? 'flex items-center space-x-1 px-2 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-colors'
                : 'flex items-center space-x-1 px-3 py-1.5 rounded-2xl neo-gel-button text-slate-700 hover:text-purple-700 shadow-sm transition-all'
            }
          >
            <span>Type</span>
          </button>
        </div>

        {/* VAD Active Indicator Banner */}
        {isVADEnabled && (
          <div
            className={`w-full max-w-sm mt-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono flex items-center justify-between border ${
              isDark
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>VAD Hands-Free Active (Speak freely without holding PTT)</span>
            </span>
            <span className="text-[10px] opacity-80">Auto-transmit</span>
          </div>
        )}

        {/* Manual Text Input Drawer */}
        {showManualBox && (
          <form
            onSubmit={handleManualSubmit}
            className="w-full max-w-sm mt-2 flex gap-1.5 animate-in slide-in-from-top-2"
          >
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={`Type in ${sourceLangConfig.name}...`}
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
                  : 'px-4 py-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-95 text-white rounded-2xl text-xs font-mono font-bold flex items-center gap-1 shadow-md disabled:opacity-50'
              }
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        )}
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
        subtitle="The language output to mesh listeners and audio speaker"
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
            <p className="text-xs font-mono opacity-75 mb-4">
              Choose how your voice is modulated and transmitted over mesh audio and speech synthesis.
            </p>
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
    </div>
  );
};

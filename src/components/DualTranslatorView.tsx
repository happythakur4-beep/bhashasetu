import React, { useState, useRef } from 'react';
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
  FileText,
  X,
} from 'lucide-react';
import { ConversationMessage, LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../services/languageRegistry';
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
}

export const DualTranslatorView: React.FC<DualTranslatorViewProps> = ({
  sourceLang,
  targetLang,
  onChangeSourceLang,
  onChangeTargetLang,
  onNewMessage,
  isMuted,
  onOpenPackManager,
}) => {
  const { isDark } = useTheme();
  const [activeSpeaker, setActiveSpeaker] = useState<'A' | 'B' | null>(null);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLangPicker, setShowLangPicker] = useState<'A' | 'B' | null>(null);
  const [conversationList, setConversationList] = useState<ConversationMessage[]>([]);

  // Batch Processing Mode state
  const [isBatchModeOpen, setIsBatchModeOpen] = useState(false);
  const [isBatchRecording, setIsBatchRecording] = useState(false);
  const [batchSeconds, setBatchSeconds] = useState(0);
  const [batchTranscript, setBatchTranscript] = useState('');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<ConversationMessage[]>([]);
  const batchTimerRef = useRef<any>(null);

  const langA = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang) || SUPPORTED_LANGUAGES[0];
  const langB = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[1];

  const spokenRef = useRef('');
  spokenRef.current = finalText || interimText;

  // Start listening for Speaker A or Speaker B
  const startListening = (speaker: 'A' | 'B') => {
    if (activeSpeaker || isProcessing) return;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch {
        // Fallback
      }
    }
    audioEngine.triggerHaptic(50);
    setActiveSpeaker(speaker);
    setInterimText('');
    setFinalText('');

    audioEngine.startVoiceRecording();

    const langCode = speaker === 'A' ? sourceLang : targetLang;

    audioEngine.startSpeechRecognition(
      langCode,
      (interim) => setInterimText(interim),
      (final) => setFinalText(final),
      (err) => console.warn('Dual STT err:', err)
    );
  };

  // Stop listening and translate
  const stopListening = async () => {
    if (!activeSpeaker) return;
    const speaker = activeSpeaker;
    setActiveSpeaker(null);
    audioEngine.stopSpeechRecognition();
    const audioDataUri = await audioEngine.stopVoiceRecording();

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([30, 40]);
      } catch {
        // Fallback
      }
    }
    audioEngine.triggerHaptic([30, 40]);

    const textToTranslate = spokenRef.current.trim();
    if (!textToTranslate) return;

    setIsProcessing(true);
    try {
      const fromLang = speaker === 'A' ? sourceLang : targetLang;
      const toLang = speaker === 'A' ? targetLang : sourceLang;

      const result = await translatorService.translate(textToTranslate, fromLang, toLang, {
        audioBase64: audioDataUri || undefined,
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
      };

      setConversationList((prev) => [msg, ...prev]);
      onNewMessage(msg);

      if (!isMuted) {
        audioEngine.speak(result.translatedText, toLang);
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsProcessing(false);
      setInterimText('');
      setFinalText('');
    }
  };

  // Start Batch Long Session Recording
  const startBatchRecording = () => {
    setIsBatchRecording(true);
    setBatchSeconds(0);
    setBatchTranscript('');
    setBatchResults([]);
    audioEngine.startVoiceRecording();
    audioEngine.startSpeechRecognition(
      sourceLang,
      (interim) => setBatchTranscript((prev) => prev + ' ' + interim),
      (final) => setBatchTranscript((prev) => prev + ' ' + final),
      (err) => console.warn('Batch STT err:', err)
    );
    batchTimerRef.current = setInterval(() => {
      setBatchSeconds((s) => s + 1);
    }, 1000);
  };

  // Stop Batch Recording & Process Chronological List
  const stopBatchRecording = async () => {
    setIsBatchRecording(false);
    if (batchTimerRef.current) clearInterval(batchTimerRef.current);
    audioEngine.stopSpeechRecognition();
    const audioUri = await audioEngine.stopVoiceRecording();

    const fullText = batchTranscript.trim() || 'Welcome to our batch session. We are discussing multilingual communication, emergency response protocols, and interstate travel guides across India.';
    setIsBatchProcessing(true);

    try {
      const segments = fullText.split(/[.?!]+/).filter((s) => s.trim().length > 0);
      if (segments.length === 0) segments.push(fullText);

      const newMessages: ConversationMessage[] = [];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i].trim();
        if (!seg) continue;
        const res = await translatorService.translate(seg, sourceLang, targetLang, {
          audioBase64: i === 0 ? audioUri || undefined : undefined,
        });

        const msg: ConversationMessage = {
          id: `batch_${Date.now()}_${i}`,
          sender: i % 2 === 0 ? 'self' : 'peer',
          senderName: i % 2 === 0 ? `Speaker 1 (${langA.name})` : `Speaker 2 (${langB.name})`,
          sourceLang: i % 2 === 0 ? sourceLang : targetLang,
          targetLang: i % 2 === 0 ? targetLang : sourceLang,
          originalText: res.originalText,
          translatedText: res.translatedText,
          phoneticText: res.phoneticText,
          timestamp: Date.now() + i * 1500,
          isOffline: res.isOffline,
          engine: res.engine,
        };
        newMessages.push(msg);
        setConversationList((prev) => [msg, ...prev]);
        onNewMessage(msg);
      }

      setBatchResults(newMessages);
    } catch (err) {
      console.error('Batch processing error:', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full px-3 py-2 space-y-3 z-10 relative">
      {/* Top Dual Control Bar with Batch Mode Trigger */}
      <div className="flex items-center justify-between gap-2">
        <div
          className={
            isDark
              ? 'flex-1 grid grid-cols-2 gap-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2 shadow-lg'
              : 'flex-1 grid grid-cols-2 gap-2.5 neo-glass-panel rounded-3xl p-2.5 border border-white/95'
          }
        >
          {/* Person A Selector */}
          <button
            onClick={() => setShowLangPicker('A')}
            className={
              isDark
                ? 'text-left p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 transition-colors'
                : 'text-left p-2.5 rounded-2xl neo-gel-button transition-all hover:scale-[1.01]'
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
            <div className={`text-sm font-bold mt-0.5 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              {langA.name}
            </div>
            <div className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-blue-600'}`}>
              {langA.nativeName}
            </div>
          </button>

          {/* Person B Selector */}
          <button
            onClick={() => setShowLangPicker('B')}
            className={
              isDark
                ? 'text-left p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 transition-colors'
                : 'text-left p-2.5 rounded-2xl neo-gel-button transition-all hover:scale-[1.01]'
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
            <div className={`text-sm font-bold mt-0.5 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              {langB.name}
            </div>
            <div className={`text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-purple-600'}`}>
              {langB.nativeName}
            </div>
          </button>
        </div>

        {/* Batch Session Button */}
        <button
          onClick={() => setIsBatchModeOpen(true)}
          className={
            isDark
              ? 'p-3 rounded-2xl bg-zinc-900/90 border border-purple-500/50 hover:bg-zinc-800 text-purple-400 flex flex-col items-center justify-center shadow-lg transition-all'
              : 'p-3 rounded-3xl neo-glass-panel border border-purple-300 text-purple-700 hover:scale-105 flex flex-col items-center justify-center shadow-md'
          }
          title="Batch Processing & Long Session Mode"
        >
          <Layers className="w-5 h-5 mb-0.5 animate-pulse" />
          <span className="text-[10px] font-mono font-bold whitespace-nowrap">Batch Mode</span>
        </button>
      </div>

      {/* Live Conversation Stream */}
      <div
        className={
          isDark
            ? 'flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 overflow-y-auto space-y-3 min-h-[220px] max-h-[46vh]'
            : 'flex-1 neo-glass-panel rounded-3xl p-3.5 overflow-y-auto space-y-3 min-h-[220px] max-h-[46vh] border border-white/95'
        }
      >
        {conversationList.length === 0 ? (
          <div
            className={`h-full flex flex-col items-center justify-center text-center p-6 font-mono ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}
          >
            <ArrowRightLeft className={`w-8 h-8 mb-2 ${isDark ? 'text-zinc-700' : 'text-purple-300'}`} />
            <p className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>
              Face-to-Face Dual & Batch Mode Active
            </p>
            <p className={`text-[11px] mt-1 max-w-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
              Speaker 1 speaks in <strong>{langA.name}</strong>, translated to <strong>{langB.name}</strong>. Or open <strong>Batch Mode</strong> for long recordings.
            </p>
          </div>
        ) : (
          conversationList.map((item) => {
            const isSpeakerA = item.sourceLang === sourceLang;
            return (
              <div
                key={item.id}
                className={
                  isDark
                    ? `p-3 rounded-2xl border transition-all ${
                        isSpeakerA
                          ? 'bg-zinc-850/90 border-emerald-900/40 mr-4'
                          : 'bg-zinc-900 border-amber-900/40 ml-4'
                      }`
                    : `p-3.5 rounded-3xl border transition-all shadow-xs ${
                        isSpeakerA
                          ? 'bg-gradient-to-r from-blue-50/90 to-purple-50/70 border-blue-200/80 mr-4 text-slate-800'
                          : 'bg-gradient-to-r from-purple-50/90 to-pink-50/70 border-purple-200/80 ml-4 text-slate-800'
                      }`
                }
              >
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <span
                    className={`font-bold ${
                      isSpeakerA
                        ? isDark ? 'text-emerald-400' : 'text-blue-700'
                        : isDark ? 'text-amber-400' : 'text-purple-700'
                    }`}
                  >
                    {item.senderName}
                  </span>
                  <div className={`flex items-center space-x-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-medium ${
                        isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-white/80 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      {item.engine}
                    </span>
                    <button
                      onClick={() => copyToClipboard(item.translatedText, item.id)}
                      className={`p-1 ${isDark ? 'hover:text-zinc-200' : 'hover:text-slate-800'}`}
                      title="Copy text"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => audioEngine.speak(item.translatedText, item.targetLang)}
                      className={`p-1 ${isDark ? 'hover:text-zinc-200' : 'hover:text-purple-700'}`}
                      title="Play speech"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600 font-medium'}`}>
                  <span
                    className={`text-[10px] uppercase font-mono mr-1 ${
                      isDark ? 'text-zinc-500' : 'text-slate-400'
                    }`}
                  >
                    Spoke:
                  </span>
                  &quot;{item.originalText}&quot;
                </div>

                <div className={`mt-1.5 pt-1.5 border-t ${isDark ? 'border-zinc-800' : 'border-slate-200/70'}`}>
                  <div className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                    {item.translatedText}
                  </div>
                  <div
                    className={`text-xs font-mono mt-0.5 italic animate-phonetic-appear ${
                      isDark ? 'text-amber-300/80' : 'text-purple-600 font-medium'
                    }`}
                    style={{ animationDelay: '80ms' }}
                  >
                    Phonetic: &quot;{item.phoneticText}&quot;
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Active Speech Transcription Card */}
      {activeSpeaker && (
        <div
          className={
            isDark
              ? 'p-3 bg-zinc-950 border border-emerald-500/60 rounded-xl text-center animate-pulse'
              : 'p-3.5 neo-glass-panel border-purple-400/80 rounded-3xl text-center animate-pulse shadow-md'
          }
        >
          <div
            className={`text-xs font-mono font-bold ${
              isDark ? 'text-emerald-400' : 'text-purple-700'
            }`}
          >
            Listening to {activeSpeaker === 'A' ? langA.name : langB.name}...
          </div>
          <p
            className={`text-sm font-semibold mt-1 italic ${
              isDark ? 'text-zinc-200' : 'text-slate-800'
            }`}
          >
            &quot;{interimText || 'Speak now...'}&quot;
          </p>
        </div>
      )}

      {/* Dual Big Push Buttons for Both Speakers */}
      <div className="grid grid-cols-2 gap-3 pt-1 pb-2">
        {/* Speaker 1 Mic Button */}
        <button
          onMouseDown={() => startListening('A')}
          onMouseUp={stopListening}
          onTouchStart={(e) => {
            e.preventDefault();
            startListening('A');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopListening();
          }}
          className={
            isDark
              ? `h-24 rounded-2xl flex flex-col items-center justify-center p-2 border-2 transition-all select-none shadow-lg ${
                  activeSpeaker === 'A'
                    ? 'bg-gradient-to-b from-emerald-600 to-emerald-800 border-emerald-300 scale-95 shadow-emerald-500/50'
                    : 'bg-zinc-850 hover:bg-zinc-800 border-emerald-600/70 text-zinc-100 active:scale-95'
                }`
              : `h-24 rounded-3xl flex flex-col items-center justify-center p-2 transition-all select-none shadow-md ${
                  activeSpeaker === 'A'
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white scale-95 shadow-blue-400/50 border-2 border-white'
                    : 'neo-gel-button border-2 border-white/95 text-slate-800 hover:scale-[1.02] active:scale-95'
                }`
          }
          style={{ touchAction: 'none' }}
        >
          <Mic
            className={`w-7 h-7 mb-1 ${
              activeSpeaker === 'A'
                ? 'text-white animate-bounce'
                : isDark
                ? 'text-emerald-400'
                : 'text-blue-500'
            }`}
          />
          <span className="text-xs font-bold font-mono">
            {activeSpeaker === 'A' ? 'RELEASE TO TRANSLATE' : `HOLD: ${langA.name.toUpperCase()}`}
          </span>
          <span
            className={`text-[10px] font-mono ${
              activeSpeaker === 'A'
                ? 'text-white/80'
                : isDark
                ? 'text-zinc-400'
                : 'text-slate-500'
            }`}
          >
            {langA.nativeName}
          </span>
        </button>

        {/* Speaker 2 Mic Button */}
        <button
          onMouseDown={() => startListening('B')}
          onMouseUp={stopListening}
          onTouchStart={(e) => {
            e.preventDefault();
            startListening('B');
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopListening();
          }}
          className={
            isDark
              ? `h-24 rounded-2xl flex flex-col items-center justify-center p-2 border-2 transition-all select-none shadow-lg ${
                  activeSpeaker === 'B'
                    ? 'bg-gradient-to-b from-amber-600 to-amber-800 border-amber-300 scale-95 shadow-amber-500/50'
                    : 'bg-zinc-850 hover:bg-zinc-800 border-amber-600/70 text-zinc-100 active:scale-95'
                }`
              : `h-24 rounded-3xl flex flex-col items-center justify-center p-2 transition-all select-none shadow-md ${
                  activeSpeaker === 'B'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-95 shadow-purple-400/50 border-2 border-white'
                    : 'neo-gel-button border-2 border-white/95 text-slate-800 hover:scale-[1.02] active:scale-95'
                }`
          }
          style={{ touchAction: 'none' }}
        >
          <Mic
            className={`w-7 h-7 mb-1 ${
              activeSpeaker === 'B'
                ? 'text-white animate-bounce'
                : isDark
                ? 'text-amber-400'
                : 'text-purple-500'
            }`}
          />
          <span className="text-xs font-bold font-mono">
            {activeSpeaker === 'B' ? 'RELEASE TO TRANSLATE' : `HOLD: ${langB.name.toUpperCase()}`}
          </span>
          <span
            className={`text-[10px] font-mono ${
              activeSpeaker === 'B'
                ? 'text-white/80'
                : isDark
                ? 'text-zinc-400'
                : 'text-slate-500'
            }`}
          >
            {langB.nativeName}
          </span>
        </button>
      </div>

      {/* Batch Processing Mode Modal / Drawer */}
      {isBatchModeOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={
              isDark
                ? 'bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg p-5 flex flex-col max-h-[85vh] shadow-2xl animate-in fade-in zoom-in duration-200'
                : 'bg-white border border-purple-200 rounded-3xl w-full max-w-lg p-5 flex flex-col max-h-[85vh] shadow-2xl animate-in fade-in zoom-in duration-200'
            }
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Layers className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                <h3 className={`text-base font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  Batch Session & Long Recording
                </h3>
              </div>
              <button
                onClick={() => setIsBatchModeOpen(false)}
                className={`p-1.5 rounded-full ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1">
              <div
                className={`p-4 rounded-2xl border text-center ${
                  isDark ? 'bg-zinc-850/80 border-zinc-750' : 'bg-purple-50/60 border-purple-200'
                }`}
              >
                <p className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  Translate Long Sessions into a Chronological Translated Transcript
                </p>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Record a continuous speech segment in <strong>{langA.name}</strong>. When you stop, the engine automatically converts the entire segment into chronological translated messages in <strong>{langB.name}</strong>.
                </p>

                <div className="mt-4 flex flex-col items-center justify-center space-y-3">
                  {!isBatchRecording && !isBatchProcessing ? (
                    <button
                      onClick={startBatchRecording}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                    >
                      <Mic className="w-5 h-5 animate-pulse" />
                      <span>Start Long Session Recording</span>
                    </button>
                  ) : isBatchRecording ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 font-mono text-sm text-red-400 animate-pulse font-bold">
                        <Clock className="w-4 h-4" />
                        <span>Recording Session... {Math.floor(batchSeconds / 60)}:{String(batchSeconds % 60).padStart(2, '0')}</span>
                      </div>
                      <p className={`text-xs italic ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                        &quot;{batchTranscript || 'Listening to your long speech...'}&quot;
                      </p>
                      <button
                        onClick={stopBatchRecording}
                        className="px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        <span>Stop & Batch Process</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2 py-4">
                      <Sparkles className="w-6 h-6 text-purple-500 animate-spin" />
                      <span className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                        Processing batch transcription & chronological translation...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {batchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Chronological Translated Messages ({batchResults.length})
                    </span>
                    <button
                      onClick={() => copyToClipboard(batchResults.map(m => `${m.senderName}: ${m.translatedText}`).join('\n'), 'batch_all')}
                      className={`text-xs font-mono px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                        isDark ? 'bg-zinc-800 text-purple-400 hover:bg-zinc-750' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      {copiedId === 'batch_all' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy All</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {batchResults.map((msg, idx) => (
                      <div
                        key={msg.id}
                        className={
                          isDark
                            ? 'p-3 rounded-xl bg-zinc-850/80 border border-zinc-750 space-y-1'
                            : 'p-3 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-1'
                        }
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                          <span className="font-bold text-purple-400">#{idx + 1} • {msg.senderName}</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                          Original: &quot;{msg.originalText}&quot;
                        </div>
                        <div className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                          {msg.translatedText}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setIsBatchModeOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  isDark ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                }`}
              >
                Close Batch Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language Modals */}
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

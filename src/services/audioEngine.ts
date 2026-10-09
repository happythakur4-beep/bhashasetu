import { LanguageCode, VoiceFxConfig, VoiceFxType } from '../types';
import { SUPPORTED_LANGUAGES } from './languageRegistry';

export const VOICE_FX_PRESETS: VoiceFxConfig[] = [
  { id: 'normal', name: 'Standard Voice', description: 'Clear natural speaking voice', pitch: 1.0, rate: 1.0, icon: 'Mic' },
  { id: 'deep_commander', name: 'Tactical Commander', description: 'Deep, commanding authoritative tone', pitch: 0.6, rate: 0.9, icon: 'Shield' },
  { id: 'radio_dispatch', name: 'Radio Dispatcher', description: 'Crisp radio transceiver pitch', pitch: 1.35, rate: 1.1, icon: 'Radio' },
  { id: 'cyborg_tactical', name: 'Cyber Recon', description: 'Slightly lowered futuristic modulation', pitch: 0.8, rate: 1.0, icon: 'Zap' },
  { id: 'mountain_echo', name: 'Mountain Ranger', description: 'Majestic resonance for wide signals', pitch: 1.1, rate: 0.85, icon: 'Flame' },
];

// Declare Web Speech API types for TypeScript
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export type LiveMessageCallback = (msg: {
  type: 'audio_chunk' | 'text_chunk' | 'turn_complete' | 'interrupted' | 'error' | 'session_ready';
  audio?: string;
  text?: string;
  message?: string;
}) => void;

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recognition: SpeechRecognitionInstance | null = null;
  private isRecognizing = false;
  private currentLanguage: LanguageCode = 'hi';

  // Gemini Live API state
  private liveWs: WebSocket | null = null;
  private liveCallbacks: Set<LiveMessageCallback> = new Set();
  private nextLiveAudioStartTime = 0;
  private pcmProcessor: ScriptProcessorNode | null = null;

  // Language Pack Offline TTS tuning
  private speechPitchMultiplier = 1.0;
  private speechRateMultiplier = 1.0;
  private hapticOnComplete = true;
  private currentVoiceFx: VoiceFxType = 'normal';

  public setVoiceFx(fx: VoiceFxType) {
    this.currentVoiceFx = fx;
  }

  public getVoiceFx(): VoiceFxType {
    return this.currentVoiceFx;
  }

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }

  public setSpeechPreferences(prefs: {
    speechPitch?: number;
    speechRate?: number;
    hapticOnSpeechComplete?: boolean;
  }) {
    if (prefs.speechPitch !== undefined) this.speechPitchMultiplier = prefs.speechPitch;
    if (prefs.speechRate !== undefined) this.speechRateMultiplier = prefs.speechRate;
    if (prefs.hapticOnSpeechComplete !== undefined) this.hapticOnComplete = prefs.hapticOnSpeechComplete;
  }

  // Initialize Web Audio Context safely
  public getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Synthesize Tactical Walkie-Talkie Roger Beep
  public playRogerBeep() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // First high tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1440, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Second confirming tone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(960, now + 0.08);
      gain2.gain.setValueAtTime(0.15, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.18);
    } catch {
      // Audio playback suppressed or not allowed yet
    }
  }

  // Synthesize tactical squelch / radio transmission static burst
  public playSquelchStatic(durationMs = 90) {
    try {
      const ctx = this.getAudioContext();
      const bufferSize = ctx.sampleRate * (durationMs / 1000);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.08;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter for radio character
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch {
      // Ignored if sound context suspended
    }
  }

  // Play Emergency SOS alert chime
  public playEmergencyAlert() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now + i * 0.15);
        osc.frequency.exponentialRampToValueAtTime(440, now + i * 0.15 + 0.12);
        gain.gain.setValueAtTime(0.18, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.12);
      }
    } catch {
      // Ignore
    }
  }

  // Setup Microphone & Audio Analyser for VU Meter Waveform
  public async initMicrophoneAnalyser(): Promise<AnalyserNode | null> {
    if (this.analyser && this.micStream) {
      return this.analyser;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micStream = stream;
      const ctx = this.getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 128;
      source.connect(this.analyser);
      return this.analyser;
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      return null;
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // Start recording voice chunk to transmit over mesh / transcribe
  public startVoiceRecording(): void {
    if (!this.micStream) return;
    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(this.micStream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(100);
    } catch (e) {
      console.warn('MediaRecorder error:', e);
    }
  }

  // Stop recording voice chunk and return Base64 string
  public async stopVoiceRecording(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        return resolve(null);
      }
      this.mediaRecorder.onstop = async () => {
        if (this.recordedChunks.length === 0) return resolve(null);
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  // Accurate Audio Transcription using model 'gemini-3.5-transcribe'
  public async transcribeAudio(
    audioDataUri: string,
    language?: LanguageCode
  ): Promise<{ transcript: string; model: string } | null> {
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioDataUri,
          language,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.transcript) {
          return {
            transcript: json.transcript,
            model: json.model || 'gemini-3.5-transcribe',
          };
        }
      }
      return null;
    } catch (err) {
      console.warn('Audio transcription with gemini-3.5-transcribe error:', err);
      return null;
    }
  }

  // Gemini Live API (gemini-3.8-live) WebSocket Session Management
  public connectLiveSession(): WebSocket | null {
    if (typeof window === 'undefined') return null;
    if (this.liveWs && (this.liveWs.readyState === WebSocket.OPEN || this.liveWs.readyState === WebSocket.CONNECTING)) {
      return this.liveWs;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Play 24kHz raw PCM audio chunks from gemini-3.8-live
          if (msg.type === 'audio_chunk' && msg.audio) {
            this.playRawPcm24k(msg.audio);
          }
          if (msg.type === 'interrupted') {
            this.stopSpeaking();
          }
          this.liveCallbacks.forEach((cb) => {
            try {
              cb(msg);
            } catch {
              // ignore
            }
          });
        } catch {
          // ignore
        }
      };

      ws.onerror = (e) => {
        console.warn('Live API WS notice:', e);
      };

      ws.onclose = () => {
        this.liveWs = null;
      };

      this.liveWs = ws;
      return ws;
    } catch (e) {
      console.warn('Failed to establish Live API WS:', e);
      return null;
    }
  }

  // Send real-time audio chunk to gemini-3.8-live
  public sendLiveAudioChunk(pcmBase64: string): void {
    if (this.liveWs && this.liveWs.readyState === WebSocket.OPEN) {
      this.liveWs.send(JSON.stringify({
        type: 'audio',
        audio: pcmBase64,
        mimeType: 'audio/pcm;rate=16000',
      }));
    }
  }

  // Send text to gemini-3.8-live
  public sendLiveText(text: string): void {
    if (this.liveWs && this.liveWs.readyState === WebSocket.OPEN) {
      this.liveWs.send(JSON.stringify({
        type: 'text',
        text,
      }));
    }
  }

  public onLiveMessage(callback: LiveMessageCallback): () => void {
    this.liveCallbacks.add(callback);
    return () => {
      this.liveCallbacks.delete(callback);
    };
  }

  // Playback 24kHz raw PCM from gemini-3.8-live with gapless AudioContext scheduling
  public playRawPcm24k(base64Pcm: string) {
    try {
      const binary = atob(base64Pcm);
      const int16Array = new Int16Array(binary.length / 2);
      for (let i = 0; i < int16Array.length; i++) {
        int16Array[i] = binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8);
      }
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const ctx = this.getAudioContext();
      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      if (this.nextLiveAudioStartTime < now) {
        this.nextLiveAudioStartTime = now + 0.02;
      }
      source.start(this.nextLiveAudioStartTime);
      this.nextLiveAudioStartTime += audioBuffer.duration;
    } catch (err) {
      console.warn('Error playing live PCM audio:', err);
    }
  }

  // Check if Web Speech Recognition is supported
  public isSpeechRecognitionSupported(): boolean {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  // Start STT (Speech-to-Text)
  public startSpeechRecognition(
    lang: LanguageCode,
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError: (err: string) => void
  ): boolean {
    const SpeechRecClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecClass) {
      onError('Speech Recognition is not natively supported in this browser.');
      return false;
    }

    if (this.isRecognizing) {
      this.stopSpeechRecognition();
    }

    this.currentLanguage = lang;
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    const bcp47 = langConfig ? langConfig.sttCode : 'hi-IN';

    try {
      this.recognition = new SpeechRecClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = bcp47;

      this.recognition.onstart = () => {
        this.isRecognizing = true;
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript) {
          onInterim(interimTranscript);
        }
        if (finalTranscript) {
          onFinal(finalTranscript);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error !== 'no-speech') {
          onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isRecognizing = false;
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      onError(err?.message || 'Failed to start speech recognition');
      return false;
    }
  }

  // Stop STT
  public stopSpeechRecognition(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
    this.isRecognizing = false;
  }

  // Text to Speech (TTS) Output
  public speak(
    text: string,
    lang: LanguageCode,
    options?: { onStart?: () => void; onEnd?: () => void; pitch?: number; rate?: number }
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not available');
        resolve();
        return;
      }

      window.speechSynthesis.cancel(); // Stop prior speech

      const utterance = new SpeechSynthesisUtterance(text);
      const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === lang);

      // Pitch & Rate tuning for Indian regional accents with language pack multipliers and Voice FX
      const fxConfig = VOICE_FX_PRESETS.find((f) => f.id === this.currentVoiceFx) || VOICE_FX_PRESETS[0];
      const basePitch = options?.pitch ?? ((langConfig?.ttsPitch || 1.0) * fxConfig.pitch);
      const baseRate = options?.rate ?? ((langConfig?.ttsRate || 0.95) * fxConfig.rate);
      utterance.pitch = Math.max(0.3, Math.min(2.0, basePitch * this.speechPitchMultiplier));
      utterance.rate = Math.max(0.4, Math.min(2.0, baseRate * this.speechRateMultiplier));

      // Select matching voice
      const voices = window.speechSynthesis.getVoices();
      const targetCode = langConfig ? langConfig.ttsCode : 'hi-IN';

      // Look for Hindi or Indian English voice
      const matchedVoice = voices.find((v) => v.lang.startsWith(targetCode.split('-')[0]) || v.lang.includes('IN')) ||
                           voices.find((v) => v.lang.startsWith('hi') || v.lang.startsWith('en'));

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      utterance.lang = targetCode;

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        if (this.hapticOnComplete) {
          this.triggerHaptic(20);
        }
        options?.onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('TTS utterance error:', e);
        options?.onEnd?.();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  // Stop any active TTS audio
  public stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.nextLiveAudioStartTime = 0;
  }

  // Play audio from base64 string (peer's real recorded voice)
  public playAudioBase64(base64: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(base64);
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      } catch {
        resolve();
      }
    });
  }

  // Trigger tactile vibration on Android / mobile devices
  public triggerHaptic(pattern: number | number[] = 50): void {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore
      }
    }
  }
}

export const audioEngine = new AudioEngine();

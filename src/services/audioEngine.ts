import { LanguageCode, VoiceFxConfig, VoiceFxType } from '../types';
import { SUPPORTED_LANGUAGES } from './languageRegistry';

export const VOICE_FX_PRESETS: VoiceFxConfig[] = [
  { id: 'normal', name: 'Standard Voice', description: 'Clear natural speaking voice', pitch: 1.0, rate: 1.0, icon: 'Mic' },
  { id: 'deep_commander', name: 'Tactical Commander', description: 'Deep authoritative tone', pitch: 0.7, rate: 0.9, icon: 'Shield' },
  { id: 'radio_dispatch', name: 'Radio Dispatcher', description: 'Crisp radio transceiver pitch', pitch: 1.25, rate: 1.1, icon: 'Radio' },
  { id: 'cyborg_tactical', name: 'Cyber Recon', description: 'Futuristic modulation', pitch: 0.85, rate: 1.0, icon: 'Zap' },
  { id: 'mountain_echo', name: 'Mountain Ranger', description: 'High resonance for distance', pitch: 1.1, rate: 0.9, icon: 'Flame' },
];

export interface OfflineVoicePersona {
  id: string;
  name: string;
  nativeTitle: string;
  gender: 'Female' | 'Male' | 'Neutral';
  description: string;
  pitch: number;
  rate: number;
  iconName: 'Sparkles' | 'Shield' | 'Radio' | 'User' | 'Flame' | 'Zap';
  tag: string;
}

export const OFFLINE_VOICE_PERSONAS: OfflineVoicePersona[] = [
  {
    id: 'vani_female',
    name: 'Vani Neural Female',
    nativeTitle: 'वाणी न्यूरल (महिला)',
    gender: 'Female',
    description: 'High-definition natural feminine cadence, tuned for North, West & South regional dialects.',
    pitch: 1.05,
    rate: 0.98,
    iconName: 'Sparkles',
    tag: 'Default High-Def',
  },
  {
    id: 'arjun_male',
    name: 'Arjun Tactical Male',
    nativeTitle: 'अर्जुन कमांड (पुरुष)',
    gender: 'Male',
    description: 'Deep authoritative male tone for noisy highways, market corridors, and outdoor environments.',
    pitch: 0.8,
    rate: 0.92,
    iconName: 'Shield',
    tag: 'Authoritative Command',
  },
  {
    id: 'radio_dispatch',
    name: 'Radio Dispatcher Alpha',
    nativeTitle: 'रेडियो डिस्पैच अल्फा',
    gender: 'Neutral',
    description: 'Crisp narrow-band transceiver pitch with boosted mid-tones for distance transmission.',
    pitch: 1.25,
    rate: 1.08,
    iconName: 'Radio',
    tag: 'Radio Intercom',
  },
  {
    id: 'guruji_elder',
    name: 'Guruji Advisory Elder',
    nativeTitle: 'गुरुजी सम्भाषण (धीमा)',
    gender: 'Male',
    description: 'Calm, deliberate, low-speed articulation ideal for complex phrasebooks and clear learning.',
    pitch: 0.85,
    rate: 0.82,
    iconName: 'User',
    tag: 'Calm & Deliberate',
  },
  {
    id: 'kavya_scout',
    name: 'Kavya Expressive Scout',
    nativeTitle: 'काव्या एक्सप्रेसिव',
    gender: 'Female',
    description: 'Energetic and swift female voice tuned for rapid multi-sentence conversation.',
    pitch: 1.2,
    rate: 1.15,
    iconName: 'Flame',
    tag: 'Fast & Energetic',
  },
  {
    id: 'cyborg_tactical',
    name: 'Cyber Recon Neural',
    nativeTitle: 'साइबर रिकॉन',
    gender: 'Neutral',
    description: 'Futuristic acoustic modulation with boosted clarity for severe background noise.',
    pitch: 0.88,
    rate: 1.0,
    iconName: 'Zap',
    tag: 'Synth Modulated',
  },
];

// Web Speech API types
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

export interface VoiceAvailability {
  available: boolean;
  voiceName?: string;
  isApproximation?: boolean;
  warning?: string;
}

export interface TranscribeResult {
  success: boolean;
  transcript?: string;
  model?: string;
  error?: string;
  code?: string;
  isQuota?: boolean;
  retryAfter?: number;
  hint?: string;
}

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecordingActive = false;
  private recordingMimeType = '';
  private micInitPromise: Promise<MediaStream | null> | null = null;
  private currentRecordingSessionId: number = 0;

  private recognition: SpeechRecognitionInstance | null = null;
  private isRecognizing = false;

  // Gemini Live API state
  private liveWs: WebSocket | null = null;
  private liveCallbacks: Set<LiveMessageCallback> = new Set();
  private nextLiveAudioStartTime = 0;

  // Offline TTS tuning
  private speechPitchMultiplier = 1.0;
  private speechRateMultiplier = 1.0;
  private hapticOnComplete = true;
  private currentVoiceFx: VoiceFxType = 'normal';
  private selectedVoicePersonaId = 'vani_female';
  private customSystemVoiceName = '';

  // Field Audio DSP Filters & Noise Gate State
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private vocalPeakingFilter: BiquadFilterNode | null = null;
  private noiseGateGain: GainNode | null = null;

  private isNoiseGateEnabled = true;
  private noiseGateThresholdDb = -36;
  private windFilterCutoffHz = 120;
  private vocalBandEnhance = true;

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

  public setVoiceFx(fx: VoiceFxType) {
    this.currentVoiceFx = fx;
  }

  public getVoiceFx(): VoiceFxType {
    return this.currentVoiceFx;
  }

  public setSpeechPreferences(prefs: {
    speechPitch?: number;
    speechRate?: number;
    hapticOnSpeechComplete?: boolean;
    selectedVoicePersona?: string;
    customSystemVoiceName?: string;
    isNoiseGateEnabled?: boolean;
    noiseGateThresholdDb?: number;
    windFilterCutoffHz?: number;
    vocalBandEnhance?: boolean;
  }) {
    if (prefs.speechPitch !== undefined) this.speechPitchMultiplier = prefs.speechPitch;
    if (prefs.speechRate !== undefined) this.speechRateMultiplier = prefs.speechRate;
    if (prefs.hapticOnSpeechComplete !== undefined) this.hapticOnComplete = prefs.hapticOnSpeechComplete;
    if (prefs.selectedVoicePersona !== undefined) this.selectedVoicePersonaId = prefs.selectedVoicePersona;
    if (prefs.customSystemVoiceName !== undefined) this.customSystemVoiceName = prefs.customSystemVoiceName;
    if (prefs.isNoiseGateEnabled !== undefined) this.isNoiseGateEnabled = prefs.isNoiseGateEnabled;
    if (prefs.noiseGateThresholdDb !== undefined) this.noiseGateThresholdDb = prefs.noiseGateThresholdDb;
    if (prefs.windFilterCutoffHz !== undefined) {
      this.windFilterCutoffHz = prefs.windFilterCutoffHz;
      if (this.highpassFilter) {
        try {
          this.highpassFilter.frequency.setValueAtTime(this.windFilterCutoffHz, this.getAudioContext().currentTime);
        } catch {}
      }
    }
    if (prefs.vocalBandEnhance !== undefined) {
      this.vocalBandEnhance = prefs.vocalBandEnhance;
      if (this.vocalPeakingFilter) {
        try {
          this.vocalPeakingFilter.gain.setValueAtTime(this.vocalBandEnhance ? 3.5 : 0, this.getAudioContext().currentTime);
        } catch {}
      }
    }
  }

  public getDspStatus() {
    return {
      isNoiseGateEnabled: this.isNoiseGateEnabled,
      noiseGateThresholdDb: this.noiseGateThresholdDb,
      windFilterCutoffHz: this.windFilterCutoffHz,
      vocalBandEnhance: this.vocalBandEnhance,
    };
  }

  public getSelectedPersona(): OfflineVoicePersona {
    return OFFLINE_VOICE_PERSONAS.find((p) => p.id === this.selectedVoicePersonaId) || OFFLINE_VOICE_PERSONAS[0];
  }

  public getAvailableSystemVoices(langCode?: LanguageCode): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const voices = window.speechSynthesis.getVoices();
    if (!langCode) return voices;
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
    const targetCode = (langConfig?.ttsCode || 'hi-IN').toLowerCase();
    const prefix = targetCode.split('-')[0];
    return voices.filter((v) => v.lang.toLowerCase().startsWith(prefix) || v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().startsWith('en'));
  }

  // Safe Web Audio Context getter
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

  // User Gesture Audio Unlock helper for receiver phone
  public async unlockAudio(): Promise<boolean> {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      return ctx.state === 'running';
    } catch (e) {
      console.warn('Audio unlock notice:', e);
      return false;
    }
  }

  // Play Speaker Test Chime (User gesture audio verification)
  public playSpeakerTestChime(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = this.getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);

        setTimeout(resolve, 380);
      } catch {
        resolve();
      }
    });
  }

  // Tactical Roger Beep
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
    } catch {}
  }

  public playRogerBeep() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1440, now);
      gain1.gain.setValueAtTime(0.1, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(960, now + 0.08);
      gain2.gain.setValueAtTime(0.12, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.18);
    } catch {}
  }

  // Play Squelch Static
  public playSquelchStatic(durationMs = 80) {
    try {
      const ctx = this.getAudioContext();
      const bufferSize = ctx.sampleRate * (durationMs / 1000);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.07;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch {}
  }

  // Convert text string to Morse Code dot/dash sequence
  public textToMorse(text: string): string {
    const MORSE_MAP: Record<string, string> = {
      A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
      G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
      M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
      S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
      Y: '-.--', Z: '--..',
      '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
      '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
      '.': '.-.-.-', ',': '--..--', '?': '..--..', '/': '-..-.',
      ' ': '/',
    };

    return text
      .toUpperCase()
      .trim()
      .split('')
      .map((char) => MORSE_MAP[char] || '')
      .filter(Boolean)
      .join(' ');
  }

  // Synthesize acoustic Morse Code tones using Web Audio API oscillators
  public playMorseCode(
    morseOrText: string,
    wpm = 18,
    pitchHz = 750,
    onSymbol?: (symbol: '.' | '-' | ' ' | '/', active: boolean) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = this.getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        // Check if string is already Morse or needs conversion
        const morsePattern = morseOrText.includes('.') || morseOrText.includes('-') || morseOrText.includes('/')
          ? morseOrText
          : this.textToMorse(morseOrText);

        const dotTime = 1.2 / wpm; // dot duration in seconds
        let currentTime = ctx.currentTime + 0.05;

        const symbols = morsePattern.split('');

        symbols.forEach((symbol) => {
          if (symbol === '.') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(pitchHz, currentTime);

            gain.gain.setValueAtTime(0.001, currentTime);
            gain.gain.linearRampToValueAtTime(0.12, currentTime + 0.005);
            gain.gain.setValueAtTime(0.12, currentTime + dotTime - 0.005);
            gain.gain.linearRampToValueAtTime(0.001, currentTime + dotTime);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(currentTime);
            osc.stop(currentTime + dotTime);

            if (onSymbol) {
              const startDelay = (currentTime - ctx.currentTime) * 1000;
              const stopDelay = (currentTime + dotTime - ctx.currentTime) * 1000;
              setTimeout(() => onSymbol('.', true), Math.max(0, startDelay));
              setTimeout(() => onSymbol('.', false), Math.max(0, stopDelay));
            }

            currentTime += dotTime + dotTime; // dot duration + 1 dot gap
          } else if (symbol === '-') {
            const dashTime = dotTime * 3;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(pitchHz, currentTime);

            gain.gain.setValueAtTime(0.001, currentTime);
            gain.gain.linearRampToValueAtTime(0.12, currentTime + 0.005);
            gain.gain.setValueAtTime(0.12, currentTime + dashTime - 0.005);
            gain.gain.linearRampToValueAtTime(0.001, currentTime + dashTime);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(currentTime);
            osc.stop(currentTime + dashTime);

            if (onSymbol) {
              const startDelay = (currentTime - ctx.currentTime) * 1000;
              const stopDelay = (currentTime + dashTime - ctx.currentTime) * 1000;
              setTimeout(() => onSymbol('-', true), Math.max(0, startDelay));
              setTimeout(() => onSymbol('-', false), Math.max(0, stopDelay));
            }

            currentTime += dashTime + dotTime; // dash duration + 1 dot gap
          } else if (symbol === ' ') {
            currentTime += dotTime * 2; // letter gap (3 total dots including inter-element)
          } else if (symbol === '/') {
            currentTime += dotTime * 6; // word gap (7 total dots including inter-element)
          }
        });

        const totalMs = Math.max(100, (currentTime - ctx.currentTime) * 1000);
        setTimeout(resolve, totalMs);
      } catch (err) {
        console.warn('Morse sound error:', err);
        resolve();
      }
    });
  }

  // Detect supported MediaRecorder MIME type
  public getSupportedMimeType(): string {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  }

  // Setup Microphone & Audio Analyser
  public async ensureMicrophone(): Promise<MediaStream | null> {
    if (this.micStream && this.micStream.active) {
      return this.micStream;
    }
    if (this.micInitPromise) {
      return this.micInitPromise;
    }

    this.micInitPromise = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.micStream = stream;
        const ctx = this.getAudioContext();
        const source = ctx.createMediaStreamSource(stream);

        // 1. Wind Suppression Highpass Filter (Cuts sub-120Hz rumble and road/wind turbulence)
        this.highpassFilter = ctx.createBiquadFilter();
        this.highpassFilter.type = 'highpass';
        this.highpassFilter.frequency.setValueAtTime(this.windFilterCutoffHz, ctx.currentTime);

        // 2. High Frequency Anti-Hiss Lowpass Filter (Cuts electronic static & high wind whistles above 3800Hz)
        this.lowpassFilter = ctx.createBiquadFilter();
        this.lowpassFilter.type = 'lowpass';
        this.lowpassFilter.frequency.setValueAtTime(3800, ctx.currentTime);

        // 3. Human Vocal Band Enhancer (Boosts speech clarity in 1.8kHz presence band)
        this.vocalPeakingFilter = ctx.createBiquadFilter();
        this.vocalPeakingFilter.type = 'peaking';
        this.vocalPeakingFilter.frequency.setValueAtTime(1800, ctx.currentTime);
        this.vocalPeakingFilter.Q.setValueAtTime(1.2, ctx.currentTime);
        this.vocalPeakingFilter.gain.setValueAtTime(this.vocalBandEnhance ? 3.5 : 0, ctx.currentTime);

        // 4. Field Audio Noise Gate Gain Node
        this.noiseGateGain = ctx.createGain();
        this.noiseGateGain.gain.setValueAtTime(1.0, ctx.currentTime);

        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 128;

        // Connect full Web Audio DSP Processing Graph
        source
          .connect(this.highpassFilter)
          .connect(this.lowpassFilter)
          .connect(this.vocalPeakingFilter)
          .connect(this.noiseGateGain)
          .connect(this.analyser);
        return stream;
      } catch (err: any) {
        console.warn('Microphone permission denied or unavailable:', err?.message || err);
        return null;
      } finally {
        this.micInitPromise = null;
      }
    })();

    return this.micInitPromise;
  }

  public async initMicrophoneAnalyser(): Promise<AnalyserNode | null> {
    await this.ensureMicrophone();
    return this.analyser;
  }

  // Clean streams on unmount/stop when unused
  public releaseMicrophone(): void {
    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.micStream = null;
      this.analyser = null;
    }
    this.isRecordingActive = false;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // Start recording voice chunk asynchronously with press/session tracking
  public async startVoiceRecording(): Promise<number> {
    const sessionId = ++this.currentRecordingSessionId;
    this.recordedChunks = [];

    const stream = await this.ensureMicrophone();
    // Safe cancellation: if user already released PTT before mic permission resolved, cancel safely
    if (this.currentRecordingSessionId !== sessionId || !stream) {
      return sessionId;
    }

    this.isRecordingActive = true;

    try {
      const mime = this.getSupportedMimeType();
      this.recordingMimeType = mime;
      const options = mime ? { mimeType: mime } : undefined;

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(100);
    } catch (e) {
      console.warn('MediaRecorder start error:', e);
      this.isRecordingActive = false;
    }

    return sessionId;
  }

  // Stop recording voice chunk and return finalized Base64 data URL
  public stopVoiceRecording(expectedSessionId?: number): Promise<string | null> {
    return new Promise((resolve) => {
      if (expectedSessionId !== undefined && expectedSessionId !== this.currentRecordingSessionId) {
        this.isRecordingActive = false;
        return resolve(null);
      }
      this.currentRecordingSessionId++;

      if (!this.mediaRecorder || !this.isRecordingActive) {
        this.isRecordingActive = false;
        return resolve(null);
      }

      this.isRecordingActive = false;

      // Handle recorder in inactive or error state
      if (this.mediaRecorder.state === 'inactive') {
        if (this.recordedChunks.length === 0) return resolve(null);
        const mime = this.recordingMimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mime });
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
        return;
      }

      this.mediaRecorder.onstop = () => {
        if (this.recordedChunks.length === 0) return resolve(null);
        const mime = this.recordingMimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mime });
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      };

      try {
        this.mediaRecorder.stop();
      } catch {
        resolve(null);
      }
    });
  }

  // Server audio transcription using Gemini model without swallowing 429 quota or errors
  public async transcribeAudio(
    audioDataUri: string,
    language?: LanguageCode
  ): Promise<TranscribeResult> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 14000);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioDataUri,
          language,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const json = await res.json().catch(() => ({}));
      const isQuota = res.status === 429 || json.code === 'QUOTA_EXCEEDED' || Boolean(json.quotaExhausted);

      if (res.ok && json.success && json.transcript) {
        return {
          success: true,
          transcript: json.transcript,
          model: json.model || 'gemini-3.5-transcribe',
        };
      }

      return {
        success: false,
        error: json.error || (isQuota ? 'Gemini transcription rate limit / daily quota exceeded (429).' : 'Transcription failed'),
        code: json.code || (isQuota ? 'QUOTA_EXCEEDED' : 'TRANSCRIBE_ERROR'),
        isQuota,
        retryAfter: json.retryAfter,
        hint: json.hint,
      };
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      return {
        success: false,
        error: isAbort ? 'Audio transcription timed out' : err?.message || 'Transcription network error',
        code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
      };
    }
  }

  // Play audio from base64 WAV/audio data with Autoplay Blockage detection
  public playAudioBase64(base64: string): Promise<{ played: boolean; autoplayBlocked?: boolean; error?: string }> {
    return new Promise((resolve) => {
      try {
        const ctx = this.getAudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const src = base64.startsWith('data:') ? base64 : `data:audio/wav;base64,${base64}`;
        const audio = new Audio(src);

        audio.onended = () => {
          resolve({ played: true });
        };

        audio.onerror = (e) => {
          console.warn('Audio element error:', e);
          resolve({ played: false, error: 'Audio decoding error' });
        };

        audio.play().catch((err: any) => {
          console.warn('Audio play rejected (autoplay policy):', err?.name, err?.message);
          const isBlocked = err?.name === 'NotAllowedError' || String(err?.message || '').includes('user gesture');
          resolve({
            played: false,
            autoplayBlocked: isBlocked,
            error: isBlocked ? 'Autoplay blocked by browser policy' : err?.message,
          });
        });
      } catch (err: any) {
        resolve({ played: false, error: err?.message });
      }
    });
  }

  // Truthful check of browser SpeechSynthesis voice availability
  public checkVoiceAvailability(lang: LanguageCode): VoiceAvailability {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (lang === 'mjl') {
        return {
          available: false,
          isApproximation: true,
          warning: 'Mandyali TTS voice not available. Uses Hindi voice approximation (experimental dialect).',
        };
      }
      if (lang === 'or') {
        return {
          available: false,
          warning: 'Odia voice synthesis is not installed on this device/browser. Odia text received safely (not silently converted to Hindi/English).',
        };
      }
      return { available: false, warning: 'Speech synthesis not supported in this browser' };
    }

    const voices = window.speechSynthesis.getVoices();
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    const targetCode = (langConfig ? langConfig.ttsCode : 'hi-IN').toLowerCase();
    const prefix = targetCode.split('-')[0];

    // Specific check for Odia (DO NOT silently replace with Hindi/English)
    if (lang === 'or') {
      const odiaVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('or') ||
          v.lang.toLowerCase().includes('odia') ||
          v.name.toLowerCase().includes('odia') ||
          v.name.toLowerCase().includes('oriya')
      );
      if (!odiaVoice) {
        return {
          available: false,
          warning: 'Odia voice synthesis is not installed on this device/browser. Odia text received safely (not silently converted to Hindi/English).',
        };
      }
      return { available: true, voiceName: odiaVoice.name };
    }

    // Specific check for Mandyali / Mandali (Western Pahadi)
    if (lang === 'mjl') {
      const hindiVoice = voices.find((v) => v.lang.toLowerCase().startsWith('hi'));
      return {
        available: Boolean(hindiVoice),
        voiceName: hindiVoice?.name,
        isApproximation: true,
        warning: 'Mandyali TTS voice not available in browser. Playing in Hindi voice approximation (experimental dialect).',
      };
    }

    const match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (match) {
      return { available: true, voiceName: match.name };
    }

    return {
      available: false,
      warning: `No native voice installed for ${langConfig?.name || lang}. Text displayed safely without silent fallback to Hindi/English.`,
    };
  }

  // Text to Speech (TTS) Output with truthful voice check
  public speak(
    text: string,
    lang: LanguageCode,
    options?: { onStart?: () => void; onEnd?: () => void; pitch?: number; rate?: number }
  ): Promise<{ spoke: boolean; warning?: string }> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve({ spoke: false, warning: 'Speech synthesis not available' });
        return;
      }

      window.speechSynthesis.cancel();

      // Check voice availability first
      const voiceCheck = this.checkVoiceAvailability(lang);
      if (!voiceCheck.available) {
        console.warn(`TTS Warning: ${voiceCheck.warning}`);
        resolve({ spoke: false, warning: voiceCheck.warning });
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === lang);

      const fxConfig = VOICE_FX_PRESETS.find((f) => f.id === this.currentVoiceFx) || VOICE_FX_PRESETS[0];
      const personaConfig = this.getSelectedPersona();
      
      const basePitch = options?.pitch ?? ((langConfig?.ttsPitch || 1.0) * fxConfig.pitch * personaConfig.pitch);
      const baseRate = options?.rate ?? ((langConfig?.ttsRate || 0.95) * fxConfig.rate * personaConfig.rate);
      utterance.pitch = Math.max(0.3, Math.min(2.0, basePitch * this.speechPitchMultiplier));
      utterance.rate = Math.max(0.4, Math.min(2.0, baseRate * this.speechRateMultiplier));

      const voices = window.speechSynthesis.getVoices();
      const targetCode = langConfig ? langConfig.ttsCode : 'hi-IN';

      if (this.customSystemVoiceName) {
        const customVoice = voices.find((v) => v.name === this.customSystemVoiceName);
        if (customVoice) {
          utterance.voice = customVoice;
        }
      }

      if (!utterance.voice) {
        if (voiceCheck.voiceName) {
          const found = voices.find((v) => v.name === voiceCheck.voiceName);
          if (found) utterance.voice = found;
        } else {
          const matchedVoice = voices.find((v) =>
            v.lang.toLowerCase().startsWith(targetCode.split('-')[0].toLowerCase())
          );
          if (matchedVoice) {
            utterance.voice = matchedVoice;
          } else {
            // Transparency: Do not silently substitute Hindi or English when target voice is missing
            resolve({
              spoke: false,
              warning: `Voice model for ${langConfig?.name || lang} missing. Silent fallback to Hindi/English prevented for transparency.`,
            });
            return;
          }
        }
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
        resolve({ spoke: true, warning: voiceCheck.warning });
      };

      utterance.onerror = (e) => {
        console.warn('TTS utterance error:', e);
        options?.onEnd?.();
        resolve({ spoke: false, warning: 'Playback failed' });
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

  // Web Speech Recognition
  public isSpeechRecognitionSupported(): boolean {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public startSpeechRecognition(
    lang: LanguageCode,
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError: (err: string) => void
  ): boolean {
    const SpeechRecClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecClass) {
      onError('Speech Recognition is not natively supported in this browser. Recorded audio will be transcribed via server.');
      return false;
    }

    if (this.isRecognizing) {
      this.stopSpeechRecognition();
    }

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

        if (interimTranscript) onInterim(interimTranscript);
        if (finalTranscript) onFinal(finalTranscript);
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'no-speech') {
          onError(`Speech recognition notice: ${event.error}`);
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

  public stopSpeechRecognition(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.recognition) {
        this.isRecognizing = false;
        return resolve();
      }

      const rec = this.recognition;
      let finished = false;

      const complete = () => {
        if (!finished) {
          finished = true;
          this.isRecognizing = false;
          this.recognition = null;
          resolve();
        }
      };

      rec.onend = complete;
      // Bounded wait of 200ms to allow final result flush
      setTimeout(complete, 200);

      try {
        rec.stop();
      } catch {
        complete();
      }
    });
  }

  // Gemini Live API session
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
          this.liveCallbacks.forEach((cb) => {
            try {
              cb(msg);
            } catch {}
          });
        } catch {}
      };

      ws.onclose = () => {
        this.liveWs = null;
      };

      this.liveWs = ws;
      return ws;
    } catch {
      return null;
    }
  }

  public onLiveMessage(callback: LiveMessageCallback): () => void {
    this.liveCallbacks.add(callback);
    return () => {
      this.liveCallbacks.delete(callback);
    };
  }

  public sendLiveText(text: string): void {
    if (this.liveWs && this.liveWs.readyState === WebSocket.OPEN) {
      this.liveWs.send(JSON.stringify({ type: 'text', text }));
    }
  }

  public triggerHaptic(pattern: number | number[] = 50): void {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }
}

export const audioEngine = new AudioEngine();

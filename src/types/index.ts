export type LanguageCode = 
  | 'hi' | 'en' | 'or' | 'mjl' | 'pa' | 'bn' | 'mr' | 'ml'
  | 'ta' | 'te' | 'kn' | 'gu' | 'ur' | 'as' | 'sa' | 'ne' 
  | 'ks' | 'sd' | 'kok' | 'mni' | 'mai' | 'doi' | 'sat' | 'brx';

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  state: string;
  region: string;
  script: string;
  flagEmoji: string;
  sttCode: string;       // Web Speech Recognition BCP 47 code
  ttsCode: string;       // SpeechSynthesis voice code
  ttsPitch?: number;
  ttsRate?: number;
  isDialect?: boolean;
  parentLanguage?: string;
  greetingExample: {
    native: string;
    phonetic: string;
    english: string;
  };
}

export interface TranslationResult {
  id: string;
  originalText: string;
  translatedText: string;
  phoneticText: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  isOffline: boolean;
  engine: 'gemini-neural' | 'offline-lexicon' | 'rule-morphology';
  confidence: number;
  dialectNotes?: string;
  audioBase64?: string;
  timestamp: number;
}

export type ChannelNumber = 1 | 2 | 3 | 4;

export interface RadioChannel {
  channel: ChannelNumber;
  frequency: string;
  name: string;
  description: string;
  badgeColor: string;
  iconName: string;
  isEmergency?: boolean;
}

export interface MeshPacket {
  id: string;
  channel: ChannelNumber;
  senderId: string;
  senderName: string;
  senderState: string;
  senderLang: LanguageCode;
  targetLang: LanguageCode;
  originalText: string;
  translatedText: string;
  phoneticText: string;
  audioBase64?: string;
  audioDurationMs?: number;
  timestamp: number;
  hopCount: number;
  rssi: number; // dBm e.g. -45 to -90
  isEmergency?: boolean;
}

export interface MeshNode {
  id: string;
  name: string;
  state: string;
  activeLanguage: LanguageCode;
  lastSeen: number;
  signalDbm: number;
  channel: ChannelNumber;
  isLocalUser: boolean;
  batteryLevel?: number;
  distanceMeters?: number;
}

export interface PhraseItem {
  id: string;
  category: 'emergency' | 'directions' | 'medical' | 'travel' | 'food' | 'general';
  english: string;
  hindi: { text: string; phonetic: string };
  odia: { text: string; phonetic: string };
  mandali: { text: string; phonetic: string };
  malayalam?: { text: string; phonetic: string };
  punjabi?: { text: string; phonetic: string };
  icon: string;
}

export interface ConversationMessage {
  id: string;
  sender: 'self' | 'peer';
  senderName: string;
  senderState?: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  originalText: string;
  translatedText: string;
  phoneticText: string;
  timestamp: number;
  isOffline: boolean;
  engine: 'gemini-neural' | 'offline-lexicon' | 'rule-morphology';
  audioBase64?: string;
  audioDurationMs?: number;
  isStarred?: boolean;
  channel?: ChannelNumber;
}

export type VoiceFxType = 'normal' | 'deep_commander' | 'radio_dispatch' | 'cyborg_tactical' | 'mountain_echo';

export interface VoiceFxConfig {
  id: VoiceFxType;
  name: string;
  description: string;
  pitch: number;
  rate: number;
  icon: string;
}

export type AppViewMode = 'walkie_talkie' | 'dual_translator' | 'mesh_radar' | 'phrasebook' | 'history' | 'settings';

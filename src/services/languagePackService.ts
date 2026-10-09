import { LanguageCode } from '../types';
import { audioEngine } from './audioEngine';

export interface LanguagePack {
  id: string;
  langCode: LanguageCode;
  name: string;
  nativeName: string;
  region: string;
  version: string;
  sizeMb: number;
  samplePhrase: string;
  sampleTranslation: string;
  phoneticSample: string;
  status: 'installed' | 'available' | 'downloading' | 'updating';
  downloadProgress: number; // 0 - 100
  lastUpdated?: string;
  features: string[];
}

const STORAGE_KEY = 'bhashasetu_language_packs_v1';
const PREF_KEY = 'bhashasetu_pack_preferences_v1';

export interface PackPreferences {
  preferOfflineVoice: boolean;
  speechRate: number; // 0.8 - 1.2
  speechPitch: number; // 0.8 - 1.2
  autoDownloadEmergencyPhrases: boolean;
  hapticOnSpeechComplete: boolean;
}

export const INITIAL_PACKS: LanguagePack[] = [
  {
    id: 'pack_hi',
    langCode: 'hi',
    name: 'Hindi Vani-Neural Pack',
    nativeName: 'हिन्दी वाणी न्यूरल',
    region: 'North & Central India (Delhi, UP, MP, Bihar)',
    version: 'v2.4.1',
    sizeMb: 16.8,
    samplePhrase: 'नमस्ते! भाषासेतु ऑफलाइन वाणी प्रणाली में आपका स्वागत है।',
    sampleTranslation: 'Hello! Welcome to the BhashaSetu offline speech system.',
    phoneticSample: 'Namaste! BhashaSetu offline vaani pranali mein aapka swagat hai.',
    status: 'installed',
    downloadProgress: 100,
    lastUpdated: '2026-10-01',
    features: ['18,500 Devanagari Vocabulary', 'High-Definition Neural Accent', 'Offline Fallback STT'],
  },
  {
    id: 'pack_mjl',
    langCode: 'mjl',
    name: 'Mandali Pahadi Him-Vani Pack',
    nativeName: 'माण्डली पहाड़ी हिम-वाणी',
    region: 'Himachal Pradesh (Mandi, Suket, Beas Valley)',
    version: 'v2.1.0',
    sizeMb: 14.2,
    samplePhrase: 'तुसां जो नमस्कार! कुथु जांदे? मां जो रस्ता दस्सा।',
    sampleTranslation: 'Greetings! Where are you going? Please tell me the path.',
    phoneticSample: 'Tusan jo namaskar! Kuthu jaande? Maan jo rasta dassa.',
    status: 'installed',
    downloadProgress: 100,
    lastUpdated: '2026-09-28',
    features: ['Western Pahadi Acoustic Model', 'Takri & Devanagari Morph rules', 'High Altitude Radio Tuned'],
  },
  {
    id: 'pack_or',
    langCode: 'or',
    name: 'Odia Utkal-Purba Speech Pack',
    nativeName: 'ଓଡ଼ିଆ ଉତ୍କଳ-ପୂର୍ବ ବାଣୀ',
    region: 'Odisha (Bhubaneswar, Cuttack, Coastal belt)',
    version: 'v1.9.4',
    sizeMb: 18.4,
    samplePhrase: 'ନମସ୍କାର! ଆପଣ କେମିତି ଅଛନ୍ତି? ଭାଷାସେତୁରେ ଆପଣଙ୍କୁ ସ୍ୱାଗତ।',
    sampleTranslation: 'Greetings! How are you? Welcome to BhashaSetu.',
    phoneticSample: 'Namaskara! Aapana kemiti achhanti? BhashaSeture aapanku swagata.',
    status: 'installed',
    downloadProgress: 100,
    lastUpdated: '2026-10-04',
    features: ['14,200 Odia Script Terms', 'Native Eastern Cadence', 'Emergency Coastal Rescue Lexicon'],
  },
  {
    id: 'pack_en',
    langCode: 'en',
    name: 'Indian English Interstate Bridge',
    nativeName: 'Indian English Audio Pack',
    region: 'Pan-India National Intercom',
    version: 'v1.8.0',
    sizeMb: 9.8,
    samplePhrase: 'BhashaSetu interstate voice link active. Clear for voice transmission.',
    sampleTranslation: 'Radio transmission test successful.',
    phoneticSample: 'BhashaSetu interstate voice link active. Clear for voice transmission.',
    status: 'installed',
    downloadProgress: 100,
    lastUpdated: '2026-09-20',
    features: ['25,000 Highway Terms', 'Low-Latency Synthesis', 'Sub-15ms Voice Decode'],
  },
  {
    id: 'pack_pa',
    langCode: 'pa',
    name: 'Punjabi Majha-Malwa Audio Pack',
    nativeName: 'ਪੰਜਾਬੀ ਮਾਝਾ-ਮਾਲਵਾ ਵਾਣੀ',
    region: 'Punjab & GT Road Corridor',
    version: 'v1.2.0',
    sizeMb: 15.1,
    samplePhrase: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਕੀ ਹਾਲ ਚਾਲ ਹੈ?',
    sampleTranslation: 'Greetings! How are you doing?',
    phoneticSample: 'Sat Sri Akal ji! Kee haal chaal hai?',
    status: 'available',
    downloadProgress: 0,
    features: ['Gurmukhi Script Neural Synthesizer', 'Highway Logistics Lexicon'],
  },
  {
    id: 'pack_bn',
    langCode: 'bn',
    name: 'Bengali Purba-Vani Speech Pack',
    nativeName: 'বাংলা পূর্ব-বাণী',
    region: 'West Bengal & Eastern Corridors',
    version: 'v1.1.2',
    sizeMb: 16.2,
    samplePhrase: 'নমস্কার! আপনি কেমন আছেন? সাহায্য দরকার?',
    sampleTranslation: 'Hello! How are you? Do you need help?',
    phoneticSample: 'Nomoshkar! Aponi kemon achhen? Sahajjo dorkar?',
    status: 'available',
    downloadProgress: 0,
    features: ['Eastern Indo-Aryan Acoustic Model', 'Coastal Disaster Relief Phrases'],
  },
  {
    id: 'pack_mr',
    langCode: 'mr',
    name: 'Marathi Sahyadri Speech Pack',
    nativeName: 'मराठी सह्याद्री वाणी',
    region: 'Maharashtra & Western Ghats',
    version: 'v1.0.8',
    sizeMb: 15.5,
    samplePhrase: 'नमस्कार! कसे आहात आपण? मी मदत करू शकतो का?',
    sampleTranslation: 'Hello! How are you? Can I help you?',
    phoneticSample: 'Namaskar! Kase aahat aapan? Mee madat karoo shakto ka?',
    status: 'available',
    downloadProgress: 0,
    features: ['Modi/Devanagari Lexicon Bridge', 'Western Highway Transit Terms'],
  },
  {
    id: 'pack_ml',
    langCode: 'ml',
    name: 'Malayalam Kerala Speech Pack',
    nativeName: 'മലയാളം കേരള വാണി',
    region: 'Kerala (Kochi, Thiruvananthapuram, Kozhikode)',
    version: 'v2.0.1',
    sizeMb: 17.5,
    samplePhrase: 'नमस्कारम्! ഭാഷാസേതു ഓഫ്‌ലൈൻ സംവിധാനത്തിലേക്ക് സ്വാഗതം.',
    sampleTranslation: 'Hello! Welcome to BhashaSetu offline speech system.',
    phoneticSample: 'Namaskaram! Bhashasetu offline samvidhanathilekku swagatam.',
    status: 'installed',
    downloadProgress: 100,
    lastUpdated: '2026-10-05',
    features: ['16,000 Malayalam Vocabulary', 'Dravidian Acoustic Neural Model', 'Coastal Emergency Lexicon'],
  },
  {
    id: 'pack_ta',
    langCode: 'ta',
    name: 'Tamil Dravidian Speech Pack',
    nativeName: 'தமிழ் செம்மொழி वाणी',
    region: 'Tamil Nadu & Southern Corridors',
    version: 'v1.5.0',
    sizeMb: 18.2,
    samplePhrase: 'வணக்கம்! எப்படி இருக்கிறீர்கள்? மொழிபேச்சு செயலி தயார்.',
    sampleTranslation: 'Greetings! How are you? Voice app is ready.',
    phoneticSample: 'Vanakkam! Eppadi irukkireergal? Mozhipechu seyali thayar.',
    status: 'available',
    downloadProgress: 0,
    features: ['Tamil Sangam Vocabulary', 'Southern Coastal Neural Model'],
  },
  {
    id: 'pack_te',
    langCode: 'te',
    name: 'Telugu Andhra Speech Pack',
    nativeName: 'తెలుగు వాணி',
    region: 'Andhra Pradesh & Telangana',
    version: 'v1.4.2',
    sizeMb: 17.8,
    samplePhrase: 'నమస్కారం! మీరు ఎలా ఉన్నారు? బాషాసేతు సిద్ధంగా ఉంది.',
    sampleTranslation: 'Greetings! How are you? BhashaSetu is ready.',
    phoneticSample: 'Namaskaram! Meeru ela unnaru? BhashaSetu siddhamga undi.',
    status: 'available',
    downloadProgress: 0,
    features: ['Telugu Dialect Lexicon', 'Deccan Plateau Acoustic Model'],
  },
  {
    id: 'pack_kn',
    langCode: 'kn',
    name: 'Kannada Karnataka Speech Pack',
    nativeName: 'ಕನ್ನಡ ನುಡಿ ಪ್ಯಾಕ್',
    region: 'Karnataka & Western Ghats',
    version: 'v1.3.1',
    sizeMb: 16.9,
    samplePhrase: 'ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರಿ? ಸಂವಹನ ವ್ಯವಸ್ಥೆ ಸಿದ್ಧ.',
    sampleTranslation: 'Greetings! How are you? Communication system ready.',
    phoneticSample: 'Namaskara! Hegiddiri? Samvahana vyavasthe siddha.',
    status: 'available',
    downloadProgress: 0,
    features: ['Classical Kannada Dictionary', 'High Altitude Mesh Voice Engine'],
  },
  {
    id: 'pack_gu',
    langCode: 'gu',
    name: 'Gujarati Saurashtra Speech Pack',
    nativeName: 'ગુજરાતી વાણી પેક',
    region: 'Gujarat & Rann of Kutch',
    version: 'v1.2.4',
    sizeMb: 15.3,
    samplePhrase: 'નમસ્કાર! તમે કેમ છો? ભાષાસેતુ એપ્લિકેશન તૈયાર છે.',
    sampleTranslation: 'Greetings! How are you? BhashaSetu application is ready.',
    phoneticSample: 'Namaskar! Tame kem cho? BhashaSetu application taiyar chhe.',
    status: 'available',
    downloadProgress: 0,
    features: ['Gujarati Trade & Transit Lexicon', 'Western Border Network Tuned'],
  },
  {
    id: 'pack_ur',
    langCode: 'ur',
    name: 'Urdu Adab Speech Pack',
    nativeName: 'اردو أدب وانی پیک',
    region: 'Pan-India Urdu Network',
    version: 'v1.6.0',
    sizeMb: 18.0,
    samplePhrase: 'سلام، آپ کیسے ہیں؟ زبان کا نظام فعال ہے۔',
    sampleTranslation: 'Hello, how are you? The language system is active.',
    phoneticSample: 'Salam, aap kaise hain? Zaban ka nizam faal hai.',
    status: 'available',
    downloadProgress: 0,
    features: ['Nastaliq Phonetic Synthesis', 'Literary & Conversational Corpus'],
  },
  {
    id: 'pack_as',
    langCode: 'as',
    name: 'Assamese Brahmaputra Speech Pack',
    nativeName: 'অসমীয়া ব্ৰহ্মপুত্ৰ বাৰ্তা',
    region: 'Assam & Northeast Valleys',
    version: 'v1.1.0',
    sizeMb: 14.8,
    samplePhrase: 'নমস্কাৰ! আপুনি কেমন আছে? বাৰ্তা প্ৰেৰণ কৰক।',
    sampleTranslation: 'Greetings! How are you? Send message.',
    phoneticSample: 'Nomoskar! Apuni kemon ase? Barta preran korok.',
    status: 'available',
    downloadProgress: 0,
    features: ['Brahmaputra Valley Acoustic Model', 'Flood & Relief Vocabulary'],
  },
  {
    id: 'pack_sa',
    langCode: 'sa',
    name: 'Sanskrit Vedic Speech Pack',
    nativeName: 'संस्कृतम् वेद वाणी',
    region: 'Pan-India Classical Heritage',
    version: 'v1.9.0',
    sizeMb: 19.5,
    samplePhrase: 'नमस्कारः, भवान् कथम् अस्ति? स्वागतं भाषासेतु.',
    sampleTranslation: 'Greetings, how are you? Welcome to BhashaSetu.',
    phoneticSample: 'Namaskarah, bhavan katham asti? Swagatam BhashaSetu.',
    status: 'available',
    downloadProgress: 0,
    features: ['Vedic & Classical Morph Lexicon', 'High Precision Phonetics'],
  },
  {
    id: 'pack_ne',
    langCode: 'ne',
    name: 'Nepali Himalayan Speech Pack',
    nativeName: 'नेपाली हिमाल वाणी',
    region: 'Sikkim, Darjeeling & Northern Hills',
    version: 'v1.1.5',
    sizeMb: 15.0,
    samplePhrase: 'नमस्कार, तपाईलाई कस्तो छ? भाषासेतु तयार छ।',
    sampleTranslation: 'Greetings, how are you? BhashaSetu is ready.',
    phoneticSample: 'Namaskar, tapailai kasto cha? BhashaSetu tayar cha.',
    status: 'available',
    downloadProgress: 0,
    features: ['Himalayan Accent Synthesis', 'Mountain Trail Emergency Terms'],
  },
  {
    id: 'pack_ks',
    langCode: 'ks',
    name: 'Kashmiri Valley Speech Pack',
    nativeName: 'कॉशुर وادی وٲنی',
    region: 'Jammu and Kashmir Valleys',
    version: 'v1.0.2',
    sizeMb: 14.5,
    samplePhrase: 'آداب، توہ چھုہ حأوالہٕ کیٚژھ؟ آواز نظام تیار।',
    sampleTranslation: 'Greetings, how are you? Voice system ready.',
    phoneticSample: 'Adaab, tow chhuh haawalah kech? Awaaz nizam tayar.',
    status: 'available',
    downloadProgress: 0,
    features: ['Kashmiri Dialect Morphology', 'Snow & Valley Relay Tuned'],
  },
  {
    id: 'pack_sd',
    langCode: 'sd',
    name: 'Sindhi Western Speech Pack',
    nativeName: 'سنڌي آواز پيڪ',
    region: 'Western Border & Diaspora',
    version: 'v1.0.4',
    sizeMb: 14.7,
    samplePhrase: 'سلام، اوھان ڪିئن آهيو؟ ٻولي جو سسٽم تيار آهي.',
    sampleTranslation: 'Hello, how are you? The language system is ready.',
    phoneticSample: 'Salam, ohan kiin aahiyo? Boli jo system tayar aahi.',
    status: 'available',
    downloadProgress: 0,
    features: ['Sindhi Phonetic Synthesizer', 'Cross-Border Relay Lexicon'],
  },
  {
    id: 'pack_kok',
    langCode: 'kok',
    name: 'Konkani Coastal Speech Pack',
    nativeName: 'कोंकणी दरियाव वाणी',
    region: 'Goa, Konkan Coast & Karnataka',
    version: 'v1.1.1',
    sizeMb: 13.9,
    samplePhrase: 'नमस्कार, तुमी कशे आसात? आवाज प्रणाली तयार.',
    sampleTranslation: 'Hello, how are you? Voice system ready.',
    phoneticSample: 'Namaskar, tumi kashe aasaat? Awaaz pranali tayar.',
    status: 'available',
    downloadProgress: 0,
    features: ['Konkan Coastal Cadence', 'Devanagari & Latin Script Support'],
  },
  {
    id: 'pack_mni',
    langCode: 'mni',
    name: 'Manipuri Meitei Speech Pack',
    nativeName: 'মৈতৈলোন্ বাৰ্তা প্যাক',
    region: 'Manipur & Eastern Hills',
    version: 'v1.0.3',
    sizeMb: 13.5,
    samplePhrase: 'খুরুমজরি, করমগদৌরি? ৱাইচ প্যাক প্রীপেয়র লৈ.',
    sampleTranslation: 'Greetings, how are you? Voice pack is ready.',
    phoneticSample: 'Khurumjiri, karamgadouri? Voice pack prepared lei.',
    status: 'available',
    downloadProgress: 0,
    features: ['Meitei Mayek & Bengali Script', 'Northeast Hill Relay Vocab'],
  },
  {
    id: 'pack_mai',
    langCode: 'mai',
    name: 'Maithili Mithila Speech Pack',
    nativeName: 'मैथिली मिथिला वाणी',
    region: 'Bihar & Mithila Region',
    version: 'v1.0.5',
    sizeMb: 14.1,
    samplePhrase: 'नमस्कार, अहाँ कतेक छियै? भाषा सेवा तैयार अछि।',
    sampleTranslation: 'Greetings, how are you? Language service is ready.',
    phoneticSample: 'Namaskar, ahan katek chhiyai? Bhasha seva taiyar achhi.',
    status: 'available',
    downloadProgress: 0,
    features: ['Mithila Cultural Vocabulary', 'Eastern Hindi-Bihari Bridge'],
  },
  {
    id: 'pack_doi',
    langCode: 'doi',
    name: 'Dogri Duggar Speech Pack',
    nativeName: 'डोगरी डुग्गर वाणी',
    region: 'Jammu & Duggar Region',
    version: 'v1.0.2',
    sizeMb: 13.8,
    samplePhrase: 'नमस्कार, तुस किम्दा ओ? आवाज सिस्टम तैयार ऐ।',
    sampleTranslation: 'Greetings, how are you? Voice system is ready.',
    phoneticSample: 'Namaskar, tus kimda o? Awaaz system tayar ai.',
    status: 'available',
    downloadProgress: 0,
    features: ['Dogri Northern Phonetics', 'Himalayan Foothills Lexicon'],
  },
  {
    id: 'pack_sat',
    langCode: 'sat',
    name: 'Santali Ol Chiki Speech Pack',
    nativeName: 'संथाली ओल चिकी वाणी',
    region: 'Jharkhand, Odisha & Tribal Belt',
    version: 'v1.1.0',
    sizeMb: 15.2,
    samplePhrase: 'جوहार, چেলে লেইک েনা? রড় সিসটেম তৈরি মেয়া.',
    sampleTranslation: 'Greetings, how are you? Voice system is ready.',
    phoneticSample: 'Johar, chele leik ena? Ror system toiri meya.',
    status: 'available',
    downloadProgress: 0,
    features: ['Ol Chiki Script Morphology', 'Tribal Belt Community Vocabulary'],
  },
  {
    id: 'pack_brx',
    langCode: 'brx',
    name: 'Bodo Bodoland Speech Pack',
    nativeName: 'बोडो बर’ बाथ्रा',
    region: 'Assam & Bodoland Territorial Region',
    version: 'v1.0.1',
    sizeMb: 13.6,
    samplePhrase: 'खुलुमबाय, नों माबोरै दं? बाथ्रा थान्धि थाइयार।',
    sampleTranslation: 'Greetings, how are you? Speech system ready.',
    phoneticSample: 'Khulumbai, nong mabore dong? Bathra thandhi thaiyar.',
    status: 'available',
    downloadProgress: 0,
    features: ['Bodo Linguistic Model', 'Northeast Regional Radio Relay'],
  }
];

const DEFAULT_PREFERENCES: PackPreferences = {
  preferOfflineVoice: true,
  speechRate: 0.95,
  speechPitch: 1.0,
  autoDownloadEmergencyPhrases: true,
  hapticOnSpeechComplete: true,
};

type PackListener = (packs: LanguagePack[], prefs: PackPreferences) => void;

class LanguagePackService {
  private packs: LanguagePack[] = [];
  private preferences: PackPreferences = DEFAULT_PREFERENCES;
  private listeners: Set<PackListener> = new Set();
  private downloadIntervals: Map<string, any> = new Map();

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (typeof localStorage !== 'undefined') {
      try {
        const savedPacks = localStorage.getItem(STORAGE_KEY);
        if (savedPacks) {
          const parsed = JSON.parse(savedPacks);
          // Merge with initial definitions to ensure complete metadata
          this.packs = INITIAL_PACKS.map((initial) => {
            const found = parsed.find((p: LanguagePack) => p.id === initial.id);
            if (found) {
              return {
                ...initial,
                status: found.status,
                downloadProgress: found.downloadProgress,
                lastUpdated: found.lastUpdated || initial.lastUpdated,
              };
            }
            return initial;
          });
        } else {
          this.packs = [...INITIAL_PACKS];
        }

        const savedPrefs = localStorage.getItem(PREF_KEY);
        if (savedPrefs) {
          this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(savedPrefs) };
        }
        audioEngine.setSpeechPreferences(this.preferences);
      } catch (err) {
        console.warn('Failed to load language pack state:', err);
        this.packs = [...INITIAL_PACKS];
        audioEngine.setSpeechPreferences(this.preferences);
      }
    } else {
      this.packs = [...INITIAL_PACKS];
      audioEngine.setSpeechPreferences(this.preferences);
    }
  }

  private saveState() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.packs));
        localStorage.setItem(PREF_KEY, JSON.stringify(this.preferences));
      } catch (err) {
        console.warn('Failed to save language pack state:', err);
      }
    }
    audioEngine.setSpeechPreferences(this.preferences);
    this.notify();
  }

  public subscribe(listener: PackListener): () => void {
    this.listeners.add(listener);
    listener(this.packs, this.preferences);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.packs, this.preferences));
  }

  public getPacks(): LanguagePack[] {
    return [...this.packs];
  }

  public getPreferences(): PackPreferences {
    return { ...this.preferences };
  }

  public updatePreferences(newPrefs: Partial<PackPreferences>) {
    this.preferences = { ...this.preferences, ...newPrefs };
    this.saveState();
  }

  public isPackInstalled(langCode: LanguageCode): boolean {
    const pack = this.packs.find((p) => p.langCode === langCode);
    return pack?.status === 'installed';
  }

  public getTotalInstalledSizeMb(): number {
    return this.packs
      .filter((p) => p.status === 'installed')
      .reduce((sum, p) => sum + p.sizeMb, 0);
  }

  // Start downloading a language pack with realistic progressive chunks
  public downloadPack(packId: string) {
    const pack = this.packs.find((p) => p.id === packId);
    if (!pack || pack.status === 'downloading') return;

    pack.status = 'downloading';
    pack.downloadProgress = 5;
    this.saveState();
    audioEngine.triggerHaptic(30);

    // Cancel existing interval if any
    if (this.downloadIntervals.has(packId)) {
      clearInterval(this.downloadIntervals.get(packId));
    }

    const interval = setInterval(() => {
      const target = this.packs.find((p) => p.id === packId);
      if (!target || target.status !== 'downloading') {
        clearInterval(interval);
        this.downloadIntervals.delete(packId);
        return;
      }

      // Increment progress
      const increment = Math.floor(Math.random() * 18) + 12;
      const nextProgress = Math.min(100, target.downloadProgress + increment);
      target.downloadProgress = nextProgress;

      if (nextProgress >= 100) {
        clearInterval(interval);
        this.downloadIntervals.delete(packId);
        target.status = 'installed';
        target.downloadProgress = 100;
        target.lastUpdated = new Date().toISOString().slice(0, 10);
        audioEngine.playRogerBeep();
        audioEngine.triggerHaptic([40, 60, 40]);
      }

      this.saveState();
    }, 280);

    this.downloadIntervals.set(packId, interval);
  }

  // Remove/Delete a language pack to free storage
  public deletePack(packId: string) {
    const pack = this.packs.find((p) => p.id === packId);
    if (!pack) return;

    if (this.downloadIntervals.has(packId)) {
      clearInterval(this.downloadIntervals.get(packId));
      this.downloadIntervals.delete(packId);
    }

    pack.status = 'available';
    pack.downloadProgress = 0;
    this.saveState();
    audioEngine.triggerHaptic(40);
  }

  // Download all high-priority packs (Hindi, Odia, Mandali)
  public downloadAllPriorityPacks() {
    const priority = ['pack_hi', 'pack_mjl', 'pack_or'];
    priority.forEach((id) => {
      const pack = this.packs.find((p) => p.id === id);
      if (pack && pack.status !== 'installed' && pack.status !== 'downloading') {
        this.downloadPack(id);
      }
    });
  }

  // Play acoustic audio sample of the pack
  public async playPackSample(packId: string): Promise<void> {
    const pack = this.packs.find((p) => p.id === packId);
    if (!pack) return;

    audioEngine.triggerHaptic(25);
    await audioEngine.speak(pack.samplePhrase, pack.langCode, {
      pitch: this.preferences.speechPitch,
      rate: this.preferences.speechRate,
    });
  }
}

export const languagePackService = new LanguagePackService();

import { LanguageCode, LanguageConfig, PhraseItem, RadioChannel } from '../types';

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    state: 'North & Central India',
    region: 'Delhi, UP, MP, Bihar, Rajasthan',
    script: 'Devanagari',
    flagEmoji: '🇮🇳',
    sttCode: 'hi-IN',
    ttsCode: 'hi-IN',
    ttsPitch: 1.0,
    ttsRate: 0.95,
    greetingExample: {
      native: 'नमस्ते, आप कैसे हैं?',
      phonetic: 'Namaste, aap kaise hain?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English (IN)',
    state: 'Pan-India Link',
    region: 'Interstate & Administrative',
    script: 'Latin',
    flagEmoji: '🇮🇳',
    sttCode: 'en-IN',
    ttsCode: 'en-IN',
    ttsPitch: 1.0,
    ttsRate: 1.0,
    greetingExample: {
      native: 'Hello, how can I help you?',
      phonetic: 'Hello, how can I help you?',
      english: 'Hello, how can I help you?',
    },
  },
  {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    state: 'Odisha',
    region: 'Eastern India',
    script: 'Odia',
    flagEmoji: '🇮🇳',
    sttCode: 'hi-IN', // Web Speech standard fallback for browsers without native Odia STT
    ttsCode: 'hi-IN', // Pitch modulated for Odia vocalic inflections
    ttsPitch: 1.15,
    ttsRate: 0.92,
    greetingExample: {
      native: 'ନମସ୍କାର, ଆପଣ କେମିତି ଅଛନ୍ତି?',
      phonetic: 'Namaskara, aapana kemiti achhanti?',
      english: 'Greetings, how are you?',
    },
  },
  {
    code: 'mjl',
    name: 'Mandali (Mandeali)',
    nativeName: 'माण्डली / मण्डयाली',
    state: 'Himachal Pradesh',
    region: 'Mandi & Beas Valley (Western Pahadi)',
    script: 'Devanagari (Historic Takri)',
    flagEmoji: '🇮🇳',
    sttCode: 'hi-IN',
    ttsCode: 'hi-IN',
    ttsPitch: 0.95,
    ttsRate: 0.9,
    isDialect: true,
    parentLanguage: 'Western Pahadi',
    greetingExample: {
      native: 'तुसां जो नमस्कार, केड़ा हाल चाल है?',
      phonetic: 'Tusan jo namaskar, keda haal chaal hai?',
      english: 'Greetings to you, how is everything going?',
    },
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    state: 'Punjab',
    region: 'North-West India',
    script: 'Gurmukhi',
    flagEmoji: '🇮🇳',
    sttCode: 'pa-IN',
    ttsCode: 'hi-IN',
    ttsPitch: 1.05,
    greetingExample: {
      native: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਕੀ ਹਾਲ ਹੈ?',
      phonetic: 'Sat Sri Akaal, ki haal hai?',
      english: 'Greetings, how are you?',
    },
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    state: 'West Bengal',
    region: 'Eastern India',
    script: 'Bengali',
    flagEmoji: '🇮🇳',
    sttCode: 'bn-IN',
    ttsCode: 'bn-IN',
    ttsPitch: 1.0,
    greetingExample: {
      native: 'নমস্কার, আপনি কেমন আছেন?',
      phonetic: 'Nomoshkar, aapni kemon aachhen?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    state: 'Maharashtra',
    region: 'Western India',
    script: 'Devanagari',
    flagEmoji: '🇮🇳',
    sttCode: 'mr-IN',
    ttsCode: 'mr-IN',
    greetingExample: {
      native: 'नमस्कार, तुम्ही कसे आहात?',
      phonetic: 'Namaskar, tumhi kase aahat?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    state: 'Kerala',
    region: 'Southern India',
    script: 'Malayalam',
    flagEmoji: '🇮🇳',
    sttCode: 'ml-IN',
    ttsCode: 'ml-IN',
    ttsPitch: 1.05,
    ttsRate: 0.95,
    greetingExample: {
      native: 'नमस्कारम्, സുഖമാണോ?',
      phonetic: 'Namaskaram, sugamano?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    state: 'Tamil Nadu',
    region: 'Southern India',
    script: 'Tamil',
    flagEmoji: '🇮🇳',
    sttCode: 'ta-IN',
    ttsCode: 'ta-IN',
    greetingExample: {
      native: 'வணக்கம், எப்படி இருக்கிறீர்கள்?',
      phonetic: 'Vanakkam, eppadi irukkireergal?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    state: 'Andhra Pradesh & Telangana',
    region: 'Southern India',
    script: 'Telugu',
    flagEmoji: '🇮🇳',
    sttCode: 'te-IN',
    ttsCode: 'te-IN',
    greetingExample: {
      native: 'నమస్కారం, మీరు ఎలా ఉన్నారు?',
      phonetic: 'Namaskaram, meeru ela unnaru?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    state: 'Karnataka',
    region: 'Southern India',
    script: 'Kannada',
    flagEmoji: '🇮🇳',
    sttCode: 'kn-IN',
    ttsCode: 'kn-IN',
    greetingExample: {
      native: 'ನಮಸ್ಕಾರ, ಹೇಗಿದ್ದೀರಿ?',
      phonetic: 'Namaskara, hegiddiri?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    state: 'Gujarat',
    region: 'Western India',
    script: 'Gujarati',
    flagEmoji: '🇮🇳',
    sttCode: 'gu-IN',
    ttsCode: 'gu-IN',
    greetingExample: {
      native: 'નમસ્કાર, તમે કેમ છો?',
      phonetic: 'Namaskar, tame kem cho?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    state: 'Pan-India',
    region: 'North & Central India',
    script: 'Arabic (Nastaliq)',
    flagEmoji: '🇮🇳',
    sttCode: 'ur-IN',
    ttsCode: 'ur-IN',
    greetingExample: {
      native: 'سلام، آپ کیسے ہیں؟',
      phonetic: 'Salam, aap kaise hain?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    state: 'Assam',
    region: 'Northeastern India',
    script: 'Bengali-Assamese',
    flagEmoji: '🇮🇳',
    sttCode: 'bn-IN',
    ttsCode: 'bn-IN',
    greetingExample: {
      native: 'নমস্কাৰ, আপুনি কেমন আছে?',
      phonetic: 'Nomoskar, apuni kemon ase?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'sa',
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    state: 'Pan-India Heritage',
    region: 'Classical',
    script: 'Devanagari',
    flagEmoji: '🇮🇳',
    sttCode: 'hi-IN',
    ttsCode: 'hi-IN',
    greetingExample: {
      native: 'नमस्कारः, भवान् कथम् अस्ति?',
      phonetic: 'Namaskarah, bhavan katham asti?',
      english: 'Greetings, how are you?',
    },
  },
  {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    state: 'Sikkim, West Bengal & Northern Hills',
    region: 'Himalayan Corridor',
    script: 'Devanagari',
    flagEmoji: '🇮🇳',
    sttCode: 'ne-NP',
    ttsCode: 'hi-IN',
    greetingExample: {
      native: 'नमस्कार, तपाईलाई कस्तो छ?',
      phonetic: 'Namaskar, tapailai kasto cha?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'ks',
    name: 'Kashmiri',
    nativeName: 'कॉशुर / كشميري',
    state: 'Jammu and Kashmir',
    region: 'Northern India',
    script: 'Perso-Arabic & Devanagari',
    flagEmoji: '🇮🇳',
    sttCode: 'hi-IN',
    ttsCode: 'hi-IN',
    greetingExample: {
      native: 'آداب، توہ چھုہ حأوالہٕ کیٚژھ؟',
      phonetic: 'Adaab, tow chhuh haawalah kech?',
      english: 'Greetings, how are you?',
    },
  },
  {
    code: 'sd',
    name: 'Sindhi',
    nativeName: 'سنڌي / सिंधी',
    state: 'Western Border & Gujarat/MH Diaspora',
    region: 'Western India',
    script: 'Arabic-Perso & Devanagari',
    flagEmoji: '🇮🇳',
    sttCode: 'hi-IN',
    ttsCode: 'hi-IN',
    greetingExample: {
      native: 'سلام، اوھان ڪିئن آهيو؟',
      phonetic: 'Salam, ohan kiin aahiyo?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'kok',
    name: 'Konkani',
    nativeName: 'कोंकणी',
    state: 'Goa, Karnataka & Maharashtra',
    region: 'Konkan Coast',
    script: 'Devanagari & Latin',
    flagEmoji: '🇮🇳',
    sttCode: 'mr-IN',
    ttsCode: 'mr-IN',
    greetingExample: {
      native: 'नमस्कार, तुमी कशे आसात?',
      phonetic: 'Namaskar, tumi kashe aasaat?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'mni',
    name: 'Manipuri',
    nativeName: 'মৈতৈলোন্',
    state: 'Manipur',
    region: 'Northeastern India',
    script: 'Bengali & Meitei Mayek',
    flagEmoji: '🇮🇳',
    sttCode: 'hi-IN',
    ttsCode: 'hi-IN',
    greetingExample: {
      native: 'খুরুমজরি, করমগদৌরি?',
      phonetic: 'Khurumjiri, karamgadouri?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'mai',
    name: 'Maithili',
    nativeName: 'मैथिली',
    state: 'Bihar',
    region: 'Eastern India',
    script: 'Devanagari (Tirhuta)',
    flagEmoji: '🇮🇳',
    sttCode: 'hi-IN',
    ttsCode: 'hi-IN',
    greetingExample: {
      native: 'नमस्कार, अहाँ कतेक छियै?',
      phonetic: 'Namaskar, ahan katek chhiyai?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'doi',
    name: 'Dogri',
    nativeName: 'डोगरी',
    state: 'Jammu and Kashmir',
    region: 'Northern India',
    script: 'Devanagari',
    flagEmoji: '🇮🇳',
    sttCode: 'hi-IN',
    ttsCode: 'hi-IN',
    greetingExample: {
      native: 'नमस्कार, तुस किम्दा ओ?',
      phonetic: 'Namaskar, tus kimda o?',
      english: 'Hello, how are you?',
    },
  },
  {
    code: 'sat',
    name: 'Santali',
    nativeName: 'संथाली / 𑢠𑢰𑢵𑢫𑢳',
    state: 'Jharkhand, Odisha & West Bengal',
    region: 'Eastern India',
    script: 'Ol Chiki',
    flagEmoji: '🇮🇳',
    sttCode: 'hi-IN',
    ttsCode: 'hi-IN',
    greetingExample: {
      native: 'جوहार, چেলে লেইক েনা?',
      phonetic: 'Johar, chele leik ena?',
      english: 'Greetings, how are you?',
    },
  },
  {
    code: 'brx',
    name: 'Bodo',
    nativeName: 'बोडो / बर’',
    state: 'Assam',
    region: 'Northeastern India',
    script: 'Devanagari',
    flagEmoji: '🇮🇳',
    sttCode: 'hi-IN',
    ttsCode: 'hi-IN',
    greetingExample: {
      native: 'खुलुमबाय, नों माबोरै दं?',
      phonetic: 'Khulumbai, nong mabore dong?',
      english: 'Hello, how are you?',
    },
  }
];

export const RADIO_CHANNELS: RadioChannel[] = [
  {
    channel: 1,
    frequency: '145.500 MHz',
    name: 'Emergency & Relief (SOS)',
    description: 'Priority mesh channel for medical, disaster & road emergencies',
    badgeColor: 'text-red-400 bg-red-950/60 border-red-500/40',
    iconName: 'AlertTriangle',
    isEmergency: true,
  },
  {
    channel: 2,
    frequency: '145.200 MHz',
    name: 'Interstate Transport & Logistics',
    description: 'Highways, truck corridors, border posts & inter-state routes',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
    iconName: 'Truck',
  },
  {
    channel: 3,
    frequency: '146.520 MHz',
    name: 'Public Calling & Intercom',
    description: 'General calling channel for travellers and local markets',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
    iconName: 'Radio',
  },
  {
    channel: 4,
    frequency: '147.800 MHz',
    name: 'Private P2P Mesh Talk',
    description: 'Direct encrypted mesh talkgroup between paired mobile units',
    badgeColor: 'text-sky-400 bg-sky-950/60 border-sky-500/40',
    iconName: 'Shield',
  },
];

// Offline Lexicon with curated cross-state interstate phrases
export const OFFLINE_PHRASEBOOK: PhraseItem[] = [
  {
    id: 'sos_1',
    category: 'emergency',
    english: 'I need immediate medical help! Call a doctor.',
    hindi: {
      text: 'मुझे तुरंत डॉक्टरी सहायता चाहिए! डॉक्टर को बुलाओ।',
      phonetic: 'Mujhe turant doctari sahayata chahiye! Doctor ko bulao.',
    },
    odia: {
      text: 'ମୋତେ ତୁରନ୍ତ ଡାକ୍ତରୀ ସାହାଯ୍ୟ ଦରକାର! ଡାକ୍ତରଙ୍କୁ ଡାକନ୍ତୁ।',
      phonetic: 'Mote turanta daktari sahayya darkar! Daktaranku dakantu.',
    },
    mandali: {
      text: 'मां जो झटपट डाक्टरी मदद चहिदी! डाक्टरा जो सदो।',
      phonetic: 'Maan jo jhatpat daktari madad chahidi! Daktara jo sado.',
    },
    icon: 'HeartPulse',
  },
  {
    id: 'sos_2',
    category: 'emergency',
    english: 'There has been an accident here on the highway.',
    hindi: {
      text: 'यहाँ हाईवे पर एक दुर्घटना हो गई है।',
      phonetic: 'Yahan highway par ek durghatna ho gayi hai.',
    },
    odia: {
      text: 'ଏଠାରେ ହାଇୱେ ଉପରେ ଏକ ଦୁର୍ଘଟଣା ଘଟିଛି।',
      phonetic: 'Ethare highway upare eka durghatana ghatichhi.',
    },
    mandali: {
      text: 'इथी सड़का / हाईवे परा इक दुर्घटना होयी गयी है।',
      phonetic: 'Ithi sadka / highway para ik durghatna hoyi gayi hai.',
    },
    icon: 'AlertOctagon',
  },
  {
    id: 'sos_3',
    category: 'emergency',
    english: 'Please help us, we are lost and out of signal.',
    hindi: {
      text: 'कृपया हमारी मदद करें, हम रास्ता भटक गए हैं और नेटवर्क नहीं है।',
      phonetic: 'Kripya hamari madad karein, hum rasta bhatak gaye hain aur network nahi hai.',
    },
    odia: {
      text: 'ଦୟାକରି ଆମକୁ ସାହାଯ୍ୟ କରନ୍ତୁ, ଆମେ ରାସ୍ତା ହଜାଇ ଦେଇଛୁ ଏବଂ ନେଟୱାର୍କ ନାହିଁ।',
      phonetic: 'Dayakari aamaku sahayya karantu, aame rasta hajayi deichhu ebam network nahi.',
    },
    mandali: {
      text: 'म्हारी मदद करा, अस्सां रस्ता भुल्ली गेहेन ते सिगनल नी है।',
      phonetic: 'Mhari madad kara, assan rasta bhulli gehen te signal ni hai.',
    },
    icon: 'HelpCircle',
  },
  {
    id: 'dir_1',
    category: 'directions',
    english: 'Where does this road lead to?',
    hindi: {
      text: 'यह सड़क कहाँ जाती है?',
      phonetic: 'Yeh sadak kahan jaati hai?',
    },
    odia: {
      text: 'ଏହି ରାସ୍ତାଟି କୁଆଡ଼େ ଯାଉଛି?',
      phonetic: 'Ehi rastati kuade jauchhi?',
    },
    mandali: {
      text: 'ऐह सड़क कुथु जांदी है?',
      phonetic: 'Aih sadak kuthu jaandi hai?',
    },
    icon: 'Compass',
  },
  {
    id: 'dir_2',
    category: 'directions',
    english: 'How far is the nearest bus stand or railway station?',
    hindi: {
      text: 'नजदीकी बस स्टैंड या रेलवे स्टेशन कितनी दूर है?',
      phonetic: 'Nazdeeki bus stand ya railway station kitni door hai?',
    },
    odia: {
      text: 'ନିକଟତମ ବସ ଷ୍ଟାଣ୍ଡ କିମ୍ବା ରେଳ ଷ୍ଟେସନ କେତେ ଦୂର?',
      phonetic: 'Nikatatama bus stand kimba railway station kete doora?',
    },
    mandali: {
      text: 'नेड़ला बस अडा या रेल स्टेशन केतड़ी दूर है?',
      phonetic: 'Nedla bus adda ya rail station ketdi door hai?',
    },
    icon: 'MapPin',
  },
  {
    id: 'dir_3',
    category: 'directions',
    english: 'Is the mountain pass or bridge open ahead?',
    hindi: {
      text: 'क्या आगे पहाड़ी दर्रा या पुल खुला है?',
      phonetic: 'Kya aage pahadi darra ya pul khula hai?',
    },
    odia: {
      text: 'ଆଗରେ ପୋଲ କିମ୍ବା ଘାଟି ରାସ୍ତା ଖୋଲା ଅଛି କି?',
      phonetic: 'Aagare pola kimba ghati rasta khola achhi ki?',
    },
    mandali: {
      text: 'के अग्गे पुली या जोत / दर्रा खुला है?',
      phonetic: 'Ke agge puli ya jot / darra khula hai?',
    },
    icon: 'Navigation',
  },
  {
    id: 'gen_1',
    category: 'general',
    english: 'Greetings! Where are you traveling from?',
    hindi: {
      text: 'नमस्ते! आप कहाँ से आ रहे हैं?',
      phonetic: 'Namaste! Aap kahan se aa rahe hain?',
    },
    odia: {
      text: 'ନମସ୍କାର! ଆପଣ କେଉଁଠାରୁ ଆସୁଛନ୍ତି?',
      phonetic: 'Namaskara! Aapana keuntharu aasuchhanti?',
    },
    mandali: {
      text: 'तुसां जो नमस्कार! तुसां कुथुआ औंदे?',
      phonetic: 'Tusan jo namaskar! Tusan kuthua aunde?',
    },
    icon: 'Smile',
  },
  {
    id: 'gen_2',
    category: 'general',
    english: 'What is your name? Nice to meet you.',
    hindi: {
      text: 'आपका नाम क्या है? आपसे मिलकर खुशी हुई।',
      phonetic: 'Aapka naam kya hai? Aapse milkar khushi hui.',
    },
    odia: {
      text: 'ଆପଣଙ୍କ ନାମ କ’ଣ? ଆପଣଙ୍କୁ ଭେଟି ଖୁସି ଲାଗିଲା।',
      phonetic: 'Aapananka naama kaana? Aapananku bheti khusi lagila.',
    },
    mandali: {
      text: 'तुहाड़ा नां के है? तुसां ने मिली ने बड़ा अच्छा लग्या।',
      phonetic: 'Tuhada naah ke hai? Tusan ne mili ne bada achha lagya.',
    },
    icon: 'UserCheck',
  },
  {
    id: 'gen_3',
    category: 'general',
    english: 'Please speak slowly, I am from another state.',
    hindi: {
      text: 'कृपया धीरे बोलिए, मैं दूसरे राज्य से हूँ।',
      phonetic: 'Kripya dheere boliye, main doosre rajya se hoon.',
    },
    odia: {
      text: 'ଦୟାକରି ଧୀରେ କୁହନ୍ତୁ, ମୁଁ ଅନ୍ୟ ଏକ ରାଜ୍ୟରୁ ଆସିଛି।',
      phonetic: 'Dayakari dheere kuhantu, mun anya eka rajyaru aasichhi.',
    },
    mandali: {
      text: 'भैय्या होले-होले बोला, मां दूजे सूबे / राज्य रा हां।',
      phonetic: 'Bhaiyya hole-hole bola, maan dooje soobe / rajya ra haan.',
    },
    icon: 'Volume2',
  },
  {
    id: 'food_1',
    category: 'food',
    english: 'Where can we get clean drinking water and food?',
    hindi: {
      text: 'पीने का साफ पानी और खाना कहाँ मिलेगा?',
      phonetic: 'Peene ka saaf paani aur khana kahan milega?',
    },
    odia: {
      text: 'ପିଇବା ପାଇଁ ବିଶୁଦ୍ଧ ପାଣି ଏବଂ ଖାଦ୍ୟ କେଉଁଠି ମିଳିବ?',
      phonetic: 'Piiba pain bisuddha pani ebam khadya keunthi miliba?',
    },
    mandali: {
      text: 'पीणे जो साफ पाणी ते रोटी कुथु मिलणी?',
      phonetic: 'Peene jo saaf paani te roti kuthu milni?',
    },
    icon: 'Utensils',
  },
  {
    id: 'food_2',
    category: 'food',
    english: 'How much does this cost?',
    hindi: {
      text: 'इसकी कीमत क्या है? यह कितने का है?',
      phonetic: 'Iski keemat kya hai? Yeh kitne ka hai?',
    },
    odia: {
      text: 'ଏହାର ମୂଲ୍ୟ କେତେ? ଏହା କେତେ ଟଙ୍କାର?',
      phonetic: 'Ehara mulya kete? Eha kete tankara?',
    },
    mandali: {
      text: 'ऐह केतड़े रा है? केतणे रुपये होये?',
      phonetic: 'Aih ketde ra hai? Ketne rupaye hoye?',
    },
    icon: 'CreditCard',
  },
  {
    id: 'med_1',
    category: 'medical',
    english: 'Is there a pharmacy or chemist shop nearby?',
    hindi: {
      text: 'क्या पास में कोई दवाई की दुकान या केमिस्ट है?',
      phonetic: 'Kya paas mein koi dawai ki dukaan ya chemist hai?',
    },
    odia: {
      text: 'ପାଖରେ କୌଣସି ଔଷଧ ଦୋକାନ ଅଛି କି?',
      phonetic: 'Pakhare kounasi oushadha dokana achhi ki?',
    },
    mandali: {
      text: 'के नेड़े कोई दवाई री दुकान है?',
      phonetic: 'Ke nede koi dawai ri dukaan hai?',
    },
    icon: 'Crosshair',
  },
];

// Offline Mandali Dialect Transformation Rules (Himachali / Mandeali Pahadi grammar)
export function applyMandaliDialectRules(hindiText: string): { text: string; phonetic: string; notes: string } {
  let text = hindiText.trim();

  // Replacements table for common Hindi phrases into authentic Mandali
  const directMap: Record<string, string> = {
    'कहाँ जा रहे हो': 'कुथु जांदे',
    'कहाँ जा रहे हैं': 'कुथु जांदे',
    'कहाँ जा रहे हो?': 'कुथु जांदे?',
    'कहाँ जा रहे हैं?': 'कुथु जांदे?',
    'आपका नाम क्या है': 'तुहाड़ा नां के है',
    'आपका नाम क्या है?': 'तुहाड़ा नां के है?',
    'तुम्हारा नाम क्या है': 'तेरा नां के है',
    'तुम्हारा नाम क्या है?': 'तेरा नां के है?',
    'कैसे हो': 'केड़ा हाल है',
    'आप कैसे हैं': 'तुसां केड़े हो / केड़ा हाल है',
    'नमस्ते': 'तुसां जो नमस्कार',
    'नमस्कार': 'तुसां जो नमस्कार',
    'धन्यवाद': 'बड़ा-बड़ा धन्यवाद / मेहरबानी',
    'बहुत धन्यवाद': 'बड़ा-बड़ा धन्यवाद',
    'पानी चाहिए': 'पाणी चहिदा',
    'मुझे पानी चाहिए': 'मां जो पाणी चहिदा',
    'मदद चाहिए': 'मदद चहिदी',
    'रास्ता बताइए': 'रस्ता दस्सा',
    'मुझे नहीं पता': 'मां जो नी पता',
    'मैं ठीक हूँ': 'हौं ठीक हां',
    'हम ठीक हैं': 'अस्सां ठीक हां',
    'कितने पैसे हुए': 'केतणे रुपये होये',
    'कितना हुआ': 'केतड़ा होया',
    'रुको': 'खड़ो',
    'यहाँ आओ': 'इथी आओ / इथी आ',
    'वहाँ जाओ': 'तिथी जा',
  };

  for (const [hi, mjl] of Object.entries(directMap)) {
    if (text.toLowerCase() === hi.toLowerCase()) {
      return {
        text: mjl,
        phonetic: transliterateDevanagariToPhonetic(mjl),
        notes: 'Mandali (Mandeali) native idiom used in Mandi Valley',
      };
    }
  }

  // Word & Morphological Replacements
  const wordReplacements: Array<[RegExp, string]> = [
    // Pronouns & Postpositions
    [/\bमैं\b/g, 'हौं / मां'],
    [/\bमुझे\b/g, 'मां जो'],
    [/\bमुझको\b/g, 'मां जो'],
    [/\bमेरा\b/g, 'म्हारा'],
    [/\bमेरी\b/g, 'म्हारी'],
    [/\bमेरे\b/g, 'म्हारे'],
    [/\bहम\b/g, 'अस्सां'],
    [/\bहमारा\b/g, 'असां रा'],
    [/\bआप\b/g, 'तुसां'],
    [/\bआपका\b/g, 'तुहाड़ा'],
    [/\bआपकी\b/g, 'तुहाड़ी'],
    [/\bआपके\b/g, 'तुहाड़े'],
    [/\bआपको\b/g, 'तुसां जो'],
    [/\bतुम\b/g, 'तुसां'],
    // Interrogatives
    [/\bकहाँ\b/g, 'कुथु'],
    [/\bक्या\b/g, 'के'],
    [/\bक्यों\b/g, 'कियां-जो'],
    [/\bकैसे\b/g, 'कियां'],
    [/\bकैसा\b/g, 'केड़ा'],
    [/\bकितना\b/g, 'केतड़ा'],
    [/\bकितने\b/g, 'केतणे'],
    [/\bकब\b/g, 'कदू'],
    // Adverbs of Place
    [/\bयहाँ\b/g, 'इथी'],
    [/\bवहाँ\b/g, 'तिथी'],
    [/\bइधर\b/g, 'इथी कनी'],
    [/\bउधर\b/g, 'तिथी कनी'],
    // Negation & Copula
    [/\bनहीं\b/g, 'नी'],
    [/\bहैं\b/g, 'हन / हैं'],
    [/\bहूँ\b/g, 'हां'],
    [/\bथा\b/g, 'था'],
    // Common nouns & verbs
    [/\bपानी\b/g, 'पाणी'],
    [/\bचाहिए\b/g, 'चहिदा'],
    [/\bबोलिए\b/g, 'बोला'],
    [/\bबताइए\b/g, 'दस्सा'],
    [/\bजाते\b/g, 'जांदे'],
    [/\bजा रहे\b/g, 'जांदे'],
    [/\bआ रहे\b/g, 'औंदे'],
    [/\bआते\b/g, 'औंदे'],
    [/\bकरते\b/g, 'करदे'],
    [/\bसड़क\b/g, 'सड़क'],
    [/\bपास\b/g, 'नेड़े'],
  ];

  let transformed = text;
  for (const [pattern, rep] of wordReplacements) {
    transformed = transformed.replace(pattern, rep);
  }

  return {
    text: transformed,
    phonetic: transliterateDevanagariToPhonetic(transformed),
    notes: 'Transformed using offline Mandali (Western Pahadi) morpho-phonetic rules',
  };
}

// Transliterate Devanagari to Romanized phonetic script for audio-visual guide
export function transliterateDevanagariToPhonetic(devanagari: string): string {
  const charMap: Record<string, string> = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', '्': '',
    '़': '', '।': '.', '—': '-',
  };

  let out = '';
  for (let i = 0; i < devanagari.length; i++) {
    const ch = devanagari[i];
    if (charMap[ch] !== undefined) {
      out += charMap[ch];
    } else {
      out += ch;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

// Transliterate Odia characters into phonetic Roman
export function transliterateOdiaToPhonetic(odia: string): string {
  const odiaMap: Record<string, string> = {
    'ଅ': 'a', 'ଆ': 'aa', 'ଇ': 'i', 'ଈ': 'ee', 'ଉ': 'u', 'ଊ': 'oo', 'ଏ': 'e', 'ଐ': 'ai', 'ଓ': 'o', 'ଔ': 'au',
    'କ': 'k', 'ଖ': 'kh', 'ଗ': 'g', 'ଘ': 'gh', 'ଙ': 'ng',
    'ଚ': 'ch', 'ଛ': 'chh', 'ଜ': 'j', 'ଝ': 'jh', 'ଞ': 'ny',
    'ଟ': 't', 'ଠ': 'th', 'ଡ': 'd', 'ଢ': 'dh', 'ଣ': 'n',
    'ତ': 't', 'ଥ': 'th', 'ଦ': 'd', 'ଧ': 'dh', 'ନ': 'n',
    'ପ': 'p', 'ଫ': 'ph', 'ବ': 'b', 'ଭ': 'bh', 'ମ': 'm',
    'ଯ': 'y', 'ୟ': 'ya', 'ର': 'r', 'ଳ': 'l', 'ଲ': 'l', 'ୱ': 'w', 'ଶ': 'sh', 'ଷ': 'sh', 'ସ': 's', 'ହ': 'h',
    'ା': 'a', 'ି': 'i', 'ୀ': 'ee', 'ୁ': 'u', 'ୂ': 'oo', 'େ': 'e', 'ୈ': 'ai', 'ୋ': 'o', 'ୌ': 'au', 'ଂ': 'n', 'ଁ': 'n', '୍': '',
    '।': '.',
  };

  let out = '';
  for (let i = 0; i < odia.length; i++) {
    const ch = odia[i];
    if (odiaMap[ch] !== undefined) {
      out += odiaMap[ch];
    } else {
      out += ch;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

// Transliterate Malayalam characters into phonetic Roman
export function transliterateMalayalamToPhonetic(malayalam: string): string {
  const mlMap: Record<string, string> = {
    'അ': 'a', 'ആ': 'aa', 'ഇ': 'i', 'ഈ': 'ee', 'ഉ': 'u', 'ഊ': 'oo', 'എ': 'e', 'ഏ': 'ee', 'ഐ': 'ai', 'ഒ': 'o', 'ഓ': 'oo', 'ഔ': 'au',
    'ക': 'k', 'ഖ': 'kh', 'ഗ': 'g', 'ഘ': 'gh', 'ങ': 'ng',
    'ച': 'ch', 'ഛ': 'chh', 'ജ': 'j', 'ଝ': 'jh', 'ഞ': 'ny',
    'ട': 't', 'ഠ': 'th', 'ഡ': 'd', 'ഢ': 'dh', 'ണ': 'n',
    'ത': 't', 'ഥ': 'th', 'ദ': 'd', 'ധ': 'dh', 'ന': 'n',
    'പ': 'p', 'ഫ': 'ph', 'ബ': 'b', 'ഭ': 'bh', 'മ': 'm',
    'യ': 'y', 'ര': 'r', 'ല': 'l', 'വ': 'v', 'ശ': 'sh', 'ഷ': 'sh', 'സ': 's', 'ഹ': 'h',
    'ാ': 'a', 'ി': 'i', 'ീ': 'ee', 'ു': 'u', 'ൂ': 'oo', 'െ': 'e', 'േ': 'ee', 'ൈ': 'ai', 'ൊ': 'o', 'ോ': 'o', 'ൌ': 'au', 'ം': 'n', '്': '',
  };

  let out = '';
  for (let i = 0; i < malayalam.length; i++) {
    const ch = malayalam[i];
    if (mlMap[ch] !== undefined) {
      out += mlMap[ch];
    } else {
      out += ch;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

// Offline Lexicon lookup engine
export function findInOfflinePhrasebook(
  inputText: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode
): { text: string; phonetic: string; notes?: string } | null {
  const query = inputText.trim().toLowerCase();

  for (const phrase of OFFLINE_PHRASEBOOK) {
    let sourceMatch = false;

    if (sourceLang === 'en' && phrase.english.toLowerCase().includes(query)) sourceMatch = true;
    if (sourceLang === 'hi' && (phrase.hindi.text.includes(query) || phrase.hindi.phonetic.toLowerCase().includes(query))) sourceMatch = true;
    if (sourceLang === 'or' && (phrase.odia.text.includes(query) || phrase.odia.phonetic.toLowerCase().includes(query))) sourceMatch = true;
    if (sourceLang === 'mjl' && (phrase.mandali.text.includes(query) || phrase.mandali.phonetic.toLowerCase().includes(query))) sourceMatch = true;
    if (sourceLang === 'ml' && phrase.malayalam && (phrase.malayalam.text.includes(query) || phrase.malayalam.phonetic.toLowerCase().includes(query))) sourceMatch = true;

    if (sourceMatch) {
      if (targetLang === 'hi') return { text: phrase.hindi.text, phonetic: phrase.hindi.phonetic, notes: 'Direct match from offline interstate emergency phrasebook' };
      if (targetLang === 'en') return { text: phrase.english, phonetic: phrase.english, notes: 'Direct match from offline phrasebook' };
      if (targetLang === 'or') return { text: phrase.odia.text, phonetic: phrase.odia.phonetic, notes: 'Direct match from offline phrasebook' };
      if (targetLang === 'mjl') return { text: phrase.mandali.text, phonetic: phrase.mandali.phonetic, notes: 'Authentic Mandali phrasing from offline phrasebook' };
      if (targetLang === 'ml' && phrase.malayalam) return { text: phrase.malayalam.text, phonetic: phrase.malayalam.phonetic, notes: 'Direct match from offline Malayalam lexicon' };
    }
  }

  return null;
}

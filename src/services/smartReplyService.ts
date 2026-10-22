import { LanguageCode } from '../types';

export interface SmartReplyOption {
  id: string;
  label: string;      // Display button label (e.g. "👍 Roger that!", "🚶 On my way")
  text: string;       // Text to transmit in the user's source language
  category: 'affirmation' | 'question' | 'status' | 'urgent' | 'courtesy';
  icon?: string;
}

export interface SmartReplyContext {
  lastMessageText: string;
  senderName?: string;
  userLang: LanguageCode;
  senderLang?: LanguageCode;
}

/**
 * Basic NLP Engine for Smart Replies on Walkie-Talkie WalkieTalkieView.
 * Analyzes incoming message intent (question, greeting, location request, urgent, thanks, task)
 * and generates 4 quick, contextually accurate response chips localized to user's dialect/language.
 */
export class SmartReplyService {
  /**
   * Generates contextual smart replies based on last received message text and user language.
   */
  public generateSmartReplies(ctx: SmartReplyContext): SmartReplyOption[] {
    const raw = (ctx.lastMessageText || '').trim().toLowerCase();
    const lang = ctx.userLang || 'hi';

    if (!raw) {
      return this.getDefaultReplies(lang);
    }

    // 1. Check Urgent / Emergency / SOS intent
    if (
      raw.includes('sos') ||
      raw.includes('help') ||
      raw.includes('emergency') ||
      raw.includes('मदद') ||
      raw.includes('इमरजेंसी') ||
      raw.includes('खतरा') ||
      raw.includes('डॉक्टर') ||
      raw.includes('पानी') ||
      raw.includes('डाक्टरी') ||
      raw.includes('चाहिए')
    ) {
      return this.getUrgentReplies(lang);
    }

    // 2. Check Question / Inquiry intent
    if (
      raw.includes('?') ||
      raw.includes('कहाँ') ||
      raw.includes('कब') ||
      raw.includes('कैसे') ||
      raw.includes('कौन') ||
      raw.includes('किधर') ||
      raw.includes('कुथु') ||
      raw.includes('क्या') ||
      raw.includes('where') ||
      raw.includes('when') ||
      raw.includes('how') ||
      raw.includes('what') ||
      raw.includes('who') ||
      raw.includes('why') ||
      raw.includes('कड़ा') ||
      raw.includes('केड़ा')
    ) {
      // Sub-intent: Where are you / Location query
      if (
        raw.includes('कहाँ') ||
        raw.includes('कुथु') ||
        raw.includes('where') ||
        raw.includes('किधर') ||
        raw.includes('स्थान') ||
        raw.includes('location') ||
        raw.includes('बस') ||
        raw.includes('station')
      ) {
        return this.getLocationQuestionReplies(lang);
      }
      return this.getGeneralQuestionReplies(lang);
    }

    // 3. Check Greeting / Wellbeing intent
    if (
      raw.includes('hello') ||
      raw.includes('hi') ||
      raw.includes('namaste') ||
      raw.includes('नमस्ते') ||
      raw.includes('नमस्कार') ||
      raw.includes('हाल') ||
      raw.includes('मजे') ||
      raw.includes('keda hal') ||
      raw.includes('kem cho') ||
      raw.includes('सत श्री अकाल')
    ) {
      return this.getGreetingReplies(lang);
    }

    // 4. Check Gratitude / Thanks intent
    if (
      raw.includes('thank') ||
      raw.includes('thanks') ||
      raw.includes('धन्यवाद') ||
      raw.includes('शुक्रिया') ||
      raw.includes('मेहरबानी') ||
      raw.includes('बड़ा-बड़ा')
    ) {
      return this.getThanksReplies(lang);
    }

    // 5. Check Request / Command intent
    if (
      raw.includes('करो') ||
      raw.includes('भेजो') ||
      raw.includes('लाओ') ||
      raw.includes('please') ||
      raw.includes('कृपया') ||
      raw.includes('send') ||
      raw.includes('bring') ||
      raw.includes('देना') ||
      raw.includes('कर दो')
    ) {
      return this.getRequestReplies(lang);
    }

    // Fallback general smart replies
    return this.getDefaultReplies(lang);
  }

  private getUrgentReplies(lang: LanguageCode): SmartReplyOption[] {
    if (lang === 'mjl') {
      return [
        { id: 'u1', label: '🏃 मां झटपट आउंदा!', text: 'मां झटपट आउंदा!', category: 'urgent' },
        { id: 'u2', label: '❓ तुसां ठीक हैं जी?', text: 'तुसां ठीक हैं जी?', category: 'question' },
        { id: 'u3', label: '🚑 डाक्टर जो सददा दया', text: 'डाक्टर जो तुरंत सददा दया', category: 'urgent' },
        { id: 'u4', label: '🧘 शांत रो, मदद लाउंदा', text: 'शांत रो, मां मदद लाउंदा', category: 'status' },
      ];
    }
    if (lang === 'en') {
      return [
        { id: 'u1', label: '🏃 Coming immediately!', text: "I'm coming immediately!", category: 'urgent' },
        { id: 'u2', label: '❓ Are you safe?', text: 'Are you safe and alright?', category: 'question' },
        { id: 'u3', label: '🚑 Calling emergency doctor', text: 'Calling emergency medical help right now', category: 'urgent' },
        { id: 'u4', label: '🧘 Stay calm, help is near', text: 'Stay calm, help is on the way', category: 'status' },
      ];
    }
    // Hindi default
    return [
      { id: 'u1', label: '🏃 मैं तुरंत आ रहा हूँ!', text: 'मैं तुरंत आ रहा हूँ!', category: 'urgent' },
      { id: 'u2', label: '❓ क्या आप सुरक्षित हैं?', text: 'क्या आप सुरक्षित हैं?', category: 'question' },
      { id: 'u3', label: '🚑 डॉक्टर को कॉल कर रहा हूँ', text: 'मैं तुरंत डॉक्टर और सहायता को कॉल कर रहा हूँ', category: 'urgent' },
      { id: 'u4', label: '🧘 शांत रहिए, मदद पहुँच रही है', text: 'घबराएं नहीं, मदद पहुँच रही है', category: 'status' },
    ];
  }

  private getLocationQuestionReplies(lang: LanguageCode): SmartReplyOption[] {
    if (lang === 'mjl') {
      return [
        { id: 'l1', label: '🚶 मां रास्ते विच हैं', text: 'मां रास्ते विच हैं', category: 'status' },
        { id: 'l2', label: '🚏 बस अड्डे पर हैं', text: 'मां बस अड्डे पर हैं', category: 'status' },
        { id: 'l3', label: '🏡 घरा जांदे जी', text: 'मां घरा जांदे जी', category: 'status' },
        { id: 'l4', label: '⏱️ उथे ही रुको, मां आउंदा', text: 'उथे ही रुको, मां ५ मिनट विच आउंदा', category: 'affirmation' },
      ];
    }
    if (lang === 'en') {
      return [
        { id: 'l1', label: '🚶 On my way!', text: "I'm on my way!", category: 'status' },
        { id: 'l2', label: '🚏 At the bus stand', text: "I'm at the bus stand right now", category: 'status' },
        { id: 'l3', label: '🏡 Heading home', text: "I'm heading home now", category: 'status' },
        { id: 'l4', label: '⏱️ Wait there, arriving in 5m', text: "Wait there, I'll arrive in 5 minutes", category: 'affirmation' },
      ];
    }
    return [
      { id: 'l1', label: '🚶 मैं रास्ते में हूँ', text: 'मैं रास्ते में हूँ', category: 'status' },
      { id: 'l2', label: '🚏 बस स्टैंड पर हूँ', text: 'मैं बस स्टैंड पर हूँ', category: 'status' },
      { id: 'l3', label: '🏡 घर जा रहा हूँ', text: 'मैं घर जा रहा हूँ', category: 'status' },
      { id: 'l4', label: '⏱️ वहीं रुकिए, 5 मिनट में पहुँचता हूँ', text: 'वहीं रुकिए, मैं 5 मिनट में पहुँच रहा हूँ', category: 'affirmation' },
    ];
  }

  private getGeneralQuestionReplies(lang: LanguageCode): SmartReplyOption[] {
    if (lang === 'mjl') {
      return [
        { id: 'q1', label: '👍 हौ जी, समझी गया', text: 'हौ जी, समझी गया', category: 'affirmation' },
        { id: 'q2', label: '⏱️ 5 मिनट लगणे', text: 'मां जो 5 मिनट लगणे', category: 'status' },
        { id: 'q3', label: '✨ सब ठीक है जी', text: 'सब ठीक है जी', category: 'courtesy' },
        { id: 'q4', label: '❌ ना जी, मां जो नी पता', text: 'ना जी, मां जो नी पता', category: 'status' },
      ];
    }
    if (lang === 'en') {
      return [
        { id: 'q1', label: '👍 Roger that / Understood', text: 'Roger that, understood!', category: 'affirmation' },
        { id: 'q2', label: '⏱️ Will take 5 minutes', text: 'It will take about 5 minutes', category: 'status' },
        { id: 'q3', label: '✨ All good here', text: 'All good on my side', category: 'courtesy' },
        { id: 'q4', label: '❌ Not sure yet', text: "I'm not sure about that yet", category: 'status' },
      ];
    }
    return [
      { id: 'q1', label: '👍 हाँ, समझ गया (Roger)', text: 'हाँ, समझ गया', category: 'affirmation' },
      { id: 'q2', label: '⏱️ 5 मिनट लगेंगे', text: 'मुझे 5 मिनट लगेंगे', category: 'status' },
      { id: 'q3', label: '✨ सब ठीक है', text: 'यहाँ सब ठीक है', category: 'courtesy' },
      { id: 'q4', label: '❌ जानकारी नहीं है', text: 'मुझे इसके बारे में जानकारी नहीं है', category: 'status' },
    ];
  }

  private getGreetingReplies(lang: LanguageCode): SmartReplyOption[] {
    if (lang === 'mjl') {
      return [
        { id: 'g1', label: '👋 नमस्कार जी! केड़ा हाल है?', text: 'नमस्कार जी! केड़ा हाल चाल है?', category: 'courtesy' },
        { id: 'g2', label: '😊 हौ जी, सब बढ़िया!', text: 'हौ जी, सब बढ़िया है', category: 'courtesy' },
        { id: 'g3', label: '❓ तुसां दसो केड़ा हाल?', text: 'तुसां दसो केड़ा हाल है?', category: 'question' },
        { id: 'g4', label: '☀️ शुभ प्रभात जी', text: 'शुभ प्रभात जी!', category: 'courtesy' },
      ];
    }
    if (lang === 'en') {
      return [
        { id: 'g1', label: '👋 Hello! How are you?', text: 'Hello! How are you doing?', category: 'courtesy' },
        { id: 'g2', label: '😊 Doing great, thanks!', text: "Doing great here, thanks!", category: 'courtesy' },
        { id: 'g3', label: '❓ How about you?', text: 'How are things on your side?', category: 'question' },
        { id: 'g4', label: '☀️ Good day!', text: 'Good day to you!', category: 'courtesy' },
      ];
    }
    return [
      { id: 'g1', label: '👋 नमस्ते! आप कैसे हैं?', text: 'नमस्ते! आप कैसे हैं?', category: 'courtesy' },
      { id: 'g2', label: '😊 मैं बिल्कुल ठीक हूँ', text: 'मैं बिल्कुल ठीक हूँ, धन्यवाद!', category: 'courtesy' },
      { id: 'g3', label: '❓ आप बताइए, क्या हाल है?', text: 'आप बताइए, क्या हाल चाल है?', category: 'question' },
      { id: 'g4', label: '☀️ शुभ प्रभात / नमस्कार', text: 'शुभ प्रभात, नमस्कार!', category: 'courtesy' },
    ];
  }

  private getThanksReplies(lang: LanguageCode): SmartReplyOption[] {
    if (lang === 'mjl') {
      return [
        { id: 't1', label: '🙏 बड़ा-बड़ा धन्यवाद जी!', text: 'बड़ा-बड़ा धन्यवाद जी!', category: 'courtesy' },
        { id: 't2', label: '🤗 तुसां जो स्वागत है', text: 'तुसां जो बहुत स्वागत है जी', category: 'courtesy' },
        { id: 't3', label: '✨ कोई गल नी जी', text: 'कोई गल नी जी!', category: 'courtesy' },
        { id: 't4', label: '💛 अपना ख्याल रख्या', text: 'अपना ख्याल रख्या जी', category: 'courtesy' },
      ];
    }
    if (lang === 'en') {
      return [
        { id: 't1', label: '🙏 Thank you so much!', text: 'Thank you so much!', category: 'courtesy' },
        { id: 't2', label: '🤗 You are welcome!', text: "You're most welcome!", category: 'courtesy' },
        { id: 't3', label: '✨ No worries at all!', text: 'No worries at all!', category: 'courtesy' },
        { id: 't4', label: '💛 Take care!', text: 'Take care of yourself!', category: 'courtesy' },
      ];
    }
    return [
      { id: 't1', label: '🙏 आपका बहुत-बहुत धन्यवाद!', text: 'आपका बहुत-बहुत धन्यवाद!', category: 'courtesy' },
      { id: 't2', label: '🤗 आपका स्वागत है!', text: 'आपका बहुत-बहुत स्वागत है!', category: 'courtesy' },
      { id: 't3', label: '✨ कोई बात नहीं!', text: 'कोई बात नहीं जी!', category: 'courtesy' },
      { id: 't4', label: '💛 अपना ख्याल रखें!', text: 'अपना ध्यान रखें!', category: 'courtesy' },
    ];
  }

  private getRequestReplies(lang: LanguageCode): SmartReplyOption[] {
    if (lang === 'mjl') {
      return [
        { id: 'r1', label: '👍 हौ जी, करी देंदा', text: 'हौ जी, मां करी देंदा', category: 'affirmation' },
        { id: 'r2', label: '⏱️ एक मिनट रुको जी', text: 'एक मिनट रुको जी', category: 'status' },
        { id: 'r3', label: '✅ होई गया जी', text: 'कम होई गया जी', category: 'affirmation' },
        { id: 'r4', label: '🤝 कोई गल नी', text: 'कोई गल नी, मां करी देंदा', category: 'courtesy' },
      ];
    }
    if (lang === 'en') {
      return [
        { id: 'r1', label: '👍 Yes, sure thing!', text: 'Yes, sure thing! I will do it.', category: 'affirmation' },
        { id: 'r2', label: '⏱️ Give me 1 minute', text: 'Give me just 1 minute.', category: 'status' },
        { id: 'r3', label: '✅ Done already!', text: "It's done already!", category: 'affirmation' },
        { id: 'r4', label: '🤝 No problem at all', text: 'No problem at all, on it!', category: 'courtesy' },
      ];
    }
    return [
      { id: 'r1', label: '👍 हाँ, ज़रूर कर दूंगा', text: 'हाँ, ज़रूर कर दूंगा', category: 'affirmation' },
      { id: 'r2', label: '⏱️ एक मिनट रुकिए', text: 'एक मिनट रुकिए', category: 'status' },
      { id: 'r3', label: '✅ काम हो गया है', text: 'काम हो गया है!', category: 'affirmation' },
      { id: 'r4', label: '🤝 कोई बात नहीं', text: 'कोई बात नहीं, मैं कर देता हूँ', category: 'courtesy' },
    ];
  }

  private getDefaultReplies(lang: LanguageCode): SmartReplyOption[] {
    if (lang === 'mjl') {
      return [
        { id: 'd1', label: '👍 हौ जी (Roger)', text: 'हौ जी, समझी गया', category: 'affirmation' },
        { id: 'd2', label: '👋 नमस्कार जी!', text: 'नमस्कार जी!', category: 'courtesy' },
        { id: 'd3', label: '❓ केड़ा हाल चाल है?', text: 'केड़ा हाल चाल है?', category: 'question' },
        { id: 'd4', label: '🙏 बड़ा-बड़ा धन्यवाद', text: 'बड़ा-बड़ा धन्यवाद', category: 'courtesy' },
      ];
    }
    if (lang === 'en') {
      return [
        { id: 'd1', label: '👍 Roger that!', text: 'Roger that, copy!', category: 'affirmation' },
        { id: 'd2', label: '👋 Hello there!', text: 'Hello there!', category: 'courtesy' },
        { id: 'd3', label: '❓ How are you?', text: 'How are you?', category: 'question' },
        { id: 'd4', label: '🙏 Thank you', text: 'Thank you very much', category: 'courtesy' },
      ];
    }
    return [
      { id: 'd1', label: '👍 समझ गया (Roger)', text: 'हाँ, समझ गया (Roger)', category: 'affirmation' },
      { id: 'd2', label: '👋 नमस्ते!', text: 'नमस्ते!', category: 'courtesy' },
      { id: 'd3', label: '❓ केड़ा हाल चाल है?', text: 'केड़ा हाल चाल है?', category: 'question' },
      { id: 'd4', label: '🙏 धन्यवाद', text: 'आपका बहुत-बहुत धन्यवाद', category: 'courtesy' },
    ];
  }
}

export const smartReplyService = new SmartReplyService();

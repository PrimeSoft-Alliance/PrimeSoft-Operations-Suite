import natural from 'natural';

export interface ClassificationResult {
  value: string;
  type: 'email' | 'whatsapp_number' | 'telegram_number' | 'telegram_username' | 'name' | 'unknown';
  confidence: number;
}

// Custom contact data classifier using NLP and heuristics
export class ContactClassifier {
  private classifier: any;

  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.trainClassifier();
  }

  private trainClassifier() {
    // Train classifier with contact types
    this.classifier.addDocument('user@example.com', 'email');
    this.classifier.addDocument('admin@business.co', 'email');
    this.classifier.addDocument('support@omni.org', 'email');
    this.classifier.addDocument('contact@domain.com', 'email');
    this.classifier.addDocument('test.user@live.com', 'email');

    // Telegram Usernames
    this.classifier.addDocument('@username_one', 'telegram_username');
    this.classifier.addDocument('@profile_alias', 'telegram_username');
    this.classifier.addDocument('@developer_support', 'telegram_username');
    this.classifier.addDocument('@telegram_rep', 'telegram_username');
    this.classifier.addDocument('@my_business', 'telegram_username');

    // Phone format vectors
    this.classifier.addDocument('+15550199', 'whatsapp_number');
    this.classifier.addDocument('+447890123456', 'whatsapp_number');
    this.classifier.addDocument('08034567890', 'whatsapp_number');
    this.classifier.addDocument('+2349012345678', 'whatsapp_number');

    this.classifier.addDocument('tg_chat_893048', 'telegram_number');
    this.classifier.addDocument('telegram_num_+19028302', 'telegram_number');
    this.classifier.addDocument('+120493849', 'telegram_number');

    // Names
    this.classifier.addDocument('Alice Smith', 'name');
    this.classifier.addDocument('Michael Brown', 'name');
    this.classifier.addDocument('Sarah Jenkins', 'name');
    this.classifier.addDocument('James Wilson', 'name');

    this.classifier.train();
  }

  // Fallback high-performance regex-backed analysis combined with Baysian classification
  public classify(val: string): 'email' | 'whatsapp_number' | 'telegram_number' | 'telegram_username' | 'name' | 'unknown' {
    const clean = val.trim();
    if (!clean) return 'unknown';

    // Regex Rules (Highest confidence)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(clean)) {
      return 'email';
    }

    if (clean.startsWith('@')) {
      return 'telegram_username';
    }

    // Is it a phone number/ID?
    const phoneClean = clean.replace(/\D/g, '');
    if (phoneClean.length >= 7 && phoneClean.length <= 15) {
      // By default, if it's a generic number or starts with typical WhatsApp prefixes,
      // or if it includes any WhatsApp indications, we can classify it.
      // Let's use the Bayes classifier to differentiate if contains contextual hints,
      // otherwise fallback to a default 'whatsapp_number' representation or telegram_number as labeled.
      if (clean.toLowerCase().includes('tg') || clean.toLowerCase().includes('tele')) {
        return 'telegram_number';
      }
      return 'whatsapp_number';
    }

    // Name heuristic (multiple alphabetical words)
    const nameRegex = /^[a-zA-Z]{2,}\s[a-zA-Z]{2,}(\s[a-zA-Z]{2,})?$/;
    if (nameRegex.test(clean)) {
      return 'name';
    }

    // Ask Bayes classifier
    try {
      const result = this.classifier.classify(clean);
      if (result) return result as any;
    } catch (e) {}

    return 'unknown';
  }
}

export const contactClassifier = new ContactClassifier();

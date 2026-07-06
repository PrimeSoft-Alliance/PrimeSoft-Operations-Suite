import nlp from 'compromise';
import natural from 'natural';
// @ts-ignore
import Sentiment from 'sentiment';
import pino from 'pino';

const logger = pino({ name: 'NLPUtils' });
const sentiment = new Sentiment();

export interface NLPAnalysis {
  entities: {
    people: string[];
    places: string[];
    organizations: string[];
    dates: string[];
  };
  sentiment: {
    score: number;
    comparative: number;
    urgency: number;
  };
  keywords: string[];
  summary: string;
}

export class NLPService {
  private tfidf = new natural.TfIdf();

  async analyze(text: string): Promise<NLPAnalysis> {
    const doc = nlp(text) as any;
    
    // Entity Extraction
    const entities = {
      people: doc.people().out('array'),
      places: doc.places().out('array'),
      organizations: doc.organizations().out('array'),
      dates: doc.dates().out('array')
    };

    // Sentiment Analysis
    const sentResult = sentiment.analyze(text);
    
    // Urgency Detection (Custom logic)
    const urgencyWords = ['urgent', 'asap', 'critical', 'immediately', 'emergency', 'now', 'quickly'];
    const urgencyScore = urgencyWords.reduce((acc, word) => {
      return acc + (text.toLowerCase().includes(word) ? 2 : 0);
    }, 0);

    // Keywords (TF-IDF style but simple for single doc)
    const keywords = doc.nouns().out('array').slice(0, 10);

    return {
      entities,
      sentiment: {
        score: sentResult.score,
        comparative: sentResult.comparative,
        urgency: urgencyScore
      },
      keywords,
      summary: doc.sentences(0).text()
    };
  }

  tokenize(text: string): string[] {
    const tokenizer = new natural.WordTokenizer();
    return tokenizer.tokenize(text);
  }

  stem(word: string): string {
    return natural.PorterStemmer.stem(word);
  }
}

export class GuardrailSanitizer {
  // Define strict word-replacement maps
  private static replacementRules: { pattern: RegExp; replacement: string }[] = [
    // 1. Records & Files
    { pattern: /\b(database|databases|system)\b/gi, replacement: 'our office records' },

    // 2. Persona Alignment
    { pattern: /\b(ai|bot|bots|assistant|system bot|soulbot|llm|chatgpt|openai|gemini)\b/gi, replacement: 'OminiRep representative' },

    // 3. Actions
    { pattern: /\b(querying|fetching|processing)\b/gi, replacement: 'searching our catalogs' },

    // 4. Case Management
    { pattern: /\b(ticket|tickets|inquiry)\b/gi, replacement: 'notes for our team' },

    // 5. Escalation
    { pattern: /\btransferring to human agent\b/gi, replacement: 'having one of our managers get in touch with you' }
  ];

  /**
   * Cleans up any accidental LLM leaks before dispatching to Telegram/WhatsApp.
   */
  static sanitizeResponse(rawAiText: string): string {
    if (!rawAiText) return "";

    let sanitizedText = rawAiText;

    // Apply regex replacement rules sequentially
    for (const rule of this.replacementRules) {
      sanitizedText = sanitizedText.replace(rule.pattern, rule.replacement);
    }

    // Secondary pass to clean up accidental double-spaces introduced by replacements
    sanitizedText = sanitizedText.replace(/\s+/g, ' ').trim();

    return sanitizedText;
  }
}

export const nlpService = new NLPService();

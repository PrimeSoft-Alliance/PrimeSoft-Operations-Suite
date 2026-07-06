// AI Utilities - Using Groq with Extended Thinking and Vision
export const AI_MODELS = {
  LITE: 'mixtral-8x7b-32768',
  FLASH: 'mixtral-8x7b-32768',
  // Convenience aliases with thinking capability
  FAST: 'mixtral-8x7b-32768',
  GENERAL: 'mixtral-8x7b-32768',
  COMPLEX: 'mixtral-8x7b-32768',
  // Vision-enabled model for image analysis
  VISION: 'llama-3.2-90b-vision-preview',
};

export const DEFAULT_MODEL = AI_MODELS.LITE;

/**
 * Helper to call AI functions with exponential backoff for rate limits (429)
 */
export async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1500): Promise<T> {
  let delay = initialDelay;
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err.status || (err.response && err.response.status);
      
      // Check for 429 Resource Exhausted or standard rate limits
      const isRateLimit = status === 429 || 
                         (err.message && err.message.includes('429')) || 
                         (err.message && err.message.toLowerCase().includes('quota exceeded')) ||
                         (err.message && err.message.toLowerCase().includes('rate limit'));

      if (isRateLimit && i < maxRetries - 1) {
        console.warn(`[AI RETRY] Rate limit hit (429), retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      throw err;
    }
  }
  throw lastError;
}

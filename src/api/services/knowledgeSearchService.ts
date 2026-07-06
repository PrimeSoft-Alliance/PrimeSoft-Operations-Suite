import { KnowledgeArticle, Product, Settings } from '../models';
import { KnowledgeChunk } from '../dbModels';
import Fuse from 'fuse.js';

export interface SearchResult {
  content: string;
  metadata: any;
  score: number;
  source: 'article' | 'database' | 'product' | 'faq';
}

export const knowledgeSearchService = {
  async search(clientId: string, query: string, limit: number = 5): Promise<SearchResult[]> {
    const normalizedQuery = (query || '').toLowerCase().trim();
    if (!normalizedQuery) return [];

    const [articles, chunks, products, settings] = await Promise.all([
      KnowledgeArticle.find({ clientId }).lean(),
      KnowledgeChunk.find({ clientId }).lean(),
      Product.find({ clientId }).lean(),
      Settings.findOne({ clientId }).lean()
    ]);

    const allDocuments: any[] = [];

    for (const art of articles) {
      allDocuments.push({ 
        id: art._id.toString(), 
        type: 'article', 
        content: art.content,
        title: art.title,
        data: art 
      });
    }
    for (const chunk of chunks) {
      allDocuments.push({ 
        id: chunk._id.toString(), 
        type: 'database', 
        content: chunk.content,
        title: chunk.title || 'Knowledge Chunk',
        data: chunk 
      });
    }
    for (const prod of products) {
      const content = `Product/Service: ${prod.title}\nType: ${prod.type}\nPrice: ${prod.price || 'N/A'}\nDescription: ${prod.description || 'No description'}\nSKU: ${prod.sku || ''}`;
      allDocuments.push({ 
        id: prod._id.toString(), 
        type: 'product', 
        content,
        title: prod.title,
        data: prod 
      });
    }

    if (settings && settings.faqs && settings.faqs.length > 0) {
      for (const faq of settings.faqs) {
        allDocuments.push({
          id: faq._id ? faq._id.toString() : Math.random().toString(),
          type: 'faq',
          content: `Question: ${faq.question}\nAnswer: ${faq.answer}`,
          title: faq.question,
          data: faq
        });
      }
    }

    const fuse = new Fuse(allDocuments, {
      keys: ['title', 'content', 'data.tags'],
      includeScore: true,
      threshold: 0.4
    });

    const results = fuse.search(normalizedQuery);

    return results.slice(0, limit).map(res => ({
      content: res.item.content,
      metadata: res.item.data,
      score: 1 - (res.score || 0),
      source: res.item.type as any
    }));
  }
};

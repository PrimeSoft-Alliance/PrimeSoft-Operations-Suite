import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import { authMiddleware } from '../auth';
import { Visit, Booking, Lead, Contact, AILog, Settings, Client } from '../models';
import { getGroqClient, DEFAULT_MODEL } from '../utils/ai';

const router = express.Router();

// Get detailed analytics
router.get('/', authMiddleware, async (req: any, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = req.clientId || (req.user && req.user.clientId);
    
    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'Client identification failed');
    }
    
    // Traffic Stats
    const totalVisits = await Visit.countDocuments({ clientId });
    const uniqueVisitors = (await Visit.distinct('sessionId', { clientId })).length;
    
    // Bot Interaction Rate
    const botInteractions = await Visit.countDocuments({ clientId, interactedWithBot: true });
    
    // Country Breakdown
    const countries = await Visit.aggregate([
      { $match: { clientId } },
      { $group: { _id: "$location.country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Page Views Breakdown
    const pageViews = await Visit.aggregate([
      { $match: { clientId } },
      { $group: { _id: "$route", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Conversion Data (Real)
    const [bookings, leads, contacts] = await Promise.all([
      Booking.countDocuments({ clientId }),
      Lead.countDocuments({ clientId }),
      Contact.countDocuments({ clientId })
    ]);

    const stats = {
      traffic: {
        totalVisits,
        uniqueVisitors,
        botInteractions,
        interactionRate: totalVisits > 0 ? (botInteractions / totalVisits) * 100 : 0
      },
      geo: countries.map(c => ({ name: c._id || 'Unknown', value: c.count })),
      pages: pageViews.map(p => ({ name: p._id || '/', views: p.count })),
      conversions: {
        bookings,
        leads,
        contacts,
        total: bookings + leads + contacts
      }
    };

    envRes.sendSuccess(stats);
  } catch (err: any) {
    console.error('[ANALYTICS_ERROR]', err);
    envRes.sendError(500, 'API_ERROR', 'Analytics fetch failed: ' + err.message);
  }
});

// AI Data Reasoning
router.post('/analyze', authMiddleware, async (req: any, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = req.clientId || (req.user && req.user.clientId);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Client identification failed');
    
    const { stats } = req.body;
    if (!stats) return envRes.sendError(400, 'BAD_REQUEST', 'Stats data is required for analysis');
    
    const groq = getGroqClient();
    
    const prompt = `
      As an expert Business Data Analyst, analyze the following real-time performance metrics for a business and provide 3-4 highly strategic, actionable insights for growth.
      
      METRICS:
      - Total Traffic: ${stats.traffic.totalVisits} visits
      - Unique Visitors: ${stats.traffic.uniqueVisitors}
      - Bot Interaction Rate: ${stats.traffic.interactionRate.toFixed(2)}%
      - Conversions (Bookings/Leads): ${stats.conversions.total}
      - Top Countries: ${stats.geo.map((g: any) => g.name).join(', ')}
      - Top Pages: ${stats.pages.map((p: any) => p.name).join(', ')}
      
      Format the output in clean Markdown. Be specific and data-driven. Focus on how to improve the bot interaction and conversion rates.
    `.trim();

    const response = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'You are an elite Business Intelligence AI agents specializing in growth hacking and conversion optimization.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });

    envRes.sendSuccess({ insight: response.choices[0]?.message?.content || 'No insights generated.' });
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'AI analysis failed: ' + err.message);
  }
});

export default router;

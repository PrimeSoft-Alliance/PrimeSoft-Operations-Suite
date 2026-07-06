import { Lead, UnifiedMessage, Ticket, Booking, Inquiry } from '../models';
import pino from 'pino';

const logger = pino({ name: 'AnalyticsService' });

export class AnalyticsService {
  async getDashboardSummary(clientId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      activeLeads,
      messagesToday,
      openTickets,
      upcomingBookings,
      newInquiries
    ] = await Promise.all([
      Lead.countDocuments({ clientId, stage: { $ne: 'qualified' } }),
      UnifiedMessage.countDocuments({ clientId, createdAt: { $gte: today } }),
      Ticket.countDocuments({ clientId, status: 'open' }),
      Booking.countDocuments({ clientId, startTime: { $gte: today } }),
      Inquiry.countDocuments({ clientId, status: 'new' })
    ]);

    // Conversion pipeline aggregate
    const pipeline = await Lead.aggregate([
      { $match: { clientId } },
      { $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' }
      }}
    ]);

    return {
      overview: {
        activeLeads,
        messagesToday,
        openTickets,
        upcomingBookings,
        newInquiries
      },
      pipeline: pipeline.map(p => ({
        stage: p._id,
        count: p.count,
        value: p.totalValue
      }))
    };
  }

  async getGrowthMetrics(clientId: string) {
    // 30 day rolling window
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metrics = await UnifiedMessage.aggregate([
      { $match: { 
          clientId, 
          createdAt: { $gte: thirtyDaysAgo } 
      }},
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    return metrics;
  }
}

export const analyticsService = new AnalyticsService();

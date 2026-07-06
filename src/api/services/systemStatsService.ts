import si from 'systeminformation';
import mongoose from 'mongoose';
import { Conversation, TelegramSession, Inquiry, Ticket, Lead, UnifiedMessage, UsageStats, Client } from '../models';
import { redisService } from './redisService';

export class SystemStatsService {
  async getLiveMetrics(clientId: string) {
    const cacheKey = `metrics:${clientId}`;
    try {
      const cached = await redisService.getCache<any>(cacheKey);
      if (cached) return cached;

      const [cpu, mem, disk] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize()
      ]);

      // MongoDB Stats
      const dbStats = await mongoose.connection.db?.stats();
      
      // Tenant Stats
      const [
        client,
        activeTelegram,
        activeEmails,
        totalLeads,
        totalTickets,
        totalInquiries,
        messageVolume,
        apiUsage
      ] = await Promise.all([
        Client.findOne({ clientId }),
        TelegramSession.countDocuments({ tenantId: clientId, status: 'connected' }),
        Inquiry.countDocuments({ clientId, status: { $ne: 'closed' } }),
        Lead.countDocuments({ clientId }),
        Ticket.countDocuments({ clientId, status: { $ne: 'closed' } }),
        Inquiry.countDocuments({ clientId }),
        UnifiedMessage.countDocuments({ clientId, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
        UsageStats.findOne({ clientId, month: new Date().toISOString().slice(0, 7) })
      ]);

      const metrics = {
        system: {
          cpu: Math.round(cpu.currentLoad),
          ram: Math.round((mem.active / mem.total) * 100),
          disk: Math.round((disk[0]?.use || 0)),
          dbSize: (dbStats?.dataSize || 0) / 1024 / 1024 // MB
        },
        tenant: {
          activeWhatsApp: client?.whatsappPhoneNumberId ? 1 : 0,
          activeTelegram,
          activeEmails,
          totalLeads,
          totalTickets,
          totalInquiries,
          dailyMessageVolume: messageVolume,
          aiMessagesUsed: apiUsage?.aiMessagesUsed || 0,
          storageBytesUsed: apiUsage?.storageBytesUsed || 0
        }
      };

      // Cache for 4 seconds (slightly below the 5s broadcast interval)
      await redisService.setCache(cacheKey, metrics, 4);
      
      return metrics;
    } catch (err) {
      console.error('[SystemStatsService] Error fetching metrics:', err);
      return null;
    }
  }
}

export const systemStatsService = new SystemStatsService();

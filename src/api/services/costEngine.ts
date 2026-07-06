import { UsageEvent, BillingLedger } from '../models';
import pino from 'pino';

const logger = pino({ name: 'CostEngine' });

export interface UsageRecord {
  clientId: string;
  eventType: 'voice_minute' | 'sms_outbound' | 'wa_template' | 'stt_char' | 'tts_char' | 'number_rental';
  units: number;
  referenceId?: string;
  metadata?: any;
}

const PRICING: Record<string, number> = {
  voice_minute: 0.015,
  sms_outbound: 0.007,
  wa_template: 0.05,
  stt_char: 0.0001,
  tts_char: 0.0002,
  number_rental: 1.00
};

export class CostEngine {
  async trackUsage(record: UsageRecord) {
    const unitCost = PRICING[record.eventType] || 0;
    const totalCost = unitCost * record.units;

    try {
      await UsageEvent.create({
        clientId: record.clientId,
        eventType: record.eventType,
        units: record.units,
        unitCost,
        totalCost,
        referenceId: record.referenceId,
        metadata: record.metadata
      });

      // Deduct from billing ledger
      await BillingLedger.create({
        clientId: record.clientId,
        amount: -totalCost,
        type: 'debit',
        description: `Usage: ${record.eventType} (${record.units} units)`
      });

      logger.info({ clientId: record.clientId, event: record.eventType, cost: totalCost }, 'Usage tracked');
    } catch (err) {
      logger.error({ err, record }, 'Failed to track usage');
    }
  }

  async getBalance(clientId: string): Promise<number> {
    const ledger = await BillingLedger.aggregate([
      { $match: { clientId } },
      { $group: { _id: null, balance: { $sum: '$amount' } } }
    ]);
    return ledger[0]?.balance || 0;
  }
}

export const costEngine = new CostEngine();

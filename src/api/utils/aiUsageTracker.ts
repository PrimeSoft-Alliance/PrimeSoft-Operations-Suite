import { AIUsageLog, Quota } from '../models';

export interface AIUsageEvent {
  clientId: string;
  feature: string;
  source: string;
  platform?: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  promptText?: string;
  responseLength?: number;
  ipAddress?: string;
  userEmail?: string;
  metadata?: any;
}

/**
 * Record AI usage for a client across any platform or integration
 */
export async function recordAIUsage(event: AIUsageEvent): Promise<void> {
  if (!event.clientId) {
    console.error('[USAGE-TRACKER] Missing clientId for usage tracking');
    return;
  }

  try {
    // Create usage log entry
    await AIUsageLog.create({
      clientId: event.clientId,
      feature: event.feature,
      source: event.source,
      platform: event.platform || 'web',
      tokensUsed: event.tokensUsed || 1,
      inputTokens: event.inputTokens || 0,
      outputTokens: event.outputTokens || 0,
      promptText: event.promptText ? event.promptText.substring(0, 500) : undefined,
      responseLength: event.responseLength || 0,
      ipAddress: event.ipAddress,
      userEmail: event.userEmail,
      metadata: event.metadata
    });

    // Update quota usage
    const quota = await Quota.findOne({ clientId: event.clientId });
    if (quota) {
      quota.aiTokensUsed = (quota.aiTokensUsed || 0) + (event.tokensUsed || 1);
      
      // Check if exceeded
      if (quota.aiTokensLimit > 0 && quota.aiTokensUsed > quota.aiTokensLimit) {
        quota.status = 'exceeded';
      }
      
      await quota.save();
      console.log(`[USAGE-TRACKER] Recorded ${event.tokensUsed || 1} tokens for ${event.clientId} (${event.feature})`);
    }
  } catch (err) {
    console.error('[USAGE-TRACKER] Error recording usage:', err);
  }
}

/**
 * Check if client has quota available for AI usage
 */
export async function checkAIQuota(clientId: string, tokensRequired: number = 1): Promise<{ allowed: boolean; remainingTokens: number; message?: string }> {
  if (!clientId) {
    return { allowed: false, remainingTokens: 0, message: 'Missing clientId' };
  }

  try {
    const quota = await Quota.findOne({ clientId });
    
    if (!quota) {
      return { allowed: false, remainingTokens: 0, message: 'Quota not found for client' };
    }

    // Check if quota is paused or exceeded
    if (quota.status === 'paused') {
      return { allowed: false, remainingTokens: 0, message: 'Quota is paused by admin' };
    }

    // Enterprise tier has unlimited tokens
    if (quota.tier === 'enterprise' || quota.aiTokensLimit === 0) {
      return { allowed: true, remainingTokens: Infinity };
    }

    const remaining = quota.aiTokensLimit - quota.aiTokensUsed;
    
    if (remaining < tokensRequired) {
      return {
        allowed: false,
        remainingTokens: Math.max(0, remaining),
        message: `Insufficient quota. Required: ${tokensRequired}, Available: ${Math.max(0, remaining)}`
      };
    }

    return { allowed: true, remainingTokens: remaining - tokensRequired };
  } catch (err) {
    console.error('[USAGE-TRACKER] Error checking quota:', err);
    return { allowed: false, remainingTokens: 0, message: 'Error checking quota' };
  }
}

/**
 * Get usage statistics for a client
 */
export async function getClientUsageStats(clientId: string) {
  if (!clientId) {
    return null;
  }

  try {
    const quota = await Quota.findOne({ clientId });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const monthlyUsage = await AIUsageLog.aggregate([
      {
        $match: {
          clientId,
          createdAt: { $gte: thisMonth },
          status: 'success'
        }
      },
      {
        $group: {
          _id: '$feature',
          count: { $sum: 1 },
          tokens: { $sum: '$tokensUsed' }
        }
      }
    ]);

    const dailyUsage = await AIUsageLog.countDocuments({
      clientId,
      createdAt: { $gte: today },
      status: 'success'
    });

    return {
      tier: quota?.tier || 'starter',
      quotaLimit: quota?.aiTokensLimit || 0,
      quotaUsed: quota?.aiTokensUsed || 0,
      quotaRemaining: Math.max(0, (quota?.aiTokensLimit || 0) - (quota?.aiTokensUsed || 0)),
      monthlyUsage,
      dailyUsage,
      status: quota?.status || 'active',
      lastReset: quota?.quotaResetDate
    };
  } catch (err) {
    console.error('[USAGE-TRACKER] Error getting usage stats:', err);
    return null;
  }
}

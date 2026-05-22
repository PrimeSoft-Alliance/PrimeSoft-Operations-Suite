import { Quota, AIUsageLog, TierDefinition, Client } from '../models';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remainingTokens?: number;
  remainingMessages?: number;
  resetDate?: Date;
}

/**
 * Check if a client can perform an AI action based on their quota
 */
export async function checkAIQuota(
  clientId: string,
  tokensNeeded: number = 1,
  feature: 'chat' | 'branding' | 'form' | 'website' = 'chat'
): Promise<QuotaCheckResult> {
  try {
    // Get client quota
    const quota = await Quota.findOne({ clientId });
    if (!quota) {
      console.warn('[QUOTA] No quota found for client:', clientId);
      return { allowed: false, reason: 'Client quota not configured' };
    }

    // Check if quota is active
    if (quota.status === 'exceeded') {
      return {
        allowed: false,
        reason: 'Monthly quota exceeded',
        remainingTokens: Math.max(0, quota.aiTokensLimit - quota.aiTokensUsed),
        resetDate: quota.quotaResetDate
      };
    }

    // Check if monthly quota has reset
    const now = new Date();
    if (now > quota.quotaResetDate) {
      // Reset quotas
      quota.aiTokensUsed = 0;
      quota.chatMessagesUsed = 0;
      quota.storageUsed = 0;
      quota.quotaResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await quota.save();
    }

    // Check AI token quota
    if (quota.aiTokensUsed + tokensNeeded > quota.aiTokensLimit) {
      quota.status = 'exceeded';
      await quota.save();
      return {
        allowed: false,
        reason: `AI token quota exceeded. Used ${quota.aiTokensUsed}/${quota.aiTokensLimit}`,
        remainingTokens: 0,
        resetDate: quota.quotaResetDate
      };
    }

    // Check feature access based on tier
    const tierDef = await getTierDefinition(quota.tier);
    if (!tierDef) {
      return { allowed: false, reason: 'Invalid tier configuration' };
    }

    // Feature-specific checks
    if (feature === 'chat' && !tierDef.features.webChat) {
      return { allowed: false, reason: 'Chat not available in your tier' };
    }

    return {
      allowed: true,
      remainingTokens: quota.aiTokensLimit - quota.aiTokensUsed,
      remainingMessages: quota.chatMessagesLimit - quota.chatMessagesUsed,
      resetDate: quota.quotaResetDate
    };
  } catch (err) {
    console.error('[QUOTA] Error checking quota:', err);
    return { allowed: false, reason: 'Error checking quota' };
  }
}

/**
 * Record AI usage after successful execution
 */
export async function recordAIUsage(
  clientId: string,
  feature: string,
  source: string,
  tokensUsed: number = 1,
  metadata?: any
): Promise<void> {
  try {
    // Update quota
    const quota = await Quota.findOne({ clientId });
    if (quota) {
      quota.aiTokensUsed += tokensUsed;
      if (feature === 'chat') {
        quota.chatMessagesUsed += 1;
      }
      await quota.save();
    }

    // Log usage for analytics
    await AIUsageLog.create({
      clientId,
      feature,
      source,
      tokensUsed,
      status: 'success',
      metadata
    });

    console.log(`[USAGE] Recorded ${tokensUsed} tokens for client ${clientId} (${feature})`);
  } catch (err) {
    console.error('[USAGE] Error recording AI usage:', err);
  }
}

/**
 * Get quota information for a client
 */
export async function getClientQuota(clientId: string) {
  try {
    const quota = await Quota.findOne({ clientId });
    if (!quota) {
      return null;
    }

    const tier = await getTierDefinition(quota.tier);
    return {
      ...quota.toObject(),
      tierDefinition: tier
    };
  } catch (err) {
    console.error('[QUOTA] Error getting client quota:', err);
    return null;
  }
}

/**
 * Get tier definition
 */
export async function getTierDefinition(tierName: string) {
  try {
    return await TierDefinition.findOne({ name: tierName });
  } catch (err) {
    console.error('[TIER] Error getting tier definition:', err);
    return null;
  }
}

/**
 * Assign tier to a client (used during onboarding)
 */
export async function assignTierToClient(clientId: string, tierName: string): Promise<boolean> {
  try {
    const tier = await getTierDefinition(tierName);
    if (!tier) {
      console.error('[TIER] Invalid tier:', tierName);
      return false;
    }

    // Update client tier
    await Client.updateOne(
      { clientId },
      { $set: { tier: tierName } }
    );

    // Create or update quota
    await Quota.updateOne(
      { clientId },
      {
        $set: {
          tier: tierName,
          aiTokensLimit: tier.limits.aiTokensPerMonth,
          aiTokensUsed: 0,
          chatMessagesLimit: tier.limits.chatMessagesPerMonth,
          chatMessagesUsed: 0,
          storageLimit: tier.limits.storageGB * 1024 * 1024 * 1024,
          storageUsed: 0,
          enabledFeatures: tier.features,
          status: 'active'
        }
      },
      { upsert: true }
    );

    console.log(`[TIER] Assigned tier ${tierName} to client ${clientId}`);
    return true;
  } catch (err) {
    console.error('[TIER] Error assigning tier:', err);
    return false;
  }
}

/**
 * Initialize default tier definitions if they don't exist
 */
export async function initializeTierDefinitions(): Promise<void> {
  try {
    const existingTiers = await TierDefinition.countDocuments();
    if (existingTiers > 0) {
      return; // Already initialized
    }

    const tiers = [
      {
        name: 'starter',
        displayName: 'Starter Plan',
        description: 'Perfect for small businesses getting started',
        monthlyPrice: 0,
        features: {
          webChat: true,
          telegram: false,
          whatsapp: false,
          aiAssistant: true,
          customBranding: true
        },
        limits: {
          aiTokensPerMonth: 10000,
          chatMessagesPerMonth: 1000,
          storageGB: 1
        }
      },
      {
        name: 'professional',
        displayName: 'Professional Plan',
        description: 'For growing businesses with higher demands',
        monthlyPrice: 29,
        features: {
          webChat: true,
          telegram: true,
          whatsapp: false,
          aiAssistant: true,
          customBranding: true
        },
        limits: {
          aiTokensPerMonth: 100000,
          chatMessagesPerMonth: 10000,
          storageGB: 10
        }
      },
      {
        name: 'enterprise',
        displayName: 'Enterprise Plan',
        description: 'Unlimited for large-scale operations',
        monthlyPrice: 99,
        features: {
          webChat: true,
          telegram: true,
          whatsapp: true,
          aiAssistant: true,
          customBranding: true
        },
        limits: {
          aiTokensPerMonth: 1000000,
          chatMessagesPerMonth: 100000,
          storageGB: 100
        }
      }
    ];

    await TierDefinition.insertMany(tiers);
    console.log('[TIER] Initialized tier definitions');
  } catch (err) {
    console.error('[TIER] Error initializing tier definitions:', err);
  }
}

import { TierDefinition, Quota, Client } from '../models';

const TIER_DEFINITIONS = {
  starter: {
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
  professional: {
    displayName: 'Professional Plan',
    description: 'For growing businesses with advanced needs',
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
  enterprise: {
    displayName: 'Enterprise Plan',
    description: 'Unlimited features for large organizations',
    monthlyPrice: 99,
    features: {
      webChat: true,
      telegram: true,
      whatsapp: true,
      aiAssistant: true,
      customBranding: true
    },
    limits: {
      aiTokensPerMonth: 0, // unlimited
      chatMessagesPerMonth: 0, // unlimited
      storageGB: 1000 // 1TB
    }
  }
};

/**
 * Initialize tier definitions in database
 */
export async function initializeTierDefinitions(): Promise<void> {
  try {
    for (const [tierName, tierConfig] of Object.entries(TIER_DEFINITIONS)) {
      const existing = await TierDefinition.findOne({ name: tierName });
      if (!existing) {
        await TierDefinition.create({
          name: tierName,
          displayName: tierConfig.displayName,
          description: tierConfig.description,
          monthlyPrice: tierConfig.monthlyPrice,
          features: tierConfig.features,
          limits: tierConfig.limits
        });
        console.log(`[TIER] Created tier definition: ${tierName}`);
      }
    }
  } catch (err) {
    console.error('[TIER] Error initializing tier definitions:', err);
  }
}

/**
 * Assign tier to a client and set quotas accordingly
 */
export async function assignTierToClient(clientId: string, tierName: string = 'starter'): Promise<boolean> {
  if (!clientId || !tierName) {
    console.error('[TIER] Invalid clientId or tierName');
    return false;
  }

  try {
    const tierDef = await TierDefinition.findOne({ name: tierName });
    if (!tierDef) {
      console.warn(`[TIER] Tier definition not found: ${tierName}`);
      return false;
    }

    // Check if quota already exists
    let quota = await Quota.findOne({ clientId });
    
    if (!quota) {
      // Create new quota
      quota = await Quota.create({
        clientId,
        tier: tierName,
        aiTokensLimit: tierDef.limits.aiTokensPerMonth,
        chatMessagesLimit: tierDef.limits.chatMessagesPerMonth,
        storageLimit: tierDef.limits.storageGB * 1073741824, // Convert GB to bytes
        enabledFeatures: tierDef.features,
        status: 'active'
      });
      console.log(`[TIER] Created quota for ${clientId} with tier: ${tierName}`);
    } else {
      // Update existing quota
      quota.tier = tierName;
      quota.aiTokensLimit = tierDef.limits.aiTokensPerMonth;
      quota.chatMessagesLimit = tierDef.limits.chatMessagesPerMonth;
      quota.storageLimit = tierDef.limits.storageGB * 1073741824;
      quota.enabledFeatures = tierDef.features;
      quota.status = 'active';
      quota.aiTokensUsed = 0; // Reset usage on tier change
      quota.chatMessagesUsed = 0;
      quota.storageUsed = 0;
      await quota.save();
      console.log(`[TIER] Updated quota for ${clientId} to tier: ${tierName}`);
    }

    // Update client tier field if it exists
    try {
      await Client.updateOne({ clientId }, { tier: tierName });
    } catch (e) {
      // Client model might not have tier field, that's okay
    }

    return true;
  } catch (err) {
    console.error('[TIER] Error assigning tier:', err);
    return false;
  }
}

/**
 * Get all tier definitions for display
 */
export async function getAllTierDefinitions() {
  try {
    const tiers = await TierDefinition.find().sort({ monthlyPrice: 1 });
    return tiers;
  } catch (err) {
    console.error('[TIER] Error fetching tier definitions:', err);
    return [];
  }
}

/**
 * Get a specific tier definition
 */
export async function getTierDefinition(tierName: string) {
  try {
    return await TierDefinition.findOne({ name: tierName });
  } catch (err) {
    console.error('[TIER] Error fetching tier:', err);
    return null;
  }
}

/**
 * Get current tier for a client
 */
export async function getClientTier(clientId: string) {
  try {
    const quota = await Quota.findOne({ clientId });
    return quota?.tier || 'starter';
  } catch (err) {
    console.error('[TIER] Error getting client tier:', err);
    return 'starter';
  }
}

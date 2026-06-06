import { Client, Quota, TierDefinition, AIUsageLog } from '../models';

export async function initializeTierDefinitions() {
  const tiers = [
    {
      name: 'starter',
      displayName: 'STARTER',
      monthlyPrice: 0,
      limits: { aiTokensPerMonth: 10000, chatMessagesPerMonth: 1000, storageGB: 1 },
      features: { webChat: true, telegram: false, whatsapp: false, aiAssistant: true }
    },
    {
      name: 'professional',
      displayName: 'PROFESSIONAL',
      monthlyPrice: 29,
      limits: { aiTokensPerMonth: 100000, chatMessagesPerMonth: 10000, storageGB: 10 },
      features: { webChat: true, telegram: true, whatsapp: false, aiAssistant: true }
    },
    {
      name: 'enterprise',
      displayName: 'ENTERPRISE',
      monthlyPrice: 99,
      limits: { aiTokensPerMonth: 1000000, chatMessagesPerMonth: 100000, storageGB: 100 },
      features: { webChat: true, telegram: true, whatsapp: true, aiAssistant: true }
    }
  ];

  for (const t of tiers) {
    await TierDefinition.findOneAndUpdate({ name: t.name }, t, { upsert: true, new: true });
  }
}

export async function getTierDefinition(tierName: string) {
  return await TierDefinition.findOne({ name: tierName });
}

export async function assignTierToClient(clientId: string, tierName: string) {
  const tierDef = await getTierDefinition(tierName);
  if (!tierDef) throw new Error(`Tier ${tierName} not found`);

  await Client.findOneAndUpdate({ clientId }, { tier: tierName });

  const resetDate = new Date();
  resetDate.setMonth(resetDate.getMonth() + 1);
  resetDate.setDate(1);
  resetDate.setHours(0, 0, 0, 0);

  const quota = await Quota.findOneAndUpdate(
    { clientId },
    {
      tier: tierName,
      aiTokensLimit: tierDef.limits.aiTokensPerMonth,
      chatMessagesLimit: tierDef.limits.chatMessagesPerMonth,
      storageLimit: tierDef.limits.storageGB,
      enabledFeatures: tierDef.features,
      quotaResetDate: resetDate,
      status: 'active'
    },
    { upsert: true, new: true }
  );
  return quota;
}

export async function getClientQuota(clientId: string) {
  return await Quota.findOne({ clientId });
}

export async function checkAIQuota(clientId: string, tokensNeeded: number, feature: string) {
  let quota = await Quota.findOne({ clientId });
  if (!quota) {
    return { allowed: false, reason: 'No quota found' };
  }

  // Monthly reset check
  if (quota.quotaResetDate && new Date() > quota.quotaResetDate) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);

    quota.aiTokensUsed = 0;
    quota.chatMessagesUsed = 0;
    quota.storageUsed = 0;
    quota.quotaResetDate = nextReset;
    quota.status = 'active';
    await quota.save();
  }

  if (quota.status === 'exceeded' || quota.status === 'paused') {
    return { allowed: false, reason: `Quota is ${quota.status}` };
  }

  if (quota.aiTokensUsed + tokensNeeded > quota.aiTokensLimit) {
    quota.status = 'exceeded';
    await quota.save();
    return { allowed: false, reason: 'AI token limit exceeded' };
  }

  return { allowed: true, quota };
}

export async function recordAIUsage(clientId: string, feature: string, source: string, platform: string, tokensUsed: number, metadata: any = {}) {
  const log = new AIUsageLog({
    clientId, feature, source, platform, tokensUsed, status: 'success', metadata
  });
  await log.save();

  await Quota.findOneAndUpdate(
    { clientId },
    { $inc: { aiTokensUsed: tokensUsed } }
  );
}

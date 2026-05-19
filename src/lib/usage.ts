import { UsageStats, AILog } from '../api/models';

export async function incrementAiUsage(clientId: string, sessionId: string = 'system', role: string = 'assistant', content: string = 'AI Activity') {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });
    if (!usage) {
      usage = await UsageStats.create({ clientId, month: currentMonth });
    }
    
    usage.aiMessagesUsed += 1;
    await usage.save();

    await AILog.create({
      clientId,
      sessionId,
      role,
      content
    });
}

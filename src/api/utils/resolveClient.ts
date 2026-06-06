import { Request } from 'express';
import { Client, Domain, PlatformSettings } from '../models';

async function validateClientIdExists(clientId: string): Promise<boolean> {
  try {
    const client = await Client.findOne({ clientId });
    return !!client;
  } catch (e) {
    return false;
  }
}

export async function resolveClientId(req: Request): Promise<string | null> {
  const host = (req.headers.host || '').split(':')[0].trim();
  const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.headers['x-api-token'];
  let headerId = req.headers['x-client-id'];
  let queryId = req.query.clientId;
  let bodyId = req.body?.clientId;

  if (typeof headerId === 'object' && headerId !== null && 'clientId' in headerId) headerId = (headerId as any).clientId;
  if (typeof queryId === 'object' && queryId !== null && 'clientId' in queryId) queryId = (queryId as any).clientId;
  if (typeof bodyId === 'object' && bodyId !== null && 'clientId' in bodyId) bodyId = (bodyId as any).clientId;

  // 1. Resolve via API Key
  if (apiKey) {
    try {
      const client = await Client.findOne({ apiKey });
      if (client) return client.clientId;
    } catch (e) {
      console.error('[RESOLVE] API Key resolution error:', e);
    }
  }

  // 2. Resolve via direct IDs with Validation
  const cid = headerId || queryId || bodyId;
  const rawId = String(cid);
  if (cid && cid !== 'undefined' && cid !== 'null' && cid !== '') {
    const isValid = await validateClientIdExists(rawId);
    if (isValid) return rawId;
    else console.warn('[RESOLVE] Direct ID validation failed:', cid);
  }

  // 3. Resolve via Domain Mapping
  try {
    const domainMapping = await Domain.findOne({ host, status: 'active' });
    if (domainMapping) return domainMapping.clientId;

    const customClient = await Client.findOne({ customDomain: host });
    if (customClient) return customClient.clientId;
  } catch (e) {
    console.error('[RESOLVE] Domain resolution error:', e);
  }

  // 4. Default for Platform Domains
  const isPlatform = 
    host.includes('run.app') || 
    host.includes('aistudio') || 
    host.includes('localhost') || 
    host === '0.0.0.0' || 
    host === '127.0.0.1' ||
    host.includes('googleusercontent.com') ||
    host.includes('onrender.com') ||
    host.includes('vercel.app') ||
    host.includes('railway.app') ||
    host.includes('fly.dev');

  if (isPlatform) {
    try {
      const pSettings = await PlatformSettings.findOne();
      const homepageId = pSettings?.homepageClientId || 'platform-prime';
      if (await validateClientIdExists(homepageId)) return homepageId;
    } catch (e) {}
  }

  return null;
}

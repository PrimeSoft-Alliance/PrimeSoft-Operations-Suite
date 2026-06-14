import { Request } from 'express';
import { Client, Domain, PlatformSettings } from '../models';

async function validateClientIdExists(clientId: string): Promise<boolean> {
  if (clientId === 'platform-prime') return true;
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
  const extractString = (val: any): string | undefined => {
    if (!val) return undefined;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (val !== null && 'clientId' in val && typeof val.clientId === 'string') return val.clientId;
      // If it's an array, take the first item
      if (Array.isArray(val) && val.length > 0) return extractString(val[0]);
    }
    return undefined;
  };

  const headerId = extractString(req.headers['x-client-id']);
  const queryId = extractString(req.query.clientId);
  const bodyId = extractString(req.body?.clientId);

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
  if (cid && cid !== 'undefined' && cid !== 'null' && cid !== '' && cid !== '[object Object]') {
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
    } catch (e) {
      console.error('[RESOLVE] Platform fallback error:', e);
    }
  }

  return null;
}

import { Request } from 'express';
import { Client, Domain, PlatformSettings } from '../models';

// Whitelist of valid platform domains that should default to platform-prime
const PLATFORM_DOMAINS = [
  'run.app',
  'aistudio',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'googleusercontent.com'
];

// Validate that a clientId exists in the database
async function validateClientIdExists(clientId: string): Promise<boolean> {
  try {
    const client = await Client.findOne({ clientId });
    return !!client;
  } catch (e) {
    console.error('[VALIDATE] Error checking clientId:', clientId, e);
    return false;
  }
}

export async function resolveClientId(req: Request): Promise<string | null> {
  const host = (req.headers.host || '').split(':')[0].trim(); // Remove port
  const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.headers['x-api-token'];
  let headerId = req.headers['x-client-id'];
  let queryId = req.query.clientId;
  let bodyId = req.body?.clientId;

  // Flatten nested IDs (sometimes happens with certain libraries)
  if (typeof headerId === 'object' && headerId !== null && 'clientId' in headerId) headerId = (headerId as any).clientId;
  if (typeof queryId === 'object' && queryId !== null && 'clientId' in queryId) queryId = (queryId as any).clientId;
  if (typeof bodyId === 'object' && bodyId !== null && 'clientId' in bodyId) bodyId = (bodyId as any).clientId;

  // Priority 1: Resolve via API Key (highest security)
  if (apiKey && typeof apiKey === 'string') {
    try {
      const client = await Client.findOne({ apiKey });
      if (client) {
        console.log('[RESOLVE] API Key resolved to clientId:', client.clientId);
        return client.clientId;
      }
    } catch (e) {
      console.error('[RESOLVE] API Key resolution error:', e);
    }
  }

  // Priority 2: Direct client ID from header/query/body (with validation)
  const cid = headerId || queryId || bodyId;
  if (cid && typeof cid === 'string' && cid !== 'undefined' && cid !== 'null' && cid !== '') {
    const isValid = await validateClientIdExists(cid);
    if (isValid) {
      console.log('[RESOLVE] Direct ID resolved to clientId:', cid);
      return cid;
    } else {
      console.warn('[RESOLVE] Direct ID validation failed for:', cid);
    }
  }

  // Priority 3: Resolve via Domain Mapping (custom domains)
  try {
    const domainMapping = await Domain.findOne({ host, status: 'active' });
    if (domainMapping) {
      console.log('[RESOLVE] Domain mapping resolved to clientId:', domainMapping.clientId);
      return domainMapping.clientId;
    }

    const customClient = await Client.findOne({ customDomain: host });
    if (customClient) {
      console.log('[RESOLVE] Custom domain resolved to clientId:', customClient.clientId);
      return customClient.clientId;
    }
  } catch (e) {
    console.error('[RESOLVE] Domain resolution error:', e);
  }

  // Priority 4: Default for Platform Domains only
  const isPlatform = PLATFORM_DOMAINS.some(domain => host.includes(domain));

  if (isPlatform) {
    try {
      const pSettings = await PlatformSettings.findOne();
      const defaultId = pSettings?.homepageClientId || 'platform-prime';
      console.log('[RESOLVE] Platform domain resolved to clientId:', defaultId);
      return defaultId;
    } catch (e) {
      console.log('[RESOLVE] Using fallback platform-prime for:', host);
      return 'platform-prime';
    }
  }

  // No resolution found
  console.warn('[RESOLVE] Failed to resolve clientId for host:', host);
  return null;
}

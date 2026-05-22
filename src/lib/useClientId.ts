import { useEffect, useState } from 'react';

/**
 * Hook to resolve the tenant clientId on the frontend
 * 
 * Priority order:
 * 1. URL query parameter (?clientId=xxx)
 * 2. localStorage (if previously resolved)
 * 3. Platform domain default (platform-prime)
 * 4. API resolution for custom domains
 */
export function useClientId() {
  const [clientId, setClientId] = useState<string>('');
  const [isResolved, setIsResolved] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const resolveClientId = async () => {
      try {
        // Priority 1: URL query parameter
        const params = new URLSearchParams(window.location.search);
        const urlClientId = params.get('clientId');
        
        if (urlClientId) {
          console.log('[useClientId] Resolved from URL:', urlClientId);
          setClientId(urlClientId);
          localStorage.setItem('ps_client_id', urlClientId);
          setIsResolved(true);
          return;
        }

        // Priority 2: Check localStorage
        const storedClientId = localStorage.getItem('ps_client_id');
        const hostname = window.location.hostname;
        
        const isPlatformDomain = 
          hostname.includes('run.app') || 
          hostname.includes('localhost') || 
          hostname === '0.0.0.0' ||
          hostname === '127.0.0.1';

        // Priority 3: Use platform default for platform domains
        if (isPlatformDomain) {
          if (storedClientId) {
            console.log('[useClientId] Using stored ID for platform domain:', storedClientId);
            setClientId(storedClientId);
          } else {
            console.log('[useClientId] Using platform-prime default');
            setClientId('platform-prime');
          }
          setIsResolved(true);
          return;
        }

        // Priority 4: Try API resolution for custom domains
        console.log('[useClientId] Attempting API resolution for domain:', hostname);
        const response = await fetch(`/v1/public/tenant/resolve?host=${hostname}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.data?.clientId) {
            const resolvedId = data.data.clientId;
            console.log('[useClientId] Resolved from API:', resolvedId);
            setClientId(resolvedId);
            localStorage.setItem('ps_client_id', resolvedId);
            setIsResolved(true);
            return;
          }
        }

        // Fallback: use stored ID or error
        if (storedClientId) {
          console.warn('[useClientId] API resolution failed, using stored ID:', storedClientId);
          setClientId(storedClientId);
          setIsResolved(true);
        } else {
          console.error('[useClientId] Failed to resolve clientId for domain:', hostname);
          setError('Could not identify tenant context');
          setIsResolved(true);
        }
      } catch (err) {
        console.error('[useClientId] Error during resolution:', err);
        const storedClientId = localStorage.getItem('ps_client_id');
        if (storedClientId) {
          setClientId(storedClientId);
          setIsResolved(true);
        } else {
          setError(String(err));
          setIsResolved(true);
        }
      }
    };

    resolveClientId();
  }, []);

  return { clientId, isResolved, error };
}

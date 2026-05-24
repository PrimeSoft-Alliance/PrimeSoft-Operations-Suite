import { useEffect, useState } from 'react';

export function useClientId() {
  const [clientId, setClientId] = useState<string>('');

  useEffect(() => {
    // 1. Try to get from URL
    const params = new URLSearchParams(window.location.search);
    const cbClientId = params.get('clientId');
    
    if (cbClientId) {
      setClientId(cbClientId);
      localStorage.setItem('ps_client_id', cbClientId);
      return;
    } 

    // 2. Resolve via domain mapped endpoint
    const hostname = window.location.hostname;
    
    // Default to platform-prime for the main platform domains
    const isPlatformDomain = hostname.includes('run.app') || hostname.includes('localhost') || hostname === '0.0.0.0';
    console.log('[DEBUG] [useClientId] Hostname:', hostname, 'isPlatformDomain:', isPlatformDomain);
    
    if (isPlatformDomain) {
      // 1. If explicit query parameter exists, use it and update cache
      const params = new URLSearchParams(window.location.search);
      const urlClientId = params.get('clientId');
      if (urlClientId) {
        setClientId(urlClientId);
        localStorage.setItem('ps_client_id', urlClientId);
        return;
      }

      // 2. If viewing a platform central page on localhost/run.app, ignore cached client! Always use platform-prime.
      const path = window.location.pathname;
      const systemPaths = ['/', '/about', '/privacy', '/terms', '/get-started', '/book-discovery'];
      if (systemPaths.includes(path)) {
        console.log('[DEBUG] [useClientId] System path detected, forcing platform-prime');
        setClientId('platform-prime');
        return;
      }

      // 3. Fallback to cached client for client pages like /booking or /inquiry if navigated
      const storedClientId = localStorage.getItem('ps_client_id');
      console.log('[DEBUG] [useClientId] Stored CID:', storedClientId);
      if (storedClientId) {
        setClientId(storedClientId);
      } else {
        setClientId('platform-prime');
      }
      return;
    }

    // Try API resolution for custom domains
    fetch(`/v1/public/tenant/resolve?host=${hostname}`)
      .then(res => res.json())
      .then(data => {
        const isEnveloped = data && typeof data === 'object' && 'success' in data;
        const payload = (isEnveloped && data.data !== undefined) ? data.data : data;
        if (payload && payload.clientId) {
          setClientId(payload.clientId);
          localStorage.setItem('ps_client_id', payload.clientId);
        }
      })
      .catch(err => {
        const storedClientId = localStorage.getItem('ps_client_id');
        if (storedClientId) {
          setClientId(storedClientId);
        }
      });
  }, []);

  return { clientId };
}

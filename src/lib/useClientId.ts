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
    const isPlatformDomain = hostname.includes('run.app') || hostname.includes('aistudio') || hostname.includes('localhost') || hostname === '0.0.0.0';
    console.log('[DEBUG] [useClientId] Hostname:', hostname, 'isPlatformDomain:', isPlatformDomain);
    
    if (isPlatformDomain) {
      // 1. If explicit query parameter exists, use it and update cache
      const params = new URLSearchParams(window.location.search);
      const urlClientId = params.get('clientId') || params.get('cid');
      if (urlClientId) {
        console.log('[DEBUG] [useClientId] URL CID found:', urlClientId);
        setClientId(urlClientId);
        localStorage.setItem('ps_client_id', urlClientId);
        return;
      }

      // 2. Check localStorage
      const storedClientId = localStorage.getItem('ps_client_id');
      
      // If we have a stored ID that isn't 'platform-prime' and doesn't look like a fresh dev ID, use it
      if (storedClientId && 
          storedClientId !== 'undefined' && 
          storedClientId !== 'null' && 
          storedClientId.trim() !== '') {
        console.log('[DEBUG] [useClientId] Using cached CID:', storedClientId);
        setClientId(storedClientId);
      } else {
        // Fallback to platform-prime or generate
        const fallbackId = 'platform-prime';
        console.log('[DEBUG] [useClientId] Falling back to CID:', fallbackId);
        setClientId(fallbackId);
        localStorage.setItem('ps_client_id', fallbackId);
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
        } else {
          // If no clientId found for the custom domain, fallback
          const stored = localStorage.getItem('ps_client_id');
          if (stored && stored !== 'undefined' && stored !== 'null' && stored.trim() !== '') {
            setClientId(stored);
          } else {
            setClientId('platform-prime');
            localStorage.setItem('ps_client_id', 'platform-prime');
          }
        }
      })
      .catch(err => {
        const storedClientId = localStorage.getItem('ps_client_id');
        if (storedClientId && storedClientId !== 'undefined' && storedClientId !== 'null' && storedClientId.trim() !== '') {
          setClientId(storedClientId);
        } else {
          setClientId('platform-prime');
          localStorage.setItem('ps_client_id', 'platform-prime');
        }
      });
  }, []);

  return { clientId };
}

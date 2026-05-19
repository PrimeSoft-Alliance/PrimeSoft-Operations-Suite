import { useEffect, useState } from 'react';

export function useClientId() {
  const [clientId, setClientId] = useState<string>('plumber-001');

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
    
    // Skip if running local preview mostly
    if (hostname.includes('run.app') || hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      const storedClientId = localStorage.getItem('ps_client_id');
      if (storedClientId) {
        setClientId(storedClientId);
      }
      return;
    }

    // Try API resolution for custom domains
    fetch(`/v1/public/tenant/resolve?host=${hostname}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.clientId) {
          setClientId(data.clientId);
          localStorage.setItem('ps_client_id', data.clientId);
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

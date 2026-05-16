import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept fetch to automatically unwrap the standard API response envelope
// so the frontend components don't need to be rewritten.
const originalFetch = window.fetch;

Object.defineProperty(window, 'fetch', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: async (...args: Parameters<typeof window.fetch>) => {
    const response = await originalFetch(...args);
    
    // Only intercept /v1/ API calls (our backend)
    if (typeof args[0] === 'string' && args[0].startsWith('/v1/')) {
      const clonedRes = response.clone();
      try {
        const data = await clonedRes.json();
        if (data && typeof data === 'object' && 'success' in data && 'request_id' in data) {
          // Build a mock response that returns the unwrapped data payload (or unwrapped error)
          return new Response(JSON.stringify(data.success ? data.data : data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      } catch (e) {
        // ignore JSON parse errors
      }
    }
    return response;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

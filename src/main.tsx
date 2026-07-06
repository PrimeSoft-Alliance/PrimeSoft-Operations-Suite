import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Patch global fetch to automatically append Authorization header if a token is stored in localStorage.
// This is critical for preview environments/iframes where third-party cookies are blocked by default.
const originalFetch = window.fetch;

function customFetch(this: any, input: any, init: any) {
  const token = localStorage.getItem('auth_token');
  if (token) {
    init = init || {};
    const headers = new Headers(init.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    init.headers = headers;
  }
  return originalFetch.call(this, input, init).then((response) => {
    if (response.status === 401) {
      const urlStr = typeof input === 'string' ? input : (input && input.url) || '';
      const isOurApi = !urlStr || urlStr.startsWith('/') || urlStr.includes(window.location.host);
      if (isOurApi) {
        console.warn('[AUTH] Received 401 from local API, clearing auth_token from localStorage');
        localStorage.removeItem('auth_token');
      }
    }
    return response;
  });
}

try {
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (err) {
  console.warn('Could not patch window.fetch with Object.defineProperty:', err);
  try {
    (window as any).fetch = customFetch;
  } catch (err2) {
    console.error('Failed all attempts to patch window.fetch:', err2);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

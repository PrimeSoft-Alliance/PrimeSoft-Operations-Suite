import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface EmbedScriptGeneratorProps {
  clientId: string;
  apiKey: string;
  baseUrl?: string;
}

export function EmbedScriptGenerator({
  clientId,
  apiKey,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.primesoft.com'
}: EmbedScriptGeneratorProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const chatbotScript = `
<!-- PrimeSoft Chatbot Embed -->
<script>
  (function() {
    const EMBED_CONFIG = {
      clientId: "${clientId}",
      apiKey: "${apiKey}",
      baseUrl: "${baseUrl}",
      position: "bottom-right"
    };
    
    // Create floating chatbot container
    const container = document.createElement('div');
    container.id = 'primesoft-chatbot';
    container.setAttribute('data-client-id', EMBED_CONFIG.clientId);
    container.setAttribute('data-api-key', EMBED_CONFIG.apiKey);
    container.style.cssText = \`
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      height: 600px;
      border-radius: 12px;
      box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
      background: white;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
    \`;
    
    document.body.appendChild(container);
    
    // Load chat iframe
    const iframe = document.createElement('iframe');
    iframe.src = EMBED_CONFIG.baseUrl + '/chatbot-embed?clientId=' + EMBED_CONFIG.clientId + '&apiKey=' + EMBED_CONFIG.apiKey;
    iframe.style.cssText = 'border: none; width: 100%; height: 100%; border-radius: 12px;';
    iframe.allow = 'microphone; camera';
    container.appendChild(iframe);
    
    // Post message for initialization
    window.addEventListener('message', function(event) {
      if (event.data.type === 'PRIMESOFT_CHATBOT_READY') {
        iframe.contentWindow.postMessage({
          type: 'PRIMESOFT_INIT',
          clientId: EMBED_CONFIG.clientId,
          apiKey: EMBED_CONFIG.apiKey
        }, '*');
      }
    });
  })();
</script>
`.trim();

  const formsScript = `
<!-- PrimeSoft Forms Embed -->
<script>
  (function() {
    const EMBED_CONFIG = {
      clientId: "${clientId}",
      apiKey: "${apiKey}",
      baseUrl: "${baseUrl}"
    };
    
    window.PrimeSoftForms = {
      mount: function(elementId, formId, options = {}) {
        const container = document.getElementById(elementId);
        if (!container) {
          console.error('PrimeSoft: Container element not found: ' + elementId);
          return;
        }
        
        const iframe = document.createElement('iframe');
        iframe.src = EMBED_CONFIG.baseUrl + '/form-embed/' + formId + 
          '?clientId=' + EMBED_CONFIG.clientId + 
          '&apiKey=' + EMBED_CONFIG.apiKey +
          '&position=' + (options.position || 'inline');
        iframe.style.cssText = 'border: none; width: 100%; min-height: 600px; border-radius: 8px;';
        iframe.setAttribute('data-primesoft-form', formId);
        
        container.appendChild(iframe);
      },
      
      submitForm: function(formId, data) {
        return fetch(EMBED_CONFIG.baseUrl + '/v1/forms/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': EMBED_CONFIG.apiKey,
            'X-Client-Id': EMBED_CONFIG.clientId
          },
          body: JSON.stringify({
            formId: formId,
            data: data
          })
        }).then(r => r.json());
      }
    };
  })();
</script>
`.trim();

  const servicesScript = `
<!-- PrimeSoft Services Showcase -->
<script>
  (function() {
    const EMBED_CONFIG = {
      clientId: "${clientId}",
      apiKey: "${apiKey}",
      baseUrl: "${baseUrl}"
    };
    
    fetch(EMBED_CONFIG.baseUrl + '/v1/public/services', {
      headers: {
        'X-Client-Id': EMBED_CONFIG.clientId,
        'X-API-Key': EMBED_CONFIG.apiKey
      }
    })
    .then(r => r.json())
    .then(data => {
      const container = document.querySelector('[data-primesoft-services]');
      if (container && data.data) {
        const html = data.data.map(service => \`
          <div style="padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600;">\${service.name}</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">\${service.description}</p>
          </div>
        \`).join('');
        container.innerHTML = html;
      }
    })
    .catch(err => console.error('PrimeSoft Services Error:', err));
  })();
</script>
`.trim();

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Chatbot Script */}
      <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
        <h3 className="font-semibold text-slate-100 mb-2">Floating Chatbot</h3>
        <p className="text-xs text-slate-400 mb-4">
          Embed a floating chatbot on any website. Add this script before closing {'</body>'} tag.
        </p>
        <div className="relative">
          <pre className="bg-slate-900/50 border border-slate-600/30 rounded p-4 overflow-x-auto text-xs text-slate-300">
            {chatbotScript}
          </pre>
          <button
            onClick={() => copyToClipboard(chatbotScript, 'chatbot')}
            className="absolute top-3 right-3 p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded transition-colors"
          >
            {copied === 'chatbot' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-blue-400" />
            )}
          </button>
        </div>
      </div>

      {/* Forms Script */}
      <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
        <h3 className="font-semibold text-slate-100 mb-2">Forms & Booking</h3>
        <p className="text-xs text-slate-400 mb-4">
          Embed forms and booking widgets. Use {'<div id="primesoft-form-ID"></div>'} to mount.
        </p>
        <div className="relative">
          <pre className="bg-slate-900/50 border border-slate-600/30 rounded p-4 overflow-x-auto text-xs text-slate-300">
            {formsScript}
          </pre>
          <button
            onClick={() => copyToClipboard(formsScript, 'forms')}
            className="absolute top-3 right-3 p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded transition-colors"
          >
            {copied === 'forms' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-blue-400" />
            )}
          </button>
        </div>
      </div>

      {/* Services Script */}
      <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
        <h3 className="font-semibold text-slate-100 mb-2">Services Showcase</h3>
        <p className="text-xs text-slate-400 mb-4">
          Display client services. Add {'<div data-primesoft-services></div>'} where services should appear.
        </p>
        <div className="relative">
          <pre className="bg-slate-900/50 border border-slate-600/30 rounded p-4 overflow-x-auto text-xs text-slate-300">
            {servicesScript}
          </pre>
          <button
            onClick={() => copyToClipboard(servicesScript, 'services')}
            className="absolute top-3 right-3 p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded transition-colors"
          >
            {copied === 'services' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-blue-400" />
            )}
          </button>
        </div>
      </div>

      {/* Implementation Instructions */}
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
        <h4 className="font-semibold text-amber-400 mb-2 text-sm">Implementation Steps</h4>
        <ol className="text-xs text-amber-100/80 space-y-1 list-decimal list-inside">
          <li>Copy the script(s) you want to embed</li>
          <li>Paste into your website's HTML (typically in the footer)</li>
          <li>All form submissions and chats will appear in your PrimeSoft dashboard</li>
          <li>Each embedded element is automatically tied to your clientId</li>
        </ol>
      </div>
    </div>
  );
}

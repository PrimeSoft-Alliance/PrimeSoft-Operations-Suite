import React, { useState, useEffect } from 'react';
import { Terminal, Copy, Check, Globe, MessageSquare, Calendar, Database, Key, Zap, Shield, Code, Palette, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HeadlessDocs() {
  const [apiKey, setApiKey] = useState('loading...');
  const [clientId, setClientId] = useState('loading...');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/v1/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.clientId) {
           setClientId(data.clientId);
           setApiKey(data.apiKey || 'No API Key generated. Please contact support.');
        }
      });
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CodeBlock = ({ title, code }: { title?: string, code: string }) => (
    <div className="space-y-2">
      {title && <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
        <Code className="w-3 h-3" /> {title}
      </div>}
      <div className="relative group">
        <pre className="bg-slate-900 text-slate-300 p-5 rounded-xl overflow-x-auto text-sm font-mono leading-relaxed border border-slate-800">
          {code}
        </pre>
        <button 
          onClick={() => copyToClipboard(code, code)}
          className="absolute top-3 right-3 p-2 bg-slate-800 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:text-white"
        >
          {copied === code ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase">
            <Zap className="w-3 h-3" /> API-First Architecture
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Platform Integration</h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            Our platform is a hybrid architecture. Use our dashboard for management while serving your brand via Headless APIs or our intelligent Client SDK.
          </p>
        </div>
        <div className="flex gap-3">
           <div className="bg-white px-4 py-2 rounded-xl border-2 border-indigo-50 shadow-sm flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700 font-mono">v1.2.4 (Stable)</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Credentials Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Key className="w-24 h-24 rotate-12" />
            </div>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
               <Shield className="w-5 h-5 text-indigo-400" /> API Gateway
            </h3>
            
            <div className="space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Project Identity</label>
                <div className="flex items-center gap-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <code className="text-indigo-400 font-mono text-sm flex-1 truncate">{clientId}</code>
                  <button onClick={() => copyToClipboard(clientId, 'cid')} className="text-slate-500 hover:text-white transition">
                    {copied === 'cid' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Private Access Token</label>
                <div className="flex items-center gap-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <code className="text-indigo-400 font-mono text-sm flex-1 truncate">{apiKey.substring(0, 15)}...</code>
                  <button onClick={() => copyToClipboard(apiKey, 'key')} className="text-slate-500 hover:text-white transition">
                    {copied === 'key' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400 leading-relaxed italic">
              "With great API usage comes great responsibility." - Ensure tokens are stored in environment variables.
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 space-y-4">
             <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                <Palette className="w-5 h-5" /> Smart Theme Sync
             </h4>
             <p className="text-sm text-indigo-800 opacity-80 leading-relaxed">
               Our SDK automatically assumes the visual aesthetic of your host website. It extracts brand colors from buttons and typography to remain invisible.
             </p>
             <div className="flex gap-2">
                <div className="w-6 h-6 bg-indigo-600 rounded-full border-2 border-white shadow-sm"></div>
                <div className="w-6 h-6 bg-slate-900 rounded-full border-2 border-white shadow-sm"></div>
                <div className="w-6 h-6 bg-teal-500 rounded-full border-2 border-white shadow-sm"></div>
             </div>
          </div>
        </div>

        {/* implementation Tabs */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white rounded-2xl border p-8 shadow-sm space-y-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Share2 className="w-6 h-6 text-indigo-600" /> 1-Click Client SDK
                </h3>
                <p className="text-gray-600">The easiest way to add an intelligent AI Chatbot Assistant powered by Gemini to any external HTML site or CMS (WordPress, Wix, Webflow).</p>
                <CodeBlock 
                  title="Include in <body>"
                  code={`<script src="${window.location.origin}/widget.js" data-client-id="${clientId}" async></script>`} 
                />
                <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-500 pt-2">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Auto-Theme Matching</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Zero Code Widget Injection</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Conversational AI Intelligence</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Cross-Origin Event Sync</div>
                </div>
              </div>

              <div className="space-y-4 pt-8 border-t">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Database className="w-6 h-6 text-blue-600" /> Headless REST API
                </h3>
                <p className="text-gray-600 text-sm">For complete architectural control, use our JSON endpoints to build your own components in React, Vue, or Next.js.</p>
                
                <div className="space-y-6">
                  <CodeBlock 
                    title="POST chat (AI)"
                    code={`fetch('${window.location.origin}/v1/public/ai/chat', {
  method: 'POST',
  headers: { 'x-client-id': '${clientId}', 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hi' })
});`}
                  />
                </div>
              </div>
           </div>
        </div>
      </div>

    </div>
  );
}

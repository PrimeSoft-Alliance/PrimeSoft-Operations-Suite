import React, { useState, useEffect } from 'react';
import { Send, Key, RefreshCw, CheckCircle2, AlertCircle, Info, ExternalLink, ShieldCheck, Zap, Trash2 } from 'lucide-react';
import { useClientId } from '../../../lib/useClientId';

export default function TelegramIntegration() {
  const { clientId } = useClientId();
  const [status, setStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [token, setToken] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientId) fetchStatus();
  }, [clientId]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/telegram/status/${clientId}`);
      const data = await res.json();
      if (data.success && data.status) {
        setStatus(data.status.status);
        setBotUsername(data.status.botUsername || '');
      }
    } catch (e) {}
  };

  const connect = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify({ tenantId: clientId, botToken: token.trim() })
      });
      if (res.ok) {
        setToken('');
        fetchStatus();
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect your Telegram bot?')) return;
    try {
      await fetch('/api/telegram/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify({ tenantId: clientId })
      });
      fetchStatus();
    } catch (e) {}
  };

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Telegram Integration</h1>
        <p className="text-slate-500 text-sm font-medium">Power your customer service with a branded Telegram Bot.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-sky-100 text-sky-600 rounded-2xl">
                        <Send className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Bot Connection</h3>
                        <p className="text-sm font-medium text-slate-400">Secure link via Telegram Bot API.</p>
                    </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${status === 'connected' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-500'}`}>
                    {status}
                </span>
            </div>

            {status === 'connected' ? (
                <div className="space-y-6">
                    <div className="p-6 bg-sky-50 border border-sky-100 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-sky-600 shadow-sm border border-sky-100 font-black shrink-0">
                                @
                            </div>
                            <div>
                                <h4 className="font-black text-sky-800 break-all">@{botUsername}</h4>
                                <p className="text-xs font-bold text-sky-600">Active and listening for messages.</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button 
                                onClick={fetchStatus}
                                className="flex-1 md:flex-none p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center"
                                title="Refresh Status"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={disconnect}
                                className="flex-1 md:flex-none p-3 border border-slate-200 text-red-500 rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center"
                                title="Disconnect Bot"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Broadcasts</div>
                            <div className="text-xl font-black text-slate-800 tracking-tight">1,240</div>
                         </div>
                         <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Subscribers</div>
                            <div className="text-xl font-black text-slate-800 tracking-tight">854</div>
                         </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bot HTTP API Token</label>
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 group focus-within:ring-2 focus-within:ring-sky-500 transition-all">
                            <Key className="w-4 h-4 text-slate-400 mr-3" />
                            <input 
                                type="password"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-bold w-full" 
                                placeholder="123456789:ABCDefGhI..." 
                            />
                        </div>
                    </div>
                    <button 
                        onClick={connect}
                        disabled={loading || !token}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 shadow-xl transition-all disabled:opacity-50"
                    >
                        {loading ? 'Initializing Stream...' : 'Link Telegram Bot'}
                    </button>
                </div>
            )}
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shrink-0 h-fit">
                <Zap className="w-6 h-6" />
            </div>
            <div className="space-y-1">
                <h4 className="font-black text-indigo-800">Dynamic AI Responses</h4>
                <p className="text-indigo-700/80 text-sm font-medium leading-relaxed">
                    Once linked, your OminiRep AI will automatically handle all incoming messages to your Telegram bot using your specified knowledge base.
                </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white">
            <h4 className="text-lg font-black mb-4 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-sky-400" />
                Activation Guide
            </h4>
            <ol className="space-y-6">
                {[
                    { title: 'Create Bot', desc: 'Message @BotFather on Telegram and send /newbot.' },
                    { title: 'Get Token', desc: 'Copy the HTTP API Token provided at the end of the process.' },
                    { title: 'Paste Above', desc: 'Enter the token in the form and click "Link Active Token".' },
                    { title: 'Start Chatting', desc: 'Your bot is now live! Try sending it a message.' }
                ].map((step, idx) => (
                    <li key={idx} className="flex gap-4">
                        <span className="w-6 h-6 bg-white/10 text-[10px] font-black rounded-lg flex items-center justify-center shrink-0 border border-white/20">{idx + 1}</span>
                        <div>
                            <h5 className="text-[11px] font-black text-white uppercase tracking-wider mb-1">{step.title}</h5>
                            <p className="text-xs font-medium text-slate-400 leading-snug">{step.desc}</p>
                        </div>
                    </li>
                ))}
            </ol>
            <a href="https://t.me/botfather" target="_blank" rel="noreferrer" className="mt-8 flex items-center justify-center gap-2 w-full py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-[10px] font-black uppercase tracking-widest border border-white/10">
                Open BotFather <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

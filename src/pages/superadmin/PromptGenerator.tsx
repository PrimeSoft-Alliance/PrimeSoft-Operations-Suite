import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, RefreshCcw, Search, Code, Cpu, Layout, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

export default function PromptGenerator() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedPrompts, setGeneratedPrompts] = useState<{
    website?: string;
    ai?: string;
    backend?: string;
    onboarding?: string;
  }>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/v1/sys-admin/clients')
      .then(res => res.json())
      .then(data => {
        const clientList = data?.success && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setClients(clientList);
        setLoading(false);
      });
  }, []);

  const generatePrompts = async (clientId: string) => {
    setGenerating(true);
    try {
      const res = await fetch(`/v1/sys-admin/builder-prompt/${clientId}`);
      const data = await res.json();
      
      // Split or specifically generate other types in a real scenario
      // For now we'll simulate splitting the main prompt or creating variations
      const basePrompt = data.prompt || '';
      
      setGeneratedPrompts({
        website: basePrompt,
        ai: `AI RECEPTIONIST SETUP for ${selectedClient?.businessName}:\n\nSystem Instructions:\n${(basePrompt || '').split('TECHNICAL REQUIREMENTS')[0]}\n\nBehavioral Rules:\n- Be professional\n- Use only business data\n- Encourage booking`,
        backend: `BACKEND INTEGRATION for ${clientId}:\n\n- Endpoint: /api/bookings\n- Requirements: fullName, email, phone, date, time\n- SDK: data-platform-form="booking"`,
        onboarding: `ONBOARDING SUMMARY for ${selectedClient?.businessName}:\n\nBusiness is ${selectedClient?.businessType}. Setup with 1000 AI messages limit.`
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Prompt copied!');
  };

  const filteredClients = clients.filter(c => 
    (c.businessName || '').toLowerCase().includes((search || '').toLowerCase()) || 
    (c.clientId || '').toLowerCase().includes((search || '').toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Prompt Generator</h1>
          <p className="text-sm font-medium text-slate-500 mt-1 font-sans">Generate copy-ready prompts for Lovable, v0, and Backend setup.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Client Selection Sidebar */}
        <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-gray-200 h-[calc(100vh-200px)] flex flex-col">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              placeholder="Search clients..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredClients.map((client, idx) => (
              <button
                key={client.clientId || client._id || client.id || `client-${idx}`}
                onClick={() => {
                  setSelectedClient(client);
                  setGeneratedPrompts({});
                }}
                className={`w-full text-left p-3 rounded-lg text-sm transition-all ${
                  selectedClient?.clientId === client.clientId 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="font-bold">{client.businessName}</div>
                <div className="text-[10px] uppercase font-mono opacity-60">{client.clientId}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Workspace */}
        <div className="lg:col-span-3 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
          {selectedClient ? (
            <>
              <div className="bg-white p-6 rounded-xl border border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedClient.businessName}</h3>
                  <p className="text-sm text-gray-500">Click generate to build all platform setup prompts</p>
                </div>
                <button
                  disabled={generating}
                  onClick={() => generatePrompts(selectedClient.clientId)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  {generating ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate All Prompts
                </button>
              </div>

              {Object.keys(generatedPrompts).length > 0 && (
                <div className="grid grid-cols-1 gap-6">
                  {/* Website Builder */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 rounded-2xl overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center text-white">
                      <div className="flex items-center gap-2">
                        <Layout className="w-5 h-5 text-indigo-400" />
                        <span className="font-bold tracking-tight">Website Builder (Lovable / v0)</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(generatedPrompts.website!)}
                        className="p-1 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition"
                      >
                        Copy Prompt
                      </button>
                    </div>
                    <div className="p-6 text-slate-400 font-mono text-xs leading-relaxed max-h-[300px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{generatedPrompts.website}</pre>
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* AI Assistant */}
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                    >
                      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-5 h-5 text-emerald-600" />
                          <span className="font-bold text-gray-800">AI Personality</span>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(generatedPrompts.ai!)}
                          className="text-gray-400 hover:text-indigo-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-6 text-gray-600 text-[10px] leading-relaxed line-clamp-[10] overflow-y-auto max-h-[200px]">
                        <pre className="whitespace-pre-wrap font-mono">{generatedPrompts.ai}</pre>
                      </div>
                    </motion.div>

                    {/* Backend API */}
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                    >
                      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Code className="w-5 h-5 text-indigo-600" />
                          <span className="font-bold text-gray-800">Backend Config</span>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(generatedPrompts.backend!)}
                          className="text-gray-400 hover:text-indigo-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-6 text-gray-600 text-[10px] leading-relaxed">
                        <pre className="whitespace-pre-wrap font-mono">{generatedPrompts.backend}</pre>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center">
              <Sparkles className="w-12 h-12 text-gray-200 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Ready to Generate</h3>
              <p className="text-gray-500 mt-1">Select a client from the sidebar to prepare site and backend prompts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

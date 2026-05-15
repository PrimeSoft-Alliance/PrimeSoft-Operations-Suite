import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, AlertCircle, Link as LinkIcon, Sparkles, Copy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ClientsManager() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [onboardingUrl, setOnboardingUrl] = useState('');
  const [websiteBuilderPrompt, setWebsiteBuilderPrompt] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  
  const [newClient, setNewClient] = useState({
    clientId: '',
    businessName: '',
    email: '',
    password: '',
    aiMessageLimit: 1000,
    storageLimitBytes: 52428800
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const generateOnboardingLink = async (clientId: string) => {
    setSelectedClientId(clientId);
    try {
      const res = await fetch('/api/super-admin/generate-onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, expiryHours })
      });
      const data = await res.json();
      if (data.url) {
        setOnboardingUrl(data.url);
        setShowOnboardingModal(true);
      }
    } catch (err) {
      alert('Failed to generate link');
    }
  };

  const generateBuilderPrompt = async (clientId: string) => {
    try {
      const res = await fetch(`/api/super-admin/builder-prompt/${clientId}`);
      const data = await res.json();
      if (data.prompt) {
        setWebsiteBuilderPrompt(data.prompt);
        setShowPromptModal(true);
      }
    } catch (err) {
      alert('Failed to generate prompt');
    }
  };

  const fetchClients = async () => {
    const res = await fetch('/api/super-admin/clients');
    const data = await res.json();
    setClients(data);
    setLoading(false);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/super-admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClient)
    });
    const data = await res.json();
    if (data.success) {
      setShowAddModal(false);
      fetchClients();
    } else {
      setError(data.error || 'Failed to add client');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure? This will delete all client data!')) return;
    await fetch(`/api/super-admin/clients/${clientId}`, { method: 'DELETE' });
    fetchClients();
  };

  if (loading) return <div>Loading clients...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Clients</h2>
          <p className="text-gray-500">Manage business accounts and their quotas</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add New Client
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 font-semibold text-gray-700">Client ID</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Business Name</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Email</th>
              <th className="px-6 py-4 font-semibold text-gray-700">AI Limit</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Storage</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.clientId} className="border-b border-gray-100 hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-mono text-sm text-indigo-600">{client.clientId}</td>
                <td className="px-6 py-4 font-medium">{client.businessName}</td>
                <td className="px-6 py-4 text-gray-500">{client.email}</td>
                <td className="px-6 py-4">{client.aiMessageLimit} msgs</td>
                <td className="px-6 py-4">{(client.storageLimitBytes / 1024 / 1024).toFixed(0)}MB</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => generateBuilderPrompt(client.clientId)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="Generate AI Prompt"
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => generateOnboardingLink(client.clientId)}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                    title="Onboarding Link"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDeleteClient(client.clientId)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6 text-indigo-600" />
              Pre-generate Client ID
            </h3>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              // For onboarding-first model, we might just want to save the clientId 
              // or just use the existing handleAddClient but maybe simplified.
              handleAddClient(e);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unique Client ID</label>
                <input
                  required
                  placeholder="e.g., plumber-001"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newClient.clientId}
                  onChange={e => setNewClient({...newClient, clientId: e.target.value})}
                />
              </div>
              <p className="text-xs text-gray-500 italic">You can also fully pre-create the account or generate an onboarding link after IDs are reserved.</p>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Confirm ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding Link Modal */}
      <AnimatePresence>
        {showOnboardingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowOnboardingModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <LinkIcon className="w-6 h-6 text-emerald-600" />
                Onboarding Link
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Adjust Expiry (Hours)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" min="1" max="72" 
                      value={expiryHours} 
                      onChange={e => setExpiryHours(parseInt(e.target.value))}
                      className="flex-1 accent-emerald-600"
                    />
                    <span className="font-mono font-bold text-emerald-600">{expiryHours}h</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-sm font-medium text-slate-500 mb-2">Share this link with your client:</p>
                  <div className="flex items-center gap-2">
                    <input 
                      readOnly 
                      value={onboardingUrl} 
                      className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-mono truncate"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(onboardingUrl);
                        alert('Copied!');
                      }}
                      className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic text-center">This link will expire at {new Date(new Date().getTime() + expiryHours * 60 * 60 * 1000).toLocaleString()}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Prompt Modal */}
      <AnimatePresence>
        {showPromptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowPromptModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                Website Builder Prompt
              </h3>
              
              <div className="space-y-4">
                <div className="p-6 bg-slate-900 rounded-2xl text-slate-300 font-mono text-xs leading-relaxed max-h-[400px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{websiteBuilderPrompt}</pre>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(websiteBuilderPrompt);
                    alert('Prompt copied!');
                  }}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Copy AI Prompt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

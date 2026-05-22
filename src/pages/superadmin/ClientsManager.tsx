import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, AlertCircle, Link as LinkIcon, Sparkles, Copy, X, Code, Globe, CheckCircle2, RefreshCw, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ClientsManager() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showDomains, setShowDomains] = useState(false);
  const [allDomains, setAllDomains] = useState<any[]>([]);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [websiteBuilderPrompt, setWebsiteBuilderPrompt] = useState('');
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  useEffect(() => {
    fetchClients();
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const res = await fetch('\/v1\/sys-admin/domains');
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) setAllDomains(data.data);
    } catch (err) { console.error('Domains fetch error'); }
  };

  const generateBuilderPrompt = async (clientId: string) => {
    try {
      const res = await fetch(`/v1/sys-admin/builder-prompt/${clientId}`);
      const data = await res.json();
      if (data.prompt) {
        setWebsiteBuilderPrompt(data.prompt);
        setShowPromptModal(true);
      }
    } catch (err) {
      alert('Failed to generate prompt');
    }
  };

  const showEmbedCode = (clientId: string, businessName: string) => {
    setSelectedClientId(clientId);
    setSelectedClientName(businessName);
    setShowEmbedModal(true);
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`/v1/sys-admin/clients?t=${Date.now()}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setClients(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error(err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // Note: Clients are onboarded securely via Public Onboarding requests or admin invitation links

  const handleDeleteClient = async (clientId: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Client Data?',
      message: 'This will permanently remove all data, bookings, and settings for this client. This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setUpdating(true);
        try {
          const res = await fetch(`/v1/sys-admin/clients/${clientId}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            await fetchClients();
            setConfirmModal(prev => ({ ...prev, show: false }));
          } else {
            alert(data.error || 'Delete failed');
          }
        } catch (err) {
          console.error('Delete error:', err);
          alert('Error deleting client');
        } finally {
          setUpdating(false);
        }
      }
    });
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setUpdating(true);
    try {
      const res = await fetch(`/v1/sys-admin/clients/${editingClient.clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: editingClient.businessName,
          email: editingClient.email,
          aiMessageLimit: editingClient.aiMessageLimit,
          storageLimitBytes: editingClient.storageLimitBytes,
          status: editingClient.status
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingClient(null);
        fetchClients();
      } else {
        alert(data.error || 'Update failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating client');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (clientId: string, currentStatus: string) => {
    const statusToSet = currentStatus === 'suspended' ? 'active' : 'suspended';
    
    setConfirmModal({
      show: true,
      title: `${statusToSet === 'active' ? 'Reactivate' : 'Suspend'} Client?`,
      message: statusToSet === 'active' 
        ? "The client will be able to access their dashboard and their website services will be restored."
        : "The client will be locked out of their dashboard and their public services (AI, Bookings) will be disabled.",
      type: statusToSet === 'active' ? 'info' : 'warning',
      onConfirm: async () => {
        setUpdating(true);
        try {
          const res = await fetch(`/v1/sys-admin/clients/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: statusToSet })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            await fetchClients();
            setConfirmModal(prev => ({ ...prev, show: false }));
          } else {
            alert(data.error || 'Failed to update status');
          }
        } catch (err) {
          console.error('Toggle status error:', err);
          alert('Failed to update status');
        } finally {
          setUpdating(false);
        }
      }
    });
  };

  const regenerateActivationToken = async (clientId: string) => {
    if (!confirm('Are you sure you want to regenerate the activation license key? The old one will immediately stop working.')) return;
    setUpdating(true);
    try {
      const res = await fetch(`/v1/sys-admin/clients/${clientId}/regenerate-token`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSelectedToken(data.activationToken || data.data.activationToken);
        setShowTokenModal(true);
        fetchClients();
      } else {
        alert('Failed to regenerate token');
      }
    } catch (e) {
      alert('Error regenerating token');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div>Loading clients...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">System Clients</h2>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage business accounts, allocate platform storage, & configure usage policies</p>
        </div>
      </div>

      {allDomains.length > 0 && (
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
           <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              Active Domain Mappings
           </h3>
           <div className="grid md:grid-cols-3 gap-4">
              {allDomains.map(dom => (
                <div key={dom._id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                   <div>
                      <div className="text-sm font-bold">{dom.host}</div>
                      <div className="text-[10px] text-indigo-600 font-mono uppercase">{dom.clientId}</div>
                   </div>
                   <button 
                     onClick={() => {
                       setConfirmModal({
                         show: true,
                         title: 'Delete Domain Mapping?',
                         message: `Are you sure you want to remove the domain mapping for ${dom.host}?`,
                         type: 'danger',
                         onConfirm: async () => {
                           await fetch(`/v1/sys-admin/domains/${dom._id}`, { method: 'DELETE' });
                           fetchDomains();
                           setConfirmModal(prev => ({ ...prev, show: false }));
                         }
                       });
                     }}
                     className="text-gray-400 hover:text-red-500 transition-colors"
                   >
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              ))}
           </div>
        </section>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 font-semibold text-gray-700">Client ID</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Business Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Account</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Activation</th>
                <th className="px-6 py-4 font-semibold text-gray-700">AI Limit</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Storage</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.clientId} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-mono text-sm text-indigo-600">{client.clientId}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{client.businessName}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{client.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${client.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {(client.status || 'active')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {client.isActivated ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-black uppercase text-[10px] tracking-widest">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Activated
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">Pending</span>
                        <div className="flex items-center gap-2 group">
                          <code className="text-[10px] font-mono font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            {client.activationToken || 'NO-TOKEN'}
                          </code>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(client.activationToken);
                              alert('Token copied!');
                            }}
                            className="bg-slate-100 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="w-2.5 h-2.5 text-slate-500" />
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{client.aiMessageLimit} <span className="text-[10px] uppercase text-slate-400">msgs</span></td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{(client.storageLimitBytes / 1024 / 1024).toFixed(0)}<span className="text-[10px] uppercase text-slate-400">MB</span></td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <button 
                      onClick={() => regenerateActivationToken(client.clientId)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition"
                      title="Regenerate License Key"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => generateBuilderPrompt(client.clientId)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Generate AI Prompt"
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => showEmbedCode(client.clientId, client.businessName)}
                      className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition"
                      title="Get Embed Code"
                    >
                      <Code className="w-5 h-5" />
                    </button>
                    <button 
                      disabled={updating}
                      onClick={() => handleToggleStatus(client.clientId, client.status)}
                      className={`p-2 rounded-lg transition disabled:opacity-50 ${client.status === 'suspended' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                      title={client.status === 'suspended' ? 'Activate Client' : 'Suspend Client'}
                    >
                      <AlertCircle className="w-5 h-5" />
                    </button>
                    <button 
                      disabled={updating}
                      onClick={() => setEditingClient({ ...client })}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition disabled:opacity-50"
                      title="Edit Client"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      disabled={updating}
                      onClick={() => handleDeleteClient(client.clientId)} 
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Delete Client"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual client addition is replaced by URL onboarding / client invite flows */}

      {/* AI Prompt Modal */}
      <AnimatePresence>
        {showTokenModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl relative text-center"
            >
              <button 
                onClick={() => setShowTokenModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">New License Key</h3>
              <p className="text-sm text-gray-500 mb-6">Give this key to the client to activate their portal.</p>
              
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-6 flex items-center justify-center gap-3">
                <code className="text-sm font-mono font-black text-indigo-600 tracking-wider blur-[1px] hover:blur-0 transition-all cursor-help">{selectedToken}</code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedToken);
                    alert('Token copied!');
                  }}
                  className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
              
              <button 
                onClick={() => setShowTokenModal(false)}
                className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 transition shadow-xl shadow-indigo-500/20"
              >
                Got it
              </button>
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
              className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
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

      {/* Embed Code Modal */}
      <AnimatePresence>
        {showEmbedModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowEmbedModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Code className="w-6 h-6 text-indigo-600" />
                Headless SDK Embed Code
              </h3>
              <p className="text-sm text-gray-500 mb-6 underline">Client: {selectedClientName} ({selectedClientId})</p>
              
              <div className="space-y-6">
                <div className="p-6 bg-slate-900 rounded-2xl text-indigo-300 font-mono text-xs leading-relaxed">
                  <pre className="whitespace-pre-wrap">
{`<script
  src="${window.location.origin}/sdk.js"
  data-client-id="${selectedClientId}"
  data-features="chat,booking,contact,content"
  data-auto-detect="true"
  async
></script>`}
                  </pre>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      const code = `<script\n  src="${window.location.origin}/sdk.js"\n  data-client-id="${selectedClientId}"\n  data-features="chat,booking,contact,content"\n  data-auto-detect="true"\n  async\n></script>`;
                      navigator.clipboard.writeText(code);
                      alert('Embed code copied!');
                    }}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy SDK Script
                  </button>
                  <button 
                    onClick={() => {
                      const code = `<div data-platform-content="heroTitle"></div>\n<div data-platform-content="heroSubtitle"></div>`;
                      navigator.clipboard.writeText(code);
                      alert('Content tags copied!');
                    }}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Content Tags
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                   <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                      <strong>Step 1:</strong> Paste the script tag in the {`<head>`} or at the end of {`<body>`}.<br/>
                      <strong>Step 2:</strong> Add HTML elements with <code>data-platform-content="key"</code> to enable headless editing.
                   </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Client Modal */}
      <AnimatePresence>
        {editingClient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setEditingClient(null)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Edit2 className="w-6 h-6 text-indigo-600" />
                Edit Client Data
              </h3>
              
              <form onSubmit={handleUpdateClient} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Business Name</label>
                  <input 
                    required
                    value={editingClient.businessName}
                    onChange={e => setEditingClient({...editingClient, businessName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Login Email</label>
                  <input 
                    required
                    type="email"
                    value={editingClient.email}
                    onChange={e => setEditingClient({...editingClient, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">AI Limit</label>
                    <input 
                      required
                      type="number"
                      value={editingClient.aiMessageLimit}
                      onChange={e => setEditingClient({...editingClient, aiMessageLimit: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Storage (MB)</label>
                    <input 
                      required
                      type="number"
                      value={Math.round(editingClient.storageLimitBytes / (1024 * 1024))}
                      onChange={e => setEditingClient({...editingClient, storageLimitBytes: parseInt(e.target.value) * 1024 * 1024})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingClient(null)}
                    className="flex-1 py-4 bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={updating}
                    className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    {updating ? 'Saving...' : 'Update Details'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl text-center"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                confirmModal.type === 'danger' ? 'bg-red-50 text-red-600' :
                confirmModal.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                'bg-indigo-50 text-indigo-600'
              }`}>
                {confirmModal.type === 'danger' ? <Trash2 className="w-8 h-8" /> : 
                 confirmModal.type === 'warning' ? <AlertCircle className="w-8 h-8" /> : 
                 <Users className="w-8 h-8" />}
              </div>
              
              <h3 className="text-xl font-black text-gray-900 mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">{confirmModal.message}</p>
              
              <div className="flex flex-col gap-3">
                <button
                  disabled={updating}
                  onClick={confirmModal.onConfirm}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition shadow-lg disabled:opacity-50 ${
                    confirmModal.type === 'danger' ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20' :
                    confirmModal.type === 'warning' ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-600/20' :
                    'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  {updating ? 'Processing...' : 'Confirm Action'}
                </button>
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="w-full py-4 bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

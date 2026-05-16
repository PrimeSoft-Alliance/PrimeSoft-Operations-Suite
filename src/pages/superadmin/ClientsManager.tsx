import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, AlertCircle, Link as LinkIcon, Sparkles, Copy, X, Code, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ClientsManager() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showDomains, setShowDomains] = useState(false);
  const [allDomains, setAllDomains] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [onboardingUrl, setOnboardingUrl] = useState('');
  const [websiteBuilderPrompt, setWebsiteBuilderPrompt] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  
  const [newClient, setNewClient] = useState({
    clientId: '',
    businessName: '',
    businessType: '',
    subdomain: '',
    email: '',
    password: '',
    contactPhone: '',
    contactEmail: '',
    businessDescription: '',
    aiMessageLimit: 1000,
    storageLimitBytes: 52428800,
    customFields: [] as { name: string, value: string }[]
  });
  const [inviteFields, setInviteFields] = useState<{ name: string, type: string }[]>([]);
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
      const res = await fetch('/v1/super-admin/domains');
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) setAllDomains(data.data);
    } catch (err) { console.error('Domains fetch error'); }
  };

  const generateOnboardingLink = async (clientId: string) => {
    setSelectedClientId(clientId);
    setOnboardingUrl('');
    setInviteFields([]);
    setShowOnboardingModal(true);
  };

  const submitOnboardingLink = async () => {
    setUpdating(true);
    try {
      const res = await fetch('/v1/super-admin/generate-onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientId: selectedClientId, 
          expiryHours, 
          customFields: inviteFields 
        })
      });
      const data = await res.json();
      if (data.url) {
        setOnboardingUrl(data.url);
      } else {
        alert(data.error || 'Failed to generate link');
      }
    } catch (err) {
      alert('Failed to generate link');
    } finally {
      setUpdating(false);
    }
  };

  const generateBuilderPrompt = async (clientId: string) => {
    try {
      const res = await fetch(`/v1/super-admin/builder-prompt/${clientId}`);
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
      const res = await fetch(`/v1/super-admin/clients?t=${Date.now()}`);
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

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUpdating(true);
    try {
      const customFieldsObj: Record<string, string> = {};
      newClient.customFields.forEach(f => {
        if (f.name) customFieldsObj[f.name] = f.value;
      });

      const res = await fetch('/v1/super-admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClient,
          customFields: customFieldsObj
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchClients();
        setNewClient({
          clientId: '',
          businessName: '',
          businessType: '',
          subdomain: '',
          email: '',
          password: '',
          contactPhone: '',
          contactEmail: '',
          businessDescription: '',
          aiMessageLimit: 1000,
          storageLimitBytes: 52428800,
          customFields: []
        });
      } else {
        setError(data.error || 'Failed to add client');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Client Data?',
      message: 'This will permanently remove all data, bookings, and settings for this client. This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setUpdating(true);
        try {
          const res = await fetch(`/v1/super-admin/clients/${clientId}`, { method: 'DELETE' });
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
      const res = await fetch(`/v1/super-admin/clients/${editingClient.clientId}`, {
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
          const res = await fetch(`/v1/super-admin/clients/${clientId}`, {
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

  if (loading) return <div>Loading clients...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Clients</h2>
          <p className="text-gray-500">Manage business accounts and their quotas</p>
        </div>
        <button
          onClick={() => {
            setSelectedClientId('');
            setOnboardingUrl('');
            setInviteFields([]);
            setShowOnboardingModal(true);
          }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
        >
          <LinkIcon className="w-5 h-5" />
          Onboarding Link
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add New Client
        </button>
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
                           await fetch(`/v1/super-admin/domains/${dom._id}`, { method: 'DELETE' });
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
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
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
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${client.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {(client.status || 'active').toUpperCase()}
                    </span>
                  </td>
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
                      onClick={() => showEmbedCode(client.clientId, client.businessName)}
                      className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition"
                      title="Get Embed Code"
                    >
                      <Code className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => generateOnboardingLink(client.clientId)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      title="Onboarding Link"
                    >
                      <LinkIcon className="w-5 h-5" />
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
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

            <form onSubmit={handleAddClient} className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newClient.businessName}
                  onChange={e => setNewClient({...newClient, businessName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  required
                  type="email"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newClient.email}
                  onChange={e => setNewClient({...newClient, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  required
                  type="password"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newClient.password}
                  onChange={e => setNewClient({...newClient, password: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                  <input
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newClient.businessType}
                    onChange={e => setNewClient({...newClient, businessType: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
                  <input
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newClient.subdomain}
                    onChange={e => setNewClient({...newClient, subdomain: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newClient.contactPhone}
                    onChange={e => setNewClient({...newClient, contactPhone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newClient.contactEmail}
                    onChange={e => setNewClient({...newClient, contactEmail: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About Text / Description</label>
                <textarea
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newClient.businessDescription}
                  onChange={e => setNewClient({...newClient, businessDescription: e.target.value})}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-gray-700">Custom Fields</label>
                  <button 
                    type="button" 
                    onClick={() => setNewClient({...newClient, customFields: [...newClient.customFields, { name: '', value: '' }]})}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Field
                  </button>
                </div>
                {newClient.customFields.map((field, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      placeholder="Name" 
                      className="flex-1 px-3 py-1.5 border rounded-lg text-sm outline-none"
                      value={field.name}
                      onChange={e => {
                        const next = [...newClient.customFields];
                        next[idx].name = e.target.value;
                        setNewClient({...newClient, customFields: next});
                      }}
                    />
                    <input 
                      placeholder="Value" 
                      className="flex-1 px-3 py-1.5 border rounded-lg text-sm outline-none"
                      value={field.value}
                      onChange={e => {
                        const next = [...newClient.customFields];
                        next[idx].value = e.target.value;
                        setNewClient({...newClient, customFields: next});
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setNewClient({...newClient, customFields: newClient.customFields.filter((_, i) => i !== idx)})}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

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
                  disabled={updating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {updating ? 'Creating...' : 'Create Client'}
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
              className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
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
                {!selectedClientId && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Client ID (Required for Link)</label>
                    <input 
                      placeholder="e.g., smith-plumbing"
                      value={selectedClientId}
                      onChange={e => setSelectedClientId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Adjust Expiry (Hours)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" min="1" max="168" 
                      value={expiryHours} 
                      onChange={e => setExpiryHours(parseInt(e.target.value))}
                      className="flex-1 accent-emerald-600"
                    />
                    <span className="font-mono font-bold text-emerald-600">{expiryHours}h</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Required Custom Fields</label>
                    <button 
                      onClick={() => setInviteFields([...inviteFields, { name: '', type: 'text' }])}
                      className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Plus className="w-3 h-3" /> Add Requirement
                    </button>
                  </div>
                  
                  {inviteFields.map((field, idx) => (
                    <div key={idx} className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <input 
                        placeholder="Field Label (e.g. VAT Number)" 
                        className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none"
                        value={field.name}
                        onChange={e => {
                          const next = [...inviteFields];
                          next[idx].name = e.target.value;
                          setInviteFields(next);
                        }}
                      />
                      <select 
                        className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                        value={field.type}
                        onChange={e => {
                          const next = [...inviteFields];
                          next[idx].type = e.target.value;
                          setInviteFields(next);
                        }}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="textarea">Large Text</option>
                      </select>
                      <button 
                        onClick={() => setInviteFields(inviteFields.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  disabled={updating || !selectedClientId}
                  onClick={submitOnboardingLink}
                  className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {updating ? 'Generating...' : 'Generate New Link'}
                </button>

                {onboardingUrl && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl"
                  >
                    <p className="text-sm font-medium text-emerald-600 mb-2 font-bold">Share this link with your client:</p>
                    <div className="flex items-center gap-2">
                      <input 
                        readOnly 
                        value={onboardingUrl} 
                        className="flex-1 bg-white border border-emerald-200 px-3 py-2 rounded-lg text-sm font-mono truncate"
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
                    <p className="text-[10px] text-emerald-500 mt-2 italic text-center">Expires at {new Date(new Date().getTime() + expiryHours * 60 * 60 * 1000).toLocaleString()}</p>
                  </motion.div>
                )}
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
                      const code = `<div data-psa-content="heroTitle"></div>\n<div data-psa-content="heroSubtitle"></div>`;
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
                      <strong>Step 2:</strong> Add HTML elements with <code>data-psa-content="key"</code> to enable headless editing.
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

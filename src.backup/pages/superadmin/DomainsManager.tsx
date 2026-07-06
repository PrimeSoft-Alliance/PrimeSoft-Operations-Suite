import React, { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, ShieldCheck, ExternalLink, Search, RefreshCcw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DomainsManager() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState({ clientId: '', host: '', type: 'subdomain' });
  const [search, setSearch] = useState('');
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

  const fetchDomains = async () => {
    try {
      const res = await fetch('\/v1\/sys-admin/domains');
      const data = await res.json();
      setDomains(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/v1/sys-admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDomain)
      });
      if (res.ok) {
        fetchDomains();
        setShowAddModal(false);
        setNewDomain({ clientId: '', host: '', type: 'subdomain' });
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } catch (err) {
      alert('Failed to add domain');
    }
  };

  const handleDeleteDomain = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Domain Mapping?',
      message: 'This will remove the link between this hostname and the client. The client website may lead to a 404 if this was their only access point.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await fetch(`/v1/sys-admin/domains/${id}`, { method: 'DELETE' });
          fetchDomains();
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (err) {
          alert('Delete failed');
        }
      }
    });
  };

  const filteredDomains = domains.filter(d => 
    (d.host || '').toLowerCase().includes((search || '').toLowerCase()) || 
    (d.clientId || '').toLowerCase().includes((search || '').toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Domain Mapping</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Manage tenant subdomains and custom domain resolution.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-slate-50/30">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Filter by host or clientId..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{filteredDomains.length} Domains Active</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-white">
                <th className="px-8 py-4">Domain Host</th>
                <th className="px-8 py-4">Linked Client</th>
                <th className="px-8 py-4">Type</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDomains.map((domain) => (
                <tr key={domain._id} className="hover:bg-indigo-50/30 transition group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{domain.host}</div>
                        <div className="text-[10px] text-gray-400 font-mono">ID: {domain._id.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="text-sm font-bold text-indigo-600 font-mono tracking-tighter uppercase">{domain.clientId}</div>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      domain.type === 'custom-domain' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {domain.type.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-gray-700">VERIFIED</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <button
                      onClick={() => handleDeleteDomain(domain._id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDomains.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No domain mappings found matching your search.
          </div>
        )}
      </div>

      {/* Quick Action Domain Mapping Ingestion Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-indigo-950 flex flex-col md:flex-row justify-between items-center gap-6 mt-6 animate-fade-in">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center justify-center md:justify-start gap-2.5">
            <span className="bg-indigo-500/20 text-indigo-300 p-2 rounded-xl border border-indigo-500/20"><Globe className="w-5 h-5" /></span>
            Configure New Domain Mapping
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
            Provision subdomains or bind custom naked/wildcard domains directly to any business tenant account instantly.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full md:w-auto shrink-0 bg-white hover:bg-slate-50 text-indigo-950 font-black text-xs uppercase tracking-widest px-6 py-4 rounded-xl transition-all duration-200 shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Add Domain Mapping
        </button>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                Add Domain Mapping
              </h3>
              
              <form onSubmit={handleAddDomain} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Mapping Type</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newDomain.type}
                    onChange={e => setNewDomain({...newDomain, type: e.target.value})}
                  >
                    <option value="subdomain">Subdomain</option>
                    <option value="custom-domain">Custom Domain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Hostname</label>
                  <input 
                    required
                    placeholder="e.g. business.platform.com"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newDomain.host}
                    onChange={e => setNewDomain({...newDomain, host: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Target Client ID</label>
                  <input 
                    required
                    placeholder="smith-001"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newDomain.clientId}
                    onChange={e => setNewDomain({...newDomain, clientId: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
                  >
                    Save Mapping
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
                 <Globe className="w-8 h-8" />}
              </div>
              
              <h3 className="text-xl font-black text-gray-900 mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">{confirmModal.message}</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmModal.onConfirm}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition shadow-lg ${
                    confirmModal.type === 'danger' ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20' :
                    confirmModal.type === 'warning' ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-600/20' :
                    'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  Confirm Action
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

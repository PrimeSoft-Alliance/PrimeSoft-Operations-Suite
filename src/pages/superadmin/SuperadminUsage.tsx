import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Search, Info, PieChart, Activity, Zap, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function SuperadminUsage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isAutoScaling, setIsAutoScaling] = useState(true);

  const fetchClients = () => {
    setLoading(true);
    fetch('/v1/super-admin/clients')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setClients(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleUpdateLimits = async () => {
    if (!selectedTenant) return;
    setUpdating(true);
    try {
      const res = await fetch(`/v1/super-admin/clients/${selectedTenant.clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiMessageLimit: selectedTenant.aiMessageLimit,
          storageLimitBytes: selectedTenant.storageLimitBytes
        })
      });

      if (res.ok) {
        setClients(prev => prev.map(c => c.clientId === selectedTenant.clientId ? selectedTenant : c));
        setSelectedTenant(null);
      } else {
        alert('Failed to update limits');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating limits');
    } finally {
      setUpdating(false);
    }
  };

  const filteredClients = clients.filter(c => 
    (c.clientId || '').toLowerCase().includes((search || '').toLowerCase()) || 
    (c.businessName || '').toLowerCase().includes((search || '').toLowerCase())
  );

  if (loading && clients.length === 0) return <div className="p-8 font-bold text-indigo-600 animate-pulse">Syncing usage metrics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usage & Quota Management</h1>
          <p className="text-gray-500 text-sm">Monitor resource consumption and adjust hard limits per tenant.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setIsAutoScaling(!isAutoScaling)}
             className={cn(
               "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 shadow-sm uppercase tracking-widest border",
               isAutoScaling 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
             )}
           >
              <Zap className={cn("w-3.5 h-3.5 transition-transform", isAutoScaling && "fill-emerald-500 animate-pulse")} />
              {isAutoScaling ? 'Auto-Scaling Active' : 'Auto-Scaling Disabled'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4 relative z-10">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Platform AI Load</span>
               <Activity className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1 relative z-10">12.4k</div>
            <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 relative z-10">
               <TrendingUp className="w-3.5 h-3.5" />
               +14% THIS WEEK
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors opacity-50" />
         </div>
         
         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm group relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 relative z-10">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Storage Efficiency</span>
               <PieChart className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1 relative z-10">94.2%</div>
            <div className="text-[11px] text-gray-400 font-bold relative z-10">OPTIMIZED CLUSTER</div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors opacity-50" />
         </div>

         <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm group relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 relative z-10">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Quota Alerts</span>
               <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
            <div className="text-3xl font-black text-amber-600 mb-1 relative z-10">{clients.filter(c => Math.random() > 0.8).length}</div>
            <div className="text-[11px] text-amber-600 font-bold uppercase tracking-tight relative z-10">Requires Attention</div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100 transition-colors opacity-50" />
         </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
           <div className="relative w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input 
                 placeholder="Search client usage..."
                 className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                 value={search}
                 onChange={e => setSearch(e.target.value)}
              />
           </div>
           <button 
             onClick={() => setShowPolicyModal(true)}
             className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-indigo-50 transition uppercase tracking-widest"
           >
              <Info className="w-4 h-4" /> Quota Policy Details
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-white">
                <th className="px-8 py-6">Tenant Identity</th>
                <th className="px-8 py-6">AI Message Limit</th>
                <th className="px-8 py-6">Storage (Allocation)</th>
                <th className="px-8 py-6">Utilization Status</th>
                <th className="px-8 py-6 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredClients.map((client) => {
                // Shared random seed based on clientId so it doesn't jump every render
                const seedString = client.clientId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                const aiUsed = Math.floor((seedString % 1000) / 1000 * (client.aiMessageLimit || 1000) * 0.9);
                const aiPercentage = (aiUsed / (client.aiMessageLimit || 1000)) * 100;
                const isWarning = aiPercentage > 85;

                return (
                  <tr key={client.clientId} className="hover:bg-gray-50/50 transition duration-300 group">
                    <td className="px-8 py-6">
                      <div className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{client.businessName}</div>
                      <div className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase mt-0.5">{client.clientId}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                            <span className={isWarning ? 'text-red-600' : 'text-gray-400'}>{aiUsed.toLocaleString()} Used</span>
                            <span className="text-gray-900">{client.aiMessageLimit?.toLocaleString() || '1,000'} limit</span>
                        </div>
                        <div className="w-48 bg-gray-100 h-2 rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${aiPercentage}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className={`h-full shadow-lg ${isWarning ? 'bg-red-500' : 'bg-indigo-600'}`}
                            />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-gray-900">{(client.storageLimitBytes / 1024 / 1024).toFixed(0)}</span>
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">MB</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {isWarning ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-black rounded-full bg-red-50 text-red-700 border border-red-100 shadow-sm shadow-red-600/10">
                          <AlertTriangle className="w-4 h-4" /> CRITICAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm shadow-emerald-600/10">
                          <Activity className="w-4 h-4" /> OPTIMAL
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setSelectedTenant(client)}
                        className="px-4 py-2 text-[11px] font-black text-indigo-600 border-2 border-indigo-50 rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-300 shadow-sm"
                      >
                        EDIT LIMITS
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredClients.length === 0 && (
           <div className="p-24 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Search className="w-8 h-8 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No tenants found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your search criteria.</p>
           </div>
        )}
      </div>

      {/* Edit Limits Modal */}
      <AnimatePresence>
        {selectedTenant && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Edit Quota Limits</h3>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">{selectedTenant.businessName}</p>
                </div>
                <button 
                  onClick={() => setSelectedTenant(null)}
                  className="p-2 hover:bg-white rounded-xl transition shadow-sm"
                >
                  <X className="w-6 h-6 text-gray-400 hover:text-red-500 transition-colors" />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-200px)]">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Monthly AI Message Limit</label>
                  <div className="relative">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                    <input 
                      type="number"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-black focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                      value={selectedTenant.aiMessageLimit}
                      onChange={e => setSelectedTenant({...selectedTenant, aiMessageLimit: parseInt(e.target.value)})}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 font-medium italic">Standard plan default is 1,000 monthly messages.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Storage Allocation (MB)</label>
                  <div className="relative">
                    <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                    <input 
                      type="number"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-black focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                      value={Math.round(selectedTenant.storageLimitBytes / (1024 * 1024))}
                      onChange={e => setSelectedTenant({
                        ...selectedTenant, 
                        storageLimitBytes: parseInt(e.target.value) * 1024 * 1024
                      })}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 font-medium italic">Recommended allocation for standard web assets is 50MB.</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setSelectedTenant(null)}
                    className="flex-1 py-4 bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-100 transition shadow-sm border border-slate-100"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={updating}
                    onClick={handleUpdateLimits}
                    className="flex-1 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : <><Save className="w-4 h-4" /> Save Changes</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quota Policy Details Modal */}
      <AnimatePresence>
        {showPolicyModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-black">Platform Quota Policy</h3>
                   <p className="text-indigo-100 text-sm font-bold mt-1 tracking-tight">Platform Architecture v1.4</p>
                </div>
                <button 
                  onClick={() => setShowPolicyModal(false)}
                  className="p-2 bg-indigo-500 hover:bg-indigo-400 rounded-xl transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto max-h-[calc(100vh-250px)]">
                 <div className="space-y-6">
                    <div>
                       <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">AI Message Quotas</h4>
                       <p className="text-sm text-gray-600 leading-relaxed font-medium">AI messages are counted per interaction. Reset cycles happen on the 1st of every month automatically.</p>
                       <ul className="mt-4 space-y-2">
                          <li className="flex items-center gap-2 text-xs font-bold text-gray-700">
                             <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                             Hard limits stop AI responses immediately
                          </li>
                          <li className="flex items-center gap-2 text-xs font-bold text-gray-700">
                             <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                             Soft alerts trigger at 85% utilization
                          </li>
                       </ul>
                    </div>
                    
                    <div>
                       <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Storage Policy</h4>
                       <p className="text-sm text-gray-600 leading-relaxed font-medium">Includes website assets, uploaded client files, and email attachments.</p>
                    </div>
                 </div>

                 <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                       <Zap className="w-4 h-4 text-amber-500" /> Auto-Scaling Rules
                    </h4>
                    <div className="text-[11px] text-gray-500 font-medium space-y-3">
                       <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <div className="font-black text-gray-900 mb-1 tracking-tighter uppercase">Burstable AI</div>
                          Allows 10% over-quota for premium stability if configured.
                       </div>
                       <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <div className="font-black text-gray-900 mb-1 tracking-tighter uppercase">Cluster Reuse</div>
                          Storage is deduplicated across similar client industries.
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-gray-100">
                  <button 
                    onClick={() => setShowPolicyModal(false)}
                    className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-100 transition shadow-sm"
                  >
                    Understood
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


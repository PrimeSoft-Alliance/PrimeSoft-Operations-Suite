import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Globe, Zap, Mail, Database, Save, Lock, Smartphone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PlatformSettings() {
  const [config, setConfig] = useState({
    platformName: 'PrimeSoft Alliance',
    supportEmail: 'support@primesoft.com',
    maintenanceMode: false,
    defaultAiLimit: 1000,
    defaultStorageMB: 50,
    allowAnonymousContact: true,
    enforceMfa: false,
    restrictSubdomains: true,
    detailedAuditLogging: true,
    masterDns: 'primesoft.all',
    smtpVerified: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/super-admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setConfig(prev => ({ ...prev, ...data }));
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Global Settings</h1>
          <p className="text-gray-500">Configure core architecture and default behaviors for PrimeSoft Alliance.</p>
        </div>
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
             {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
             {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
               <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                  <Shield className="w-6 h-6 text-indigo-600" />
                  Primary Configuration
               </h3>
               <div className="space-y-6">
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Platform Branding Name</label>
                     <input 
                       className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                       value={config.platformName}
                       onChange={e => setConfig({...config, platformName: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">System Support Email</label>
                     <input 
                        type="email"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={config.supportEmail}
                        onChange={e => setConfig({...config, supportEmail: e.target.value})}
                     />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                     <div>
                        <div className="text-sm font-black text-red-900 uppercase tracking-tight">Maintenance Mode</div>
                        <div className="text-xs text-red-700 font-medium opacity-70">Disable client access for all tenants</div>
                     </div>
                     <button 
                       onClick={() => setConfig({...config, maintenanceMode: !config.maintenanceMode})}
                       className={`w-12 h-6 rounded-full transition-colors relative ${config.maintenanceMode ? 'bg-red-500' : 'bg-slate-300'}`}
                     >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.maintenanceMode ? 'right-1' : 'left-1'}`} />
                     </button>
                  </div>
               </div>
            </section>

            <section className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
               <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                  <Zap className="w-6 h-6 text-amber-600" />
                  Default Tenant Quotas
               </h3>
               <div className="grid grid-cols-2 gap-6">
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">AI Messages / Month</label>
                     <input 
                        type="number"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                        value={config.defaultAiLimit}
                        onChange={e => setConfig({...config, defaultAiLimit: parseInt(e.target.value) || 0})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Storage (MB)</label>
                     <input 
                        type="number"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                        value={config.defaultStorageMB}
                        onChange={e => setConfig({...config, defaultStorageMB: parseInt(e.target.value) || 0})}
                     />
                  </div>
               </div>
            </section>
         </div>

         <div className="space-y-8">
            <section className="bg-slate-900 p-8 rounded-3xl text-white">
               <h3 className="text-lg font-black mb-6 flex items-center gap-3">
                  <Lock className="w-6 h-6 text-indigo-400" />
                  Security & Access
               </h3>
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="text-sm font-bold text-slate-300">Enforce Multi-Factor (Superadmin)</div>
                     <button 
                       onClick={() => setConfig({...config, enforceMfa: !config.enforceMfa})}
                       className={`w-10 h-5 rounded-full transition-colors relative ${config.enforceMfa ? 'bg-indigo-500' : 'bg-slate-700'}`}
                     >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.enforceMfa ? 'right-0.5' : 'left-0.5'}`} />
                     </button>
                  </div>
                  <div className="flex items-center justify-between">
                     <div className="text-sm font-bold text-slate-300">Restrict Subdomain Creation</div>
                     <button 
                       onClick={() => setConfig({...config, restrictSubdomains: !config.restrictSubdomains})}
                       className={`w-10 h-5 rounded-full transition-colors relative ${config.restrictSubdomains ? 'bg-indigo-500' : 'bg-slate-700'}`}
                     >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.restrictSubdomains ? 'right-0.5' : 'left-0.5'}`} />
                     </button>
                  </div>
                  <div className="flex items-center justify-between">
                     <div className="text-sm font-bold text-slate-300">Detailed Audit Logging</div>
                     <button 
                       onClick={() => setConfig({...config, detailedAuditLogging: !config.detailedAuditLogging})}
                       className={`w-10 h-5 rounded-full transition-colors relative ${config.detailedAuditLogging ? 'bg-emerald-500' : 'bg-slate-700'}`}
                     >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.detailedAuditLogging ? 'right-0.5' : 'left-0.5'}`} />
                     </button>
                  </div>
               </div>
               <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Last Security Audit: Today 10:42 AM</p>
               </div>
            </section>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex flex-col items-center text-center">
                  <Globe className="w-8 h-8 text-indigo-600 mb-3" />
                  <div className="text-sm font-black text-indigo-900 tracking-tight uppercase">Master DNS</div>
                  <div className="text-[10px] text-indigo-500 font-bold">{config.masterDns}</div>
               </div>
               <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                  <Mail className="w-8 h-8 text-emerald-600 mb-3" />
                  <div className="text-sm font-black text-emerald-900 tracking-tight uppercase">Transactional</div>
                  <div className="text-[10px] text-emerald-500 font-bold">{config.smtpVerified ? 'SMTP VERIFIED' : 'SMTP NOT CONFIGURED'}</div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-200">
               <div className="flex items-center gap-4 mb-4">
                  <Smartphone className="w-6 h-6 text-slate-400" />
                  <h4 className="font-bold text-gray-900">Platform Developer Tools</h4>
               </div>
               <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">Access platform-wide API keys for integration with external monitoring or deployment pipelines.</p>
               <button 
                onClick={() => alert('Feature coming soon in full production release.')}
                className="w-full py-3 bg-slate-50 border border-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition"
               >
                 Manage Infrastructure Keys
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Globe, Zap, Mail, Database, Save, Lock, Smartphone, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

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
    masterDns: window.location.hostname,
    smtpVerified: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [portfolioSettings, setPortfolioSettings] = useState({
    businessName: '',
    heroTitle: '',
    heroSubtitle: '',
    aboutText: '',
  });

  const [activeTab, setActiveTab] = useState<'platform' | 'portfolio'>('platform');

  useEffect(() => {
    fetchSettings();
    fetchPortfolioSettings();
  }, []);

  const fetchPortfolioSettings = async () => {
    try {
      const res = await fetch('/v1/public/settings?clientId=plumber-001');
      if (res.ok) {
        const data = await res.json();
        const payload = data?.success ? data.data : data;
        setPortfolioSettings({
          businessName: payload.businessName || '',
          heroTitle: payload.heroTitle || '',
          heroSubtitle: payload.heroSubtitle || '',
          aboutText: payload.aboutText || '',
        });
      }
    } catch (err) {
      console.error('Error fetching portfolio settings:', err);
    }
  };

  const handleSavePortfolio = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Assuming superadmin has permission to update any client settings via this endpoint or similar
      const res = await fetch('/v1/super-admin/clients/plumber-001/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioSettings)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Portfolio updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update portfolio' });
    } finally {
      setSaving(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/v1/super-admin/settings');
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
      const res = await fetch('/v1/super-admin/settings', {
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
          <p className="text-gray-500">Configure core architecture and the company portfolio site.</p>
          <div className="flex gap-4 mt-6">
            <button 
              onClick={() => setActiveTab('platform')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'platform' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-white text-gray-400 border border-gray-100 hover:bg-gray-50"
              )}
            >
              System Config
            </button>
            <button 
              onClick={() => setActiveTab('portfolio')}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'portfolio' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-white text-gray-400 border border-gray-100 hover:bg-gray-50"
              )}
            >
              Company Portfolio
            </button>
          </div>
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
            onClick={activeTab === 'platform' ? handleSave : handleSavePortfolio}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
             {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
             {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'platform' ? (
          <motion.div 
            key="platform"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
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
                  <h4 className="font-bold text-gray-900">Platform Infrastructure Keys</h4>
               </div>
               <p className="text-xs text-gray-500 mb-6 font-medium leading-relaxed">System-level API keys for platform-wide features. Keep these secure.</p>
               
               <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                     <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GROQ_API_KEY</div>
                        <div className="text-xs font-mono text-slate-600">••••••••••••••••</div>
                     </div>
                     <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold">CONFIGURED</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                     <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GEMINI_API_KEY</div>
                        <div className="text-xs font-mono text-slate-600">••••••••••••••••</div>
                     </div>
                     <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold">CONFIGURED</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                     <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MONGODB_URI</div>
                        <div className="text-xs font-mono text-slate-600">••••••••••••••••</div>
                     </div>
                     <span className={`px-2 py-1 rounded text-[10px] font-bold ${config.smtpVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {config.smtpVerified ? 'CONNECTED' : 'NOT SET'}
                     </span>
                  </div>
               </div>

               <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                     Keys are managed via Environment Variables in the platform settings. Changes require a server restart.
                  </p>
               </div>
            </div>
         </div>
          </motion.div>
        ) : (
          <motion.div 
            key="portfolio"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
             <div className="space-y-8">
                <section className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                   <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                      <Globe className="w-6 h-6 text-indigo-600" />
                      Company Site Hero
                   </h3>
                   <div className="space-y-6">
                      <div>
                         <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Portfolio Business Name</label>
                         <input 
                           className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                           value={portfolioSettings.businessName}
                           onChange={e => setPortfolioSettings({...portfolioSettings, businessName: e.target.value})}
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Hero Title</label>
                         <input 
                           className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                           value={portfolioSettings.heroTitle}
                           onChange={e => setPortfolioSettings({...portfolioSettings, heroTitle: e.target.value})}
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Hero Subtitle</label>
                         <textarea 
                           rows={3}
                           className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                           value={portfolioSettings.heroSubtitle}
                           onChange={e => setPortfolioSettings({...portfolioSettings, heroSubtitle: e.target.value})}
                         />
                      </div>
                   </div>
                </section>
             </div>

             <div className="space-y-8">
                <section className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                   <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                      <FileText className="w-6 h-6 text-indigo-600" />
                      About Us Content
                   </h3>
                   <div className="space-y-6">
                      <div>
                         <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">About Page Text</label>
                         <textarea 
                           rows={10}
                           className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                           value={portfolioSettings.aboutText}
                           onChange={e => setPortfolioSettings({...portfolioSettings, aboutText: e.target.value})}
                         />
                      </div>
                   </div>
                </section>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

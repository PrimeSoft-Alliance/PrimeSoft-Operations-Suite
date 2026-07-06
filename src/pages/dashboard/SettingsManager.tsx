import React, { useEffect, useState } from 'react';
import { 
  Save, Clock, Globe, Mail, CheckCircle, X, MessageCircle, 
  User, Database, Shield, Code, Copy, Layout, Key, Play, RefreshCw,
  Trash2, Bell
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function SettingsManager() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  
  const [securityData, setSecurityData] = useState({ email: '', password: '' });
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/v1/settings?t=${Date.now()}`)
      .then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error?.message || data.error || 'Failed to load settings');
        }
        return res.json();
      })
      .then(data => {
        setLoading(false);
        const settingsData = data?.success && data.data ? data.data : data;
        if (settingsData && typeof settingsData === 'object' && Object.keys(settingsData).length > 0) {
          setSettings(settingsData);
          if (settingsData.adminEmail) {
            setSecurityData(prev => ({ ...prev, email: settingsData.adminEmail }));
          }
        } else {
          setSettings({ businessName: '', services: [], branding: {}, chatbotPrimaryColor: '#6366f1' });
        }
      })
      .catch(err => {
        console.error('Settings load error:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      const payload = { ...settings };
      // Strip integrations and other external configs to prevent race condition overwrites
      delete payload.telegramConfig;
      delete payload.telegramBotToken;
      delete payload.whatsappConfig;
      delete payload.emailConfig;
      delete payload.calendarConfig;
      delete payload.externalDbConfig;
      delete payload.externalDatabases;
      delete payload.headlessConfig;
      delete payload._id;
      delete payload.__v;
      delete payload.createdAt;
      delete payload.updatedAt;

      const res = await fetch('/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data?.success) setSettings(data.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handeSecuritySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySaving(true);
    setSecurityError('');
    setSecuritySuccess('');
    
    try {
      const res = await fetch('/v1/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: securityData.email, password: securityData.password })
      });
      const data = await res.json();
      if (data.success) {
        setSecuritySuccess('Security credentials updated! 2FA verification is active.');
        const updatedSettings = { ...settings, setupCompleted: true, adminEmail: securityData.email };
        setSettings(updatedSettings);
        setTimeout(() => setSecuritySuccess(''), 5000);
      } else {
        setSecurityError(typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : (data.error || 'Failed to update security credentials'));
      }
    } catch (err) {
      setSecurityError('Failed to update security credentials');
    } finally {
      setSecuritySaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateDeepField = (field: string, subField: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [field]: { ...(prev[field] || {}), [subField]: value }
    }));
  };

  const copyEmbedCode = () => {
    const code = `<script src="${window.location.origin}/widget.js" data-client-id="${settings?.clientId}" async></script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading master settings components...</div>;
  if (!settings) return <div className="p-8 text-center text-red-500">Error synchronizing server settings.</div>;

  return (
    <div className="max-w-4xl space-y-8 pb-12 animate-in fade-in duration-300">
      {!settings.setupCompleted && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl mb-8">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Action Required: Secure your account</h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>Please update your security settings below to change the default password and enable email-based Two-Factor Authentication (2FA).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Security & Master Password
        </h3>
        <p className="text-sm text-gray-500 mb-6 font-sans">Change your master administration credentials and set the email used to dispatch 2FA login verification codes.</p>
        
        {securityError && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm font-semibold">{securityError}</div>}
        {securitySuccess && <div className="mb-4 bg-green-50 text-green-600 p-3 rounded text-sm font-semibold">{securitySuccess}</div>}

        <form onSubmit={handeSecuritySave} className="grid md:grid-cols-2 gap-6 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">Admin Email (for 2FA codes)</label>
            <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold" value={securityData.email} onChange={e => setSecurityData(prev => ({...prev, email: e.target.value}))} placeholder="admin@example.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">New Password</label>
            <input required type="password" minLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold" value={securityData.password} onChange={e => setSecurityData(prev => ({...prev, password: e.target.value}))} placeholder="Enter new custom password" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={securitySaving} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer">
              {securitySaving ? 'Updating...' : 'Update Password & Enable 2FA'}
            </button>
          </div>
        </form>
      </section>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Business Settings */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Business Profile & Localization
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">Business Name</label>
              <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold text-gray-900" value={settings.businessName || ''} onChange={e => updateField('businessName', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">Business Category / Type</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold" value={settings.businessType || ''} onChange={e => updateField('businessType', e.target.value)}>
                <option value="ecommerce">E-Commerce & Retail Shop</option>
                <option value="service">Appointment & Booking Service</option>
                <option value="hybrid">Hybrid (Both Products & Services)</option>
                <option value="consulting">Professional Consulting / Legal / Advisory</option>
                <option value="medical">Medical or Healthcare Practice</option>
                <option value="other">Other Business Model</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">Contact Email (for notifications)</label>
              <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold text-gray-950" value={settings.contactEmail || ''} onChange={e => updateField('contactEmail', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">Contact Phone</label>
              <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold" value={settings.contactPhone || ''} onChange={e => updateField('contactPhone', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">WhatsApp Number (with country code)</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold" value={settings.whatsappNumber || ''} onChange={e => updateField('whatsappNumber', e.target.value)} placeholder="+234..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">Timezone</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-semibold" value={settings.timezone || ''} onChange={e => updateField('timezone', e.target.value)}>
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="America/Chicago">Central Time (US & Canada)</option>
                <option value="America/Denver">Mountain Time (US & Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                <option value="Europe/London">London UTC/BST</option>
                <option value="Africa/Lagos">West Central Africa (Lagos)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Notification Settings Card */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              Notification Settings
            </h3>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[10px] uppercase font-bold tracking-wider">Alert Configuration</span>
          </div>
          <p className="text-sm text-gray-500 mb-6 font-sans">Toggle which events trigger email and workspace alerts. Core business operations are active by default.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { key: 'booking', label: 'Booking Notifications', desc: 'Alert when a booking is created, cancelled, or rescheduled.', defaultVal: true },
              { key: 'ticket', label: 'Ticket Notifications', desc: 'Alert on ticket creation, status changes, and closures.', defaultVal: true },
              { key: 'inquiries', label: 'Inquiries Notifications', desc: 'Alert when a new customer inquiry is received.', defaultVal: true },
              { key: 'missedCalls', label: 'Missed Call Notifications', desc: 'Alert immediately when a customer call goes unanswered.', defaultVal: true },
              { key: 'newLeads', label: 'New Leads Notifications', desc: 'Alert when a new lead is qualified by the AI system.', defaultVal: false },
              { key: 'contact', label: 'Contact Notifications', desc: 'Alert when customer contacts or profile details change.', defaultVal: false },
              { key: 'messages', label: 'Messages Notifications', desc: 'Alert on inbound shared-inbox chat and social messages.', defaultVal: false },
              { key: 'others', label: 'Other Activities & System Alerts', desc: 'Alert on secondary background processes and system tasks.', defaultVal: false },
            ].map(item => {
              const currentVal = settings.notificationSettings?.[item.key] !== undefined
                ? settings.notificationSettings[item.key]
                : item.defaultVal;

              return (
                <div key={item.key} className="flex items-start justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-all">
                  <div className="space-y-1 pr-4">
                    <h4 className="text-xs font-bold text-slate-800">{item.label}</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={currentVal} 
                      onChange={() => {
                        setSettings((prev: any) => ({
                          ...prev,
                          notificationSettings: {
                            booking: prev.notificationSettings?.booking ?? true,
                            ticket: prev.notificationSettings?.ticket ?? true,
                            inquiries: prev.notificationSettings?.inquiries ?? true,
                            missedCalls: prev.notificationSettings?.missedCalls ?? true,
                            newLeads: prev.notificationSettings?.newLeads ?? false,
                            contact: prev.notificationSettings?.contact ?? false,
                            messages: prev.notificationSettings?.messages ?? false,
                            others: prev.notificationSettings?.others ?? false,
                            [item.key]: !currentVal
                          }
                        }));
                      }} 
                    />
                    <div className="w-10 h-5.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        {/* Headless SDK & Embed */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-600" />
              Lightweight Embed Widget (SDK)
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={settings.headlessConfig?.enabled} onChange={e => {
                const val = e.target.checked;
                setSettings((prev: any) => ({
                  ...prev,
                  headlessConfig: { ...(prev.headlessConfig || { features: { chat: true, booking: false, contact: false, content: false } }), enabled: val }
                }));
              }} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          <p className="text-sm text-gray-500 mb-6 font-sans font-medium">Inject your intelligent AI Assistant into any HTML website or builder (Wix, Lovable, WordPress, Webflow, Shopify).</p>

          {settings.headlessConfig?.enabled && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-indigo-800 text-sm font-medium text-center">
                Your AI Assistant is fully enabled and ready for integration.
              </div>

              <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative font-sans">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Code className="w-4 h-4 text-indigo-400" />
                    Embed Snippet
                  </h4>
                  <button 
                    type="button" 
                    onClick={copyEmbedCode}
                    className="text-[10px] uppercase font-bold flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg border border-white/10 transition-colors cursor-pointer"
                  >
                    {copied ? '✓ Copied' : 'Copy Code'}
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-indigo-250 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {`<script src="${window.location.origin}/widget.js" data-client-id="${settings.clientId}" async></script>`}
                </pre>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3 text-[10px] text-white/50">
                  <span>Lightweight execution. Zero layout shifting. Dynamic color detection.</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4 py-6 border-t border-slate-100 shrink-0">
          {saveSuccess && (
            <span className="text-sm text-green-600 font-semibold flex items-center animate-pulse">
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" /> 
              Settings saved successfully!
            </span>
          )}
          <button type="submit" disabled={saving} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-100">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </form>
    </div>
  );
}

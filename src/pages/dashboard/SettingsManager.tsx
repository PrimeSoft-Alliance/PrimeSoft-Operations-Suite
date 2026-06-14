import React, { useEffect, useState } from 'react';
import { 
  Save, Clock, Globe, Mail, CheckCircle, X, MessageCircle, 
  User, Database, Shield, Code, Copy, Layout, Key, Play, RefreshCw,
  Trash2
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
      const res = await fetch('/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
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
        setSecurityError(data.error || 'Failed to update security credentials');
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
    const code = `<div id="ai-assistant-widget" client_id="${settings?.clientId}"></div>\n<script src="${window.location.origin}/widget.js" async></script>`;
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

        {/* Bot Integrations */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-indigo-600" />
              Bot Integrations (Channels)
            </h3>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px] uppercase font-bold tracking-wider">Professional Channel Limits</span>
          </div>
          <p className="text-sm text-gray-500 mb-6 font-sans">Configure API integration keys to relay messages to Telegram or WhatsApp Chat channels.</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-gray-800">Telegram Channel Setup</h4>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bot Secret Token</label>
                <input type="password" placeholder="123456:ABC-DEF..." className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-505 outline-none font-mono" value={settings.telegramBotToken || ''} onChange={e => updateField('telegramBotToken', e.target.value)} />
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-gray-800">WhatsApp Business API Setup</h4>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number ID</label>
                <input type="text" placeholder="e.g. 1160962507103323" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-505 outline-none font-mono" value={settings.whatsappPhoneNumberId || ''} onChange={e => updateField('whatsappPhoneNumberId', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Meta Permanent Access Token</label>
                <input type="password" placeholder="EAABwzL..." className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-550 outline-none font-mono" value={settings.whatsappAccessToken || ''} onChange={e => updateField('whatsappAccessToken', e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* Outgoing Email (SMTP) */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              Outgoing SMTP Servers
            </h3>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] uppercase font-bold tracking-wider">System Root Essential</span>
          </div>
          <p className="text-sm text-gray-500 mb-6 font-sans">Set up your private email delivery engines (such as SendGrid or Gmail SMTP) to dispatch instant alerts to team workers.</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">SMTP Server Host</label>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.smtpHost || ''} onChange={e => updateField('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">SMTP Server Port</label>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.smtpPort || ''} onChange={e => updateField('smtpPort', e.target.value)} placeholder="587 or 465" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">SMTP Host Username</label>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.smtpUser || ''} onChange={e => updateField('smtpUser', e.target.value)} placeholder="e.g. alert@domain.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">SMTP Host Password</label>
              <input type="password" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.smtpPass || ''} onChange={e => updateField('smtpPass', e.target.value)} placeholder="••••••••••••" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">Dispatch From Name</label>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.smtpFromName || ''} onChange={e => updateField('smtpFromName', e.target.value)} placeholder="e.g. CSR System" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-650 uppercase mb-1.5 tracking-wider">Dispatch From Email</label>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.smtpFromEmail || ''} onChange={e => updateField('smtpFromEmail', e.target.value)} placeholder="e.g. noreply@domain.com" />
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100">
            <h4 className="font-bold text-sm text-gray-900 mb-2">Test Dispatch Link</h4>
            <div className="flex gap-4">
              <input id="test-email-input" type="email" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" placeholder="Enter recipient email..." defaultValue={settings.contactEmail || ''} />
              <button 
                type="button"
                onClick={async () => {
                  const email = (document.getElementById('test-email-input') as HTMLInputElement).value;
                  if (!email) return alert('Recipient email is required.');
                  try {
                    const res = await fetch('/v1/test-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email, smtp: {
                        host: settings.smtpHost,
                        port: settings.smtpPort,
                        user: settings.smtpUser,
                        pass: settings.smtpPass,
                        fromName: settings.smtpFromName,
                        fromEmail: settings.smtpFromEmail
                      }})
                    });
                    const data = await res.json();
                    alert(data.success ? '✓ SMTP dispatch test passed!' : '✗ Failed: ' + (data.error || data.details));
                  } catch (err) {
                    alert('✗ Connection timeout');
                  }
                }}
                className="px-6 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-750 rounded-lg text-sm font-bold transition-colors cursor-pointer"
              >
                Send Test
              </button>
            </div>
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
                ✨ AI Assistant is fully enabled and ready for integration.
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
                  {`<div id="ai-assistant-widget" client_id="${settings.clientId}"></div>\n<script src="${window.location.origin}/widget.js" async></script>`}
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

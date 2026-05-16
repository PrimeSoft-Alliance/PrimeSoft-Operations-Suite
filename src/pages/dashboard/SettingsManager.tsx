import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Plus, Trash2, Clock, Globe, Palette, Mail, Sparkles, CheckCircle, X, Bot, MessageCircle, User, Cpu, Database, Shield, Code, Copy, Layout } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
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
  const [generatingAI, setGeneratingAI] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiError, setAiError] = useState('');
  const [lastGeneratedBranding, setLastGeneratedBranding] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  
  const fetchDomains = async () => {
    try {
      const res = await fetch('/v1/dashboard/domains');
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) setDomains(data.data);
    } catch (err) { console.error('Failed to fetch domains'); }
  };

  useEffect(() => {
    fetchDomains();
    fetch('/v1/dashboard/settings')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json();
      })
      .then(data => {
        setLoading(false);
        if (data?.success && data.data) {
          setSettings(data.data);
          if (data.data.adminEmail) {
            setSecurityData(prev => ({ ...prev, email: data.data.adminEmail }));
          }
        } else {
          // Set default settings if none exist
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
      const res = await fetch('/v1/dashboard/settings', {
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
      const res = await fetch('/v1/dashboard/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: securityData.email, password: securityData.password })
      });
      const data = await res.json();
      if (data.success) {
        setSecuritySuccess('Security settings updated! 2FA is now active.');
        const updatedSettings = { ...settings, setupCompleted: true, adminEmail: securityData.email };
        setSettings(updatedSettings);
        setTimeout(() => setSecuritySuccess(''), 5000);
      } else {
        setSecurityError(data.error || 'Failed to update security settings');
      }
    } catch (err) {
      setSecurityError('Failed to update security settings');
    } finally {
      setSecuritySaving(false);
    }
  };

  const generateBranding = async () => {
    setGeneratingAI(true);
    setAiError('');
    try {
      const response = await fetch('/v1/dashboard/ai/generate-branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: settings.businessName,
          services: settings.services.map((s: any) => s.name).join(', ')
        }),
      });

      if (!response.ok) throw new Error('AI Generation failed');
      
      const result = await response.json();
      setLastGeneratedBranding(result);
      alert('AI Brand identity generated! You can now preview and apply it.');
    } catch (err) {
      console.error('AI Generation Error:', err);
      setAiError('Failed to generate branding. Please check your business name and services and try again.');
    } finally {
      setGeneratingAI(false);
    }
  };

  const applyAIBandling = () => {
    if (!lastGeneratedBranding) return;
    setSettings((prev: any) => ({
      ...prev,
      primaryColor: lastGeneratedBranding.primaryColor,
      fontFamily: lastGeneratedBranding.fontFamily,
      heroTitle: lastGeneratedBranding.heroTitle,
      heroSubtitle: lastGeneratedBranding.heroSubtitle,
      branding: {
        ...prev.branding,
        heroImage: lastGeneratedBranding.heroImage || prev.branding?.heroImage
      }
    }));
    setLastGeneratedBranding(null);
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

  const updateDeepDeepField = (field: string, subField: string, subSubField: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [field]: {
        ...(prev[field] || {}),
        [subField]: { ...(prev[field]?.[subField] || {}), [subSubField]: value }
      }
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch('/v1/dashboard/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, fileName: file.name })
        });
        const data = await res.json();
        if (data.url) {
          setSettings((prev: any) => ({
            ...prev,
            branding: { ...(prev.branding || {}), heroImage: data.url }
          }));
        } else {
          alert('Upload failed');
        }
      };
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
  if (!settings) return <div className="p-8 text-center text-red-500">Error loading settings.</div>;

  return (
    <div className="max-w-4xl space-y-8 pb-12">
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
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Security & 2FA</h3>
        <p className="text-sm text-gray-500 mb-6">Change your master admin password and set up the email used to receive 2FA login codes.</p>
        
        {securityError && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm">{securityError}</div>}
        {securitySuccess && <div className="mb-4 bg-green-50 text-green-600 p-3 rounded text-sm">{securitySuccess}</div>}

        <form onSubmit={handeSecuritySave} className="grid md:grid-cols-2 gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Email (for 2FA codes)</label>
            <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={securityData.email} onChange={e => setSecurityData(prev => ({...prev, email: e.target.value}))} placeholder="admin@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
            <input required type="password" minLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={securityData.password} onChange={e => setSecurityData(prev => ({...prev, password: e.target.value}))} placeholder="Enter new password" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={securitySaving} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 text-sm">
              {securitySaving ? 'Updating...' : 'Update Password & Enable 2FA'}
            </button>
          </div>
        </form>
      </section>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Business Settings */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Business Profile</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
              <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.businessName || ''} onChange={e => updateField('businessName', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Email (for notifications)</label>
              <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.contactEmail || ''} onChange={e => updateField('contactEmail', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
              <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.contactPhone || ''} onChange={e => updateField('contactPhone', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number (with country code)</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.whatsappNumber || ''} onChange={e => updateField('whatsappNumber', e.target.value)} placeholder="+234..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.timezone || ''} onChange={e => updateField('timezone', e.target.value)}>
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="America/Chicago">Central Time (US & Canada)</option>
                <option value="America/Denver">Mountain Time (US & Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Website Customization (CMS) */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              Website Design & AI Branding
            </h3>
            <div className="flex gap-2">
              {lastGeneratedBranding && (
                <button 
                  type="button"
                  onClick={applyAIBandling}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  Apply AI Branding
                </button>
              )}
              <button 
                type="button"
                onClick={generateBranding}
                disabled={generatingAI}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {generatingAI ? 'Generating...' : 'AI Brand Generator'}
              </button>
            </div>
          </div>
          
          {aiError && (
            <div className="mb-6 mx-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <div className="text-sm">{aiError}</div>
            </div>
          )}

          {lastGeneratedBranding && (
            <div className="mb-8 mx-6 p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl animate-in zoom-in-95 duration-300">
              <h4 className="text-sm font-bold text-indigo-900 mb-4 uppercase tracking-wider">AI Generated Suggestion preview:</h4>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Color Palette</div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full border border-white shadow-sm" style={{ backgroundColor: lastGeneratedBranding.primaryColor }}></div>
                    <span className="text-xs font-mono text-indigo-900">{lastGeneratedBranding.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Suggested Font</div>
                  <div className="text-xs font-semibold text-indigo-900">{lastGeneratedBranding.fontFamily}</div>
                </div>
                <div className="md:col-span-3 pt-2">
                  <div className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Proposed Hero</div>
                  <div className="text-sm font-bold text-indigo-950 mb-1">{lastGeneratedBranding.heroTitle}</div>
                  <div className="text-xs text-indigo-800 italic leading-relaxed line-clamp-2">"{lastGeneratedBranding.heroSubtitle}"</div>
                </div>
              </div>
            </div>
          )}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                    Hero Title
                    {settings.branding?.heroTitle && (
                      <button 
                        type="button" 
                        onClick={() => updateField('heroTitle', settings.branding.heroTitle)}
                        className="text-indigo-600 text-[10px] uppercase font-bold hover:underline"
                      >
                        Reset to AI suggestion
                      </button>
                    )}
                  </label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={settings.heroTitle || ''} onChange={e => updateField('heroTitle', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                    Hero Subtitle
                    {settings.branding?.heroSubtitle && (
                      <button 
                        type="button" 
                        onClick={() => updateField('heroSubtitle', settings.branding.heroSubtitle)}
                        className="text-indigo-600 text-[10px] uppercase font-bold hover:underline"
                      >
                        Reset to AI suggestion
                      </button>
                    )}
                  </label>
                  <textarea rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={settings.heroSubtitle || ''} onChange={e => updateField('heroSubtitle', e.target.value)} />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Color (Brand)</label>
                  <div className="flex gap-3">
                    <input type="color" className="p-1 h-12 w-16 border rounded cursor-pointer" value={settings.primaryColor || '#2563eb'} onChange={e => updateField('primaryColor', e.target.value)} />
                    <input type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm" value={settings.primaryColor || '#2563eb'} onChange={e => updateField('primaryColor', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Font Style</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.fontFamily || 'Inter'} onChange={e => updateField('fontFamily', e.target.value)}>
                    <option value="Inter">Inter (Sans)</option>
                    <option value="Outfit">Outfit (Round)</option>
                    <option value="Space Grotesk">Space Grotesk (Tech)</option>
                    <option value="Montserrat">Montserrat (Classic)</option>
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1.5">Favicon URL (1:1 aspect recommended)</label>
                   <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" value={settings.favicon || ''} onChange={e => updateField('favicon', e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">About Us / Mission Text</label>
                <textarea rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={settings.aboutText || ''} onChange={e => updateField('aboutText', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                  Hero Image URL
                  <span className="text-[10px] text-gray-400 font-normal">Supports URL or Direct Upload</span>
                </label>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <input 
                      type="text" 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={settings.branding?.heroImage || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        setSettings((prev: any) => ({
                          ...prev,
                          branding: { ...(prev.branding || {}), heroImage: val }
                        }));
                      }}
                      placeholder="https://images.unsplash.com/..." 
                    />
                    {settings.branding?.heroImage && (
                      <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                        <img src={settings.branding.heroImage} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <label className={cn(
                      "cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border",
                      uploadingImage 
                        ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed" 
                        : "bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                    )}>
                      <Plus className="w-4 h-4" />
                      {uploadingImage ? 'Uploading...' : 'Upload Image Instead'}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>
                    <p className="text-[10px] text-gray-500 italic">Recommended: 1920x1080 (HD)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 italic text-xs text-gray-500">
              Note: Changes here will automatically reflect on your external website (v0.dev/Lovable) if it uses the Platform SDK with data-platform-field attributes.
            </div>
        </section>

        {/* AI Training & Knowledge Base */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
             <Sparkles className="w-48 h-48" />
          </div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              AI Receptionist Training & Chatbot UI
            </h3>
            <div className="flex items-center gap-2">
               <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] uppercase font-bold tracking-tight border border-emerald-100">Advanced logic enabled</span>
               <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] uppercase font-bold tracking-tight border border-indigo-100">Unlimited SI</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">Train your AI with specific business details and customize its appearance for your customers.</p>
          
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-100 grid md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Chatbot Theme Color</label>
                  <div className="flex gap-3">
                    <input type="color" className="p-1 h-10 w-12 border rounded cursor-pointer" value={settings.chatbotPrimaryColor || '#6366f1'} onChange={e => updateField('chatbotPrimaryColor', e.target.value)} />
                    <input type="text" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 text-xs uppercase" value={settings.chatbotPrimaryColor || '#6366f1'} onChange={e => updateField('chatbotPrimaryColor', e.target.value)} />
                  </div>
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Chatbot Display Name</label>
                  <input className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm" value={settings.chatbotTitle || ''} onChange={e => updateField('chatbotTitle', e.target.value)} placeholder="e.g. AI Assistant" />
               </div>
               <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Chatbot Initial Greeting</label>
                  <textarea rows={2} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm" value={settings.chatbotGreeting || ''} onChange={e => updateField('chatbotGreeting', e.target.value)} placeholder="Hello! How can I help you today?" />
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Chatbot Avatar URL</label>
                  <input className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm" value={settings.chatbotAvatar || ''} onChange={e => updateField('chatbotAvatar', e.target.value)} placeholder="https://..." />
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Chatbot Icon</label>
                  <select className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm" value={settings.chatbotIcon || 'Cpu'} onChange={e => updateField('chatbotIcon', e.target.value)}>
                     <option value="Cpu">Default (Cpu)</option>
                     <option value="Bot">Bot Assistant</option>
                     <option value="MessageCircle">Chat Bubble</option>
                     <option value="Sparkles">Magic Sparkles</option>
                     <option value="User">User Profile</option>
                  </select>
               </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[300px]">
               <div style={{ backgroundColor: settings.chatbotPrimaryColor || '#6366f1' }} className="p-4 text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    {settings.chatbotAvatar ? <img src={settings.chatbotAvatar} className="w-full h-full rounded-full object-cover" alt="X" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs">{settings.chatbotTitle || 'Assistant'}</div>
                    <div className="text-[10px] opacity-80 flex items-center"><span className="w-1 h-1 bg-emerald-400 rounded-full mr-1"></span>Online</div>
                  </div>
               </div>
               <div className="flex-1 bg-slate-50 p-4 space-y-3 overflow-hidden">
                  <div className="bg-white p-2 rounded-lg text-[10px] shadow-sm max-w-[80%] border border-slate-100">Hello! I'm {settings.businessName}'s virtual assistant.</div>
                  <div style={{ backgroundColor: settings.chatbotPrimaryColor || '#6366f1' }} className="self-end ml-auto bg-primary text-white p-2 rounded-lg text-[10px] shadow-sm max-w-[80%]">How can I book local services?</div>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider text-left">Internal Knowledge Base (Unlimited Instructions)</label>
              <textarea 
                rows={10} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed font-mono" 
                value={settings.aiBehaviorInstructions || ''} 
                onChange={e => updateField('aiBehaviorInstructions', e.target.value)}
                placeholder="Example: PrimeSoft Alliance is a leader in digital transformation. We established in 2010... Our core values are... Our project managers are... We prefer email for follow-ups..."
              />

              <div className="pt-6 mt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                       <Database className="w-4 h-4 text-gray-500" />
                       External Knowledge Source (Database)
                    </h4>
                    <p className="text-[10px] text-gray-500">Connect the AI to your existing database for real-time lookups & updates.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={settings.externalDbConfig?.enabled} onChange={e => updateDeepField('externalDbConfig', 'enabled', e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {settings.externalDbConfig?.enabled && (
                  <div className="grid md:grid-cols-2 gap-4 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="md:col-span-2">
                       <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Database Mode</label>
                       <select className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" value={settings.externalDbConfig?.mode || 'read-only'} onChange={e => updateDeepField('externalDbConfig', 'mode', e.target.value)}>
                         <option value="read-only">Context Only (AI can read records to answer questions)</option>
                         <option value="read-write">Full Assistant (AI can create and update authorized records)</option>
                         <option value="disabled">Disabled</option>
                       </select>
                     </div>
                     <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Database Type</label>
                      <select className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" value={settings.externalDbConfig?.dbType || ''} onChange={e => updateDeepField('externalDbConfig', 'dbType', e.target.value)}>
                        <option value="">Select Engine</option>
                        <option value="mongodb">MongoDB Atlas</option>
                        <option value="postgresql">PostgreSQL</option>
                        <option value="mysql">MySQL</option>
                        <option value="firestore">Firebase Firestore</option>
                        <option value="mssql">MSSQL</option>
                        <option value="sqlite">SQLite</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Instance / Region</label>
                      <input className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" value={settings.externalDbConfig?.host || ''} onChange={e => updateDeepField('externalDbConfig', 'host', e.target.value)} placeholder="e.g. cluster0.mongodb.net" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Connection String / Secrets (Hashed)</label>
                      <input type="password" title="Secrets are stored securely and never exposed in the browser." className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" value={settings.externalDbConfig?.password || ''} onChange={e => updateDeepField('externalDbConfig', 'password', e.target.value)} placeholder="Enter connection credentials..." />
                    </div>
                    
                    <div className="md:col-span-2 pt-2">
                      <h5 className="text-[10px] font-bold text-gray-700 flex items-center gap-2 mb-2">
                         <Shield className="w-3.5 h-3.5" /> AI Permission Scope
                      </h5>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                         {['Read', 'Create', 'Update', 'Delete'].map(perm => (
                           <label key={perm} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-[10px] cursor-pointer hover:bg-slate-50">
                             <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 h-3 w-3" checked={settings.externalDbConfig?.permissions?.[`can${perm}`]} onChange={e => updateDeepDeepField('externalDbConfig', 'permissions', `can${perm}`, e.target.checked)} />
                             {perm}
                           </label>
                         ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                 <span>💡 Tip: Paste your company profile, mission statement, and even project case studies here for the AI to learn.</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">FAQ Knowledge Base</label>
                <button 
                  type="button" 
                  onClick={() => updateField('faqs', [...(settings.faqs || []), { question: '', answer: '' }])}
                  className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                >
                  + Add Q&A Pair
                </button>
              </div>
              <div className="space-y-3">
                {(settings.faqs || []).map((faq: any, index: number) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl relative group">
                    <input 
                      className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold" 
                      placeholder="Common Question" 
                      value={faq.question}
                      onChange={e => {
                        const newFaqs = [...settings.faqs];
                        newFaqs[index].question = e.target.value;
                        updateField('faqs', newFaqs);
                      }}
                    />
                    <textarea 
                      rows={1}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs" 
                      placeholder="Verified Answer" 
                      value={faq.answer}
                      onChange={e => {
                        const newFaqs = [...settings.faqs];
                        newFaqs[index].answer = e.target.value;
                        updateField('faqs', newFaqs);
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const newFaqs = settings.faqs.filter((_: any, i: number) => i !== index);
                        updateField('faqs', newFaqs);
                      }}
                      className="absolute -top-2 -right-2 bg-white border border-gray-200 text-gray-400 hover:text-red-500 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Portfolio & Landing Page CMS */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              Portfolio & Home Content
            </h3>
            <button 
              type="button" 
              onClick={() => updateField('portfolioProjects', [...(settings.portfolioProjects || []), { title: '', description: '', image: '', tech: '', link: '' }])}
              className="text-xs bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
            >
              + Add Portfolio Project
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
             {(settings.portfolioProjects || []).map((project: any, index: number) => (
                <div key={index} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 relative group">
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Project Name</label>
                        <input className="w-full bg-white border border-gray-200 rounded p-2 text-xs font-bold" value={project.title} onChange={e => {
                          const p = [...settings.portfolioProjects]; p[index].title = e.target.value; updateField('portfolioProjects', p);
                        }} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tech Stack</label>
                        <input className="w-full bg-white border border-gray-200 rounded p-2 text-xs" value={project.tech} placeholder="e.g. React, AWS" onChange={e => {
                          const p = [...settings.portfolioProjects]; p[index].tech = e.target.value; updateField('portfolioProjects', p);
                        }} />
                      </div>
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Image URL</label>
                      <input className="w-full bg-white border border-gray-200 rounded p-2 text-xs" value={project.image} placeholder="https://unsplash.com/..." onChange={e => {
                        const p = [...settings.portfolioProjects]; p[index].image = e.target.value; updateField('portfolioProjects', p);
                      }} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Brief Description</label>
                      <textarea rows={2} className="w-full bg-white border border-gray-200 rounded p-2 text-xs" value={project.description} onChange={e => {
                        const p = [...settings.portfolioProjects]; p[index].description = e.target.value; updateField('portfolioProjects', p);
                      }} />
                   </div>
                   <button type="button" onClick={() => updateField('portfolioProjects', settings.portfolioProjects.filter((_:any, i:number) => i !== index))} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
             ))}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100">
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Trust Indicators (Stats)</h4>
                <button type="button" onClick={() => updateField('clientStats', [...(settings.clientStats || []), { label: '', value: '' }])} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded">+ Add Stat</button>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(settings.clientStats || []).map((stat: any, index: number) => (
                  <div key={index} className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex flex-col gap-2 relative group">
                    <input className="bg-white border border-gray-200 rounded p-1.5 text-center text-xs font-bold" value={stat.value} placeholder="Value" onChange={e => {
                      const s = [...settings.clientStats]; s[index].value = e.target.value; updateField('clientStats', s);
                    }} />
                    <input className="bg-white border border-gray-200 rounded p-1.5 text-center text-[10px] uppercase font-bold text-gray-400" value={stat.label} placeholder="Label" onChange={e => {
                      const s = [...settings.clientStats]; s[index].label = e.target.value; updateField('clientStats', s);
                    }} />
                    <button type="button" onClick={() => updateField('clientStats', settings.clientStats.filter((_:any, i:number) => i !== index))} className="absolute -top-1 -right-1 bg-white border border-gray-200 text-gray-300 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
             </div>
          </div>
        </section>

        {/* Outgoing Email (SMTP) */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              Outgoing Email (SMTP)
            </h3>
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] uppercase font-bold tracking-tight">System Essential</span>
          </div>
          <p className="text-sm text-gray-500 mb-6">Configure your own email server (Gmail, Zoho, SendGrid) to send professional notifications to your customers.</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider text-left">SMTP Host</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.smtpHost || ''} 
                onChange={e => updateField('smtpHost', e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider text-left">SMTP Port</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.smtpPort || ''} 
                onChange={e => updateField('smtpPort', e.target.value)}
                placeholder="587 or 465"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider text-left">SMTP Username</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.smtpUser || ''} 
                onChange={e => updateField('smtpUser', e.target.value)}
                placeholder="notifications@yourdomain.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider text-left">SMTP Password</label>
              <input 
                type="password"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.smtpPass || ''} 
                onChange={e => updateField('smtpPass', e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider text-left">From Name</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.smtpFromName || ''} 
                onChange={e => updateField('smtpFromName', e.target.value)}
                placeholder={settings.businessName}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider text-left">From Email</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.smtpFromEmail || ''} 
                onChange={e => updateField('smtpFromEmail', e.target.value)}
                placeholder={settings.smtpUser}
              />
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-2">Test Delivery</h4>
            <div className="flex gap-4">
              <input 
                id="test-email-input"
                type="email" 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="Enter recipient email..." 
                defaultValue={settings.contactEmail || ''}
              />
              <button 
                type="button"
                onClick={async () => {
                  const email = (document.getElementById('test-email-input') as HTMLInputElement).value;
                  if (!email) return alert('Enter an email address');
                  try {
                    const res = await fetch('/v1/dashboard/test-email', {
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
                    alert(data.success ? '✓ Test email sent successfully!' : '✗ Failed: ' + (data.error || data.details));
                  } catch (err) {
                    alert('✗ Connection error');
                  }
                }}
                className="px-6 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors border border-indigo-200"
              >
                Send Test
              </button>
            </div>
          </div>
        </section>
 
        {/* Domain Mapping */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                 <Globe className="w-5 h-5 text-indigo-600" />
                 Domain Mapping
              </h3>
              <button 
                type="button" 
                onClick={async () => {
                  const host = prompt('Enter domain hostname (e.g. acme.com):');
                  if (!host) return;
                  try {
                    const res = await fetch('/v1/dashboard/domains', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({ host, type: 'custom-domain' })
                    });
                    if (res.ok) fetchDomains();
                    else alert('Domain mapping failed. Check if already exists.');
                  } catch (err) { alert('Api error'); }
                }}
                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded"
              >
                + Add Custom Domain
              </button>
           </div>
           
           <div className="space-y-3">
              {(domains || []).map((dom: any) => (
                <div key={dom._id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                   <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", dom.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500')}></div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{dom.host}</div>
                        <div className="text-[10px] uppercase font-bold text-gray-400">{dom.type} • {dom.status}</div>
                      </div>
                   </div>
                   <button 
                     type="button"
                     onClick={async () => {
                       if (!confirm('Remove this domain mapping?')) return;
                       await fetch(`/v1/dashboard/domains/${dom._id}`, { method: 'DELETE' });
                       fetchDomains();
                     }}
                     className="text-gray-400 hover:text-red-500 p-2"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              ))}
              {(!domains || domains.length === 0) && (
                <div className="text-center py-6 text-gray-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                   No custom domains mapped yet. The SDK will use the current hostname as fallback.
                </div>
              )}
           </div>
        </section>

        {/* Headless SDK & Embed */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                 <Code className="w-5 h-5 text-indigo-600" />
                 Headless Website Injection (SDK)
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.headlessConfig?.enabled} onChange={e => {
                   const val = e.target.checked;
                   setSettings((prev: any) => ({
                     ...prev,
                     headlessConfig: { ...(prev.headlessConfig || { features: { chat: true, booking: true, contact: true, content: false } }), enabled: val }
                   }));
                }} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
           </div>
           <p className="text-sm text-gray-500 mb-6">Enable specific PrimeSoft Alliance features on your external website (e.g. Lovable, v0, Wix, WordPress) using our lightweight SDK.</p>

           {settings.headlessConfig?.enabled && (
             <div className="space-y-6">
               <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(settings.headlessConfig.features || {}).map(([feature, enabled]: [string, any]) => (
                    <button
                      key={feature}
                      type="button"
                      onClick={() => {
                        const newFeatures = { ...settings.headlessConfig.features, [feature]: !enabled };
                        setSettings((prev: any) => ({
                          ...prev,
                          headlessConfig: { ...prev.headlessConfig, features: newFeatures }
                        }));
                      }}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                        enabled ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-gray-50 border-gray-100 text-gray-400"
                      )}
                    >
                      <div className="flex items-center gap-3">
                         {feature === 'chat' && <MessageCircle className="w-4 h-4" />}
                         {feature === 'booking' && <Clock className="w-4 h-4" />}
                         {feature === 'contact' && <Mail className="w-4 h-4" />}
                         {feature === 'content' && <Layout className="w-4 h-4" />}
                         <span className="text-xs font-bold uppercase tracking-wider">{feature}</span>
                      </div>
                      {enabled ? <CheckCircle className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-200" />}
                    </button>
                  ))}
               </div>

               <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
                  <div className="flex justify-between items-center mb-4">
                     <h4 className="text-sm font-bold flex items-center gap-2">
                        <Code className="w-4 h-4 text-indigo-400" />
                        Embed Script
                     </h4>
                     <button
                        type="button"
                        onClick={() => {
                          const code = `<script\n  src="${window.location.origin}/sdk.js"\n  data-client-id="${settings.clientId}"\n  data-features="${Object.entries(settings.headlessConfig.features).filter(([_,v]) => v).map(([k]) => k).join(',')}"\n  data-auto-detect="true"\n  async\n></script>`;
                          navigator.clipboard.writeText(code);
                          alert('Copied to clipboard!');
                        }}
                        className="flex items-center gap-2 text-[10px] uppercase font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                     >
                        <Copy className="w-3 h-3" /> Copy Code
                     </button>
                  </div>
                  <pre className="text-[10px] font-mono text-indigo-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
{`<script
  src="${window.location.origin}/sdk.js"
  data-client-id="${settings.clientId}"
  data-features="${Object.entries(settings.headlessConfig.features || {}).filter(([_,v]) => v).map(([k]) => k).join(',')}"
  data-auto-detect="true"
  async
></script>`}
                  </pre>
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3 text-[10px] text-white/50">
                     <div className="flex -space-x-2">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border border-slate-900 font-bold">L</div>
                        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center border border-slate-900 font-bold text-black">V</div>
                        <div className="w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center border border-slate-900 font-bold text-white">W</div>
                     </div>
                     <span>Compatible with Lovable, v0.dev, Wix, and WordPress.</span>
                  </div>
               </div>
             </div>
           )}
        </section>

        {/* Services Section */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Services & Solutions</h3>
            <button 
              type="button" 
              onClick={() => {
                const newId = `service-${Date.now()}`;
                updateField('services', [...(settings.services || []), { id: newId, name: '', description: '', price: 0, durationMinutes: 60 }]);
              }}
              className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add New Service
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {(settings.services || []).map((service: any, index: number) => (
              <div key={index} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl relative group hover:border-blue-300 transition-colors">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider text-left">Service Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none" 
                        value={service.name} 
                        placeholder="e.g. Custom Software Development"
                        onChange={e => {
                          const newServices = [...(settings.services || [])];
                          newServices[index].name = e.target.value;
                          updateField('services', newServices);
                        }} 
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const newServices = (settings.services || []).filter((_: any, i: number) => i !== index);
                        updateField('services', newServices);
                      }}
                      className="text-gray-300 hover:text-red-500 p-2 transition-colors -mr-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider text-left">Price ($)</label>
                      <input 
                        type="number" 
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-mono" 
                        value={service.price} 
                        onChange={e => {
                          const newServices = [...(settings.services || [])];
                          newServices[index].price = parseFloat(e.target.value);
                          updateField('services', newServices);
                        }} 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider text-left">Mins</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-mono" 
                          value={service.durationMinutes} 
                          onChange={e => {
                            const newServices = [...(settings.services || [])];
                            newServices[index].durationMinutes = parseInt(e.target.value);
                            updateField('services', newServices);
                          }} 
                        />
                        <Clock className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-300" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider text-left">Short Description</label>
                    <textarea 
                      rows={3}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-gray-600 leading-relaxed outline-none focus:ring-2 focus:ring-blue-100" 
                      value={service.description} 
                      placeholder="Explain what this service provides..."
                      onChange={e => {
                        const newServices = [...(settings.services || [])];
                        newServices[index].description = e.target.value;
                        updateField('services', newServices);
                      }} 
                    />
                  </div>
                </div>
              </div>
            ))}
            {(!settings.services || settings.services.length === 0) && (
              <div className="md:col-span-2 text-center py-12 text-gray-500 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                <div className="mb-2">No services defined yet.</div>
                <button 
                  type="button" 
                  onClick={() => {
                    const newId = `service-${Date.now()}`;
                    updateField('services', [...(settings.services || []), { id: newId, name: '', description: '', price: 0, durationMinutes: 60 }]);
                  }}
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  Create your first service
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-64 right-0 p-4 bg-white border-t border-gray-200 flex justify-end items-center px-8 z-10">
          {saveSuccess && <span className="text-sm text-green-600 font-medium mr-4 flex items-center"><svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Saved successfully</span>}
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

      </form>
    </div>
  );
}

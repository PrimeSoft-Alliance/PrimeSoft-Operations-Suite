import React, { useEffect, useState, useRef } from 'react';
import { 
  Save, Plus, Trash2, Sparkles, RefreshCw, Sliders, HelpCircle, 
  AlertCircle, Play, Info, Eye, Check, Upload, Calendar, Clock, 
  MapPin, Phone, Mail, Building, Globe, ChevronRight, X, Bot, Image as ImageIcon,
  Database
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function KnowledgeManager() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('persona');
  const [polishing, setPolishing] = useState(false);
  const [playgroundKey, setPlaygroundKey] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarPresets = [
    { name: 'Future Bot', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' },
    { name: 'Neon Code', url: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=150&auto=format&fit=crop&q=80' },
    { name: 'Support Rep', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
    { name: 'Aura Orb', url: 'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?w=150&auto=format&fit=crop&q=80' }
  ];

  // Load current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = () => {
    fetch(`/v1/settings?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        const settingsData = data?.success ? data.data : data;
        // Make sure workingHours has at least default elements if missing
        if (settingsData && (!settingsData.workingHours || settingsData.workingHours.length === 0)) {
          settingsData.workingHours = Array.from({ length: 7 }, (_, i) => ({
            day: i,
            isOpen: i !== 0 && i !== 6, // Open Mon-Fri by default
            openTime: '08:00',
            closeTime: '17:00'
          }));
        }
        setSettings(settingsData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Settings load error:', err);
        setLoading(false);
      });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Clean internal fields
      const cleanSettings = { ...settings };
      delete cleanSettings._id;
      delete cleanSettings.__v;
      delete cleanSettings.createdAt;
      delete cleanSettings.updatedAt;

      const res = await fetch('/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanSettings)
      });
      const data = await res.json();
      if (data?.success) {
        setSettings(data.data);
      }
      setSaveSuccess(true);
      // Reload sandbox immediately
      setPlaygroundKey(prev => prev + 1);
      setTimeout(() => setSaveSuccess(false), 3050);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch('/v1/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, fileName: file.name })
        });
        const data = await res.json();
        if (data?.url) {
          updateField('chatbotAvatar', data.url);
        } else {
          alert('Upload failed');
        }
      } catch (err) {
        console.error(err);
        alert('Upload failed');
      } finally {
        setUploadingImage(false);
      }
    };
  };

  // AI-powered guidelines polisher
  const handlePolishPrompt = async () => {
    setPolishing(true);
    try {
      const response = await fetch('/v1/ai/generate-branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate an elite, professional System Role instruction prompt (acting as an AI Assistant) for the business "${settings.businessName || 'the user\'s business'}". Enforce lead-retention, booking inquiries, clear service rates coordination, and helpful customer support routing. Do not output JSON, return only the prompt text ruleset itself.`
        })
      });
      const data = await response.json();
      if (data?.success && data?.result?.aiBehaviorInstructions) {
        updateField('aiBehaviorInstructions', data.result.aiBehaviorInstructions);
      } else if (data?.success && data?.result?.heroSubtitle) {
        updateField('aiBehaviorInstructions', data.result.heroSubtitle);
      } else if (data?.result) {
        // Fallback checks
        const resultText = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
        updateField('aiBehaviorInstructions', resultText);
      } else {
        const fallbackPrompt = `You are the chief AI Assistant for ${settings.businessName || 'this business'}.\n\nDirectives:\n1. Promptly answer any user questions based on the Services Catalog.\n2. Help schedule appointments by calling check_availability and book_appointment.\n3. Transfer to human tickets for highly specific, custom, or complex inquiries.\n4. Maintain a highly clear, professional, and friendly tone.`;
        updateField('aiBehaviorInstructions', fallbackPrompt);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPolishing(false);
    }
  };

  const getDayName = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="font-semibold text-sm">Synchronizing prompt and knowledge base models...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 border border-red-100 rounded-2xl max-w-lg mx-auto mt-12 flex items-center gap-3">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-bold">Error Loading Context</h3>
          <p className="text-xs opacity-90">Please reload the index page or verify your tenant access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-8 rounded-3xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-40"></div>
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> AI Engine Controls
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-200">
            AI Agent Knowledge Base & Control Center
          </h1>
          <p className="text-sm font-medium text-slate-300 max-w-3xl leading-relaxed">
            Train your AI agent, configure the automatic context map (services catalog, working hours, and profile), design the chatbot visual appearance/photo details, and simulate live performance in the workspace sandbox.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3 relative z-10">
          <button
            onClick={handleSave}
            disabled={saving}
            id="apply-changes-btn"
            className={cn(
              "flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold font-sans text-sm shadow-xl transition-all duration-200 cursor-pointer active:scale-95",
              saveSuccess 
                ? "bg-green-600 hover:bg-green-500 text-white shadow-green-600/20" 
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
            )}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" /> Changes Applied Live!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Apply Changes Live
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Context Editors */}
        <div className="lg:col-span-7 space-y-8">
          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveTab('persona')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                activeTab === 'persona' ? "bg-white text-indigo-900 shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Sliders className="w-4 h-4" /> Chatbot UI & Persona
            </button>
            <button
              onClick={() => setActiveTab('faqs')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                activeTab === 'faqs' ? "bg-white text-indigo-900 shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <HelpCircle className="w-4 h-4" /> FAQ Knowledge
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                activeTab === 'context' ? "bg-white text-indigo-900 shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Info className="w-4 h-4" /> Auto Context Map
            </button>
          </div>

          {/* TAB 1: Chatbot UI & Persona */}
          {activeTab === 'persona' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Chatbot Client Customization</h2>
                <p className="text-xs text-slate-500 mt-1">Configure your chatbot name, introduction greeting, brand color, and avatar photo representation.</p>
              </div>

              {/* Chatbot Name and Color Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Chatbot Name / Title</label>
                    <input
                      type="text"
                      value={settings.chatbotTitle || ''}
                      onChange={e => updateField('chatbotTitle', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                      placeholder="e.g. AI Receptionist"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Chatbot Description / Subtitle</label>
                    <input
                      type="text"
                      value={settings.chatbotSubtitle || ''}
                      onChange={e => updateField('chatbotSubtitle', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                      placeholder="e.g. Digital Assistant or Support Team"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Brand Accent Color</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={settings.chatbotPrimaryColor || '#6366f1'}
                      onChange={e => updateField('chatbotPrimaryColor', e.target.value)}
                      className="w-12 h-11 bg-transparent border-0 rounded-xl cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={settings.chatbotPrimaryColor || '#6366f1'}
                      onChange={e => updateField('chatbotPrimaryColor', e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-mono focus:bg-white transition-all text-left"
                    />
                  </div>
                </div>
              </div>

              {/* Chatbot Image Avatar Photo Editor */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Chatbot Photo / Face Representation</label>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Current Avatar Frame */}
                  <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center shadow-inner relative group shrink-0 overflow-hidden">
                    {uploadingImage ? (
                      <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                    ) : settings.chatbotAvatar ? (
                      <img src={settings.chatbotAvatar} className="w-full h-full object-cover rounded-full" alt="Bot Avatar" />
                    ) : (
                      <Bot className="w-8 h-8 text-indigo-500" />
                    )}
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    {/* URL Input */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avatar Image URL</div>
                      <input
                        type="text"
                        value={settings.chatbotAvatar || ''}
                        onChange={e => updateField('chatbotAvatar', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono"
                        placeholder="https://example.com/photo.jpg"
                      />
                    </div>

                    {/* Image Uploader Control */}
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 text-indigo-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingImage ? 'Uploading...' : 'Upload Custom Image'}
                      </button>

                      {settings.chatbotAvatar && (
                        <button
                          type="button"
                          onClick={() => updateField('chatbotAvatar', '')}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold"
                        >
                          Clear Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preset Avatar Fast Selector */}
                <div className="pt-3 border-t border-slate-200/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Or Select Professional Preset Avatar</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {avatarPresets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => updateField('chatbotAvatar', preset.url)}
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded-xl border bg-white transition-all text-left group hover:border-indigo-300 cursor-pointer",
                          settings.chatbotAvatar === preset.url ? "border-indigo-500 shadow-sm ring-1 ring-indigo-500/20" : "border-slate-200"
                        )}
                      >
                        <img src={preset.url} className="w-7 h-7 rounded-full object-cover shrink-0" alt="Preset" />
                        <span className="text-[10px] font-semibold text-slate-700 truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chatbot Icon dropdown */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left font-sans">Header Chatbot Icon (Fallback)</label>
                <select
                  value={settings.chatbotIcon || 'Cpu'}
                  onChange={e => updateField('chatbotIcon', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                >
                  <option value="Cpu">Default Tech Orb (Cpu)</option>
                  <option value="Bot">Friendly Assistant Robot</option>
                  <option value="MessageCircle">Chat Conversation Bubble</option>
                  <option value="Sparkles">Magic Astral Sparkles</option>
                  <option value="User">Corporate Service Agent Face</option>
                </select>
              </div>

              {/* Chatbot Greeting Area */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">Introduction Greeting / Welcome Message</label>
                <textarea
                  rows={2}
                  value={settings.chatbotGreeting || ''}
                  onChange={e => updateField('chatbotGreeting', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left leading-relaxed font-sans"
                  placeholder="e.g. Hello! I'm here to assist you with any questions about our plumbing services or available slots. How can I help you today?"
                />
              </div>

              {/* AI Rulesets */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">AI System Guidelines & Prompt Directives</label>
                  <button
                    type="button"
                    onClick={handlePolishPrompt}
                    disabled={polishing}
                    className="flex items-center gap-1 text-[10px] uppercase font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 border border-indigo-200/50 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600/80 animate-pulse" /> 
                    {polishing ? 'Generating...' : 'AI Prompt Polisher'}
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={settings.aiBehaviorInstructions || ''}
                  onChange={e => updateField('aiBehaviorInstructions', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left"
                  placeholder="Explain chatbot's personality, goals, security, policies..."
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-150 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : 'Save Chatbot Persona & Appearance'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: FAQs */}
          {activeTab === 'faqs' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">FAQ Knowledge Corpus</h2>
                  <p className="text-xs text-slate-500 mt-1">Teach your AI agent precise, exact answers to highly specific customer inquiries.</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('faqs', [...(settings.faqs || []), { question: '', answer: '' }])}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Q&A Item
                </button>
              </div>

              {(!settings.faqs || settings.faqs.length === 0) ? (
                <div className="p-12 text-center border-2 border-dashed rounded-2xl border-slate-200 text-slate-400 space-y-2">
                  <HelpCircle className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-semibold text-sm">No specific FAQ items defined yet</p>
                  <p className="text-xs opacity-90">Add Q&A pairs here to feed standard knowledge directly to the LLM agent.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
                  {(settings.faqs || []).map((faq: any, index: number) => (
                    <div key={index} className="p-5 bg-slate-50 rounded-2.5xl border border-slate-200 space-y-3 relative group transition-all hover:bg-white hover:border-slate-300 hover:shadow-sm">
                      <button
                        type="button"
                        onClick={() => {
                          const newFaqs = settings.faqs.filter((_: any, i: number) => i !== index);
                          updateField('faqs', newFaqs);
                        }}
                        className="absolute right-3 top-3 p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider text-left">Question</label>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={e => {
                            const newFaqs = [...settings.faqs];
                            newFaqs[index].question = e.target.value;
                            updateField('faqs', newFaqs);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:ring-1 focus:ring-indigo-500/25 text-left text-gray-900"
                          placeholder="e.g. Do you offer emergency 24/7 services?"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider text-left">Verified Answer</label>
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={e => {
                            const newFaqs = [...settings.faqs];
                            newFaqs[index].answer = e.target.value;
                            updateField('faqs', newFaqs);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/25 text-left leading-relaxed"
                          placeholder="Provide the precise response standard the AI agent should deliver..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-150 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : 'Save FAQ Knowledge Corpus'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Auto Context Map Editor */}
          {activeTab === 'context' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Context Summary Isolation Header */}
              <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-3xl border border-indigo-100 p-6 space-y-2">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5.5 h-5.5 text-indigo-600" />
                  Auto Context Map Editor
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  These core structured catalogs are converted into clean markdown contexts and and dynamically injected as live training vectors in every chatbot conversation. Updates made here instantly affect AI decisions.
                </p>
              </div>

              {/* 1. Services Catalog Config */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-indigo-600" />
                      1. Services Catalog ({settings.services?.length || 0})
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">AI agent reads names, pricing rates, and task durations to prompt calendar appointments.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `serv-${Date.now()}`;
                      updateField('services', [...(settings.services || []), { id: newId, name: '', description: '', price: 0, durationMinutes: 60 }]);
                    }}
                    className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 text-indigo-700 text-xs font-bold uppercase py-2 px-3 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Service
                  </button>
                </div>

                {(!settings.services || settings.services.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs italic">
                    No services defined. Add at least one premium service so the AI chatbot can schedule booking slots.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(settings.services || []).map((serv: any, i: number) => (
                      <div key={serv.id || serv._id || i} className="p-5 bg-slate-50 border border-slate-205 rounded-2xl relative group space-y-3">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = settings.services.filter((_: any, idx: number) => idx !== i);
                            updateField('services', updated);
                          }}
                          className="absolute right-3 top-3 text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 cursor-pointer"
                          title="Delete Service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-2">
                          <div className="md:col-span-3 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-slate-400 text-left">Service Name</label>
                            <input
                              type="text"
                              value={serv.name || ''}
                              onChange={e => {
                                const list = [...settings.services];
                                list[i].name = e.target.value;
                                updateField('services', list);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-gray-900"
                              placeholder="e.g. Standard Plumbing Operations"
                            />
                          </div>
                          
                          <div className="md:col-span-1.5 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-slate-400 text-left">Price ($)</label>
                            <input
                              type="number"
                              value={serv.price || 0}
                              onChange={e => {
                                const list = [...settings.services];
                                list[i].price = parseFloat(e.target.value) || 0;
                                updateField('services', list);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                            />
                          </div>

                          <div className="md:col-span-1.5 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-slate-400 text-left">Mins Duration</label>
                            <input
                              type="number"
                              value={serv.durationMinutes || 60}
                              onChange={e => {
                                const list = [...settings.services];
                                list[i].durationMinutes = parseInt(e.target.value) || 60;
                                updateField('services', list);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-black uppercase text-slate-400 text-left">Short Description</label>
                          <textarea
                            rows={1.5}
                            value={serv.description || ''}
                            onChange={e => {
                              const list = [...settings.services];
                              list[i].description = e.target.value;
                              updateField('services', list);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-600 leading-relaxed"
                            placeholder="Explain the scopes, warranty, or details of this operations catalog item..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Business Working Hours and Timezones */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    2. Business Hours, Calendars & Zones
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Configure your weekly operating times. AI agent blocks booking requests made during closed hours.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">Primary Operating Timezone</label>
                    <select
                      value={settings.timezone || 'America/New_York'}
                      onChange={e => updateField('timezone', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold"
                    >
                      <option value="America/New_York">Eastern Time (US & Canada)</option>
                      <option value="America/Chicago">Central Time (US & Canada)</option>
                      <option value="America/Denver">Mountain Time (US & Canada)</option>
                      <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                      <option value="Europe/London">London UTC+0/BST</option>
                      <option value="Africa/Lagos">West Central Africa Time (Lagos)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">Slot length (Mins)</label>
                      <input
                        type="number"
                        value={settings.slotDurationMinutes || 60}
                        onChange={e => updateField('slotDurationMinutes', parseInt(e.target.value) || 60)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">Buffer Gap (Mins)</label>
                      <input
                        type="number"
                        value={settings.bufferTimeMinutes || 30}
                        onChange={e => updateField('bufferTimeMinutes', parseInt(e.target.value) || 30)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Day Rows Weekly Grid */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Configure Standard Weekly Calendar</div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {Array.from({ length: 7 }, (_, dayNum) => {
                      const idx = (settings.workingHours || []).findIndex((h: any) => h.day === dayNum);
                      const currentHoursObj = idx !== -1 ? settings.workingHours[idx] : { day: dayNum, isOpen: false, openTime: '08:00', closeTime: '17:00' };

                      const updateHourField = (field: string, val: any) => {
                        let currentList = [...(settings.workingHours || [])];
                        if (idx === -1) {
                          // Insert new hour
                          const newObj = { day: dayNum, isOpen: false, openTime: '08:00', closeTime: '17:00', [field]: val };
                          currentList.push(newObj);
                        } else {
                          currentList[idx] = { ...currentList[idx], [field]: val };
                        }
                        updateField('workingHours', currentList);
                      };

                      return (
                        <div key={dayNum} className="flex flex-col md:flex-row items-start md:items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-150 transition-colors gap-3">
                          <div className="flex items-center gap-3 shrink-0">
                            <input
                              type="checkbox"
                              id={`day-check-${dayNum}`}
                              checked={currentHoursObj.isOpen}
                              onChange={e => updateHourField('isOpen', e.target.checked)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500/20 border-slate-300 rounded cursor-pointer"
                            />
                            <label htmlFor={`day-check-${dayNum}`} className="text-xs font-black text-slate-800 w-24 cursor-pointer select-none">
                              {getDayName(dayNum)}
                            </label>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto">
                            {currentHoursObj.isOpen ? (
                              <div className="flex items-center gap-2 w-full md:w-auto">
                                <span className="text-[10px] text-slate-400 shrink-0">Hours:</span>
                                <input
                                  type="text"
                                  value={currentHoursObj.openTime || '08:00'}
                                  onChange={e => updateHourField('openTime', e.target.value)}
                                  className="w-full md:w-20 bg-white border border-slate-200 rounded p-1 text-center text-xs font-mono font-bold"
                                  placeholder="08:00"
                                />
                                <span className="text-slate-400 text-xs">to</span>
                                <input
                                  type="text"
                                  value={currentHoursObj.closeTime || '17:00'}
                                  onChange={e => updateHourField('closeTime', e.target.value)}
                                  className="w-full md:w-20 bg-white border border-slate-200 rounded p-1 text-center text-xs font-mono font-bold"
                                  placeholder="17:00"
                                />
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100/50 px-2.5 py-1 rounded">
                                Closed for Booking Orders
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Core Business Profile Info */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    3. Core Client Profile Info
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Injected to inform visitors of alternative communication roots and official business name definitions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider text-left">Business Client Name</label>
                    <input
                      type="text"
                      value={settings.businessName || ''}
                      onChange={e => updateField('businessName', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-gray-900"
                      placeholder="e.g. CSR Premium Plumbers"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider text-left">WhatsApp Support number</label>
                    <input
                      type="text"
                      value={settings.whatsappNumber || ''}
                      onChange={e => updateField('whatsappNumber', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono font-bold"
                      placeholder="+2348080000000"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider text-left">Contact / Alert SMTP Email</label>
                    <input
                      type="email"
                      value={settings.contactEmail || ''}
                      onChange={e => updateField('contactEmail', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono font-bold"
                      placeholder="support@domain.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider text-left">Direct Telephone Line</label>
                    <input
                      type="text"
                      value={settings.contactPhone || ''}
                      onChange={e => updateField('contactPhone', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono font-bold"
                      placeholder="+1-800-555-CSR"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-150 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : 'Save Auto Context Map'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Chat Playground */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 text-white p-6 shadow-2xl flex flex-col min-h-[660px] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-30"></div>
            
            {/* Playground Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-green-500 animate-pulse border-2 border-slate-900"></div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    Agent Playground <Play className="w-3 h-3 text-indigo-400 animate-bounce" />
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Interactive live simulation workspace</p>
                </div>
              </div>
              <button
                onClick={() => setPlaygroundKey(prev => prev + 1)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/50 cursor-pointer active:scale-95"
                title="Restart Session"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Live Frame */}
            <div className="flex-1 bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800/80 min-h-[490px]">
              <iframe
                key={playgroundKey}
                src={`${window.location.origin}/chatbot-mini?clientId=${settings.clientId}`}
                className="w-full h-full min-h-[490px] border-none bg-slate-950"
                title="AI Agent Live Sandbox"
              />
            </div>

            {/* Note Panel */}
            <div className="mt-4 p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-[10px] text-slate-400 leading-relaxed relative z-10">
              <span className="font-bold text-slate-200 flex items-center gap-1 mb-1">
                <Eye className="w-3.5 h-3.5 text-indigo-400" /> Grounding Context Streamed Live
              </span>
              Click <strong className="text-white">Apply Changes Live</strong> in the top panel to sync any customizations before testing the AI agent replies.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

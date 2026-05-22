import React, { useEffect, useState } from 'react';
import { Save, Globe, Layout, Image as ImageIcon, MessageSquare, Phone, Info, Zap, Shield, Target, Award, Users, Trash2, Plus, ArrowRight, Sparkles, Loader, RefreshCw, Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function WebsiteManager() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('landing');
  const [aiGenerating, setAiGenerating] = useState<string | null>(null);
  const [aiTone, setAiTone] = useState<'professional' | 'casual' | 'creative' | 'technical'>('professional');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/v1/dashboard/settings?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        setSettings(data?.success ? data.data : data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Settings load error:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Clean internal mongoose fields
      const cleanSettings = { ...settings };
      delete cleanSettings._id;
      delete cleanSettings.__v;
      delete cleanSettings.createdAt;
      delete cleanSettings.updatedAt;

      const res = await fetch('/v1/dashboard/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanSettings)
      });
      const data = await res.json();
      if (data?.success) setSettings(data.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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

  const handleGenerate = async (section: string, fieldKey?: string) => {
    setAiGenerating(fieldKey || section);
    try {
      const res = await fetch('/v1/dashboard/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          fieldKey,
          businessName: settings.businessName || 'My Business',
          services: settings.services || 'Professional Services',
          tone: aiTone,
          currentContent: fieldKey ? settings[fieldKey] : undefined,
          context: {
            industry: settings.industry || 'Technology',
            tagline: settings.tagline || 'Your business tagline'
          }
        })
      });
      const data = await res.json();
      if (data?.success) {
        if (fieldKey) {
          updateField(fieldKey, data.data.content);
        } else {
          setSettings((prev: any) => ({ ...prev, ...data.data }));
        }
      } else {
        alert('Generation failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('[v0] AI generation error:', err);
      alert('Failed to generate content');
    } finally {
      setAiGenerating(null);
    }
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading website configuration...</div>;
  if (!settings) return <div className="p-8 text-center text-red-500">Error loading settings.</div>;

  const tabs = [
    { id: 'landing', label: 'Landing Page', icon: Layout },
    { id: 'about', label: 'About Page', icon: Info },
    { id: 'contact', label: 'Contact Page', icon: Phone },
    { id: 'footer', label: 'Footer Controls', icon: Globe },
  ];

  return (
    <div className="max-w-6xl space-y-8 pb-20">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Website Manager</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Configure all text, labels, and imagery across your site.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600">AI Enhanced</span>
          </div>
        </div>
        
        {/* AI Control Panel */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">AI Content Assistant</p>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2">
              {(['professional', 'casual', 'creative', 'technical'] as const).map(tone => (
                <button
                  key={tone}
                  onClick={() => setAiTone(tone)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                    aiTone === tone
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">
              {aiTone === 'professional' && "Formal, corporate tone"}
              {aiTone === 'casual' && "Friendly, conversational tone"}
              {aiTone === 'creative' && "Imaginative, engaging tone"}
              {aiTone === 'technical' && "Expert, detailed tone"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 gap-8 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 pb-4 text-sm font-bold tracking-tight transition-all border-b-2 whitespace-nowrap",
              activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8">
        {activeTab === 'landing' && (
          <>
            {/* Hero Section */}
            <Section title="Hero Section" description="The first thing visitors see. Make it count." onGenerate={() => handleGenerate('landing-hero')}>
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Hero Badge" value={settings.heroBadge} onChange={v => updateField('heroBadge', v)} placeholder="Engineering Excellence" fieldKey="heroBadge" onAiGenerate={handleGenerate} isGenerating={aiGenerating} />
                <Field label="Hero Title" value={settings.heroTitle} onChange={v => updateField('heroTitle', v)} placeholder="Architecting the Future" fieldKey="heroTitle" onAiGenerate={handleGenerate} isGenerating={aiGenerating} />
                <div className="md:col-span-2">
                  <Field label="Hero Subtitle" value={settings.heroSubtitle} onChange={v => updateField('heroSubtitle', v)} textarea placeholder="Describe your core value proposition..." fieldKey="heroSubtitle" onAiGenerate={handleGenerate} isGenerating={aiGenerating} />
                </div>
              </div>
            </Section>

            {/* Services Section */}
            <Section title="Services Overview" description="Highlight what you offer on the home page." onGenerate={() => handleGenerate('landing-services')}>
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Services Badge" value={settings.servicesBadge} onChange={v => updateField('servicesBadge', v)} placeholder="OUR SOLUTIONS" />
                <Field label="Services Title" value={settings.servicesTitle} onChange={v => updateField('servicesTitle', v)} placeholder="Software & IT Services" />
                <div className="md:col-span-2">
                  <Field label="Services Subtitle" value={settings.servicesSubtitle} onChange={v => updateField('servicesSubtitle', v)} textarea placeholder="End-to-end digital services..." />
                </div>
              </div>
            </Section>

            {/* Trust Section */}
            <Section title="Trust & Reliability" description="Build credibility with trust indicators.">
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Trust Section Title" value={settings.trustTitle} onChange={v => updateField('trustTitle', v)} placeholder="Built on Trust" />
                <Field label="Trust Description" value={settings.trustDescription} onChange={v => updateField('trustDescription', v)} textarea placeholder="We believe in doing things right..." />
                <Field label="Trust Image URL" value={settings.trustImage} onChange={v => updateField('trustImage', v)} placeholder="https://..." />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Card Title" value={settings.trustCardTitle} onChange={v => updateField('trustCardTitle', v)} placeholder="Secure & Robust" />
                  <Field label="Card Subtitle" value={settings.trustCardSubtitle} onChange={v => updateField('trustCardSubtitle', v)} placeholder="Enterprise-grade" />
                </div>
                <div className="md:col-span-2">
                  <ListField 
                    label="Value Points (Checks)" 
                    items={settings.trustPoints || ["Modern tech stack selection", "Agile development methodology", "Post-deployment support & maintenance", "Enterprise-ready scalability"]} 
                    onChange={v => updateField('trustPoints', v)} 
                  />
                </div>
              </div>
            </Section>

            {/* Testimonials */}
            <Section title="Testimonials" description="Social proof from your happy clients.">
               <Field label="Section Title" className="mb-6" value={settings.testimonialsTitle} onChange={v => updateField('testimonialsTitle', v)} placeholder="What Our Clients Say" />
               <div className="space-y-4">
                  <TestimonialList 
                    items={settings.testimonials || []} 
                    onChange={v => updateField('testimonials', v)} 
                  />
               </div>
            </Section>

            {/* Portfolio Section */}
            <Section title="Portfolio Teaser" description="Showcase your recent projects.">
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Portfolio Badge" value={settings.portfolioBadge} onChange={v => updateField('portfolioBadge', v)} placeholder="Portfolio" />
                <Field label="Portfolio Title" value={settings.portfolioTitle} onChange={v => updateField('portfolioTitle', v)} placeholder="Recent Projects" />
              </div>
            </Section>

            {/* CTA Section */}
            <Section title="Call to Action (CTA)" description="The final push for conversion." onGenerate={() => handleGenerate('landing-cta')}>
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="CTA Title" value={settings.ctaTitle} onChange={v => updateField('ctaTitle', v)} placeholder="Ready to build?" />
                <Field label="CTA Subtitle" value={settings.ctaSubtitle} onChange={v => updateField('ctaSubtitle', v)} placeholder="Our architects are ready..." />
                <Field label="Primary Button Text" value={settings.ctaPrimaryBtn} onChange={v => updateField('ctaPrimaryBtn', v)} placeholder="Start Project" />
                <Field label="Secondary Button Text" value={settings.ctaSecondaryBtn} onChange={v => updateField('ctaSecondaryBtn', v)} placeholder="Contact Us" />
              </div>
            </Section>
          </>
        )}

        {activeTab === 'about' && (
          <>
            <Section title="About Hero" description="Your core identity and vision.">
               <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Badge Text" value={settings.aboutBadge} onChange={v => updateField('aboutBadge', v)} placeholder="Our Legacy & Future" />
                  <div className="md:col-span-2 grid md:grid-cols-2 gap-6">
                    <Field label="Hero Title Prefix" value={settings.aboutHeroTitle} onChange={v => updateField('aboutHeroTitle', v)} placeholder="Architecting" />
                    <Field label="Hero Title Highlight" value={settings.aboutHeroHighlight} onChange={v => updateField('aboutHeroHighlight', v)} placeholder="Tomorrow" />
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Hero Subtitle" value={settings.aboutHeroSubtitle} onChange={v => updateField('aboutHeroSubtitle', v)} textarea placeholder="We don't just build software..." />
                  </div>
               </div>
            </Section>

            <Section title="Company Bio" description="The detailed story of your business.">
               <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 grid md:grid-cols-2 gap-6">
                    <Field label="Section Title" value={settings.aboutSectionTitle} onChange={v => updateField('aboutSectionTitle', v)} placeholder="Software Synergy" />
                    <Field label="Section Highlight" value={settings.aboutSectionHighlight} onChange={v => updateField('aboutSectionHighlight', v)} placeholder="Visionary" />
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Main Bio Text" value={settings.aboutText} onChange={v => updateField('aboutText', v)} textarea rows={8} placeholder="Enter your full company overview..." />
                  </div>
                  <div className="md:col-span-2">
                    <ListField label="Excellence Tags" items={settings.aboutTags || ["Agile Dev", "Cloud Native", "AI First"]} onChange={v => updateField('aboutTags', v)} />
                  </div>
               </div>
            </Section>

            <Section title="Core Capabilities" description="The 4 pillars of your excellence.">
               <CapabilityList 
                 items={settings.aboutFeatures || []} 
                 onChange={v => updateField('aboutFeatures', v)} 
               />
            </Section>

            <Section title="Success Metrics" description="Numbers that prove your impact.">
               <StatList 
                 items={settings.aboutStats || []} 
                 onChange={v => updateField('aboutStats', v)} 
               />
            </Section>
          </>
        )}

        {activeTab === 'contact' && (
          <>
            <Section title="Contact Header" description="Guide visitors to reach out.">
               <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Title" value={settings.contactTitle} onChange={v => updateField('contactTitle', v)} placeholder="Let's Build" />
                  <Field label="Highlight" value={settings.contactHighlight} onChange={v => updateField('contactHighlight', v)} placeholder="Together" />
                  <div className="md:col-span-2">
                    <Field label="Subtitle" value={settings.contactSubtitle} onChange={v => updateField('contactSubtitle', v)} textarea placeholder="Ready to deploy something extraordinary?" />
                  </div>
                  <Field label="Regional Focus" value={settings.regionalFocus} onChange={v => updateField('regionalFocus', v)} placeholder="Active in 12 Zones" />
               </div>
            </Section>

            <Section title="Business Contact Info" description="Publicly reachable information.">
               <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Public Email" value={settings.email} onChange={v => updateField('email', v)} placeholder="support@yourbusiness.com" />
                  <Field label="Public Phone" value={settings.phone} onChange={v => updateField('phone', v)} placeholder="+1 (555) PLATFORM" />
                  <div className="md:col-span-2">
                    <Field label="Office Address" value={settings.address} onChange={v => updateField('address', v)} placeholder="Silicon Quarter, DXB" />
                  </div>
               </div>
            </Section>
          </>
        )}

        {activeTab === 'footer' && (
          <>
            <Section title="Footer Content" description="The very bottom of your site.">
               <div className="grid gap-6">
                  <Field label="Footer Description" value={settings.footerDescription} onChange={v => updateField('footerDescription', v)} textarea placeholder="Empowering businesses with enterprise-grade..." />
                  <Field label="Footer Contact Header" value={settings.footerContactTitle} onChange={v => updateField('footerContactTitle', v)} placeholder="Contact Us" />
               </div>
            </Section>
          </>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-end items-center gap-4">
        {saveSuccess && (
          <span className="text-sm text-green-600 font-bold flex items-center">
             ✓ Changes Applied Successfully!
          </span>
        )}
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-200 shadow-xl shadow-indigo-600/15"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Push Updates Live
        </button>
      </div>

    </div>
  );
}

function Section({ title, description, children, onGenerate }: { title: string, description: string, children: React.ReactNode, onGenerate?: () => void }) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h3>
          <p className="text-sm text-gray-500 font-medium">{description}</p>
        </div>
        {onGenerate && (
          <button 
            onClick={onGenerate}
            className="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1"
          >
            <Zap className="w-3 h-3" />
            Generate
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, textarea, rows = 3, placeholder, className, fieldKey, onAiGenerate, isGenerating, copied }: any) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{label}</label>
        {fieldKey && (
          <div className="flex gap-1">
            {value && (
              <button
                onClick={() => {
                  if (copied === fieldKey) {
                    navigator.clipboard.writeText(value);
                    copied(fieldKey);
                    setTimeout(() => copied(null), 2000);
                  }
                }}
                className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Copy to clipboard"
              >
                {copied === fieldKey ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            {onAiGenerate && (
              <button
                onClick={() => onAiGenerate(fieldKey)}
                disabled={isGenerating === fieldKey}
                className="px-2 py-1.5 rounded text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                title="Generate with AI"
              >
                {isGenerating === fieldKey ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
      {textarea ? (
        <textarea 
          rows={rows}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300" 
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input 
          type="text"
          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300" 
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function ListField({ label, items, onChange }: { label: string, items: string[], onChange: (v: string[]) => void }) {
  const addItem = () => onChange([...items, ""]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    onChange(next);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{label}</label>
        <button onClick={addItem} className="text-[10px] font-bold text-indigo-600 px-3 py-1 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all">+ Add Point</button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 group">
            <input 
              className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none"
              value={item}
              onChange={e => updateItem(i, e.target.value)}
              placeholder="Enter value..."
            />
            <button onClick={() => removeItem(i)} className="p-3 text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialList({ items, onChange }: { items: any[], onChange: (v: any[]) => void }) {
  const addItem = () => onChange([...items, { text: "", name: "", role: "", initials: "" }]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, val: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, i) => (
          <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative group">
             <button onClick={() => removeItem(i)} className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-4 h-4" />
             </button>
             <div className="space-y-4">
                <Field label="Testimonial Text" value={item.text} onChange={v => updateItem(i, 'text', v)} textarea rows={3} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name" value={item.name} onChange={v => updateItem(i, 'name', v)} />
                  <Field label="Role" value={item.role} onChange={v => updateItem(i, 'role', v)} />
                </div>
                <Field label="Initials (Fallback Avatar)" value={item.initials} onChange={v => updateItem(i, 'initials', v)} />
             </div>
          </div>
        ))}
      </div>
      <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-indigo-600 hover:text-indigo-600 transition-all">+ Add Testimonial</button>
    </div>
  );
}

function CapabilityList({ items, onChange }: { items: any[], onChange: (v: any[]) => void }) {
  const addItem = () => onChange([...items, { title: "", desc: "", icon: "Award", color: "text-indigo-600", bg: "bg-indigo-50" }]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, val: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {items.map((item, i) => (
          <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative group">
             <button onClick={() => removeItem(i)} className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-4 h-4" />
             </button>
             <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Title" value={item.title} onChange={v => updateItem(i, 'title', v)} />
                  <Field label="Icon (Key)" value={item.icon} onChange={v => updateItem(i, 'icon', v)} placeholder="Award, Users, etc." />
                </div>
                <Field label="Description" value={item.desc} onChange={v => updateItem(i, 'desc', v)} textarea rows={2} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Text Color (TW)" value={item.color} onChange={v => updateItem(i, 'color', v)} placeholder="text-indigo-600" />
                  <Field label="BG Color (TW)" value={item.bg} onChange={v => updateItem(i, 'bg', v)} placeholder="bg-indigo-50" />
                </div>
             </div>
          </div>
        ))}
      </div>
      <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-indigo-600 hover:text-indigo-600 transition-all">+ Add Capability</button>
    </div>
  );
}

function StatList({ items, onChange }: { items: any[], onChange: (v: any[]) => void }) {
  const addItem = () => onChange([...items, { label: "", value: "" }]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, val: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((item, i) => (
          <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-4 relative group">
             <button onClick={() => removeItem(i)} className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-4 h-4" />
             </button>
             <Field label="Value" value={item.value} onChange={v => updateItem(i, 'value', v)} placeholder="100+" />
             <Field label="Label" value={item.label} onChange={v => updateItem(i, 'label', v)} placeholder="Clients" />
          </div>
        ))}
      </div>
      <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-indigo-600 hover:text-indigo-600 transition-all">+ Add Metric</button>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2, MessageSquare, Globe, ArrowRight } from 'lucide-react';
import { useClientId } from '../lib/useClientId';
import { cn } from '../lib/utils';

export default function Contact() {
  const { clientId } = useClientId();
  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    preferredContactMethod: 'email'
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/v1/public/settings?clientId=${clientId}`)
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      })
      .then(data => {
        if (data?.success) setSettings(data.data);
        else setSettings(data);
      })
      .catch(err => {
        console.error('Settings load error:', err);
        setError('Failed to initialize session. Please check your connection.');
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  const businessName = settings?.businessName || 'Business Hub';
  const businessEmail = settings?.contactEmail || settings?.email || 'admin@example.com';
  const businessPhone = settings?.contactPhone || settings?.phone || '+1 (555) 000-0000';
  const businessAddress = settings?.address || 'Global Hub';

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Name required';
        if (value.trim().length < 2) return 'Min 2 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email';
        return '';
      case 'phone':
        if (!value.trim()) return 'Phone required';
        return '';
      case 'message':
        if (!value.trim()) return 'Message required';
        if (value.trim().length < 10) return 'Min 10 characters';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      phone: validateField('phone', formData.phone),
      message: validateField('message', formData.message)
    };
    
    setErrors(newErrors);
    setTouched({ name: true, email: true, phone: true, message: true });

    if (Object.values(newErrors).some(err => err !== '')) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, clientId })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || data.error || 'Submission failed');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses = (name: string) => cn(
    "w-full bg-slate-50 border rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 outline-none transition-all",
    errors[name] ? "border-red-100 focus:ring-red-500/10 focus:border-red-400" : "border-slate-100 focus:ring-indigo-500/10 focus:border-indigo-500"
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Environment...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center border border-slate-100 shadow-2xl shadow-indigo-100/50"
        >
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Message Transmitted</h2>
          <p className="text-gray-400 font-medium mb-10 leading-relaxed">Your inquiry is being routed to our senior team. Expect a response within 24 business hours.</p>
          <button 
            onClick={() => { setSuccess(false); setFormData({ name: '', email: '', phone: '', subject: '', message: '', preferredContactMethod: 'email' }); }} 
            className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-600/20"
          >
            Send Another Inquiry
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-20 items-start">
          {/* Header & Info */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }} 
            animate={{ opacity: 1, x: 0 }}
            className="space-y-12"
          >
            <div className="space-y-6">
               <span className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] shadow-sm">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  Connect With Us
               </span>
               <h1 className="text-6xl sm:text-7xl font-black text-gray-900 tracking-tight leading-[0.9]">
                  {settings?.contactTitle || "Let's Build"} <br /><span className="text-indigo-600">{settings?.contactHighlight || "Together"}</span>.
               </h1>
               <p className="text-xl text-gray-400 font-medium tracking-tight max-w-xl leading-relaxed">
                  {settings?.contactSubtitle || "Ready to deploy something extraordinary? Our technical team is standing by to roadmap your transformation."}
               </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
               {[
                 { icon: Mail, label: 'Email Support', val: businessEmail, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                 { icon: Phone, label: 'Voice Link', val: businessPhone, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                 { icon: MapPin, label: 'Tech Hub', val: businessAddress, color: 'text-amber-600', bg: 'bg-amber-50' },
                 { icon: Globe, label: 'Regional Focus', val: settings?.regionalFocus || 'Active in 12 Zones', color: 'text-rose-600', bg: 'bg-rose-50' },
               ].map((item, i) => (
                 <div key={i} className="flex items-start gap-4 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-50 group hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform", item.bg)}>
                       <item.icon className={cn("w-5 h-5", item.color)} />
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</div>
                       <div className="text-sm font-bold text-gray-900">{item.val}</div>
                    </div>
                 </div>
               ))}
            </div>
          </motion.div>

          {/* Form */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-10 sm:p-16 rounded-[3rem] border border-slate-100 shadow-2xl shadow-indigo-100/50"
          >
            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    name="name"
                    className={inputClasses('name')}
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.name && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone</label>
                  <input
                    name="phone"
                    className={inputClasses('phone')}
                    placeholder="+1 (000) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.phone && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.phone}</p>}
                </div>
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  name="email"
                  type="email"
                  className={inputClasses('email')}
                  placeholder="email@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {errors.email && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.email}</p>}
              </div>
 
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message</label>
                <textarea
                  name="message"
                  rows={4}
                  className={inputClasses('message')}
                  placeholder="How can we help?"
                  value={formData.message}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {errors.message && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{errors.message}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-6 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Inquiry <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Calendar, Clock, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export default function BookDiscovery() {
  // Landing page booking is exclusively for superadmin tenant
  const superadminClientId = 'platform-prime';
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    interest: 'Enterprise Solutions',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/v1/public/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          serviceSelection: 'Discovery Call',
          preferredDate: format(new Date(), 'yyyy-MM-dd'), // Default to today for lead capture
          preferredStartTime: format(new Date(), 'HH:mm'),
          clientId: superadminClientId
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || data.error || 'Submission failed');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center border border-slate-100 shadow-2xl shadow-indigo-100/50"
        >
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Request Received</h2>
          <p className="text-gray-400 font-medium mb-10 leading-relaxed">Our specialists are reviewing your profile. Expect a calendar invite within 2 business hours.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-600/20"
          >
            Return to Command Center
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-10"
        >
          <div className="space-y-6">
            <span className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white border border-slate-200 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] shadow-sm">
              <Sparkles className="w-4 h-4" />
              Strategic Partnership
            </span>
            <h1 className="text-6xl sm:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
              Connect with an <br />
              <span className="text-indigo-600">Expert Agent</span>.
            </h1>
            <p className="text-xl text-slate-500 font-medium tracking-tight max-w-xl leading-relaxed">
              Schedule a technical briefing or partnership discussion. Our agents are ready to roadmap your enterprise transformation.
            </p>
          </div>

          <div className="space-y-6">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                   <Clock className="w-6 h-6" />
                </div>
                <div>
                   <div className="text-sm font-black text-slate-900">Direct Agent Chat</div>
                   <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Priority Support</div>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                   <Calendar className="w-6 h-6" />
                </div>
                <div>
                   <div className="text-sm font-black text-slate-900">Strategic Alignment</div>
                   <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Global Partnership Hub</div>
                </div>
             </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 sm:p-14 rounded-[3rem] border border-slate-200 shadow-2xl shadow-indigo-100/50"
        >
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">
               {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid sm:grid-cols-2 gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Enter your name"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Professional Email</label>
                  <input 
                    required
                    type="email"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    placeholder="email@company.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
               </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    placeholder="+1 (000) 000-0000"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inquiry Type</label>
                  <select 
                    title="Interest"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
                    value={formData.interest}
                    onChange={e => setFormData({...formData, interest: e.target.value})}
                  >
                    <option>Strategic Partnership</option>
                    <option>Agent Discussion</option>
                    <option>Enterprise Integration</option>
                    <option>General Inquiry</option>
                  </select>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meeting Notes</label>
               <textarea 
                 rows={3}
                 className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                 placeholder="How can we help you today?"
                 value={formData.notes}
                 onChange={e => setFormData({...formData, notes: e.target.value})}
               />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-6 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Schedule Chat <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

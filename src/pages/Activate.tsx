import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Mail, Loader2, CheckCircle2, AlertCircle, ArrowRight, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Activate() {
  const [formData, setFormData] = useState({ email: '', token: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/v1/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, activationToken: formData.token })
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: 'Account activated successfully! Redirecting to login...' });
        setTimeout(() => navigate('/client/login'), 3000);
      } else {
        setStatus({ type: 'error', message: typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : (data.error || 'Activation failed. Please check your token and email.') });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Connection error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tight">Activate Portal</span>
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Activation</h1>
          <p className="text-slate-500 font-medium mt-2">Enter your specialized activation key to unlock your dashboard.</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-indigo-500/5"
        >
          <AnimatePresence mode="wait">
            {status && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-wider",
                  status.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                )}
              >
                {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {status.message}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email"
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  placeholder="name@business.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Activation Token (License Key)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-mono font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                  placeholder="ACT-XXXX-XXXX-XXXX"
                  value={formData.token}
                  onChange={e => setFormData({ ...formData, token: e.target.value })}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-slate-900 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Activate My Portal <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </motion.div>

        <div className="mt-8 text-center">
        </div>
      </div>
    </div>
  );
}

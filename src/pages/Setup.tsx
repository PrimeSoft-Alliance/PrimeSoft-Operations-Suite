import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, User, AlertCircle, Loader2, Rocket } from 'lucide-react';
import { motion } from 'motion/react';

export default function Setup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    businessName: 'System Admin',
    email: '',
    password: '',
    secret: ''
  });

  useEffect(() => {
    fetch('/v1/auth/setup-status')
      .then(res => res.json())
      .then(data => {
        setSetupRequired(data.setupRequired);
        if (!data.setupRequired) {
          navigate('/login');
        }
      })
      .catch(() => setError('Failed to check system status'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/v1/auth/super-admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        navigate('/login');
      } else {
        setError(data.error || 'Setup failed');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!setupRequired) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center justify-center font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-12 border border-slate-100"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Setup</h1>
          <p className="mt-2 text-sm text-gray-500 font-medium leading-relaxed">
            Initialize the platform by creating the first <span className="text-indigo-600 font-bold">Super Admin</span> account.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                required
                type="email"
                placeholder="admin@primesoft.com"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secure Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                required
                type="password"
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Setup Secret</label>
            <div className="relative">
              <Rocket className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                required
                type="password"
                placeholder="Check SUPERADMIN_SETUP_SECRET env"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium font-mono"
                value={formData.secret}
                onChange={e => setFormData({...formData, secret: e.target.value})}
              />
            </div>
            <p className="text-[10px] text-gray-400 italic px-1">Defaults to <b>primesoft_init_2024</b> if not set.</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                Finish Initialization
                <Rocket className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cpu, Mail, Lock, Loader2, AlertCircle, Rocket } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/v1/auth/setup-status')
      .then(res => res.json())
      .then(data => {
        if (data.setupRequired) {
          navigate('/setup', { replace: true });
        } else {
          return fetch('/v1/auth/check');
        }
      })
      .then(res => res?.json())
      .then(data => {
        if (data?.authenticated) {
          if (data.role === 'superadmin') navigate('/superadmin', { replace: true });
          else navigate('/dashboard', { replace: true });
        }
      })
      .catch(console.error);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        if (data.role === 'superadmin') navigate('/superadmin');
        else navigate('/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[420px] w-full bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 p-8 sm:p-12 border border-slate-100"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2.5 group mb-6">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Cpu className="w-7 h-7" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-gray-900 group-hover:text-indigo-600 transition-colors">
              PrimeSoft<span className="text-indigo-600">.</span>
            </span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Welcome Back</h1>
          <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">Login to your workspace</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-xs font-bold"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                required
                type="email"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                placeholder="admin@primesoft.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                required
                type="password"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col items-center gap-4">
          <p className="text-sm font-bold text-gray-400">New around here?</p>
          <Link 
            to="/get-started" 
            className="flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-xs hover:text-indigo-700 transition-colors"
          >
            Create an Account <Rocket className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
      
      <div className="mt-12 text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] flex items-center gap-8">
        <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
        <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
        <Link to="/contact" className="hover:text-gray-400 transition-colors">Support</Link>
      </div>
    </div>
  );
}

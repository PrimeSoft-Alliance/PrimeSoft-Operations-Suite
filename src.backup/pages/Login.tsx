import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cpu, Mail, Lock, Loader2, AlertCircle, Rocket } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login({ loginRole = 'client' }: { loginRole?: 'client' | 'superadmin' }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/v1/auth/status-info')
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
        body: JSON.stringify({ ...formData, role: loginRole })
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
        className="max-w-[400px] w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-bold text-indigo-600 mb-2 hover:text-indigo-700 transition">
            Nexus Platform<span className="text-gray-900">.</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            {loginRole === 'superadmin' ? 'Admin Portal' : 'Client Portal'}
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              required
              type="email"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 text-gray-900"
              placeholder="Email address"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <input
              required
              type="password"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 text-gray-900"
              placeholder="Password"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

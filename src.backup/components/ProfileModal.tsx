import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Lock, Shield, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [profile, setProfile] = useState({
    businessName: '',
    email: '',
    password: '',
    mfaEnabled: false
  });

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/auth/me');
      if (res.ok) {
        const data = await res.json();
        setProfile({
          businessName: data.businessName || '',
          email: data.email || '',
          password: '',
          mfaEnabled: data.mfaEnabled || false
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/v1/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
        setTimeout(() => {
            setMessage(null);
            onClose();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Account Profile</h3>
                  <p className="text-xs text-gray-500 font-medium">Update your personal and security information.</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-8">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Business / Display Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Your Name"
                          value={profile.businessName}
                          onChange={e => setProfile({...profile, businessName: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="email@example.com"
                          value={profile.email}
                          onChange={e => setProfile({...profile, email: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">New Password (Leave blank to keep current)</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="password"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="••••••••"
                          value={profile.password}
                          onChange={e => setProfile({...profile, password: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-indigo-900 uppercase tracking-tight">Two-Factor Auth</div>
                        <div className="text-[10px] text-indigo-600 font-bold opacity-70">Enhance your account security</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfile({...profile, mfaEnabled: !profile.mfaEnabled})}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        profile.mfaEnabled ? "bg-indigo-600" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                        profile.mfaEnabled ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                          "px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold",
                          message.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {message.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-600 shadow-xl shadow-indigo-600/10 transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Processing...' : 'Save Workspace Changes'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Cpu, Mail, Lock, Loader2, AlertCircle, Shield, 
  ArrowLeft, CheckCircle2, User, Building2, Phone, HelpCircle, Key, RefreshCw,
  Eye, EyeOff
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'forgot_validate' | 'forgot_reset'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sign In state
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBackupCode, setMfaBackupCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResend2FA = async () => {
    if (!canResend) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('A fresh activation key has been dispatched to your inbox.');
        setMfaBackupCode(data.code || '');
        setResendTimer(30);
        setCanResend(false);
      } else {
        setError(data.error || 'Failed to resend code');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  // Recovery validate state
  const [recoveryData, setRecoveryData] = useState({
    fullName: '',
    businessName: '',
    phone: '',
    email: '',
    secretQuestion: 'What was the name of your first school?',
    secretAnswer: ''
  });
  
  // Recovery reset state
  const [resetData, setResetData] = useState({
    code: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [forgotBackupCode, setForgotBackupCode] = useState('');

  useEffect(() => {
    fetch('/v1/auth/check')
      .then(async res => {
        if (!res.ok) return { authenticated: false };
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return { authenticated: false };
        }
      })
      .then(data => {
        if (data?.authenticated) {
          navigate('/dashboard', { replace: true });
        }
      })
      .catch(console.error);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.requires2FA) {
          setShow2FA(true);
          setMfaBackupCode(data.code || '');
          setSuccess('Workspace Activation Code required. A 6-digit key has been sent to your registered email address.');
          setResendTimer(30);
          setCanResend(false);
        } else {
          if (data.clientId) {
            localStorage.setItem('ps_client_id', data.clientId);
          }
          if (data.token) {
            localStorage.setItem('auth_token', data.token);
          }
          navigate('/dashboard');
        }
      } else {
        setError(typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : (data.error || 'Invalid credentials'));
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) return setError('Please enter your 2FA verification key.');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/v1/auth/login/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: mfaCode.trim()
        })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (data.clientId) {
          localStorage.setItem('ps_client_id', data.clientId);
        }
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
        }
        navigate('/dashboard');
      } else {
        setError(typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : (data.error || 'Incorrect or expired verification code.'));
      }
    } catch (err) {
      setError('A connection error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check all fields
    if (!recoveryData.fullName.trim()) return setError('Full Name is required.');
    if (!recoveryData.businessName.trim()) return setError('Business Name is required.');
    if (!recoveryData.phone.trim()) return setError('Phone Number is required.');
    if (!recoveryData.email.trim()) return setError('Email is required.');
    if (!recoveryData.secretAnswer.trim()) return setError('Secret Security Answer is required.');

    setLoading(true);
    try {
      const res = await fetch('/v1/auth/forgot-password/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recoveryData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setForgotBackupCode(data.code || '');
        setSuccess(data.message || 'Identity confirmed! Standard OTP has been sent.');
        setView('forgot_reset');
      } else {
        setError(typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : (data.error || 'Failed to validate administrative credentials.'));
      }
    } catch (err) {
      setError('A network error occurred while validating credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetData.code.trim()) return setError('Please enter the 6-digit confirmation key.');
    if (resetData.newPassword.length < 6) return setError('Your brand new password must consist of at least 6 characters.');
    if (resetData.newPassword !== resetData.confirmNewPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const res = await fetch('/v1/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryData.email,
          code: resetData.code.trim(),
          newPassword: resetData.newPassword
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Password updated successfully! You can now log in.');
        setFormData({ ...formData, email: recoveryData.email });
        setView('login');
        // Clear recovery state
        setResetData({ code: '', newPassword: '', confirmNewPassword: '' });
      } else {
        setError(typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : (data.error || 'Failed to complete password reset.'));
      }
    } catch (err) {
      setError('A network error occurred completing credential reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-3 sm:p-6 py-6 sm:py-12 font-sans relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[460px] w-full bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/60 p-4 sm:p-10 relative z-10 mx-auto"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-black text-indigo-900 border-2 border-indigo-900 px-3 py-1 rounded-lg mb-4 hover:bg-slate-50 transition">
            OminiRep
          </Link>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {show2FA ? 'Identity Verification' : view === 'login' ? 'Client Portal' : view === 'forgot_validate' ? 'Administrative Recovery' : 'Create New Password'}
          </h1>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-[0.15em]">
            {show2FA ? 'Secure Workspace Access' : view === 'login' ? 'Sign in to manage your environment' : view === 'forgot_validate' ? 'Validate master parameters' : 'Complete portal access setup'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-start gap-2.5 text-xs font-bold leading-normal">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl flex items-start gap-2.5 text-xs font-semibold leading-normal">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* 2FA Challenge Form */}
        {show2FA ? (
          <form onSubmit={handleVerify2FA} className="space-y-8">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Verify Your Identity</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                  We've sent a 6-digit secure activation key to your registered email address. This step ensures your workspace remains protected.
                </p>
              </div>

              {/* Dev Fallback Hook */}
              {mfaBackupCode && (
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-1 items-center">
                  <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-widest">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Development Access Code
                  </div>
                  <p className="text-sm font-black text-amber-900 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 mt-1">
                    {mfaBackupCode}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1 block">Security Access Key</label>
              <input 
                required
                type="text" 
                maxLength={6}
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                className="w-full tracking-[0.6em] text-center px-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none font-black text-2xl text-slate-900 transition-all placeholder:tracking-normal placeholder:font-bold placeholder:text-slate-200"
                placeholder="000000"
              />
              <div className="flex justify-center">
                <button 
                  type="button"
                  disabled={!canResend || loading}
                  onClick={handleResend2FA}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : "Didn't receive the code?"}
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => { setShow2FA(false); setMfaCode(''); }}
                className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Cancel
              </button>

              <button 
                type="submit" 
                disabled={loading}
                className="flex-[2] py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Authorize Access'}
              </button>
            </div>
          </form>
        ) : view === 'login' ? (
          /* Standard Login View */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="email"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-505 outline-none transition-all placeholder:text-gray-400 text-gray-900 font-semibold text-xs"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pl-10 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-505 outline-none transition-all placeholder:text-slate-400 text-slate-900 font-semibold text-xs"
                  placeholder="🔑 Enter account password"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition cursor-pointer flex items-center justify-center p-0.5"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link - Cleanly placed inside form block */}
            <div className="flex justify-end pt-1">
              <button 
                type="button" 
                onClick={() => { setView('forgot_validate'); setError(''); setSuccess(''); }}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 hover:underline transition cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-indigo-600 text-white font-black uppercase tracking-wider text-[10px] rounded-xl hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
            </button>
          </form>
        ) : view === 'forgot_validate' ? (
          /* Forgot Password Step 1: Validate Identity Form */
          <form onSubmit={handleRecoveryValidate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Your Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="text"
                    value={recoveryData.fullName}
                    onChange={e => setRecoveryData({ ...recoveryData, fullName: e.target.value })}
                    placeholder="Full Name"
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/25 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Business Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="text"
                    value={recoveryData.businessName}
                    onChange={e => setRecoveryData({ ...recoveryData, businessName: e.target.value })}
                    placeholder="Business Name"
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/25 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="tel"
                    value={recoveryData.phone}
                    onChange={e => setRecoveryData({ ...recoveryData, phone: e.target.value })}
                    placeholder="Phone"
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/25 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="email"
                    value={recoveryData.email}
                    onChange={e => setRecoveryData({ ...recoveryData, email: e.target.value })}
                    placeholder="Email"
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/25 outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Secret Security Question</label>
              <div className="relative">
                <HelpCircle className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={recoveryData.secretQuestion}
                  onChange={e => setRecoveryData({ ...recoveryData, secretQuestion: e.target.value })}
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/25 outline-none cursor-pointer"
                >
                  <option value="What was the name of your first school?">What was the name of your first school?</option>
                  <option value="What city was your business registered in?">What city was your business registered in?</option>
                  <option value="What was your childhood nickname?">What was your childhood nickname?</option>
                  <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                  <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                  <option value="What was the model of your first vehicle?">What was the model of your first vehicle?</option>
                  <option value="In what city did your parents meet?">In what city did your parents meet?</option>
                  <option value="What is the name of your favorite teacher?">What is the name of your favorite teacher?</option>
                  <option value="What is the name of your first employer?">What is the name of your first employer?</option>
                  <option value="What is your favorite book or cinema title?">What is your favorite book or cinema title?</option>
                  <option value="What was the name of the street you grew up on?">What was the name of the street you grew up on?</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Your Secret Answer</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="text"
                  value={recoveryData.secretAnswer}
                  onChange={e => setRecoveryData({ ...recoveryData, secretAnswer: e.target.value })}
                  placeholder="Answer your chosen security question"
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/25 outline-none font-mono"
                />
              </div>
            </div>

            {/* Recovery Alert message */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-amber-800 text-[10.5px] font-medium leading-relaxed font-sans">
              <span className="font-bold">Important - Keep your secret phrase safe:</span> Please write it down somewhere because if lost you cannot recover it.
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setView('login')}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-black uppercase tracking-wider text-[10px] rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase tracking-wider text-[10px] rounded-xl hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Identity'}
              </button>
            </div>
          </form>
        ) : (
          /* Forgot Password Step 2: Reset Password Form */
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="bg-emerald-50/50 border border-emerald-150 rounded-2xl p-5 text-center">
              <Shield className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-900">Identity Validated</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1 leading-normal">
                Credentials successfully matched! Enter the temporary 6-digit code dispatched to <span className="font-bold text-slate-900">{recoveryData.email}</span> along with your new password.
              </p>

              {/* Sandbox verification fallback */}
              {forgotBackupCode && (
                <div className="mt-4 pt-3 border-t border-emerald-100 flex flex-col gap-1 items-center">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-800 uppercase tracking-wider">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    Sandbox OTP fallback
                  </div>
                  <p className="text-sm font-extrabold text-indigo-700 select-all tracking-wider bg-white px-3 py-1.5 border border-indigo-200 rounded-lg">
                    {forgotBackupCode}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">6-Digit Key OTP Code</label>
              <input
                required
                type="text"
                maxLength={6}
                value={resetData.code}
                onChange={e => setResetData({ ...resetData, code: e.target.value.replace(/\D/g, '') })}
                placeholder="000000"
                className="w-full tracking-[0.5em] text-center py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold focus:ring-2 focus:ring-indigo-500/25 outline-none placeholder:tracking-normal placeholder:font-semibold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">New Password</label>
              <div className="relative">
                <input
                  required
                  type={showNewPassword ? 'text' : 'password'}
                  minLength={6}
                  value={resetData.newPassword}
                  onChange={e => setResetData({ ...resetData, newPassword: e.target.value })}
                  placeholder="🔑 Define custom secure password"
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/25 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition cursor-pointer flex items-center justify-center p-0.5"
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Confirm New Password</label>
              <div className="relative">
                <input
                  required
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  minLength={6}
                  value={resetData.confirmNewPassword}
                  onChange={e => setResetData({ ...resetData, confirmNewPassword: e.target.value })}
                  placeholder="🔑 Re-enter new password to verify"
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/25 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition cursor-pointer flex items-center justify-center p-0.5"
                  title={showConfirmNewPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                type="button" 
                onClick={() => setView('forgot_validate')}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-black uppercase tracking-wider text-[10px] rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 py-3 bg-indigo-605 bg-indigo-600 text-white font-black uppercase tracking-wider text-[10px] rounded-xl hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save New Password'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider leading-relaxed">
          {view === 'login' ? (
            <div className="space-y-1.5">
              <div>New Corporate Environment?</div>
              <Link to="/signup" className="text-indigo-600 font-black hover:underline transition">
                Register Workspace
              </Link>
            </div>
          ) : (
            <button 
              type="button"
              onClick={() => { setView('login'); setError(''); setSuccess(''); }}
              className="text-indigo-600 font-black hover:underline transition cursor-pointer"
            >
              Sign In to Administrative Portal
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

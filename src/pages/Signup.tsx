import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Briefcase, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft,
  Loader2,
  Sparkles
} from 'lucide-react';

export default function Signup() {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    businessType: 'Corporate'
  });
  
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Field Validations
    if (!formData.fullName.trim()) return setError('Please enter your full name.');
    if (!formData.businessName.trim()) return setError('Please enter your business name.');
    if (!formData.email.trim()) return setError('Please enter a valid work email.');
    if (!formData.phone.trim()) return setError('Please enter your phone number.');
    if (formData.password.length < 6) return setError('Password must be at least 6 characters.');
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      const res = await fetch('/v1/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setGeneratedCode(''); // Clear since email is actually dispatched
        setStep(2);
      } else if (data.code) {
        // Fallback for missing SMTP credentials in local work environments
        setGeneratedCode(data.code);
        setStep(2);
      } else {
        setError(data.error || 'Failed to verify account details. Please try again.');
      }
    } catch (err) {
      setError('A network error occurred while generating verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) return setError('Please enter the 6-digit verification code.');
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          code: verificationCode.trim()
        })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (data.clientId) {
          localStorage.setItem('ps_client_id', data.clientId);
        }
        navigate('/dashboard');
      } else {
        setError(data.error || 'Failed to complete registration.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background aesthetics */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>

      <div className="bg-white p-8 sm:p-10 border border-slate-200/60 shadow-xl rounded-3xl w-full max-w-lg transition-all duration-300 relative z-10">
        {/* Logo Icon */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-black text-indigo-900 border-2 border-indigo-900 px-3 py-1 rounded-lg mb-4 hover:bg-slate-50 transition-all">
            OminiCSR
          </Link>
          <h1 className="text-2xl font-bold text-gray-950">
            {step === 1 ? 'Workspace Registration' : 'Account Verification'}
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            {step === 1 ? 'Set up your social impact environment' : 'Verify your email to continue'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl mb-6 text-xs font-bold border border-rose-100 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleNextStep} className="space-y-4">
            {/* Step 1 Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    required
                    type="text" 
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-950 placeholder:text-slate-400 transition-all"
                    placeholder="Your Name"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Work Phone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    required
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-950 placeholder:text-slate-400 transition-all"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-950 placeholder:text-slate-400 transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Business Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    required
                    type="text" 
                    value={formData.businessName}
                    onChange={e => setFormData({...formData, businessName: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-950 placeholder:text-slate-400 transition-all"
                    placeholder="Acme Corp"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Industry Sector</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select 
                    value={formData.businessType}
                    onChange={e => setFormData({...formData, businessType: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-950 transition-all"
                  >
                    <option value="Corporate">Corporate CSR</option>
                    <option value="NGO Partner">NGO / Nonprofit</option>
                    <option value="Community Organizer">Community Group</option>
                    <option value="Consulting">Consultancy Practice</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    required
                    type="password" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-950 placeholder:text-slate-400 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    required
                    type="password" 
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-950 placeholder:text-slate-400 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-2.5 pt-1.5 pb-2">
              <input 
                id="agree"
                type="checkbox"
                required
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="agree" className="text-[11px] font-medium text-slate-500 leading-normal">
                I agree to the OminiCSR Platform Terms of Service and Privacy Directives.
              </label>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 text-white font-black uppercase tracking-wider text-[10px] rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md hover:shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Request Activation Code
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCompleteSubmit} className="space-y-6">
            {/* Step 2 Form */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-indigo-950">Verification Code Sent</h3>
                  <p className="text-[11px] text-indigo-700 font-medium mt-1 leading-normal">
                    We dispatched a secure 6-digit verification code to <span className="font-extrabold text-indigo-950">{formData.email}</span>. Please verify your inbox & spam folder.
                  </p>
                </div>
              </div>

              {/* Development Sandbox Hint */}
              {generatedCode && (
                <div className="mt-4 pt-3 border-t border-indigo-200/50 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-800 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    SMTP Fallback Mode
                  </div>
                  <p className="text-[11px] font-semibold text-amber-950 bg-amber-50/80 border border-amber-200 rounded-lg py-2 px-3 inline-block mt-1 leading-relaxed">
                    Server SMTP env variables are not fully configured. As a backup sandbox code we loaded your OTP: <span className="font-extrabold text-sm text-indigo-700 select-all tracking-wider ml-1">{generatedCode}</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-2 block">6-Digit Verification Code</label>
              <input 
                required
                type="text" 
                maxLength={6}
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="w-full tracking-[0.5em] text-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-bold text-lg text-gray-950 transition-all placeholder:tracking-normal placeholder:font-semibold"
                placeholder="000000"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-black uppercase tracking-wider text-[10px] rounded-xl hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Details
              </button>

              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase tracking-wider text-[10px] rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md hover:shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Verify & Create
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Already have an account? <Link to="/client/login" className="text-indigo-600 font-black hover:underline ml-1">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

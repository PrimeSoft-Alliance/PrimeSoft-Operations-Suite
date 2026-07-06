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
  Sparkles,
  Eye,
  EyeOff
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
    businessType: 'Corporate',
    secretQuestion: 'What was the name of your first school?',
    secretAnswer: ''
  });
  
  const [selectedIndustry, setSelectedIndustry] = useState('Corporate');
  const [customIndustry, setCustomIndustry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
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

  const handleResendCode = async () => {
    if (!canResend) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/v1/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.code) setGeneratedCode(data.code);
        setResendTimer(30);
        setCanResend(false);
        setError('');
      } else {
        setError(data.error || 'Failed to resend code');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

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
    if (!formData.secretAnswer.trim()) {
      return setError('Please enter an answer to your security question.');
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
        if (data.code) {
          setGeneratedCode(data.code);
        } else {
          setGeneratedCode(''); // Clear since email is actually dispatched
        }
        setResendTimer(30);
        setCanResend(false);
        setStep(2);
      } else if (data.code) {
        // Fallback for missing SMTP credentials in local work environments
        setGeneratedCode(data.code);
        setResendTimer(30);
        setCanResend(false);
        setStep(2);
      } else {
        setError(typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : (data.error || 'Failed to verify account details. Please try again.'));
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
        setError(typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : (data.error || 'Failed to complete registration.'));
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12 relative overflow-hidden font-sans">
      {/* Background aesthetics */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>

      <div className="bg-white p-4 sm:p-10 border border-slate-200/60 shadow-xl rounded-2xl sm:rounded-3xl w-full max-w-lg transition-all duration-300 relative z-10 mx-auto">
        {/* Logo Icon */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-black text-indigo-900 border-2 border-indigo-900 px-3 py-1 rounded-lg mb-4 hover:bg-slate-50 transition-all">
            OminiRep
          </Link>
          <h1 className="text-2xl font-bold text-gray-950">
            {step === 1 ? 'Workspace Registration' : 'Account Verification'}
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            {step === 1 ? 'Set up your virtual representative environment' : 'Verify your email to continue'}
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
                    value={selectedIndustry}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedIndustry(val);
                      if (val !== 'Other') {
                        setFormData({...formData, businessType: val});
                      } else {
                        setFormData({...formData, businessType: customIndustry || 'Other'});
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-955 transition-all cursor-pointer"
                  >
                    <option value="Corporate">Corporate &amp; CSR</option>
                    <option value="Technology">Technology &amp; SaaS</option>
                    <option value="E-commerce">E-commerce &amp; Retail</option>
                    <option value="Healthcare">Healthcare &amp; Medical</option>
                    <option value="Real Estate">Real Estate &amp; Property</option>
                    <option value="Finance">Finance &amp; Banking</option>
                    <option value="Education">Education &amp; E-learning</option>
                    <option value="Travel">Travel &amp; Hospitality</option>
                    <option value="Legal &amp; Compliance">Legal &amp; Compliance Services</option>
                    <option value="Construction &amp; Engineering">Construction &amp; Engineering</option>
                    <option value="Energy &amp; Utilities">Energy &amp; Utilities</option>
                    <option value="Food &amp; Beverage">Food &amp; Beverage</option>
                    <option value="Creative &amp; Marketing">Creative &amp; Marketing Agencies</option>
                    <option value="NGOs &amp; Nonprofits">NGOs &amp; Nonprofits</option>
                    <option value="Community Organizers">Community Organizers</option>
                    <option value="HR &amp; Staffing">HR, Recruiting &amp; Staffing</option>
                    <option value="Transportation &amp; Logistics">Transportation &amp; Logistics</option>
                    <option value="Manufacturing &amp; Hardware">Manufacturing &amp; Hardware</option>
                    <option value="Entertainment &amp; Media">Entertainment &amp; Media</option>
                    <option value="Automotive">Automotive</option>
                    <option value="Beauty &amp; Wellness">Beauty &amp; Wellness</option>
                    <option value="Consultancy &amp; Professional">Consultancy &amp; Professional Services</option>
                    <option value="Agriculture &amp; Farming">Agriculture &amp; Farming</option>
                    <option value="Other">Other (Specify Custom...)</option>
                  </select>
                </div>
                {selectedIndustry === 'Other' && (
                  <div className="mt-3">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-wider ml-1 mb-1 block">Custom Industry Name</label>
                    <div className="relative">
                      <Sparkles className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        required
                        type="text" 
                        value={customIndustry}
                        onChange={e => {
                          setCustomIndustry(e.target.value);
                          setFormData({...formData, businessType: e.target.value});
                        }}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-955 placeholder:text-slate-400 transition-all"
                        placeholder="e.g. Space Tech, Nanotechnology"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    required
                    type={showPassword ? 'text' : 'password'} 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-950 placeholder:text-slate-400 transition-all"
                    placeholder="••••••••"
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

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    required
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-950 placeholder:text-slate-400 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition cursor-pointer flex items-center justify-center p-0.5"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Secret Phrase / Question & Answer */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4">
              <div className="text-[10px] font-black text-indigo-905 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <ShieldCheck className="w-4 h-4 text-indigo-650" /> Account Recovery Security Q&amp;A
              </div>
              
              <div className="space-y-4 font-sans">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Select Security Question</label>
                  <select
                    value={formData.secretQuestion}
                    onChange={e => setFormData({...formData, secretQuestion: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-505/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-955 transition-all cursor-pointer"
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
                    <option value="What was the name of the hospital where you were born?">What was the name of the hospital where you were born?</option>
                    <option value="What was the first concert you ever attended?">What was the first concert you ever attended?</option>
                    <option value="What is your primary manager's last name?">What is your primary manager's last name?</option>
                    <option value="What was your first phone model?">What was your first phone model?</option>
                    <option value="What was the name of your childhood best friend?">What was the name of your childhood best friend?</option>
                    <option value="What is the name of the company where you got your first job?">What is the name of the company where you got your first job?</option>
                    <option value="What is the country you would most like to visit?">What is the country you would most like to visit?</option>
                    <option value="What was your favorite subject in primary school?">What was your favorite subject in primary school?</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1 font-sans">Your Secret Answer</label>
                  <input
                    required
                    type="text"
                    value={formData.secretAnswer}
                    onChange={e => setFormData({...formData, secretAnswer: e.target.value})}
                    placeholder="Enter answer (case-insensitive)"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-505/20 focus:border-indigo-600 outline-none font-semibold text-xs text-gray-955 placeholder:text-slate-400 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Warning Alert */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-amber-800 text-[11px] font-medium leading-relaxed font-sans">
                <span className="font-bold">Important - Keep your secret phrase safe:</span> Please write it down somewhere because if lost you cannot recover it.
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-2.5 pt-1.5 pb-2">
              <input 
                id="agree"
                type="checkbox"
                required
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="agree" className="text-[11px] font-semibold text-slate-500 leading-relaxed font-sans cursor-pointer select-none">
                I agree to the{' '}
                <Link to="/privacy" target="_blank" className="text-indigo-600 font-bold hover:underline transition">
                  PrimeSoft Alliance Terms of Service and Privacy Directives
                </Link>
                .
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
              <div className="flex justify-center mt-4">
                <button 
                  type="button"
                  disabled={!canResend || loading}
                  onClick={handleResendCode}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : "Didn't receive the code?"}
                </button>
              </div>
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

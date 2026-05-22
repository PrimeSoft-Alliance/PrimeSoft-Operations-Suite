import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Rocket, Zap, Shield, Users, Mail, Phone, User, ArrowRight, Loader2, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PublicOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessType: 'service',
    message: ''
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/v1/public/onboarding-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && (data.success || data.data?.success)) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to submit onboarding application. Please try again.');
      }
    } catch (err) {
      setError('A connection error occurred. Our servers are indexing your request, please retry in a second.');
    } finally {
      setSubmitting(false);
    }
  };

  const benefits = [
    { title: 'AI-Powered Automation', description: 'Scale your business with intelligent workflows.', icon: Zap },
    { title: 'Secure Infrastructure', description: 'Enterprise-grade security for your data.', icon: Shield },
    { title: 'Customer Insights', description: 'Deep analytics to understand your audience.', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-4 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        
        {/* Left: Content */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-10"
        >
          <div>
            <span className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              Start Your Journey
            </span>
            <h1 className="text-5xl sm:text-6xl font-black text-gray-900 tracking-tight leading-tight">
              Scale Your <span className="text-indigo-600 italic">Vision</span> with Us.
            </h1>
            <p className="mt-6 text-xl text-gray-500 font-medium leading-relaxed max-w-xl">
              Join the future of business management. We provide the tools you need to automate, track, and grow your digital presence.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex gap-4 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">{benefit.title}</h4>
                  <p className="text-sm text-gray-500 font-medium">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 max-w-md">
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-emerald-50 bg-slate-200" />
              ))}
            </div>
            <p className="text-sm font-bold text-emerald-800">
              Trusted by 500+ forward-thinking founders.
            </p>
          </div>
        </motion.div>

        {/* Right: Interactive Form */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/10 to-emerald-500/10 blur-3xl rounded-[3rem] -z-10" />
          
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 sm:p-14 border border-slate-100 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-10 space-y-6"
                >
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">You're on the list!</h3>
                  <p className="text-gray-500 font-medium">
                    Thank you for your interest, {formData.name}. Our team will contact you within 24 hours to schedule a deep-dive call.
                  </p>
                  <button 
                    onClick={() => navigate('/')}
                    className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs"
                  >
                    Return Home
                  </button>
                </motion.div>
              ) : (
                <motion.form 
                  key="form"
                  onSubmit={handleSubmit}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                      <Rocket className="w-6 h-6 text-indigo-600" />
                      Get Started
                    </h3>
                    <p className="text-sm font-medium text-gray-400">Step {step} of 2 — Tell us about yourself</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-bold leading-relaxed flex items-center gap-2">
                      <span>⚠️</span> {error}
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {step === 1 ? (
                      <motion.div 
                        key="step1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                              required
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                              placeholder="John Smith"
                              value={formData.name}
                              onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Work Email</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                              required
                              type="email"
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                              placeholder="john@company.com"
                              value={formData.email}
                              onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={() => formData.name && formData.email && nextStep()}
                          className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-black transition-all"
                        >
                          Next Step
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="step2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                         <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                              placeholder="+1 (555) 000-0000"
                              value={formData.phone}
                              onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tell us your vision</label>
                          <textarea 
                            rows={3}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                            placeholder="What are you building?"
                            value={formData.message}
                            onChange={e => setFormData({...formData, message: e.target.value})}
                          />
                        </div>

                        <div className="flex gap-4">
                          <button 
                            type="button"
                            onClick={prevStep}
                            className="flex-1 py-5 bg-slate-100 text-gray-600 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all font-sans"
                          >
                            Back
                          </button>
                          <button 
                            type="submit"
                            disabled={submitting}
                            className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                          >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finish & Submit <Rocket className="w-4 h-4" /></>}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-10 pt-10 border-t border-slate-50 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[1,2,3].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Industry Leader</span>
              </div>
              <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Secure Cloud</div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

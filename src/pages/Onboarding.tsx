import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, Mail, Phone, Lock, Clock, CheckCircle2, AlertCircle, Loader2, Zap, Star } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Onboarding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState('');
  const [inviteFields, setInviteFields] = useState<any[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedTier, setSelectedTier] = useState('starter');

  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    subdomain: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactPhone: '',
    contactEmail: '',
    businessDescription: '',
    openingTime: '08:00',
    closingTime: '17:00'
  });

  const tiers = [
    {
      id: 'starter',
      name: 'Starter Plan',
      price: 'Free',
      description: 'Perfect for small businesses',
      features: ['Web Chat', 'AI Assistant', 'Custom Branding', '10K AI tokens/month', '1GB Storage']
    },
    {
      id: 'professional',
      name: 'Professional Plan',
      price: '$29/mo',
      description: 'For growing businesses',
      features: ['Everything in Starter', 'Telegram Integration', 'AI Assistant', '100K AI tokens/month', '10GB Storage'],
      recommended: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise Plan',
      price: 'Custom',
      description: 'Unlimited features',
      features: ['Everything included', 'Telegram + WhatsApp', 'Unlimited AI tokens', '1TB Storage', 'Priority Support']
    }
  ];

  useEffect(() => {
    fetch(`/v1/public/onboarding/${token}`)
      .then(res => res.json())
      .then(data => {
        if (!data?.success) {
           setError(data?.error?.message || 'Invalid link');
        } else {
           const payload = data.data;
           setClientId(payload.clientId);
           setInviteFields(payload.customFields || []);
           if (payload.prefill) {
             setFormData(prev => ({
               ...prev,
               ...payload.prefill
             }));
           }
        }
      })
      .catch(() => setError('Failed to connect to server'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const workingHours = Array.from({ length: 7 }, (_, i) => ({
        day: i,
        isOpen: i > 0 && i < 6,
        openTime: formData.openingTime,
        closeTime: formData.closingTime
      }));

      const res = await fetch(`/v1/public/onboarding/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          workingHours,
          customFields: customFieldValues,
          tier: selectedTier
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Submission failed');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Aboard!</h1>
          <p className="text-gray-600 mb-8">Your account has been created successfully. You can now log in to manage your digital business.</p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Business Onboarding</h1>
          <p className="mt-2 text-gray-600">Please complete your business profile to get started.</p>
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-mono font-medium border border-indigo-100">
            Client ID: {clientId}
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-[2.5rem] p-8 sm:p-12 space-y-8 border border-slate-100">
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary" />
              Basic Business Info
            </h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Business Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Acme Corp"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  value={formData.businessName}
                  onChange={e => setFormData({...formData, businessName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Business Type</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. IT Solutions"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  value={formData.businessType}
                  onChange={e => setFormData({...formData, businessType: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Subdomain</label>
                <div className="relative flex items-center">
                  <input
                    required
                    type="text"
                    placeholder="my-business"
                    className="w-full pl-4 pr-32 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-mono"
                    value={formData.subdomain}
                    onChange={e => setFormData({...formData, subdomain: e.target.value})}
                  />
                  <span className="absolute right-4 text-gray-400 font-mono text-sm pointer-events-none">.client.com</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Contact Phone</label>
                <input
                  required
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  value={formData.contactPhone}
                  onChange={e => setFormData({...formData, contactPhone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">Business Public Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  required
                  type="email"
                  placeholder="hello@yourbusiness.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  value={formData.contactEmail}
                  onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">Business Description</label>
              <textarea
                required
                rows={3}
                placeholder="What sets your business apart? e.g. Leading IT solutions provider specializing in cloud systems..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                value={formData.businessDescription}
                onChange={e => setFormData({...formData, businessDescription: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              Hours of Operation
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Default Opening Time</label>
                <input
                  required
                  type="time"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  value={formData.openingTime}
                  onChange={e => setFormData({...formData, openingTime: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Default Closing Time</label>
                <input
                  required
                  type="time"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  value={formData.closingTime}
                  onChange={e => setFormData({...formData, closingTime: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              Select Your Plan
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {tiers.map((tier) => (
                <motion.div
                  key={tier.id}
                  whileHover={{ translateY: -4 }}
                  className={cn(
                    "relative p-6 rounded-2xl border-2 transition-all cursor-pointer",
                    selectedTier === tier.id
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  {tier.recommended && (
                    <div className="absolute -top-3 right-6 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Recommended
                    </div>
                  )}
                  <h4 className="font-bold text-gray-900 mb-1">{tier.name}</h4>
                  <p className="text-2xl font-black text-primary mb-2">{tier.price}</p>
                  <p className="text-xs text-gray-600 mb-4">{tier.description}</p>
                  <ul className="space-y-2">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>

          {inviteFields.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Additional Requirements
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {inviteFields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">{field.name}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                        value={customFieldValues[field.name] || ''}
                        onChange={e => setCustomFieldValues({...customFieldValues, [field.name]: e.target.value})}
                      />
                    ) : (
                      <input
                        required
                        type={field.type}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                        value={customFieldValues[field.name] || ''}
                        onChange={e => setCustomFieldValues({...customFieldValues, [field.name]: e.target.value})}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6 pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              Account Credentials
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">Login Email</label>
              <input
                required
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Confirm Password</label>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-8"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up account...
              </>
            ) : (
              'Complete Setup'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

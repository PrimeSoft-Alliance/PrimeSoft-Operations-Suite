import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useClientId } from '../lib/useClientId';

export default function Contact() {
  const clientId = useClientId();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    preferredContactMethod: 'email'
  });
  
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    message: false
  });
  
  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Name is required.';
        if (value.trim().length < 2) return 'Name must be at least 2 characters.';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address.';
        return '';
      case 'phone':
        if (!value.trim()) return 'Phone number is required.';
        if (!/^\+?[\d\s-]{10,}$/.test(value)) return 'Please enter a valid phone number.';
        return '';
      case 'message':
        if (!value.trim()) return 'Message is required.';
        if (value.trim().length < 10) return 'Message must be at least 10 characters.';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name as keyof typeof touched]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields before submission
    const newErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      phone: validateField('phone', formData.phone),
      message: validateField('message', formData.message)
    };
    
    setErrors(newErrors);
    setTouched({ name: true, email: true, phone: true, message: true });

    if (Object.values(newErrors).some(err => err !== '')) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, clientId })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Message failure: Invalid server response');
      }

      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="max-w-xl mx-auto px-4 py-24 text-center"
      >
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Message Sent!</h2>
        <p className="text-lg text-gray-600 mb-8">Thank you for reaching out. We will get back to you shortly.</p>
        <button onClick={() => setSuccess(false)} className="bg-white border border-blue-200 text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors">Send another message</button>
      </motion.div>
    );
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="bg-slate-50 min-h-[90vh] py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-12 text-center">
          <span className="inline-block py-1 px-3 rounded-md bg-blue-100 text-blue-700 text-sm font-semibold tracking-wider mb-4">GET IN TOUCH</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">Contact Us</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto font-light">Have a question or need an estimate? Fill out the form below and our team will get back to you promptly.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input 
                required 
                title="Name" 
                name="name"
                type="text" 
                className={`w-full bg-slate-50 border ${errors.name ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-lg p-3 outline-none focus:ring-2`} 
                value={formData.name} 
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {errors.name && <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input 
                required 
                title="Phone" 
                name="phone"
                type="tel" 
                className={`w-full bg-slate-50 border ${errors.phone ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-lg p-3 outline-none focus:ring-2`} 
                value={formData.phone} 
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {errors.phone && <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.phone}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input 
              required 
              title="Email" 
              name="email"
              type="email" 
              className={`w-full bg-slate-50 border ${errors.email ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-lg p-3 outline-none focus:ring-2`} 
              value={formData.email} 
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.email && <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
            <input 
              title="Subject" 
              name="subject"
              type="text" 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              value={formData.subject} 
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
            <textarea 
              required 
              title="Message" 
              name="message"
              rows={5} 
              className={`w-full bg-slate-50 border ${errors.message ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-lg p-3 outline-none focus:ring-2`} 
              value={formData.message} 
              onChange={handleChange}
              onBlur={handleBlur}
            ></textarea>
            {errors.message && <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Contact Method</label>
            <div className="flex space-x-6">
              <label className="flex items-center">
                <input type="radio" value="email" checked={formData.preferredContactMethod === 'email'} onChange={e => setFormData({...formData, preferredContactMethod: e.target.value})} className="mr-2 text-blue-600 focus:ring-blue-600" />
                <span className="text-sm text-gray-700">Email</span>
              </label>
              <label className="flex items-center">
                <input type="radio" value="phone" checked={formData.preferredContactMethod === 'phone'} onChange={e => setFormData({...formData, preferredContactMethod: e.target.value})} className="mr-2 text-blue-600 focus:ring-blue-600" />
                <span className="text-sm text-gray-700">Phone</span>
              </label>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-blue-600 text-white font-semibold py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm shadow-blue-900/10 hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:hover:shadow-sm"
          >
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
        </motion.div>
      </div>
    </div>
  );
}

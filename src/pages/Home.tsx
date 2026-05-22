import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Globe, Cpu, Code, CheckCircle, Database, PhoneCall, Zap } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { useClientId } from '../lib/useClientId';

export default function Home() {
  const [settings, setSettings] = useState<any>(null);
  const { clientId } = useClientId();

  useEffect(() => {
    // For the main company site, we prioritize the Platform Admin profile.
    fetch(`/v1/public/settings?clientId=${clientId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.success) setSettings(data.data);
        else setSettings(data);
      })
      .catch(console.error);
  }, [clientId]);

  const businessName = settings?.businessName || '';
  const heroTitle = settings?.heroTitle || 'Architecting Tomorrow';
  const heroSubtitle = settings?.heroSubtitle || 'We build high-performance software for visionary companies.';

  const services = settings?.services || [];

  const fadeUpVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-white overflow-hidden min-h-[90vh] flex items-center pt-20">
        {/* Abstract Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.08),transparent_50%)]" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_80%,rgba(16,185,129,0.05),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '40px 40px'}} />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 w-full py-20">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col items-center text-center max-w-5xl mx-auto"
          >
            <motion.div variants={fadeUpVariant} className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-10 shadow-sm">
              <span className="flex w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              {settings?.heroBadge || 'Engineering Excellence'}
            </motion.div>

            <motion.h1 variants={fadeUpVariant} className="text-6xl sm:text-7xl lg:text-8xl font-black text-gray-900 tracking-tight leading-[0.9] mb-10">
              {heroTitle.split(' ').map((word: string, i: number, arr: string[]) => (
                <React.Fragment key={i}>
                  {i >= arr.length - 2 ? <span className="text-indigo-600">{word}</span> : word}
                  {' '}
                </React.Fragment>
              ))}
            </motion.h1>

            <motion.p variants={fadeUpVariant} className="text-xl sm:text-2xl text-gray-400 mb-12 leading-relaxed max-w-3xl font-medium tracking-tight">
              {heroSubtitle}
            </motion.p>

            <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
              <Link to="/get-started" className="inline-flex justify-center items-center px-10 py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-[2rem] transition-all shadow-2xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1 group">
                Launch Platform <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/book-discovery"
                className="inline-flex justify-center items-center px-10 py-5 bg-white text-gray-900 border-2 border-gray-100 font-black uppercase tracking-widest text-xs rounded-[2rem] transition-all hover:bg-gray-50 hover:border-gray-200"
              >
                Book Discovery Session
              </Link>
            </motion.div>
            
            {settings?.clientStats?.length > 0 && (
                <motion.div variants={fadeUpVariant} className="mt-24 grid grid-cols-2 md:grid-cols-3 gap-12 sm:gap-20 border-t border-gray-50 pt-16 w-full">
                {settings.clientStats.map((stat: any, idx: number) => (
                    <div key={idx} className={cn("text-center", idx === 2 ? "hidden md:block" : "")}>
                    <div className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">{stat.value}</div>
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{stat.label}</div>
                    </div>
                ))}
                </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Services Preview */}
      {services.length > 0 && (
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariant}
            className="text-center mb-16"
          >
            <h2 className="text-sm font-bold text-primary tracking-wider uppercase mb-3 text-shadow-sm">{settings?.servicesBadge || 'OUR SOLUTIONS'}</h2>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">{settings?.servicesTitle || 'Software & IT Services'}</h2>
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-4 sm:grid-cols-2 gap-6"
          >
            {services.slice(0, 4).map((s: any, i: number) => {
              const Icon = [Zap, Shield, Globe, Database][i % 4];
              return (
                <motion.div 
                  key={i} 
                  variants={fadeUpVariant}
                  whileHover={{ y: -5 }}
                  className="group p-10 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300"
                >
                  <div className="w-16 h-16 bg-slate-50 group-hover:bg-indigo-600 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:text-white mb-8 transition-all duration-300 transform group-hover:rotate-6">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-3 tracking-tight">{s.name}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm font-medium">{s.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
      )}


      {/* Portfolio Section */}
      {settings?.portfolioProjects?.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUpVariant}
              className="text-center mb-16"
            >
              <h2 className="text-sm font-bold text-primary tracking-wider uppercase mb-3">{settings?.portfolioBadge || 'Portfolio'}</h2>
              <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">{settings?.portfolioTitle || 'Recent Projects'}</h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {settings.portfolioProjects.map((project: any, i: number) => (
                <motion.div
                  key={i}
                  variants={fadeUpVariant}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 group"
                >
                  <div className="h-56 overflow-hidden">
                    <img 
                      src={project.image || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80"} 
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">{project.tech}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{project.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">{project.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust & Guarantee Section */}
      <section className="py-24 bg-white border-y border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-50 transform translate-x-4 translate-y-4 rounded-[2.5rem] -z-10"></div>
              <img 
                src={settings?.trustImage || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80"} 
                alt="Tech Team Collaboration" 
                className="w-full h-full object-cover rounded-[2rem] shadow-xl border border-white"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-lg border border-slate-50 flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 text-primary rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">{settings?.trustCardTitle || 'Enterprise Ready'}</div>
                  <div className="text-sm text-gray-500">{settings?.trustCardSubtitle || 'Security Verified'}</div>
                </div>
              </div>
            </motion.div>
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeUpVariant} className="text-4xl font-extrabold text-gray-900 tracking-tight mb-6">{settings?.trustTitle || 'Built on Trust'}</motion.h2>
              <motion.p variants={fadeUpVariant} className="text-lg text-gray-600 mb-8 leading-relaxed">
                {settings?.trustDescription || 'We deliver software that powers mission-critical operations worldwide.'}
              </motion.p>
              <motion.ul variants={staggerContainer} className="space-y-4">
                {(settings?.trustPoints || [
                  "Modern tech stack selection",
                  "Agile development methodology",
                  "Post-deployment support & maintenance",
                  "Enterprise-ready scalability"
                ]).map((item: string, idx: number) => (
                  <motion.li variants={fadeUpVariant} key={idx} className="flex items-center text-gray-700 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <CheckCircle className="w-6 h-6 text-emerald-500 mr-3 flex-shrink-0" />
                    {item}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-slate-900 text-white relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&q=80')] opacity-5 bg-cover mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariant}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{settings?.testimonialsTitle || 'Client Success'}</h2>
          </motion.div>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {(settings?.testimonials || [
              { text: "This platform transformed our legacy systems into a modern cloud environment. Their speed and precision are unmatched.", name: "Sarah Jenkins", role: "CTO", initials: "SJ" },
              { text: "The solution they built for us has doubled our user engagement. Professional and visionary team.", name: "Michael Ross", role: "CEO", initials: "MR" },
              { text: "Best consulting we've ever had. They actually understand business goals, not just code.", name: "David Thompson", role: "Director", initials: "DT", hideMobile: true }
            ]).map((t: any, i: number) => (
              <motion.div 
                key={i}
                variants={fadeUpVariant}
                whileHover={{ y: -5 }}
                className={`bg-slate-800/80 p-8 rounded-3xl border border-slate-700 backdrop-blur-md shadow-xl transition-all ${t.hideMobile ? 'hidden md:block' : ''}`}
              >
                <div className="flex text-amber-400 mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                </div>
                <p className="text-slate-300 mb-8 font-medium italic leading-relaxed">"{t.text}"</p>
                <div className="flex items-center space-x-4 mt-auto">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-lg font-bold text-white shadow-inner">{t.initials || (t.name ? t.name[0] : 'U')}</div>
                  <div>
                    <p className="font-bold text-white">{t.name}</p>
                    <p className="text-sm opacity-80">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full mix-blend-screen filter blur-[80px] opacity-40"></div>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUpVariant}
          className="relative max-w-4xl mx-auto px-4 text-center z-10"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">{settings?.ctaTitle || 'Ready to Scale?'}</h2>
          <p className="text-xl text-white opacity-90 mb-10 font-light">{settings?.ctaSubtitle || 'Our architects are ready to build your next generation platform.'}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/book-discovery"
              className="inline-flex justify-center items-center px-8 py-4 bg-white text-primary font-bold rounded-xl shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1 transition-all group"
            >
              Book Discovery Call <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/get-started" className="inline-flex justify-center items-center px-8 py-4 bg-black/20 hover:bg-black/30 text-white font-bold rounded-xl transition-all border border-white/20 backdrop-blur-sm">
               System Login
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

function Star(props: any) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.148.621-.531 1.114-1.059.777l-4.704-3.003a.563.563 0 00-.598 0l-4.704 3.003c-.528.337-1.207-.156-1.059-.777l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602a.563.563 0 00.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function DiscoveryForm({ clientId }: { clientId: string }) {
   const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
   const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      businessName: '',
      message: ''
   });

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus('loading');
      try {
         const res = await fetch('/v1/public/onboarding-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
            body: JSON.stringify(formData)
         });
         const data = await res.json();
         if (data.success) setStatus('success');
         else setStatus('error');
      } catch (err) {
         setStatus('error');
      }
   };

   if (status === 'success') {
      return (
         <div className="text-center py-20 space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
               <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Request Logged</h3>
            <p className="text-slate-500 font-medium">An implementation agent will review your profile and reach out within 24 hours.</p>
         </div>
      );
   }

   return (
      <form onSubmit={handleSubmit} className="space-y-6">
         <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
               <input 
                 required
                 type="text"
                 value={formData.name}
                 onChange={e => setFormData({...formData, name: e.target.value})}
                 placeholder="Kayode Olufowobi"
                 className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 placeholder:text-slate-300 transition-all"
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
               <input 
                 required
                 type="email"
                 value={formData.email}
                 onChange={e => setFormData({...formData, email: e.target.value})}
                 placeholder="name@company.com"
                 className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 placeholder:text-slate-300 transition-all"
               />
            </div>
         </div>
         <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
               <input 
                 required
                 type="text"
                 value={formData.businessName}
                 onChange={e => setFormData({...formData, businessName: e.target.value})}
                 placeholder="Acme Corp"
                 className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 placeholder:text-slate-300 transition-all"
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
               <input 
                 required
                 type="tel"
                 value={formData.phone}
                 onChange={e => setFormData({...formData, phone: e.target.value})}
                 placeholder="+971 ..."
                 className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 placeholder:text-slate-300 transition-all"
               />
            </div>
         </div>
         <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Implementation Scope</label>
            <textarea 
              rows={3}
              value={formData.message}
              onChange={e => setFormData({...formData, message: e.target.value})}
              placeholder="Tell us about your technical requirements..."
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 placeholder:text-slate-300 transition-all"
            />
         </div>
         <button 
           disabled={status === 'loading'}
           className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
         >
            {status === 'loading' ? 'Transmitting Request...' : 'Submit Discovery Request'}
         </button>
         {status === 'error' && <p className="text-center text-xs font-bold text-rose-500">Transmission failure. Please try direct contact.</p>}
      </form>
   );
}

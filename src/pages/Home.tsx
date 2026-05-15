import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Globe, Cpu, Code, CheckCircle, Database, PhoneCall } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export default function Home() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('clientId') || 'plumber-001';
    
    fetch(`/api/public/settings?clientId=${clientId}`)
      .then(res => res.json())
      .then(data => {
        setSettings(data);
      })
      .catch(console.error);
  }, []);

  const businessName = settings?.businessName || 'PrimeSoft Alliance';
  const heroTitle = settings?.heroTitle || 'Empowering Digital Transformation';
  const heroSubtitle = settings?.heroSubtitle || `At ${businessName}, we develop, deploy, and manage cutting-edge software solutions. Transform your business with our custom enterprise systems and digital platforms.`;

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
      <section className="relative bg-slate-900 overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <motion.img 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
            src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80" 
            alt="Technology Background" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-900/80 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-16 pb-20">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl"
          >
            <motion.span variants={fadeUpVariant} className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/20 text-primary font-medium text-sm mb-8 border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <span className="flex w-2.5 h-2.5 rounded-full bg-primary mr-2 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
              Pioneering Tomorrow's Tech Today
            </motion.span>
            <motion.h1 variants={fadeUpVariant} className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
              {heroTitle.split(' ').map((word, i, arr) => (
                <React.Fragment key={i}>
                  {i === arr.length - 2 ? <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">{word}</span> : word}
                  {' '}
                </React.Fragment>
              ))}
            </motion.h1>
            <motion.p variants={fadeUpVariant} className="text-xl text-slate-300 mb-10 leading-relaxed max-w-2xl font-light">
              {heroSubtitle}
            </motion.p>
            <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link to="/booking" className="inline-flex justify-center items-center px-8 py-4 bg-primary text-white font-bold rounded-xl transition-all shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_25px_rgba(37,99,235,0.5)] transform hover:-translate-y-0.5 group">
                Book Service <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/contact" className="inline-flex justify-center items-center px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl backdrop-blur-md transition-all border border-white/10 hover:border-white/20">
                Contact Us
              </Link>
            </motion.div>
            
            <motion.div variants={fadeUpVariant} className="mt-14 flex items-center gap-6 sm:gap-12 opacity-80 border-t border-white/10 pt-8 overflow-x-auto pb-4 no-scrollbar">
              {(settings?.clientStats?.length > 0 ? settings.clientStats : [
                { label: "Systems Deployed", value: "200+" },
                { label: "Tech Stacks", value: "15+" },
                { label: "Client Satisfaction", value: "99%" }
              ]).map((stat: any, idx: number) => (
                <div key={idx} className="flex items-center gap-6 sm:gap-12 flex-shrink-0">
                  {idx > 0 && <div className="w-px h-12 bg-white/20 hidden sm:block"></div>}
                  <div>
                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm font-medium text-blue-200 uppercase tracking-wider text-[10px] sm:text-sm">{stat.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Services Preview */}
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
            <h2 className="text-sm font-bold text-primary tracking-wider uppercase mb-3 text-shadow-sm">Our Expertise</h2>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Comprehensive Services</h2>
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-4 sm:grid-cols-2 gap-6"
          >
            {(settings?.services?.length > 0 ? settings.services.slice(0, 4) : [
              { icon: Code, name: "Custom Software", description: "Tailored applications built to solve your unique challenges." },
              { icon: Globe, name: "Web & Mobile", description: "Scalable digital platforms with world-class user experiences." },
              { icon: Database, name: "Cloud Integration", description: "Modernizing infrastructure for maximum agility and speed." },
              { icon: Cpu, name: "IT Consulting", description: "Expert guidance on digital transformation and architecture." }
            ]).map((s: any, i: number) => {
              const Icon = s.icon || [Code, Globe, Database, Cpu][i % 4];
              return (
                <motion.div 
                  key={i} 
                  variants={fadeUpVariant}
                  whileHover={{ y: -5 }}
                  className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300"
                >
                  <div className="w-14 h-14 bg-slate-50 group-hover:bg-primary rounded-2xl flex items-center justify-center text-primary group-hover:text-white mb-6 transition-colors duration-300 transform group-hover:rotate-3 group-hover:scale-110">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{s.name}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">{s.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <Link to="/services" className="inline-flex items-center text-primary font-semibold hover:opacity-80 transition-colors group">
              View all services <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

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
              <h2 className="text-sm font-bold text-primary tracking-wider uppercase mb-3">Portfolio</h2>
              <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Recent Projects</h2>
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
                src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80" 
                alt="Tech Team Collaboration" 
                className="w-full h-full object-cover rounded-[2rem] shadow-xl border border-white"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-lg border border-slate-50 flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 text-primary rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">Secure & Robust</div>
                  <div className="text-sm text-gray-500">Enterprise-grade security</div>
                </div>
              </div>
            </motion.div>
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeUpVariant} className="text-4xl font-extrabold text-gray-900 tracking-tight mb-6">Built on Trust and Reliability</motion.h2>
              <motion.p variants={fadeUpVariant} className="text-lg text-gray-600 mb-8 leading-relaxed">
                We believe in doing things right the first time. Our team is equipped with the best tools and training to ensure your digital infrastructure works perfectly.
              </motion.p>
              <motion.ul variants={staggerContainer} className="space-y-4">
                {[
              "Modern tech stack selection",
              "Agile development methodology",
              "Post-deployment support & maintenance",
              "Enterprise-ready scalability"
                ].map((item, idx) => (
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
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">What Our Clients Say</h2>
          </motion.div>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              { text: "PrimeSoft Alliance transformed our legacy systems into a modern cloud platform. Their speed and precision are unmatched.", name: "Sarah Jenkins", role: "CTO, TechFlow", initials: "SJ" },
              { text: "The cross-platform mobile app they built for us has doubled our user engagement. Professional and visionary.", name: "Michael Ross", role: "CEO, Streamline", initials: "MR" },
              { text: "Best IT consulting we've ever had. They actually understand business goals, not just code.", name: "David Thompson", role: "Director, Global Ops", initials: "DT", hideMobile: true }
            ].map((t, i) => (
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
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-lg font-bold text-white shadow-inner">{t.initials}</div>
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
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">Ready to build your digital future?</h2>
          <p className="text-xl text-white opacity-90 mb-10 font-light">Our solution architects are ready to discuss your next big project.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/booking" className="inline-flex justify-center items-center px-8 py-4 bg-white text-primary font-bold rounded-xl shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1 transition-all group">
              Start Project <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/contact" className="inline-flex justify-center items-center px-8 py-4 bg-black/20 hover:bg-black/30 text-white font-bold rounded-xl transition-all border border-white/20 backdrop-blur-sm">
              <PhoneCall className="mr-2 w-5 h-5" /> Contact Us
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

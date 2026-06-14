import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Globe, Users, Target } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const fadeUpVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as any } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="font-black text-2xl tracking-tighter text-indigo-900 border-2 border-indigo-900 px-3 py-1 rounded-lg">
          OminiCSR
        </div>
        <div className="flex items-center gap-4">
          <Link to="/client/login" className="font-bold text-sm text-slate-600 hover:text-indigo-600 transition-colors">
            Sign In
          </Link>
          <Link to="/signup" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover:-translate-y-0.5">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden px-4">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-50 rounded-full blur-3xl -z-10 mix-blend-multiply opacity-50"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-50 rounded-full blur-3xl -z-10 mix-blend-multiply opacity-50 translate-x-1/3 -translate-y-1/2"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={fadeUpVariant} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100/50 border border-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-widest mb-8">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Corporate Social Responsibility
            </motion.div>
            
            <motion.h1 variants={fadeUpVariant} className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8">
              Manage Your Social Impact <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">With Precision.</span>
            </motion.h1>
            
            <motion.p variants={fadeUpVariant} className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              OminiCSR is the modern platform for businesses to orchestrate, measure, and scale their Corporate Social Responsibility initiatives effortlessly.
            </motion.p>
            
            <motion.div variants={fadeUpVariant} className="flex justify-center items-center gap-4 flex-col sm:flex-row">
              <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1 flex items-center justify-center group">
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/client/login" className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-sm flex items-center justify-center">
                Sign In to Dashboard
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">Everything you need to drive change.</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">Standardize your operations with a suite built for modern teams.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Target />}
              title="Impact Tracking"
              desc="Measure your programs with real-time analytics and data visualization."
            />
            <FeatureCard 
              icon={<Users />}
              title="Stakeholder Management"
              desc="Coordinate volunteers, staff, and partners from a single unified nexus."
            />
            <FeatureCard 
              icon={<Shield />}
              title="Compliance & Reporting"
              desc="Generate automated reports that align with global ESG standards."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-center text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="font-black text-xl tracking-tighter text-white mb-6">OminiCSR</div>
          <p className="text-sm font-medium mb-6">Empowering businesses to make a difference.</p>
          <div className="flex justify-center gap-6 text-sm font-bold opacity-80">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <div className="mt-12 text-xs opacity-50">
            &copy; {new Date().getFullYear()} OminiCSR. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group">
      <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

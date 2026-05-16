import React from 'react';
import { ShieldCheck, Lock, Eye, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white py-20 px-4 font-sans">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="mb-8 text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-2 group transition-all"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-4">
              Privacy <span className="text-indigo-600">Policy</span>
            </h1>
            <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">
              How we handle and protect your data at PrimeSoft Alliance.
            </p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8">
            <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-indigo-600" />
                Data Collection
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We collect information when you register on our site, place an order, subscribe to our newsletter or enter information on our site. This may include your name, email address, phone number, and business details.
              </p>
            </section>

            <section className="p-8 rounded-3xl border border-slate-100">
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                Data Protection
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems, and are required to keep the information confidential.
              </p>
            </section>

            <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
                <Lock className="w-6 h-6 text-amber-500" />
                Cookie Policy
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Cookies are small files that a site or its service provider transfers to your computer's hard drive through your Web browser (if you allow) that enables the site's or service provider's systems to recognize your browser and capture and remember certain information.
              </p>
            </section>

            <section className="p-8 rounded-3xl border border-slate-100">
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-indigo-600" />
                Your Rights
              </h2>
              <p className="text-gray-600 leading-relaxed">
                You have the right to access, rectify, or erase your personal data. You can exercise these rights at any time by contacting us through our support dashboard.
              </p>
            </section>
          </div>

          <div className="text-center pt-8 border-t border-slate-100">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Last updated: May 2026</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

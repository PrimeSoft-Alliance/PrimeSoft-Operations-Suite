import React from 'react';
import { Scale, FileText, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
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
              Terms & <span className="text-indigo-600">Conditions</span>
            </h1>
            <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">
              The rules and guidelines for using PrimeSoft Alliance services.
            </p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8">
            <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
                <Scale className="w-6 h-6 text-indigo-600" />
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-600 leading-relaxed">
                By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. Any participation in this service will constitute acceptance of this agreement.
              </p>
            </section>

            <section className="p-8 rounded-3xl border border-slate-100">
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                2. Use of License
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Permission is granted to temporarily download one copy of the materials (information or software) on PrimeSoft Alliance's website for personal, non-commercial transitory viewing only.
              </p>
            </section>

            <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-amber-500" />
                3. Disclaimer
              </h2>
              <p className="text-gray-600 leading-relaxed">
                The materials on PrimeSoft Alliance's website are provided on an 'as is' basis. PrimeSoft Alliance makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties of merchantability.
              </p>
            </section>

            <section className="p-8 rounded-3xl border border-slate-100">
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-4">
                <Scale className="w-6 h-6 text-indigo-600" />
                4. Limitations
              </h2>
              <p className="text-gray-600 leading-relaxed">
                In no event shall PrimeSoft Alliance or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on PrimeSoft Alliance's website.
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

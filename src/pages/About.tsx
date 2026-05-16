import { useState, useEffect } from 'react';
import { Target, Award, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useClientId } from '../lib/useClientId';

export default function About() {
  const [settings, setSettings] = useState<any>(null);
  const clientId = useClientId();

  useEffect(() => {
    fetch(`/api/public/settings?clientId=${clientId}`)
      .then(res => res.json())
      .then(data => {
        setSettings(data);
      })
      .catch(console.error);
  }, []);

  const businessName = settings?.businessName || 'PrimeSoft Alliance';
  const aboutText = settings?.aboutText || 'PrimeSoft Alliance is an information technology solutions company engaged in the development, deployment, and management of software applications, enterprise systems, and digital platforms.';

  const slideUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="flex flex-col flex-1 bg-slate-50">
      {/* Header */}
      <section className="bg-slate-900 py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-blue-900/40 mix-blend-multiply"></div>
        <motion.div 
          initial="hidden" animate="visible" variants={slideUp}
          className="relative max-w-4xl mx-auto text-center z-10"
        >
          <span className="inline-block py-1 px-3 rounded-md bg-blue-500/20 text-blue-300 text-sm font-medium tracking-wider uppercase mb-4 border border-blue-400/20">Our Mission</span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6">About {businessName}</h1>
          <p className="text-xl text-blue-100 font-light max-w-2xl mx-auto leading-relaxed">
            Leading the charge in digital transformation with custom software, cloud solutions, and strategic IT consulting.
          </p>
        </motion.div>
      </section>

      {/* Content */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 tracking-tight">Software Synergy & Vision</h2>
            <div className="prose prose-lg text-gray-600">
              <p className="leading-relaxed mb-6 whitespace-pre-wrap">
                {aboutText}
              </p>
              {!settings?.aboutText && (
                <>
                  <p className="leading-relaxed mb-6">
                    We provide end-to-end IT services including custom software development, web and mobile app solutions, cloud integration, and digital transformation services for businesses across diverse industries.
                  </p>
                  <p className="leading-relaxed">
                    Our mission is to empower organizations with technology that drives growth, efficiency, and innovation in an increasingly digital world.
                  </p>
                </>
              )}
            </div>
          </motion.div>
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{
              visible: { transition: { staggerChildren: 0.15 } }
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            <motion.div variants={slideUp} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-2">Technical Mastery</h3>
              <p className="text-gray-500 leading-relaxed">Modern tech stacks and architectural excellence in every line of code.</p>
            </motion.div>
            <motion.div variants={slideUp} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-2">Agile Delivery</h3>
              <p className="text-gray-500 leading-relaxed">Fast iterations and transparent communication throughout the dev cycle.</p>
            </motion.div>
            <motion.div variants={slideUp} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex shrink-0 items-center justify-center">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">Global Impact</h3>
                <p className="text-gray-500 leading-relaxed">
                  Supporting clients from startups to enterprises in their journey towards becoming tech-first organizations.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

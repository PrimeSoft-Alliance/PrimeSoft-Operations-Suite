import { useState, useEffect } from 'react';
import { Target, Award, Users, Rocket, Zap, Shield, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useClientId } from '../lib/useClientId';
import { cn } from '../lib/utils';

export default function About() {
  const [settings, setSettings] = useState<any>(null);
  const { clientId } = useClientId();

  useEffect(() => {
    fetch(`/v1/public/settings?clientId=${clientId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.success) setSettings(data.data);
        else setSettings(data);
      })
      .catch(console.error);
  }, [clientId]);

  const businessName = settings?.businessName || 'Business Hub';
  const aboutText = settings?.aboutText || 'We are a technology-first solution provider focused on bridging the gap between imagination and implementation.';

  const slideUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  const stats = settings?.aboutStats || [
    { label: 'Founded', value: '2018' },
    { label: 'Engineers', value: '50+' },
    { label: 'Success Rate', value: '99%' },
    { label: 'Uptime', value: '99.9%' },
  ];

  return (
    <div className="flex flex-col flex-1 bg-white font-sans">
      {/* Hero Section */}
      <section className="relative pt-20 pb-40 px-6 sm:px-10 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.08),transparent_50%)]" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_80%,rgba(16,185,129,0.05),transparent_50%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={slideUp}
            className="space-y-8"
          >
            <span className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-slate-50 border border-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] shadow-sm">
              <Zap className="w-4 h-4 text-indigo-600" />
              {settings?.aboutBadge || 'Our Story'}
            </span>
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-gray-900 tracking-tight leading-[0.9] max-w-4xl">
              {settings?.aboutHeroTitle || 'Building the'} <span className="text-indigo-600">{settings?.aboutHeroHighlight || 'Digital Future'}</span>.
            </h1>
            <p className="text-xl sm:text-2xl text-gray-400 font-medium tracking-tight max-w-2xl leading-relaxed">
              {settings?.aboutHeroSubtitle || 'Discover how we help companies navigate the complexities of modern software.'}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-20 w-full border-t border-slate-50 pt-16"
          >
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-black text-gray-900 tracking-tighter mb-1">{stat.value}</div>
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-32 px-6 sm:px-10 bg-slate-50/50">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-start">
          <motion.div 
            initial={{ opacity: 0, x: -30 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            className="space-y-10"
          >
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              {settings?.aboutSectionTitle || 'Our Philosophy'} <br />& <span className="text-indigo-600">{settings?.aboutSectionHighlight || 'Commitment'}</span>.
            </h2>
            <div className="prose prose-lg text-gray-500 font-medium leading-relaxed max-w-xl">
              <p className="whitespace-pre-wrap">
                {aboutText}
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
               {(settings?.aboutTags || ['Agile Dev', 'Cloud Native', 'AI First', 'Scalable']).map((tag: string) => (
                 <span key={tag} className="px-4 py-2 bg-white rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">{tag}</span>
               ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {(settings?.aboutFeatures || [
              { icon: Award, title: "Technical Mastery", desc: "Industry-standard stacks and zero-compromise code quality.", color: "text-indigo-600", bg: "bg-indigo-50" },
              { icon: Target, title: "Precision Delivery", desc: "Rigorous planning and milestones to ensure zero-delay launches.", color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: Users, title: "Global Network", desc: "Trusted partners for startups and Fortune 500 enterprises alike.", color: "text-amber-600", bg: "bg-amber-50" },
              { icon: Shield, title: "Secure by Design", desc: "Deeply embedded security protocols for mission-critical data.", color: "text-rose-600", bg: "bg-rose-50" },
            ]).map((feature: any, i: number) => {
              const icons: Record<string, any> = { Award, Target, Users, Shield };
              const Icon = typeof feature.icon === 'string' ? (icons[feature.icon] || Zap) : (feature.icon || Zap);
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform", feature.bg)}>
                    <Icon className={cn("w-7 h-7", feature.color)} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 sm:px-10 relative overflow-hidden">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-[3rem] p-12 sm:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-3xl rounded-full" />
          <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             className="relative z-10"
          >
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-8">
              Ready to <span className="text-indigo-400">Transform</span>?
            </h2>
            <p className="text-indigo-100/60 font-medium text-lg max-w-xl mx-auto mb-12 leading-relaxed">
              Join the ranks of high-growth companies leveraging {businessName}'s software ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <motion.button 
                whileHover={{ y: -2 }}
                className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20"
              >
                Start Onboarding <Rocket className="w-4 h-4" />
              </motion.button>
              <button className="text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:text-indigo-400 transition-colors">
                Speak with a Consultant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}


import React from 'react';
import { FileText, LayoutTemplate, MessageSquare, Plus, Mail, Code, Sparkles, Send } from 'lucide-react';

export default function SuperadminTemplates() {
  const templates = [
    { 
      id: 'web-default',
      icon: LayoutTemplate, 
      color: 'bg-indigo-50 text-indigo-600',
      title: 'Global Website UI', 
      desc: 'Master JSON schema for business pages, hero styles, and color libraries.',
      badge: 'Master Template'
    },
    { 
      id: 'ai-base',
      icon: Sparkles, 
      color: 'bg-purple-50 text-purple-600',
      title: 'AI Behavioral Core', 
      desc: 'System instructions that govern conversational tone and data boundaries.',
      badge: 'AI Engine'
    },
    { 
      id: 'email-booking',
      icon: Mail, 
      color: 'bg-emerald-50 text-emerald-600',
      title: 'Booking Confirmation', 
      desc: 'Triggered when a customer schedules a service. Supports variable injection.',
      badge: 'Transactional'
    },
    { 
      id: 'onboarding-flow',
      icon: FileText, 
      color: 'bg-amber-50 text-amber-600',
      title: 'Onboarding Questionnaire', 
      desc: 'The series of questions and custom fields presented to new businesses.',
      badge: 'Tenant Setup'
    },
    { 
      id: 'sdk-config',
      icon: Code, 
      color: 'bg-slate-50 text-slate-600',
      title: 'Headless SDK Config', 
      desc: 'Global settings for the JS embed including rate limits and auth headers.',
      badge: 'Developer SDK'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Blueprint & Templates</h1>
          <p className="text-gray-500">Define the global DNA of the business platform.</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition">
           <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition group">
            <div className={`w-14 h-14 ${tpl.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
               <tpl.icon className="w-7 h-7" />
            </div>
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-lg font-black text-gray-900 tracking-tight">{tpl.title}</h3>
               <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{tpl.badge}</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">{tpl.desc}</p>
            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
               <button className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline">Edit Blueprint &rarr;</button>
               <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white" />
                  <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white" />
                  <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white" />
               </div>
            </div>
          </div>
        ))}

        <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center group hover:border-indigo-300 transition-colors">
           <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors">
              <Plus className="w-6 h-6 text-gray-300 group-hover:text-indigo-400" />
           </div>
           <h4 className="font-bold text-gray-400 group-hover:text-indigo-600 transition-colors">Propose New Template</h4>
           <p className="text-xs text-gray-400 mt-1">Add custom automation or sector-specific defaults.</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-indigo-500 rounded-lg">
                  <Send className="w-5 h-5 text-white" />
               </div>
               <h3 className="text-xl font-bold">Deploy Global Changes</h3>
            </div>
            <p className="text-indigo-200 text-sm max-w-lg mb-6">
               Updating templates will not affect existing live tenants unless you trigger a "Sync Schema" action. 
               New tenants will automatically receive these updated configurations.
            </p>
            <button className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-50 transition active:scale-95">
               Review & Deploy Baseline
            </button>
         </div>
         <div className="absolute right-[-10%] top-[-20%] opacity-10">
            <LayoutTemplate className="w-72 h-72 rotate-12" />
         </div>
      </div>
    </div>
  );
}

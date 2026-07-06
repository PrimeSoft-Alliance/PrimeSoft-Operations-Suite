import React, { useState } from 'react';
import { Copy, CheckCircle2, PhoneForwarded, Info, RefreshCcw, ShieldCheck, ChevronRight, XCircle } from 'lucide-react';

export default function CallForwardingSetup() {
  const [targetNumber] = useState('+1234567890'); // This should be a provisioned Telnyx number

  const rules = [
    {
      title: 'Unconditional Forwarding',
      description: 'Redirect every call from your local phone to OminiRep immediately.',
      code: `*21*${targetNumber}#`,
      type: 'always'
    },
    {
      title: 'No-Answer Forwarding',
      description: 'Only redirect calls if you do not answer within a few rings.',
      code: `*61*${targetNumber}#`,
      type: 'no_answer'
    },
    {
      title: 'Busy Forwarding',
      description: 'Redirect callers if you are already on the line.',
      code: `*67*${targetNumber}#`,
      type: 'busy'
    },
    {
        title: 'Unreachable Forwarding',
        description: 'Redirect callers if your phone is turned off or has no signal.',
        code: `*62*${targetNumber}#`,
        type: 'unreachable'
    }
  ];

  const cancellations = [
    { title: 'Disable All Forwarding', code: '##002#' },
    { title: 'Cancel No-Answer', code: '##61#' },
    { title: 'Cancel Busy', code: '##67#' },
    { title: 'Cancel Unreachable', code: '##62#' },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Add toast logic here
  };

  return (
    <div className="space-y-8 pb-20 max-w-4xl">
      <header>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Call Forwarding Setup</h1>
        <p className="text-slate-500 text-sm font-medium">Configure your local number to interact with OminiRep's missed-call system.</p>
      </header>

      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex gap-4">
        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl shrink-0 h-fit">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h3 className="font-black text-amber-800">Carrier Verification Required</h3>
          <p className="text-amber-700/80 text-sm font-bold leading-relaxed">
            Please verify with your mobile carrier (AT&T, Verizon, T-Mobile, etc.) that MMI/SS codes are supported on your plan. Standard forwarding rates may apply.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Configuration Codes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map(rule => (
            <div key={rule.type} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm group hover:border-indigo-200 transition-all">
                <div className="flex items-start justify-between mb-2">
                    <h4 className="font-black text-slate-800">{rule.title}</h4>
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-md tracking-tighter">Setup</span>
                </div>
                <p className="text-sm font-bold text-slate-400 mb-6 leading-snug">{rule.description}</p>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-slate-100 transition-all">
                   <code className="flex-1 font-mono text-indigo-600 font-bold text-lg select-all">{rule.code}</code>
                   <button 
                    onClick={() => copyToClipboard(rule.code)}
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                   >
                     <Copy className="w-5 h-5" />
                   </button>
                </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 border-r border-white/10 pr-8">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-4">
                    <XCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black mb-2">Cancellation Codes</h3>
                <p className="text-slate-400 text-sm font-medium">Use these codes to disable forwarding and restore your standard voicemail.</p>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cancellations.map(c => (
                    <div key={c.title} className="p-4 bg-white/5 border border-white/10 rounded-2xl group hover:bg-white/10 transition-all flex items-center justify-between">
                        <div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{c.title}</div>
                            <div className="text-lg font-mono font-bold text-indigo-300">{c.code}</div>
                        </div>
                        <button 
                            onClick={() => copyToClipboard(c.code)}
                            className="p-2 text-slate-500 hover:text-white transition-colors"
                        >
                            <Copy className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </section>

      <div className="p-6 border border-slate-100 rounded-3xl flex items-center gap-4 bg-slate-50/50">
           <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
             <Info className="w-5 h-5" />
           </div>
           <p className="text-xs font-bold text-slate-500 italic">
               Note: To enable, dial the code exactly as shown from your phone's dialer app and press call. A confirmation message from your carrier will appear.
           </p>
      </div>
    </div>
  );
}

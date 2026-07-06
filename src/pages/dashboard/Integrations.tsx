import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, Smartphone, HelpCircle, CheckCircle2, AlertCircle, 
  ArrowLeft, RefreshCw, Wifi, QrCode, Clipboard, Trash2, Key, Info, Check, ExternalLink,
  Mail, Calendar, Bell, Shield, Database, Layout, Clock, CheckSquare, Settings, Save, AlertTriangle,
  MessageSquare, PhoneForwarded, Zap, Cpu
} from 'lucide-react';
import { useClientId } from '../../lib/useClientId';
import { useNavigate } from 'react-router-dom';

export default function Integrations() {
  const navigate = useNavigate();
  const { clientId } = useClientId();
  const [loading, setLoading] = useState(false);

  const integrationCards = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Integration',
      description: 'Connect via Official Meta Embedded Signup or Manual settings.',
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      hoverColor: 'hover:border-green-300',
      statusColor: 'bg-green-500',
      status: 'active'
    },
    {
        id: 'telegram',
        name: 'Telegram Bot',
        description: 'Connect your business bot to receive and respond via Telegram.',
        icon: Send,
        color: 'text-sky-600',
        bgColor: 'bg-sky-100',
        hoverColor: 'hover:border-sky-300',
        statusColor: 'bg-sky-500',
        status: 'active'
    },
    {
      id: 'email',
      name: 'Email (SMTP/IMAP)',
      description: 'Connect via custom SMTP and IMAP for full control over outgoing and incoming mail.',
      icon: Mail,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      hoverColor: 'hover:border-indigo-300',
      statusColor: 'bg-indigo-500',
      status: 'active'
    },
    {
      id: 'missed-calls',
      name: 'Missed Call Hub',
      description: 'Setup carrier call forwarding to OminiRep missed call assistant.',
      icon: PhoneForwarded,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      hoverColor: 'hover:border-amber-300',
      statusColor: 'bg-amber-500',
      status: 'setup_required'
    },
    {
      id: 'calendar',
      name: 'Calendar & Alarms Center',
      description: 'Sync live iCal / WebCal feed, configure automated background alarms, and connect Google Calendar.',
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      hoverColor: 'hover:border-indigo-300',
      statusColor: 'bg-indigo-500',
      status: 'active'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          Integrations
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Connect your favorite tools and channels to your digital assistant.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrationCards.map((card) => (
          <motion.div
            key={card.id}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
                if (card.id === 'missed-calls') navigate('/dashboard/integrations/call-forwarding');
                else navigate(`/dashboard/integrations/${card.id}`);
            }}
            className={`cursor-pointer bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group ${card.hoverColor}`}
          >
             <div className="flex items-start justify-between mb-6">
                <div className={`p-4 rounded-2xl ${card.bgColor} ${card.color}`}>
                   <card.icon className="w-8 h-8" />
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md tracking-widest ${card.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {(card.status || '').replace('_', ' ')}
                    </span>
                </div>
             </div>

             <h3 className="text-xl font-black text-slate-800 mb-2">{card.name}</h3>
             <p className="text-sm font-medium text-slate-500 leading-relaxed mb-6">{card.description}</p>

             <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Configure Integration</span>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
             </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-600 rounded-lg">
                    <Cpu className="w-5 h-5" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Unified Inbox</span>
            </div>
            <h2 className="text-3xl font-black mb-4">Everything in one place</h2>
            <p className="text-slate-400 max-w-2xl font-medium leading-relaxed">
                Your digital assistant manages all your messages from WhatsApp, Telegram, emails, and calls in a single place. No matter where your customers reach out, they get the same helpful experience.
            </p>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 blur-3xl rounded-full"></div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

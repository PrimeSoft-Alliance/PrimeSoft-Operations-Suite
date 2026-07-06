import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Inbox, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import Inquiries from './Inquiries';
import Tickets from './Tickets';
import SharedInbox from './SharedInbox';
import { useSearchParams } from 'react-router-dom';

export default function SupportSuite() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'inquiries' | 'tickets'>('inquiries');

  useEffect(() => {
    if (tabParam === 'tickets') {
      setActiveTab('tickets');
    } else if (tabParam === 'inquiries') {
      setActiveTab('inquiries');
    }
  }, [tabParam]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Support Suit</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Manage your incoming inquiries and AI-created support tickets.
          </p>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('inquiries')}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'inquiries' 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Support Suit
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'tickets' 
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            <Ticket className="w-4 h-4" />
            Tickets
          </button>
        </div>
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'inquiries' ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Inquiries />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Tickets />
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Search, MessageSquare, CheckCircle2, Clock, X, Eye, Loader2, User, Phone, MapPin, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

export default function ClientInquiries() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const res = await fetch('/v1/dashboard/contacts');
      const data = await res.json();
      if (data.success) setInquiries(data.data);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  const resolveInquiry = async (id: string) => {
    try {
      await fetch(`/v1/dashboard/contacts/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
      fetchInquiries();
      setSelectedInquiry(null);
    } catch (err) {
      console.error('Failed to resolve inquiry:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Inquiries</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Manage all incoming messages from your website and technical assets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-[2rem]" />
          ))
        ) : inquiries.length === 0 ? (
          <div className="col-span-full h-96 bg-white border border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
            <Mail className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-900 tracking-tight">No Inquiries Found</h3>
            <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">When customers message you via your platform, they will appear here.</p>
          </div>
        ) : (
          inquiries.map((item) => (
            <motion.div
              key={item._id}
              layoutId={item._id}
              onClick={() => setSelectedInquiry(item)}
              className="bg-white p-6 rounded-[2rem] border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-600/5 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  {item.name[0].toUpperCase()}
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                  item.status === 'unread' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                )}>
                  {item.status}
                </span>
              </div>
              <div className="space-y-1 mb-4">
                <div className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.subject || 'Inquiry'}</div>
                <div className="text-xs font-bold text-slate-500">{item.name}</div>
              </div>
              <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed h-8">
                {item.message}
              </p>
              <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>{item.email.split('@')[0]}</span>
                <span>{format(new Date(item.createdAt), 'MMM dd')}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedInquiry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedInquiry(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                      <Mail className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{selectedInquiry.subject || 'Message Details'}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Received {format(new Date(selectedInquiry.createdAt), 'PPP p')}</p>
                   </div>
                </div>
                <button onClick={() => setSelectedInquiry(null)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sender Identification</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1">Full Name</label>
                      <div className="text-sm font-bold text-slate-900">{selectedInquiry.name}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1">Email Address</label>
                      <div className="text-sm font-bold text-slate-900">{selectedInquiry.email}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1">Contact Phone</label>
                      <div className="text-sm font-bold text-slate-900">{selectedInquiry.phone || 'Not provided'}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1">Geography</label>
                      <div className="text-sm font-bold text-slate-900">{selectedInquiry.location?.city || 'Unknown'}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Body</label>
                   <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
                      <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedInquiry.message}</p>
                   </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                {selectedInquiry.status === 'unread' && (
                  <button 
                    onClick={() => resolveInquiry(selectedInquiry._id)}
                    className="flex-1 bg-emerald-600 text-white rounded-2xl py-4 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark as Resolved
                  </button>
                )}
                <a 
                  href={`mailto:${selectedInquiry.email}`}
                  className="flex-1 bg-slate-900 text-white rounded-2xl py-4 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Reply via Email
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Search, Filter, Calendar, MapPin, Phone, MessageSquare, CheckCircle2, Clock, X, Eye, Loader2, ChevronRight, Globe, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

export default function SuperAdminInquiries() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const res = await fetch('/v1/sys-admin/inquiries');
      const data = await res.json();
      if (data.success) setInquiries(data.data);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = inquiries.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase()) ||
    (i.subject || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Global Inquiries</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Monitor and manage all messages across the platform ecosystem.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            className="w-full sm:w-80 bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            placeholder="Search by name, email or context..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
             <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Hydrating data stream...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center px-6">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-slate-300" />
             </div>
             <h3 className="text-lg font-black text-slate-900">No inquiries found</h3>
             <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">There are no messages matching your current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact / Client</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subject</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((item) => (
                  <motion.tr 
                    layoutId={item._id}
                    key={item._id} 
                    className="hover:bg-indigo-50/30 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-white group-hover:shadow-sm transition-all">
                          {item.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900">{item.name}</div>
                          <div className="text-xs font-mono font-bold text-slate-400">{item.email}</div>
                          <div className="text-[10px] font-black text-indigo-500 uppercase mt-0.5">ID: {item.clientId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 max-w-xs">
                      <div className="text-sm font-bold text-slate-700 truncate">{item.subject || 'No Subject'}</div>
                      <div className="text-xs text-slate-400 line-clamp-1 font-medium">{item.message}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        item.status === 'unread' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {item.status === 'unread' ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs font-bold text-slate-600">{format(new Date(item.createdAt), 'MMM dd, yyyy')}</div>
                      <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{format(new Date(item.createdAt), 'hh:mm a')}</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button 
                        onClick={() => setSelectedInquiry(item)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                       >
                         Detailed Info
                       </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedInquiry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInquiry(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-slate-900">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                     <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">{selectedInquiry.subject || 'Inquiry Details'}</h3>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Received {format(new Date(selectedInquiry.createdAt), 'PPP p')}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedInquiry(null)}
                  className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Information</div>
                    <div className="space-y-4">
                       <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-indigo-600" />
                          <div className="text-sm font-bold text-slate-700">{selectedInquiry.name}</div>
                       </div>
                       <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-indigo-600" />
                          <div className="text-sm font-bold text-slate-700">{selectedInquiry.email}</div>
                       </div>
                       <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-indigo-600" />
                          <div className="text-sm font-bold text-slate-700">{selectedInquiry.phone || 'No phone provided'}</div>
                       </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 space-y-4">
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Technical Signals</div>
                    <div className="space-y-4">
                       <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-indigo-600" />
                          <div className="text-sm font-bold text-indigo-900">{selectedInquiry.location?.city || 'Local'}, {selectedInquiry.location?.country || 'Network'}</div>
                       </div>
                       <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-indigo-600" />
                          <div className="text-sm font-mono font-bold text-indigo-900/60">{selectedInquiry.location?.ip || '0.0.0.0'}</div>
                       </div>
                       <div className="flex items-center gap-3">
                          <MessageSquare className="w-4 h-4 text-indigo-600" />
                          <div className="text-xs font-black text-indigo-900 uppercase tracking-tighter">Via: {selectedInquiry.preferredContactMethod || 'API'}</div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Message Payload</div>
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedInquiry.message}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex justify-end">
                <button 
                  onClick={() => setSelectedInquiry(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-600/10"
                >
                  Close Detailed View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

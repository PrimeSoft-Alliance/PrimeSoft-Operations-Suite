import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, MessageSquare, CheckCircle2, Clock, X, Eye, Loader2, User, Phone, 
  MapPin, Globe, Users, Calendar, Ticket as TicketIcon, Send, RefreshCw,
  Search, Filter, ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { useClientId } from '../../lib/useClientId';

export default function SupportSuite() {
  const { clientId } = useClientId();
  const [activeTab, setActiveTab] = useState<'inquiries' | 'tickets'>('inquiries');
  
  // Inquiries State
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);

  // Tickets State
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [ticketTab, setTicketTab] = useState<'open' | 'closed'>('open');
  const [ticketsLoading, setTicketsLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      fetchInquiries();
      fetchTickets();
    }
  }, [clientId]);

  // --- Inquiries Logic ---
  const fetchInquiries = async () => {
    try {
      const res = await fetch('/v1/contacts', { headers: { 'x-client-id': clientId || '' } });
      const data = await res.json();
      if (data.success) {
        setInquiries(data.data);
      } else if (Array.isArray(data)) {
        setInquiries(data);
      }
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    } finally {
      setInquiriesLoading(false);
    }
  };

  const resolveInquiry = async (id: string) => {
    try {
      await fetch(`/v1/contacts/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId || '' },
        body: JSON.stringify({ status: 'resolved' })
      });
      fetchInquiries();
      setSelectedInquiry(null);
    } catch (err) {}
  };

  // --- Tickets Logic ---
  const fetchTickets = async () => {
    try {
      const res = await fetch('/v1/tickets', { headers: { 'x-client-id': clientId } });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data || []);
      }
    } catch (err) {} finally {
      setTicketsLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      const res = await fetch(`/v1/tickets/${id}/messages`, { headers: { 'x-client-id': clientId } });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data || []);
      }
    } catch (err) {}
  };

  const selectTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket._id);
    if (ticket.hasUnreadMessages) {
      markAsRead(ticket._id);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/v1/tickets/${id}/read`, { method: 'POST', headers: { 'x-client-id': clientId } });
      setTickets(tickets.map(t => t._id === id ? { ...t, hasUnreadMessages: false } : t));
    } catch (err) {}
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/v1/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
        body: JSON.stringify({ status })
      });
      fetchTickets();
      if (selectedTicket?._id === id) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (err) {}
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    try {
      const res = await fetch(`/v1/tickets/${selectedTicket._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
        body: JSON.stringify({
          content: newMessage,
          senderRole: 'agent',
          isInternal
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessages([...messages, data.data]);
        setNewMessage('');
        setIsInternal(false);
      }
    } catch (err) {}
  };

  const filteredTickets = tickets.filter(t => {
    if (ticketTab === 'open') return ['open', 'in_progress'].includes(t.status);
    return ['resolved', 'closed'].includes(t.status);
  });

  return (
    <div className="space-y-6 h-full flex flex-col min-h-[600px]">
      {/* Header Container */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
               Communication Suite
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Central hub for inquiries and technical support tickets.</p>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl shrink-0">
             <button 
                onClick={() => setActiveTab('inquiries')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === 'inquiries' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
             >
                <Mail className="w-4 h-4" /> Inquiries
             </button>
             <button 
                onClick={() => setActiveTab('tickets')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === 'tickets' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
             >
                <MessageSquare className="w-4 h-4" /> Tickets
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'inquiries' ? (
            <motion.div 
              key="inquiries"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inquiriesLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-48 bg-white border border-slate-100 animate-pulse rounded-[2rem]" />
                  ))
                ) : inquiries.length === 0 ? (
                  <div className="col-span-full h-80 bg-white border border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                    <Mail className="w-12 h-12 text-slate-200 mb-4" />
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">No Inquiries Found</h3>
                    <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">When customers message you via your platform, they will appear here.</p>
                  </div>
                ) : (
                  inquiries.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => setSelectedInquiry(item)}
                      className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-600/5 transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all capitalize">
                          {item.name[0]}
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          item.status === 'unread' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {item.status}
                        </span>
                      </div>
                      <div className="space-y-1 mb-4">
                        <div className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight truncate">{item.subject || 'Sales Inquiry'}</div>
                        <div className="text-xs font-bold text-slate-500">{item.name}</div>
                      </div>
                      <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>{item.email.split('@')[0]}</span>
                        <span>{format(new Date(item.createdAt), 'MMM dd')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="tickets"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col gap-6"
            >
              <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                {/* Ticket List */}
                <div className="w-full lg:w-1/3 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden max-h-[500px] lg:max-h-none">
                  <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                     <div className="flex bg-slate-200/50 p-1 rounded-xl">
                        <button onClick={() => setTicketTab('open')} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", ticketTab === 'open' ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500")}>Open</button>
                        <button onClick={() => setTicketTab('closed')} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", ticketTab === 'closed' ? "bg-white text-emerald-600 shadow-xs" : "text-slate-500")}>Closed</button>
                     </div>
                     <button onClick={fetchTickets} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><RefreshCw className="w-4 h-4" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    {filteredTickets.map(ticket => (
                      <button
                        key={ticket._id}
                        onClick={() => selectTicket(ticket)}
                        className={cn(
                          "w-full text-left p-4 rounded-3xl mb-2 transition-all border",
                          selectedTicket?._id === ticket._id ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-transparent hover:bg-slate-50"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-bold text-sm text-gray-900 truncate max-w-[120px]">{ticket.customerName}</div>
                          <div className={cn(
                            "text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full shrink-0",
                            ticket.status === 'open' ? 'bg-amber-100 text-amber-700' :
                            ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-emerald-100 text-emerald-700'
                          )}>
                            {ticket.status}
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-gray-800 line-clamp-1">{ticket.subject}</div>
                        <div className="mt-3 text-[9px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                           <span>#{ticket._id.slice(-6)}</span>
                           <span>{format(new Date(ticket.updatedAt), 'MMM d')}</span>
                        </div>
                      </button>
                    ))}
                    {filteredTickets.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <TicketIcon className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-[10px] font-black uppercase">Empty Queue</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ticket Detail */}
                <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden min-h-[500px]">
                   {selectedTicket ? (
                     <>
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white z-10 shrink-0">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                                 <MessageSquare className="w-5 h-5" />
                              </div>
                              <div>
                                 <h3 className="text-md font-black text-slate-900 tracking-tight leading-none">{selectedTicket.subject}</h3>
                                 <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{selectedTicket.customerEmail}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <select 
                                value={selectedTicket.status}
                                onChange={e => updateStatus(selectedTicket._id, e.target.value)}
                                className="bg-slate-50 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                             >
                               <option value="open">Open</option>
                               <option value="in_progress">In Progress</option>
                               <option value="resolved">Resolved</option>
                               <option value="closed">Closed</option>
                             </select>
                           </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
                           {messages.map((msg, i) => {
                             const isAgent = msg.senderRole === 'agent';
                             return (
                               <div key={i} className={cn("flex flex-col max-w-[85%]", isAgent ? "ml-auto items-end" : "items-start")}>
                                 <div className={cn(
                                   "p-4 rounded-2xl text-xs md:text-sm font-medium shadow-sm transition-all",
                                   msg.isInternal ? "bg-rose-50 text-rose-900 border border-rose-100" :
                                   isAgent ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                                 )}>
                                   {msg.content}
                                 </div>
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mx-1 mt-1">
                                   {format(new Date(msg.createdAt), 'h:mm a')} {msg.isInternal && <span className="text-rose-500">• INTERNAL</span>}
                                 </span>
                               </div>
                             );
                           })}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-white">
                           <div className="space-y-3">
                              <div className="flex items-center gap-2 px-1">
                                 <input 
                                   type="checkbox" 
                                   id="internal-suite"
                                   checked={isInternal} 
                                   onChange={e => setIsInternal(e.target.checked)}
                                   className="rounded text-rose-600 focus:ring-rose-200 w-3.5 h-3.5"
                                 />
                                 <label htmlFor="internal-suite" className="text-[10px] font-black uppercase text-slate-500 tracking-widest cursor-pointer select-none">Internal Team Note</label>
                              </div>
                              <div className="relative">
                                 <textarea 
                                   placeholder={isInternal ? "Internal technical logs..." : "Type your customer reply..."}
                                   value={newMessage}
                                   onChange={e => setNewMessage(e.target.value)}
                                   className={cn(
                                     "w-full bg-slate-50 border-none rounded-3xl px-6 py-4 text-sm font-medium focus:ring-2 transition-all outline-none resize-none min-h-[80px]",
                                     isInternal ? "focus:ring-rose-100 bg-rose-50/50 text-rose-900" : "focus:ring-indigo-100"
                                   )}
                                   onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                                 />
                                 <button 
                                   onClick={sendMessage}
                                   disabled={!newMessage.trim()}
                                   className={cn(
                                     "absolute right-2 bottom-2 p-3 rounded-2xl text-white shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40",
                                     isInternal ? "bg-rose-500" : "bg-indigo-600"
                                   )}
                                 >
                                   <Send className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                        </div>
                     </>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center py-20 text-center opacity-30">
                        <MessageSquare className="w-12 h-12 text-slate-300 mb-4" />
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Select Support Case</h4>
                     </div>
                   )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Inquiry Detail Modal (Overlay) */}
      <AnimatePresence>
        {selectedInquiry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedInquiry(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
               <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                        <Mail className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedInquiry.subject || 'Inquiry Details'}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mt-1">Ref ID: {selectedInquiry._id.slice(-8)}</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedInquiry(null)} className="p-3 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors">
                     <X className="w-5 h-5 text-slate-400" />
                  </button>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                     <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Sender</label>
                        <div className="text-sm font-bold text-slate-900">{selectedInquiry.name}</div>
                     </div>
                     <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                        <div className="text-sm font-bold text-slate-900">{selectedInquiry.email}</div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Conversation</label>
                     <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-inner min-h-[150px]">
                        <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{selectedInquiry.message}"</p>
                     </div>
                  </div>
               </div>

               <div className="p-8 border-t border-slate-50 flex gap-3">
                  {selectedInquiry.status === 'unread' && (
                    <button 
                      onClick={() => resolveInquiry(selectedInquiry._id)}
                      className="flex-1 bg-emerald-600 text-white rounded-2xl py-4 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      Archive & Close
                    </button>
                  )}
                  <a 
                    href={`mailto:${selectedInquiry.email}`}
                    className="flex-1 bg-slate-900 text-white rounded-2xl py-4 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg text-center"
                  >
                    Direct Reply
                  </a>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

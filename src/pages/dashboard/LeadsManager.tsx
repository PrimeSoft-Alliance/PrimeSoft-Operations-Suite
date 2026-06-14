import React, { useState, useEffect, useRef } from 'react';
import { useClientId } from '../../lib/useClientId';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Trash2, Mail, Phone, Tag, MapPin, Calendar, ExternalLink, Zap, Database, KanbanSquare, List, GripHorizontal, CheckCircle2, Building2, User, Clock, Globe, X, Send, ChevronRight, MoreHorizontal, Trophy, XCircle, RefreshCw, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getSocket } from '../../lib/socket';

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

export default function LeadsManager() {
  const { clientId: cidHook } = useClientId();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'cards'>('cards');
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyStatus, setReplyStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [isSimulating, setIsSimulating] = useState(false);
  const [replyMode, setReplyMode] = useState<'email' | 'whatsapp'>('email');
  const activityEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cidHook) {
      fetchLeads();

      const socket = getSocket(cidHook);
      
      socket.on('lead_update', (updatedLead) => {
        setLeads(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
        if (selectedLead?._id === updatedLead._id) {
          setSelectedLead(updatedLead);
        }
      });

      socket.on('activity_update', ({ leadId, activity }) => {
        setLeads(prev => prev.map(l => {
          if (l._id === leadId) {
            const exists = l.activities.some((a: any) => a._id === activity._id);
            if (exists) return l;
            return {
              ...l,
              activities: [...l.activities, activity],
              lastActivity: new Date()
            };
          }
          return l;
        }));

        if (selectedLead?._id === leadId) {
          setSelectedLead((prev: any) => {
            const exists = prev.activities.some((a: any) => a._id === activity._id);
            if (exists) return prev;
            return {
              ...prev,
              activities: [...prev.activities, activity],
              lastActivity: new Date()
            };
          });
        }
      });

      return () => {
        socket.off('lead_update');
        socket.off('activity_update');
      };
    }
  }, [cidHook, selectedLead?._id]);

  useEffect(() => {
    if (activityEndRef.current) {
      activityEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedLead?.activities]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/leads', { headers: { 'x-client-id': cidHook } });
      const data = await res.json();
      const leadsList = data.success ? data.data : data;
      if (Array.isArray(leadsList)) {
        setLeads(leadsList.map((l: any) => ({ ...l, stage: l.stage || 'New' })));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteLead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this lead forever?')) return;
    try {
      await fetch(`/v1/leads/${id}`, { method: 'DELETE', headers: { 'x-client-id': cidHook } });
      fetchLeads();
      if (selectedLead?._id === id) setSelectedLead(null);
    } catch (err) { }
  };

  const updateStage = async (id: string, stage: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await fetch(`/v1/leads/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': cidHook },
        body: JSON.stringify({ stage })
      });
      fetchLeads();
      if (selectedLead?._id === id) {
        setSelectedLead({ ...selectedLead, stage });
      }
    } catch (e) { }
  };

  const sendReply = async () => {
    if (!selectedLead || !replyMessage) return;
    setReplyStatus('sending');
    try {
      const endpoint = replyMode === 'whatsapp' ? '/v1/whatsapp/send' : `/v1/leads/${selectedLead._id}/reply`;
      const body = replyMode === 'whatsapp' 
        ? { to: selectedLead.contactPhone, message: replyMessage }
        : { message: replyMessage, subject: replySubject };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': cidHook },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setReplyStatus('success');
        setReplyMessage('');
        setIsReplying(false);
        // Socket handle updates, but we can refresh just in case
        setTimeout(() => setReplyStatus('idle'), 3000);
      } else {
        setReplyStatus('error');
      }
    } catch (err) {
      setReplyStatus('error');
    }
  };

  const simulateReply = async () => {
    if (!selectedLead) return;
    setIsSimulating(true);
    try {
      await fetch(`/v1/leads/${selectedLead._id}/simulate-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': cidHook },
        body: JSON.stringify({ 
          message: replyMode === 'whatsapp' ? "Hello! This is a WhatsApp reply." : undefined,
          type: replyMode === 'whatsapp' ? 'whatsapp' : 'email'
        })
      });
    } catch (err) {}
    setIsSimulating(false);
  };

  const filteredLeads = leads.filter(l =>
    `${l.contactFirst || ''} ${l.contactLast || ''} ${l.company || ''} ${l.contactEmail || ''}`.toLowerCase().includes((search || '').toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:h-[calc(100vh-4rem)] md:-m-6 overflow-hidden">
      {/* Header - Mobile Sticky */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8 md:py-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
              Leads
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest">{filteredLeads.length}</span>
            </h1>
            <p className="hidden md:block text-slate-500 text-xs font-medium">Manage your sales pipeline and customer interactions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchLeads} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('cards')} 
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600')}
              >
                <GridIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
        {loading && leads.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900">No leads found</h3>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className={cn(
            "grid gap-4",
            viewMode === 'cards' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
          )}>
            {filteredLeads.map(lead => (
              <LeadCard 
                key={lead._id} 
                lead={lead} 
                onClick={() => setSelectedLead(lead)}
                onUpdateStage={(stage) => updateStage(lead._id, stage)}
                onDelete={() => deleteLead(lead._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel / Drawer */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white w-full max-w-4xl h-[90vh] md:h-full md:max-h-[85vh] rounded-t-[2rem] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black">
                    {selectedLead.contactFirst?.[0] || 'L'}
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 text-lg md:text-xl">{selectedLead.contactFirst} {selectedLead.contactLast}</h2>
                    <p className="text-xs text-slate-500 font-medium">{selectedLead.company || 'Direct Insight'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Left Column: Info & Actions */}
                  <div className="p-6 border-r border-slate-50">
                    <div className="space-y-6">
                      <div className="flex flex-wrap gap-2">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                          selectedLead.stage === 'Closed Won' ? 'bg-emerald-100 text-emerald-700' :
                          selectedLead.stage === 'Closed Lost' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                        )}>
                          {selectedLead.stage}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                          {selectedLead.source}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <Mail className="w-5 h-5 text-indigo-500" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{selectedLead.contactEmail}</p>
                          </div>
                        </div>
                        {selectedLead.contactPhone && (
                          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <Phone className="w-5 h-5 text-indigo-500" />
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                              <p className="text-sm font-bold text-slate-900 truncate">{selectedLead.contactPhone}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <MapPin className="w-5 h-5 text-indigo-500" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{selectedLead.location?.city || 'Unknown'}, {selectedLead.location?.country || ''}</p>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="grid grid-cols-2 gap-3 pt-4">
                        <button 
                          onClick={() => updateStage(selectedLead._id, 'Closed Won')}
                          className="flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                        >
                          <Trophy className="w-4 h-4" /> Won
                        </button>
                        <button 
                          onClick={() => updateStage(selectedLead._id, 'Closed Lost')}
                          className="flex items-center justify-center gap-2 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                        >
                          <XCircle className="w-4 h-4" /> Lost
                        </button>
                      </div>

                      {/* Additional Fields Block */}
                      {selectedLead.data && Object.keys(selectedLead.data).length > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Submission Payload</h4>
                          <div className="space-y-4">
                            {Object.entries(selectedLead.data).map(([key, value]) => {
                               if (typeof value === 'object') return null;
                               return (
                                <div key={key} className="border-b border-slate-200/50 pb-2">
                                  <p className="text-[10px] font-bold text-indigo-600/60 uppercase">{key.replace(/_/g, ' ')}</p>
                                  <p className="text-sm font-bold text-slate-800">{String(value)}</p>
                                </div>
                               );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Timeline & Messaging */}
                  <div className="p-6 bg-slate-50/30 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Activity Feed
                      </h4>
                      <button 
                        onClick={() => setIsReplying(true)}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Send Email
                      </button>
                    </div>

                    <div className="flex-1 space-y-4 min-h-0 overflow-y-auto mb-4 px-2 py-4 bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner">
                      {selectedLead.activities?.length > 0 ? (
                        selectedLead.activities.map((activity: any, idx: number) => {
                          const isIncoming = activity.metadata?.incoming;
                          const isWhatsApp = activity.type === 'whatsapp' || activity.metadata?.platform === 'whatsapp';
                          return (
                            <div key={idx} className={cn(
                              "flex flex-col gap-1 max-w-[85%]",
                              isIncoming ? "self-start items-start" : "self-end items-end ml-auto"
                            )}>
                              <div className={cn(
                                "p-3 rounded-2xl text-xs md:text-sm font-medium shadow-sm transition-all group relative",
                                isIncoming 
                                  ? "bg-white border border-slate-200 text-slate-800 rounded-bl-none" 
                                  : isWhatsApp 
                                    ? "bg-emerald-600 text-white rounded-br-none"
                                    : "bg-indigo-600 text-white rounded-br-none"
                              )}>
                                {activity.metadata?.body || activity.description}
                                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   {isWhatsApp && <div className="bg-emerald-500 text-white p-1 rounded-full shadow-md ring-2 ring-white"><MessageCircle className="w-2.5 h-2.5" /></div>}
                                   {!isWhatsApp && activity.type === 'email' && <div className="bg-indigo-500 text-white p-1 rounded-full shadow-md ring-2 ring-white"><Mail className="w-2.5 h-2.5" /></div>}
                                </div>
                              </div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mx-1">
                                {format(new Date(activity.date), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                          <Database className="w-8 h-8 text-slate-200 mb-2" />
                          <p className="text-[10px] font-black uppercase text-slate-400">No history yet</p>
                        </div>
                      )}
                      <div ref={activityEndRef} />
                    </div>

                    {/* Integrated Reply Interface */}
                    <div className="space-y-3">
                      {!isReplying && (
                        <div className="flex gap-2">
                           <button 
                            onClick={() => { setReplyMode('email'); setIsReplying(true); }}
                            className="flex-1 bg-white border border-slate-200 text-slate-900 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                           >
                             <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email
                           </button>
                           <button 
                            onClick={() => { setReplyMode('whatsapp'); setIsReplying(true); }}
                            className="flex-1 bg-white border border-slate-200 text-slate-900 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"
                           >
                             <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                           </button>
                           <button 
                            disabled={isSimulating}
                            onClick={simulateReply}
                            className="bg-slate-900 text-white p-3 rounded-2xl hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
                            title="Simulate Inbound Reply"
                           >
                             <RefreshCw className={cn("w-4 h-4", isSimulating && "animate-spin")} />
                           </button>
                        </div>
                      )}
                      
                      {isReplying && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className={cn(
                            "bg-white border-2 rounded-[2rem] p-4 shadow-xl ring-4",
                            replyMode === 'whatsapp' ? "border-emerald-100 ring-emerald-50" : "border-indigo-100 ring-indigo-50"
                          )}
                        >
                           <div className="flex justify-between items-center mb-3 px-1">
                             <h5 className={cn(
                               "text-[10px] font-black uppercase tracking-widest",
                               replyMode === 'whatsapp' ? "text-emerald-600" : "text-indigo-600"
                             )}>
                               {replyMode === 'whatsapp' ? 'WhatsApp Reply' : 'Email Reply'}
                             </h5>
                             <button onClick={() => setIsReplying(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4 text-slate-400" /></button>
                           </div>

                           {replyMode === 'email' && (
                             <input 
                                type="text" 
                                placeholder="Subject line..." 
                                value={replySubject} 
                                onChange={e => setReplySubject(e.target.value)}
                                className="w-full mb-3 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                             />
                           )}

                           <textarea 
                             rows={4}
                             placeholder={replyMode === 'whatsapp' ? "Type WhatsApp message..." : "Write your email response..."}
                             value={replyMessage}
                             onChange={e => setReplyMessage(e.target.value)}
                             className={cn(
                               "w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium placeholder:text-slate-300 transition-all outline-none resize-none",
                               replyMode === 'whatsapp' ? "focus:ring-2 focus:ring-emerald-100" : "focus:ring-2 focus:ring-indigo-100"
                             )}
                           />
                           <div className="mt-4 flex justify-end gap-2">
                             <button 
                              disabled={replyStatus === 'sending' || !replyMessage}
                              onClick={sendReply}
                              className={cn(
                                "w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-40",
                                replyMode === 'whatsapp' ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-indigo-600 text-white hover:bg-slate-900"
                              )}
                             >
                               <Send className={cn("w-3.5 h-3.5", replyStatus === 'sending' && "animate-pulse")} /> 
                               {replyStatus === 'sending' ? 'Dispatching...' : 'Dispatch Message'}
                             </button>
                           </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LeadCard({ lead, onClick, onUpdateStage, onDelete }: any) {
  return (
    <motion.div 
      layoutId={lead._id}
      onClick={onClick}
      whileHover={{ y: -4 }}
      className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200 group cursor-pointer hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black group-hover:scale-110 transition-transform">
            {lead.contactFirst?.[0] || 'L'}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm truncate">{lead.contactFirst} {lead.contactLast}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{lead.company || lead.source}</p>
          </div>
        </div>
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4 " />
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
         <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Mail className="w-3.5 h-3.5 text-slate-300" />
            <span className="truncate">{lead.contactEmail}</span>
         </div>
         {lead.contactPhone && (
           <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Phone className="w-3.5 h-3.5 text-slate-300" />
              <span>{lead.contactPhone}</span>
           </div>
         )}
      </div>

      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
           <div className={cn(
             "w-2 h-2 rounded-full",
             lead.stage === 'Closed Won' ? 'bg-emerald-500' :
             lead.stage === 'Closed Lost' ? 'bg-rose-500' : 'bg-indigo-500'
           )} />
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{lead.stage}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
           <Calendar className="w-3 h-3" /> {format(new Date(lead.createdAt || Date.now()), 'MMM d')}
        </div>
      </div>
    </motion.div>
  );
}

function GridIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

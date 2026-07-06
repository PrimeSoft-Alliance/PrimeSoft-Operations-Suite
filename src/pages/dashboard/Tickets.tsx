import React, { useState, useEffect } from 'react';
import { useClientId } from '../../lib/useClientId';
import { Ticket, RefreshCw, X, Clock, User, Mail, MessageSquare, ShieldCheck, Tag, Send, Trash2, CheckCircle2, Sparkles, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { LongPressWrapper } from '../../components/LongPressWrapper';
import { SelectionToolbar } from '../../components/SelectionToolbar';

export default function Tickets() {
  const { clientId } = useClientId();
  const [searchParams] = useSearchParams();
  const ticketIdParam = searchParams.get('id');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [replyImageUrl, setReplyImageUrl] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [isEditingAiSummary, setIsEditingAiSummary] = useState(false);
  const [aiSummaryContent, setAiSummaryContent] = useState('');
  const [savingAiSummary, setSavingAiSummary] = useState(false);

  useEffect(() => {
    if (selectedTickets.length === 0 && isSelectionMode) {
      setIsSelectionMode(false);
    }
  }, [selectedTickets, isSelectionMode]);

  const toggleSelection = (id: string) => {
    setSelectedTickets(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedTickets([id]);
    }
  };

  const handleCardClick = (t: any) => {
    if (isSelectionMode) {
      toggleSelection(t._id);
    } else {
      setSelectedTicket(t);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const res = await fetch(`/v1/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setTickets(prev => prev.map(t => t._id === ticketId ? { ...t, status } : t));
        setSelectedTicket(prev => prev && prev._id === ticketId ? { ...prev, status } : prev);
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  const handleSaveAiSummary = async () => {
    if (!selectedTicket || savingAiSummary) return;
    setSavingAiSummary(true);
    try {
      const res = await fetch(`/v1/tickets/${selectedTicket._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId
        },
        body: JSON.stringify({ aiSummary: aiSummaryContent })
      });
      const data = await res.json();
      if (data.success) {
        setTickets(prev => prev.map(t => t._id === selectedTicket._id ? { ...t, aiSummary: aiSummaryContent } : t));
        setSelectedTicket(prev => prev && prev._id === selectedTicket._id ? { ...prev, aiSummary: aiSummaryContent } : prev);
        setIsEditingAiSummary(false);
      }
    } catch (err) {
      console.error('Failed to update AI summary:', err);
    } finally {
      setSavingAiSummary(false);
    }
  };

  const fetchTickets = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await fetch('/v1/tickets', { headers: { 'x-client-id': clientId } });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    if (!clientId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/v1/tickets/${ticketId}/messages`, { 
        headers: { 'x-client-id': clientId } 
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async () => {
    if ((!replyContent.trim() && !replyImageUrl) || !selectedTicket || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/v1/tickets/${selectedTicket._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId
        },
        body: JSON.stringify({
          content: replyContent,
          imageUrl: replyImageUrl,
          senderRole: 'agent',
          senderName: 'Support Agent',
          isInternal: false
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setReplyContent('');
        setReplyImageUrl('');
        // Refresh ticket to update status
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingReply(false);
    }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket and all its messages?')) return;
    try {
      const res = await fetch(`/v1/tickets/${id}`, {
        method: 'DELETE',
        headers: { 'x-client-id': clientId! }
      });
      if (res.ok) {
        setTickets(prev => prev.filter(t => t._id !== id));
        setSelectedTickets(prev => prev.filter(tid => tid !== id));
        if (selectedTicket?._id === id) setSelectedTicket(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDeleteTickets = async () => {
    if (selectedTickets.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedTickets.length} selected tickets?`)) return;
    try {
      const res = await fetch('/v1/tickets', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId!
        },
        body: JSON.stringify({ ids: selectedTickets })
      });
      const data = await res.json();
      if (data.success) {
        setTickets(prev => prev.filter(t => !selectedTickets.includes(t._id)));
        setSelectedTickets([]);
        if (selectedTicket && selectedTickets.includes(selectedTicket._id)) {
          setSelectedTicket(null);
        }
      } else {
        alert(data.error?.message || 'Failed to delete selected tickets.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [clientId]);

  useEffect(() => {
    if (tickets.length > 0 && ticketIdParam) {
      const found = tickets.find(t => t._id === ticketIdParam);
      if (found) {
        setSelectedTicket(found);
        const isClosed = found.status === 'closed' || found.status === 'resolved';
        setActiveTab(isClosed ? 'closed' : 'open');
      }
    }
  }, [tickets, ticketIdParam]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket._id);
      setAiSummaryContent(selectedTicket.aiSummary || '');
      setIsEditingAiSummary(false);
    } else {
      setMessages([]);
      setReplyContent('');
      setAiSummaryContent('');
      setIsEditingAiSummary(false);
    }
  }, [selectedTicket]);

  const filteredTickets = tickets.filter((t: any) => {
    const isClosed = t.status === 'closed' || t.status === 'resolved';
    if (activeTab === 'open') return !isClosed;
    return isClosed;
  });

  useEffect(() => {
    if (selectedTicket) {
      window.history.pushState({ ticketDetail: true }, '');
    }
    
    const handlePopState = (e: PopStateEvent) => {
      if (selectedTicket) {
        setSelectedTicket(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedTicket]);

  const counts = {
    open: tickets.filter((t: any) => t.status !== 'closed' && t.status !== 'resolved').length,
    closed: tickets.filter((t: any) => t.status === 'closed' || t.status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* List of Tickets on the Left / Sidebar feel */}
        <div className="lg:col-span-12">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Ticket className="w-4 h-4 text-emerald-600" />
                Active Support Queue
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Tabs */}
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 gap-1 text-[10px] font-black uppercase tracking-wider shadow-inner">
                  <button
                    onClick={() => setActiveTab('open')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                      activeTab === 'open'
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Open
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-md text-[8px] font-bold",
                      activeTab === 'open' ? "bg-emerald-700 text-emerald-100" : "bg-slate-100 text-slate-500"
                    )}>
                      {counts.open}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('closed')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                      activeTab === 'closed'
                        ? "bg-slate-700 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Closed
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-md text-[8px] font-bold",
                      activeTab === 'closed' ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-500"
                    )}>
                      {counts.closed}
                    </span>
                  </button>
                </div>

                <button 
                  onClick={fetchTickets} 
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 transition-all cursor-pointer shadow-sm"
                >
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
              </div>
            </div>

            <SelectionToolbar
              isVisible={isSelectionMode}
              selectedCount={selectedTickets.length}
              totalCount={filteredTickets.length}
              onDelete={handleBulkDeleteTickets}
              onCancel={() => {
                setIsSelectionMode(false);
                setSelectedTickets([]);
              }}
              onSelectAll={() => setSelectedTickets(filteredTickets.map(t => t._id))}
              onDeselectAll={() => setSelectedTickets([])}
              itemName="tickets"
            />
            
            <div className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <Ticket className="w-8 h-8" />
                  </div>
                  <div className="max-w-xs">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Queue Empty</h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      No {activeTab} support tickets found in this queue.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y md:divide-y-0 divide-slate-100">
                  {filteredTickets.map((t: any) => {
                    const isSelected = selectedTickets.includes(t._id);

                    return (
                      <LongPressWrapper 
                        key={t._id} 
                        layoutId={t._id}
                        disabled={isSelectionMode}
                        onLongPress={() => handleLongPress(t._id)}
                        onClick={() => handleCardClick(t)}
                        className={cn(
                          "p-8 flex flex-col hover:bg-slate-50 transition-all cursor-pointer group relative",
                          isSelected && "bg-emerald-50/30 ring-2 ring-emerald-500 ring-inset"
                        )}
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-3">
                            <AnimatePresence>
                              {isSelectionMode && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  className="absolute top-4 left-4 z-20"
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all",
                                    isSelected 
                                      ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/30" 
                                      : "bg-white border-slate-200 text-transparent"
                                  )}>
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                              <Ticket className="w-6 h-6" />
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {!isSelectionMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTicket(t._id);
                                }}
                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-md text-slate-300 hover:text-rose-600 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <div className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
                              t.status === 'open' ? 'bg-amber-100 text-amber-700' :
                              t.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {t.status}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-8">
                          <div className="font-black text-slate-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight truncate">
                            {t.subject || 'No Subject'}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-2 font-medium">
                            {t.description}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            {t.customerName}
                          </div>
                          <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                            Interact <MessageSquare className="w-3 h-3" />
                          </div>
                        </div>
                      </LongPressWrapper>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed lg:inset-0 top-16 lg:top-0 inset-x-0 bottom-0 lg:z-50 z-20 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm lg:block hidden" 
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-2xl bg-white sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-full sm:max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                      <Ticket className="w-5 h-5" />
                   </div>
                   <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">Ticket Detail</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">ID: TKT-{selectedTicket._id.slice(-6).toUpperCase()}</p>
                   </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-1">
                   <h2 className="text-xl font-black text-slate-900 leading-tight">{selectedTicket.subject || 'No Subject Provided'}</h2>
                   <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        selectedTicket.status === 'open' ? 'bg-amber-100 text-amber-700' :
                        selectedTicket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        Status: {selectedTicket.status}
                       </span>
                       
                       {(selectedTicket.status === 'closed' || selectedTicket.status === 'resolved') ? (
                         <button
                           onClick={() => updateTicketStatus(selectedTicket._id, 'open')}
                           className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                         >
                           <RefreshCw className="w-2.5 h-2.5" />
                           Reopen Ticket
                         </button>
                       ) : (
                         <button
                           onClick={() => updateTicketStatus(selectedTicket._id, 'closed')}
                           className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                         >
                           <ShieldCheck className="w-2.5 h-2.5" />
                           Close Ticket
                         </button>
                       )}
                       <span style={{ display: 'none' }}>
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(selectedTicket.createdAt), 'PPP p')}
                      </span>
                   </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Requester Information
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Full Name</label>
                         <div className="text-xs font-bold text-slate-900">{selectedTicket.customerName}</div>
                      </div>
                      <div>
                         <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Email Address</label>
                         <div className="text-xs font-bold text-slate-900">{selectedTicket.customerEmail}</div>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                  {/* AI Representative Hand-off Notes */}
                 <div className="bg-gradient-to-br from-indigo-50/60 to-violet-50/40 p-5 rounded-2xl border border-indigo-100/60 space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                       <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                          AI Rep Hand-off Notes & Context
                       </div>
                       {!isEditingAiSummary ? (
                         <button
                           onClick={() => {
                             setAiSummaryContent(selectedTicket.aiSummary || '');
                             setIsEditingAiSummary(true);
                           }}
                           className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest cursor-pointer hover:underline bg-transparent border-none p-0"
                         >
                           Edit Notes
                         </button>
                       ) : null}
                    </div>

                    {isEditingAiSummary ? (
                      <div className="space-y-2">
                        <textarea
                          value={aiSummaryContent}
                          onChange={(e) => setAiSummaryContent(e.target.value)}
                          placeholder="Update AI Hand-off Notes/Summary..."
                          className="w-full bg-white border border-indigo-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px] resize-none text-slate-800"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setIsEditingAiSummary(false)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveAiSummary}
                            disabled={savingAiSummary}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            {savingAiSummary ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                         {selectedTicket.aiSummary || selectedTicket.description || (
                           `• Customer Goal: Seeks follow-up on their registered inquiry.\n• Escalation Trigger: AI hand-off to human support.\n• Key Information: Customer Name: ${selectedTicket.customerName}, Email: ${selectedTicket.customerEmail}.\n• Suggested Next Action: Review previous chat history and reply with a professional greeting.`
                         )}
                      </div>
                    )}
                 </div>

                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conversation Thread</label>
                   
                   <div className="space-y-4">
                     {loadingMessages ? (
                       <div className="flex justify-center py-4">
                         <RefreshCw className="w-5 h-5 animate-spin text-slate-300" />
                       </div>
                     ) : messages.map((msg) => (
                       <div 
                         key={msg._id} 
                         className={cn(
                           "flex flex-col max-w-[85%]",
                           msg.senderRole === 'agent' ? "ml-auto items-end" : "mr-auto items-start"
                         )}
                       >
                         <div className={cn(
                           "p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm",
                           msg.senderRole === 'agent' 
                             ? "bg-indigo-600 text-white rounded-tr-none" 
                             : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
                         )}>
                           {msg.content}
                         </div>
                         <div className="mt-1 px-1 flex items-center gap-2">
                           <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                             {msg.senderName}
                           </span>
                           <span className="text-[8px] text-slate-300 font-mono">
                             {format(new Date(msg.createdAt), 'HH:mm')}
                           </span>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-4 shrink-0">
                {replyImageUrl && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={replyImageUrl} className="w-full h-full object-cover" alt="Upload Preview" />
                    <button 
                      onClick={() => setReplyImageUrl('')}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                )}
                <div className="relative">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your response to the customer..."
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px] resize-none"
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <input
                      type="file"
                      id="ticket-reply-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          const res = await fetch('/v1/media/upload', {
                            method: 'POST',
                            headers: { 'x-client-id': clientId },
                            body: formData
                          });
                          const data = await res.json();
                          if (data.success && data.data?.url) {
                            setReplyImageUrl(data.data.url);
                          } else if (data.url) {
                             setReplyImageUrl(data.url);
                          }
                        } catch (err) {
                          console.error('Ticket upload failed:', err);
                        }
                      }}
                    />
                    <button
                      onClick={() => document.getElementById('ticket-reply-upload')?.click()}
                      className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSendReply}
                      disabled={(!replyContent.trim() && !replyImageUrl) || sendingReply}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {sendingReply ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send Reply
                    </button>
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

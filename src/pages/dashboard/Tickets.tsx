import { useState, useEffect } from 'react';
import { useClientId } from '../../lib/useClientId';
import { format } from 'date-fns';
import { MessageSquare, Clock, CheckCircle, Ticket as TicketIcon, Send, Mail, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Tickets() {
  const { clientId } = useClientId();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');

  useEffect(() => {
    if (clientId) fetchTickets();
  }, [clientId]);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/v1/tickets', { headers: { 'x-client-id': clientId } });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data || []);
      }
    } catch (err) {}
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
      await fetch(`/v1/tickets/${id}/read`, {
        method: 'POST',
        headers: { 'x-client-id': clientId }
      });
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
    if (activeTab === 'open') return ['open', 'in_progress'].includes(t.status);
    return ['resolved', 'closed'].includes(t.status);
  });

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Support Tickets</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage customer support, routing, and live interventions.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchTickets}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('open')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'open' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Open ({tickets.filter(t => ['open', 'in_progress'].includes(t.status)).length})
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'closed' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Closed ({tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length})
          </button>
        </div>
      </div>
    </div>

    <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Ticket List */}
        <div className={cn(
          "w-full lg:w-1/3 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col overflow-hidden max-h-[400px] lg:max-h-none",
          selectedTicket ? "hidden lg:flex" : "flex"
        )}>
          <div className="h-full overflow-y-auto custom-scrollbar p-3">
            {filteredTickets.map(ticket => (
              <button
                key={ticket._id}
                onClick={() => selectTicket(ticket || null)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl mb-2 transition-all border",
                  selectedTicket?._id === ticket._id ? "bg-indigo-50 border-indigo-200" : "bg-white border-transparent hover:bg-slate-50"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 max-w-[70%]">
                    {ticket.hasUnreadMessages && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse shrink-0" />}
                    <div className="font-bold text-gray-900 truncate">{ticket.customerName}</div>
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0",
                    ticket.status === 'open' ? 'bg-amber-100 text-amber-700' :
                    ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-500'
                  )}>
                    {ticket.status?.replace('_', ' ') || 'status'}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-800 line-clamp-1">{ticket.subject}</div>
                <div className="mt-3 flex items-center justify-between text-xs font-medium text-gray-500">
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3"/> {format(new Date(ticket.updatedAt), 'MMM d, h:mm a')}</div>
                  <div className="uppercase tracking-widest text-[9px] font-black opacity-70 bg-gray-100 px-1.5 py-0.5 rounded">#{ticket._id.slice(-6)}</div>
                </div>
              </button>
            ))}
            {filteredTickets.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                <TicketIcon className="w-8 h-8 mb-2 opacity-50" />
                <div className="text-xs font-bold uppercase tracking-widest">No {activeTab} Tickets found</div>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Thread */}
        <div className={cn(
          "w-full lg:w-2/3 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col overflow-hidden relative min-h-[500px] lg:min-h-0",
          selectedTicket ? "flex" : "hidden lg:flex"
        )}>
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-white z-10 shrink-0">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 -ml-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition lg:hidden"
                    title="Back to tickets list"
                  >
                    ← Back
                  </button>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{selectedTicket.subject}</h3>
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                       <Mail className="w-4 h-4"/> {selectedTicket.customerEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTicket.status !== 'closed' && (
                    <button 
                      onClick={() => updateStatus(selectedTicket._id, 'closed')}
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
                    >
                      Close Ticket
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      await fetch('/v1/tickets/incoming', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ticketId: selectedTicket._id,
                          content: "This is a simulated reply from the customer for testing.",
                          senderName: selectedTicket.customerName
                        })
                      });
                      fetchMessages(selectedTicket._id);
                    }}
                    className="p-2 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
                    title="Simulate Customer Reply (Test)"
                  >
                    <Send className="w-4 h-4 rotate-180" />
                  </button>
                  <select
                    value={selectedTicket.status}
                    onChange={e => updateStatus(selectedTicket._id, e.target.value)}
                    className="bg-gray-50 border-gray-200 text-sm font-bold text-gray-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex flex-col max-w-[80%]", msg.senderRole === 'agent' ? "ml-auto items-end" : "mr-auto items-start")}>
                    <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-1 px-1", msg.senderRole === 'agent' ? "text-indigo-600" : "text-gray-500")}>
                      {msg.senderName || msg.senderRole} {msg.isInternal && <span className="text-rose-500">(Internal)</span>}
                    </div>
                    <div className={cn(
                      "px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap font-medium shadow-sm",
                      msg.isInternal ? "bg-rose-50 text-rose-900 border border-rose-100" :
                      msg.senderRole === 'agent' ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
                    )}>
                      {msg.content}
                    </div>
                    <div className="text-[10px] font-semibold text-gray-400 mt-1 px-1">
                      {format(new Date(msg.createdAt), 'h:mm a')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 px-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={isInternal} 
                        onChange={e => setIsInternal(e.target.checked)}
                        className="rounded text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      Internal Note (Not visible to customer)
                    </label>
                  </div>
                  <div className="relative">
                    <textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder={isInternal ? "Type an internal note..." : "Type your reply to the customer..."}
                      className={cn(
                        "w-full rounded-[1.5rem] p-4 pr-16 resize-none focus:outline-none focus:ring-2 min-h-[80px]",
                        isInternal ? "bg-rose-50 border-rose-200 focus:ring-rose-500 text-rose-900 placeholder:text-rose-300" : "bg-gray-50 border-gray-200 focus:ring-indigo-500 font-medium"
                      )}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <button 
                      onClick={sendMessage}
                      className={cn(
                        "absolute right-2 bottom-2 p-3 rounded-xl text-white shadow-md transition-transform active:scale-95",
                        isInternal ? "bg-rose-500 hover:bg-rose-600" : "bg-indigo-600 hover:bg-indigo-700"
                      )}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
                <h3 className="text-xl font-bold text-gray-600 mb-2">Select a Ticket</h3>
                <p className="text-sm font-medium">Choose a ticket from the left to view the thread and reply.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

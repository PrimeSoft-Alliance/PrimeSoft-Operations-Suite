import React, { useState, useEffect } from 'react';
import { useClientId } from '../../lib/useClientId';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, Info, AlertTriangle, Trash2, Calendar, ChevronRight, X, Clock, Filter, Search, CheckCircle2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getSocket } from '../../lib/socket';

export default function Notifications() {
  const { clientId: cidHook } = useClientId();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  useEffect(() => {
    if (cidHook) {
      fetchNotifications();

      const socket = getSocket(cidHook);
      socket.on('notification', (newNotif) => {
        setNotifications(prev => [newNotif, ...prev]);
      });

      return () => {
        socket.off('notification');
      }
    }
  }, [cidHook]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/notifications', { headers: { 'x-client-id': cidHook } });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (err) {}
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/v1/notifications/${id}/read`, { method: 'PATCH', headers: { 'x-client-id': cidHook } });
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {}
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/v1/notifications/${id}`, { method: 'DELETE', headers: { 'x-client-id': cidHook } });
      setNotifications(notifications.filter(n => n._id !== id));
      setSelectedNotifications(prev => prev.filter(item => item !== id));
    } catch (err) {}
  };

  const handleBulkDeleteNotifications = async () => {
    if (selectedNotifications.length === 0) return;
    if (!confirm(`Delete ${selectedNotifications.length} notifications?`)) return;
    try {
      const res = await fetch('/v1/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook
        },
        body: JSON.stringify({ ids: selectedNotifications })
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n._id)));
        setSelectedNotifications([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/v1/notifications/read-all', { method: 'POST', headers: { 'x-client-id': cidHook } });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {}
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead) {
      await markAsRead(n._id);
    }
    
    // Deep linking logic with proper query parameters for exact information
    let targetPath = '';
    
    // Explicit title/message check for "ticket" to avoid misrouting
    const isTicketRelated = 
      n.type === 'ticket' || 
      n.title?.toLowerCase().includes('ticket') || 
      n.message?.toLowerCase().includes('ticket') ||
      n.link?.includes('/dashboard/tickets') ||
      n.link?.includes('/dashboard/support');

    if (isTicketRelated) {
      // Prioritize relatedId for deep linking to the specific ticket
      const ticketId = n.relatedId || (n.link?.includes('?id=') ? new URLSearchParams(n.link.split('?')[1]).get('id') : null);
      targetPath = `/dashboard/support${ticketId ? `?id=${ticketId}&tab=tickets` : '?tab=tickets'}`;
    } else if (n.type === 'lead') {
      targetPath = `/dashboard/leads${n.relatedId ? `?id=${n.relatedId}` : ''}`;
    } else if (n.type === 'booking') {
      targetPath = `/dashboard/bookings${n.relatedId ? `?id=${n.relatedId}` : ''}`;
    } else if (n.type === 'message') {
      targetPath = `/dashboard/shared-inbox${n.relatedId ? `?id=${n.relatedId}` : ''}`;
    } else if (n.type === 'missed_call') {
      targetPath = '/dashboard/missed-calls';
    } else if (n.type === 'contact') {
      targetPath = `/dashboard/contacts${n.relatedId ? `?id=${n.relatedId}` : ''}`;
    } else if (n.link) {
      if (n.link.includes('/dashboard/tickets') || n.link.includes('/dashboard/support')) {
        const isTicket = n.title?.toLowerCase().includes('ticket') || n.message?.toLowerCase().includes('ticket');
        const tab = isTicket ? 'tickets' : 'inquiries';
        targetPath = `/dashboard/support${n.relatedId ? `?id=${n.relatedId}&tab=${tab}` : `?tab=${tab}`}`;
      } else {
        targetPath = n.link;
        if (n.relatedId && !targetPath.includes('?id=')) {
          targetPath += `${targetPath.includes('?') ? '&' : '?'}id=${n.relatedId}`;
        }
      }
    }

    if (targetPath) {
      navigate(targetPath);
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (filterType === 'unread' && n.isRead) return false;
    if (filterType === 'read' && !n.isRead) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Notifications
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-1 rounded-full font-black">
                {notifications.filter(n => !n.isRead).length} NEW
              </span>
            )}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Stay updated with system activities and actions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={markAllRead}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Mark All as Read
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Filter */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200/80 p-4 lg:p-6 rounded-2xl lg:rounded-[2rem] shadow-sm space-y-4">
            <div className="flex items-center justify-between lg:block">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" /> Filter Options
              </h3>
              <button
                onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                className="lg:hidden p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", showFiltersMobile ? "rotate-180" : "")} />
              </button>
            </div>
            
            <div className={cn("space-y-4", !showFiltersMobile && "hidden lg:block")}>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button 
                  onClick={() => setFilterType('all')}
                  className={cn("text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors", filterType === 'all' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50")}
                >
                  All Notifications
                </button>
                <button 
                  onClick={() => setFilterType('unread')}
                  className={cn("text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors", filterType === 'unread' ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-slate-50")}
                >
                  Unread
                </button>
                <button 
                  onClick={() => setFilterType('read')}
                  className={cn("text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors", filterType === 'read' ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50")}
                >
                  Read
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: List */}
        <div className="lg:col-span-9 space-y-4">
          {notifications.length > 0 && (
            <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={selectedNotifications.length === filteredNotifs.length && filteredNotifs.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedNotifications(filteredNotifs.map(n => n._id));
                    } else {
                      setSelectedNotifications([]);
                    }
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-bold text-slate-600">
                  {selectedNotifications.length === 0 ? "Select all matching events" : `${selectedNotifications.length} notifications selected`}
                </span>
              </div>
              {selectedNotifications.length > 0 && (
                <button
                  onClick={handleBulkDeleteNotifications}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3.5 py-2 rounded-xl border border-rose-200 transition-all cursor-pointer text-[10px] uppercase"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected
                </button>
              )}
            </div>
          )}
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
               <p className="text-sm font-medium">Loading history...</p>
             </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-black text-slate-900 mb-1">No Notifications</h3>
              <p className="text-xs text-slate-500 mb-6 max-w-sm">We'll let you know when there is activity.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredNotifs.map((n) => (
                  <motion.div 
                    key={n._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "group relative bg-white border rounded-[2rem] p-6 hover:shadow-lg transition-all duration-300 cursor-pointer",
                      !n.isRead ? "border-indigo-300 shadow-sm" : "border-slate-200"
                    )}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex gap-5">
                      <div className="flex flex-col gap-3">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.includes(n._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNotifications(prev => [...prev, n._id]);
                            } else {
                              setSelectedNotifications(prev => prev.filter(item => item !== n._id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4 shrink-0"
                        />
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transform transition-transform",
                          n.type === 'lead' ? 'bg-indigo-100 text-indigo-600' :
                          n.type === 'booking' ? 'bg-emerald-100 text-emerald-600' :
                          n.type === 'alert' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                        )}>
                          {n.type === 'lead' ? <CheckCircle className="w-6 h-6" /> : 
                           n.type === 'booking' ? <Calendar className="w-6 h-6" /> : 
                           n.type === 'alert' ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0 pr-10">
                        <div className="flex items-center gap-2 mb-1">
                          {!n.isRead && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm"></div>}
                          <h4 className="font-bold text-slate-900">{n.title}</h4>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{n.message}</p>
                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-400">
                          <Clock className="w-3.5 h-3.5" /> {format(new Date(n.createdAt), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                      className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all bg-white border border-slate-200 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useClientId } from '../../lib/useClientId';
import { Bell, CheckCircle, Info, AlertTriangle, Trash2, Calendar, ChevronRight, X, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getSocket } from '../../lib/socket';

export default function Notifications() {
  const { clientId: cidHook } = useClientId();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {}
  };

  const markAllRead = async () => {
    try {
      await fetch('/v1/notifications/read-all', { method: 'POST', headers: { 'x-client-id': cidHook } });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:-m-6 animate-in fade-in duration-500">
      <div className="bg-white border-b border-slate-200 px-6 py-6 sticky top-0 z-20 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Bell className="w-6 h-6 text-indigo-600" />
            Notifications
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-1 rounded-full font-black">
                {notifications.filter(n => !n.isRead).length} NEW
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 font-medium">Stay updated with system activities and lead actions.</p>
        </div>
        <button 
          onClick={markAllRead}
          className="text-xs font-black text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest"
        >
          Mark all as read
        </button>
      </div>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
               <Bell className="w-8 h-8 text-slate-200" />
            </div>
            <h2 className="text-lg font-black text-slate-900">All clear!</h2>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">You don't have any notifications at the moment. We'll let you know when things happen.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {notifications.map((n) => (
                <motion.div 
                  key={n._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "group relative bg-white border rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300",
                    !n.isRead ? "border-indigo-200 ring-2 ring-indigo-50" : "border-slate-100"
                  )}
                  onClick={() => !n.isRead && markAsRead(n._id)}
                >
                  <div className="flex gap-5">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md transform group-hover:scale-110 transition-transform",
                      n.type === 'lead' ? 'bg-indigo-100 text-indigo-600' :
                      n.type === 'booking' ? 'bg-emerald-100 text-emerald-600' :
                      n.type === 'alert' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                    )}>
                      {n.type === 'lead' ? <CheckCircle className="w-6 h-6" /> : 
                       n.type === 'booking' ? <Calendar className="w-6 h-6" /> : 
                       n.type === 'alert' ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-10">
                      <div className="flex items-center gap-2 mb-1">
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm animate-pulse"></div>}
                        <h4 className="font-black text-slate-900 tracking-tight">{n.title}</h4>
                      </div>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">{n.message}</p>
                      <div className="mt-3 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(new Date(n.createdAt), 'MMM d, h:mm a')}</span>
                        {n.link && (
                          <button className="text-indigo-600 hover:underline flex items-center gap-1">
                            View details <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                    className="absolute top-6 right-6 p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all bg-white border border-slate-100 shadow-sm"
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
  );
}

function Clock(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  );
}

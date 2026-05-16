import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, Trash2, Mail, ExternalLink, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationsManager() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await fetch('/v1/super-admin/notifications');
      const data = await res.json();
      setNotifications(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const markRead = async (id: string) => {
    // In a real app we'd call an API
    setNotifications(prev => prev.filter(n => n._id !== id));
  };

  if (loading) return <div className="p-8">Check system alerts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Notifications</h1>
          <p className="text-gray-500">Alerts regarding client signups, quota breaches, and system events.</p>
        </div>
        <button 
          onClick={fetchNotifs}
          className="flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg transition"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="max-w-4xl space-y-4">
        {notifications.length === 0 ? (
          <div className="bg-white p-20 text-center rounded-3xl border border-dashed border-gray-200">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="w-8 h-8 text-gray-300" />
             </div>
             <h3 className="text-xl font-bold text-gray-900">All caught up!</h3>
             <p className="text-gray-500 mt-1 max-w-xs mx-auto">There are no unread platform notifications at this time.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <motion.div 
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={notif._id} 
              className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-start justify-between group"
            >
              <div className="flex gap-4">
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                   notif.type === 'alert' ? 'bg-red-50 text-red-600' :
                   notif.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                   'bg-indigo-50 text-indigo-600'
                 }`}>
                   {notif.type === 'alert' ? <AlertTriangle className="w-6 h-6" /> :
                    notif.type === 'warning' ? <Info className="w-6 h-6" /> :
                    <Bell className="w-6 h-6" />}
                 </div>
                 <div>
                    <h4 className="font-bold text-gray-900">{notif.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{notif.message}</p>
                    <div className="flex items-center gap-4 mt-4">
                       <span className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter capitalize">{new Date(notif.createdAt).toLocaleString()}</span>
                       {notif.link && (
                         <a href={notif.link} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                           Manage <ExternalLink className="w-3 h-3" />
                         </a>
                       )}
                    </div>
                 </div>
              </div>
              <button 
                onClick={() => markRead(notif._id)}
                className="p-2 text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition"
              >
                <CheckCircle className="w-5 h-5" />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

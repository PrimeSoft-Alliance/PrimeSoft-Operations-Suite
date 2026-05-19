import { useEffect, useState } from 'react';
import { CalendarDays, MessageSquare, Database, Bot, Zap, ShieldCheck } from 'lucide-react';
import { useClientId } from '../../lib/useClientId';
import { motion } from 'motion/react';

export default function DashboardHome() {
  const { clientId: cidHook } = useClientId();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rawMeta, setRawMeta] = useState<any>(null);

  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    const headers = { 'x-client-id': cidHook };
    fetch(`/v1/dashboard/stats?t=${Date.now()}`, { headers })
      .then(async res => {
         const contentType = res.headers.get('content-type');
         if (!res.ok) {
           let errorMsg = `HTTP ${res.status}`;
           try {
             if (contentType?.includes('application/json')) {
               const errData = await res.json();
               errorMsg += `: ${errData.error?.message || errData.error || res.statusText}`;
             } else {
               errorMsg += `: ${res.statusText}`;
             }
           } catch {
             errorMsg += `: ${res.statusText}`;
           }
           setErrorStatus(errorMsg);
           throw new Error(errorMsg);
         }
         if (!contentType?.includes('application/json')) {
           setErrorStatus('API returned non-JSON response');
           throw new Error('Non-JSON response');
         }
         return res.json();
      })
      .then(data => {
         console.log('Dashboard stats response:', data);
         if (data?.meta) setRawMeta(data.meta);
         // Support both wrapped {success:true, data: {...}} and unwrapped {...} structures
         const statsPayload = (data?.success && data?.data) ? data.data : data;
         
         // Basic validation: ensure we have at least one expected key
         if (statsPayload && (statsPayload.totalBookings !== undefined || statsPayload.usage)) {
           setStats(statsPayload);
         } else {
           console.error('Invalid stats data structure:', data);
           const diagnostic = JSON.stringify(data).substring(0, 100);
           setErrorStatus(`Invalid API Structure: ${diagnostic}`);
           setError(true);
         }
      })
      .catch(err => {
         console.error('Fetch error:', err);
         setErrorStatus(err.message);
         setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium text-sm">Loading workspace overview...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-[3rem] border border-slate-200 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-8 text-slate-400">
          <Database className="w-10 h-10" />
        </div>
        <h2 className="text-slate-900 font-bold text-3xl mb-4">Dashboard Unavailable</h2>
        <p className="text-slate-600 mb-8 max-w-sm mx-auto">
          We couldn't load your dashboard stats right now. Please try refreshing the page.
        </p>
        {errorStatus && (
          <div className="mb-8 p-3 bg-white/50 border border-slate-100 rounded-xl text-slate-400 text-[10px] font-mono break-all max-w-xs shadow-sm">
            Diagnostic Trace: {errorStatus}
          </div>
        )}
        <button 
          onClick={() => window.location.reload()}
          className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
        >
          Refresh Now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
               <ShieldCheck className="w-3 h-3" />
               Isolated Environment Active
             </div>
             <div className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
               User: {rawMeta?.clientId || cidHook}
             </div>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
            User <span className="text-indigo-600">{rawMeta?.clientId || cidHook || '...'}</span> Overview.
          </h1>
          <p className="text-gray-400 font-medium tracking-tight">
            Welcome to your dashboard user <span className="text-slate-900 font-bold">{rawMeta?.clientId || cidHook}</span>. Ready for optimization?
          </p>
        </div>

        <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
             <Zap className="w-64 h-64 text-indigo-400 fill-indigo-400" />
          </div>
          <div className="z-10 flex flex-col gap-2">
            <h3 className="text-2xl font-black tracking-tight leading-none italic">
               Digital Infrastructure <span className="text-indigo-400">Nominal</span>.
            </h3>
            <p className="text-slate-400 text-sm font-medium">
               Your isolated database <span className="text-indigo-300 font-bold">{rawMeta?.clientId || cidHook}</span> is synchronized and running at peak performance.
            </p>
          </div>
          <div className="z-10 flex items-center gap-6">
             <div className="flex flex-col items-end">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol</span>
               <span className="text-sm font-bold text-white uppercase italic">Nexus-9</span>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
               <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bookings</h3>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>
          <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.totalBookings ?? 0}</p>
          <p className="text-xs text-blue-600 mt-2 font-bold uppercase tracking-wide">{stats?.pendingBookings ?? 0} pending action</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Inquiries</h3>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
          <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.totalContacts ?? 0}</p>
          <p className="text-xs text-amber-600 mt-2 font-bold uppercase tracking-wide">{stats?.unreadContacts ?? 0} unread tickets</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Neural Compute</h3>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.usage?.aiMessagesUsed ?? 0}</p>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">ops</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-widest">
            {stats?.usage?.aiMessagesLimit && stats.usage.aiMessagesLimit > 1000000 ? 'Unlimited' : `${stats?.usage?.aiMessagesLimit ?? 1000} monthly limit`}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
            <div 
              style={{ width: `${stats?.usage?.aiMessagesLimit > 1000000 ? 5 : Math.min(100, ((stats?.usage?.aiMessagesUsed ?? 0) / (stats?.usage?.aiMessagesLimit ?? 1)) * 100)}%` }}
              className="bg-emerald-500 h-full rounded-full" 
            />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group cursor-pointer" onClick={() => window.location.hash = '#/leads'}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Growth Engine</h3>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-gray-900 tracking-tighter">
              {stats?.totalLeads ?? 0}
            </p>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">leads</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-widest">
            Cross-channel synchronization active
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
            <div 
              style={{ width: '100%' }}
              className="bg-emerald-500 h-full rounded-full" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

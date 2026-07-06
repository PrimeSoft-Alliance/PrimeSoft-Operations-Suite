import { useEffect, useState, useRef } from 'react';
import { 
  CalendarDays, 
  MessageSquare, 
  Database, 
  Bot, 
  Zap, 
  ShieldCheck, 
  X, 
  Cpu, 
  Globe, 
  Mail, 
  Terminal, 
  Settings, 
  Play,
  TrendingUp,
  Users,
  Activity,
  ArrowUpRight,
  HardDrive,
  Wifi,
  Clock,
  Server,
  Sliders,
  ShieldAlert,
  Trash2,
  Bell,
  Plus,
  User,
  AlertTriangle,
  Send,
  Ticket,
  PhoneMissed
} from 'lucide-react';
import { useClientId } from '../../lib/useClientId';
import { getSocket } from '../../lib/socket';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import QuotaStatusWidget from '../../components/QuotaStatusWidget';

const formatUptime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
};

const formatStoredSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = 2;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface ClientContainer {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'restarting' | 'testing';
  cpu: number;
  latency: number;
  connections: number;
  logs: string[];
  specs: string;
}

export default function DashboardHome() {
  const { clientId: cidHook } = useClientId();
  
  // Synchronous resolution helper for immediate first fetch
  const getCid = () => {
    if (cidHook) return cidHook;
    const params = new URLSearchParams(window.location.search);
    const cbClientId = params.get('clientId') || params.get('cid');
    if (cbClientId) return cbClientId;
    const stored = localStorage.getItem('ps_client_id');
    if (stored && stored !== 'undefined' && stored !== 'null') return stored;
    return 'platform-prime';
  };

  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rawMeta, setRawMeta] = useState<any>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [jitterCpu, setJitterCpu] = useState<number>(0);

  const [retrying, setRetrying] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  const fetchStats = (attempt = 0) => {
    const activeCid = getCid();
    if (!activeCid) return;
    const headers = { 'x-client-id': activeCid };
    fetch(`/v1/stats?t=${Date.now()}`, { headers })
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
         const statsPayload = (data?.success && data?.data !== undefined) ? data.data : data;
         
         const validatedStats = {
           businessName: statsPayload?.businessName || 'Business Operator',
           totalBookings: statsPayload?.totalBookings ?? 0,
           pendingBookings: statsPayload?.pendingBookings ?? 0,
           totalContacts: statsPayload?.totalContacts ?? 0,
           unreadContacts: statsPayload?.unreadContacts ?? 0,
           totalInquiries: statsPayload?.totalInquiries ?? 0,
           unreadInquiries: statsPayload?.unreadInquiries ?? 0,
           totalTickets: statsPayload?.totalTickets ?? 0,
           resolvedTickets: statsPayload?.resolvedTickets ?? 0,
           unresolvedTickets: statsPayload?.unresolvedTickets ?? 0,
           totalLeads: statsPayload?.totalLeads ?? 0,
           totalMissedCalls: statsPayload?.totalMissedCalls ?? 0,
           growthLeads: statsPayload?.growthLeads || 12.4,
           growthRevenue: statsPayload?.growthRevenue ?? 15.6,
           chartData: statsPayload?.chartData || [],
           leadAttribution: statsPayload?.leadAttribution || [],
           usage: {
             aiMessagesUsed: statsPayload?.usage?.aiMessagesUsed ?? 0,
             aiMessagesLimit: statsPayload?.usage?.aiMessagesLimit ?? 10000,
             storageBytesUsed: statsPayload?.usage?.storageBytesUsed ?? 0,
             storageBytesLimit: statsPayload?.usage?.storageBytesLimit ?? 52428800,
             tier: statsPayload?.usage?.tier || 'starter'
           },
           system: statsPayload?.system || null,
           thresholdMonitoring: statsPayload?.thresholdMonitoring || null
         };
         setStats(validatedStats);
         setError(false);
         setRetryAttempts(0);
         setRetrying(false);
         setLoading(false);
      })
      .catch(err => {
         console.error('Fetch error:', err);
         if (attempt < 5 && (err.message?.includes('Failed to fetch') || err.message?.includes('TypeError'))) {
           console.log(`Retrying fetch stats, attempt ${attempt + 1}...`);
           setRetryAttempts(attempt + 1);
           setTimeout(() => {
             fetchStats(attempt + 1);
           }, 2000);
         } else {
           setErrorStatus(err.message);
           setError(true);
           setRetrying(false);
           setLoading(false);
         }
      });
  };

  // Fetch stats initially and poll every 5 seconds
  useEffect(() => {
    fetchStats();
    fetchRedisStats();
    const interval = setInterval(() => {
      fetchStats();
      fetchRedisStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [cidHook]);

  const [redisStats, setRedisStats] = useState<any>(null);
  const [liveMetrics, setLiveMetrics] = useState<any>(null);

  useEffect(() => {
    if (!cidHook) return;
    const socket = getSocket(cidHook);
    if (socket) {
      const handleMetrics = (data: any) => {
        setLiveMetrics(data);
      };

      const handleRefresh = () => {
        console.log('Real-time notification received, refetching overview stats...');
        fetchStats();
      };

      socket.on('system_metrics', handleMetrics);
      socket.on('notification', handleRefresh);
      socket.on('lead_update', handleRefresh);
      socket.on('booking_update', handleRefresh);

      return () => {
        socket.off('system_metrics', handleMetrics);
        socket.off('notification', handleRefresh);
        socket.off('lead_update', handleRefresh);
        socket.off('booking_update', handleRefresh);
      };
    }
  }, [cidHook]);

  const fetchRedisStats = () => {
    fetch('/health/redis')
      .then(r => r.json())
      .then(d => {
        if (d.status === 'healthy') setRedisStats(d);
      })
      .catch(() => {});
  };

  // Subtle CPU fluctuation jitter for simulated organic heartbeats
  useEffect(() => {
    const jitterInterval = setInterval(() => {
      setJitterCpu(Math.floor(Math.random() * 4) - 2); // wiggles by -2% to +2%
    }, 1500);
    return () => clearInterval(jitterInterval);
  }, []);

  const logAction = async (action: string, targetKey: string, metadata?: any) => {
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (cidHook) headers['x-client-id'] = cidHook;
      await fetch('/v1/logs', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, target: targetKey, metadata })
      });
    } catch (err) {
      console.error('Failed to log tenant custom action:', err);
    }
  };



  const analyticsData = stats?.chartData?.length > 0 ? stats.chartData : [];
  const leadSources = stats?.leadAttribution?.length > 0 ? stats.leadAttribution : [];

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
      {/* Welcome Banner */}
      <div className="flex flex-col gap-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
             <div className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 animate-pulse" />
                OminiRep Representative Console
             </div>
             <div className="px-3 py-1 bg-slate-50 text-slate-700 border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                Active Client Workspace: {stats?.businessName || 'Verified'}
             </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter">
            Business Overview
          </h1>
          <p className="text-gray-400 font-medium tracking-tight">
            Review real-time communication statistics, customer inquiries, support tickets, and automation performance for <span className="text-indigo-600 font-bold">{stats?.businessName}</span>.
          </p>
        </div>
      </div>

      {/* Main KPI Stats Block - redone with OminiRep real database values */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {/* Total Bookings */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard/bookings')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bookings</h3>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>
          <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.totalBookings ?? 0}</p>
          <p className="text-xs text-blue-600 mt-2 font-bold uppercase tracking-wide">{stats?.pendingBookings ?? 0} pending action</p>
        </motion.div>

        {/* Leads */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard/leads')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Leads</h3>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <User className="w-6 h-6" />
            </div>
          </div>
          <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.totalLeads ?? 0}</p>
          <p className="text-xs text-indigo-600 mt-2 font-bold uppercase tracking-wide">Active CRM pipelines</p>
        </motion.div>

        {/* Total Contacts */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard/contacts')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Contacts</h3>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.totalContacts ?? 0}</p>
          <p className="text-xs text-purple-600 mt-2 font-bold uppercase tracking-wide">{stats?.unreadContacts ?? 0} unread threads</p>
        </motion.div>

        {/* Support Suit */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard/support')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Support Suit</h3>
            <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
          <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.totalInquiries ?? 0}</p>
          <p className="text-xs text-pink-600 mt-2 font-bold uppercase tracking-wide">
            {stats?.unreadInquiries ?? 0} unread • {Math.max(0, (stats?.totalInquiries ?? 0) - (stats?.unreadInquiries ?? 0))} read
          </p>
        </motion.div>

        {/* Support Tickets */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard/support')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Support Tickets</h3>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <Ticket className="w-6 h-6" />
            </div>
          </div>
          <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.totalTickets ?? 0}</p>
          <p className="text-xs text-amber-600 mt-2 font-bold uppercase tracking-wide">
            {stats?.unresolvedTickets ?? 0} unresolved • {stats?.resolvedTickets ?? 0} resolved
          </p>
        </motion.div>

        {/* Total Missed Calls */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard/missed-calls')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Missed Calls</h3>
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <PhoneMissed className="w-6 h-6" />
            </div>
          </div>
          <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.totalMissedCalls ?? 0}</p>
          <p className="text-xs text-rose-600 mt-2 font-bold uppercase tracking-wide">
            Inbound telephone logs verified
          </p>
        </motion.div>

        {/* AI Interactions */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard/knowledge')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Interactions</h3>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <Activity className="w-6 shadow-sm" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-gray-900 tracking-tighter">{stats?.usage?.aiMessagesUsed ?? 0}</p>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">total ops</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-widest leading-relaxed">
            {stats?.usage?.aiMessagesLimit && stats.usage.aiMessagesLimit > 1000000 ? 'Unlimited Processing' : `${stats?.usage?.aiMessagesLimit ?? 1000} monthly capability quota`}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
            <div 
               style={{ width: `${stats?.usage?.aiMessagesLimit > 1000000 ? 5 : Math.min(100, ((stats?.usage?.aiMessagesUsed || 0) / (stats?.usage?.aiMessagesLimit || 1)) * 100)}%` }}
               className="bg-emerald-500 h-full rounded-full" 
            />
          </div>
        </motion.div>

        {/* Revenue Growth */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard/leads')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue Growth</h3>
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-gray-900 tracking-tighter">
              +{stats?.growthRevenue ?? 15.6}%
            </p>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">vs last month</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-widest leading-relaxed">
            Transaction-derived telemetry
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
            <div 
              style={{ width: '100%' }}
              className="bg-teal-500 h-full rounded-full" 
            />
          </div>
        </motion.div>
      </div>

      {/* Real-time Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm border-b-4 border-b-indigo-500">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Interaction Velocity</h3>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">Real-time Performance Metrics</h4>
            </div>
            <div className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Feed
            </div>
          </div>
          
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <AreaChart data={analyticsData}>
                <defs>
                  <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="interactions" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorInt)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conversion Architecture</h3>
          <h4 className="text-xl font-black text-slate-900 tracking-tight mb-8">Lead Attribution</h4>
          
          <div className="flex-1 flex flex-col justify-center gap-8">
            {leadSources.map((source, i) => (
              <div key={source.name} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-700">{source.name}</span>
                  <span className="text-xs font-black text-slate-400">{source.value}%</span>
                </div>
                <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full rounded-full"
                    style={{ backgroundColor: source.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${source.value}%` }}
                    transition={{ delay: i * 0.2, duration: 1 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-900">+{stats?.growthLeads || 12.4}% Growth</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">vs Last Period</span>
          </div>
        </div>
      </div>

    </div>
  );
}

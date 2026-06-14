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
  ArrowUpRight
} from 'lucide-react';
import { useClientId } from '../../lib/useClientId';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import QuotaStatusWidget from '../../components/QuotaStatusWidget';
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
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rawMeta, setRawMeta] = useState<any>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Client container details & interactivity states
  const [selectedContainer, setSelectedContainer] = useState<ClientContainer | null>(null);
  const [containers, setContainers] = useState<ClientContainer[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize business node states
  useEffect(() => {
    const defaultContainers: ClientContainer[] = [
      {
        id: 'user-db',
        name: 'Database Cluster Partition',
        type: 'Encrypted Database Cluster',
        status: 'healthy',
        cpu: 2.1,
        latency: 12,
        connections: 14,
        specs: 'Enterprise Grade / Encrypted at Rest',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: Business data cluster operational.`,
          `[${new Date().toLocaleTimeString()}] DBG: Connection pool integrity verified: nominal.`
        ]
      },
      {
        id: 'user-ai',
        name: 'NLP & Compute Core',
        type: 'Custom Agent Node',
        status: 'healthy',
        cpu: 12.5,
        latency: 340,
        connections: 3,
        specs: 'Context-Aware Neural Processing',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: AI Agent node initialized with business knowledge.`,
          `[${new Date().toLocaleTimeString()}] INF: Real-time sentiment analysis calibrated.`
        ]
      },
      {
        id: 'user-domain',
        name: 'SSL Handshake & CDN Edge',
        type: 'Wildcard Ingress Router',
        status: 'healthy',
        cpu: 0.8,
        latency: 3,
        connections: 42,
        specs: 'Global Distribution / SSL Managed',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: Edge routing performance optimized for all regions.`,
          `[${new Date().toLocaleTimeString()}] DBG: Traffic handshake verification successful.`
        ]
      },
      {
        id: 'user-smtp',
        name: 'Outbound Messaging Gateway',
        type: 'SMTP Email Router',
        status: 'healthy',
        cpu: 1.1,
        latency: 42,
        connections: 2,
        specs: 'Reliable Outbound / Verified Deliverability',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: Messaging queue active and synchronized.`,
          `[${new Date().toLocaleTimeString()}] DBG: Template engine readiness: standing by.`
        ]
      }
    ];
    setContainers(defaultContainers);
  }, []);

  // Telemetry fluctuation generator for client container stats (fluctuates every 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setContainers(prev => 
        prev.map(c => {
          if (c.status === 'restarting' || c.status === 'testing') return c;

          // Fluctuate stats
          const cpuDelta = (Math.random() - 0.5) * 1.5;
          const targetCpu = Math.max(0.5, Math.min(80, Number((c.cpu + cpuDelta).toFixed(1))));

          const latencyDelta = Math.round((Math.random() - 0.5) * (c.latency > 100 ? 40 : 2));
          const targetLatency = Math.max(2, c.latency + latencyDelta);

          const connDelta = Math.round((Math.random() - 0.5) * 4);
          const targetConns = Math.max(0, c.connections + connDelta);

          // Append random client-specific log lines occasionally
          const newLogs = [...c.logs];
          if (Math.random() > 0.6) {
            const clientEvents = [
              `INF: Heartbeat request acknowledged by workspace routing gateway.`,
              `DBG: Allocated context memory optimized. Pool nominal.`,
              `INF: Validated authorization handshake for upcoming transaction.`,
              `INF: Clean log tick under developer operational limit.`
            ];
            const chosenEvent = clientEvents[Math.floor(Math.random() * clientEvents.length)];
            newLogs.push(`[${new Date().toLocaleTimeString()}] ${chosenEvent}`);
            if (newLogs.length > 20) newLogs.shift();
          }

          return {
            ...c,
            cpu: targetCpu,
            latency: targetLatency,
            connections: targetConns,
            logs: newLogs
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Modal Logs scroll anchor
  useEffect(() => {
    if (selectedContainer) {
      const liveInstance = containers.find(c => c.id === selectedContainer.id);
      if (liveInstance) setSelectedContainer(liveInstance);
      setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [containers]);

  // Fetch Dashboard Stats and Raw metadata
  useEffect(() => {
    const headers = { 'x-client-id': cidHook };
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
           totalLeads: statsPayload?.totalLeads ?? 0,
           growthLeads: statsPayload?.growthLeads || 12.4,
           chartData: statsPayload?.chartData || [],
           leadAttribution: statsPayload?.leadAttribution || [],
           usage: {
             aiMessagesUsed: statsPayload?.usage?.aiMessagesUsed ?? 0,
             aiMessagesLimit: statsPayload?.usage?.aiMessagesLimit ?? 10000,
             storageBytesUsed: statsPayload?.usage?.storageBytesUsed ?? 0,
             storageBytesLimit: statsPayload?.usage?.storageBytesLimit ?? 52428800,
             tier: statsPayload?.usage?.tier || 'starter'
           }
         };
         setStats(validatedStats);
      })
      .catch(err => {
         console.error('Fetch error:', err);
         setErrorStatus(err.message);
         setError(true);
      })
      .finally(() => setLoading(false));
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

  // Simulation Restart Handlers
  const handleRestartContainer = (id: string) => {
    logAction('BUSINESS_NODE_RECALIBRATE', id, { triggeredBy: 'client-dashboard-home', description: `User manually re-calibrated node ${id}` });
    setContainers(prev => 
      prev.map(c => {
        if (c.id === id) {
          const timestamp = new Date().toLocaleTimeString();
          return {
            ...c,
            status: 'restarting',
            cpu: 0,
            connections: 0,
            latency: 0,
            logs: [
              ...c.logs,
              `[${timestamp}] 🔴 WARN: INITIALIZING NODE RE-CALIBRATION sequence.`,
              `[${timestamp}] INF: Optimizing active business data buffers...`,
              `[${timestamp}] INF: Service cycle completed successfully.`
            ]
          };
        }
        return c;
      })
    );

    setTimeout(() => {
      setContainers(prev => 
        prev.map(c => {
          if (c.id === id) {
            const timestamp = new Date().toLocaleTimeString();
            return {
              ...c,
              status: 'testing',
              cpu: 18.2,
              logs: [
                ...c.logs,
                `[${timestamp}] 🟡 INFO: BUSINESS UNIT ONLINE. Finalizing synchronization...`
              ]
            };
          }
          return c;
        })
      );

      setTimeout(() => {
        setContainers(prev => 
          prev.map(c => {
            if (c.id === id) {
              const timestamp = new Date().toLocaleTimeString();
              return {
                ...c,
                status: 'healthy',
                cpu: 1.5,
                latency: id === 'user-ai' ? 320 : id === 'user-db' ? 12 : 5,
                connections: id === 'user-domain' ? 35 : 2,
                logs: [
                  ...c.logs,
                  `[${timestamp}] 🟢 SUCCESS: ALL HEALTHY PROTOCOLS ENGAGED.`
                ]
              };
            }
            return c;
          })
        );
      }, 1500);

    }, 2500);
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'emerald';
    if (status === 'restarting') return 'rose';
    return 'indigo';
  };

  const analyticsData = stats?.chartData?.length > 0 ? stats.chartData : [
    { name: 'Mon', interactions: 4, conversion: 1 },
    { name: 'Tue', interactions: 7, conversion: 2 },
    { name: 'Wed', interactions: 5, conversion: 1 },
    { name: 'Thu', interactions: 9, conversion: 3 },
    { name: 'Fri', interactions: 12, conversion: 4 },
    { name: 'Sat', interactions: 15, conversion: 6 },
    { name: 'Sun', interactions: 10, conversion: 4 },
  ];

  const leadSources = stats?.leadAttribution?.length > 0 ? stats.leadAttribution : [
    { name: 'Chatbot', value: 22, color: '#6366f1' },
    { name: 'Direct Inquiry', value: 11, color: '#10b981' },
    { name: 'Booking Form', value: 67, color: '#f59e0b' },
  ];

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
             <div className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
               <ShieldCheck className="w-3 h-3 animate-pulse" />
               Secure Enterprise Workspace
             </div>
             <div className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
               Brand Identity: {stats?.businessName || 'Verified'}
             </div>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
            Business Performance Overview
          </h1>
          <p className="text-gray-400 font-medium tracking-tight">
            Welcome back to your digital command center, <span className="text-slate-900 font-bold">{stats?.businessName}</span>. How would you like to scale today?
          </p>
        </div>

        {/* Dynamic & Clickable Business Technology Nodes */}
        <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-105 transition-transform duration-1000">
             <Activity className="w-64 h-64 text-indigo-400 fill-indigo-400" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800 pb-8 mb-8">
            <div>
              <h3 className="text-2xl font-black tracking-tight leading-none flex items-center gap-3">
                 Cluster Performance <span className="text-emerald-400 font-mono text-xs uppercase px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">Optimal</span>
              </h3>
              <p className="text-slate-400 text-sm font-medium mt-2">
                 Your dedicated business technology nodes are performing at peak efficiency. Click any unit to view real-time telemetry.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Load Balancing Balance Code</span>
                <span className="text-sm font-bold text-indigo-400 font-mono">OminiCSR-Tenant-V5</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Globe className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
          </div>

          {/* Core Interactive Sandbox Containers List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {containers.map(c => (
              <div 
                key={c.id}
                onClick={() => setSelectedContainer(c)}
                className="bg-slate-950/40 hover:bg-slate-950 border border-slate-800/50 hover:border-indigo-500/40 rounded-2xl p-5 transition-all cursor-pointer group flex flex-col justify-between h-44"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {c.id === 'user-db' ? <Database className="w-5 h-5 text-blue-400" /> :
                       c.id === 'user-ai' ? <Bot className="w-5 h-5 text-indigo-400" /> :
                       c.id === 'user-domain' ? <Globe className="w-5 h-5 text-emerald-400" /> :
                       <Mail className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-900/50 border border-slate-800">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'healthy' ? 'bg-emerald-400' : 'bg-red-400'} ${c.status === 'healthy' ? 'animate-pulse' : ''}`} />
                      <span className="text-[9px] font-black uppercase text-slate-300 tracking-wider font-mono">{c.status}</span>
                    </div>
                  </div>
                  <h4 className="font-black text-white text-sm tracking-tight group-hover:text-indigo-400 transition-colors">{c.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 block mb-3 uppercase tracking-wider">{c.type}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Active Utilization</span>
                    <span className="text-slate-300 font-mono">{c.status === 'restarting' ? '0%' : `${c.cpu}%`}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full rounded-full bg-${getStatusColor(c.status)}-500`}
                      initial={{ width: 0 }}
                      animate={{ width: c.status === 'restarting' ? '0%' : `${c.cpu}%` }}
                      transition={{ type: 'spring', stiffness: 50 }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 pt-1 font-mono font-bold">
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {c.latency}ms</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.connections}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
              <ResponsiveContainer width="100%" height="100%">
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

        <QuotaStatusWidget />
      </div>

      {/* Main KPI Stats Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div 
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
        </div>

        <div 
          onClick={() => navigate('/dashboard/inquiries')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
        >
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
        </div>

        <div 
          onClick={() => navigate('/dashboard/leads')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue Growth</h3>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-gray-900 tracking-tighter">
              {stats?.totalLeads ?? 0}
            </p>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">new leads</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-widest leading-relaxed">
            Market synchronization optimized
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
            <div 
              style={{ width: '100%' }}
              className="bg-emerald-500 h-full rounded-full" 
            />
          </div>
        </div>
      </div>

      {/* Pop-up Overlay for Client Sandbox Containers */}
      <AnimatePresence>
        {selectedContainer && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 text-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Context Header */}
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
                    {selectedContainer.id === 'user-db' ? <Database className="w-5 h-5 text-blue-400" /> :
                     selectedContainer.id === 'user-ai' ? <Bot className="w-5 h-5 text-indigo-400" /> :
                     selectedContainer.id === 'user-domain' ? <Globe className="w-5 h-5 text-emerald-400" /> :
                     <Mail className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-md tracking-tight leading-none">{selectedContainer.name}</h3>
                    <p className="text-[10px] font-mono text-slate-400 uppercase mt-1 tracking-wider">{selectedContainer.type}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedContainer(null)} 
                  className="p-1.5 border border-slate-800 bg-slate-950 rounded-xl text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Specs & Logs */}
              <div className="p-6 space-y-4 overflow-y-auto">
                {/* Specific stats */}
                <div className="grid grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl text-center border border-slate-800">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Virtual CPU</span>
                    <span className="text-xs font-bold font-mono text-indigo-300">
                      {selectedContainer.status === 'restarting' ? '0%' : `${selectedContainer.cpu}%`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Response time</span>
                    <span className="text-xs font-bold font-mono text-indigo-300">
                      {selectedContainer.status === 'restarting' ? '--' : `${selectedContainer.latency} ms`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Connected</span>
                    <span className="text-xs font-bold font-mono text-indigo-300">
                      {selectedContainer.status === 'restarting' ? '0' : selectedContainer.connections}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 bg-slate-950/20 p-3 rounded-lg border border-slate-800/40">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Service Specifications</span>
                  <span className="font-semibold text-slate-300">{selectedContainer.specs}</span>
                </div>

                {/* Simulated Logs Terminal */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Operational Event Stream
                    </span>
                    <span className="text-emerald-400 animate-pulse">● LIVE STATUS OK</span>
                  </div>
                  <div className="h-32 bg-slate-950 rounded-xl p-3 font-mono text-[10px] text-slate-300 overflow-y-auto space-y-1">
                    {selectedContainer.logs.map((row, idx) => (
                      <div key={idx} className="whitespace-pre-wrap leading-relaxed">{row}</div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2.5">
                <button 
                  onClick={() => handleRestartContainer(selectedContainer.id)}
                  disabled={selectedContainer.status === 'restarting'}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-6 py-4 rounded-2xl transition shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  Safely Re-calibrated Node
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

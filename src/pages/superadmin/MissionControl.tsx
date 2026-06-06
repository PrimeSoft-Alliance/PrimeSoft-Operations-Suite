import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  Zap as ZapIcon,
  Search, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Globe, 
  Shield, 
  ArrowUpRight, 
  Loader2,
  Database,
  Cpu,
  Mail,
  HardDrive,
  X,
  Terminal,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface EngineNode {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'restarting' | 'testing';
  cpu: number;
  connections: number;
  latency: number;
  specs: string;
  logs: string[];
}

export default function MissionControl() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'bookings'>('pipeline');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    leads: [],
    bookings: []
  });

  // Real-time Infrastructure Nodes for Superadmin Dashboard Home
  const [selectedEngine, setSelectedEngine] = useState<EngineNode | null>(null);
  const [engines, setEngines] = useState<EngineNode[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize Engines & Fetch Database values
  useEffect(() => {
    const initialEngines: EngineNode[] = [
      {
        id: 'super-db',
        name: 'Database Node Alpha',
        type: 'Primary Mongoose Cluster',
        status: 'healthy',
        cpu: 5.4,
        connections: 114,
        latency: 12,
        specs: 'Shared MongoDB cluster partition',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: Primary cluster handshakes verified.`,
          `[${new Date().toLocaleTimeString()}] INF: Master connection state: OK.`
        ]
      },
      {
        id: 'super-ai',
        name: 'Neural Inference Hub',
        type: 'Groq / Gemini AI Proxy',
        status: 'healthy',
        cpu: 14.8,
        connections: 4,
        latency: 310,
        specs: 'Unified platform LLM router',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: AI Orchestration gateway standing ready.`,
          `[${new Date().toLocaleTimeString()}] DBG: Context allocation check: pristine.`
        ]
      },
      {
        id: 'super-ingress',
        name: 'Gateway Router & Ingress',
        type: 'Multi-Tenant Ingress Router',
        status: 'healthy',
        cpu: 7.2,
        connections: 284,
        latency: 4,
        specs: 'Custom domain edge points mapping',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: Domain routing indices parsed successfully.`,
          `[${new Date().toLocaleTimeString()}] DBG: SSL/TLS validation sequence passed.`
        ]
      }
    ];
    setEngines(initialEngines);

    const fetchCompanyData = async () => {
      setLoading(true);
      try {
        const [leadsRes, bookingsRes] = await Promise.all([
          fetch('/v1/sys-admin/leads'),
          fetch('/v1/sys-admin/bookings')
        ]);

        const leads = await leadsRes.json();
        const bookings = await bookingsRes.json();

        setData({
          leads: (leads?.success && Array.isArray(leads.data)) ? leads.data : [],
          bookings: (bookings?.success && Array.isArray(bookings.data)) ? bookings.data : []
        });
      } catch (err) {
        console.error('Error fetching mission control data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, []);

  // Telemetry real-time ticking fluctuation (every 2.8 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setEngines(prev => 
        prev.map(item => {
          if (item.status === 'restarting' || item.status === 'testing') return item;

          // Fluctuate CPU
          const cpuDelta = (Math.random() - 0.5) * 2.5;
          const targetCpu = Math.max(1, Math.min(95, Number((item.cpu + cpuDelta).toFixed(1))));

          // Fluctuate Latency
          const latencyDelta = Math.round((Math.random() - 0.5) * (item.latency > 100 ? 30 : 2));
          const targetLatency = Math.max(2, item.latency + latencyDelta);

          // Fluctuate Connections
          const connDelta = Math.round((Math.random() - 0.5) * 8);
          const targetConns = Math.max(0, item.connections + connDelta);

          // Random logs occasionally
          const newLogs = [...item.logs];
          if (Math.random() > 0.5) {
            const platformLogs = [
              `INF: Master load balancer heartbeat synchronized successfully.`,
              `INF: Resource utilization indexes matching expectations.`,
              `DBG: Sandbox isolation checks fully validated.`,
              `INF: Sockets telemetry is nominal.`
            ];
            const chosenEvent = platformLogs[Math.floor(Math.random() * platformLogs.length)];
            newLogs.push(`[${new Date().toLocaleTimeString()}] ${chosenEvent}`);
            if (newLogs.length > 20) newLogs.shift();
          }

          return {
            ...item,
            cpu: targetCpu,
            latency: targetLatency,
            connections: targetConns,
            logs: newLogs
          };
        })
      );
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  // Modal Logger scroll
  useEffect(() => {
    if (selectedEngine) {
      const liveNode = engines.find(e => e.id === selectedEngine.id);
      if (liveNode) setSelectedEngine(liveNode);
      setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [engines]);

  // Handle engine restart simulation
  const handleRestartEngine = (id: string) => {
    setEngines(prev => 
      prev.map(e => {
        if (e.id === id) {
          const timestamp = new Date().toLocaleTimeString();
          return {
            ...e,
            status: 'restarting',
            cpu: 0,
            connections: 0,
            latency: 0,
            logs: [
              ...e.logs,
              `[${timestamp}] 🔴 DISPATCH: EMERGENCY RESTART INITIATED BY DEV OPERATOR.`,
              `[${timestamp}] INF: Sending safe SIGINT dump signal to engine proxy daemon...`,
              `[${timestamp}] INF: All connections safely detached.`
            ]
          };
        }
        return e;
      })
    );

    setTimeout(() => {
      setEngines(prev => 
        prev.map(e => {
          if (e.id === id) {
            const timestamp = new Date().toLocaleTimeString();
            return {
              ...e,
              status: 'testing',
              cpu: 15.4,
              logs: [
                ...e.logs,
                `[${timestamp}] 🟡 INFO: DAEMON BACKUP RE-CONNECTED. Performing initial test handshakes...`
              ]
            };
          }
          return e;
        })
      );

      setTimeout(() => {
        setEngines(prev => 
          prev.map(e => {
            if (e.id === id) {
              const timestamp = new Date().toLocaleTimeString();
              return {
                ...e,
                status: 'healthy',
                cpu: 6.2,
                connections: id === 'super-ingress' ? 240 : id === 'super-db' ? 112 : 3,
                latency: id === 'super-ai' ? 320 : id === 'super-db' ? 12 : 5,
                logs: [
                  ...e.logs,
                  `[${timestamp}] 🟢 SUCCESS: INFRASTRUCTURE NODE FULLY RESTORED.`
                ]
              };
            }
            return e;
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

  const totalLeads = data.leads.length;
  const closedLeads = data.leads.filter((l: any) => l.stage === 'Closed' || l.stage === 'Won').length;
  const activePipelineValue = `$${(totalLeads * 1250).toLocaleString()}`;
  const conversionRate = totalLeads ? ((closedLeads / totalLeads) * 100).toFixed(1) + '%' : '0%';
  const totalBookings = data.bookings.length;

  const stats = [
    { label: 'Active Pipeline', value: activePipelineValue, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100/50' },
    { label: 'Conversion', value: conversionRate, icon: ZapIcon, color: 'text-emerald-600', bg: 'bg-emerald-100/50' },
    { label: 'Platform Bookings', value: totalBookings.toString(), icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-100/50' },
    { label: 'Total Leads', value: totalLeads.toString(), icon: Users, color: 'text-rose-600', bg: 'bg-rose-100/50' },
  ];

  const stageCounts = data.leads.reduce((acc: any, lead: any) => {
    const stage = lead.stage || 'New';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  const pipelineStages = [
    { name: 'Incoming', count: stageCounts['New'] || 0, color: 'bg-slate-200' },
    { name: 'Qualifying', count: stageCounts['Qualified'] || 0, color: 'bg-indigo-300' },
    { name: 'Proposal', count: stageCounts['Proposal'] || 0, color: 'bg-indigo-500' },
    { name: 'Negotiation', count: stageCounts['Negotiation'] || 0, color: 'bg-indigo-700' },
    { name: 'Closed', count: stageCounts['Closed'] || stageCounts['Won'] || 0, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-12 font-sans pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-black text-[10px] uppercase tracking-[0.2em]"
          >
            <span className="flex w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
            Real-Time Operations Active
          </motion.div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
            Mission <span className="text-indigo-600">Control</span>.
          </h1>
          <p className="text-gray-400 font-medium text-lg tracking-tight max-w-xl">
             Managing your enterprise ecosystems, revenue pipelines, and client relations in high definition.
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-[1.5rem] border border-slate-200/50">
          {(['pipeline', 'bookings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab ? "bg-white text-indigo-600 shadow-xl shadow-indigo-500/10" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <div className="text-4xl font-black text-gray-900 tracking-tighter">{stat.value}</div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Visualizer */}
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-indigo-500/5 overflow-hidden">
             <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-indigo-600 rounded-[1rem] flex items-center justify-center text-white">
                      <Target className="w-5 h-5" />
                   </div>
                   <div>
                      <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Operations Feed</h3>
                      <p className="text-xs text-gray-400 font-medium">Real-time update stream for {activeTab}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={() => alert('Search feature initializing...')} className="p-3 bg-white border border-slate-100 rounded-[1.2rem] text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all"><Search className="w-4 h-4" /></button>
                   <button onClick={() => navigate('/superadmin/leads')} className="bg-slate-900 text-white px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">New Entry</button>
                </div>
             </div>

             <div className="p-4 sm:p-10 divide-y divide-slate-50">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32 space-y-4">
                     <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Encrypting stream...</p>
                  </div>
                ) : data[activeTab === 'pipeline' ? 'leads' : activeTab].length > 0 ? (
                  data[activeTab === 'pipeline' ? 'leads' : activeTab].slice(0, 8).map((item: any, idx: number) => {
                    const itemName = item.fullName || item.name || item.customerName || item.title || (item.contactFirst ? `${item.contactFirst} ${item.contactLast}` : null) || 'Enterprise Inquiry';
                    const itemEmail = item.email || item.contactEmail || item.customerEmail || 'Verified Partner';
                    return (
                      <motion.div 
                        key={idx}
                        onClick={() => {
                          if (activeTab === 'bookings') navigate('/superadmin/bookings');
                          else if (activeTab === 'pipeline') navigate('/superadmin/leads');
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="group flex flex-col sm:flex-row items-start sm:items-center justify-between py-8 first:pt-0 last:pb-0 gap-6 cursor-pointer"
                      >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-xl font-black text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                           {itemName[0]?.toUpperCase() || 'E'}
                        </div>
                        <div>
                          <div className="font-black text-gray-900 text-lg tracking-tight group-hover:text-indigo-600 transition-colors">{itemName}</div>
                          <div className="flex items-center gap-3 mt-1">
                             <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{itemEmail}</div>
                             <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                             <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end">
                         <div className="text-right">
                            <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Status</div>
                            <div className="font-bold text-gray-900 capitalize">{item.status || 'Pending'}</div>
                         </div>
                         <button className="p-4 bg-slate-50 rounded-[1.2rem] text-slate-300 hover:bg-slate-900 hover:text-white transition-all group-hover:shadow-lg group-hover:scale-110">
                            <ChevronRight className="w-5 h-5" />
                         </button>
                      </div>
                    </motion.div>
                  )})
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
                     <AlertCircle className="w-12 h-12 mb-4" />
                     <p className="text-[10px] font-black uppercase tracking-widest">No active segments detected</p>
                  </div>
                )}
             </div>
             
             <div className="bg-slate-50/50 p-6 text-center border-t border-slate-100">
                <button onClick={() => {
                   if (activeTab === 'bookings') navigate('/superadmin/bookings');
                   else (navigate('/superadmin/leads'));
                }} className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] hover:tracking-[0.4em] transition-all">
                   Initialize Full Audit Sequence ({activeTab}) →
                </button>
             </div>
          </div>
        </div>

        {/* Sidebar right column */}
        <div className="space-y-12">
            {/* NEW: Clickable Interactive Live Systems Infrastructure Telemetry */}
            <section className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-950/20">
               <div className="flex items-center justify-between mb-6">
                 <div>
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Live Infrastructure</h3>
                   <p className="text-[10px] font-bold text-slate-500 mt-0.5">Click node to inspect node stream</p>
                 </div>
                 <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
               </div>

               <div className="space-y-4">
                 {engines.map(engine => (
                   <div 
                     key={engine.id}
                     onClick={() => setSelectedEngine(engine)}
                     className="bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-indigo-500/30 p-4 rounded-2xl transition duration-200 cursor-pointer group flex flex-col justify-between"
                   >
                     <div className="flex justify-between items-start">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400">
                           {engine.id === 'super-db' ? <Database className="w-4 h-4" /> :
                            engine.id === 'super-ai' ? <Cpu className="w-4 h-4" /> :
                            <Globe className="w-4 h-4" />}
                         </div>
                         <div>
                           <h4 className="text-xs font-black tracking-tight text-slate-200 group-hover:text-indigo-400 transition-colors uppercase">{engine.name}</h4>
                           <span className="text-[8px] font-mono font-bold text-slate-500">{engine.type}</span>
                         </div>
                       </div>
                       <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-full font-mono text-[7px] text-slate-400 uppercase font-black uppercase tracking-wider">
                         <span className={`w-1 h-1 rounded-full ${engine.status === 'healthy' ? 'bg-emerald-400' : 'bg-indigo-400'} animate-pulse`} />
                         {engine.status}
                       </div>
                     </div>

                     <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-900 font-mono text-[8px] text-slate-400">
                       <div>
                         <span className="text-slate-600 block text-[7px] font-bold uppercase tracking-widest">CPU</span>
                         <span className="font-extrabold text-slate-300">{engine.status === 'restarting' ? '0%' : `${engine.cpu}%`}</span>
                       </div>
                       <div>
                         <span className="text-slate-600 block text-[7px] font-bold uppercase tracking-widest">Latency</span>
                         <span className="font-extrabold text-slate-300">{engine.status === 'restarting' ? '--' : `${engine.latency}ms`}</span>
                       </div>
                       <div>
                         <span className="text-slate-600 block text-[7px] font-bold uppercase tracking-widest">Sockets</span>
                         <span className="font-extrabold text-slate-300">{engine.status === 'restarting' ? '0' : engine.connections}</span>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </section>

            {/* Pipeline Overview */}
            <section className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
               <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 blur-[80px] rounded-full" />
               <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-center">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Velocity & Flow</h3>
                     <BarChart3 className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="space-y-6">
                     {pipelineStages.map((stage, i) => (
                       <div key={i} className="space-y-2">
                           <div className="flex justify-between items-end">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stage.name}</div>
                              <div className="text-xs font-bold">{stage.count}</div>
                           </div>
                           <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${((stage.count || 0) / 30) * 100}%` }}
                                transition={{ delay: 1, duration: 1 }}
                                className={cn("h-full rounded-full transition-all", stage.color)} 
                              />
                           </div>
                       </div>
                     ))}
                  </div>
               </div>
            </section>

            {/* Quick Actions */}
            <section className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-xl shadow-indigo-600/30 group">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 mb-8">Executive Shortcuts</h3>
               <div className="space-y-4">
                  {[
                    { label: 'Platform Domains', icon: Globe, path: '/superadmin/domains' },
                    { label: 'Platform Security', icon: Shield, path: '/superadmin/logs' },
                    { label: 'Growth Report', icon: TrendingUp, path: '/superadmin/usage' },
                  ].map((action, i) => (
                    <button key={i} onClick={() => navigate(action.path)} className="w-full flex items-center justify-between p-5 bg-white/10 rounded-[1.5rem] hover:bg-white/20 transition-all text-left">
                       <div className="flex items-center gap-4">
                          <action.icon className="w-5 h-5 text-indigo-200" />
                          <span className="text-xs font-black uppercase tracking-widest">{action.label}</span>
                       </div>
                       <ArrowUpRight className="w-4 h-4 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
               </div>
            </section>

            {/* AI Insight */}
            <section className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white">AI</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-900">Neural Insight</div>
               </div>
               <p className="text-xs font-medium text-gray-500 italic leading-relaxed">
                  "Lead velocity in the 'Qualifying' stage has increased by 14% this week. Recommend prioritizing Proposal generation for the DXB hub inquiries."
               </p>
            </section>
        </div>
      </div>

      {/* Pop-up Overlay for Superadmin Sidebar Infrastructure Nodes */}
      <AnimatePresence>
        {selectedEngine && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-950 border border-slate-800 text-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Overlay header */}
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-905 border border-slate-800 flex items-center justify-center text-slate-300">
                    {selectedEngine.id === 'super-db' ? <Database className="w-5 h-5" /> :
                     selectedEngine.id === 'super-ai' ? <Cpu className="w-5 h-5" /> :
                     <Globe className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-black text-white text-md tracking-tight leading-none uppercase">{selectedEngine.name}</h3>
                    <p className="text-[9px] font-mono text-slate-400 mt-1 tracking-wider uppercase">{selectedEngine.type}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEngine(null)} 
                  className="p-1.5 border border-slate-800 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Specification stats */}
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-xl text-center border border-slate-800">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block font-mono">CPU Burst limit</span>
                    <span className="text-xs font-bold font-mono text-indigo-400">
                      {selectedEngine.status === 'restarting' ? '0%' : `${selectedEngine.cpu}%`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block font-mono">Core latency</span>
                    <span className="text-xs font-bold font-mono text-indigo-400">
                      {selectedEngine.status === 'restarting' ? '--' : `${selectedEngine.latency} ms`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block font-mono">Connected</span>
                    <span className="text-xs font-bold font-mono text-indigo-400">
                      {selectedEngine.status === 'restarting' ? '0' : selectedEngine.connections}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 bg-slate-900/30 p-3 rounded-lg border border-slate-800">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1 font-mono">Cradle allocation footprint</span>
                  <span className="font-semibold text-slate-300">{selectedEngine.specs}</span>
                </div>

                {/* Simulated Logs console */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" /> std_output_stream
                    </span>
                    <span className="text-emerald-400 animate-pulse">● FEED NOMINAL</span>
                  </div>
                  <div className="h-32 bg-slate-900 rounded-xl p-3 font-mono text-[10px] text-slate-300 overflow-y-auto space-y-1">
                    {selectedEngine.logs.map((row, idx) => (
                      <div key={idx} className="whitespace-pre-wrap leading-relaxed">{row}</div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>

              {/* Restart Simulation Controls */}
              <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex justify-end gap-2.5">
                <button 
                  onClick={() => handleRestartEngine(selectedEngine.id)}
                  disabled={selectedEngine.status === 'restarting'}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition"
                >
                  Bypass & Restart Cradle
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

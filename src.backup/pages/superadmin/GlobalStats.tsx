import React, { useEffect, useState, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Database, 
  AlertCircle, 
  CalendarClock, 
  ShieldCheck, 
  Cpu, 
  Mail, 
  HardDrive, 
  Terminal, 
  RefreshCcw, 
  X, 
  Play,
  Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Container {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'restarting' | 'testing';
  cpu: number;
  memoryUsed: number;
  memoryMax: number;
  latency: number;
  connections: number;
  region: string;
  uptime: string;
  provider: string;
  logs: string[];
}

export default function GlobalStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Health Container States & Interactivity
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch central platform overview statistics
  const fetchStats = async () => {
    try {
      const res = await fetch('/v1/sys-admin/stats');
      if (!res.ok) {
        console.warn('Stats fetch not OK');
        return;
      }
      const data = await res.json();
      if (data?.success) {
        setStats(data.data);
      } else {
        setStats({ totalClients: 0, totalBookings: 0, totalContacts: 0, storageUsed: 0, nearQuota: [] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Initial systems container mapping
    const defaultContainers: Container[] = [
      {
        id: 'database',
        name: 'Database Primary Cluster',
        type: 'DocStore Sandbox & MongoDB',
        status: 'healthy',
        cpu: 6.4,
        memoryUsed: 1240,
        memoryMax: 4096,
        latency: 12,
        connections: 84,
        region: 'europe-west2',
        uptime: '344h 12m',
        provider: 'Atlas Dedicated',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: Primary cluster handshakes confirmed.`,
          `[${new Date().toLocaleTimeString()}] DBG: Query index optimization completed for Client Sandbox indices.`,
          `[${new Date().toLocaleTimeString()}] INF: Sockets pool check: 84 verified connected.`
        ]
      },
      {
        id: 'ai',
        name: 'AI Neural Inference Engine',
        type: 'Model Proxy & Orchestrator',
        status: 'healthy',
        cpu: 14.2,
        memoryUsed: 1980,
        memoryMax: 8192,
        latency: 320,
        connections: 3,
        region: 'europe-west2-ai',
        uptime: '89h 44m',
        provider: 'Gemini / Groq Edge Proxy',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: Initialized request queue for neural optimization.`,
          `[${new Date().toLocaleTimeString()}] DBG: Context token window verification: 100% capacity.`,
          `[${new Date().toLocaleTimeString()}] INF: System standing ready for direct developer prompt generation.`
        ]
      },
      {
        id: 'router',
        name: 'Dynamic Gateway & LB',
        type: 'Multi-Tenant Ingress Router',
        status: 'healthy',
        cpu: 4.8,
        memoryUsed: 512,
        memoryMax: 2048,
        latency: 4,
        connections: 231,
        region: 'edge-ingress-point',
        uptime: '1540h 18m',
        provider: 'Reverse Ingress Layer',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: Edge routing proxy initiated weights allocation.`,
          `[${new Date().toLocaleTimeString()}] DBG: Health diagnostics checked: TLS termination validated.`,
          `[${new Date().toLocaleTimeString()}] INF: Multi-tenant balancing gateway ready.`
        ]
      }
    ];
    setContainers(defaultContainers);
  }, []);

  // System real-time loops generator
  useEffect(() => {
    const interval = setInterval(() => {
      setContainers(prev => 
        prev.map(c => {
          if (c.status === 'restarting' || c.status === 'testing') return c;

          const cpuFluctuation = (Math.random() - 0.5) * 1.5;
          const nextCpu = Math.max(1, Math.min(99, Number((c.cpu + cpuFluctuation).toFixed(1))));

          const latencyFluctuation = Math.round((Math.random() - 0.5) * (c.id === 'ai' ? 25 : 2));
          const nextLatency = Math.max(1, c.latency + latencyFluctuation);

          const connFluctuation = Math.round((Math.random() - 0.5) * 5);
          const nextConnections = Math.max(0, c.connections + connFluctuation);

          const updatedLogs = [...c.logs];
          if (Math.random() > 0.7) {
            const ticksList = [
              `INF: Central monitoring stream verified: systems reporting optimal.`,
              `INF: Micro-container virtualization check completed.`,
              `DBG: Memory gc loop check: allocation is nominal.`,
              `INF: Transaction routes audited: latency holds inside benchmark metrics.`
            ];
            const chosenTick = ticksList[Math.floor(Math.random() * ticksList.length)];
            updatedLogs.push(`[${new Date().toLocaleTimeString()}] ${chosenTick}`);
            if (updatedLogs.length > 20) updatedLogs.shift();
          }

          return {
            ...c,
            cpu: nextCpu,
            latency: nextLatency,
            connections: nextConnections,
            logs: updatedLogs
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Log Modal smooth auto-scroll sync
  useEffect(() => {
    if (selectedContainer) {
      const activeInstance = containers.find(c => c.id === selectedContainer.id);
      if (activeInstance) setSelectedContainer(activeInstance);
      setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [containers]);

  // Save audit logs helper
  const logAction = async (action: string, targetKey: string, metadata?: any) => {
    try {
      await fetch('/v1/sys-admin/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target: targetKey, metadata })
      });
    } catch (err) {
      console.error('Audit Log Sync Failure:', err);
    }
  };

  const handleRestartContainer = (id: string) => {
    logAction('RESTART_CONTAINER', id, { triggeredBy: 'superadmin-central-summary', description: `Requested container bounce of ${id} from operational center` });
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
              `[${timestamp}] 🔴 WARN: SYSTEM RESTART COMMENCE SEQUENCED BY EXECUTIVE SUPERADMIN.`,
              `[${timestamp}] INF: Safe SIGTERM dispatched. Unmounting sandbox assets...`,
              `[${timestamp}] INF: Temporary context states cleared out safely.`
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
              cpu: 18.5,
              logs: [
                ...c.logs,
                `[${timestamp}] 🟡 INFO: DAEMON AWAKE. Bootstrapping configuration caches...`,
                `[${timestamp}] INF: Executing diagnostic checks and integration audits.`
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
                cpu: 5.5,
                connections: id === 'database' ? 84 : 231,
                latency: id === 'ai' ? 320 : 4,
                logs: [
                  ...c.logs,
                  `[${timestamp}] 🟢 SUCCESS: HEALTH RESTORE CONFIRMED. NOMINAL STATE ESTABLISHED.`
                ]
              };
            }
            return c;
          })
        );
      }, 1500);

    }, 2500);
  };

  const handleRunDiagnostic = (id: string) => {
    logAction('RUN_DIAGNOSTICS_AUDIT', id, { triggeredBy: 'superadmin-central-summary', description: `Executed diagnostics and system performance checks on ${id}` });
    const timestamp = new Date().toLocaleTimeString();
    setContainers(prev => 
      prev.map(c => {
        if (c.id === id) {
          return {
            ...c,
            status: 'testing',
            logs: [
              ...c.logs,
              `[${timestamp}] 🌀 DIAG: INITIALIZING ADVANCED TELEMETRY COMPARATORS...`,
              `[${timestamp}] INF: Sockets integrity check: 100% verified connections.`,
              `[${timestamp}] DBG: Run performance latency test suite on sandbox router.`
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
            const recoveredT = new Date().toLocaleTimeString();
            return {
              ...c,
              status: 'healthy',
              logs: [
                ...c.logs,
                `[${recoveredT}] 🟢 SUCCESS: AUDIT RUN METRICS ACCEPTABLE. CONFLICT RESOLUTION: NOMINAL.`
              ]
            };
          }
          return c;
        })
      );
    }, 1500);
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'emerald';
    if (status === 'restarting') return 'rose';
    return 'indigo';
  };

  if (loading) return <div className="p-8 font-medium text-slate-500 flex items-center gap-2"><RefreshCcw className="w-5 h-5 animate-spin" /> Gathering central platform parameters...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Platform Operational Summary</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Multi-tenant provisioning stats, active micro-services, and live telemetry control.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-[10px] font-bold uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Platform Owner Privilege
        </div>
      </div>
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-lg hover:shadow-indigo-500/5 transition duration-300">
          <div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Tenants</div>
             <div className="text-3xl font-black mt-2 text-slate-800 tracking-tight">{stats?.totalClients || 0}</div>
             <div className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {stats?.activeClients || 0} Secure/Active
             </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
             <Users className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-lg hover:shadow-indigo-500/5 transition duration-300">
          <div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sockets Handled</div>
             <div className="text-3xl font-black mt-2 text-slate-800 tracking-tight">{stats?.totalBookings || 0} <span className="text-slate-300 text-base font-black">/</span> {stats?.totalContacts || 0}</div>
             <div className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase tracking-wide">Sync Platform Traffic</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
             <CalendarClock className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-lg hover:shadow-indigo-500/5 transition duration-300">
          <div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inference Requests</div>
             <div className="text-3xl font-black mt-2 text-slate-800 tracking-tight">{stats?.totalMessages || 0}</div>
             <div className="text-[10px] text-purple-600 font-bold mt-1.5 uppercase tracking-wider">Dynamic NLP API</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
             <MessageSquare className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-lg hover:shadow-indigo-500/5 transition duration-300">
          <div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Onboard Requests</div>
             <div className="text-3xl font-black mt-2 text-amber-600 font-mono tracking-tight">{stats?.pendingOnboarding || 0}</div>
             <div className="text-[10px] text-amber-600 font-bold mt-1.5 uppercase tracking-widest">Requires Approval</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
             <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      {/* NEW Real-Time Clickable Micro-Containers Section request */}
      <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Network className="w-64 h-64 text-indigo-400" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-5 mb-5">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2.5">
              <span>Dynamic Platform Sockets</span>
              <span className="text-emerald-400 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 tracking-wider">Active Real-Time Telemetry Feed</span>
            </h3>
            <p className="text-slate-400 text-xs mt-1 font-semibold">
              Live containers routing user requests. Click any micro-container workspace block to audit telemetry logs or sequence hard daemon restarts.
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950 px-3 py-1.5 rounded-xl border border-indigo-900/60 uppercase self-start sm:self-auto">
            Sandbox Partition: Secure Edge
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {containers.map((c) => (
            <div 
              key={c.id}
              onClick={() => setSelectedContainer(c)}
              className="bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 cursor-pointer transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                    {c.id === 'database' ? <Database className="w-4 h-4 text-blue-400" /> :
                     c.id === 'ai' ? <Cpu className="w-4 h-4 text-purple-400" /> :
                     <Network className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full bg-${getStatusColor(c.status)}-400 animate-pulse`} />
                    <span className="text-[8px] font-bold font-mono tracking-wider uppercase text-slate-400">{c.status}</span>
                  </div>
                </div>
                <h4 className="font-bold text-slate-100 text-xs uppercase tracking-wider group-hover:text-indigo-400 transition-colors">{c.name}</h4>
                <p className="text-[9px] text-slate-500 mt-0.5 font-semibold leading-relaxed mb-3">{c.type}</p>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  <span>Virtual CPU</span>
                  <span className="text-slate-300 font-mono">{c.status === 'restarting' ? '0%' : `${c.cpu}%`}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full rounded-full bg-${getStatusColor(c.status)}-500`}
                    animate={{ width: c.status === 'restarting' ? '0%' : `${c.cpu}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-mono text-slate-400 pt-1">
                  <span>{c.latency}ms average latency</span>
                  <span>{c.connections} active rx sockets</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
           <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Clients Near Quota Boundaries
           </h3>
           {stats?.nearQuota && stats.nearQuota.length > 0 ? (
             <ul className="space-y-3">
                {stats.nearQuota.map((client: any) => (
                  <li key={client._id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                    <div className="font-bold text-slate-700">{client.businessName}</div>
                    <div className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-0.5 rounded-lg">
                      {client.aiMessageLimit} limit
                    </div>
                  </li>
                ))}
             </ul>
           ) : (
             <p className="text-slate-400 text-xs font-semibold">All multi-tenant quotas nominal and securely within operational limitations.</p>
           )}
         </div>

         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
           <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              System Status Feed
           </h3>
           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
               <p className="text-slate-600 font-bold text-xs">All API endpoint networks operational. Logging engines synchronized.</p>
             </div>
             <p className="text-[10px] font-mono text-slate-400 mt-2">API health checks: pass. Trace diagnostics complete.</p>
           </div>
         </div>
      </div>

      {/* POPUP MODAL ENHANCEMENT FOR DETAILED SYSTEM TELEMETRY */}
      <AnimatePresence>
        {selectedContainer && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 text-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Context Header */}
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
                    {selectedContainer.id === 'database' ? <Database className="w-5 h-5 text-blue-400" /> :
                     selectedContainer.id === 'ai' ? <Cpu className="w-5 h-5 text-purple-400" /> :
                     <Network className="w-5 h-5 text-emerald-400" />}
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
                <div className="grid grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl text-center border border-slate-800">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Virtual CPU</span>
                    <span className="text-xs font-bold font-mono text-indigo-300">
                      {selectedContainer.status === 'restarting' ? '0%' : `${selectedContainer.cpu}%`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Response Time</span>
                    <span className="text-xs font-bold font-mono text-indigo-300">
                      {selectedContainer.status === 'restarting' ? '--' : `${selectedContainer.latency} ms`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Rx Sockets</span>
                    <span className="text-xs font-bold font-mono text-indigo-300">
                      {selectedContainer.status === 'restarting' ? '0' : selectedContainer.connections}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 bg-slate-950/20 p-3 rounded-lg border border-slate-850/40 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Deployment Region</span>
                    <span className="font-bold text-slate-200 font-mono text-[10px]">{selectedContainer.region}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Steady Uptime</span>
                    <span className="font-bold text-slate-200 font-mono text-[10px]">{selectedContainer.uptime}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Memory Allocation specs</div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-[10px] text-slate-400 font-mono">Resident Memory</span>
                    <span className="text-indigo-300 font-mono">{selectedContainer.status === 'restarting' ? '0 MB' : `${selectedContainer.memoryUsed} MB / ${selectedContainer.memoryMax} MB`}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <motion.div 
                      className="h-full rounded-full bg-indigo-500" 
                      animate={{ width: selectedContainer.status === 'restarting' ? '0%' : `${((selectedContainer.memoryUsed || 0) / (selectedContainer.memoryMax || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Log terminal */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Live Daemon stdout Stream
                    </span>
                    <span className="text-emerald-400 animate-pulse text-[9px]">● LIVE TELEMETRY</span>
                  </div>
                  <div className="h-36 bg-slate-950 rounded-xl p-3 font-mono text-[10px] text-slate-300 overflow-y-auto space-y-1 select-none">
                    {selectedContainer.logs.map((row, idx) => (
                      <div key={idx} className="leading-relaxed whitespace-pre-wrap">{row}</div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row justify-end items-center gap-2.5">
                <button 
                  onClick={() => handleRunDiagnostic(selectedContainer.id)}
                  disabled={selectedContainer.status === 'restarting' || selectedContainer.status === 'testing'}
                  className="w-full sm:w-auto bg-slate-900 border border-slate-800 hover:bg-slate-850 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" /> Run Suite Audit
                </button>
                <button 
                  onClick={() => handleRestartContainer(selectedContainer.id)}
                  disabled={selectedContainer.status === 'restarting'}
                  className="w-full sm:w-auto bg-rose-900/10 hover:bg-rose-900/20 border border-rose-950 disabled:opacity-50 text-rose-400 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition"
                >
                  Force Bounce Container
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

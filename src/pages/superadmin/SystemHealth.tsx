import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Database, 
  Cpu, 
  Mail, 
  HardDrive, 
  RefreshCcw, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Terminal, 
  Play, 
  Settings, 
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

export default function SystemHealth() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);

  // Telemetry Sparklines simulation (last 10 data points)
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize container data
  useEffect(() => {
    const initialContainers: Container[] = [
      {
        id: 'database',
        name: 'Database Primary Cluster',
        type: 'DocStore Sandbox & MongoDB',
        status: 'healthy',
        cpu: 7.4,
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
        cpu: 18.2,
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
        id: 'email',
        name: 'Enterprise SMTP Gateway',
        type: 'Inbound / Outbound Mail Dispatcher',
        status: 'healthy',
        cpu: 2.1,
        memoryUsed: 210,
        memoryMax: 1024,
        latency: 45,
        connections: 1,
        region: 'europe-west2-mail',
        uptime: '722h 05m',
        provider: 'Platform Nodemailer Service',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: SMTP connection pool established with host postmaster.`,
          `[${new Date().toLocaleTimeString()}] DBG: Template buffer flush successful. Queue remains at 0.`,
          `[${new Date().toLocaleTimeString()}] INF: Delivery certificate verification keys re-signed.`
        ]
      },
      {
        id: 'storage',
        name: 'Cloud Object Storage (CDN)',
        type: 'Dynamic Media Content Host',
        status: 'healthy',
        cpu: 1.5,
        memoryUsed: 42.5, // representation of space used in MB
        memoryMax: 1000,
        latency: 18,
        connections: 32,
        region: 'global-cdn-storage',
        uptime: '1240h 50m',
        provider: 'Secure Cloud Buckets',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: CDN caching checks passed for media items.`,
          `[${new Date().toLocaleTimeString()}] INF: Write check passed. Temporary directory /uploads synchronized.`,
          `[${new Date().toLocaleTimeString()}] DBG: Static asset validation loop completed.`
        ]
      },
      {
        id: 'router',
        name: 'Dynamic Gateway & LB',
        type: 'Multi-Tenant Ingress Router',
        status: 'healthy',
        cpu: 5.6,
        memoryUsed: 512,
        memoryMax: 2048,
        latency: 4,
        connections: 231,
        region: 'edge-ingress-point',
        uptime: '1540h 18m',
        provider: 'Reverse Ingress Layer',
        logs: [
          `[${new Date().toLocaleTimeString()}] INF: Edge routing tables rebuilt. Successfully parsing wildcard domains.`,
          `[${new Date().toLocaleTimeString()}] INF: Active load balancing mode set to Least Connections.`,
          `[${new Date().toLocaleTimeString()}] DBG: SSL/TLS certificate autocheck: All tenant subdomains secured.`
        ]
      }
    ];

    setContainers(initialContainers);

    // Initial sparklines
    const initialSparklines: Record<string, number[]> = {};
    initialContainers.forEach(c => {
      initialSparklines[c.id] = Array.from({ length: 10 }, () => Math.random() * 20 + 5);
    });
    setSparklines(initialSparklines);
    setLoading(false);
  }, []);

  // Telemetry fluctuation generator (Real-time data ticks every 2.5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setContainers(prev => 
        prev.map(c => {
          if (c.status === 'restarting' || c.status === 'testing') return c;

          // Fluctuate CPU
          const cpuDelta = (Math.random() - 0.5) * 3;
          const targetCpu = Math.max(1, Math.min(99, Number((c.cpu + cpuDelta).toFixed(1))));

          // Fluctuate connections
          const connDelta = Math.round((Math.random() - 0.5) * 6);
          const targetConns = Math.max(1, c.connections + connDelta);

          // Fluctuate latency
          const latencyDelta = Math.round((Math.random() - 0.5) * (c.latency > 100 ? 50 : 4));
          const targetLatency = Math.max(2, c.latency + latencyDelta);

          // Append random log line occasionally
          const newLogs = [...c.logs];
          if (Math.random() > 0.4) {
            const events = [
              `INF: Periodic health ping received from active workspace request.`,
              `DBG: Allocated buffer check verified. GC count is current.`,
              `INF: Resource utilization metrics synchronized under nominal load.`,
              `DBG: SSL packet handshake validated successfully.`,
              `INF: Health check acknowledged by the centralized System Monitor.`
            ];
            const chosenEvent = events[Math.floor(Math.random() * events.length)];
            newLogs.push(`[${new Date().toLocaleTimeString()}] ${chosenEvent}`);
            if (newLogs.length > 30) newLogs.shift();
          }

          return {
            ...c,
            cpu: targetCpu,
            connections: targetConns,
            latency: targetLatency,
            logs: newLogs
          };
        })
      );

      // Fluctuate sparklines
      setSparklines(prev => {
        const next: Record<string, number[]> = {};
        Object.entries(prev).forEach(([id, points]) => {
          const pointsArray = points as number[];
          const freshValue = Math.random() * 25 + 5;
          const nextPoints = [...pointsArray.slice(1), freshValue];
          next[id] = nextPoints;
        });
        return next;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Sync scroll for logs in modal
  useEffect(() => {
    if (selectedContainer) {
      const updated = containers.find(c => c.id === selectedContainer.id);
      if (updated) {
        setSelectedContainer(updated);
      }
      setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [containers]);

  const logAction = async (action: string, targetKey: string, metadata?: any) => {
    try {
      await fetch('/v1/sys-admin/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target: targetKey, metadata })
      });
    } catch (err) {
      console.error('Failed to log privileged action:', err);
    }
  };

  // Restart simulation
  const handleRestartContainer = (id: string) => {
    logAction('RESTART_CONTAINER', id, { triggeredBy: 'system-health-panel', description: `Forced bounce of ${id} container daemon` });
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
              `[${timestamp}] 🔴 WARN: SYSTEM RESTART SEQUENCED BY ADMINISTRATOR.`,
              `[${timestamp}] INF: Sending SIGTERM signal to primary daemon process...`,
              `[${timestamp}] INF: Connection pools safely disconnected. Readying system flush.`
            ]
          };
        }
        return c;
      })
    );

    // After 2.5 seconds, bring it to 'testing' then 'healthy'
    setTimeout(() => {
      setContainers(prev => 
        prev.map(c => {
          if (c.id === id) {
            const timestamp = new Date().toLocaleTimeString();
            return {
              ...c,
              status: 'testing',
              cpu: 25,
              connections: 5,
              latency: 45,
              logs: [
                ...c.logs,
                `[${timestamp}] 🟡 INFO: DAEMON CRADLE RESTORED. Bootstrapping configurations...`,
                `[${timestamp}] INF: Running automatic suite and integration benchmarks...`
              ]
            };
          }
          return c;
        })
      );

      // Final restore to healthy
      setTimeout(() => {
        setContainers(prev => 
          prev.map(c => {
            if (c.id === id) {
              const timestamp = new Date().toLocaleTimeString();
              return {
                ...c,
                status: 'healthy',
                cpu: 5 + Math.random() * 5,
                connections: id === 'database' ? 84 : id === 'router' ? 230 : 15,
                latency: id === 'ai' ? 310 : id === 'database' ? 12 : 15,
                logs: [
                  ...c.logs,
                  `[${timestamp}] 🟢 SUCCESS: CONTAINER RESTORED NOMINAL STATUS. ALL GATEWAYS RE-ESTABLISHED.`
                ]
              };
            }
            return c;
          })
        );
      }, 1500);

    }, 2500);
  };

  // Run diagnostics suite
  const handleRunDiagnostic = (id: string) => {
    logAction('RUN_DIAGNOSTICS_AUDIT', id, { triggeredBy: 'system-health-panel', description: `Executed system health diagnostic suite on ${id}` });
    const timestamp = new Date().toLocaleTimeString();
    setContainers(prev => 
      prev.map(c => {
        if (c.id === id) {
          return {
            ...c,
            status: 'testing',
            logs: [
              ...c.logs,
              `[${timestamp}] 🌀 DIAG: INITIALIZING INTEGRATED TELEMETRY CHECKS.`,
              `[${timestamp}] INF: Calculating connection pool integrity ... CONFIRMED.`,
              `[${timestamp}] INF: Memory leak audit completed: NO DETECTED ANOMALIES.`
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
            const restoredTimestamp = new Date().toLocaleTimeString();
            return {
              ...c,
              status: 'healthy',
              logs: [
                ...c.logs,
                `[${restoredTimestamp}] 🟢 SUCCESS: INFRASTRUCTURE SUITE COMPLETE. BENCHMARK MARGINS ACCEPTABLE.`
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
    if (status === 'testing') return 'indigo';
    return 'amber';
  };

  const getStatusBadge = (status: string) => {
    const color = getStatusColor(status);
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-${color}-50 border border-${color}-100 text-${color}-700`}>
        <div className={`w-1.5 h-1.5 rounded-full bg-${color}-500 animate-pulse`} />
        {status}
      </div>
    );
  };

  // Basic computed platform aggregate
  const databaseContainer = containers.find(c => c.id === 'database');
  const aiContainer = containers.find(c => c.id === 'ai');
  const routerContainer = containers.find(c => c.id === 'router');

  const globalUptime = "Steady Process Uptime";
  const overallStatus = containers.some(c => c.status === 'degraded') ? 'degraded' : 'healthy';

  return (
    <div className="space-y-8 pb-20">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100/50 text-[10px] font-bold uppercase tracking-widest mb-1.5 animate-pulse">
            ● Real-Time Feed Active
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">System Health Monitor</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Sandbox virtualized containers telemetry, dynamic workload routing, and live logs. Click any container matrix card to launch full shell diagnostics.
          </p>
        </div>
        <button 
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            logAction('FORCE_NETWORK_SYNC', 'network', { triggeredBy: 'system-health-panel', description: 'Synchronized software definitions and domain route weights' });
            setTimeout(() => setRefreshing(false), 500);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-150 border border-indigo-100 text-indigo-700 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Force Network Sync
        </button>
      </div>

      {/* Top Level Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
            <Activity className="w-16 h-16 text-indigo-600" />
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Systems Status</div>
          <div className="text-3xl font-black text-slate-800 tracking-tight mb-4">
            {overallStatus === 'healthy' ? 'OPTIMAL PEAK' : 'DEGRADED PERFORMANCE'}
          </div>
          {getStatusBadge(overallStatus)}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Aggregate Ingress Throughput</div>
          <div className="text-3xl font-black text-slate-800 tracking-tight mb-2">
            {routerContainer ? routerContainer.connections : 231} <span className="text-sm font-black text-slate-400">RPS</span>
          </div>
          <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Dynamic Multi-Tenant Balancing nominal</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Spanner / Atlas Latency</div>
          <div className="text-3xl font-black text-slate-800 tracking-tight mb-2">
            {databaseContainer ? databaseContainer.latency : 11} <span className="text-base font-black text-slate-400">MS</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">SUB-MILLISECOND DB ROUTING</div>
        </div>
      </div>

      {/* Interactive Containers Grid */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Virtualized Multi-Tenant Containers</h3>
            <p className="text-xs font-semibold text-slate-400">Click any card to inspect full server process logs, run diagnostics, or bounce containers.</p>
          </div>
          <Settings className="w-5 h-5 text-slate-400 animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 lg:divide-x divide-slate-100">
          {containers.map((c) => {
            const isRestarting = c.status === 'restarting';
            const isTesting = c.status === 'testing';

            return (
              <div 
                key={c.id}
                onClick={() => setSelectedContainer(c)}
                className="p-6 cursor-pointer hover:bg-slate-50/50 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                      {c.id === 'database' ? <Database className="w-6 h-6 text-blue-600" /> :
                       c.id === 'ai' ? <Cpu className="w-6 h-6 text-indigo-600" /> :
                       c.id === 'email' ? <Mail className="w-6 h-6 text-emerald-600" /> :
                       c.id === 'storage' ? <HardDrive className="w-6 h-6 text-amber-600" /> :
                       <Network className="w-6 h-6 text-rose-600" />}
                    </div>
                    {getStatusBadge(c.status)}
                  </div>

                  <h4 className="font-black text-slate-800 text-lg tracking-tight group-hover:text-indigo-600 transition-colors">
                    {c.name}
                  </h4>
                  <p className="text-xs font-bold text-slate-400 mb-6">{c.type}</p>

                  <div className="space-y-4 mb-6">
                    {/* CPU Utilization Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <span>CPU Utilization</span>
                        <span className="text-slate-700">{isRestarting ? '0%' : `${c.cpu}%`}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full rounded-full bg-${getStatusColor(c.status)}-500`}
                          animate={{ width: isRestarting ? '0%' : `${c.cpu}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>

                    {/* Quick Stats list */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Latency</span>
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {isRestarting ? '--' : `${c.latency} ms`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Connections</span>
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {isRestarting ? '0' : c.connections}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SVG sparkline placeholder */}
                {sparklines[c.id] && (
                  <div className="h-8 w-full mt-2 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                    <svg className="w-full h-full">
                      <path
                        fill="none"
                        stroke={`currentColor`}
                        strokeWidth="2"
                        className={`text-${getStatusColor(c.status)}-500`}
                        d={`M ${sparklines[c.id].map((val, idx) => `${idx * 28},${30 - (val / 35) * 20}`).join(' L ')}`}
                      />
                    </svg>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Region: {c.region}</span>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest group-hover:underline">Shell View →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Check card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 p-8 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce" />
          <div>
            <h4 className="font-black text-slate-800 text-xl tracking-tight">Zero Intrusion Events</h4>
            <p className="text-sm font-medium text-slate-500 max-w-sm mt-1">
              Isolation keys, CORS enforcement bounds, and end-to-end multi-tenant database protection schemes are validated healthy and secured.
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-950 p-8 rounded-3xl text-white flex flex-col justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Platform Core Spec
            </div>
            <h3 className="text-xl font-black italic tracking-wide">Multi-Agent Sandbox OS</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              The custom scheduler matches resources on-demand. Active micro-containers automatically hibernate or wake when client requests hits custom domains.
            </p>
          </div>
          <div className="pt-6 flex justify-between items-center text-[10px] font-mono text-slate-500">
            <span>RAM CAPACITY: 64.00 GB POOL</span>
            <span>CPU CORES: 16 vCPU NOMINAL</span>
          </div>
        </div>
      </div>

      {/* Telemetry Process Overlay Modal (Popup) */}
      <AnimatePresence>
        {selectedContainer && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-100 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    {selectedContainer.id === 'database' ? <Database className="w-5 h-5 text-blue-600" /> :
                     selectedContainer.id === 'ai' ? <Cpu className="w-5 h-5 text-indigo-600" /> :
                     selectedContainer.id === 'email' ? <Mail className="w-5 h-5 text-emerald-600" /> :
                     selectedContainer.id === 'storage' ? <HardDrive className="w-5 h-5 text-amber-600" /> :
                     <Network className="w-5 h-5 text-rose-600" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedContainer.name}</h3>
                    <p className="text-xs font-semibold text-slate-400 capitalize">{selectedContainer.type} • {selectedContainer.provider}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedContainer(null)}
                  className="p-2 border border-slate-150 bg-white rounded-xl text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detailed Specs in Modal */}
              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Status</span>
                    {getStatusBadge(selectedContainer.status)}
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Container Latency</span>
                    <span className="text-sm font-black text-slate-800">
                      {selectedContainer.status === 'restarting' ? '--' : `${selectedContainer.latency} ms`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Connections</span>
                    <span className="text-sm font-black text-slate-800">
                      {selectedContainer.status === 'restarting' ? '0' : selectedContainer.connections}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Uptime</span>
                    <span className="text-sm font-black text-slate-800">{selectedContainer.uptime}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* CPU Meter */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-widest">CPU Throttle limit</span>
                      <span className="font-mono text-sm font-bold text-slate-700">{selectedContainer.status === 'restarting' ? '0%' : `${selectedContainer.cpu}%`}</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full rounded-full bg-${getStatusColor(selectedContainer.status)}-500`}
                        animate={{ width: selectedContainer.status === 'restarting' ? '0%' : `${selectedContainer.cpu}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-medium text-slate-400">Nominal process threshold capped at 2.00 cores burstable limits.</p>
                  </div>

                  {/* RAM Memory Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Memory Footprint</span>
                      <span className="font-mono text-sm font-bold text-slate-700">
                        {selectedContainer.status === 'restarting' ? '0 MB' : `${selectedContainer.memoryUsed} MB / ${selectedContainer.memoryMax} MB`}
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full rounded-full bg-blue-500" 
                        animate={{ width: selectedContainer.status === 'restarting' ? '0%' : `${(selectedContainer.memoryUsed / selectedContainer.memoryMax) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-medium text-slate-400">Garbage collection triggers automatically at 85% threshold capacity.</p>
                  </div>
                </div>

                {/* Live Terminal Output Simulator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-slate-800 uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-slate-500" />
                      Dynamic Daemon stdout Stream
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 animate-pulse">● LIVE TELEMETRY STREAM</span>
                  </div>
                  <div className="h-44 bg-slate-900 rounded-2xl p-4 font-mono text-[11px] text-slate-300 overflow-y-auto space-y-1 select-none">
                    {selectedContainer.logs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed whitespace-pre-wrap">{log}</div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>

              {/* Action buttons inside Modal popup */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end items-center gap-3">
                <button 
                  onClick={() => handleRunDiagnostic(selectedContainer.id)}
                  disabled={selectedContainer.status === 'restarting' || selectedContainer.status === 'testing'}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-800 transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  Run Suite Audit
                </button>
                <button 
                  onClick={() => handleRestartContainer(selectedContainer.id)}
                  disabled={selectedContainer.status === 'restarting'}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-rose-100/70 transition disabled:opacity-50"
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

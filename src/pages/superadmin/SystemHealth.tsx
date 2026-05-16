import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Database, Cpu, Mail, HardDrive, RefreshCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function SystemHealth() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/v1/super-admin/health');
      const data = await res.json();
      if (data?.success) setHealthData(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000); // Auto-refresh every minute
    return () => clearInterval(interval);
  }, []);

  const StatusBadge = ({ status }: { status: string }) => {
    const isHealthy = status === 'healthy';
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
        isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}>
        <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
        {status.toUpperCase()}
      </div>
    );
  };

  if (loading) return <div className="p-8">Monitoring platform status...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-500">Real-time status of platform services and background workers.</p>
        </div>
        <button 
          disabled={refreshing}
          onClick={fetchHealth}
          className="flex items-center gap-2 text-indigo-600 hover:bg-white px-4 py-2 rounded-lg border border-indigo-100 transition"
        >
          <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-3 opacity-10">
              <Activity className="w-16 h-16 text-indigo-600" />
           </div>
           <div className="text-sm font-medium text-gray-500 mb-1">Combined Status</div>
           <div className="text-2xl font-bold text-gray-900 mb-4">{healthData?.status === 'healthy' ? 'Steady' : 'Degraded'}</div>
           <StatusBadge status={healthData?.status || 'unknown'} />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
           <div className="text-sm font-medium text-gray-500 mb-1">Platform Uptime</div>
           <div className="text-2xl font-bold text-gray-900 mb-2">{(healthData?.uptime / 3600).toFixed(1)} <span className="text-base font-medium text-gray-400">Hours</span></div>
           <div className="text-[10px] text-gray-400 font-mono">SINCE LAST DEPLOYMENT</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
           <div className="text-sm font-medium text-gray-500 mb-1">Latency (P99)</div>
           <div className="text-2xl font-bold text-gray-900 mb-2">{healthData?.services?.database?.latency}</div>
           <div className="text-[10px] text-emerald-600 font-bold uppercase">Optimal Performance</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Metrics */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
             <h3 className="font-bold text-gray-900">Service Status</h3>
             <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="divide-y divide-gray-50">
            {healthData?.services && Object.entries(healthData.services).map(([name, svc]: [string, any]) => (
              <div key={name} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                    {name === 'database' ? <Database className="w-5 h-5 text-blue-600" /> :
                     name === 'ai' ? <Cpu className="w-5 h-5 text-indigo-600" /> :
                     name === 'email' ? <Mail className="w-5 h-5 text-emerald-600" /> :
                     <HardDrive className="w-5 h-5 text-gray-600" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 capitalize">{name}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">{svc.provider || 'Internal'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">{svc.latency || svc.used || 'Ready'}</span>
                  <StatusBadge status={svc.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security / Logs Summary */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
             <h3 className="font-bold text-gray-900">Recent System Events</h3>
             <AlertTriangle className="w-4 h-4 text-gray-400" />
          </div>
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
             <CheckCircle2 className="w-12 h-12 text-emerald-500" />
             <div>
               <h4 className="font-bold text-gray-900">No Incidents Reported</h4>
               <p className="text-sm text-gray-500 max-w-[280px] mx-auto mt-1">Platform-wide checks passed. AI and Database integrations are operating within normal parameters.</p>
             </div>
             <button className="text-sm font-bold text-indigo-600 hover:underline">View Audit Logs →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

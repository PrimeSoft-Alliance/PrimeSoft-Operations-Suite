import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  Zap, 
  Search, 
  Plus, 
  ChevronRight, 
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Globe,
  Shield,
  ArrowUpRight,
  TrendingDown,
  Activity,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function OperationsNexus() {
  const [activeTab, setActiveTab] = useState<'leads' | 'bookings' | 'engagement'>('leads');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, leadsRes, devRes] = await Promise.all([
          fetch('/v1/dashboard/stats'),
          fetch('/v1/dashboard/leads'),
          fetch('/v1/dashboard/bookings')
        ]);

        const statsData = await statsRes.json();
        const leadsData = await leadsRes.json();
        const bookingsData = await devRes.json();

        setStats(statsData?.data || null);
        
        // Build a combined feed for the "Nexus" feel
        const combined = [
          ...(leadsData?.data || []).map((l: any) => ({ ...l, type: 'lead', date: new Date(l.createdAt) })),
          ...(bookingsData?.data || []).map((b: any) => ({ ...b, type: 'booking', date: new Date(b.date) }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime());
        
        setFeed(combined);
      } catch (err) {
        console.error('Error fetching nexus data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const kpis = stats ? [
    { label: 'Revenue Pipeline', value: `$${(stats.totalBookings * 1250).toLocaleString()}`, trend: '+12%', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Acquisition Rate', value: `${((stats.totalLeads / (stats.usage?.aiMessagesUsed || 1)) * 100).toFixed(1)}%`, trend: '-2%', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50', negative: true },
    { label: 'Active Contacts', value: stats.totalContacts, trend: '+5', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Platform Load', value: `${(stats.usage?.storageBytesUsed / (1024 * 1024)).toFixed(1)}MB`, trend: 'Stable', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' },
  ] : [];

  return (
    <div className="space-y-12 font-sans pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
            Operations Command Center
          </motion.div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
            Business <span className="text-indigo-600">Nexus</span>.
          </h1>
          <p className="text-gray-400 font-medium text-lg tracking-tight max-w-xl leading-relaxed">
             Real-time orchestration of your customer acquisition, engagement pipelines, and digital infrastructure.
          </p>
        </div>

        <div className="flex p-1 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm">
          {(['leads', 'bookings', 'engagement'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "text-gray-400 hover:text-gray-600 hover:bg-slate-50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Display */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {kpis.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform", stat.bg)}>
                <stat.icon className={cn("w-7 h-7", stat.color)} />
              </div>
              <div className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-black tracking-tighter",
                stat.negative ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
              )}>
                {stat.trend}
              </div>
            </div>
            <div className="text-4xl font-black text-gray-900 tracking-tighter">{stat.value}</div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Feed Card */}
        <div className="lg:col-span-2">
           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-indigo-500/5 overflow-hidden h-full">
              <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-[1rem] flex items-center justify-center text-white">
                       <Activity className="w-5 h-5" />
                    </div>
                    <div>
                       <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Operations Stream</h3>
                       <p className="text-xs text-gray-400 font-medium">Monitoring latest {activeTab} activity</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button className="p-3 bg-white border border-slate-100 rounded-[1.2rem] text-slate-400 hover:text-indigo-600 transition-all"><Search className="w-4 h-4" /></button>
                 </div>
              </div>

              <div className="p-4 sm:p-10 divide-y divide-slate-50 min-h-[400px]">
                 {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                       <Zap className="w-10 h-10 text-indigo-200 animate-pulse" />
                    </div>
                 ) : feed.length > 0 ? (
                    (() => {
                      const filtered = feed.filter(item => {
                        if (activeTab === 'leads') return item.type === 'lead';
                        if (activeTab === 'bookings') return item.type === 'booking';
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-32 opacity-20">
                            <AlertCircle className="w-12 h-12 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Zero segments detected</p>
                          </div>
                        );
                      }

                      return filtered.slice(0, 8).map((item, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="group flex items-center justify-between py-8 first:pt-0 last:pb-0 gap-6"
                        >
                          <div className="flex items-center gap-6">
                            <div className={cn(
                              "w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-sm font-black transition-all",
                              item.type === 'lead' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                            )}>
                               {item.type[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-black text-gray-900 text-lg tracking-tight group-hover:text-indigo-600 transition-colors">
                                {item.name || item.fullName || 'External Inquiry'}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                 <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.email || 'Anonymous'}</div>
                                 <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                 <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                   {new Date(item.date).toLocaleDateString()}
                                 </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                             <div className="hidden sm:block text-right">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Status</div>
                                <div className="text-xs font-bold text-gray-900">Verified</div>
                             </div>
                             <button className="p-4 bg-slate-50 rounded-[1.2rem] text-slate-300 hover:bg-slate-900 hover:text-white transition-all group-hover:shadow-lg">
                                <ChevronRight className="w-5 h-5" />
                             </button>
                          </div>
                        </motion.div>
                      ));
                    })()
                 ) : (
                    <div className="flex flex-col items-center justify-center py-32 opacity-20">
                       <AlertCircle className="w-12 h-12 mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nexus synchronized. No data peaks.</p>
                    </div>
                 )}
              </div>
              
              <div className="bg-slate-50/50 p-6 text-center border-t border-slate-100">
                 <button className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] hover:tracking-[0.4em] transition-all">
                    Expand Full Operations Audit →
                 </button>
              </div>
           </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-12">
            {/* Health Metric */}
            <section className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
               <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 blur-[80px] rounded-full" />
               <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-center">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">AI Engagement Flow</h3>
                     <BarChart3 className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="space-y-6">
                     {[
                       { label: 'Chat Resolution', val: 92, col: 'bg-indigo-400' },
                       { label: 'Booking Intent', val: 58, col: 'bg-emerald-400' },
                       { label: 'Form Completion', val: 74, col: 'bg-amber-400' },
                     ].map((m, i) => (
                       <div key={i} className="space-y-2">
                          <div className="flex justify-between items-end">
                             <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{m.label}</div>
                             <div className="text-xs font-bold font-mono">{m.val}%</div>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${m.val}%` }}
                               transition={{ delay: 0.5, duration: 1 }}
                               className={cn("h-full rounded-full", m.col)} 
                             />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </section>

            {/* Quick Direct Actions */}
            <section className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-xl shadow-indigo-600/30">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 mb-8">Executive Controls</h3>
               <div className="space-y-4">
                  {[
                    { label: 'Review All Contacts', icon: MessageSquare, count: stats?.unreadContacts || 0 },
                    { label: 'Schedule Availability', icon: Calendar, count: stats?.pendingBookings || 0 },
                    { label: 'Security Protocols', icon: Shield, count: null },
                  ].map((action, i) => (
                    <button key={i} className="w-full flex items-center justify-between p-5 bg-white/10 rounded-[1.5rem] hover:bg-white/20 transition-all text-left">
                       <div className="flex items-center gap-4">
                          <action.icon className="w-5 h-5 text-indigo-200" />
                          <span className="text-xs font-black uppercase tracking-widest">{action.label}</span>
                       </div>
                       {action.count !== null && action.count > 0 && (
                         <span className="bg-white text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-black">{action.count}</span>
                       )}
                    </button>
                  ))}
               </div>
            </section>

             {/* System Insight */}
            <section className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white">AI</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-900">NexInsight</div>
               </div>
               <p className="text-xs font-medium text-gray-500 italic leading-relaxed">
                  "Peak user engagement detected between 2 PM - 5 PM. Consider activating high-priority response protocols for incoming web-leads during this window."
               </p>
            </section>
        </div>
      </div>
    </div>
  );
}

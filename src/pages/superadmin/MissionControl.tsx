import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  Zap as ZapIcon,
  Search, 
  Filter, 
  Download, 
  Plus, 
  ChevronRight, 
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Target,
  BarChart3,
  Globe,
  Shield,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

import { useNavigate } from 'react-router-dom';

export default function MissionControl() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'bookings' | 'contacts'>('pipeline');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    leads: [],
    bookings: [],
    contacts: []
  });

  useEffect(() => {
    const fetchCompanyData = async () => {
      setLoading(true);
      try {
        const [leadsRes, bookingsRes, contactsRes] = await Promise.all([
          fetch('/v1/super-admin/leads'),
          fetch('/v1/super-admin/platform-bookings'),
          fetch('/v1/super-admin/platform-contacts')
        ]);

        const leads = await leadsRes.json();
        const bookings = await bookingsRes.json();
        const contacts = await contactsRes.json();

        setData({
          leads: (leads?.success && Array.isArray(leads.data)) ? leads.data : [],
          bookings: (bookings?.success && Array.isArray(bookings.data)) ? bookings.data : [],
          contacts: (contacts?.success && Array.isArray(contacts.data)) ? contacts.data : []
        });
      } catch (err) {
        console.error('Error fetching mission control data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, []);

  const stats = [
    { label: 'Active Pipeline', value: '$420k', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100/50' },
    { label: 'Conversion', value: '18.4%', icon: ZapIcon, color: 'text-emerald-600', bg: 'bg-emerald-100/50' },
    { label: 'Avg Ticket', value: '$12.5k', icon: Shield, color: 'text-amber-600', bg: 'bg-amber-100/50' },
    { label: 'Growth', value: '+24%', icon: BarChart3, color: 'text-rose-600', bg: 'bg-rose-100/50' },
  ];

  const pipelineStages = [
    { name: 'Incoming', count: 12, color: 'bg-slate-200' },
    { name: 'Qualifying', count: 5, color: 'bg-indigo-300' },
    { name: 'Proposal', count: 3, color: 'bg-indigo-500' },
    { name: 'Negotiation', count: 2, color: 'bg-indigo-700' },
    { name: 'Closed', count: 8, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-12 font-sans pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]"
          >
            <span className="flex w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
            Live Operations
          </motion.div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
            Mission <span className="text-indigo-600">Control</span>.
          </h1>
          <p className="text-gray-400 font-medium text-lg tracking-tight max-w-xl">
             Managing your enterprise ecosystems, revenue pipelines, and client relations in high definition.
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-[1.5rem] border border-slate-200/50">
          {(['pipeline', 'bookings', 'contacts'] as const).map(tab => (
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
                   <button className="p-3 bg-white border border-slate-100 rounded-[1.2rem] text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all"><Search className="w-4 h-4" /></button>
                   <button className="bg-slate-900 text-white px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">New Entry</button>
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
                          else if (activeTab === 'contacts') navigate('/superadmin/contacts');
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
                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] hover:tracking-[0.4em] transition-all">
                   Initialize Full Audit Sequence →
                </button>
             </div>
          </div>
        </div>

        <div className="space-y-12">
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
                               animate={{ width: `${(stage.count / 30) * 100}%` }}
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
                    { label: 'Broadcast Update', icon: Globe, path: '/notifications' },
                    { label: 'Platform Security', icon: Shield, path: '/health' },
                    { label: 'Growth Report', icon: TrendingUp, path: '/usage' },
                  ].map((action, i) => (
                    <button key={i} className="w-full flex items-center justify-between p-5 bg-white/10 rounded-[1.5rem] hover:bg-white/20 transition-all">
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
    </div>
  );
}


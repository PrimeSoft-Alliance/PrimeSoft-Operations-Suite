import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, MessageSquareCode, Globe, MousePointer2, 
  Sparkles, ShieldCheck, Download, RefreshCw, ChevronRight,
  Target, Zap, ArrowUpRight, ArrowDownRight, Activity, Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useClientId } from '../../lib/useClientId';
import Markdown from 'react-markdown';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const { clientId } = useClientId();

  const fetchAnalytics = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await fetch('/v1/analytics', {
        headers: { 'x-client-id': clientId }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMsg = `Server error: ${res.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error?.message || errorJson.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.error?.message || data.message || 'Failed to fetch');
      }
    } catch (err: any) {
      console.error('[ANALYTICS_FETCH_ERROR]', err);
      setError(err.message === 'Failed to fetch' ? 'Unable to connect to analytics server. Please check your connection or wait for deployment to complete.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const runAIAnalysis = async () => {
    if (!stats) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/v1/analytics/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': clientId
        },
        body: JSON.stringify({ stats })
      });
      const data = await res.json();
      if (data.success) {
        setAiInsight(data.data.insight);
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse">Aggregating real-time database clusters...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-red-600 flex flex-col items-center gap-4">
        <ShieldCheck className="w-12 h-12 opacity-50" />
        <p className="font-bold">Analytics Engine Offline</p>
        <p className="text-sm opacity-80">{error || 'Data is currently unavailable'}</p>
        <button onClick={fetchAnalytics} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold">Retry Connect</button>
      </div>
    );
  }

  const { traffic, geo, pages, conversions } = stats;

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Main Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Business Intelligence
            <div className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] uppercase tracking-widest font-black rounded-full">Live</div>
          </h1>
          <p className="text-slate-500 mt-1">Deep analysis of customer behavior and conversion metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchAnalytics}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          label="Total Impressions" 
          value={traffic.totalVisits} 
          icon={Activity} 
          trend="+12.4%" 
          color="indigo"
          desc="Site-wide page views"
        />
        <MetricCard 
          label="Unique Visitors" 
          value={traffic.uniqueVisitors} 
          icon={Users} 
          trend="+8.1%" 
          color="violet"
          desc="Individual sessions recorded"
        />
        <MetricCard 
          label="Bot Engagement" 
          value={`${traffic.interactionRate.toFixed(1)}%`} 
          icon={MessageSquareCode} 
          trend="-2.4%" 
          color="pink"
          desc="Users interacting with AI"
        />
        <MetricCard 
          label="Total Conversions" 
          value={conversions.total} 
          icon={Target} 
          trend="+15.2%" 
          color="emerald"
          desc="Leads & bookings generated"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Geo Distribution */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-500" />
                Global Traffic
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Top performing regions</p>
            </div>
          </div>
          
          <div className="flex-1 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={geo.length > 0 ? geo : [{ name: 'No Data', value: 1 }]}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(geo.length > 0 ? geo : [{ name: 'No Data', value: 1 }]).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-8 space-y-3">
            {geo.slice(0, 4).map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="text-slate-900 font-bold">{item.value}</span>
              </div>
            ))}
            {geo.length === 0 && <p className="text-center text-xs text-slate-300 italic pt-4">Awaiting visitor geo-logs...</p>}
          </div>
        </div>

        {/* Page Performance */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MousePointer2 className="w-5 h-5 text-violet-500" />
                Popular Routes
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Most visited entry points & pages</p>
            </div>
            <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              Page Views
            </div>
          </div>

          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pages}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  fontWeight="bold"
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  fontWeight="bold"
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Bar 
                  dataKey="views" 
                  fill="#6366f1" 
                  radius={[8, 8, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Conversion Deep Dive & AI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Conversion Stats */}
        <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-200">
           <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
             <Zap className="w-6 h-6 text-indigo-200" />
             Conversion Architecture
           </h3>

           <div className="grid grid-cols-3 gap-6 mb-12">
             <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
               <div className="text-xs font-medium text-indigo-100 uppercase tracking-widest mb-1 italic">Bookings</div>
               <div className="text-3xl font-black">{conversions.bookings}</div>
             </div>
             <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
               <div className="text-xs font-medium text-indigo-100 uppercase tracking-widest mb-1 italic">Leads</div>
               <div className="text-3xl font-black">{conversions.leads}</div>
             </div>
             <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
               <div className="text-xs font-medium text-indigo-100 uppercase tracking-widest mb-1 italic">Contacts</div>
               <div className="text-3xl font-black">{conversions.contacts}</div>
             </div>
           </div>

           <div className="space-y-6">
             <div>
                <div className="flex justify-between text-sm mb-2 font-bold">
                  <span>Chatbot Influence</span>
                  <span>{traffic.interactionRate.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-indigo-900/30 rounded-full overflow-hidden border border-white/10 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${traffic.interactionRate}%` }}
                    className="h-full bg-gradient-to-r from-indigo-200 to-white"
                  />
                </div>
             </div>
             
             <div className="bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 -mr-4 -mt-4 opacity-5 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className="w-16 h-16" />
                </div>
                <h4 className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-4">Conversion Health</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="text-2xl font-black">{((conversions.total / (traffic.uniqueVisitors || 1)) * 100).toFixed(1)}%</div>
                    <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-tight">System-Wide Rate</div>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div className="flex-1 space-y-1">
                    <div className="text-2xl font-black">{conversions.total}</div>
                    <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-tight">Total Events</div>
                  </div>
                </div>
             </div>

             <p className="text-indigo-100 text-[11px] italic opacity-80 leading-relaxed font-medium">
               "Your conversion funnel is currently processed via the OminiCSR Distributed Network. Real data pulses are synchronized every 300 seconds."
             </p>
           </div>
        </div>

        {/* AI Analysis Component */}
        <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative">
            <div>
              <h3 className="font-bold text-white text-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                Strategic Intelligence
              </h3>
              <p className="text-xs text-slate-400 mt-1">Llama-3 Reasoning Engine • Real Data Context</p>
            </div>
            <button 
              onClick={runAIAnalysis}
              disabled={analyzing}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-xl shadow-indigo-600/20 active:scale-95"
            >
              {analyzing ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
              {analyzing ? 'Processing Cloud Clusters...' : 'Generate AI Insights'}
            </button>
          </div>

          <div className={cn(
            "flex-1 overflow-y-auto rounded-2xl relative min-h-[300px] transition-all duration-500",
            !aiInsight && "bg-slate-800/50 border border-slate-700/50 flex flex-col items-center justify-center p-8 text-center"
          )}>
            {aiInsight ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="prose prose-sm prose-invert max-w-none text-slate-300 p-4 scrollbar-thin scrollbar-thumb-slate-700"
              >
                <Markdown>{aiInsight}</Markdown>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-10 animate-pulse" />
                  <Brain className="w-16 h-16 text-indigo-500 mx-auto relative drop-shadow-2xl" />
                </div>
                <div className="space-y-3">
                  <p className="text-lg font-bold text-white tracking-tight">AI Reasoning Agent Standby</p>
                  <p className="text-sm text-slate-400 max-w-[280px] leading-relaxed mx-auto">
                    The platform has observed <span className="text-indigo-400 font-bold">{traffic.totalVisits}</span> traffic pulses. 
                    Click above to initiate deep data synthesis for strategic growth.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between text-[10px] font-black uppercase text-slate-500 tracking-[0.1em]">
            <span>Model: GROQ_DEFAULT_VERSATILE</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, trend, color, desc }: any) {
  const colorMap: any = {
    indigo: 'from-indigo-50 to-white text-indigo-600 border-indigo-100',
    violet: 'from-violet-50 to-white text-violet-600 border-violet-100',
    pink: 'from-pink-50 to-white text-pink-600 border-pink-100',
    emerald: 'from-emerald-50 to-white text-emerald-600 border-emerald-100',
  };

  const isUp = trend?.startsWith('+');

  return (
    <div className={cn(
      "p-6 rounded-3xl border shadow-sm bg-gradient-to-br flex flex-col gap-4 relative overflow-hidden group",
      colorMap[color] || colorMap.indigo
    )}>
      <div className="absolute top-0 right-0 p-8 -mr-6 -mt-6">
        <Icon className="w-20 h-20 opacity-[0.03] group-hover:scale-110 transition-transform duration-500" />
      </div>
      
      <div className="flex items-center justify-between relative">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
          color === 'indigo' && 'bg-indigo-600 text-white',
          color === 'violet' && 'bg-violet-600 text-white',
          color === 'pink' && 'bg-pink-600 text-white',
          color === 'emerald' && 'bg-emerald-600 text-white',
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg",
          isUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
        )}>
          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>

      <div className="relative">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 group-hover:text-indigo-600/50 transition-all">{label}</div>
        <div className="text-3xl font-black text-slate-900 tracking-tighter">{value}</div>
        <div className="text-[10px] text-slate-400 font-medium mt-1 italic">{desc}</div>
      </div>
    </div>
  );
}

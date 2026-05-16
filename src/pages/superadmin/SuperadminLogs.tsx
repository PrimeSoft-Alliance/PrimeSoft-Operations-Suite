import React, { useState, useEffect } from 'react';
import { History, Search, Download, Filter, User,Shield, Clock, Terminal } from 'lucide-react';

export default function SuperadminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/v1/super-admin/logs');
      const data = await res.json();
      setLogs(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) || 
    log.actor.toLowerCase().includes(search.toLowerCase()) ||
    (log.target && log.target.toLowerCase().includes(search.toLowerCase()))
  );

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-emerald-600 bg-emerald-50';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
    if (action.includes('UPDATE')) return 'text-amber-600 bg-amber-50';
    return 'text-indigo-600 bg-indigo-50';
  };

  if (loading) return <div className="p-8">Retrieving audit trails...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Audit Logs</h1>
          <p className="text-gray-500">Trace every privileged action across the entire platform.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
             <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-250px)]">
         <div className="p-6 border-b border-gray-100 flex gap-4 bg-gray-50/50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input 
                 placeholder="Search by action, actor, or target..."
                 className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                 value={search}
                 onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm flex items-center gap-2">
               <Filter className="w-4 h-4 text-gray-400" /> Filter
            </button>
         </div>

          <div className="flex-1 overflow-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-4">Timestamp</th>
                    <th className="px-8 py-4">Actor</th>
                    <th className="px-8 py-4">Action</th>
                    <th className="px-8 py-4">Target</th>
                    <th className="px-8 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50/50 transition">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-gray-400">
                            <Clock className="w-3 h-3" />
                            {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="w-3 h-3 text-slate-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{log.actor}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getActionColor(log.action)}`}>
                            {log.action}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-xs font-mono font-bold text-indigo-600">{log.target || 'GLOBAL'}</span>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-1.5">
                            <Shield className="w-3 h-3 text-emerald-500" />
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">SECURE</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredLogs.length === 0 && (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                 <Terminal className="w-12 h-12 text-gray-200" />
                 <div>
                   <h3 className="font-bold text-gray-900">Zero Logs Found</h3>
                   <p className="text-sm text-gray-500 max-w-xs mx-auto">Either no events have occurred or your current filter matches nothing.</p>
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}

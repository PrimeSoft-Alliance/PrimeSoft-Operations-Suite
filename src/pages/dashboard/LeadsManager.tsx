import { useState, useEffect } from 'react';
import { Eye, Search, Filter, Download, Trash2, Mail, Phone, Tag, MapPin, Calendar, ExternalLink, Zap, Database } from 'lucide-react';
import { useClientId } from '../../lib/useClientId';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function LeadsManager() {
  const { clientId: cidHook } = useClientId();
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (cidHook) {
      fetchLeads();
    }
  }, [cidHook]);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/v1/leads', {
        headers: { 'x-client-id': cidHook }
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[LEADS] Fetch failed:', res.status, errorText);
        setDebugInfo(`Error: ${res.status} ${errorText}`);
        return;
      }
      const data = await res.json();
      if (data && data.success) {
        setLeads(data.data || []);
        const business = data?.meta?.businessName || 'Business';
        const cid = data?.meta?.clientId || cidHook || '...';
        setDebugInfo(`Vault: ${business} | Database: ${cid} | Records: ${(data.data || []).length}`);
      } else {
        setDebugInfo(`API Error: ${data.error || 'Unknown'}`);
      }
    } catch (err) {
      console.error('[LEADS] Fetch catch:', err);
      setDebugInfo(`Offline / Error: ${(err as Error).message}`);
    }
  };

  const deleteLead = async (id: string) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await fetch(`/v1/leads/${id}`, {
        method: 'DELETE',
        headers: { 'x-client-id': cidHook }
      });
      fetchLeads();
    } catch (err) {}
  };

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      await fetch(`/v1/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-client-id': cidHook },
        body: JSON.stringify({ status })
      });
      fetchLeads();
    } catch (err) {}
  };

  const exportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['Name', 'Email', 'Phone', 'Form', 'Status', 'Date'];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + leads.map(e => [
          `${e.contactFirst || ''} ${e.contactLast || ''}`.trim(),
          e.contactEmail || '',
          e.contactPhone || '',
          e.formName || 'Unknown',
          e.status,
          new Date(e.createdAt).toLocaleDateString()
        ].map(val => `"${val}"`).join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "leads_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads.filter(l => 
    `${l.contactFirst} ${l.contactLast}`.toLowerCase().includes(search.toLowerCase()) ||
    (l.contactEmail || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.formName || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.source || '').toLowerCase().includes(search.toLowerCase())
  );

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'booking': return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100"><Zap className="w-3 h-3"/> Booking</span>;
      case 'contact': return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100"><Mail className="w-3 h-3"/> Contact</span>;
      case 'form': return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100"><Tag className="w-3 h-3"/> Form</span>;
      case 'multi-channel': return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100"><ExternalLink className="w-3 h-3"/> Multi-Channel</span>;
      default: return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-700 px-2 py-0.5 rounded-full border border-slate-100">Other</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lead Intelligence</h1>
          <p className="text-gray-500 font-medium">Synchronized view of consolidated customer acquisition signals.</p>
        </div>
        <button onClick={exportCSV} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 flex items-center gap-2 font-bold text-sm shadow-lg shadow-slate-200 transition-all active:scale-95">
          <Download className="w-4 h-4" /> Export Assets
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads, sources, or intelligence signals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-slate-100 border bg-slate-50/30 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
            />
          </div>
          <button className="px-6 py-3 border border-slate-100 rounded-2xl hover:bg-slate-50 flex items-center gap-2 font-bold text-slate-600 transition-colors">
            <Filter className="w-4 h-4" /> Filter Signals
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-[0.15em]">Entity / Origin</th>
                <th className="px-6 py-4 font-medium text-slate-400 text-[10px] uppercase tracking-[0.15em]">Intelligence Location</th>
                <th className="px-6 py-4 font-medium text-slate-400 text-[10px] uppercase tracking-[0.15em]">Lead Score</th>
                <th className="px-6 py-4 font-medium text-slate-400 text-[10px] uppercase tracking-[0.15em]">Activity</th>
                <th className="px-6 py-4 font-medium text-slate-400 text-[10px] uppercase tracking-[0.15em] text-right">Operation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLeads.map((lead) => (
                <tr key={lead._id} className="hover:bg-indigo-50/20 group transition-all cursor-pointer" onClick={() => setSelectedLead(lead)}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                        {(lead.contactFirst?.[0] || 'L')}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                          {lead.contactFirst} {lead.contactLast}
                          {getSourceBadge(lead.source)}
                        </div>
                        <div className="text-xs text-slate-400 font-medium flex items-center gap-3 mt-1">
                           <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-300"/> {lead.contactEmail || 'N/A'}</span>
                           <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-300"/> {lead.contactPhone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <MapPin className="w-4 h-4 text-indigo-400" />
                      {lead.location?.city || 'Unknown'}, {lead.location?.country || 'HQ'}
                    </div>
                    {lead.location?.region && <div className="text-[10px] text-slate-400 font-medium ml-6 uppercase tracking-wider">{lead.location.region}</div>}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead._id, e.target.value)}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest border-none rounded-full px-4 py-1.5 focus:ring-0 cursor-pointer shadow-sm",
                        lead.status === 'very-strong' ? 'bg-emerald-500 text-white' :
                        lead.status === 'qualified' ? 'bg-indigo-500 text-white' :
                        lead.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                        lead.status === 'archived' ? 'bg-slate-100 text-slate-400' :
                        'bg-amber-100 text-amber-700'
                      )}
                    >
                      <option value="new">New Node</option>
                      <option value="very-strong">Strong Pulse</option>
                      <option value="qualified">Qualified</option>
                      <option value="contacted">Contacted</option>
                      <option value="archived">Archived</option>
                    </select>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {format(new Date(lead.lastActivity || lead.createdAt), 'MMM d, yyyy')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium ml-5 italic">
                        {lead.formName || (lead.source === 'booking' ? 'Booking Portal' : lead.source === 'contact' ? 'Contact Desk' : 'Direct Signal')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-all">
                      <button onClick={() => setSelectedLead(lead)} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button onClick={() => deleteLead(lead._id)} className="p-2.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Database className="w-10 h-10 text-slate-200" />
                      <div className="text-slate-400 font-black uppercase tracking-widest text-xs">No Signal Detected</div>
                      <p className="text-slate-300 text-[10px] max-w-[200px] mx-auto font-medium leading-relaxed">
                        The consolidated lead intelligence pool is currently empty for identifier <span className="text-indigo-300">{cidHook}</span>.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden relative"
            >
              <div className="p-10 pb-0 flex justify-between items-start">
                <div className="flex gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-black text-3xl shadow-xl">
                    {selectedLead.contactFirst?.[0] || 'L'}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                       {getSourceBadge(selectedLead.source)}
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{selectedLead.status}</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                      {selectedLead.contactFirst} {selectedLead.contactLast}
                    </h2>
                    <div className="flex items-center gap-4 text-slate-400 font-semibold text-sm">
                      <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-indigo-400"/> {selectedLead.contactEmail}</span>
                      <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-indigo-400"/> {selectedLead.contactPhone}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLead(null)} 
                  className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all text-2xl font-light"
                >
                  &times;
                </button>
              </div>

              <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100 shadow-inner">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Signal Origin</h4>
                    <div className="space-y-4">
                       <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-indigo-500" />
                          <div>
                            <div className="text-sm font-black text-slate-800 tracking-tight">{selectedLead.location?.city || 'Unknown City'}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedLead.location?.country || 'Unknown Region'}</div>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-indigo-500" />
                          <div>
                            <div className="text-sm font-black text-slate-800 tracking-tight">{format(new Date(selectedLead.createdAt), 'MMM d, yyyy')}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{format(new Date(selectedLead.createdAt), 'HH:mm:ss')} UTC</div>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <ExternalLink className="w-5 h-5 text-indigo-500" />
                          <div>
                            <div className="text-sm font-black text-slate-800 tracking-tight">{selectedLead.formName || 'Direct Connection'}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Entry Node</div>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 text-center">Intelligence Tags</h4>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(selectedLead.tags || []).map((tag: string) => (
                        <span key={tag} className="px-3 py-1 bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 rounded-full shadow-sm hover:border-indigo-200 transition-colors">
                          {tag}
                        </span>
                      ))}
                      {(selectedLead.tags || []).length === 0 && <div className="text-[10px] text-slate-300 italic">No labels assigned.</div>}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                   <div className="flex items-center justify-between px-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data Payload</h4>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   </div>
                   <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/5 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {Object.entries(selectedLead.data || {}).map(([key, val]) => {
                         if (['firstName', 'lastName', 'email', 'phone', 'first_name', 'last_name', 'formId', 'formName', 'bookingId', 'contactId'].includes(key)) return null;
                         return (
                            <div key={key} className="space-y-1.5 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                              <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</div>
                              <div className="text-slate-800 text-sm font-bold leading-relaxed">{String(val)}</div>
                            </div>
                         )
                      })}
                      {Object.entries(selectedLead.data || {}).filter(([k]) => !['firstName', 'lastName', 'email', 'phone', 'first_name', 'last_name', 'formId', 'formName', 'bookingId', 'contactId'].includes(k)).length === 0 && (
                         <div className="text-center py-10 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                               <Database className="w-8 h-8" />
                            </div>
                            <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No extended attributes captured for this signal.</div>
                         </div>
                      )}
                   </div>
                </div>
              </div>

              <div className="p-10 pt-0 flex justify-end gap-4 bg-slate-50/50">
                 <button 
                  onClick={() => setSelectedLead(null)} 
                  className="px-8 py-3 bg-white border border-slate-100 text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                >
                  Close Terminal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {debugInfo && (
        <div className="mt-8 flex justify-center">
          <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-full flex items-center gap-3 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
              Diagnostic Audit: {debugInfo}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

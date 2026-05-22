import React, { useState, useEffect } from 'react';
import { useClientId } from '../../lib/useClientId';
import { Search, Filter, Download, Trash2, Mail, Phone, Tag, MapPin, Calendar, ExternalLink, Zap, Database, KanbanSquare, List, GripHorizontal, CheckCircle2, Building2, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

export default function LeadsManager() {
  const { clientId: cidHook } = useClientId();
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'kanban'|'list'>('kanban');

  const isSuperAdminPath = window.location.pathname.startsWith('/superadmin');

  useEffect(() => {
    if (cidHook || isSuperAdminPath) fetchLeads();
  }, [cidHook, isSuperAdminPath]);

  const fetchLeads = async () => {
    try {
      const targetCid = isSuperAdminPath ? 'all' : cidHook;
      const res = await fetch('/v1/leads', { headers: { 'x-client-id': targetCid } });
      const data = await res.json();
      if (data.success) {
         setLeads(data.data.map((l:any) => ({...l, stage: l.stage || 'New'})));
      }
    } catch(err) {}
  };

  const deleteLead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Eradicate entity record?')) return;
    try {
      await fetch(`/v1/leads/${id}`, { method: 'DELETE', headers: { 'x-client-id': cidHook }});
      fetchLeads();
    } catch(err) {}
  };

  const updateStage = async (id: string, stage: string) => {
     try {
         await fetch(`/v1/leads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-client-id': cidHook },
            body: JSON.stringify({ stage })
         });
         fetchLeads();
     } catch (e) {}
  };

  const filteredLeads = leads.filter(l => 
    `${l.contactFirst || ''} ${l.contactLast || ''} ${l.company || ''} ${l.contactEmail || ''}`.toLowerCase().includes((search || '').toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-6rem)] -m-6 flex flex-col bg-slate-50 relative overflow-hidden animate-in fade-in duration-300">
       <div className="p-8 border-b border-slate-200 bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 z-10 relative">
          <div className="space-y-1">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                Leads & Public Inquiries <span className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full uppercase tracking-widest">{filteredLeads.length} Records</span>
             </h1>
             <p className="text-slate-500 font-medium">Command center for structural opportunity ingestion, public form inquiries, and site contacts.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-72">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                   type="text" 
                   value={search} onChange={e=>setSearch(e.target.value)}
                   placeholder="Scan entities..." 
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                />
             </div>
             <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200/50 hidden sm:flex">
                <button onClick={() => setViewMode('kanban')} className={cn("p-2 rounded-lg transition-all", viewMode==='kanban' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-900')}><KanbanSquare className="w-5 h-5"/></button>
                <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-all", viewMode==='list' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-900')}><List className="w-5 h-5"/></button>
             </div>
          </div>
       </div>

       <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
          {viewMode === 'kanban' ? (
             <div className="h-full flex p-6 gap-6 w-max items-start">
               {STAGES.map((stage) => {
                  const stageLeads = filteredLeads.filter(l => l.stage === stage);
                  return (
                     <div key={stage} className="w-80 flex flex-col max-h-full bg-slate-100/50 rounded-[2rem] border border-slate-200 p-4">
                        <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200 mb-4 sticky top-0 bg-slate-100/50 backdrop-blur-md z-10 rounded-xl">
                           <h3 className="font-black text-slate-700 tracking-tight text-lg uppercase">{stage}</h3>
                           <span className="bg-slate-200 text-slate-600 text-xs font-black px-2 py-1 rounded-lg">{stageLeads.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar px-2 pb-10">
                           {stageLeads.map(lead => (
                              <motion.div layoutId={lead._id} key={lead._id} onClick={() => setSelectedLead(lead)} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer group">
                                 <div className="flex justify-between items-start mb-3">
                                    <div className={cn(
                                       "w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md transform group-hover:scale-110 transition-transform",
                                       lead.score > 80 ? 'bg-rose-500' : lead.score > 50 ? 'bg-amber-500' : 'bg-slate-800'
                                    )}>
                                       {lead.contactFirst?.[0] || 'X'}
                                    </div>
                                    <div className="relative">
                                       <button onClick={(e) => deleteLead(lead._id, e)} className="p-2 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all bg-white shadow-sm border border-slate-100">
                                          <Trash2 className="w-4 h-4"/>
                                       </button>
                                    </div>
                                 </div>
                                 <h4 className="font-bold text-slate-900 tracking-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                    {lead.contactFirst} {lead.contactLast}
                                 </h4>
                                 <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1 mb-4 flex items-center gap-1.5 truncate">
                                    <Building2 className="w-3 h-3" /> {lead.company || lead.source || 'Direct entity'}
                                 </p>

                                 <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                    {lead.score > 0 ? (
                                       <div className="flex items-center gap-1 text-xs font-black tracking-widest text-rose-500 bg-rose-50 px-2 py-1 rounded-full"><Zap className="w-3 h-3"/> Score {lead.score}</div>
                                    ) : (
                                       <div className="flex items-center gap-1 text-[10px] font-black tracking-widest text-slate-400"><Clock className="w-3 h-3"/> {format(new Date(lead.createdAt||Date.now()), 'MMM d')}</div>
                                    )}
                                    <select 
                                       value={lead.stage} 
                                       onChange={e => { e.stopPropagation(); updateStage(lead._id, e.target.value); }} 
                                       onClick={e => e.stopPropagation()} 
                                       className="text-[10px] border-none rounded-lg bg-slate-50 font-black uppercase tracking-widest text-indigo-600 focus:ring-0 cursor-pointer shadow-sm hover:bg-indigo-50 py-1 pl-2 pr-6"
                                    >
                                       {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                 </div>
                              </motion.div>
                           ))}
                           {stageLeads.length === 0 && (
                              <div className="border-2 border-dashed border-slate-200 rounded-2xl h-24 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                 Empty zone
                              </div>
                           )}
                        </div>
                     </div>
                  )
               })}
             </div>
          ) : (
             <div className="p-4 sm:p-8 h-full overflow-y-auto w-full">
               <div className="bg-white border text-left border-slate-200 rounded-3xl sm:rounded-[2rem] shadow-xl overflow-hidden min-w-full">
                  <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[800px]">
                     <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                           <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest whitespace-nowrap">Entity Signature</th>
                           <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest whitespace-nowrap">Stage Vector</th>
                           <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest whitespace-nowrap">Intelligence Location</th>
                           <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest whitespace-nowrap">Calculated Value</th>
                           <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Ops</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {filteredLeads.map(lead => (
                           <tr key={lead._id} onClick={()=>setSelectedLead(lead)} className="hover:bg-indigo-50/30 cursor-pointer group transition-colors">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-900 text-white flex justify-center items-center font-black group-hover:scale-110 transition-transform">{lead.contactFirst?.[0]||'X'}</div>
                                    <div className="min-w-0">
                                       <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{lead.contactFirst} {lead.contactLast}</div>
                                       <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex flex-wrap gap-x-4 gap-y-1 mt-1 truncate">
                                          <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {lead.contactEmail||'N/A'}</span>
                                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3"/> {lead.company||'Independent'}</span>
                                       </div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <select 
                                       value={lead.stage} 
                                       onChange={e => { e.stopPropagation(); updateStage(lead._id, e.target.value); }} 
                                       onClick={e => e.stopPropagation()} 
                                       className="text-xs border-none rounded-xl bg-white font-black uppercase tracking-widest text-indigo-600 focus:ring-0 cursor-pointer shadow-sm hover:bg-slate-50 py-2 pl-4 pr-8 border border-slate-100 min-w-[140px]"
                                    >
                                       {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-600 whitespace-nowrap">
                                 {lead.location?.city || 'Unknown Node'}, {lead.location?.country || ''}
                              </td>
                              <td className="px-6 py-4">
                                 <div className="font-mono text-sm text-slate-900 bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg inline-block shadow-inner">${lead.value || 0}</div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <button onClick={(e) => deleteLead(lead._id, e)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
                  </div>
               </div>
             </div>
          )}
       </div>

       {/* Detail Inspection Modal */}
       <AnimatePresence>
          {selectedLead && (
             <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-stretch md:items-center justify-end md:justify-center z-50 p-0 md:p-6 lg:p-12">
                <motion.div 
                   initial={{opacity: 0, x: 100}} animate={{opacity: 1, x: 0}} exit={{opacity: 0, x: 100}}
                   className="bg-white w-full md:max-w-4xl h-full md:h-auto md:max-h-full rounded-none md:rounded-[3rem] shadow-2xl flex flex-col relative overflow-hidden"
                >
                   <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                      <div className="flex gap-6">
                         <div className="w-20 h-20 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-black text-4xl shadow-xl">{selectedLead.contactFirst?.[0]||'X'}</div>
                         <div className="space-y-2">
                             <div className="flex items-center gap-3">
                                <span className="bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">{selectedLead.stage}</span>
                                {selectedLead.score > 0 && <span className="bg-rose-100 text-rose-700 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1"><Zap className="w-3 h-3"/> Score: {selectedLead.score}</span>}
                             </div>
                             <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{selectedLead.contactFirst} {selectedLead.contactLast}</h2>
                             <div className="text-slate-500 font-bold flex gap-4 text-sm">
                                <span className="flex items-center gap-1"><Mail className="w-4 h-4 text-slate-400"/> {selectedLead.contactEmail || 'No Email'}</span>
                                <span className="flex items-center gap-1"><Building2 className="w-4 h-4 text-slate-400"/> {selectedLead.company || 'No Company Data'}</span>
                             </div>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => window.open(`mailto:${selectedLead.contactEmail}`)} className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"><Mail className="w-5 h-5"/></button>
                        <button onClick={() => setSelectedLead(null)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-sm">&times;</button>
                      </div>
                   </div>

                   <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-8">
                         <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2"><Database className="w-4 h-4"/> Extracted Payload Data</h3>
                            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 grid grid-cols-2 gap-6">
                               <div className="col-span-2">
                                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Source Node</div>
                                  <div className="font-bold text-slate-900">{selectedLead.formName || selectedLead.source}</div>
                               </div>
                               {Object.entries(selectedLead.data||{}).map(([k,v]) => {
                                  if(['firstName','lastName','email','phone'].includes(k)) return null;
                                  return (
                                     <div key={k} className="col-span-2 sm:col-span-1 border-t border-slate-200 pt-4">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{k.replace(/([A-Z])/g,' $1').trim()}</div>
                                        <div className="font-bold text-slate-900 text-sm leading-relaxed">{String(v)}</div>
                                     </div>
                                  )
                               })}
                            </div>
                         </div>

                         <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2"><Clock className="w-4 h-4"/> Activity Lifecycle</h3>
                            <div className="space-y-4">
                               {(selectedLead.activities || []).length > 0 ? (
                                 (selectedLead.activities as any[]).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((activity, idx) => (
                                   <div key={idx} className="flex gap-4 group">
                                      <div className="flex flex-col items-center">
                                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            {activity.type === 'email' ? <Mail className="w-3 h-3"/> : <Zap className="w-3 h-3"/>}
                                         </div>
                                         {idx < (selectedLead.activities.length - 1) && <div className="w-0.5 h-full bg-slate-100 my-1"></div>}
                                      </div>
                                      <div className="pb-6">
                                         <div className="text-xs font-black text-slate-900 mb-1">{activity.description}</div>
                                         <div className="text-[10px] font-bold text-slate-400 uppercase">{format(new Date(activity.date), 'MMM d, yyyy • p')}</div>
                                      </div>
                                   </div>
                                 ))
                               ) : (
                                 <div className="p-8 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No activities recorded yet.</p>
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>

                      <div className="space-y-8">
                         <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4"/> Intelligence Matrix</h3>
                            <div className="bg-white rounded-[2rem] border border-slate-200 p-6 space-y-4 shadow-xl shadow-slate-200/40">
                               <div>
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Origin City</div>
                                  <div className="font-bold text-slate-900">{selectedLead.location?.city || 'Unknown'}</div>
                               </div>
                               <div className="border-t border-slate-100 pt-3">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Region</div>
                                  <div className="font-bold text-slate-900">{selectedLead.location?.country || 'Unknown'} - {selectedLead.location?.region}</div>
                               </div>
                               <div className="border-t border-slate-100 pt-3">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IP Identifier</div>
                                  <div className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block">{selectedLead.location?.ip || 'Unresolved'}</div>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  );
}

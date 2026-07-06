import React, { useState, useEffect } from 'react';
import { Phone, Clock, User, CheckCircle2, MoreHorizontal, Filter, Search, ArrowRight, UserPlus, FileText, Tag, MessageSquare } from 'lucide-react';
import { useClientId } from '../../lib/useClientId';

interface MissedCall {
  _id: string;
  callerNumber: string;
  timestamp: string;
  status: 'new' | 'reached_out' | 'converted' | 'ignored' | 'archived';
  contactId?: {
    _id: string;
    name: string;
    email: string;
  };
}

export default function MissedCalls() {
  const { clientId } = useClientId();
  const [calls, setCalls] = useState<MissedCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new');
  const [selectedCall, setSelectedCall] = useState<MissedCall | null>(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [outreachDetails, setOutreachDetails] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    outcome: 'successful',
    leadStage: 'new'
  });

  useEffect(() => {
    if (clientId) fetchCalls();
  }, [clientId, filter]);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/v1/omni/missed-calls?status=${filter}`, {
        headers: { 'x-client-id': clientId! }
      });
      const data = await res.json();
      if (data.success) setCalls(data.data.calls);
    } catch (err) {
      console.error('Failed to fetch missed calls');
    } finally {
      setLoading(false);
    }
  };

  const handleReachOut = (call: MissedCall) => {
    setSelectedCall(call);
    setOutreachDetails({
        ...outreachDetails,
        phone: call.callerNumber,
        name: call.contactId?.name || ''
    });
    setShowOutreachModal(true);
  };

  const submitOutreach = async () => {
    if (!selectedCall) return;
    try {
      const res = await fetch(`/v1/omni/missed-calls/${selectedCall._id}/reached-out`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-client-id': clientId!
        },
        body: JSON.stringify(outreachDetails)
      });
      if (res.ok) {
        setShowOutreachModal(false);
        setSelectedCall(null);
        fetchCalls();
      }
    } catch (err) {
      console.error('Outreach submission failed');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Miss Calls</h1>
          <p className="text-slate-500 text-sm font-medium">Track and follow up on missed business opportunities.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start sm:self-center">
            {['new', 'reached_out', 'archived'].map(s => (
                <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                    {s.replace('_', ' ')}
                </button>
            ))}
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search by number or name..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                />
            </div>
            <button className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all">
                <Filter className="w-4 h-4" />
            </button>
        </div>

        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="p-20 text-center text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Synchronizing Records...</div>
          ) : calls.length === 0 ? (
            <div className="p-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Phone className="w-8 h-8" />
                </div>
                <h3 className="text-slate-800 font-black">No Missed Calls</h3>
                <p className="text-slate-500 text-sm font-medium">Sit back! You've answered every call so far.</p>
            </div>
          ) : (
            calls.map(call => (
              <div 
                key={call._id} 
                className="p-4 hover:bg-slate-50 transition-all cursor-pointer group flex items-center justify-between"
                onClick={() => handleReachOut(call)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${call.status === 'new' ? 'bg-amber-500' : 'bg-green-500'}`}>
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">{call.contactId?.name || call.callerNumber}</h4>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(call.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${call.status === 'new' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {call.status}
                  </span>
                  <button className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showOutreachModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
               <h2 className="text-xl font-black text-slate-800">I Have Reached Out</h2>
               <button onClick={() => setShowOutreachModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors font-black">Esc</button>
             </div>
             <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Name</label>
                   <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 group focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                     <User className="w-4 h-4 text-slate-400 mr-2" />
                     <input 
                      value={outreachDetails.name}
                      onChange={e => setOutreachDetails({...outreachDetails, name: e.target.value})}
                      className="bg-transparent border-none outline-none text-sm font-bold w-full"
                      placeholder="Jane Doe"
                     />
                   </div>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Phone</label>
                   <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 group focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                     <Phone className="w-4 h-4 text-slate-400 mr-2" />
                     <input 
                      value={outreachDetails.phone}
                      onChange={e => setOutreachDetails({...outreachDetails, phone: e.target.value})}
                      className="bg-transparent border-none outline-none text-sm font-bold w-full"
                      placeholder="+123456789"
                     />
                   </div>
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email</label>
                 <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 group focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                   <FileText className="w-4 h-4 text-slate-400 mr-2" />
                   <input 
                    value={outreachDetails.email}
                    onChange={e => setOutreachDetails({...outreachDetails, email: e.target.value})}
                    className="bg-transparent border-none outline-none text-sm font-bold w-full"
                    placeholder="jane@example.com"
                   />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Lead Stage</label>
                   <select 
                    value={outreachDetails.leadStage}
                    onChange={e => setOutreachDetails({...outreachDetails, leadStage: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                   >
                     <option value="new">New Lead</option>
                     <option value="warm">Warm Lead</option>
                     <option value="demo">Demo Scheduled</option>
                     <option value="closing">Closing</option>
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Outcome</label>
                   <select 
                    value={outreachDetails.outcome}
                    onChange={e => setOutreachDetails({...outreachDetails, outcome: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                   >
                     <option value="successful">Successfully Spoke</option>
                     <option value="voicemail">Left Voicemail</option>
                     <option value="busy">Was Busy / No Answer</option>
                     <option value="wrong_number">Wrong Number</option>
                   </select>
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Outreach Notes</label>
                 <textarea 
                  value={outreachDetails.notes}
                  onChange={e => setOutreachDetails({...outreachDetails, notes: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none h-24 focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Summarize the conversation here..."
                 />
               </div>
             </div>
             <div className="p-6 bg-slate-50 flex gap-3">
               <button 
                onClick={() => setShowOutreachModal(false)}
                className="flex-1 py-3 px-6 rounded-2xl text-slate-600 font-bold hover:bg-slate-200 transition-all"
               >
                 Cancel
               </button>
               <button 
                onClick={submitOutreach}
                className="flex-1 py-3 px-6 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
               >
                 <CheckCircle2 className="w-5 h-5" />
                 Save Contact & Mark Done
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

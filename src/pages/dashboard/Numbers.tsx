import React, { useState, useEffect } from 'react';
import { Search, Globe, Shield, Zap, Plus, Phone, MessageSquare, Filter, CreditCard, ChevronRight } from 'lucide-react';
import { useClientId } from '../../lib/useClientId';

export default function Numbers() {
  const { clientId } = useClientId();
  const [activeNumbers, setActiveNumbers] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useState({ country: 'US', areaCode: '' });
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (clientId) fetchMyNumbers();
  }, [clientId]);

  const fetchMyNumbers = async () => {
    try {
      const res = await fetch('/v1/omni/numbers', { headers: { 'x-client-id': clientId! } });
      const data = await res.json();
      if (data.success) setActiveNumbers(data.data);
    } catch (e) {}
  };

  const searchNewNumbers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/v1/omni/numbers/search?country=${searchParams.country}&areaCode=${searchParams.areaCode}`, {
        headers: { 'x-client-id': clientId! }
      });
      const data = await res.json();
      if (data.success) setAvailableNumbers(data.data);
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const buyNumber = async (num: string) => {
    setPurchasing(true);
    try {
      const res = await fetch('/v1/omni/numbers/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify({ phoneNumber: num })
      });
      if (res.ok) {
        fetchMyNumbers();
        setAvailableNumbers([]);
      }
    } catch (e) {} finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Phone Numbers</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Provision text-enabled virtual numbers for your business.</p>
        </div>
      </div>

      {/* Active Numbers Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-500" /> Your Provisioned Numbers
            </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeNumbers.map(num => (
             <div key={num._id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between group hover:border-indigo-300 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-6">
                   <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Phone className="w-6 h-6" />
                   </div>
                   <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded-lg tracking-widest">Active</span>
                </div>
                <div className="mb-6">
                   <div className="text-2xl font-black text-slate-800 tracking-tight mb-1">{num.e164Number}</div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {num.telnyxNumberId}</div>
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                   <div className="p-2 bg-slate-50 text-slate-400 rounded-xl"><MessageSquare className="w-4 h-4" /></div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SMS Enabled</span>
                </div>
             </div>
          ))}
          <button 
            onClick={() => {}}
            className="border-2 border-dashed border-slate-200 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all group min-h-[220px]"
          >
            <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-all group-hover:scale-110">
                <Plus className="w-6 h-6" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Buy New Number</span>
          </button>
        </div>
      </section>

      {/* Buying Interface */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden mt-8">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-black mb-3 leading-tight tracking-tight">Scale Your Reach with Global Numbers.</h2>
           <p className="text-sm font-medium text-slate-400 mb-8 max-w-xl leading-relaxed">Purchase text-enabled numbers instantly. No paperwork, just instant connectivity for WhatsApp and SMS follow-ups.</p>
           
           <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 sm:py-4 flex items-center group focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:bg-white/10 transition-all">
                 <Globe className="w-5 h-5 text-slate-400 mr-3 group-focus-within:text-white" />
                 <input 
                  value={searchParams.country}
                  onChange={e => setSearchParams({...searchParams, country: e.target.value})}
                  className="bg-transparent border-none outline-none text-sm font-bold w-full text-white placeholder:text-slate-500"
                  placeholder="US"
                 />
              </div>
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 sm:py-4 flex items-center group focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:bg-white/10 transition-all">
                 <Zap className="w-5 h-5 text-slate-400 mr-3 group-focus-within:text-white" />
                 <input 
                  value={searchParams.areaCode}
                  onChange={e => setSearchParams({...searchParams, areaCode: e.target.value})}
                  className="bg-transparent border-none outline-none text-sm font-bold w-full text-white placeholder:text-slate-500"
                  placeholder="Area Code (Optional)"
                 />
              </div>
              <button 
                onClick={searchNewNumbers}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 w-full sm:w-auto"
              >
                {loading ? 'Searching...' : 'Explore'}
              </button>
           </div>
        </div>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full translate-x-20 -translate-y-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/5 blur-3xl rounded-full -translate-x-32 translate-y-32"></div>
      </section>

      {/* Available Numbers Grid */}
      {availableNumbers.length > 0 && (
         <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500 pt-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">Search Results ({availableNumbers.length})</h3>
                <button onClick={() => setAvailableNumbers([])} className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">Clear</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {availableNumbers.map(n => (
                    <div key={n.phone_number} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-lg transition-all hover:border-indigo-300">
                        <div className="text-lg font-black text-slate-800 tracking-tight">{n.phone_number}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                           {n.features.map((f: string) => (
                             <span key={f} className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-md tracking-wider">{f}</span>
                           ))}
                        </div>
                        <button 
                            onClick={() => buyNumber(n.phone_number)}
                            disabled={purchasing}
                            className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-auto"
                        >
                            <CreditCard className="w-4 h-4" />
                            {purchasing ? 'Processing...' : 'Buy Now'}
                        </button>
                    </div>
                ))}
            </div>
         </div>
      )}
    </div>
  );
}

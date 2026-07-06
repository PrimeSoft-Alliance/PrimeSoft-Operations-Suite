import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, MessageSquare, Mic, Activity, Plus, Search, 
  Settings, CheckCircle2, AlertTriangle, Key, Hash, Smartphone,
  PhoneMissed, UserCheck, ShieldCheck
} from 'lucide-react';
import { useClientId } from '../../../lib/useClientId';

export default function TelnyxCenter() {
  const { clientId } = useClientId();
  const [activeTab, setActiveTab] = useState<'numbers' | 'calling' | 'messaging' | 'whatsapp' | 'missed-calls'>('numbers');
  
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms & Modals
  const [showSearch, setShowSearch] = useState(false);
  const [searchParams, setSearchParams] = useState({ countryCode: 'US', features: ['sms', 'voice'] });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchNumbers();
    }
  }, [clientId]);

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/omni/numbers', {
        headers: { 'x-client-id': clientId! }
      });
      const data = await res.json();
      if (data.success) {
        setNumbers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const res = await fetch(`/v1/omni/numbers/search?country=${searchParams.countryCode}`, {
        headers: { 'x-client-id': clientId! }
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const purchaseNumber = async (num: any) => {
    if (!confirm(`Are you sure you want to purchase ${num.phoneNumber} for $${num.monthlyCost}/mo?`)) return;
    try {
      const res = await fetch('/v1/omni/numbers/purchase', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': clientId!
        },
        body: JSON.stringify({
          phoneNumber: num.phoneNumber,
          capabilities: num.capabilities
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Number purchased successfully!');
        setShowSearch(false);
        fetchNumbers();
      } else {
        alert('Purchase failed: ' + data.error?.message);
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            Telnyx Integrations
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-1">
            Global infrastructure is active via securely vaulted system credentials. Manage your inbound and outbound capabilities for Calling, Messaging, WhatsApp, and Missed Calls globally.
          </p>
        </div>
        <div className="px-3 py-1 text-[10px] uppercase font-black rounded-lg border flex items-center gap-2 bg-emerald-50 border-emerald-200 text-emerald-700">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Globally Authenticated
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto hide-scrollbar whitespace-nowrap">
        {[
          { id: 'numbers', label: 'Numbers' },
          { id: 'calling', label: 'Calling' },
          { id: 'messaging', label: 'Messaging' },
          { id: 'whatsapp', label: 'WhatsApp' },
          { id: 'missed-calls', label: 'Missed Calls' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white shadow-sm text-slate-900' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="py-2">
        {/* NUMBERS TAB */}
        {activeTab === 'numbers' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-900 pl-3">Active Phone Numbers</h3>
              <button 
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                <Plus className="w-4 h-4" /> Buy Number
              </button>
            </div>

            {showSearch && (
              <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" /> Search Available Numbers
                </h4>
                <form onSubmit={handleSearchNumbers} className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Country Code</label>
                    <select 
                      className="w-full border border-slate-200 rounded-xl p-3 text-xs"
                      value={searchParams.countryCode}
                      onChange={e => setSearchParams({...searchParams, countryCode: e.target.value})}
                    >
                      <option value="US">United States (+1)</option>
                      <option value="GB">United Kingdom (+44)</option>
                      <option value="CA">Canada (+1)</option>
                      <option value="AU">Australia (+61)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      type="submit" 
                      disabled={searching}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                      {searching ? 'Iterating...' : 'Search Inventory'}
                    </button>
                  </div>
                </form>

                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {searchResults.map((num, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-150">
                        <div>
                          <p className="font-mono text-sm font-bold text-slate-900">{num.phoneNumber}</p>
                          <div className="flex gap-2 mt-1">
                            {num.capabilities.map((cap: string) => (
                              <span key={cap} className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] uppercase font-bold">{cap}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-slate-700">${num.monthlyCost}/mo</span>
                          <button 
                            onClick={() => purchaseNumber(num)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider"
                          >
                            Purchase
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {loading ? (
                <div className="text-xs text-slate-400 p-4 font-mono">Loading inventory...</div>
              ) : numbers.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center">
                  <Hash className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-800 mb-1">No Phone Numbers found.</p>
                  <p className="text-xs text-slate-500">You must search and purchase a host number to configure calling and SMS circuits.</p>
                </div>
              ) : (
                numbers.map((num) => (
                  <div key={num._id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 rounded-xl">
                        <Phone className="w-5 h-5 text-slate-700" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-slate-900">{num.phoneNumber}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider">
                          Status: <span className="text-emerald-600">{num.status}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-[10px] font-black uppercase transition-all">Configure</button>
                      <button className="px-3 py-1.5 border border-red-100 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-black uppercase transition-all">Release</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CALLING TAB */}
        {activeTab === 'calling' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-900 pl-3">Inbound & Outbound Calling</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-500" /> Inbound Routing
                </h4>
                <p className="text-xs text-slate-500">Incoming calls will be natively picked up by the AI Orchestrator running in the background.</p>
                
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">AI Call Reception</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Allow AI to pick up customer calls automatically.</p>
                    </div>
                    <div className="w-10 h-5 bg-emerald-500 rounded-full relative shadow-inner cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-400" /> Outbound Call Settings
                </h4>
                <p className="text-xs text-slate-500">Configure default caller ID for callbacks and AI proactive calls.</p>
                <label className="block space-y-1 mt-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Default Host Caller ID</span>
                  <select className="w-full border border-slate-200 rounded-xl p-3 text-xs">
                    <option>Select a claimed number...</option>
                    {numbers.map(n => <option key={n._id} value={n.phoneNumber}>{n.phoneNumber}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* MESSAGING TAB */}
        {activeTab === 'messaging' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-900 pl-3">Messaging (SMS / MMS)</h3>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" /> OmniChannel Routing
              </h4>
              <p className="text-xs text-slate-500 max-w-xl">
                SMS and MMS messages are routed directly into the Timeline and handled by the AI Orchestrator seamlessly.
              </p>
              
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs overflow-x-auto">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Pipeline Active: Inbound messages are synced.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WHATSAPP TAB */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-900 pl-3">WhatsApp Business API</h3>
                <p className="text-[11px] text-slate-500 pl-4">Telnyx Official Meta API Setup</p>
              </div>
              <button className="flex items-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors">
                <Smartphone className="w-4 h-4" /> Connect WABA
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 border-b border-slate-200 pb-8">
              <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50">
                <h4 className="text-sm font-black text-slate-800 mb-2">Connect via Embedded Signup</h4>
                <p className="text-xs text-slate-500 mb-6">Launch the official Facebook popup to securely bind this tenant's WhatsApp Business Account (WABA) to Telnyx, skipping manual approvals.</p>
                <ul className="text-[10px] font-bold text-slate-600 uppercase tracking-widest space-y-2 mb-6">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Official API Compliance</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Supported by AI Orchestrator</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Native UI Messaging</li>
                </ul>
              </div>

              <div className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Activity className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-800">No WABA Connected</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Please launch the flow above</p>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-900 pl-3">Template Management</h3>
                <button className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-black uppercase text-[10px] rounded-lg tracking-wider">
                  + Sync Templates from Meta
                </button>
              </div>
              <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center shadow-sm bg-white">
                 <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                 <p className="text-sm font-bold text-slate-800 mb-1">No Templates Found</p>
                 <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">Connect your WABA account above first, then sync your approved templates to use them in outbound AI campaigns.</p>
              </div>
            </div>
          </div>
        )}

        {/* MISSED CALLS TAB */}
        {activeTab === 'missed-calls' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 border-l-4 border-slate-900 pl-3">Missed Call Logic</h3>
                <p className="text-[11px] text-slate-500 pl-4">Automatically handle unanswered calls</p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="flex items-start gap-4 pb-6 border-b border-slate-100">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                  <PhoneMissed className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900">Missed Call SMS Auto-Responder</h4>
                  <p className="text-xs text-slate-500">When a customer calls and we are unable to answer (neither agent nor AI), immediately dispatch a follow-up text message to their number.</p>
                </div>
                <div className="ml-auto w-10 h-5 bg-emerald-500 rounded-full relative shadow-inner cursor-pointer shrink-0">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">SMS Auto-Responder Template</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium text-slate-700 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  defaultValue="Hi there, I saw we just missed a call from you. Is there anything I can help you with via text?"
                />
                <p className="text-[10px] text-slate-400">This message will be dispatched from your active Telnyx number.</p>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}


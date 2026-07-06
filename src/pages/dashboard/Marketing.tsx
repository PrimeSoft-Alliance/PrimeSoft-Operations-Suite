import React, { useState, useEffect } from 'react';
import { Send, Mail, MessageSquare, Zap, Users, BarChart3, Plus, Calendar, Target, RotateCcw, Copy, Search, Filter, X, ChevronRight, ChevronLeft, Trash2, CheckCircle2, RefreshCw, Upload, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useClientId } from '../../lib/useClientId';

export default function Marketing() {
  const { clientId } = useClientId();
  const [view, setView] = useState('campaigns'); // 'campaigns' | 'segments' | 'analytics'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  
  // Create Campaign Form
  const [form, setForm] = useState({
    name: '',
    type: 'email', // 'email' | 'whatsapp' | 'telegram' | 'sms'
    message: '',
    imageUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [polishing, setPolishing] = useState(false);

  const handlePolishMessage = async () => {
    if (!form.message.trim() || polishing) return;
    setPolishing(true);
    try {
      const res = await fetch('/v1/ai/format-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify({
          message: form.message,
          instruction: 'Make it a highly engaging, persuasive, and professional marketing message for the specified channel.'
        })
      });
      const data = await res.json();
      if (data.success && data.data.formattedText) {
        setForm(f => ({ ...f, message: data.data.formattedText }));
      }
    } catch (err) {
      console.error('Polish failed:', err);
    } finally {
      setPolishing(false);
    }
  };

  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);

  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [campaigns]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 150;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };

  useEffect(() => {
    if (selectedCampaign) {
      window.history.pushState({ campaignDetail: true }, '');
    }
    
    const handlePopState = (e: PopStateEvent) => {
      if (selectedCampaign) {
        setSelectedCampaign(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/contacts/campaigns', { headers: { 'x-client-id': clientId } });
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('/v1/contacts', { headers: { 'x-client-id': clientId } });
      const data = await res.json();
      if (data.success) {
        setContacts(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDeleteCampaigns = async () => {
    if (selectedCampaigns.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedCampaigns.length} selected campaigns?`)) return;
    try {
      const res = await fetch('/v1/contacts/campaigns', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId
        },
        body: JSON.stringify({ ids: selectedCampaigns })
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(prev => prev.filter(c => !selectedCampaigns.includes(c._id || c.id)));
        setSelectedCampaigns([]);
      } else {
        alert(data.error?.message || 'Failed to delete selected campaigns');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during campaign deletion.');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const res = await fetch(`/v1/contacts/campaigns/${id}`, {
        method: 'DELETE',
        headers: { 'x-client-id': clientId }
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(prev => prev.filter(c => (c._id || c.id) !== id));
        setSelectedCampaigns(prev => prev.filter(item => item !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchCampaigns();
      fetchContacts();
    }
  }, [clientId]);

  const handleInitiateBroadcast = async () => {
    if (!form.name || !form.message || selectedContacts.length === 0) {
      alert('Please fill in all fields and select at least one recipient.');
      return;
    }

    setSubmitting(true);
    try {
      const recipients = contacts
        .filter(c => selectedContacts.includes(c.id || c._id))
        .map(c => ({
          customerJid: form.type === 'email' ? c.email : 
                       (form.type === 'whatsapp' || form.type === 'sms') ? c.whatsappJid || c.phone :
                       c.telegramChatId || c.telegramUsername,
          platform: form.type
        }));

      const res = await fetch('/v1/contacts/mass-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId
        },
        body: JSON.stringify({
          recipients,
          message: form.message,
          name: form.name,
          type: form.type,
          imageUrl: form.imageUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Broadcast initiated successfully!');
        setIsCreateModalOpen(false);
        setForm({ name: '', type: 'email', message: '', imageUrl: '' });
        setSelectedContacts([]);
        fetchCampaigns(); // Auto-refresh campaigns instantly!
      } else {
        alert('Failed to initiate broadcast: ' + data.error?.message);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during broadcast.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(c => c.id || c._id));
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Marketing Center</h1>
          <p className="text-slate-500 text-sm font-medium">Broadcast your message across WhatsApp, Telegram, and Email.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all self-start cursor-pointer"
        >
            <Plus className="w-5 h-5" />
            Create Campaign
        </button>
      </header>

      {/* Scrollable Tab Row with Chevron Controls */}
      <div className="relative flex items-center pb-2 mb-6">
        {showLeftArrow && (
          <button 
            onClick={() => scrollTabs('left')}
            className="absolute left-0 z-10 p-1"
          >
            <div className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-md">
              <ChevronLeft className="w-3 h-3 text-slate-600" />
            </div>
          </button>
        )}

        <div 
          ref={tabsContainerRef}
          onScroll={checkScroll}
          className="flex overflow-x-auto gap-2 scrollbar-none scroll-smooth px-1 flex-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm"
        >
          {[
            { id: 'campaigns', label: 'Campaigns', icon: Target },
            { id: 'segments', label: 'Audience', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ].map(tab => {
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shrink-0 ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {showRightArrow && (
          <button 
            onClick={() => scrollTabs('right')}
            className="absolute right-0 z-10 p-1"
          >
            <div className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-md">
              <ChevronRight className="w-3 h-3 text-slate-600" />
            </div>
          </button>
        )}
      </div>

      {view === 'campaigns' && (
        <div className="space-y-6">
          {campaigns.length > 0 && (
            <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={selectedCampaigns.length === campaigns.length && campaigns.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCampaigns(campaigns.map(c => c._id || c.id));
                    } else {
                      setSelectedCampaigns([]);
                    }
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-bold text-slate-600">
                  {selectedCampaigns.length === 0 ? "Select all campaigns" : `${selectedCampaigns.length} campaigns selected`}
                </span>
              </div>
              {selectedCampaigns.length > 0 && (
                <button
                  onClick={handleBulkDeleteCampaigns}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3.5 py-2 rounded-xl border border-rose-200 transition-all cursor-pointer text-[10px] uppercase"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map(camp => (
              <CampaignCard 
                key={camp._id || camp.id} 
                {...camp} 
                checked={selectedCampaigns.includes(camp._id || camp.id)}
                onCheckChange={(checked: boolean) => {
                  if (checked) {
                    setSelectedCampaigns(prev => [...prev, camp._id || camp.id]);
                  } else {
                    setSelectedCampaigns(prev => prev.filter(id => id !== (camp._id || camp.id)));
                  }
                }}
                onDelete={() => handleDeleteCampaign(camp._id || camp.id)}
                onClick={() => setSelectedCampaign(camp)}
              />
            ))}
            {campaigns.length === 0 && (
              <div className="col-span-full bg-white p-12 rounded-[2rem] border border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Target className="w-8 h-8 text-slate-400" />
                 </div>
                 <h3 className="font-bold text-slate-800 text-lg mb-2">No active campaigns</h3>
                 <p className="text-slate-500 text-sm max-w-sm">Create a new marketing campaign to reach your contacts via WhatsApp, Telegram, or Email.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'segments' && (
         <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-slate-800">Targeting Segments</h3>
                <button className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline cursor-pointer">+ New Segment</button>
            </div>
            <div className="p-12 text-center text-slate-400 text-sm">
                No audience segments defined yet.
            </div>
         </div>
      )}

      {/* MODAL: Create Campaign */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0">
                      <Plus className="w-5 h-5 md:w-6 md:h-6" />
                   </div>
                   <div className="min-w-0">
                      <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight uppercase truncate">New Campaign</h3>
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none truncate mt-1">Broadcast Engine v2.0</p>
                   </div>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2.5 md:p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer shrink-0 ml-2">
                  <X className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Campaign Name</label>
                  <input 
                    type="text" 
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Summer Launch 2024" 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                 <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Broadcast Channel</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'email', label: 'Email', icon: Mail },
                      { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                      { id: 'telegram', label: 'Telegram', icon: Send },
                      { id: 'sms', label: 'SMS / MMS', icon: Zap }
                    ].map(ch => (
                      <button 
                        key={ch.id} 
                        onClick={() => setForm({ ...form, type: ch.id })}
                        className={`py-3 px-2 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-2 cursor-pointer ${form.type === ch.id ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-indigo-400 hover:bg-slate-50'}`}
                      >
                        <ch.icon className="w-5 h-5" />
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Audience ({selectedContacts.length})</label>
                      <button onClick={selectAll} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                        {selectedContacts.length === contacts.length ? 'Deselect All' : 'Select All'}
                      </button>
                   </div>
                   <div className="border border-slate-200 rounded-2xl p-4 space-y-2 max-h-[150px] overflow-y-auto bg-slate-50/50">
                      {contacts.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-4 font-bold uppercase">No contacts found</p>
                      ) : contacts.map(c => (
                        <div key={c.id || c._id} className="flex items-center gap-3">
                           <input 
                             type="checkbox" 
                             checked={selectedContacts.includes(c.id || c._id)}
                             onChange={() => toggleContact(c.id || c._id)}
                             className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                           />
                           <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-black text-slate-900 truncate">{c.name}</span>
                              <span className="text-[9px] text-slate-400 truncate">{form.type === 'email' ? c.email : c.phone || c.telegramUsername || 'No ID'}</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Message Draft</label>
                    <button 
                      onClick={handlePolishMessage}
                      disabled={!form.message.trim() || polishing}
                      className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {polishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI Magic Polish
                    </button>
                  </div>
                  <textarea 
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Type your message here..." 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Campaign Banner / Image</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="Image URL or upload a file..." 
                      className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                    <input
                      type="file"
                      id="marketing-image-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          const res = await fetch('/v1/media/upload', {
                            method: 'POST',
                            headers: { 'x-client-id': clientId },
                            body: formData
                          });
                          const data = await res.json();
                          if (data.success && data.data?.url) {
                            setForm(f => ({ ...f, imageUrl: data.data.url }));
                          } else if (data.url) {
                             setForm(f => ({ ...f, imageUrl: data.url }));
                          }
                        } catch (err) {
                          console.error('Marketing upload failed:', err);
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => document.getElementById('marketing-image-upload')?.click()}
                      className="px-4 py-3 bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    Broadcasts are sent instantly using the platform's native high-priority delivery routes. Supporting rich media attachment across all channels.
                  </p>
                </div>
                
                <button 
                  onClick={handleInitiateBroadcast}
                  disabled={submitting}
                  className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-400" />}
                  {submitting ? 'Broadcasting...' : 'Initiate Broadcast'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Campaign Detail/Review */}
      <AnimatePresence>
        {selectedCampaign && (
          <div className="fixed inset-0 lg:z-[100] z-20 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedCampaign(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm lg:block hidden" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-64px)] sm:max-h-[90vh] mt-16 sm:mt-0"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0">
                      <Target className="w-5 h-5 md:w-6 md:h-6" />
                   </div>
                   <div className="min-w-0">
                      <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight uppercase truncate">{selectedCampaign.name}</h3>
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none truncate mt-1">Campaign Analytics Detail</p>
                   </div>
                </div>
              </div>
              <div className="p-6 md:p-8 space-y-8 overflow-y-auto">
                <div className="grid grid-cols-3 gap-6">
                   {[
                     { label: 'Total Sent', value: selectedCampaign.stats.sent, color: 'slate' },
                     { label: 'Delivered', value: selectedCampaign.stats.delivered, color: 'indigo' },
                     { label: 'Opened', value: selectedCampaign.stats.opened, color: 'emerald' },
                   ].map((s, i) => (
                     <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center space-y-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
                        <div className={`text-2xl font-black text-${s.color}-600`}>{s.value}</div>
                     </div>
                   ))}
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Performance</h4>
                      <span className="text-[10px] font-black text-indigo-600">{selectedCampaign.stats.sent > 0 ? Math.round((selectedCampaign.stats.delivered / selectedCampaign.stats.sent) * 100) : 0}% success rate</span>
                   </div>
                   <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: selectedCampaign.stats.sent > 0 ? `${(selectedCampaign.stats.delivered/selectedCampaign.stats.sent)*100}%` : '0%' }} />
                   </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2rem] text-white space-y-4 shadow-xl">
                   <div className="flex items-center gap-3 text-indigo-400">
                      <Zap className="w-5 h-5" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Broadcast Intelligence</h4>
                   </div>
                   <p className="text-sm font-medium leading-relaxed opacity-80">
                     This campaign achieved a {selectedCampaign.stats.sent > 0 ? Math.round((selectedCampaign.stats.opened / selectedCampaign.stats.delivered) * 100) : 0}% open rate. Intelligence suggests higher engagement for {selectedCampaign.type === 'email' ? 'visual-rich templates' : 'concise messaging'} on this channel.
                   </p>
                </div>
              </div>
              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4 shrink-0">
                <button className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer">
                  Duplicate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CampaignCard({ name, type, status, stats, metrics, onClick, checked, onCheckChange, onDelete }: any) {
    const icons: any = {
        whatsapp: { icon: MessageSquare, color: 'bg-green-100 text-green-600' },
        telegram: { icon: Send, color: 'bg-sky-100 text-sky-600' },
        email: { icon: Mail, color: 'bg-indigo-100 text-indigo-600' }
    };
    const Conf = icons[type] || icons.email;
    const realStats = metrics || stats || { sent: 0, delivered: 0, opened: 0, failed: 0 };
    
    return (
        <div 
          onClick={onClick}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col h-full cursor-pointer relative"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={!!checked}
                      onChange={(e) => {
                        e.stopPropagation();
                        onCheckChange(e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4 shrink-0"
                    />
                    <div className={`p-3 rounded-2xl ${Conf.color} group-hover:scale-110 transition-transform`}>
                        <Conf.icon className="w-6 h-6" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${status === 'running' ? 'bg-amber-100 text-amber-700 animate-pulse' : status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {status || 'completed'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            <h3 className="font-bold text-slate-800 mb-2 truncate group-hover:text-indigo-600 transition-colors">{name}</h3>
            
            <div className="flex-1 space-y-4 mb-6">
                <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                        <div className="text-sm font-black text-slate-700">{realStats.sent || 0}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Sent</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm font-black text-slate-700">{realStats.delivered || 0}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Deliv.</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm font-black text-slate-700">{realStats.opened || 0}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Open</div>
                    </div>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: realStats.sent > 0 ? `${(realStats.delivered/realStats.sent)*100}%` : '0%' }} />
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); }}
                  className="flex-1 py-2 rounded-xl text-xs font-black bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Dup
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onClick(); }}
                  className="flex-1 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Review
                </button>
            </div>
        </div>
    );
}

function SegmentRow({ name, count, filters }: any) {
    return (
        <div className="p-4 hover:bg-slate-50 transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                    {name[0]}
                </div>
                <div>
                    <h4 className="font-bold text-slate-800">{name}</h4>
                    <p className="text-xs font-bold text-slate-400">{count} Active Contacts</p>
                </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Copy className="w-4 h-4" /></button>
                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">Delete</button>
            </div>
        </div>
    )
}

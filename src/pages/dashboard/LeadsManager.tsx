import React, { useState, useEffect, useRef } from 'react';
import { useClientId } from '../../lib/useClientId';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Filter, Download, Trash2, Mail, Phone, Tag, MapPin, Calendar, 
  ExternalLink, Zap, Database, KanbanSquare, List, GripHorizontal, 
  CheckCircle2, Building2, User, Clock, Globe, X, Send, ChevronRight, 
  MoreHorizontal, Trophy, XCircle, RefreshCw, MessageCircle, Activity,
  ShieldCheck, TrendingUp, Inbox, Smartphone, LayoutDashboard, Star,
  Plus, Info, MessageSquare, Upload, Flame, Target, Briefcase, Loader2, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getSocket } from '../../lib/socket';
import { LongPressWrapper } from '../../components/LongPressWrapper';
import { SelectionToolbar } from '../../components/SelectionToolbar';

export default function LeadsManager() {
  const { clientId: cidHook } = useClientId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadIdParam = searchParams.get('id');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    contactFirst: '',
    contactLast: '',
    company: '',
    contactEmail: '',
    contactPhone: '',
    stage: 'Prospect',
    leadRating: 'warm',
    city: '',
    country: '',
    value: 0
  });

  const [editForm, setEditForm] = useState({
    id: '',
    contactFirst: '',
    contactLast: '',
    company: '',
    contactEmail: '',
    contactPhone: '',
    stage: 'Prospect',
    leadRating: 'warm',
    city: '',
    country: '',
    value: 0
  });

  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (cidHook) {
      fetchLeads();
      const socket = getSocket(cidHook);
      socket.on('lead_update', (updatedLead) => {
        // Simple update logic
        setLeads(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
        if (selectedLead?._id === updatedLead._id) setSelectedLead(updatedLead);
      });
      return () => {
        socket.off('lead_update');
      };
    }
  }, [cidHook, selectedLead?._id]);

  useEffect(() => {
    if (leads.length > 0 && leadIdParam) {
      const found = leads.find(l => l._id === leadIdParam);
      if (found) {
        setSelectedLead(found);
        setIsViewModalOpen(true);
      }
    }
  }, [leads, leadIdParam]);

  useEffect(() => {
    if (selectedLeads.length === 0 && isSelectionMode) {
      setIsSelectionMode(false);
    }
  }, [selectedLeads, isSelectionMode]);

  const toggleSelection = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedLeads([id]);
    }
  };

  const handleCardClick = (lead: any) => {
    if (isSelectionMode) {
      toggleSelection(lead._id);
    } else {
      openLeadDetails(lead);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/leads', { headers: { 'x-client-id': cidHook } });
      const data = await res.json();
      if (data.success) {
        const list = data.data || [];
        
        // calculate scoring for each lead
        const scoredList = list.map((lead: any) => {
           let score = 0;
           if (lead.contactEmail) score += 20;
           if (lead.contactPhone) score += 20;
           if (lead.company) score += 10;
           if (lead.stage === 'Qualified') score += 30;
           else if (lead.stage === 'Negotiation') score += 40;
           else if (lead.stage === 'Proposal') score += 20;
           
           if (lead.leadRating === 'hot') score += 20;
           else if (lead.leadRating === 'warm') score += 10;
           
           return { ...lead, score: Math.min(score, 100) };
        });

        setLeads(scoredList);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!cidHook) return;
    window.location.href = `/v1/contacts/export-csv?clientId=${encodeURIComponent(cidHook)}`;
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (!createForm.contactFirst.trim()) {
      setActionError('First name is required');
      return;
    }

    try {
      const res = await fetch('/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook
        },
        body: JSON.stringify(createForm)
      });

      const data = await res.json();
      if (!data.success) {
        setActionError(data.error?.message || 'Failed to create lead');
        return;
      }

      await fetchLeads();
      setActionSuccess('Lead registered successfully!');
      setIsCreateModalOpen(false);
      setCreateForm({
        contactFirst: '', contactLast: '', company: '', contactEmail: '',
        contactPhone: '', stage: 'Prospect', leadRating: 'warm', city: '', country: '', value: 0
      });
    } catch (err) {
      setActionError('Failed to register lead.');
    }
  };

  const handleOpenEditModal = (lead: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditForm({
      id: lead._id,
      contactFirst: lead.contactFirst || '',
      contactLast: lead.contactLast || '',
      company: lead.company || '',
      contactEmail: lead.contactEmail || '',
      contactPhone: lead.contactPhone || '',
      stage: lead.stage || 'Prospect',
      leadRating: lead.leadRating || 'warm',
      city: lead.location?.city || '',
      country: lead.location?.country || '',
      value: lead.value || 0
    });
    setIsEditModalOpen(true);
  };

  const handleEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/v1/leads/${editForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook
        },
        body: JSON.stringify({
          contactFirst: editForm.contactFirst,
          contactLast: editForm.contactLast,
          company: editForm.company,
          contactEmail: editForm.contactEmail,
          contactPhone: editForm.contactPhone,
          stage: editForm.stage,
          leadRating: editForm.leadRating,
          value: Number(editForm.value),
          location: {
            city: editForm.city,
            country: editForm.country
          }
        })
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setActionSuccess('Lead updated.');
        fetchLeads();
        if (selectedLead && selectedLead._id === editForm.id) {
          setIsViewModalOpen(false);
        }
      } else {
        setActionError('Failed to update lead');
      }
    } catch (err) {
      setActionError('Error updating lead.');
    }
  };

  const handleBulkDeleteLeads = async () => {
    if (selectedLeads.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedLeads.length} selected leads?`)) return;
    try {
      const res = await fetch('/v1/leads', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook
        },
        body: JSON.stringify({ ids: selectedLeads })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedLeads([]);
        fetchLeads();
        if (selectedLead && selectedLeads.includes(selectedLead._id)) {
          setIsViewModalOpen(false);
          setSelectedLead(null);
        }
      } else {
        alert(data.error?.message || 'Failed to delete selected leads.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await fetch(`/v1/leads/${id}`, {
        method: 'DELETE',
        headers: { 'x-client-id': cidHook }
      });
      setSelectedLeads(prev => prev.filter(item => item !== id));
      fetchLeads();
      if (selectedLead?._id === id) {
        setIsViewModalOpen(false);
        setSelectedLead(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMessageLead = (lead: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/dashboard/shared-inbox?email=${encodeURIComponent(lead.contactEmail || '')}&phone=${encodeURIComponent(lead.contactPhone || '')}`);
  };

  const openLeadDetails = (lead: any) => {
    setSelectedLead(lead);
    setIsViewModalOpen(true);
  };

  useEffect(() => {
    if (isViewModalOpen) {
      window.history.pushState({ viewModal: true }, '');
    }
    
    const handlePopState = (e: PopStateEvent) => {
      if (isViewModalOpen) {
        setIsViewModalOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isViewModalOpen]);

  const filteredLeads = leads.filter(l => {
    const q = searchQuery.toLowerCase();
    const name = `${l.contactFirst} ${l.contactLast}`.toLowerCase();
    return name.includes(q) || 
           (l.contactEmail || '').toLowerCase().includes(q) || 
           (l.company || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Leads & Prospects</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage and score your contacts. Duplicates are auto-merged.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
             onClick={handleExportCsv}
             className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-black rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
          >
             <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
             onClick={() => setIsCreateModalOpen(true)}
             className="px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2"
          >
             <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Search & Filters */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" /> Filter Board
            </h3>
            
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mt-4">
              <h4 className="text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1"><Flame className="w-3.5 h-3.5"/> Smart Scoring</h4>
              <p className="text-[11px] text-indigo-700">Leads are automatically scored out of 100 based on completeness and stage.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Cards */}
        <div className="lg:col-span-9 space-y-4">
          <SelectionToolbar
            isVisible={isSelectionMode}
            selectedCount={selectedLeads.length}
            totalCount={filteredLeads.length}
            onDelete={handleBulkDeleteLeads}
            onCancel={() => {
              setIsSelectionMode(false);
              setSelectedLeads([]);
            }}
            onSelectAll={() => setSelectedLeads(filteredLeads.map(l => l._id))}
            onDeselectAll={() => setSelectedLeads([])}
            itemName="leads"
          />

          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400">
               <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
               <p className="text-sm font-medium">Scoring and merging leads...</p>
             </div>
          ) : filteredLeads.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-black text-slate-900 mb-1">No Leads Found</h3>
              <p className="text-xs text-slate-500 mb-6 max-w-sm">Add new leads or adjust your search filters to see prospects.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredLeads.map(lead => {
                const isSelected = selectedLeads.includes(lead._id);

                return (
                  <LongPressWrapper 
                    key={lead._id}
                    layoutId={lead._id}
                    disabled={isSelectionMode}
                    onLongPress={() => handleLongPress(lead._id)}
                    onClick={() => handleCardClick(lead)}
                    className={cn(
                      "bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer group flex flex-col relative overflow-hidden",
                      isSelected && "border-indigo-500 ring-2 ring-indigo-500 ring-inset bg-indigo-50/10"
                    )}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <AnimatePresence>
                          {isSelectionMode && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="absolute top-4 left-4 z-20"
                            >
                              <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all",
                                isSelected 
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                                  : "bg-white border-slate-200 text-transparent"
                              )}>
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                          {lead.contactFirst?.charAt(0) || ''}{lead.contactLast?.charAt(0) || ''}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                          <Flame className="w-3 h-3" /> Score: {lead.score}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase">{lead.stage}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {lead.contactFirst} {lead.contactLast}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                      <Building2 className="w-3.5 h-3.5" /> {lead.company || 'No Company'}
                    </p>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{lead.contactEmail || 'No Email'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{lead.contactPhone || 'No Phone'}</span>
                      </div>
                    </div>

                    {!isSelectionMode && (
                      <div className="mt-5 flex gap-2 w-full">
                        <button 
                          onClick={(e) => handleMessageLead(lead, e)}
                          className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Message
                        </button>
                        <button 
                          onClick={(e) => handleOpenEditModal(lead, e)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </LongPressWrapper>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isViewModalOpen && selectedLead && (
          <div className="fixed lg:inset-0 top-16 lg:top-0 inset-x-0 bottom-0 lg:z-50 z-20 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm lg:bg-opacity-50 bg-transparent">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-2xl sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl h-full sm:max-h-[90vh] flex flex-col overflow-hidden sm:mt-0"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                    {selectedLead.contactFirst?.charAt(0) || ''}{selectedLead.contactLast?.charAt(0) || ''}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{selectedLead.contactFirst} {selectedLead.contactLast}</h2>
                    <p className="text-xs font-medium text-slate-500">{selectedLead.company || 'Independent'}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lead Info */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4 text-indigo-500" /> Contact Details
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 font-medium">{selectedLead.contactEmail || '-'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 font-medium">{selectedLead.contactPhone || '-'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 font-medium">
                            {selectedLead.location?.city || selectedLead.city || 'Unknown'}, {selectedLead.location?.country || selectedLead.country || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-amber-800 uppercase">Lead Score</span>
                        <span className="text-lg font-black text-amber-600">{selectedLead.score}/100</span>
                      </div>
                      <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${selectedLead.score}%` }} />
                      </div>
                      <p className="text-[10px] font-medium text-amber-700 mt-2 text-center">Score factors: Complete details, stage progress.</p>
                    </div>
                  </div>

                  {/* Activities / Meta */}
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-emerald-500" /> Pipeline Info
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">Current Stage</span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                            {selectedLead.stage}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">Estimated Value</span>
                          <span className="text-sm font-bold text-slate-900">${(selectedLead.value || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 pt-2">
                      <button 
                        onClick={() => handleMessageLead(selectedLead)}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
                      >
                        <MessageSquare className="w-4 h-4" /> Message Lead
                      </button>
                      <button 
                        onClick={() => handleOpenEditModal(selectedLead)}
                        className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      >
                        Edit Details
                      </button>
                      <button 
                        onClick={() => handleDeleteLead(selectedLead._id)}
                        className="w-full py-3 text-rose-600 bg-rose-50 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      >
                        Delete Lead
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create / Edit Modals */}
      <AnimatePresence>
        {(isCreateModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 1 }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-black text-slate-900">
                  {isEditModalOpen ? 'Edit Lead' : 'Add New Lead'}
                </h2>
                <button 
                  onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-500 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <form onSubmit={isEditModalOpen ? handleEditLead : handleCreateLead} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                      <input 
                        required
                        type="text" 
                        value={isEditModalOpen ? editForm.contactFirst : createForm.contactFirst}
                        onChange={e => isEditModalOpen ? setEditForm({...editForm, contactFirst: e.target.value}) : setCreateForm({...createForm, contactFirst: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                      <input 
                        type="text" 
                        value={isEditModalOpen ? editForm.contactLast : createForm.contactLast}
                        onChange={e => isEditModalOpen ? setEditForm({...editForm, contactLast: e.target.value}) : setCreateForm({...createForm, contactLast: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Company</label>
                    <input 
                      type="text" 
                      value={isEditModalOpen ? editForm.company : createForm.company}
                      onChange={e => isEditModalOpen ? setEditForm({...editForm, company: e.target.value}) : setCreateForm({...createForm, company: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                      <input 
                        type="email" 
                        value={isEditModalOpen ? editForm.contactEmail : createForm.contactEmail}
                        onChange={e => isEditModalOpen ? setEditForm({...editForm, contactEmail: e.target.value}) : setCreateForm({...createForm, contactEmail: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                      <input 
                        type="text" 
                        value={isEditModalOpen ? editForm.contactPhone : createForm.contactPhone}
                        onChange={e => isEditModalOpen ? setEditForm({...editForm, contactPhone: e.target.value}) : setCreateForm({...createForm, contactPhone: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Stage</label>
                      <select 
                        value={isEditModalOpen ? editForm.stage : createForm.stage}
                        onChange={e => isEditModalOpen ? setEditForm({...editForm, stage: e.target.value}) : setCreateForm({...createForm, stage: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      >
                        <option value="Prospect">Prospect</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Closed Won">Closed Won</option>
                        <option value="Closed Lost">Closed Lost</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Value ($)</label>
                      <input 
                        type="number" 
                        value={isEditModalOpen ? editForm.value : createForm.value}
                        onChange={e => isEditModalOpen ? setEditForm({...editForm, value: Number(e.target.value)}) : setCreateForm({...createForm, value: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  {actionError && <div className="text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-lg">{actionError}</div>}
                  {actionSuccess && <div className="text-xs text-emerald-500 font-bold bg-emerald-50 p-3 rounded-lg">{actionSuccess}</div>}

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                    <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-600/10">Save Lead</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

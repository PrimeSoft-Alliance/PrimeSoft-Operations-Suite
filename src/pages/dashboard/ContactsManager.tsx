import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useClientId } from '../../lib/useClientId';
import { 
  Search, Filter, Download, Trash2, Mail, Phone, Tag, MapPin, 
  User, Plus, Upload, RefreshCw, X, MessageSquare, Edit3, Check, HelpCircle, ArrowRight, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useLongPress } from '../../hooks/useLongPress';
import { SelectionToolbar } from '../../components/SelectionToolbar';
import { ContactCard } from '../../components/ContactCard';

export default function ContactsManager() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contactIdParam = searchParams.get('id');
  const { clientId: cidHook } = useClientId();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<'All' | 'Email' | 'WhatsApp' | 'Telegram' | 'Phone'>('All');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [importDataType, setImportDataType] = useState<'All' | 'WhatsApp' | 'Telegram' | 'Email' | 'Number'>('All');

  // Forms
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    telegramUsername: '',
    whatsappJid: ''
  });

  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    telegramUsername: '',
    whatsappJid: '',
    aiEnabled: true
  });

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [rawFileText, setRawFileText] = useState('');
  const [importFileType, setImportFileType] = useState<'csv' | 'vcf' | 'auto'>('auto');
  const [isImporting, setIsImporting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (cidHook) {
      fetchContacts();
    }
  }, [cidHook]);

  useEffect(() => {
    if (contacts.length > 0 && contactIdParam) {
      const found = contacts.find(c => c._id === contactIdParam);
      if (found) {
        setSelectedContact(found);
        setIsViewModalOpen(true);
      }
    }
  }, [contacts, contactIdParam]);

  useEffect(() => {
    if (selectedContacts.length === 0 && isSelectionMode) {
      setIsSelectionMode(false);
    }
  }, [selectedContacts, isSelectionMode]);

  const toggleSelection = (id: string) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedContacts([id]);
    }
  };

  const handleCardClick = (contact: any) => {
    if (isSelectionMode) {
      toggleSelection(contact._id || contact.id);
    } else {
      handleOpenViewModal(contact);
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/contacts', { headers: { 'x-client-id': cidHook } });
      const data = await res.json();
      if (data.success) {
        setContacts(data.data || []);
      }
    } catch (err) {
      console.error('Fetch contacts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch('/v1/contacts/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook
        },
        body: JSON.stringify({
          name: addForm.name,
          email: addForm.email,
          phone: addForm.phone,
          telegramUsername: addForm.telegramUsername,
          whatsappJid: addForm.whatsappJid,
          isBulk: false
        })
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccess('Contact created successfully!');
        setAddForm({ name: '', email: '', phone: '', telegramUsername: '', whatsappJid: '' });
        setIsAddModalOpen(false);
        fetchContacts();
      } else {
        setActionError(data.error?.message || 'Failed to create contact');
      }
    } catch (err) {
      setActionError('Failed to create contact.');
    }
  };

  const handleOpenViewModal = (contact: any) => {
    setSelectedContact(contact);
    setIsViewModalOpen(true);
  };

  const handleOpenEditModal = (contact: any) => {
    setEditForm({
      id: contact._id || contact.id,
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      telegramUsername: contact.telegramUsername || '',
      whatsappJid: contact.whatsappJid || '',
      aiEnabled: contact.aiEnabled !== false
    });
    setIsEditModalOpen(true);
  };

  const handleToggleAI = async (contact: any) => {
    const contactId = contact._id || contact.id;
    const targetState = contact.aiEnabled !== false ? false : true;
    try {
      const res = await fetch(`/v1/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook
        },
        body: JSON.stringify({
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          telegramUsername: contact.telegramUsername,
          whatsappJid: contact.whatsappJid,
          aiEnabled: targetState
        })
      });

      const data = await res.json();
      if (data.success) {
        setContacts(prev => prev.map(c => (c._id === contactId || c.id === contactId) ? { ...c, aiEnabled: targetState } : c));
        if (selectedContact && (selectedContact._id === contactId || selectedContact.id === contactId)) {
          setSelectedContact(prev => ({ ...prev, aiEnabled: targetState }));
        }
      }
    } catch (err) {
      console.error('Failed to toggle AI status:', err);
    }
  };

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/v1/contacts/${editForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook
        },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          telegramUsername: editForm.telegramUsername,
          whatsappJid: editForm.whatsappJid,
          aiEnabled: editForm.aiEnabled
        })
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccess('Contact updated successfully!');
        setIsEditModalOpen(false);
        fetchContacts();
      } else {
        setActionError(data.error?.message || 'Failed to update contact');
      }
    } catch (err) {
      setActionError('Failed to update contact.');
    }
  };

  const handleBulkDeleteContacts = async () => {
    if (selectedContacts.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedContacts.length} selected contacts? This is permanent.`)) return;
    setActionError('');
    try {
      const res = await fetch('/v1/contacts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook
        },
        body: JSON.stringify({ ids: selectedContacts })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedContacts([]);
        fetchContacts();
      } else {
        alert(data.error?.message || 'Failed to delete selected contacts');
      }
    } catch (err) {
      console.error('Bulk delete contacts error:', err);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contact? This is permanent.')) {
      return;
    }
    setActionError('');
    try {
      const res = await fetch(`/v1/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'x-client-id': cidHook }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedContacts(prev => prev.filter(item => item !== id));
        fetchContacts();
      } else {
        alert(data.error?.message || 'Failed to delete contact');
      }
    } catch (err) {
      console.error('Delete contact error:', err);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const isVcf = file.name.endsWith('.vcf') || file.name.endsWith('.vcard');
    const determinedType = isVcf ? 'vcf' : 'csv';
    setImportFileType(determinedType);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      setRawFileText(text);

      if (determinedType === 'csv') {
        const lines = text.split('\n');
        if (lines.length === 0) return;
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const parsedRows = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          const rowObj: any = {};
          headers.forEach((header, index) => {
            rowObj[header || `col_${index}`] = values[index] || '';
          });
          parsedRows.push(rowObj);
        }
        setCsvRows(parsedRows);
      } else {
        // VCF file - count BEGIN:VCARD occurrences
        const cardCount = (text.match(/BEGIN:VCARD/ig) || []).length;
        setCsvRows(new Array(cardCount || 1).fill({ name: 'vCard Entry' }));
      }
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawFileText && csvRows.length === 0) {
      setActionError('No file content loaded.');
      return;
    }

    setIsImporting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch('/v1/contacts/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook
        },
        body: JSON.stringify({ 
          fileText: rawFileText, 
          fileType: importFileType, 
          dataType: importDataType 
        })
      });
      const data = await res.json();
      if (data.success) {
        let msg = `Successfully imported ${data.data?.count || 0} contacts!`;
        if (data.data?.skippedCount > 0) {
          msg += ` (${data.data.skippedCount} records skipped based on validation criteria).`;
        }
        setActionSuccess(msg);
        setCsvFile(null);
        setCsvRows([]);
        setRawFileText('');
        setIsImportModalOpen(false);
        fetchContacts();
      } else {
        setActionError(data.error?.message || 'Failed to import directory contacts');
      }
    } catch (err) {
      setActionError('Failed to import directory contacts.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportCsv = () => {
    if (contacts.length === 0) return;

    const headers = ['Name', 'Email', 'Phone', 'Telegram Username', 'Telegram Chat ID', 'WhatsApp JID', 'Source', 'Last Active'];
    const rows = contacts.map(c => [
      `"${c.name || ''}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.telegramUsername || ''}"`,
      `"${c.telegramChatId || ''}"`,
      `"${c.whatsappJid || ''}"`,
      `"${c.source || c.platform || 'unknown'}"`,
      `"${c.lastActive || c.updatedAt || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contacts_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and Search logic
  const filteredContacts = contacts.filter(c => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (c.name || '').toLowerCase().includes(query);
    const emailMatch = (c.email || '').toLowerCase().includes(query);
    const phoneMatch = (c.phone || '').toLowerCase().includes(query);
    const tgMatch = (c.telegramUsername || '').toLowerCase().includes(query);
    const waMatch = (c.whatsappJid || '').toLowerCase().includes(query);
    
    const textMatch = nameMatch || emailMatch || phoneMatch || tgMatch || waMatch;

    if (!textMatch) return false;

    if (filterPlatform === 'All') return true;
    if (filterPlatform === 'Email') return !!c.email && !c.email.includes('@manual.com');
    if (filterPlatform === 'WhatsApp') return !!c.whatsappJid || c.platform === 'whatsapp' || c.source === 'whatsapp';
    if (filterPlatform === 'Telegram') return !!c.telegramChatId || !!c.telegramUsername || c.platform === 'telegram' || c.source === 'telegram';
    if (filterPlatform === 'Phone') return !!c.phone;

    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Contacts Directory</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage your independent cross-channel contacts with isolated sync details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            Import CSV
          </button>
          <button 
            onClick={handleExportCsv}
            disabled={contacts.length === 0}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export CSV
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/10 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess('')} className="ml-auto text-emerald-400 hover:text-emerald-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
        {actionError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm"
          >
            <X className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="ml-auto text-rose-400 hover:text-rose-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Sidebar Filters */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm space-y-5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              Filter Directory
            </h3>

            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Channel Segment</label>
                <div className="relative">
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value as any)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none"
                  >
                    <option value="All">All Channels</option>
                    <option value="Email">Email Only</option>
                    <option value="WhatsApp">WhatsApp Only</option>
                    <option value="Telegram">Telegram Only</option>
                    <option value="Phone">Phone Number Only</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Filter className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Records</div>
                <div className="text-xl font-black text-slate-900">{contacts.length}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Filtered</div>
                <div className="text-xl font-black text-indigo-600">{filteredContacts.length}</div>
              </div>
            </div>

            {(searchQuery || filterPlatform !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterPlatform('All');
                }}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>

          <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-lg shadow-indigo-600/20 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-80">Directory Tip</h4>
            <p className="text-xs font-bold leading-relaxed">
              Use the Smart Importer to upload vCard files from your phone or CSV exports from your CRM. OminiRep automatically deduplicates entries.
            </p>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="lg:col-span-8 space-y-4">
          <SelectionToolbar
            isVisible={isSelectionMode}
            selectedCount={selectedContacts.length}
            totalCount={filteredContacts.length}
            onDelete={handleBulkDeleteContacts}
            onCancel={() => {
              setIsSelectionMode(false);
              setSelectedContacts([]);
            }}
            onSelectAll={() => setSelectedContacts(filteredContacts.map(c => c._id || c.id))}
            onDeselectAll={() => setSelectedContacts([])}
            itemName="contacts"
          />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-[2.5rem]" />
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="bg-white border border-slate-200 p-16 rounded-[2.5rem] text-center shadow-sm flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-slate-300" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="font-black text-slate-800 text-lg">No matching contacts found</h3>
                <p className="text-slate-400 text-xs font-bold italic">
                  "The phone hasn't rung, but your search parameters are very specific."
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredContacts.map((c) => {
                const id = c._id || c.id;
                const isSelected = selectedContacts.includes(id);

                return (
                  <ContactCard
                    key={id}
                    c={c}
                    isSelected={isSelected}
                    isSelectionMode={isSelectionMode}
                    handleLongPress={handleLongPress}
                    handleCardClick={handleCardClick}
                    handleOpenEditModal={handleOpenEditModal}
                    handleDeleteContact={handleDeleteContact}
                    navigate={navigate}
                    onToggleAI={handleToggleAI}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Add Contact */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ scale: 1, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 1, y: 100, opacity: 0 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">Create Manual Contact</h2>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Independent record addition</p>
                  </div>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddContact} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                    placeholder="sarah.j@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Phone Number</label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Telegram Username</label>
                    <input
                      type="text"
                      value={addForm.telegramUsername}
                      onChange={(e) => setAddForm({...addForm, telegramUsername: e.target.value})}
                      placeholder="@sarah_j"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">WhatsApp JID</label>
                    <input
                      type="text"
                      value={addForm.whatsappJid}
                      onChange={(e) => setAddForm({...addForm, whatsappJid: e.target.value})}
                      placeholder="e.g. 15550192834@s.whatsapp.net"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
                  >
                    Save Contact
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Edit Contact */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ scale: 1, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 1, y: 100, opacity: 0 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">Edit Contact Record</h2>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Update synchronization keys</p>
                  </div>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditContact} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    placeholder="sarah.j@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Telegram Username</label>
                    <input
                      type="text"
                      value={editForm.telegramUsername}
                      onChange={(e) => setEditForm({...editForm, telegramUsername: e.target.value})}
                      placeholder="@sarah_j"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">WhatsApp JID</label>
                    <input
                      type="text"
                      value={editForm.whatsappJid}
                      onChange={(e) => setEditForm({...editForm, whatsappJid: e.target.value})}
                      placeholder="e.g. 15550192834@s.whatsapp.net"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider block">AI Representative Responses</span>
                    <span className="text-[9px] font-bold text-slate-400 block mt-0.5">Toggle automated responses for this specific contact.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={editForm.aiEnabled}
                      onChange={(e) => setEditForm({...editForm, aiEnabled: e.target.checked})}
                    />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: View Contact */}
      <AnimatePresence>
        {isViewModalOpen && selectedContact && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ scale: 1, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 1, y: 100, opacity: 0 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-indigo-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/20">
                    {selectedContact.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedContact.name || 'Unknown'}</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedContact.source || selectedContact.platform || 'manual'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setIsViewModalOpen(false); handleOpenEditModal(selectedContact); }} className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-sm transition-all">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setIsViewModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Email</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 break-all">
                      {selectedContact.email && !selectedContact.email.includes('@manual.com') && !selectedContact.email.includes('@import.com') ? selectedContact.email : '—'}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Phone</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {selectedContact.phone || '—'}
                    </div>
                  </div>

                  <div className="bg-sky-50/50 rounded-2xl p-4 border border-sky-100/50">
                    <div className="flex items-center gap-2 text-sky-600/60 mb-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Telegram Username</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {selectedContact.telegramUsername || '—'}
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
                    <div className="flex items-center gap-2 text-emerald-600/60 mb-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp JID</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 break-all">
                      {selectedContact.whatsappJid || '—'}
                    </div>
                  </div>

                  <div className={cn(
                    "rounded-2xl p-4 border flex items-center justify-between",
                    selectedContact.aiEnabled !== false
                      ? "bg-emerald-50/30 border-emerald-100/50"
                      : "bg-rose-50/30 border-rose-100/50"
                  )}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          selectedContact.aiEnabled !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                        )} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono">AI Rep Status</span>
                      </div>
                      <div className={cn(
                        "text-sm font-black uppercase tracking-wider",
                        selectedContact.aiEnabled !== false ? "text-emerald-700" : "text-rose-700"
                      )}>
                        {selectedContact.aiEnabled !== false ? 'Active' : 'Muted'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleAI(selectedContact)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm",
                        selectedContact.aiEnabled !== false
                          ? "bg-rose-50 border-rose-100/60 text-rose-600 hover:bg-rose-100"
                          : "bg-emerald-50 border-emerald-100/60 text-emerald-600 hover:bg-emerald-100"
                      )}
                    >
                      {selectedContact.aiEnabled !== false ? 'Mute AI' : 'Activate AI'}
                    </button>
                  </div>
                </div>

                {selectedContact.lastMessage && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Last Message Received</div>
                    <p className="text-sm text-slate-700 italic border-l-2 border-indigo-200 pl-3 py-1">"{selectedContact.lastMessage}"</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Added: {selectedContact.createdAt ? format(new Date(selectedContact.createdAt), 'MMM dd, yyyy') : 'Unknown'}
                </div>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    if (selectedContact.email) navigate(`/dashboard/shared-inbox?email=${selectedContact.email}`);
                    else if (selectedContact.whatsappJid) navigate(`/dashboard/shared-inbox?phone=${selectedContact.whatsappJid.split('@')[0]}`);
                    else if (selectedContact.phone) navigate(`/dashboard/shared-inbox?phone=${selectedContact.phone}`);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 shadow-md shadow-indigo-600/10"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Import CSV/VCF */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ scale: 1, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 1, y: 100, opacity: 0 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">Smart Contact Importer</h2>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">AI-Powered CSV & VCF Parser</p>
                  </div>
                </div>
                <button onClick={() => setIsImportModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleImportCsv} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-500 font-medium leading-relaxed">
                  <div className="font-bold text-slate-800 mb-1">Intelligent Formats Supported:</div>
                  Our system utilizes LLMs, NLP, and heuristics to automatically parse, validate, and cleanse details from <strong className="text-slate-800">CSV</strong> or <strong className="text-slate-800">VCF (vCard)</strong> lists. Capitalization, phone syntax, and email validation are handled automatically.
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Channel Validation Profile</label>
                  <select 
                    value={importDataType}
                    onChange={(e) => setImportDataType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                  >
                    <option value="All">All (Auto-Classify & Link Everything)</option>
                    <option value="Email">Email Contacts Only (Enforces email structure)</option>
                    <option value="WhatsApp">WhatsApp Contacts Only (Enforces WhatsApp JID or phone)</option>
                    <option value="Telegram">Telegram Contacts Only (Enforces Telegram Username)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select CSV or VCF File</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-8 text-center bg-slate-50/50 relative group transition-all">
                    <input
                      type="file"
                      accept=".csv,.vcf,.vcard"
                      onChange={handleCsvFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">
                        {csvFile ? csvFile.name : 'Drag & drop or browse your local file'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Supports comma-separated lines (.csv) or Electronic Business Cards (.vcf, .vcard)
                      </div>
                    </div>
                  </div>
                </div>

                {csvRows.length > 0 && (
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl flex items-center justify-between">
                    <span>Detected {csvRows.length} potential contact entries to parse</span>
                    <button type="button" onClick={() => { setCsvFile(null); setCsvRows([]); setRawFileText(''); }} className="text-rose-600 hover:underline">Clear File</button>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting || csvRows.length === 0}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isImporting ? 'Importing...' : 'Execute Import'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

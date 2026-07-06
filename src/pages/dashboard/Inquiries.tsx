import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  RefreshCw, 
  Eye, 
  Search, 
  Inbox, 
  Star, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  CalendarDays,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  Mail,
  Upload,
  User,
  ArrowRight,
  ShieldCheck,
  Archive,
  StarOff,
  Check,
  CheckSquare
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  addMonths, 
  subMonths,
  isSameDay
} from 'date-fns';
import { cn } from '../../lib/utils';
import { useClientId } from '../../lib/useClientId';
import { useSearchParams } from 'react-router-dom';
import { SelectionToolbar } from '../../components/SelectionToolbar';
import { InquiryCard } from '../../components/InquiryCard';
import { getSocket } from '../../lib/socket';

interface Inquiry {
  _id: string;
  threadId: string;
  senderEmail: string;
  subject?: string;
  body?: string;
  status: 'inbox' | 'unread' | 'starred' | 'assigned' | 'archived' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  imageUrl?: string;
}

const getSynchronousClientId = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const cbClientId = params.get('clientId') || params.get('cid');
    if (cbClientId) return cbClientId;
    
    const hostname = window.location.hostname;
    const isPlatformDomain = hostname.includes('run.app') || hostname.includes('aistudio') || hostname.includes('localhost') || hostname === '0.0.0.0';

    const stored = localStorage.getItem('ps_client_id');
    if (stored && stored !== 'undefined' && stored !== 'null' && stored.trim() !== '') {
      return stored;
    }
    
    if (isPlatformDomain) return 'platform-prime';
    return 'platform-prime'; // Default fallback
  } catch {
    return 'platform-prime';
  }
};

export default function SupportSuit() {
  const { clientId } = useClientId();
  const [searchParams] = useSearchParams();
  const inquiryIdParam = searchParams.get('id');
  const [inquiries, setInquiries] = useState<Inquiry[]>(() => {
    try {
      const syncId = getSynchronousClientId();
      const cached = localStorage.getItem(`inquiries_${syncId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const syncId = getSynchronousClientId();
      const cached = localStorage.getItem(`inquiries_${syncId}`);
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  const [syncing, setSyncing] = useState(false);
  const [selectedInquiries, setSelectedInquiries] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyImageUrl, setReplyImageUrl] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  
  // Search, filter, and calendar states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'closed' | 'unread' | 'starred'>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
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
  }, [inquiries]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };

  useEffect(() => {
    if (selectedInquiries.length === 0 && isSelectionMode) {
      setIsSelectionMode(false);
    }
  }, [selectedInquiries, isSelectionMode]);

  const toggleSelection = (id: string) => {
    setSelectedInquiries(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedInquiries([id]);
    }
  };

  const handleCardClick = (inq: Inquiry) => {
    if (isSelectionMode) {
      toggleSelection(inq._id);
    } else {
      setSelectedInquiry(inq);
      setReplyMessage('');
    }
  };

  useEffect(() => {
    if (selectedInquiry) {
      window.history.pushState({ inquiryDetail: true }, '');
    }
    
    const handlePopState = (e: PopStateEvent) => {
      if (selectedInquiry) {
        setSelectedInquiry(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedInquiry]);

  const fetchInquiries = async () => {
    if (!clientId) return;
    const isInitialLoad = inquiries.length === 0;
    if (isInitialLoad) setLoading(true);
    setSyncing(true);
    
    try {
      // Sync from IMAP - with timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        await fetch('/v1/inquiries/sync', { 
          method: 'POST',
          headers: { 'x-client-id': clientId },
          signal: controller.signal
        });
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.warn('IMAP sync timed out');
        } else {
          console.error('IMAP sync error:', e);
        }
      } finally {
        clearTimeout(timeoutId);
      }

      const res = await fetch('/v1/inquiries', { headers: { 'x-client-id': clientId } });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }

      const data = await res.json();
      if (data.success) {
        const fetched = data.data || [];
        setInquiries(fetched);
        try {
          localStorage.setItem(`inquiries_${clientId}`, JSON.stringify(fetched));
        } catch (err) {
          console.error('Failed to cache inquiries:', err);
        }
      }
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      // Hydrate from localStorage immediately if available for this specific clientId
      try {
        const cached = localStorage.getItem(`inquiries_${clientId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) {
            setInquiries(parsed);
            setLoading(false);
          }
        }
      } catch (e) {
        console.error('Error hydrating inquiries from localStorage:', e);
      }

      fetchInquiries();
      
      const socket = getSocket(clientId);
      if (socket) {
        const handleNewEvent = () => {
          fetchInquiries();
        };
        
        socket.on('email.received', handleNewEvent);
        socket.on('email.sent', handleNewEvent);
        
        return () => {
          socket.off('email.received', handleNewEvent);
          socket.off('email.sent', handleNewEvent);
        };
      }
    }
  }, [clientId]);

  const updateInquiryStatus = async (id: string, updates: Partial<Inquiry>) => {
    try {
      const res = await fetch(`/v1/inquiries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId || ''
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setInquiries(prev => {
          const updated = prev.map(item => item._id === id ? { ...item, ...data.data } : item);
          try {
            localStorage.setItem(`inquiries_${clientId}`, JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
          return updated;
        });
        if (selectedInquiry?._id === id) {
          setSelectedInquiry(prev => prev ? { ...prev, ...data.data } : null);
        }
      }
    } catch (err) {
      console.error('Failed to update inquiry status:', err);
    }
  };

  const sendReply = async (id: string) => {
    if (!replyMessage.trim() && !replyImageUrl) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/v1/inquiries/${id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId || ''
        },
        body: JSON.stringify({ message: replyMessage, imageUrl: replyImageUrl })
      });
      const data = await res.json();
      if (data.success) {
        setInquiries(prev => {
          const updated = prev.map(item => item._id === id ? { ...item, ...data.inquiry } : item);
          try {
            localStorage.setItem(`inquiries_${clientId}`, JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
          return updated;
        });
        if (selectedInquiry?._id === id) {
          setSelectedInquiry(prev => prev ? { ...prev, ...data.inquiry } : null);
        }
        setReplyMessage('');
        setReplyImageUrl('');
      } else {
        alert(data.message || 'Failed to send reply');
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      alert('An error occurred while sending the reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const deleteInquiry = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      const res = await fetch(`/v1/inquiries/${id}`, {
        method: 'DELETE',
        headers: {
          'x-client-id': clientId || ''
        }
      });
      const data = await res.json();
      if (data.success) {
        setInquiries(prev => {
          const updated = prev.filter(item => item._id !== id);
          try {
            localStorage.setItem(`inquiries_${clientId}`, JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
          return updated;
        });
        setSelectedInquiries(prev => prev.filter(item => item !== id));
        if (selectedInquiry?._id === id) {
          setSelectedInquiry(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete inquiry:', err);
    }
  };

  const handleBulkDeleteInquiries = async () => {
    if (selectedInquiries.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedInquiries.length} selected inquiries permanently?`)) return;
    try {
      const res = await fetch('/v1/inquiries', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId!
        },
        body: JSON.stringify({ ids: selectedInquiries })
      });
      const data = await res.json();
      if (data.success) {
        setInquiries(prev => {
          const updated = prev.filter(i => !selectedInquiries.includes(i._id));
          try {
            localStorage.setItem(`inquiries_${clientId}`, JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
          return updated;
        });
        setSelectedInquiries([]);
        if (selectedInquiry && selectedInquiries.includes(selectedInquiry._id)) {
          setSelectedInquiry(null);
        }
      } else {
        alert(data.error?.message || 'Failed to delete selected inquiries.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedInquiry && inquiryIdParam) {
      const found = inquiries.find(item => item._id === inquiryIdParam);
      if (found) {
        setSelectedInquiry(found);
      }
    }
  }, [inquiries, inquiryIdParam]);

  // Calendar Helpers
  const getDayString = (day: Date) => {
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getInquiryDateString = (inq: Inquiry) => {
    try {
      return new Date(inq.createdAt).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const inquiryDatesMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    inquiries.forEach(inq => {
      const dStr = getInquiryDateString(inq);
      if (dStr) {
        map[dStr] = (map[dStr] || 0) + 1;
      }
    });
    return map;
  }, [inquiries]);

  const filteredInquiries = inquiries.filter(inq => {
    // Tab filtering
    if (activeTab !== 'all') {
      if (activeTab === 'open' && inq.status === 'closed') return false;
      if (activeTab === 'closed' && inq.status !== 'closed') return false;
      if (activeTab !== 'open' && activeTab !== 'closed' && inq.status !== activeTab) return false;
    }

    // Search filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const emailMatch = inq.senderEmail.toLowerCase().includes(q);
      const subjectMatch = (inq.subject || '').toLowerCase().includes(q);
      const bodyMatch = (inq.body || '').toLowerCase().includes(q);
      if (!emailMatch && !subjectMatch && !bodyMatch) return false;
    }

    // Priority filtering
    if (selectedPriority !== 'all') {
      if (inq.priority !== selectedPriority) return false;
    }

    // Date filtering
    if (selectedDate) {
      const inqDateStr = getInquiryDateString(inq);
      const selDateStr = getDayString(selectedDate);
      if (inqDateStr !== selDateStr) return false;
    }

    return true;
  });

  const counts = {
    all: inquiries.length,
    open: inquiries.filter(i => i.status !== 'closed').length,
    closed: inquiries.filter(i => i.status === 'closed').length,
    unread: inquiries.filter(i => i.status === 'unread').length,
    starred: inquiries.filter(i => i.status === 'starred').length,
  };

  const prevCalendarMonth = () => setCurrentMonth(prev => addMonths(prev, -1));
  const nextCalendarMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const days = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInM = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = getDay(monthStart);
    const blanks = Array.from({ length: startDay }, () => null);
    return [...blanks, ...daysInM];
  }, [currentMonth]);

  return (
    <div className="animate-in fade-in duration-300">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Sidebar Navigator & Filters */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Calendar Widget */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                Support Suit Navigator
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={prevCalendarMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextCalendarMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="text-center text-xs font-black text-slate-700 mb-4 bg-slate-50 py-2 rounded-xl border border-slate-100">
              {format(currentMonth, 'MMMM yyyy')}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="p-2" />;
                const dStr = getDayString(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const hasInquiries = (inquiryDatesMap[dStr] || 0) > 0;
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={dStr}
                    onClick={() => isSelected ? setSelectedDate(null) : setSelectedDate(day)}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all relative cursor-pointer",
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 scale-105 font-black"
                        : isToday
                          ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                          : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span>{day.getDate()}</span>
                    {hasInquiries && (
                      <span className={cn(
                        "absolute bottom-1 w-1 h-1 rounded-full",
                        isSelected ? "bg-white" : "bg-indigo-500"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Showing: {format(selectedDate, 'MMM dd, yyyy')}
                </span>
                <button onClick={() => setSelectedDate(null)} className="text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Filter Board */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              Filter Board
            </h3>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search email, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 bg-slate-50/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Priority Level</label>
              <div className="relative">
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none appearance-none text-slate-700 cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Filter className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={fetchInquiries}
                disabled={syncing}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Sync Mailbox
              </button>
            </div>

            {(searchQuery || selectedPriority !== 'all' || selectedDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPriority('all');
                  setSelectedDate(null);
                }}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Reset Filter Board
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Tab Bar and Inquiries Grid */}
        <div className="lg:col-span-8 space-y-6">
          
          <AnimatePresence mode="wait">
            {!isSelectionMode && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="relative flex items-center border-b border-slate-100 pb-2"
              >
                {showLeftArrow && (
                  <button 
                    onClick={() => scrollTabs('left')}
                    className="absolute left-0 z-10 p-2 bg-gradient-to-r from-white via-white to-transparent"
                  >
                    <div className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                      <ChevronLeft className="w-3 h-3 text-slate-600" />
                    </div>
                  </button>
                )}
                
                <div 
                  ref={tabsContainerRef}
                  onScroll={checkScroll}
                  className="flex overflow-x-auto gap-2 scrollbar-none scroll-smooth px-1 flex-1"
                >
                  {[
                    { id: 'all', label: 'Inbox', count: counts.all, icon: Inbox, color: 'border-slate-200 text-slate-700 hover:bg-slate-50' },
                    { id: 'open', label: 'Open', count: counts.open, icon: Clock, color: 'border-emerald-100 text-emerald-700 hover:bg-emerald-50/50' },
                    { id: 'unread', label: 'Unread', count: counts.unread, icon: Eye, color: 'border-amber-100 text-amber-700 hover:bg-amber-50/50' },
                    { id: 'starred', label: 'Starred', count: counts.starred, icon: Star, color: 'border-indigo-100 text-indigo-700 hover:bg-indigo-50/50' },
                    { id: 'closed', label: 'Closed', count: counts.closed, icon: Archive, color: 'border-slate-200 text-slate-500 hover:bg-slate-50' },
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 border cursor-pointer shrink-0",
                          isActive
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/10 font-black"
                            : `bg-white ${tab.color}`
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                          isActive ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-500"
                        )}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {showRightArrow && (
                  <button 
                    onClick={() => scrollTabs('right')}
                    className="absolute right-0 z-10 p-2 bg-gradient-to-l from-white via-white to-transparent"
                  >
                    <div className="w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                    </div>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-2xl" />
              ))
            ) : filteredInquiries.length === 0 ? (
              <div className="col-span-full h-80 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
                  <Inbox className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">No Matching Inquiries</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1 font-medium italic">"Silence is golden, but productivity is key."</p>
              </div>
            ) : (
            filteredInquiries.map((inq) => (
                <InquiryCard
                  key={inq._id}
                  inq={inq}
                  isSelected={selectedInquiries.includes(inq._id)}
                  isSelectionMode={isSelectionMode}
                  onLongPress={handleLongPress}
                  onClick={handleCardClick}
                  deleteInquiry={deleteInquiry}
                  updateInquiryStatus={updateInquiryStatus}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Inquiry Detail Modal */}
      <AnimatePresence>
        {selectedInquiry && (
          <div className="fixed lg:inset-0 top-16 lg:top-0 inset-x-0 bottom-0 lg:z-50 z-20 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInquiry(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm lg:block hidden"
            />
            
            <motion.div 
              layoutId={selectedInquiry._id}
              className="relative w-full max-w-2xl bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl shadow-indigo-900/20 overflow-hidden flex flex-col h-full sm:max-h-[90vh] sm:mt-0"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-100 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                      selectedInquiry.priority === 'high' ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                    )}>
                      {selectedInquiry.priority} Priority
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-widest">
                      {selectedInquiry.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                    {selectedInquiry.subject || 'No Subject'}
                  </h2>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Reference ID: {selectedInquiry.threadId}
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-8 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sender Identity</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-black">
                        {selectedInquiry.senderEmail.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-sm font-bold text-slate-800 truncate">{selectedInquiry.senderEmail}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Logged Date</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <div className="text-sm font-bold text-slate-800">{format(new Date(selectedInquiry.createdAt), 'MMMM dd, yyyy @ h:mm a')}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Inquiry Content & Thread</label>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-wrap min-h-[150px] max-h-[300px] overflow-y-auto">
                    {selectedInquiry.body || 'No description provided.'}
                    {selectedInquiry.imageUrl && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200">
                        <img 
                          src={selectedInquiry.imageUrl} 
                          alt="Attachment" 
                          className="max-w-full h-auto cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => window.open(selectedInquiry.imageUrl, '_blank')}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Quick Reply (SMTP)</label>
                  {replyImageUrl && (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group mb-2">
                      <img src={replyImageUrl} className="w-full h-full object-cover" alt="Upload Preview" />
                      <button 
                        onClick={() => setReplyImageUrl('')}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply here... (Sends email to customer)"
                      className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px] resize-y"
                    />
                    <div className="absolute bottom-3 right-3 flex gap-2">
                      <input
                        type="file"
                        id="inquiry-reply-upload"
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
                              setReplyImageUrl(data.data.url);
                            } else if (data.url) {
                               setReplyImageUrl(data.url);
                            }
                          } catch (err) {
                            console.error('Inquiry upload failed:', err);
                          }
                        }}
                      />
                      <button
                        onClick={() => document.getElementById('inquiry-reply-upload')?.click()}
                        className="p-2 bg-white/50 text-slate-500 rounded-lg hover:bg-white hover:text-slate-700 transition-all cursor-pointer"
                        title="Upload Image"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => sendReply(selectedInquiry._id)}
                      disabled={(!replyMessage.trim() && !replyImageUrl) || sendingReply}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2 cursor-pointer"
                    >
                      {sendingReply ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      Send Reply
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => updateInquiryStatus(selectedInquiry._id, { status: selectedInquiry.status === 'archived' ? 'inbox' : 'archived' })}
                      className="bg-white border border-slate-200 text-slate-700 rounded-2xl py-3.5 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {selectedInquiry.status === 'archived' ? <Inbox className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      {selectedInquiry.status === 'archived' ? 'Restore' : 'Archive'}
                    </button>
                    
                    <button 
                      onClick={() => updateInquiryStatus(selectedInquiry._id, { status: selectedInquiry.status === 'starred' ? 'inbox' : 'starred' })}
                      className="bg-white border border-slate-200 text-slate-700 rounded-2xl py-3.5 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {selectedInquiry.status === 'starred' ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                      {selectedInquiry.status === 'starred' ? 'Unstar' : 'Star'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => updateInquiryStatus(selectedInquiry._id, { status: 'closed' })}
                      className="bg-emerald-600 text-white rounded-2xl py-3.5 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Mark Resolved
                    </button>
                    
                    <button 
                      onClick={() => deleteInquiry(selectedInquiry._id)}
                      className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl py-3.5 font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Permanently Delete
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <SelectionToolbar
        isVisible={isSelectionMode}
        selectedCount={selectedInquiries.length}
        totalCount={filteredInquiries.length}
        itemName="Support Suit"
        onCancel={() => {
          setSelectedInquiries([]);
          setIsSelectionMode(false);
        }}
        onSelectAll={() => setSelectedInquiries(filteredInquiries.map(i => i._id))}
        onDeselectAll={() => setSelectedInquiries([])}
        onDelete={handleBulkDeleteInquiries}
      />
    </div>
  );
}

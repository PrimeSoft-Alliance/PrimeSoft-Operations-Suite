import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Search, Clock, CheckCircle2, X, Eye, Loader2, User, Phone, MapPin, Globe, Briefcase, ChevronRight, Ban, Users, Mail, Download, RefreshCw, CalendarDays, CheckCheck, Filter, ChevronLeft, SlidersHorizontal, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
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
import { useClientId } from '../../lib/useClientId';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LongPressWrapper } from '../../components/LongPressWrapper';
import { SelectionToolbar } from '../../components/SelectionToolbar';

export default function ClientBookings() {
  const { clientId: cidHook } = useClientId();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get('id');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [creatingMock, setCreatingMock] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'awaiting' | 'confirmed' | 'fulfilled' | 'canceled'>('all');

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
  }, [bookings]);

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

  // Search, filter, and calendar states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Rescheduling and iCal states
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  // Custom messaging states
  const [isMessaging, setIsMessaging] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageSubmitting, setMessageSubmitting] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState('');
  const [messageError, setMessageError] = useState('');

  useEffect(() => {
    if (selectedBookings.length === 0 && isSelectionMode) {
      setIsSelectionMode(false);
    }
  }, [selectedBookings, isSelectionMode]);

  const toggleSelection = (id: string) => {
    setSelectedBookings(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedBookings([id]);
    }
  };

  const handleCardClick = (item: any) => {
    if (isSelectionMode) {
      toggleSelection(item._id || item.id);
    } else {
      setSelectedBooking(item);
    }
  };

  useEffect(() => {
    if (selectedBooking) {
      setIsRescheduling(false);
      setIsMessaging(false);
      setMessageText('');
      setMessageSubject(`Regarding your booking for ${selectedBooking.serviceSelection}`);
      setMessageSuccess('');
      setMessageError('');
      setRescheduleDate(selectedBooking.preferredDate ? selectedBooking.preferredDate.slice(0, 10) : '');
      setRescheduleTime(selectedBooking.preferredStartTime || '10:00');
    }
  }, [selectedBooking]);

  const handleSendMessageSubmit = async () => {
    if (!selectedBooking || !messageText.trim()) return;
    setMessageSubmitting(true);
    setMessageError('');
    setMessageSuccess('');
    try {
      const res = await fetch(`/v1/bookings/${selectedBooking._id}/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': cidHook || ''
        },
        body: JSON.stringify({ 
          message: messageText, 
          subject: messageSubject 
        })
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success) {
          setMessageSuccess(data.data?.message || 'Message sent successfully!');
          setMessageText('');
          setTimeout(() => {
            setIsMessaging(false);
            setMessageSuccess('');
          }, 2000);
        } else {
          setMessageError(data.error || 'Failed to dispatch message.');
        }
      } else {
        const text = await res.text();
        setMessageError(text || `Error: Received response with status ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      setMessageError('Network error during message dispatch.');
    } finally {
      setMessageSubmitting(false);
    }
  };

  const downloadIcal = (bookingId: string) => {
    const link = document.createElement('a');
    link.href = `/v1/bookings/${bookingId}/ics`;
    link.setAttribute('download', `appointment_${bookingId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedBooking) return;
    setRescheduleSubmitting(true);
    setRescheduleError('');
    try {
      const res = await fetch(`/v1/bookings/${selectedBooking._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': cidHook || ''
        },
        body: JSON.stringify({ 
          preferredDate: rescheduleDate, 
          preferredStartTime: rescheduleTime,
          preferredEndTime: `${String(Number(rescheduleTime.split(':')[0]) + 1).padStart(2, '0')}:00` 
        })
      });
      if (res.ok) {
        setIsRescheduling(false);
        fetchBookings();
        setSelectedBooking(null);
      } else {
        setRescheduleError('Failed to complete reschedule request.');
      }
    } catch (err) {
      console.error(err);
      setRescheduleError('Network error during reschedule.');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const handleBulkDeleteBookings = async () => {
    if (selectedBookings.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedBookings.length} selected bookings?`)) return;
    try {
      const res = await fetch('/v1/bookings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook || ''
        },
        body: JSON.stringify({ ids: selectedBookings })
      });
      const data = await res.json();
      if (data.success) {
        setBookings(prev => prev.filter(b => !selectedBookings.includes(b._id || b.id)));
        setSelectedBookings([]);
      } else {
        alert(data.error?.message || 'Failed to delete selected bookings.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during booking deletion.');
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    try {
      const res = await fetch(`/v1/bookings/${id}`, {
        method: 'DELETE',
        headers: { 'x-client-id': cidHook || '' }
      });
      const data = await res.json();
      if (data.success) {
        setBookings(prev => prev.filter(b => (b._id || b.id) !== id));
        setSelectedBookings(prev => prev.filter(item => item !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (cidHook) {
      fetchBookings();
    }
  }, [cidHook]);

  useEffect(() => {
    if (bookings.length > 0 && bookingIdParam) {
      const found = bookings.find(b => b._id === bookingIdParam);
      if (found) {
        setSelectedBooking(found);
      }
    }
  }, [bookings, bookingIdParam]);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/v1/bookings', {
        headers: { 'x-client-id': cidHook || '' }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setBookings(data.data || []);
        } else if (Array.isArray(data)) {
          setBookings(data);
        } else {
          setBookings([]);
        }
      } else {
        const text = await res.text();
        throw new Error(text || 'Non-JSON response received');
      }
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    try {
      await fetch(`/v1/bookings/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': cidHook || ''
        },
        body: JSON.stringify({ status })
      });
      fetchBookings();
      setSelectedBooking(null);
    } catch (err) {
      console.error('Failed to update booking:', err);
    }
  };

  const handleCreateMockBooking = async () => {
    setCreatingMock(true);
    try {
      const res = await fetch('/v1/bookings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cidHook || ''
        }
      });
      if (res.ok) {
        await fetchBookings();
      }
    } catch (err) {
      console.error('Failed to create mock booking:', err);
    } finally {
      setCreatingMock(false);
    }
  };

  const statusMap: any = {
    'awaiting': { color: 'bg-amber-100 text-amber-700', label: 'Awaiting' },
    'pending': { color: 'bg-amber-100 text-amber-700', label: 'Awaiting' },
    'confirmed': { color: 'bg-emerald-100 text-emerald-700', label: 'Confirmed' },
    'canceled': { color: 'bg-rose-100 text-rose-700', label: 'Canceled' },
    'cancelled': { color: 'bg-rose-100 text-rose-700', label: 'Canceled' },
    'fulfilled': { color: 'bg-indigo-100 text-indigo-700', label: 'Fulfilled' },
    'completed': { color: 'bg-indigo-100 text-indigo-700', label: 'Fulfilled' }
  };

  const getBookingDateString = (booking: any) => {
    if (!booking.preferredDate) return '';
    try {
      return new Date(booking.preferredDate).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const getDayString = (day: Date) => {
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const bookingDatesMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      const dStr = getBookingDateString(b);
      if (dStr) {
        map[dStr] = (map[dStr] || 0) + 1;
      }
    });
    return map;
  }, [bookings]);

  const uniqueServices = React.useMemo(() => {
    const services = new Set<string>();
    bookings.forEach(b => {
      if (b.serviceSelection) {
        services.add(b.serviceSelection);
      }
    });
    return Array.from(services);
  }, [bookings]);

  const filteredBookings = bookings.filter((b) => {
    if (activeTab !== 'all') {
      if (activeTab === 'awaiting') {
        if (b.status !== 'awaiting' && b.status !== 'pending') return false;
      } else if (activeTab === 'confirmed') {
        if (b.status !== 'confirmed') return false;
      } else if (activeTab === 'fulfilled') {
        if (b.status !== 'fulfilled' && b.status !== 'completed') return false;
      } else if (activeTab === 'canceled') {
        if (b.status !== 'canceled' && b.status !== 'cancelled') return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = b.fullName?.toLowerCase().includes(q);
      const serviceMatch = b.serviceSelection?.toLowerCase().includes(q);
      const emailMatch = b.email?.toLowerCase().includes(q);
      const notesMatch = b.notes?.toLowerCase().includes(q);
      if (!nameMatch && !serviceMatch && !emailMatch && !notesMatch) return false;
    }

    if (selectedService !== 'all') {
      if (b.serviceSelection !== selectedService) return false;
    }

    if (selectedDate) {
      const bDateStr = getBookingDateString(b);
      const selDateStr = getDayString(selectedDate);
      if (bDateStr !== selDateStr) return false;
    }

    return true;
  });

  useEffect(() => {
    if (selectedBooking) {
      window.history.pushState({ bookingDetail: true }, '');
    }
    
    const handlePopState = (e: PopStateEvent) => {
      if (selectedBooking) {
        setSelectedBooking(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedBooking]);

  const allCount = bookings.length;
  const awaitingCount = bookings.filter(b => b.status === 'awaiting' || b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const fulfilledCount = bookings.filter(b => b.status === 'fulfilled' || b.status === 'completed').length;
  const canceledCount = bookings.filter(b => b.status === 'canceled' || b.status === 'cancelled').length;

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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header and Mock creator in a beautiful minimalist top bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Service Appointments</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Real-time scheduling management for your ecosystem services.</p>
        </div>
        <div className="shrink-0">
          <button
             onClick={handleCreateMockBooking}
             disabled={creatingMock}
             className="w-full md:w-auto text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black px-4 py-3 rounded-2xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer"
          >
             {creatingMock ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
             ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Create Mock Booking
                </>
             )}
          </button>
        </div>
      </div>

      {/* Main layout grid: Calendar + Search Filters on the Left, Bookings on the Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Calendar and Search & Filters */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Calendar Widget Card */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                Appointment Navigator
              </h3>
              <div className="flex items-center gap-1">
                <button 
                  onClick={prevCalendarMonth}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={nextCalendarMonth}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="text-center text-xs font-black text-slate-700 mb-4 bg-slate-50 py-2 rounded-xl border border-slate-100">
              {format(currentMonth, 'MMMM yyyy')}
            </div>

            {/* Days of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="p-2" />;
                const dStr = getDayString(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const hasBookings = (bookingDatesMap[dStr] || 0) > 0;
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={dStr}
                    onClick={() => {
                      if (selectedDate && isSameDay(day, selectedDate)) {
                        setSelectedDate(null);
                      } else {
                        setSelectedDate(day);
                      }
                    }}
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
                    {hasBookings && (
                      <span className={cn(
                        "absolute bottom-1 w-1 h-1 rounded-full",
                        isSelected ? "bg-white" : "bg-indigo-500"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected date display and clear */}
            {selectedDate && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Showing: {format(selectedDate, 'MMM dd, yyyy')}
                </span>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Search & Minimal Filters Card */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              Filter Board
            </h3>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, service, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 bg-slate-50/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Service Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Service Selection</label>
              <div className="relative">
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none text-slate-700 cursor-pointer"
                >
                  <option value="all">All Services</option>
                  {uniqueServices.map(service => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Filter className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Clear all filters helper */}
            {(searchQuery || selectedService !== 'all' || selectedDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedService('all');
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

        {/* Right Side: Tab Bar and Booking List */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Beautiful Segmented Tab Row with Icons & Badge Count */}
          <div className="relative flex items-center border-b border-slate-100 pb-2">
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
                { id: 'all', label: 'All Bookings', count: allCount, icon: CalendarDays, color: 'border-slate-200 text-slate-700 hover:bg-slate-50' },
                { id: 'awaiting', label: 'Awaiting', count: awaitingCount, icon: Clock, color: 'border-amber-100 text-amber-700 hover:bg-amber-50/50' },
                { id: 'confirmed', label: 'Confirmed', count: confirmedCount, icon: CheckCircle2, color: 'border-emerald-100 text-emerald-700 hover:bg-emerald-50/50' },
                { id: 'fulfilled', label: 'Fulfilled', count: fulfilledCount, icon: CheckCheck, color: 'border-indigo-100 text-indigo-700 hover:bg-indigo-50/50' },
                { id: 'canceled', label: 'Canceled', count: canceledCount, icon: Ban, color: 'border-rose-100 text-rose-700 hover:bg-rose-50/50' }
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
                      "px-1.5 py-0.5 rounded-md text-[10px]",
                      isActive
                        ? "bg-indigo-700 text-indigo-100 font-bold"
                        : "bg-slate-100 text-slate-500 font-bold"
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
          </div>

          <SelectionToolbar
            isVisible={isSelectionMode}
            selectedCount={selectedBookings.length}
            totalCount={filteredBookings.length}
            onDelete={handleBulkDeleteBookings}
            onCancel={() => {
              setIsSelectionMode(false);
              setSelectedBookings([]);
            }}
            onSelectAll={() => setSelectedBookings(filteredBookings.map(b => b._id || b.id))}
            onDeselectAll={() => setSelectedBookings([])}
            itemName="bookings"
          />

          {/* Cards Grid / State Messages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
                 Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-56 bg-slate-100 animate-pulse rounded-[2.5rem]" />
                 ))
            ) : bookings.length === 0 ? (
              <div className="col-span-full h-96 bg-white border border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8">
                <Calendar className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Booking Stream Clear</h3>
                <p className="text-sm text-slate-500 max-w-xs mt-2 mb-6 font-medium">Appointments booked through your website or assistant will manifest here.</p>
                <button
                   onClick={handleCreateMockBooking}
                   disabled={creatingMock}
                   className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer"
                >
                   {creatingMock ? (
                     <>
                       <Loader2 className="w-3.5 h-3.5 animate-spin" />
                       Generating...
                     </>
                   ) : (
                     <>
                       <Calendar className="w-3.5 h-3.5" />
                       Create Mock Booking
                     </>
                   )}
                </button>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="col-span-full h-72 bg-white border border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8">
                <Calendar className="w-10 h-10 text-slate-300 mb-3" />
                <h3 className="text-sm font-black text-slate-900 tracking-tight">No matching bookings</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1 font-medium">There are currently no appointments matching the active filter parameters.</p>
              </div>
            ) : (
              filteredBookings.map((item) => {
                const id = item._id || item.id;
                const isSelected = selectedBookings.includes(id);

                return (
                  <LongPressWrapper
                    key={id}
                    layoutId={id}
                    disabled={isSelectionMode}
                    onLongPress={() => handleLongPress(id)}
                    onClick={() => handleCardClick(item)}
                    className={cn(
                      "bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-600/5 transition-all group cursor-pointer relative",
                      isSelected && "border-indigo-500 ring-2 ring-indigo-500 ring-inset bg-indigo-50/10"
                    )}
                  >
                    <div className="flex justify-between items-start mb-6">
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
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <Calendar className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isSelectionMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBooking(id);
                            }}
                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          statusMap[item.status]?.color || 'bg-slate-100 text-slate-700'
                        )}>
                          {statusMap[item.status]?.label || item.status}
                        </span>
                      </div>
                    </div>
                  
                  <div className="space-y-1 mb-6">
                    <div className="text-sm font-black text-slate-900 tracking-tight uppercase group-hover:text-indigo-600 transition-colors truncate">{item.serviceSelection}</div>
                    <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 capitalize">
                       <User className="w-3 h-3" />
                       {item.fullName}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pt-6 border-t border-slate-50">
                     <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(item.preferredDate), 'MMM dd')}
                     </div>
                     <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {item.preferredStartTime}
                     </div>
                  </div>
                </LongPressWrapper>
                );
              })
            )}
        </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed lg:inset-0 top-16 lg:top-0 inset-x-0 bottom-0 lg:z-[100] z-20 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm lg:block hidden" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full sm:w-full max-w-xl h-full sm:max-h-[92vh] bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col sm:mt-0"
            >
              <div className="p-4 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                   <div className="w-9 h-9 sm:w-12 sm:h-12 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white flex-shrink-0">
                      <Briefcase className="w-4 h-4 sm:w-6 sm:h-6" />
                   </div>
                   <div className="min-w-0">
                      <h3 className="text-xs sm:text-lg font-black text-slate-900 tracking-tight uppercase truncate">{selectedBooking.serviceSelection}</h3>
                      <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">ID: BKN-{(selectedBooking._id || selectedBooking.id || '').slice(-6).toUpperCase()}</p>
                   </div>
                </div>
              </div>

              <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
                {selectedBooking.leadStage && (
                  <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/80 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-teal-100/50 space-y-4">
                    <div className="text-[10px] font-black text-teal-600 uppercase tracking-widest flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 animate-pulse" />
                      Aggregated Lead Profile Data
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-teal-600 uppercase tracking-tighter mb-1">Lead Stage</label>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                          {selectedBooking.leadStage}
                        </span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-teal-600 uppercase tracking-tighter mb-1">Lead Score</label>
                        <div className="text-sm font-bold text-slate-900">{selectedBooking.leadScore ?? 50} / 100</div>
                      </div>
                      {selectedBooking.assignedTo && (
                        <div>
                          <label className="block text-[10px] font-black text-teal-600 uppercase tracking-tighter mb-1">Assigned Executive</label>
                          <div className="text-xs font-bold text-slate-700">{selectedBooking.assignedTo}</div>
                        </div>
                      )}
                      {selectedBooking.leadTags && selectedBooking.leadTags.length > 0 && (
                        <div className="col-span-1 sm:col-span-2">
                          <label className="block text-[10px] font-black text-teal-600 uppercase tracking-tighter mb-1">Sync Tags</label>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {selectedBooking.leadTags.map((tag: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-white border border-slate-100 text-[10px] font-mono text-slate-500 rounded-lg">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 space-y-2sm:space-y-3">
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</div>
                       <div className="space-y-1 sm:space-y-2">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 break-all">{selectedBooking.fullName}</div>
                          <div className="text-[11px] sm:text-xs font-medium text-slate-500 break-all">{selectedBooking.email}</div>
                          <div className="text-[11px] sm:text-xs font-medium text-slate-500">{selectedBooking.phoneNumber}</div>
                       </div>
                    </div>
                    <div className="bg-indigo-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-indigo-100 space-y-2 sm:space-y-3">
                       <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Schedule</div>
                       <div className="space-y-1 sm:space-y-2">
                          <div className="text-xs sm:text-sm font-bold text-indigo-900">{format(new Date(selectedBooking.preferredDate), 'PPP')}</div>
                          <div className="text-[11px] sm:text-xs font-medium text-indigo-700">{selectedBooking.preferredStartTime} - {selectedBooking.preferredEndTime}</div>
                          <div className="text-[9px] sm:text-[10px] font-black text-indigo-900 bg-white inline-block px-2 py-0.5 rounded-full uppercase tracking-tighter">Status: {selectedBooking.status}</div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-1.5 sm:space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Notes</label>
                    <div className="bg-white border border-slate-100 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm italic text-slate-600 text-xs sm:text-sm font-medium">
                       "{selectedBooking.notes || 'No special instructions provided by customer.'}"
                    </div>
                 </div>
              </div>

              <div className="p-4 sm:p-8 bg-slate-50/50 border-t border-slate-100">
                {isRescheduling ? (
                  <div className="w-full space-y-4 animate-in fade-in duration-300">
                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Reschedule Appointment Plan
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">New Date</label>
                        <input 
                          type="date" 
                          value={rescheduleDate}
                          onChange={e => setRescheduleDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">New Start Time</label>
                        <input 
                          type="time" 
                          value={rescheduleTime}
                          onChange={e => setRescheduleTime(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800"
                        />
                      </div>
                    </div>

                    {rescheduleError && (
                      <p className="text-[10px] text-red-600 font-bold">{rescheduleError}</p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button 
                        onClick={handleRescheduleSubmit}
                        disabled={rescheduleSubmitting}
                        className="w-full sm:flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {rescheduleSubmitting ? 'Rescheduling...' : 'Save New Appointment'}
                      </button>
                      <button 
                        onClick={() => setIsRescheduling(false)}
                        className="w-full sm:w-auto px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-colors"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                ) : isMessaging ? (
                  <div className="w-full space-y-4 animate-in fade-in duration-300">
                    <div className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 animate-pulse" />
                      Send Message to Customer
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                        <input 
                          type="text" 
                          value={messageSubject}
                          onChange={e => setMessageSubject(e.target.value)}
                          placeholder="Regarding your booking..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/15"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Message Body</label>
                        <textarea 
                          rows={4}
                          value={messageText}
                          onChange={e => setMessageText(e.target.value)}
                          placeholder="Type your message here... It will be sent via SMTP/Email and any linked messaging channels (WhatsApp/Telegram/SMS)."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/15 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {messageSuccess && (
                      <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">{messageSuccess}</p>
                    )}
                    {messageError && (
                      <p className="text-[10px] text-rose-600 font-bold bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">{messageError}</p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button 
                        onClick={handleSendMessageSubmit}
                        disabled={messageSubmitting || !messageText.trim()}
                        className="w-full sm:flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {messageSubmitting ? 'Sending...' : 'Send Message'}
                      </button>
                      <button 
                        onClick={() => setIsMessaging(false)}
                        className="w-full sm:w-auto px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-colors"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    {/* Real-time actions block */}
                    <div className="flex flex-col gap-3 w-full">
                      {/* Row 1: Primary Status Actions */}
                      {['pending', 'awaiting'].includes(selectedBooking.status) && (
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <button 
                            onClick={() => updateBookingStatus(selectedBooking._id || selectedBooking.id, 'confirmed')}
                            className="bg-emerald-600 text-white rounded-xl sm:rounded-2xl py-3 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5 w-full cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Accept & Confirm
                          </button>
                          <button 
                            onClick={() => updateBookingStatus(selectedBooking._id || selectedBooking.id, 'canceled')}
                            className="bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-xl sm:rounded-2xl py-3 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 w-full cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                            Reject & Cancel
                          </button>
                        </div>
                      )}

                      {selectedBooking.status === 'confirmed' && (
                        <button 
                          onClick={() => updateBookingStatus(selectedBooking._id || selectedBooking.id, 'fulfilled')}
                          className="bg-indigo-600 text-white rounded-xl sm:rounded-2xl py-3.5 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 w-full cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark as Fulfilled
                        </button>
                      )}

                      {/* Row 2: Service / Communication Tools */}
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <button 
                          onClick={() => {
                            setSelectedBooking(null);
                            navigate(`/dashboard/shared-inbox?email=${encodeURIComponent(selectedBooking.customerEmail || '')}&phone=${encodeURIComponent(selectedBooking.customerPhone || '')}`);
                          }}
                          className="bg-purple-50 border border-purple-100 text-purple-700 hover:bg-purple-100 rounded-xl sm:rounded-2xl py-2.5 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 w-full cursor-pointer"
                        >
                          <Mail className="w-4 h-4" />
                          Message Client
                        </button>

                        {['pending', 'awaiting', 'confirmed', 'rescheduled'].includes(selectedBooking.status) ? (
                          <button 
                            onClick={() => setIsRescheduling(true)}
                            className="bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 rounded-xl sm:rounded-2xl py-2.5 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 w-full cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Reschedule
                          </button>
                        ) : (
                          <div className="bg-slate-100 text-slate-400 rounded-xl sm:rounded-2xl py-2.5 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 w-full select-none">
                            <RefreshCw className="w-4 h-4" />
                            Inactive
                          </div>
                        )}
                      </div>

                      {/* Row 3: Add to Calendar */}
                      {!['fulfilled', 'completed', 'canceled', 'cancelled'].includes(selectedBooking.status) && (
                        <button 
                          onClick={() => downloadIcal(selectedBooking._id || selectedBooking.id)}
                          className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl sm:rounded-2xl py-2.5 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 w-full cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          Add to Calendar
                        </button>
                      )}
                    </div>

                    {/* Close card utility */}
                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <button 
                        onClick={() => setSelectedBooking(null)}
                        className="px-4 py-1.5 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-wider transition-colors"
                      >
                        Close Panel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

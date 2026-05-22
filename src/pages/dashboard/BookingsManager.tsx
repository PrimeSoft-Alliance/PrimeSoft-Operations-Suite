import { useEffect, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Calendar as CalendarIcon, List, Eye, X, Mail, Clock, CalendarDays, CheckCircle2, Trash2, Phone, MapPin } from 'lucide-react';
import { useClientId } from '../../lib/useClientId';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function BookingsManager() {
  const { clientId: cidHook } = useClientId();
  const [bookings, setBookings] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const fetchBookings = () => {
    setLoading(true);
    fetch(`/v1/dashboard/bookings?t=${Date.now()}`, {
      headers: { 'x-client-id': cidHook }
    })
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Bookings raw data:', data);
        const list = (data?.success && Array.isArray(data.data)) ? data.data : (Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []));
        setBookings(list);
        const business = data?.meta?.businessName || 'Business';
        const cid = data?.meta?.clientId || '...';
        setDebugInfo(`Vault: ${business} | Database: ${cid} | Records: ${list.length}`);
      })
      .catch(err => {
        console.error('Fetch bookings error:', err);
        setDebugInfo(`Offline / Error: ${err.message || String(err)}`);
        setBookings([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (cidHook) {
      fetchBookings();
    }
  }, [cidHook]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/v1/dashboard/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchBookings();
    if (selectedBooking && selectedBooking._id === id) {
      setSelectedBooking({ ...selectedBooking, status });
    }
  };

  const filteredBookings = view === 'calendar' 
    ? bookings.filter(b => isSameDay(new Date(b.preferredDate), selectedDate))
    : bookings;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manage Bookings</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Track and manage your customer appointments</p>
        </div>
        <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button 
            onClick={() => setView('list')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all",
              view === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all",
              view === 'calendar' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <CalendarIcon className="w-4 h-4" /> Calendar
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {view === 'calendar' && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm"
          >
            <style>{`
              .react-calendar { border: none !important; width: 100% !important; font-family: inherit !important; }
              .react-calendar__tile--now { background: #f3f4f6 !important; border-radius: 8px; }
              .react-calendar__tile--active { background: #4f46e5 !important; border-radius: 8px; color: white !important; }
              .react-calendar__month-view__days__tile { height: 48px !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 0.875rem !important; position: relative !important; }
              .has-booking::after { content: ''; position: absolute; bottom: 8px; width: 4px; height: 4px; background: #4f46e5; border-radius: 50%; }
              .react-calendar__tile--active.has-booking::after { background: white; }
            `}</style>
            <Calendar 
              onChange={(val) => setSelectedDate(val as Date)}
              value={selectedDate}
              tileClassName={({ date }) => {
                const hasBooking = bookings.some(b => isSameDay(new Date(b.preferredDate), date));
                return hasBooking ? 'has-booking' : '';
              }}
            />
          </motion.div>
        )}

        <div className={cn(
          "bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden",
          view === 'calendar' ? "lg:col-span-8" : "lg:col-span-12"
        )}>
          {view === 'calendar' && (
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h3>
              <span className="text-xs font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded">
                {filteredBookings.length} {filteredBookings.length === 1 ? 'Booking' : 'Bookings'}
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-slate-50 text-gray-900 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold">Client Information</th>
                  <th className="px-6 py-4 font-bold">Appointment</th>
                  <th className="px-6 py-4 font-bold">Service</th>
                  <th className="px-6 py-4 font-bold text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map(booking => (
                  <motion.tr 
                    key={booking._id} 
                    layoutId={`booking-${booking._id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}
                    className="group cursor-pointer transition-all duration-200 border-b border-gray-50"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm transition-transform group-hover:scale-105",
                          booking.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                          booking.status === 'confirmed' ? 'bg-indigo-50 text-indigo-600' :
                          booking.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-slate-50 text-slate-600'
                        )}>
                          {booking.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                            {booking.fullName}
                            {booking.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
                          </div>
                          <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-300" /> {booking.email}
                          </div>
                          {booking.location?.city && (
                            <div className="text-[10px] text-indigo-400 font-bold flex items-center gap-1 mt-0.5 uppercase tracking-wide">
                              <MapPin className="w-2.5 h-2.5" /> {booking.location.city}, {booking.location.country || 'HQ'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <CalendarDays className="w-4 h-4 text-indigo-500/70" />
                          {format(new Date(booking.preferredDate), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 ml-6 uppercase font-bold tracking-tight">
                          <Clock className="w-3.5 h-3.5 text-indigo-400/50" />
                          {booking.preferredStartTime} - {booking.preferredEndTime}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="bg-slate-100/80 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 inline-flex items-center gap-2 border border-slate-200/50 uppercase tracking-tight">
                        <div className="w-1 h-1 rounded-full bg-slate-400" />
                        {booking.serviceSelection}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                        booking.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200/50' : 
                        booking.status === 'confirmed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/50' :
                        booking.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' :
                        'bg-rose-50 text-rose-700 border-rose-200/50'
                      )}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-2 items-center opacity-40 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setSelectedBooking(booking)}
                          className="p-2.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all active:scale-95"
                          title="Quick View"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <div className="h-6 w-[1px] bg-gray-200 mx-1" />
                        <select 
                          value={booking.status}
                          onClick={e => e.stopPropagation()}
                          onChange={(e) => updateStatus(booking._id, e.target.value)}
                          className="text-xs font-bold border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white shadow-sm cursor-pointer capitalize"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      {view === 'calendar' ? 'No appointments scheduled for this date.' : 'No bookings found yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedBooking && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[1000] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                <h3 className="text-xl font-bold">Booking Details</h3>
                <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-8 text-left">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl font-black">
                    {selectedBooking.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 space-y-1 text-left">
                    <h4 className="text-2xl font-bold text-gray-900 leading-tight">{selectedBooking.fullName}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-indigo-400" /> {selectedBooking.email}</span>
                      <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-indigo-400" /> {selectedBooking.phoneNumber}</span>
                    </div>
                    {selectedBooking.location?.city && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full w-fit">
                        <MapPin className="w-3.5 h-3.5" /> {selectedBooking.location.city}, {selectedBooking.location.country}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Appointment</div>
                    <div className="text-gray-900 font-bold flex items-center gap-2">
                       <CalendarDays className="w-4 h-4 text-indigo-500" />
                       {format(new Date(selectedBooking.preferredDate), 'MMM d, yyyy')}
                    </div>
                    <div className="text-gray-500 text-sm mt-1">{selectedBooking.preferredStartTime} - {selectedBooking.preferredEndTime}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full animate-pulse",
                        selectedBooking.status === 'pending' ? 'bg-amber-400' :
                        selectedBooking.status === 'confirmed' ? 'bg-indigo-400' :
                        selectedBooking.status === 'completed' ? 'bg-green-400' :
                        'bg-rose-400'
                      )} />
                      <span className="font-bold text-gray-900 uppercase text-xs tracking-wide">{selectedBooking.status}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Service Selection</div>
                    <div className="bg-white border border-gray-200 p-3 rounded-lg text-gray-900 font-medium">
                      {selectedBooking.serviceSelection}
                    </div>
                  </div>
                  {selectedBooking.notes && (
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Notes</div>
                      <div className="bg-slate-50 p-4 rounded-xl text-gray-600 text-sm leading-relaxed italic border border-slate-100">
                        "{selectedBooking.notes}"
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  {selectedBooking.status === 'pending' && (
                    <button 
                      onClick={() => updateStatus(selectedBooking._id, 'confirmed')}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Confirm
                    </button>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <button 
                      onClick={() => updateStatus(selectedBooking._id, 'completed')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Mark Completed
                    </button>
                  )}
                   <button 
                    onClick={() => updateStatus(selectedBooking._id, 'cancelled')}
                    className="px-6 border-2 border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" /> Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
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


import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Search, Clock, CheckCircle2, X, Eye, Loader2, User, Phone, MapPin, Globe, Briefcase, ChevronRight, Ban, Users, Mail } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { useClientId } from '../../lib/useClientId';
import { useNavigate } from 'react-router-dom';

export default function ClientBookings() {
  const { clientId: cidHook } = useClientId();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  useEffect(() => {
    if (cidHook) {
      fetchBookings();
    }
  }, [cidHook]);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/v1/bookings', {
        headers: { 'x-client-id': cidHook || '' }
      });
      const data = await res.json();
      if (data.success) {
        setBookings(data.data);
      } else if (Array.isArray(data)) {
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
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

  const statusMap: any = {
    'pending': { color: 'bg-amber-100 text-amber-700', label: 'Awaiting' },
    'confirmed': { color: 'bg-emerald-100 text-emerald-700', label: 'Confirmed' },
    'cancelled': { color: 'bg-rose-100 text-rose-700', label: 'Cancelled' },
    'completed': { color: 'bg-indigo-100 text-indigo-700', label: 'Fulfilled' }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Service Appointments</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Real-time scheduling management for your ecosystem services.</p>
        
        {/* Cross-pointing navigation links */}
        <div className="flex flex-wrap gap-2 pt-3">
          <button 
             onClick={() => navigate('/dashboard/leads')}
             className="text-xs bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
          >
             <Users className="w-3.5 h-3.5" />
             CRM Leads
          </button>
          <span className="text-xs bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
             <Calendar className="w-3.5 h-3.5" />
             Bookings Page
          </span>
          <button 
             onClick={() => navigate('/dashboard/inquiries')}
             className="text-xs bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
          >
             <Mail className="w-3.5 h-3.5" />
             Public Inquiries Page
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
             Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 bg-slate-100 animate-pulse rounded-[2.5rem]" />
             ))
        ) : bookings.length === 0 ? (
          <div className="col-span-full h-96 bg-white border border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
            <Calendar className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Booking Stream Clear</h3>
            <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">Appointments booked through your website or assistant will manifest here.</p>
          </div>
        ) : (
          bookings.map((item) => (
            <motion.div
              layoutId={item._id}
              key={item._id}
              onClick={() => setSelectedBooking(item)}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-600/5 transition-all group cursor-pointer relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Calendar className="w-6 h-6" />
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                  statusMap[item.status]?.color || 'bg-slate-100 text-slate-700'
                )}>
                  {statusMap[item.status]?.label || item.status}
                </span>
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
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                      <Briefcase className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">{selectedBooking.serviceSelection}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">ID: BKN-{selectedBooking._id.slice(-6).toUpperCase()}</p>
                   </div>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6 animate-in fade-in duration-300">
                {selectedBooking.leadStage && (
                  <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/80 p-6 rounded-[2rem] border border-teal-100/50 space-y-4">
                    <div className="text-[10px] font-black text-teal-600 uppercase tracking-widest flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 animate-pulse" />
                      Aggregated Lead Profile Data
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                        <div className="col-span-2">
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

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</div>
                       <div className="space-y-2">
                          <div className="text-sm font-bold text-slate-900">{selectedBooking.fullName}</div>
                          <div className="text-xs font-medium text-slate-500">{selectedBooking.email}</div>
                          <div className="text-xs font-medium text-slate-500">{selectedBooking.phoneNumber}</div>
                       </div>
                    </div>
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 space-y-3">
                       <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Schedule</div>
                       <div className="space-y-2">
                          <div className="text-sm font-bold text-indigo-900">{format(new Date(selectedBooking.preferredDate), 'PPP')}</div>
                          <div className="text-xs font-medium text-indigo-700">{selectedBooking.preferredStartTime} - {selectedBooking.preferredEndTime}</div>
                          <div className="text-[10px] font-black text-indigo-900 bg-white inline-block px-2 py-0.5 rounded-full uppercase tracking-tighter">Status: {selectedBooking.status}</div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Notes</label>
                   <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm italic text-slate-600 text-sm font-medium">
                      "{selectedBooking.notes || 'No special instructions provided by customer.'}"
                   </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                {selectedBooking.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => updateBookingStatus(selectedBooking._id, 'confirmed')}
                      className="flex-1 bg-emerald-600 text-white rounded-2xl py-4 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Session
                    </button>
                    <button 
                      onClick={() => updateBookingStatus(selectedBooking._id, 'cancelled')}
                      className="flex-1 bg-white border border-slate-200 text-rose-600 rounded-2xl py-4 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Ban className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
                {selectedBooking.status === 'confirmed' && (
                   <button 
                    onClick={() => updateBookingStatus(selectedBooking._id, 'completed')}
                    className="flex-1 bg-indigo-600 text-white rounded-2xl py-4 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                   >
                     Mark as Completed
                   </button>
                )}
                {['cancelled', 'completed'].includes(selectedBooking.status) && (
                   <button 
                    onClick={() => setSelectedBooking(null)}
                    className="flex-1 bg-slate-900 text-white rounded-2xl py-4 font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"
                   >
                     Close Record
                   </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

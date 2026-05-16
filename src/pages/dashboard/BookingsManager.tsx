import { useEffect, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Calendar as CalendarIcon, List } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function BookingsManager() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchBookings = () => {
    fetch('/v1/dashboard/bookings')
      .then(res => res.json())
      .then(data => setBookings(data?.data && Array.isArray(data.data) ? data.data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/v1/dashboard/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchBookings();
  };

  const filteredBookings = view === 'calendar' 
    ? bookings.filter(b => isSameDay(new Date(b.preferredDate), selectedDate))
    : bookings;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Manage Bookings</h2>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('list')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
              view === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
              view === 'calendar' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <CalendarIcon className="w-4 h-4" /> Calendar
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {view === 'calendar' && (
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <style>{`
              .react-calendar { border: none !important; width: 100% !important; font-family: inherit !important; }
              .react-calendar__tile--now { background: #f3f4f6 !important; border-radius: 8px; }
              .react-calendar__tile--active { background: #4f46e5 !important; border-radius: 8px; }
              .react-calendar__month-view__days__tile { height: 40px !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 0.875rem !important; }
              .has-booking::after { content: ''; position: absolute; bottom: 4px; width: 4px; height: 4px; background: #4f46e5; border-radius: 50%; }
            `}</style>
            <Calendar 
              onChange={(val) => setSelectedDate(val as Date)}
              value={selectedDate}
              tileClassName={({ date }) => {
                const hasBooking = bookings.some(b => isSameDay(new Date(b.preferredDate), date));
                return hasBooking ? 'has-booking' : '';
              }}
            />
          </div>
        )}

        <div className={cn(
          "bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden",
          view === 'calendar' ? "lg:col-span-8" : "lg:col-span-12"
        )}>
          {view === 'calendar' && (
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">{format(selectedDate, 'MMMM d, yyyy')}</h3>
              <span className="text-xs font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded">
                {filteredBookings.length} {filteredBookings.length === 1 ? 'Booking' : 'Bookings'}
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-slate-50 text-gray-900 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Service</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map(booking => (
                  <tr key={booking._id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{format(new Date(booking.preferredDate), 'MMM d, yyyy')}</div>
                      <div className="text-gray-500">{booking.preferredStartTime} - {booking.preferredEndTime}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{booking.fullName}</div>
                      <div className="text-xs text-gray-500">{booking.email}</div>
                      <div className="text-xs text-gray-500">{booking.phoneNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.serviceSelection}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize
                        ${booking.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                          booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <select 
                        value={booking.status}
                        onChange={(e) => updateStatus(booking._id, e.target.value)}
                        className="text-sm border border-gray-200 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      {view === 'calendar' ? 'No bookings on this date.' : 'No bookings found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

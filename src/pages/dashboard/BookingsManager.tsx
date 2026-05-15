import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export default function BookingsManager() {
  const [bookings, setBookings] = useState<any[]>([]);

  const fetchBookings = () => {
    fetch('/api/dashboard/bookings')
      .then(res => res.json())
      .then(data => setBookings(data));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/dashboard/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchBookings();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
            {bookings.map(booking => (
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
                <td className="px-6 py-4">
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
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

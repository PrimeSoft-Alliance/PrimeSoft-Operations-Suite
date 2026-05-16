import { useEffect, useState } from 'react';
import { CalendarDays, MessageSquare, Database, Bot } from 'lucide-react';

export default function DashboardHome() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/v1/dashboard/stats')
      .then(res => {
         if (!res.ok) return null;
         return res.json();
      })
      .then(data => {
         if (data?.success) setStats(data.data);
      })
      .catch(console.error);
  }, []);

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-500">Total Bookings</h3>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
          <p className="text-sm text-blue-600 mt-2 font-medium">{stats.pendingBookings} pending</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-500">Contact Messages</h3>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalContacts}</p>
          <p className="text-sm text-amber-600 mt-2 font-medium">{stats.unreadContacts} unread</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-500">AI Usage (Month)</h3>
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.usage.aiMessagesUsed}</p>
          <p className="text-sm text-gray-500 mt-2">of {stats.usage.aiMessagesLimit > 10000 ? 'Unlimited' : stats.usage.aiMessagesLimit} limit</p>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${stats.usage.aiMessagesLimit > 10000 ? 0 : Math.min(100, (stats.usage.aiMessagesUsed / stats.usage.aiMessagesLimit) * 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-500">Storage Used</h3>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(stats.usage.storageBytesUsed / 1024 / 1024).toFixed(2)} MB</p>
          <p className="text-sm text-gray-500 mt-2">of {stats.usage.storageBytesLimit > 100000000 ? 'Unlimited' : (stats.usage.storageBytesLimit / 1024 / 1024).toFixed(0) + ' MB'} limit</p>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${stats.usage.storageBytesLimit > 100000000 ? 0 : Math.min(100, (stats.usage.storageBytesUsed / stats.usage.storageBytesLimit) * 100)}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

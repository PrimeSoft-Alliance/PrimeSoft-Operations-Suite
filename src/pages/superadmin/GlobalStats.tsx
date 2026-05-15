import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';

export default function GlobalStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/super-admin/stats')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading stats...</div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Global Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Total Clients</div>
          <div className="text-3xl font-bold">{stats?.totalClients || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Total Bookings</div>
          <div className="text-3xl font-bold">{stats?.totalBookings || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">Total Contacts</div>
          <div className="text-3xl font-bold">{stats?.totalContacts || 0}</div>
        </div>
      </div>
    </div>
  );
}

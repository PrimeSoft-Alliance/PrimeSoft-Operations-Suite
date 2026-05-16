import React, { useEffect, useState } from 'react';
import { BarChart3, Users, MessageSquare, Database, AlertCircle, CalendarClock } from 'lucide-react';

export default function GlobalStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/super-admin/stats')
      .then(res => {
        if (!res.ok) {
           console.warn('Stats fetch not ok');
           return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setStats(data);
        } else {
          setStats({ totalClients: 0, totalBookings: 0, totalContacts: 0, storageUsed: 0, nearQuota: [] });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading stats...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Platform Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
          <div>
             <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Clients</div>
             <div className="text-3xl font-black mt-1 text-gray-900">{stats?.totalClients || 0}</div>
             <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {stats?.activeClients || 0} Active
             </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
             <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
          <div>
             <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bookings / Contacts</div>
             <div className="text-3xl font-black mt-1 text-gray-900">{stats?.totalBookings || 0} <span className="text-gray-300">/</span> {stats?.totalContacts || 0}</div>
             <div className="text-[10px] text-indigo-600 font-bold mt-1 uppercase tracking-widest">Platform Traffic</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
             <CalendarClock className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
          <div>
             <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Messages</div>
             <div className="text-3xl font-black mt-1 text-gray-900">{stats?.totalMessages || 0}</div>
             <div className="text-[10px] text-purple-600 font-bold mt-1 uppercase">Platform Usage</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
             <MessageSquare className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
          <div>
             <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Tasks</div>
             <div className="text-3xl font-black mt-1 text-amber-600 font-mono italic">{stats?.pendingOnboarding || 0}</div>
             <div className="text-[10px] text-amber-600 font-bold mt-1 uppercase">REQUIRES ACTION</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
             <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
         <div className="bg-white p-6 rounded-xl border border-gray-200">
           <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Clients Near Quota
           </h3>
           {stats?.nearQuota && stats.nearQuota.length > 0 ? (
             <ul className="space-y-4">
                {stats.nearQuota.map((client: any) => (
                  <li key={client._id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                    <span className="font-medium">{client.businessName}</span>
                    <span className="text-gray-500">{client.aiMessageLimit} max</span>
                  </li>
                ))}
             </ul>
           ) : (
             <p className="text-gray-500 text-sm">No clients are currently near their quota limit.</p>
           )}
         </div>

         <div className="bg-white p-6 rounded-xl border border-gray-200">
           <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Recent Activity
           </h3>
           <p className="text-gray-500 text-sm">System running normally. API endpoint active.</p>
         </div>
      </div>
    </div>
  );
}

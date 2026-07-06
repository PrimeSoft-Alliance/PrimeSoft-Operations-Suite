import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Loader2, Database, Zap, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useClientId } from '../../lib/useClientId';

export default function QuotaDashboard() {
  const [quotas, setQuotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotas();
  }, []);

  const fetchQuotas = () => {
    fetch('/v1/sys-admin/clients?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        if(data?.success) setQuotas(data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleTierChange = async (clientId: string, newTier: string) => {
    if (!confirm(`Are you sure you want to change this client's tier to ${newTier.toUpperCase()}? This will immediately apply new quota limits.`)) return;
    
    setUpdating(clientId);
    try {
      const res = await fetch(`/v1/sys-admin/clients/${clientId}/tier`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier: newTier })
      });
      const data = await res.json();
      if (data.success) {
        alert('Tier updated successfully');
        fetchQuotas();
      } else {
        alert(data.error || 'Failed to update tier');
      }
    } catch (err) {
      alert('Error updating tier');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" /> Quota Dashboard
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage tenant tiers and monitor platform limits</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-gray-700">Client ID</th>
              <th className="p-4 font-semibold text-gray-700">Business Name</th>
              <th className="p-4 font-semibold text-gray-700">Current Tier</th>
              <th className="p-4 font-semibold text-gray-700">Change Tier</th>
              <th className="p-4 font-semibold text-gray-700">AI Tokens Limit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotas.map((q: any) => (
              <tr key={q._id} className="hover:bg-slate-50/50 transition">
                <td className="p-4 font-mono text-indigo-600">{q.clientId}</td>
                <td className="p-4 font-medium text-gray-900">{q.businessName}</td>
                <td className="p-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    q.tier === 'enterprise' ? "bg-purple-100 text-purple-700" :
                    q.tier === 'professional' ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  )}>
                    {q.tier || 'starter'}
                  </span>
                </td>
                <td className="p-4">
                  <select 
                    disabled={updating === q.clientId}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50"
                    value={q.tier || 'starter'}
                    onChange={(e) => handleTierChange(q.clientId, e.target.value)}
                  >
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </td>
                <td className="p-4 font-medium text-gray-700 max-w-[200px] truncate">{q.aiMessageLimit || 'Default'} limit</td>
              </tr>
            ))}
          </tbody>
        </table>
        {quotas.length === 0 && (
          <div className="p-8 text-center text-gray-500 font-medium">No clients found in the system.</div>
        )}
      </div>
    </div>
  );
}

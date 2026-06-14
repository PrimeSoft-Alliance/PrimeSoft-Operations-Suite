import React, { useState, useEffect } from 'react';
import { useClientId } from '../lib/useClientId';
import { Database, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function QuotaStatusWidget() {
  const { clientId } = useClientId();
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    
    fetch(`/v1/public/quota-check?clientId=${clientId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setQuota(data.data);
        } else {
          setError(data.error?.message || 'Failed to load quota');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="p-4 border rounded-xl animate-pulse bg-slate-50 h-32" />;
  if (error) return <div className="p-4 border border-red-200 text-red-500 rounded-xl flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Error loading quota: {error}</div>;
  if (!quota) return null;

  const aiPercentage = Math.min(100, (quota.aiTokensUsed / quota.aiTokensLimit) * 100);
  const isNearLimit = aiPercentage >= 80;
  const isExhausted = aiPercentage >= 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-500" />
          Subscription & Quotas
        </h3>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider">
          {quota.tier} Tier
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-1"><Zap className="w-4 h-4 text-amber-500" /> AI Tokens (Monthly)</span>
          <span className="font-medium">
            {quota.aiTokensUsed.toLocaleString()} / {quota.aiTokensLimit.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${aiPercentage}%` }}
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              isExhausted ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-emerald-500"
            )}
          />
        </div>
        {isExhausted && <p className="text-xs text-red-500 flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3"/> Quota exhausted. Consider upgrading.</p>}
        {!isExhausted && isNearLimit && <p className="text-xs text-amber-600 flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3"/> Nearing monthly limit.</p>}
      </div>
    </div>
  );
}

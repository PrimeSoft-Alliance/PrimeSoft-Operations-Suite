import React from 'react';
import { useClientId } from '../../../lib/useClientId';
import { WhatsAppIntegrationPanel } from '../../../components/dashboard/WhatsAppIntegrationPanel';

export default function WhatsAppIntegration() {
  const { clientId } = useClientId();
  
  if (!clientId) return null;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">WhatsApp Integration</h1>
          <p className="text-slate-500 text-sm font-medium">Enterprise-grade WhatsApp Business API connection.</p>
        </div>
      </header>

      <WhatsAppIntegrationPanel clientId={clientId} />
    </div>
  );
}

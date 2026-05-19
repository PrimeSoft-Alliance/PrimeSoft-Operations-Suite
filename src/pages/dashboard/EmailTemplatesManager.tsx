import React, { useEffect, useState } from 'react';
import { Mail, Save } from 'lucide-react';

export default function EmailTemplatesManager() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch(`/v1/dashboard/settings?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        const settingsData = data?.success && data.data ? data.data : data;
        if (settingsData) setSettings(settingsData);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      const res = await fetch('/v1/dashboard/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data?.success) setSettings(data.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (key: string, value: string) => {
    setSettings((prev: any) => ({
      ...prev,
      emailTemplates: {
        ...(prev.emailTemplates || {}),
        [key]: value
      }
    }));
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  const availableVariables = [
    '{{customerName}}', '{{businessName}}', '{{date}}', '{{time}}', 
    '{{service}}', '{{message}}', '{{phone}}', '{{email}}', 
    '{{subject}}', '{{preferredContactMethod}}'
  ];

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <form onSubmit={handleSave} className="space-y-8">
        
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              Email Templates
            </h3>
          </div>
          <p className="text-sm text-gray-500 mb-6">Customize the automated emails sent to you and your customers.</p>
          
          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Available Variables</h4>
            <div className="flex flex-wrap gap-2">
              {availableVariables.map(v => (
                <span key={v} className="bg-white border border-gray-300 px-2.5 py-1 rounded text-xs font-mono text-indigo-600">
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Booking Confirmation (Sent to Customer)</label>
              <textarea 
                rows={4} 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.emailTemplates?.bookingConfirmation || ''} 
                onChange={e => updateTemplate('bookingConfirmation', e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Booking Notification (Sent to You)</label>
              <textarea 
                rows={4} 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.emailTemplates?.bookingNotification || ''} 
                onChange={e => updateTemplate('bookingNotification', e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Booking Reschedule (Sent to Customer)</label>
              <textarea 
                rows={4} 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.emailTemplates?.bookingReschedule || ''} 
                onChange={e => updateTemplate('bookingReschedule', e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Acknowledgment (Sent to Customer)</label>
              <textarea 
                rows={4} 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.emailTemplates?.contactAck || ''} 
                onChange={e => updateTemplate('contactAck', e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Notification (Sent to You)</label>
              <textarea 
                rows={4} 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.emailTemplates?.contactNotification || ''} 
                onChange={e => updateTemplate('contactNotification', e.target.value)} 
              />
            </div>
          </div>
        </section>

        <div className="fixed bottom-0 left-64 right-0 p-4 bg-white border-t border-gray-200 flex justify-end items-center px-8 z-10">
          {saveSuccess && <span className="text-sm text-green-600 font-medium mr-4 flex items-center">✓ Saved successfully</span>}
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Templates'}
          </button>
        </div>

      </form>
    </div>
  );
}

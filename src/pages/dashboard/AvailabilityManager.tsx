import React, { useEffect, useState } from 'react';
import { Calendar, Save, Trash2, Plus } from 'lucide-react';

export default function AvailabilityManager() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/v1/dashboard/settings')
      .then(res => res.json())
      .then(data => {
        if (data?.success) setSettings(data.data);
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

  const updateField = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <form onSubmit={handleSave} className="space-y-8">
        
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Availability & Scheduling
            </h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Buffer Time (Minutes)</label>
              <input 
                type="number" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.bufferTimeMinutes || 30} 
                onChange={e => updateField('bufferTimeMinutes', Number(e.target.value))} 
              />
              <p className="text-xs text-gray-500 mt-1">Time added between appointments</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Slot Duration (Minutes)</label>
              <input 
                type="number" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={settings.slotDurationMinutes || 60} 
                onChange={e => updateField('slotDurationMinutes', Number(e.target.value))} 
              />
              <p className="text-xs text-gray-500 mt-1">Default booking slot length</p>
            </div>
          </div>

          <div className="mb-8">
             <h4 className="text-lg font-medium text-gray-900 mb-4">Weekly Working Hours</h4>
             <div className="space-y-4">
                {daysOfWeek.map((dayName, dayIndex) => {
                  const hourObj = (settings.workingHours || []).find((wh: any) => wh.day === dayIndex) || { day: dayIndex, isOpen: false, openTime: '08:00', closeTime: '17:00' };
                  
                  return (
                    <div key={dayIndex} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="w-32 flex items-center gap-2">
                         <input 
                           type="checkbox" 
                           className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                           checked={hourObj.isOpen}
                           onChange={e => {
                             let newHours = [...(settings.workingHours || [])];
                             const idx = newHours.findIndex((wh: any) => wh.day === dayIndex);
                             if (idx >= 0) newHours[idx].isOpen = e.target.checked;
                             else newHours.push({ ...hourObj, isOpen: e.target.checked });
                             updateField('workingHours', newHours);
                           }}
                         />
                         <span className="font-medium text-sm text-gray-700">{dayName}</span>
                      </div>
                      
                      {hourObj.isOpen ? (
                        <div className="flex items-center gap-3">
                           <input 
                             type="time" 
                             className="bg-white border border-slate-200 rounded-lg p-2.5 text-sm"
                             value={hourObj.openTime}
                             onChange={e => {
                               let newHours = [...(settings.workingHours || [])];
                               const idx = newHours.findIndex((wh: any) => wh.day === dayIndex);
                               if (idx >= 0) newHours[idx].openTime = e.target.value;
                               else newHours.push({ ...hourObj, openTime: e.target.value });
                               updateField('workingHours', newHours);
                             }}
                           />
                           <span className="text-sm text-gray-500">to</span>
                           <input 
                             type="time" 
                             className="bg-white border border-slate-200 rounded-lg p-2.5 text-sm"
                             value={hourObj.closeTime}
                             onChange={e => {
                               let newHours = [...(settings.workingHours || [])];
                               const idx = newHours.findIndex((wh: any) => wh.day === dayIndex);
                               if (idx >= 0) newHours[idx].closeTime = e.target.value;
                               else newHours.push({ ...hourObj, closeTime: e.target.value });
                               updateField('workingHours', newHours);
                             }}
                           />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Closed</span>
                      )}
                    </div>
                  );
                })}
             </div>
          </div>

          <div>
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-900">Closed Dates / Holidays</h4>
                <button 
                  type="button" 
                  onClick={() => updateField('closedDates', [...(settings.closedDates || []), ''])}
                  className="flex items-center gap-1 text-sm bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100"
                >
                  <Plus className="w-4 h-4" /> Add Date
                </button>
             </div>
             
             <div className="grid md:grid-cols-3 gap-4">
                {(settings.closedDates || []).map((dateStr: string, idx: number) => (
                  <div key={idx} className="flex gap-2">
                     <input 
                       type="date"
                       className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm"
                       value={dateStr}
                       onChange={e => {
                         const newDates = [...settings.closedDates];
                         newDates[idx] = e.target.value;
                         updateField('closedDates', newDates);
                       }}
                     />
                     <button
                       type="button"
                       onClick={() => updateField('closedDates', settings.closedDates.filter((_: any, i: number) => i !== idx))}
                       className="text-gray-400 hover:text-red-500 p-2"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                  </div>
                ))}
                {(!settings.closedDates || settings.closedDates.length === 0) && (
                  <div className="md:col-span-3 text-sm text-gray-500 italic">No specific closed dates set.</div>
                )}
             </div>
          </div>
        </section>

        <div className="fixed bottom-0 left-64 right-0 p-4 bg-white border-t border-gray-200 flex justify-end items-center px-8 z-10">
          {saveSuccess && <span className="text-sm text-green-600 font-medium mr-4 flex items-center">✓ Saved successfully</span>}
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Availability Config'}
          </button>
        </div>

      </form>
    </div>
  );
}

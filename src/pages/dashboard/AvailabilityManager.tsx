import React, { useEffect, useState } from 'react';
import { Calendar, Save, Trash2, Plus, CheckCircle2, Loader2, Clock } from 'lucide-react';

export default function AvailabilityManager() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch(`/v1/settings?t=${Date.now()}`)
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
      const res = await fetch('/v1/settings', {
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
      <p className="text-sm font-medium">Loading settings...</p>
    </div>
  );

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Availability & Scheduling</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage your working hours, buffer times, and holidays.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" form="availabilityForm" disabled={saving} className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm max-w-4xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-xs font-bold">Settings saved successfully.</p>
        </div>
      )}

      <form id="availabilityForm" onSubmit={handleSave} className="max-w-4xl space-y-8">
        
        {/* Basic Config */}
        <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            Time Configurations
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Buffer Time (Minutes)</label>
              <input 
                type="number" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                value={settings.bufferTimeMinutes || 30} 
                onChange={e => updateField('bufferTimeMinutes', Number(e.target.value))} 
              />
              <p className="text-xs text-slate-500 mt-2 font-medium">Time added between appointments</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Slot Duration (Minutes)</label>
              <input 
                type="number" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                value={settings.slotDurationMinutes || 60} 
                onChange={e => updateField('slotDurationMinutes', Number(e.target.value))} 
              />
              <p className="text-xs text-slate-500 mt-2 font-medium">Default booking slot length</p>
            </div>
          </div>
        </section>

        {/* Weekly Schedule */}
        <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            Weekly Working Hours
          </h3>
           <div className="space-y-4">
              {daysOfWeek.map((dayName, dayIndex) => {
                const hourObj = (settings.workingHours || []).find((wh: any) => wh.day === dayIndex) || { day: dayIndex, isOpen: false, openTime: '08:00', closeTime: '17:00' };
                
                return (
                  <div key={dayIndex} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <label className="w-32 flex items-center gap-3 cursor-pointer shrink-0">
                       <input 
                         type="checkbox" 
                         className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                         checked={hourObj.isOpen}
                         onChange={e => {
                           let newHours = [...(settings.workingHours || [])];
                           const idx = newHours.findIndex((wh: any) => wh.day === dayIndex);
                           if (idx >= 0) newHours[idx].isOpen = e.target.checked;
                           else newHours.push({ ...hourObj, isOpen: e.target.checked });
                           updateField('workingHours', newHours);
                         }}
                       />
                       <span className="font-bold text-sm text-slate-700">{dayName}</span>
                    </label>
                    
                    {hourObj.isOpen ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                         <input 
                           type="time" 
                           className="bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-full sm:w-auto"
                           value={hourObj.openTime}
                           onChange={e => {
                             let newHours = [...(settings.workingHours || [])];
                             const idx = newHours.findIndex((wh: any) => wh.day === dayIndex);
                             if (idx >= 0) newHours[idx].openTime = e.target.value;
                             else newHours.push({ ...hourObj, openTime: e.target.value });
                             updateField('workingHours', newHours);
                           }}
                         />
                         <span className="text-xs font-bold text-slate-400 uppercase text-center">to</span>
                         <input 
                           type="time" 
                           className="bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-full sm:w-auto"
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
                      <div className="flex-1 flex items-center h-[46px]">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-md">Closed</span>
                      </div>
                    )}
                  </div>
                );
              })}
           </div>
        </section>

        {/* Holidays */}
        <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
           <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-500" />
                Closed Dates & Holidays
              </h3>
              <button 
                type="button" 
                onClick={() => updateField('closedDates', [...(settings.closedDates || []), ''])}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Date
              </button>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(settings.closedDates || []).map((dateStr: string, idx: number) => (
                <div key={idx} className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                   <input 
                     type="date"
                     className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500"
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
                     className="bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-500 p-2.5 rounded-lg transition-colors flex items-center justify-center shrink-0"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              ))}
              {(!settings.closedDates || settings.closedDates.length === 0) && (
                <div className="sm:col-span-2 lg:col-span-3 text-sm font-medium text-slate-400 italic bg-slate-50 p-6 rounded-2xl border border-slate-100 border-dashed text-center">
                  No specific closed dates set.
                </div>
              )}
           </div>
        </section>

      </form>
    </div>
  );
}

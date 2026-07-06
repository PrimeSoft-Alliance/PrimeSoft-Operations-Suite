import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Bell, Copy, Check, RefreshCw, 
  Settings, AlertCircle, CheckCircle2, ChevronRight,
  Shield, ArrowLeft, Send, Sparkles, AlertTriangle, Link2
} from 'lucide-react';
import { useClientId } from '../../../lib/useClientId';

export default function CalendarIntegration() {
  const { clientId } = useClientId();
  const [loading, setLoading] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testBookingId, setTestBookingId] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // States for Reminders & Alarms Configuration
  const [enabledAlarms, setEnabledAlarms] = useState<string[]>(['24h', '1h']);
  const [alarmChannel, setAlarmChannel] = useState<'email' | 'whatsapp' | 'both'>('email');
  const [customMinutes, setCustomMinutes] = useState('15');
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // Load configuration from settings
  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    fetch(`/v1/settings`)
      .then(res => res.json())
      .then(data => {
        const setts = data?.success && data.data ? data.data : data;
        if (setts?.reminderRules) {
          setEnabledAlarms(setts.reminderRules);
        }
        if (setts?.branding?.alarmChannel) {
          setAlarmChannel(setts.branding.alarmChannel);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clientId]);

  const feedUrl = clientId 
    ? `${window.location.origin}/v1/bookings/feed/${clientId}.ics`
    : `${window.location.origin}/v1/bookings/feed/demo.ics`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2000);
  };

  const handleToggleAlarm = (rule: string) => {
    if (enabledAlarms.includes(rule)) {
      setEnabledAlarms(enabledAlarms.filter(r => r !== rule));
    } else {
      setEnabledAlarms([...enabledAlarms, rule]);
    }
  };

  const handleAddCustomAlarm = () => {
    const minutesVal = parseInt(customMinutes);
    if (!isNaN(minutesVal) && minutesVal > 0) {
      const rule = `${minutesVal}m`;
      if (!enabledAlarms.includes(rule)) {
        setEnabledAlarms([...enabledAlarms, rule]);
      }
      setCustomMinutes('');
    }
  };

  const handleSaveSettings = async () => {
    setSavingRules(true);
    setSaveSuccess(false);
    try {
      // Fetch existing settings
      const getRes = await fetch('/v1/settings');
      const getData = await getRes.json();
      const currentSettings = getData?.success && getData.data ? getData.data : getData;

      const updatedSettings = {
        ...currentSettings,
        reminderRules: enabledAlarms,
        branding: {
          ...(currentSettings?.branding || {}),
          alarmChannel: alarmChannel
        }
      };

      const res = await fetch('/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save reminder rules:', err);
      alert('Failed to save configurations');
    } finally {
      setSavingRules(false);
    }
  };

  const triggerTestReminders = async () => {
    if (!testBookingId) return;
    setTestSending(true);
    setTestSuccess(false);
    try {
      const res = await fetch(`/v1/bookings/${testBookingId}/reminders/trigger`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-id': clientId || ''
        }
      });
      if (res.ok) {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 4000);
      } else {
        alert('Could not trigger reminder. Make sure the Booking ID exists and status is confirmed.');
      }
    } catch (e) {
      alert('Error triggering test reminders');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-300">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Calendar className="w-8 h-8 text-indigo-600" />
          Calendar, iCal &amp; Alarm Center
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Synchronize your appointments with external calendars and configure background alarms.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Controls */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* iCal Feed Sync */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-sky-50 rounded-2xl text-sky-600">
                    <Link2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Live iCal / WebCal Feed</h2>
                    <p className="text-xs font-semibold text-slate-400">Subscribe dynamically from any device</p>
                  </div>
                </div>
                <span className="bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                  Active Feed
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Connect your booking pipeline dynamically with <strong>Google Calendar</strong>, <strong>Apple Calendar</strong>, 
                or <strong>Microsoft Outlook</strong>. Updates to your appointments instantly synchronize without any manual exports.
              </p>

              <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Your Personal iCal Feed URL
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={feedUrl}
                    className="flex-1 bg-white border border-slate-200 text-xs font-mono px-4 py-3 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button 
                    onClick={copyToClipboard}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-xs transition-colors flex items-center gap-2"
                  >
                    {copiedFeed ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex items-start gap-4">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Security Notice</h4>
                  <p className="text-xs text-amber-700 leading-relaxed mt-1">
                    This feed URL contains a unique identifier linked to your business. Do not share this URL publicly. Anyone with access to this link can view scheduled appointment details.
                  </p>
                </div>
              </div>
            </div>

            {/* Alarm & Notification Rules */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                    <Bell className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Booking Alarms &amp; Reminders</h2>
                    <p className="text-xs font-semibold text-slate-400">Automated background triggers</p>
                  </div>
                </div>
                <span className="bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                  Active (BullMQ Enabled)
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Configure background workers to trigger alarms before appointments. This keeps your customers notified automatically, decreasing no-show rates.
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Active Reminder Triggers
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { key: '24h', label: '24 Hours Before' },
                      { key: '1h', label: '1 Hour Before' },
                      { key: '30m', label: '30 Minutes Before' },
                    ].map(rule => (
                      <button
                        key={rule.key}
                        type="button"
                        onClick={() => handleToggleAlarm(rule.key)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left font-bold text-sm ${
                          enabledAlarms.includes(rule.key)
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {rule.label}
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          enabledAlarms.includes(rule.key) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                        }`}>
                          {enabledAlarms.includes(rule.key) && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Custom Alarm offset (Minutes)
                    </label>
                    <input 
                      type="number" 
                      min="1"
                      placeholder="e.g. 15, 45" 
                      value={customMinutes}
                      onChange={e => setCustomMinutes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs px-4 py-3 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomAlarm}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-xs transition-colors whitespace-nowrap"
                  >
                    Add custom trigger
                  </button>
                </div>

                {enabledAlarms.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-xl flex flex-wrap gap-2 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 self-center">Active Alarms:</span>
                    {enabledAlarms.map(rule => (
                      <span key={rule} className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1.5">
                        {rule}
                        <button onClick={() => handleToggleAlarm(rule)} className="hover:text-rose-600 font-bold">&times;</button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Notification Dispatch Channel
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: 'email', label: 'Email Only' },
                      { key: 'whatsapp', label: 'WhatsApp Only' },
                      { key: 'both', label: 'Both Channels' },
                    ].map(ch => (
                      <button
                        key={ch.key}
                        type="button"
                        onClick={() => setAlarmChannel(ch.key as any)}
                        className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                          alarmChannel === ch.key
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {saveSuccess && (
                      <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Configurations saved successfully!
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingRules}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    {savingRules && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Save Reminder Rules
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Right Sidebar - Status & Live Tester */}
          <div className="space-y-8">
            
            {/* Live Testing Lab */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Alarm Sandbox Lab</h3>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed">
                Simulate manual or automatic background alarms for a specific booking. Enter a valid booking ID to force test reminder alerts immediately.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Confirmed Booking ID
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. 64b3c8f...90ab" 
                    value={testBookingId}
                    onChange={e => setTestBookingId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-mono px-4 py-3 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  disabled={testSending || !testBookingId}
                  onClick={triggerTestReminders}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {testSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Dispatching Alarms...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Test Alarm Notifications
                    </>
                  )}
                </button>

                {testSuccess && (
                  <div className="bg-green-50 text-green-800 border border-green-100 p-4 rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Alarms successfully simulated!</strong> Background workers successfully dispatched test email notifications immediately.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Google Calendar Direct Sync Status */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Google Calendar</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Two-Way Sync</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Sign in to link OminiRep directly with your corporate Google Workspace calendar. This lets the AI read your real availability and write confirmed slots instantly.
              </p>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Integration Status:</span>
                  <span className="font-black text-rose-600 uppercase tracking-wider">Disconnected</span>
                </div>

                <button
                  onClick={() => alert('Initiating Google Workspace secure OAuth connection...')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-md shadow-blue-100 text-center"
                >
                  Link Google Calendar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

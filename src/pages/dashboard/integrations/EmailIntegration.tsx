import React, { useState, useEffect } from 'react';
import { Mail, Key, Globe, ShieldCheck, CheckCircle2, Save, RefreshCw, BarChart3, Info, Server, Lock, Send, Download, Sparkles, Trash2, HelpCircle } from 'lucide-react';
import { useClientId } from '../../../lib/useClientId';

export default function EmailIntegration() {
  const { clientId } = useClientId();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpFromEmail: '',
    smtpFromName: '',
    smtpUseTls: false,
    inboundEmailHost: '',
    inboundEmailPort: 993,
    inboundEmailUser: '',
    inboundEmailPass: '',
    inboundEmailSsl: true,
    inboundSyncStatus: 'not_configured'
  });

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [simulateSender, setSimulateSender] = useState('customer@example.com');
  const [simulateSubject, setSimulateSubject] = useState('Inquiry about active booking options');
  const [simulateContent, setSimulateContent] = useState('Hi support team,\n\nI was looking to reschedule my booking tomorrow. Do you have slots open?\n\nBest,\nCustomer');
  const [simulateLoading, setSimulateLoading] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchSettings();
      fetchLogs();
    }
  }, [clientId]);

  const fetchLogs = async () => {
    if (!clientId) return;
    setLogsLoading(true);
    try {
      const res = await fetch('/v1/email-sandbox/logs', { headers: { 'x-client-id': clientId } });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch sandbox logs:', e);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!clientId) return;
    if (!confirm('Are you sure you want to clear all simulated email logs?')) return;
    try {
      const res = await fetch('/v1/email-sandbox/logs', {
        method: 'DELETE',
        headers: { 'x-client-id': clientId }
      });
      const data = await res.json();
      if (data.success) {
        setLogs([]);
      }
    } catch (e) {
      alert('Failed to clear logs');
    }
  };

  const handleSimulateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    if (!simulateSender || !simulateContent) {
      alert('Sender and content are required for simulation.');
      return;
    }
    setSimulateLoading(true);
    try {
      const res = await fetch('/v1/email-sandbox/simulate-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
        body: JSON.stringify({
          sender: simulateSender,
          subject: simulateSubject,
          content: simulateContent
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Simulated email ingested! The AI auto-replied and sent an SMTP message back.');
        setSimulateContent('');
        fetchLogs();
      } else {
        alert('Simulation failed: ' + data.error);
      }
    } catch (e) {
      alert('Simulation error');
    } finally {
      setSimulateLoading(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/settings', { headers: { 'x-client-id': clientId! } });
      const data = await res.json();
      if (data.success) {
        setSettings({
          ...settings,
          ...data.data
        });
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { emailConfig: settings.emailConfig };
      const res = await fetch('/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Email configuration saved and services restarted!');
      } else {
        alert('Error: ' + data.error?.message);
      }
    } catch (e) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    const email = prompt('Enter recipient email for test:');
    if (!email) return;
    
    setLoading(true);
    try {
      const res = await fetch('/v1/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify({ email, smtp: settings })
      });
      const data = await res.json();
      if (data.success) alert('Test email sent! Check your inbox.');
      else alert('Failed: ' + data.error);
    } catch (e) {
      alert('Test failed');
    } finally {
      setLoading(false);
    }
  };

  const testImap = async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/test-imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId! },
        body: JSON.stringify({
          host: settings.inboundEmailHost,
          port: settings.inboundEmailPort,
          user: settings.inboundEmailUser,
          pass: settings.inboundEmailPass,
          ssl: settings.inboundEmailSsl
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.data?.message || 'IMAP Connection Succeeded!');
      } else {
        alert('IMAP Connection Failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      alert('IMAP Connection Failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">Accessing Mail Servers...</div>;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Email Integration (SMTP/IMAP)</h1>
          <p className="text-slate-500 text-sm font-medium">Configure custom mail servers for outgoing and incoming customer threads.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={testImap}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2"
            >
                <Download className="w-4 h-4 text-amber-500" />
                Test Incoming (IMAP)
            </button>
            <button 
                onClick={testEmail}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2"
            >
                <Send className="w-4 h-4 text-indigo-500" />
                Test Outgoing (SMTP)
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            {/* SMTP Section */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Send className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Outgoing Mail (SMTP)</h3>
                        <p className="text-sm font-medium text-slate-400">Settings for sending transactional and marketing emails.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">SMTP Host</label>
                            <input 
                                value={settings.smtpHost}
                                onChange={e => setSettings({...settings, smtpHost: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                placeholder="smtp.gmail.com" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Port</label>
                            <input 
                                type="number"
                                value={settings.smtpPort}
                                onChange={e => setSettings({...settings, smtpPort: parseInt(e.target.value)})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                placeholder="587" 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Username</label>
                            <input 
                                value={settings.smtpUser}
                                onChange={e => setSettings({...settings, smtpUser: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                placeholder="user@domain.com" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Password</label>
                            <input 
                                type="password"
                                value={settings.smtpPass}
                                onChange={e => setSettings({...settings, smtpPass: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                placeholder="••••••••" 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">From Name</label>
                            <input 
                                value={settings.smtpFromName}
                                onChange={e => setSettings({...settings, smtpFromName: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                placeholder="My Business Support" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">From Email</label>
                            <input 
                                value={settings.smtpFromEmail}
                                onChange={e => setSettings({...settings, smtpFromEmail: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                placeholder="support@domain.com" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* IMAP Section */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                        <Download className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Incoming Mail (IMAP)</h3>
                        <p className="text-sm font-medium text-slate-400">Configure real-time polling for incoming customer replies.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">IMAP Host</label>
                            <input 
                                value={settings.inboundEmailHost}
                                onChange={e => setSettings({...settings, inboundEmailHost: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all" 
                                placeholder="imap.gmail.com" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Port</label>
                            <input 
                                type="number"
                                value={settings.inboundEmailPort}
                                onChange={e => setSettings({...settings, inboundEmailPort: parseInt(e.target.value)})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all" 
                                placeholder="993" 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Username</label>
                            <input 
                                value={settings.inboundEmailUser}
                                onChange={e => setSettings({...settings, inboundEmailUser: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all" 
                                placeholder="user@domain.com" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Password</label>
                            <input 
                                type="password"
                                value={settings.inboundEmailPass}
                                onChange={e => setSettings({...settings, inboundEmailPass: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all" 
                                placeholder="••••••••" 
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex-1">
                            <h4 className="text-sm font-black text-slate-800">Synchronize Mailbox</h4>
                            <p className="text-xs font-medium text-slate-500">Enable real-time monitoring via IMAP IDLE.</p>
                        </div>
                        <select 
                            value={settings.inboundSyncStatus}
                            onChange={e => setSettings({...settings, inboundSyncStatus: e.target.value})}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none"
                        >
                            <option value="not_configured">Disabled</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                        </select>
                    </div>
                </div>
            </div>

            <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black hover:bg-slate-800 shadow-xl transition-all flex items-center justify-center gap-2"
            >
                <Save className="w-6 h-6" />
                {saving ? 'Restarting Sync Engines...' : 'Save & Initialize Email Engine'}
            </button>
        </div>

        <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white sticky top-24">
                <h4 className="text-xl font-black mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-indigo-500" />
                    Open-Source Stack
                </h4>
                <p className="text-sm font-medium text-slate-400 leading-relaxed mb-8">
                    Your email infrastructure is now entirely decoupled from paid third-party APIs. We use Nodemailer for secure transit and ImapFlow for real-time synchronization.
                </p>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white">Full Message Logs</p>
                            <p className="text-[10px] text-slate-500">Every byte is stored in your master timeline.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white">Transactional Speed</p>
                            <p className="text-[10px] text-slate-500">Immediate delivery for bookings and alerts.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white">Reply Handling</p>
                            <p className="text-[10px] text-slate-500">Inbound mail triggers the omnichannel engine.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-10 p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                    <Info className="w-6 h-6 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-500 leading-tight">
                        Ensure you enable "Less Secure Apps" or use "App Passwords" for Gmail and similar providers.
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Dynamic Sandbox Section */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-8 mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Developer Sandbox &amp; Simulated Mailroom</h3>
              <p className="text-sm font-medium text-slate-400">Test SMTP outbox and IMAP inbound workflows in real-time without active mail servers.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchLogs}
              disabled={logsLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
              Refresh Streams
            </button>
            <button
              onClick={handleClearLogs}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Logs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form to simulate inbound */}
          <form onSubmit={handleSimulateInbound} className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Download className="w-4 h-4 text-amber-500" />
              Simulate Incoming Email (IMAP Sync)
            </h4>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Submit a simulated inbound message to test client contact creation, ticket matching, and AI auto-reply triggers.
            </p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sender Email</label>
                <input
                  type="email"
                  value={simulateSender}
                  onChange={e => setSimulateSender(e.target.value)}
                  placeholder="customer@example.com"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Subject</label>
                <input
                  type="text"
                  value={simulateSubject}
                  onChange={e => setSimulateSubject(e.target.value)}
                  placeholder="Need help with rescheduling"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Message Body</label>
                <textarea
                  value={simulateContent}
                  onChange={e => setSimulateContent(e.target.value)}
                  rows={4}
                  required
                  placeholder="Type simulated client email message..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={simulateLoading}
              className="w-full py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {simulateLoading ? 'Ingesting Simulated Stream...' : 'Trigger Simulated IMAP Receive'}
            </button>
          </form>

          {/* Sandbox email stream list */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-500" />
              Live Mailroom Console Logs
            </h4>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Every message dispatched (SMTP) or received (IMAP) inside the platform is logged here.
            </p>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[420px] overflow-y-auto bg-slate-50">
              {logsLoading && logs.length === 0 ? (
                <div className="p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                  Querying mail stream logs...
                </div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center text-xs font-semibold text-slate-400 leading-relaxed">
                  No email streams tracked yet.<br />
                  <span className="text-[10px] uppercase font-bold text-slate-300">Simulate an inbound email above or trigger a booking to see it in action.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const isInbound = log.direction === 'inbound';
                    const isSim = log.metadata?.isSimulated !== false;
                    return (
                      <div key={log._id} className="p-4 bg-white hover:bg-slate-50/50 transition-all space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isInbound 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}>
                            {isInbound ? '📥 IMAP Inbound' : '📤 SMTP Outbound'}
                          </span>

                          <div className="flex items-center gap-2">
                            {isSim && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[9px] font-bold">
                                Sandbox Mode
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs font-sans space-y-1">
                          <div>
                            <span className="font-extrabold text-slate-700">From: </span>
                            <span className="font-mono text-slate-500">{log.from}</span>
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-700">To: </span>
                            <span className="font-mono text-slate-500">{log.to}</span>
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-700">Subject: </span>
                            <span className="font-bold text-slate-800">{log.metadata?.subject || 'No Subject'}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap line-clamp-3">
                            {log.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

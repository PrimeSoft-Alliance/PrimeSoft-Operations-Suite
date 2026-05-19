import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Mail, Phone, MessageSquare, Clock, CheckCircle2, User, X, Eye, Trash2, MapPin } from 'lucide-react';
import { useClientId } from '../../lib/useClientId';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function ContactsManager() {
  const { clientId: cidHook } = useClientId();
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const fetchContacts = () => {
    setLoading(true);
    fetch(`/v1/dashboard/contacts?t=${Date.now()}`, {
      headers: { 'x-client-id': cidHook }
    })
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Contacts raw data:', data);
        const list = (data?.success && Array.isArray(data.data)) ? data.data : (Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []));
        setContacts(list);
        const business = data?.meta?.businessName || 'Business';
        const cid = data?.meta?.clientId || '...';
        setDebugInfo(`Vault: ${business} | Database: ${cid} | Records: ${list.length}`);
      })
      .catch(err => {
        console.error('Fetch contacts error:', err);
        setDebugInfo(`Offline / Error: ${err.message}`);
        setContacts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (cidHook) {
      fetchContacts();
    }
  }, [cidHook]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/v1/dashboard/contacts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchContacts();
    if (selectedContact && selectedContact._id === id) {
      setSelectedContact({ ...selectedContact, status });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Inquiries</h2>
          <p className="text-sm text-gray-500">Manage questions and messages from your website</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-slate-50 text-gray-900 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold">Contact Info</th>
                <th className="px-6 py-4 font-bold">Inquiry Summary</th>
                <th className="px-6 py-4 font-bold">Date Received</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map(contact => (
                <motion.tr 
                  key={contact._id} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}
                  className="group cursor-pointer transition-all duration-200 border-b border-gray-50"
                  onClick={() => setSelectedContact(contact)}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm transition-transform group-hover:scale-105",
                        contact.status === 'unread' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'
                      )}>
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                          {contact.name}
                          {contact.status === 'unread' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{contact.preferredContactMethod}</div>
                          {contact.location?.city && (
                            <div className="text-[10px] text-indigo-400 font-bold flex items-center gap-1 mt-0.5 uppercase tracking-wide">
                               <MapPin className="w-2.5 h-2.5" /> {contact.location.city}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                     <div className="font-bold text-gray-900 text-sm mb-1 truncate max-w-[240px]">{contact.subject || 'No Subject'}</div>
                     <div className="line-clamp-1 text-xs text-gray-400 italic">"{contact.message}"</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                      <Clock className="w-4 h-4 text-indigo-400/60" />
                      {format(new Date(contact.createdAt), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={cn(
                      "inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                      contact.status === 'unread' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    )}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-3 items-center opacity-40 group-hover:opacity-100 transition-opacity">
                       <button 
                          onClick={() => setSelectedContact(contact)}
                          className="p-2.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all active:scale-95"
                          title="View Message"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <div className="h-6 w-[1px] bg-gray-200 mx-1" />
                        <select 
                          value={contact.status}
                          onClick={e => e.stopPropagation()}
                          onChange={(e) => updateStatus(contact._id, e.target.value)}
                          className="text-xs font-bold border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white shadow-sm cursor-pointer capitalize"
                        >
                          <option value="unread">Unread</option>
                          <option value="resolved">Resolved</option>
                        </select>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-gray-50 rounded-full text-gray-300">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <p className="text-gray-500 font-medium">No inquiries received yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedContact && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedContact(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-[1000] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                <h3 className="text-xl font-bold">Inquiry Details</h3>
                <button onClick={() => setSelectedContact(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-8 text-left">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl font-black">
                    {selectedContact.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-2xl font-bold text-gray-900">{selectedContact.name}</h4>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <a href={`mailto:${selectedContact.email}`} className="text-sm text-indigo-600 hover:underline flex items-center gap-1.5 font-medium">
                        <Mail className="w-4 h-4" /> {selectedContact.email}
                      </a>
                      {selectedContact.phone && (
                        <a href={`tel:${selectedContact.phone}`} className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1.5 font-medium">
                          <Phone className="w-4 h-4" /> {selectedContact.phone}
                        </a>
                      )}
                    </div>
                    {selectedContact.location?.city && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full w-fit mt-2">
                        <MapPin className="w-3 h-3" /> {selectedContact.location.city}, {selectedContact.location.country}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Subject</div>
                    <div className="text-lg font-bold text-gray-900">{selectedContact.subject || 'No Subject'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Message</div>
                    <div className="text-gray-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200">
                      {selectedContact.message}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 px-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Received: {format(new Date(selectedContact.createdAt), 'MMMM d, yyyy HH:mm')}
                  </div>
                  <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
                    Status: <span className={cn(selectedContact.status === 'unread' ? 'text-amber-500' : 'text-green-500')}>{selectedContact.status}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-100">
                  {selectedContact.status === 'unread' ? (
                    <button 
                      onClick={() => updateStatus(selectedContact._id, 'resolved')}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Mark as Resolved
                    </button>
                  ) : (
                    <button 
                      onClick={() => updateStatus(selectedContact._id, 'unread')}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-2"
                    >
                      <Clock className="w-5 h-5" /> Mark as Unread
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedContact(null)}
                    className="px-8 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {debugInfo && (
        <div className="mt-8 flex justify-center">
          <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-full flex items-center gap-3 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
              Diagnostic Audit: {debugInfo}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

export default function ContactsManager() {
  const [contacts, setContacts] = useState<any[]>([]);

  const fetchContacts = () => {
    fetch('/v1/dashboard/contacts')
      .then(res => res.json())
      .then(data => setContacts(data?.data && Array.isArray(data.data) ? data.data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/v1/dashboard/contacts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchContacts();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-slate-50 text-gray-900 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Client</th>
              <th className="px-6 py-4 font-semibold">Message</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.map(contact => (
              <tr key={contact._id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {format(new Date(contact.createdAt), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{contact.name}</div>
                  <div className="text-xs text-gray-500">Prefers: {contact.preferredContactMethod}</div>
                  <div className="text-xs text-gray-500">{contact.email}</div>
                  <div className="text-xs text-gray-500">{contact.phone}</div>
                </td>
                <td className="px-6 py-4">
                   <div className="font-medium text-gray-900 text-xs mb-1">{contact.subject}</div>
                   <div className="line-clamp-3 text-xs">{contact.message}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize
                    ${contact.status === 'unread' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                    {contact.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <select 
                    value={contact.status}
                    onChange={(e) => updateStatus(contact._id, e.target.value)}
                    className="text-sm border border-gray-200 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                  >
                    <option value="unread">Unread</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No contacts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

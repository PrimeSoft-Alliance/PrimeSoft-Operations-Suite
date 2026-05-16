import { useState, useEffect } from 'react';
import { Eye, Search, Filter, Download, Trash2, Mail, Phone, Tag } from 'lucide-react';
import { useClientId } from '../../lib/useClientId';

export default function LeadsManager() {
  const { clientId } = useClientId();
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/v1/leads', {
        headers: { 'x-client-id': clientId }
      });
      const data = await res.json();
      if (data && data.success) setLeads(data.data || []);
    } catch (err) {}
  };

  const deleteLead = async (id: string) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await fetch(`/v1/leads/${id}`, {
        method: 'DELETE',
        headers: { 'x-client-id': clientId }
      });
      fetchLeads();
    } catch (err) {}
  };

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      await fetch(`/v1/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
        body: JSON.stringify({ status })
      });
      fetchLeads();
    } catch (err) {}
  };

  const exportCSV = () => {
    if (leads.length === 0) return;
    const headers = ['Name', 'Email', 'Phone', 'Form', 'Status', 'Date'];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + leads.map(e => [
          `${e.contactFirst || ''} ${e.contactLast || ''}`.trim(),
          e.contactEmail || '',
          e.contactPhone || '',
          e.formName || 'Unknown',
          e.status,
          new Date(e.createdAt).toLocaleDateString()
        ].map(val => `"${val}"`).join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "leads_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads.filter(l => 
    `${l.contactFirst} ${l.contactLast}`.toLowerCase().includes(search.toLowerCase()) ||
    (l.contactEmail || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.formName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
        <button onClick={exportCSV} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or form..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-600">Contact</th>
                <th className="px-6 py-4 font-medium text-gray-600">Form Captured</th>
                <th className="px-6 py-4 font-medium text-gray-600">Status</th>
                <th className="px-6 py-4 font-medium text-gray-600">Date</th>
                <th className="px-6 py-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{lead.contactFirst} {lead.contactLast}</div>
                    <div className="text-sm text-gray-500 flex flex-col gap-0.5 mt-1">
                       <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {lead.contactEmail || 'N/A'}</span>
                       <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {lead.contactPhone || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-1 text-sm bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                      <Tag className="w-3 h-3" /> {lead.formName || 'General Form'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead._id, e.target.value)}
                      className="text-sm border-gray-300 rounded-lg p-1"
                    >
                      <option value="new">New Lead</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="archived">Archived</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedLead(lead)} className="text-gray-500 hover:text-indigo-600" title="View details">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button onClick={() => deleteLead(lead._id)} className="text-gray-500 hover:text-red-600" title="Delete">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No leads found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">Lead Details</h2>
              <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Contact Info</h3>
                  <p className="font-medium">{selectedLead.contactFirst} {selectedLead.contactLast}</p>
                  <p className="text-gray-600">{selectedLead.contactEmail}</p>
                  <p className="text-gray-600">{selectedLead.contactPhone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Meta Info</h3>
                  <p><span className="text-gray-500 w-24 inline-block">Form:</span> <span className="font-medium text-indigo-600">{selectedLead.formName}</span></p>
                  <p><span className="text-gray-500 w-24 inline-block">Date:</span> {new Date(selectedLead.createdAt).toLocaleString()}</p>
                  <p><span className="text-gray-500 w-24 inline-block">Status:</span> <span className="capitalize">{selectedLead.status}</span></p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Submitted Answers</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {Object.entries(selectedLead.data || {}).map(([key, val]) => {
                     if (['firstName', 'lastName', 'email', 'phone', 'first_name', 'last_name'].includes(key)) return null;
                     return (
                        <div key={key}>
                          <div className="text-sm font-medium text-gray-700 capitalize mb-1">{key.replace(/_/g, ' ')}</div>
                          <div className="text-gray-900 bg-white px-3 py-2 border rounded">{String(val)}</div>
                        </div>
                     )
                  })}
                  {Object.entries(selectedLead.data || {}).filter(([k]) => !['firstName', 'lastName', 'email', 'phone', 'first_name', 'last_name'].includes(k)).length === 0 && (
                     <div className="text-gray-500 italic">No additional custom fields were filled.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setSelectedLead(null)} className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

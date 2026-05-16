import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, User, Mail, Phone, Briefcase, Calendar, MessageSquare, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function OnboardingRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const fetchRequests = async () => {
    try {
      const res = await fetch('/v1/super-admin/onboarding-requests');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRequests(data?.success && Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (requestId: string, action: 'approve' | 'reject' | 'info-request') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/v1/super-admin/onboarding-requests/${requestId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'approve' ? {} : (action === 'reject' ? { reason: notes } : { message: notes }))
      });
      if (res.ok) {
        fetchRequests();
        setSelectedRequest(null);
        setNotes('');
      } else {
        alert('Action failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading requests...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Requests</h1>
          <p className="text-gray-500">Manage new business applications and approvals.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No requests found</h3>
              <p className="text-gray-500 mt-1">New applications from the chatbot will appear here.</p>
            </div>
          ) : (
            requests.map((request) => (
              <motion.div
                layout
                key={request.requestId}
                onClick={() => setSelectedRequest(request)}
                className={`p-5 rounded-xl border transition-all cursor-pointer ${
                  selectedRequest?.requestId === request.requestId 
                    ? 'border-indigo-500 bg-indigo-50/30' 
                    : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                      request.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      request.status === 'info_needed' ? 'bg-amber-100 text-amber-600' :
                      'bg-indigo-100 text-indigo-600'
                    }`}>
                      {request.businessName[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{request.businessName}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                        <Mail className="w-3.5 h-3.5" /> {request.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      request.status === 'info_needed' ? 'bg-amber-100 text-amber-700' :
                      'bg-indigo-100 text-indigo-700 animate-pulse'
                    }`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-2 flex items-center justify-end gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedRequest ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="sticky top-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">{selectedRequest.businessName}</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" /> {selectedRequest.email}
                    </div>
                    {selectedRequest.phone && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" /> {selectedRequest.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Briefcase className="w-4 h-4 text-gray-400" /> {selectedRequest.businessType || 'Not specified'}
                    </div>
                  </div>
                </div>

                {selectedRequest.details && (
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Application Details</h3>
                    <div className="space-y-2">
                       {Object.entries(selectedRequest.details).map(([key, val]: [string, any]) => (
                         <div key={key} className="bg-gray-50 p-3 rounded-lg">
                           <p className="text-[10px] font-bold text-gray-400 uppercase">{key}</p>
                           <p className="text-sm text-gray-700">{val}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {selectedRequest.status === 'pending' || selectedRequest.status === 'reviewing' || selectedRequest.status === 'info_needed' ? (
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes / Message to User</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Resolution reason or info requested..."
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm h-24"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <button
                         disabled={actionLoading}
                         onClick={() => handleAction(selectedRequest.requestId, 'approve')}
                         className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                       >
                         <CheckCircle className="w-4 h-4" /> Approve
                       </button>
                       <button
                         disabled={actionLoading}
                         onClick={() => handleAction(selectedRequest.requestId, 'reject')}
                         className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                       >
                         <XCircle className="w-4 h-4" /> Reject
                       </button>
                       <button
                         disabled={actionLoading || !notes}
                         onClick={() => handleAction(selectedRequest.requestId, 'info-request')}
                         className="col-span-2 flex items-center justify-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                       >
                         <Info className="w-4 h-4" /> Request Info
                       </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-100">
                    <div className={`p-4 rounded-lg flex items-center gap-3 ${
                      selectedRequest.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {selectedRequest.status === 'approved' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                      <span className="font-semibold">Request {selectedRequest.status.toUpperCase()}</span>
                    </div>
                    {selectedRequest.superadminNotes && (
                       <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">
                         "{selectedRequest.superadminNotes}"
                       </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                 <MessageSquare className="w-12 h-12 text-gray-200 mb-4" />
                 <p className="text-gray-400">Select a request to view candidate details and take action.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

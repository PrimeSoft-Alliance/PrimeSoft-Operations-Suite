import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BookingSuccess() {
  const { id } = useParams();
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    setDownloaded(true);
    // Trigger download programmatically
    const link = document.createElement('a');
    link.href = `/api/bookings/${id}/ics`;
    link.download = `booking-${id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8"
      >
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 mb-2">Booking Confirmed!</h2>
        <p className="text-slate-600 mb-8">
          Your appointment has been successfully scheduled. We've also sent the details to your email address.
        </p>

        {downloaded ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-sky-50 text-sky-700 rounded-xl mb-8 border border-sky-100"
          >
            <p className="font-bold">Event sent to your email.</p>
            <p className="text-sm mt-1">Open it and add it to your calendar, or use the downloaded file.</p>
          </motion.div>
        ) : (
          <button 
            onClick={handleDownload}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-sky-200 flex items-center justify-center gap-2 mb-8"
          >
            <CalendarDays className="w-5 h-5" /> 
            Add to Calendar
          </button>
        )}
      </motion.div>
    </div>
  );
}

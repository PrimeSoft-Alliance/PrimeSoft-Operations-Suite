import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isBefore, startOfDay, addMinutes } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useClientId } from '../lib/useClientId';

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientId = useClientId();
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState(searchParams.get('service') || '');
  const [date, setDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<{startTime: string; endTime: string; displayTime?: string}[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    notes: ''
  });
  
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/public/settings?clientId=${clientId}`)
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json();
      })
      .then(data => {
        if (data && data.services) {
          setServices(data.services);
          if (!selectedService && data.services.length > 0) {
            setSelectedService(data.services[0].name);
          }
        }
        setLoadingServices(false);
      })
      .catch(err => {
        console.error('Settings load error:', err);
        setError('Failed to connect to service. Please refresh the page.');
        setLoadingServices(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedService || !date) return;
    
    setLoadingSlots(true);
    setSelectedSlot('');
    setError('');
    
    const serviceObj = services.find(s => s.name === selectedService);
    const duration = serviceObj ? serviceObj.durationMinutes : 60;

    fetch('/api/booking/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: date.toISOString(), durationMinutes: duration, clientId })
    })
    .then(async res => {
      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.error || 'Failed to check availability');
        } catch {
          throw new Error('Failed to check availability (Server Error)');
        }
      }
      return res.json();
    })
    .then(data => {
      setAvailableSlots(data.availableSlots || []);
      setLoadingSlots(false);
    })
    .catch(err => {
      console.error('Availability check error:', err);
      setError(err.message);
      setLoadingSlots(false);
    });

  }, [date, selectedService, services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot) {
      setError('Please select a service, date, and available time slot.');
      return;
    }
    
    setError('');
    setSubmitting(true);
    
    const slotObj = availableSlots.find(s => s.startTime === selectedSlot);

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          serviceSelection: selectedService,
          preferredDate: format(date, 'yyyy-MM-dd'),
          preferredStartTime: selectedSlot,
          preferredEndTime: slotObj?.endTime || '23:59', // fallback
          clientId
        })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Booking failed: Invalid server response');
      }

      if (!res.ok) throw new Error(data.error || 'Failed to book');
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto px-4 py-24 text-center"
      >
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
        <p className="text-lg text-gray-600 mb-8">Thank you, {formData.fullName}. We have received your booking and an email confirmation has been sent.</p>
        <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">Return Home</button>
      </motion.div>
    );
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <motion.div 
        initial="hidden" animate="visible" variants={fadeUp}
        className="mb-10 text-center"
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Book a Service</h1>
        <p className="text-gray-500 mt-3 text-lg">Select your needs, pick a time, and we'll handle the rest.</p>
      </motion.div>

      <div className="grid lg:grid-cols-12 gap-8">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="lg:col-span-5 space-y-6">
          <motion.div variants={fadeUp} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">1</span> Select Service</h3>
            {loadingServices ? (
              <p className="text-sm text-gray-500">Loading services...</p>
            ) : (
              <select 
                title="Service"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                value={selectedService}
                onChange={e => setSelectedService(e.target.value)}
              >
                {services.map(s => (
                  <option key={s.name} value={s.name}>{s.name} ({s.durationMinutes}m)</option>
                ))}
              </select>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">2</span> Pick a Date</h3>
            <div className="calendar-container">
              <Calendar 
                onChange={(val) => setDate(val as Date)} 
                value={date}
                className="w-full border-none font-sans"
                tileDisabled={({ date }) => isBefore(date, startOfDay(new Date()))}
              />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">3</span> Available Slots</h3>
            {loadingSlots ? (
              <p className="text-sm text-gray-500">Checking availability...</p>
            ) : availableSlots.length === 0 ? (
              <div className="text-amber-600 bg-amber-50 p-4 rounded-lg text-sm">
                No slots available on this date. Please select another date.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableSlots.map(slot => (
                  <button
                    key={slot.startTime}
                    type="button"
                    onClick={() => setSelectedSlot(slot.startTime)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedSlot === slot.startTime 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-600'
                    }`}
                  >
                    {slot.displayTime || slot.startTime}
                  </button>
                ))}
              </div>
            )}
            {selectedSlot && (
              <p className="mt-4 text-sm text-green-600 font-medium">
                Selected: {format(date, 'MMM do, yyyy')} at {
                  availableSlots.find(s => s.startTime === selectedSlot)?.displayTime || selectedSlot
                }
              </p>
            )}
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-7">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">4</span> Your Details
            </h3>
            
            {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input required title="Full Name" type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <input required title="Phone" type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input required title="Email" type="email" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes / Describe the issue (Optional)</label>
                <textarea title="Notes" rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
              </div>
              <button 
                type="submit" 
                disabled={submitting || !selectedSlot}
                className="w-full bg-blue-600 text-white font-semibold py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {submitting ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

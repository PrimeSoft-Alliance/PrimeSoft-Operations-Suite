import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useClientId } from '../lib/useClientId';

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const clientId = useClientId();

  useEffect(() => {
    fetch(`/api/public/settings?clientId=${clientId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.services) {
          setServices(data.services);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="bg-slate-50 min-h-[90vh] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mb-16 mx-auto text-center"
        >
          <span className="inline-block py-1 px-3 rounded-md bg-blue-100 text-blue-700 text-sm font-semibold tracking-wider mb-4">OUR SOLUTIONS</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">Software & IT Services</h1>
          <p className="text-lg text-gray-500 font-light">End-to-end digital services tailored for your growth and transformation.</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {services.map((service, idx) => (
              <motion.div 
                key={idx} 
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 flex flex-col group relative"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] flex items-center justify-center transform group-hover:scale-150 transition-transform duration-500 pointer-events-none">
                  <Settings className="w-32 h-32" />
                </div>
                <div className="p-8 flex-1 relative z-10">
                  <div className="w-14 h-14 bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                    <Settings className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{service.name}</h3>
                  <p className="text-gray-500 mb-6 text-sm leading-relaxed">{service.description}</p>
                  <div className="space-y-3 mt-6 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {service.price && (
                      <div className="flex items-center text-gray-700 font-medium">
                         <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                         <span>Starting at <strong className="text-gray-900">${service.price}</strong></span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-700 font-medium">
                      <Clock className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                      <span>Est. Duration: <strong className="text-gray-900">{service.durationMinutes} mins</strong></span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white border-t border-slate-100 mt-auto relative z-10">
                  <Link 
                    to={`/booking?service=${service.name}`} 
                    className="block w-full py-3.5 px-4 bg-slate-50 text-blue-700 text-center font-bold text-sm rounded-xl hover:bg-blue-600 hover:text-white transition-colors border border-transparent hover:border-blue-700 shadow-sm"
                  >
                    Book Now
                  </Link>
                </div>
              </motion.div>
            ))}
            {services.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No services listed at the moment. Please contact us directly.
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

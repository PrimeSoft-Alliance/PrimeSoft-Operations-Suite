import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Cpu, Menu, X, Rocket, User, ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useClientId } from '../lib/useClientId';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [businessName, setBusinessName] = useState('Nexus Platform');
  const location = useLocation();
  const navigate = useNavigate();
  const { clientId } = useClientId();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    fetch('/v1/auth/check')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) setUser(data);
        else setUser(null);
      })
      .catch(() => setUser(null));
  }, [location]);

  useEffect(() => {
    fetch(`/v1/public/settings?clientId=${clientId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.success && data.data.businessName) {
          setBusinessName(data.data.businessName);
        }
      })
      .catch(console.error);
  }, [clientId]);

  const handleLogout = async () => {
    await fetch('/v1/auth/logout', { method: 'POST' });
    setUser(null);
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Book Session', href: '/book-discovery' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/inquiry' },
  ];

  const authMenu = user ? (
    user.role === 'superadmin' ? (
      <Link 
        to="/superadmin" 
        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
      >
        <ShieldCheck className="w-4 h-4" />
        Admin Panel
      </Link>
    ) : (
      <Link 
        to="/dashboard" 
        className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-full text-sm font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
      >
        <LayoutDashboard className="w-4 h-4" />
        My Dashboard
      </Link>
    )
  ) : (
    <div className="flex items-center gap-4">
      <Link 
        to="/client/login" 
        className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors"
      >
        Client Login
      </Link>
      <Link 
        to="/admin/login" 
        className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors"
      >
        Admin Login
      </Link>
      <Link 
        to="/get-started" 
        className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
      >
        Onboarding
        <Rocket className="w-4 h-4" />
      </Link>
    </div>
  );

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 py-4 sm:px-6",
        isScrolled ? "py-2" : "py-4"
      )}
    >
      <nav 
        className={cn(
          "max-w-7xl mx-auto rounded-3xl transition-all duration-500 border overflow-hidden",
          isScrolled 
            ? "bg-white/80 backdrop-blur-xl border-white/20 shadow-2xl shadow-gray-200/50 py-3 px-6" 
            : "bg-transparent border-transparent py-4 px-4"
        )}
      >
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white transform group-hover:rotate-12 transition-transform shadow-lg shadow-indigo-200">
              <Cpu className="w-6 h-6" />
            </div>
            <span className="font-black text-xl tracking-tight text-gray-900 group-hover:text-indigo-600 transition-colors">
              {businessName}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  to={link.href}
                  className={cn(
                    "text-sm font-bold transition-all hover:text-indigo-600",
                    location.pathname === link.href ? "text-indigo-600" : "text-gray-500"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="w-px h-6 bg-gray-200 mx-2" />
            {authMenu}
            {user && (
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-gray-600 hover:text-indigo-600 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="absolute top-20 left-4 right-4 bg-white rounded-[2rem] shadow-2xl p-8 border border-gray-100 flex flex-col items-center gap-6 md:hidden"
          >
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.href}
                className="text-xl font-black text-gray-900 hover:text-indigo-600 w-full text-center py-2"
              >
                {link.name}
              </Link>
            ))}
            <div className="w-full h-px bg-gray-100" />
            <div className="flex flex-col gap-4 w-full">
              {user ? (
                <>
                  {user.role === 'superadmin' ? (
                    <Link to="/superadmin" className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-center font-black">Admin Panel</Link>
                  ) : (
                    <Link to="/dashboard" className="w-full bg-emerald-600 text-white py-4 rounded-2xl text-center font-black">My Dashboard</Link>
                  )}
                  <button onClick={handleLogout} className="text-gray-500 font-bold py-2">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/client/login" className="w-full border-2 border-gray-100 py-4 rounded-2xl text-center font-black text-gray-900">Client Login</Link>
                  <Link to="/admin/login" className="w-full border-2 border-gray-100 py-4 rounded-2xl text-center font-black text-gray-900">Admin Login</Link>
                  <Link to="/get-started" className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-center font-black shadow-xl shadow-indigo-100">Onboarding</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

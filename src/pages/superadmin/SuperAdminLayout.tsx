import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserCheck, BarChart3, Settings, LogOut, ShieldCheck, User, Menu, ChevronLeft, ChevronRight, Sparkles, Globe, HeartPulse, Bell, FileCode, FileText, MessageSquare, Zap, Calendar, Contact, Home, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import ProfileModal from '../../components/ProfileModal';

export default function SuperAdminLayout() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetch('/v1/auth/check')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated || data.role !== 'superadmin') {
          navigate('/admin/login');
        } else {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Auth check error:', err);
        setError('Authentication check failed. Please login again.');
        setLoading(false);
        setTimeout(() => navigate('/admin/login'), 2000);
      });
  }, [navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await fetch('/v1/auth/logout', { method: 'POST' });
    navigate('/admin/login');
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;

  const menuItems = [
    { icon: Zap, label: 'Mission Control', path: '/superadmin/hub' },
    { icon: LayoutDashboard, label: 'Overview', path: '/superadmin' },
    { icon: Users, label: 'Clients', path: '/superadmin/clients' },
    { icon: UserCheck, label: 'Onboarding', path: '/superadmin/onboarding' },
    { icon: Sparkles, label: 'Prompt Engine', path: '/superadmin/prompts' },
    { icon: Mail, label: 'Inquiries', path: '/superadmin/inquiries' },
    { icon: Calendar, label: 'Bookings', path: '/superadmin/bookings' },
    { icon: Users, label: 'Leads Stream', path: '/superadmin/leads' },
    { icon: Globe, label: 'Domains', path: '/superadmin/domains' },
    { icon: BarChart3, label: 'Usage & Quotas', path: '/superadmin/usage' },
    { icon: ShieldCheck, label: 'Quota Management', path: '/superadmin/quotas' },
    { icon: ShieldCheck, label: 'Audit Logs', path: '/superadmin/logs' },
    { icon: HeartPulse, label: 'System Health', path: '/superadmin/health' },
    { icon: Bell, label: 'Notifications', path: '/superadmin/notifications' },
    { icon: Settings, label: 'Platform Settings', id: 'settings', path: '/superadmin/settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-indigo-900 text-white flex flex-col transition-all duration-300 z-50 fixed inset-y-0 left-0 lg:relative lg:translate-x-0 transform", 
        isCollapsed ? "lg:w-20" : "lg:w-64",
        isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between gap-3 h-16 border-b border-indigo-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <ShieldCheck className="w-8 h-8 text-indigo-400 shrink-0" />
            {(!isCollapsed || isMobileMenuOpen) && <span className="text-xl font-bold truncate">Super Admin</span>}
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-indigo-800 text-indigo-200 hover:text-white transition-colors lg:flex hidden"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : ''}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap",
                location.pathname === item.path 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {(!isCollapsed || isMobileMenuOpen) && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-indigo-100 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(!isCollapsed || isMobileMenuOpen) && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-8 shrink-0 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 truncate">
              {menuItems.find(i => i.path === location.pathname)?.label || 'Super Admin Portal'}
            </h1>
          </div>
          <div className="flex items-center gap-6">
             <Link 
               to="/" 
               title="Go to Homepage" 
               className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all"
             >
               <Home className="w-5 h-5" />
             </Link>
             <div className="flex items-center gap-3 sm:gap-6 border-l pl-6 border-gray-100">
            <button className="relative text-gray-500 hover:text-indigo-600 transition hidden sm:block">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
               </svg>
               <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>
            <div 
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 sm:gap-3 border-l sm:pl-6 border-gray-200 cursor-pointer group"
            >
              <span className="text-xs sm:text-sm text-gray-500 hidden md:block max-w-[150px] truncate group-hover:text-indigo-600 transition-colors">{user?.email}</span>
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all ring-2 ring-transparent group-hover:ring-indigo-100 ring-offset-2">
                {user?.email?.[0]?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      </header>

        <main className="p-4 sm:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-[1600px] mx-auto"
          >
            <button 
              onClick={() => navigate(-1)}
              className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-2 group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Return
            </button>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

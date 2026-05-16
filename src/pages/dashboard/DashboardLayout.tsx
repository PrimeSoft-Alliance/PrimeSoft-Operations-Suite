import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CalendarDays, MessageSquare, Settings, LogOut, LayoutDashboard, Cpu, Menu, ChevronLeft, ChevronRight, FileText, Users, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/v1/auth/check')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) navigate('/login');
        else setLoading(false);
      })
      .catch((err) => {
        console.error('Auth check failed:', err);
        navigate('/login');
      });

    // Also fetch public settings for branding (favicon)
    fetch('/v1/public/settings')
      .then(res => res.json())
      .then(data => {
        const settings = data?.success ? data.data : null;
        if (settings && settings.favicon) {
           let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
           if (!link) {
             link = document.createElement('link');
             link.rel = 'icon';
             document.head.appendChild(link);
           }
           link.href = settings.favicon;
        }
      })
      .catch(console.error);
  }, [navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await fetch('/v1/auth/logout', { method: 'POST' });
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const links = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Operations Nexus', path: '/dashboard/nexus', icon: Zap },
    { name: 'Bookings', path: '/dashboard/bookings', icon: CalendarDays },
    { name: 'Contacts', path: '/dashboard/contacts', icon: MessageSquare },
    { name: 'Forms', path: '/dashboard/forms', icon: FileText },
    { name: 'Leads', path: '/dashboard/leads', icon: Users },
    { name: 'Headless API', path: '/dashboard/developer', icon: Cpu },
    { name: 'Availability', path: '/dashboard/availability', icon: CalendarDays },
    { name: 'Email Config', path: '/dashboard/email-templates', icon: MessageSquare },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 transition-all duration-300 z-50 fixed inset-y-0 left-0 lg:relative lg:translate-x-0 transform",
        isSidebarCollapsed ? "lg:w-20" : "lg:w-64",
        isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 gap-3 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            {(!isSidebarCollapsed || isMobileMenuOpen) && <span className="font-bold text-lg text-white tracking-tight truncate">PrimeSoft Alliance</span>}
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors lg:flex hidden"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-white lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-1 px-4 overflow-y-auto">
          {links.map(link => {
            const active = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                title={isSidebarCollapsed ? link.name : ''}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group whitespace-nowrap",
                  active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", active ? "text-white" : "group-hover:text-white")} />
                {(!isSidebarCollapsed || isMobileMenuOpen) && <span>{link.name}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(!isSidebarCollapsed || isMobileMenuOpen) && <span>Logout</span>}
          </button>
        </div>
      </aside>
      
      <main className="flex-1 overflow-hidden flex flex-col h-screen min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 truncate">
              {links.find(l => l.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             <Link to="/" className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors hidden sm:block">Return to Site</Link>
             <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors lg:hidden"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>
        <div className="p-4 sm:p-8 flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <button 
              onClick={() => navigate(-1)}
              className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-2 group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Return
            </button>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

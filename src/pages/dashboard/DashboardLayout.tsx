import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CalendarDays, MessageSquare, Settings, LogOut, LayoutDashboard, Cpu, Menu, ChevronLeft, ChevronRight, FileText, Users, Zap, Home, User, Mail as MailIcon, Clock, Brain, BarChart3, Bell, Package, CalendarCheck, Briefcase, Sliders, Code2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import ProfileModal from '../../components/ProfileModal';
import { useClientId } from '../../lib/useClientId';
import { getSocket, disconnectSocket } from '../../lib/socket';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientId: cidHook } = useClientId();
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/v1/system/status')
      .then(r => r.json())
      .then(d => {
        if (d.success) setSystemStatus(d.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
     if (cidHook) {
        const socket = getSocket(cidHook);
        socket.on('notification', () => {
           setNotificationCount(prev => prev + 1);
        });
        return () => {
           // We don't necessarily want to disconnect here if the component re-renders, 
           // but we should cleanup listeners
           socket.off('notification');
        }
     }
  }, [cidHook]);

  useEffect(() => {
    if (cidHook) {
      fetch('/v1/notifications', { headers: { 'x-client-id': cidHook } })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setNotificationCount(data.data.filter((n: any) => !n.isRead).length);
          }
        })
        .catch(console.error);
    }
  }, [cidHook, location.pathname]);

  useEffect(() => {
    const checkAuth = (retryCount = 0) => {
      fetch('/v1/auth/check')
        .then(async res => {
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              localStorage.removeItem('auth_token');
              navigate('/client/login');
              return;
            }
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          const text = await res.text();
          try {
            return JSON.parse(text);
          } catch {
            throw new Error('API returned dynamic content instead of JSON');
          }
        })
        .then(data => {
          if (!data) return;
          if (!data.authenticated) {
            localStorage.removeItem('auth_token');
            navigate('/client/login');
          } else {
            if (data.clientId) {
              localStorage.setItem('ps_client_id', data.clientId);
            }
            setUser(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Auth check failed:', err);
          const isNetworkError = err.message === 'Failed to fetch' || err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('TypeError');
          if (isNetworkError && retryCount < 5) {
            console.warn(`Network error during auth check. Retrying in 2s (attempt ${retryCount + 1}/5)...`);
            setTimeout(() => checkAuth(retryCount + 1), 2000);
          } else {
            localStorage.removeItem('auth_token');
            navigate('/client/login');
          }
        });
    };

    checkAuth();

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
    localStorage.removeItem('auth_token');
    await fetch('/v1/auth/logout', { method: 'POST' });
    navigate('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const links = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Bookings', path: '/dashboard/bookings', icon: CalendarDays },
    { name: 'Availability', path: '/dashboard/availability', icon: CalendarCheck },
    { name: 'Product & Services', path: '/dashboard/catalog', icon: Briefcase },
    { name: 'Support Suit', path: '/dashboard/support', icon: MessageSquare },
    { name: 'Messages', path: '/dashboard/shared-inbox', icon: MailIcon },
    { name: 'Missed Calls', path: '/dashboard/missed-calls', icon: Clock },
    { name: 'Numbers', path: '/dashboard/numbers', icon: Package },
    { name: 'Leads', path: '/dashboard/leads', icon: User },
    { name: 'Contacts', path: '/dashboard/contacts', icon: Users },
    { name: 'AI Knowledge', path: '/dashboard/knowledge', icon: Brain },
    { name: 'Marketing', path: '/dashboard/marketing', icon: Zap },
    { name: 'Integrations', path: '/dashboard/integrations', icon: Cpu },
    { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
    { name: 'Email Templates', path: '/dashboard/email-templates', icon: Sliders },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
    { name: 'Developer Docs', path: '/dashboard/developer', icon: Code2 },
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
            {(!isSidebarCollapsed || isMobileMenuOpen) && <span className="font-bold text-lg text-white tracking-tight truncate">OminiRep</span>}
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
            const active = location.pathname === link.path || (link.path !== '/dashboard' && location.pathname.startsWith(link.path + '/'));
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
              {links.find(l => l.path === location.pathname || (l.path !== '/dashboard' && location.pathname.startsWith(l.path + '/')))?.name || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             <Link to="/dashboard/notifications" className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all group">
               <Bell className="w-5 h-6 group-hover:scale-110 transition-transform" />
               {notificationCount > 0 && (
                 <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-rose-200">
                   {notificationCount}
                 </span>
               )}
             </Link>
             <div 
               onClick={() => setIsProfileOpen(true)}
               className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-100 transition-all group"
             >
               <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black group-hover:bg-indigo-600 group-hover:text-white transition-all text-xs">
                 {user?.businessName?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
               </div>
               <div className="hidden sm:block">
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight group-hover:text-indigo-600">Account</div>
                 <div className="text-[11px] font-bold text-slate-700 truncate max-w-[100px]">{user?.businessName || 'Profile'}</div>
               </div>
             </div>
             <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors lg:hidden"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        <div className="p-4 sm:p-8 flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {systemStatus && !systemStatus.telnyx && (
              <div className="mb-8 p-6 bg-gradient-to-r from-slate-900 to-slate-800 border-l-4 border-l-indigo-600 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
                 <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-indigo-400 shrink-0 border border-white/10 group-hover:scale-110 transition-transform">
                       <Zap className="w-8 h-8" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                       <h3 className="text-xl font-black tracking-tight mb-1">Incomplete Setup Detected</h3>
                       <p className="text-sm font-medium text-slate-400 max-w-xl">
                         The <b>TELNYX_API_KEY</b> is currently missing from your environment. All text-only omnichannel modules (WhatsApp, Numbers, SMS) are currently in standby mode.
                       </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                       <Link 
                         to="/dashboard/integrations/whatsapp"
                         className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                       >
                         <Settings className="w-4 h-4" />
                         Configure Now
                       </Link>
                    </div>
                 </div>
                 {/* Decorative background flare */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full translate-x-20 -translate-y-20"></div>
              </div>
            )}
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

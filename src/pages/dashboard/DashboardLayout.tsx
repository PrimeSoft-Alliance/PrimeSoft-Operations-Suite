import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CalendarDays, MessageSquare, Settings, LogOut, LayoutDashboard, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/auth/check')
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
    fetch('/api/public/settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.favicon) {
           let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
           if (!link) {
             link = document.createElement('link');
             link.rel = 'icon';
             document.head.appendChild(link);
           }
           link.href = data.favicon;
        }
      })
      .catch(console.error);
  }, [navigate]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const links = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Bookings', path: '/dashboard/bookings', icon: CalendarDays },
    { name: 'Contacts', path: '/dashboard/contacts', icon: MessageSquare },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={cn(
        "bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 transition-all duration-300",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <Cpu className="w-5 h-5" />
          </div>
          {!isSidebarCollapsed && <span className="font-bold text-lg text-white tracking-tight">PrimeSoft Alliance</span>}
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-1 px-4">
          {links.map(link => {
            const active = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && <span>{link.name}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
      
      <main className="flex-1 overflow-auto flex flex-col h-screen">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-gray-600 hover:text-indigo-600">
            {isSidebarCollapsed ? '→' : '←'}
          </button>
          <h2 className="text-lg font-medium text-gray-800">
            {links.find(l => l.path === location.pathname)?.name || 'Dashboard'}
          </h2>
        </header>
        <div className="p-8 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

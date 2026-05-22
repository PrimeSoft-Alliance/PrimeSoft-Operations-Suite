import React, { useEffect, useState } from 'react';
import {
  Users,
  MessageSquare,
  Calendar,
  Mail,
  RefreshCw,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { ClickableCard } from '../../components/ClickableCard';
import { Modal, useModal } from '../../components/ModalManager';
import { Notification, NotificationBell } from '../../components/NotificationBell';

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalBookings: number;
  pendingBookings: number;
  totalContacts: number;
  newContacts: number;
  totalInquiries: number;
  openInquiries: number;
  totalChats: number;
  activeChats: number;
}

interface ClientData {
  clientId: string;
  businessName: string;
  email: string;
  status: 'active' | 'trial' | 'inactive';
  signupDate: string;
  lastActive: string;
  bookings: number;
  contacts: number;
}

export default function AdminHub() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedClientModal, setSelectedClientModal] = useModal();
  const [clientsModal, setClientsModal] = useModal();
  const [bookingsModal, setBookingsModal] = useModal();
  const [contactsModal, setContactsModal] = useModal();

  useEffect(() => {
    fetchStats();
    generateNotifications();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/v1/sys-admin/stats');
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          setStats(data.data);
        }
      }
    } catch (err) {
      console.error('[AdminHub] Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateNotifications = () => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'info',
        title: 'New Client Signup',
        message: 'ABC Corp just signed up for a premium plan',
        timestamp: new Date(Date.now() - 5 * 60000),
        read: false,
        action: { label: 'View', onClick: () => {} }
      },
      {
        id: '2',
        type: 'success',
        title: 'Booking Confirmed',
        message: '15 new bookings were confirmed in the last hour',
        timestamp: new Date(Date.now() - 15 * 60000),
        read: false,
        action: { label: 'Review', onClick: () => {} }
      },
      {
        id: '3',
        type: 'warning',
        title: 'High API Usage',
        message: 'TechStart Inc. is approaching their monthly API limit',
        timestamp: new Date(Date.now() - 30 * 60000),
        read: true
      },
      {
        id: '4',
        type: 'error',
        title: 'Billing Issue',
        message: 'Innovation Lab payment failed. Manual intervention needed.',
        timestamp: new Date(Date.now() - 2 * 3600000),
        read: true,
        action: { label: 'Resolve', onClick: () => {} }
      }
    ];
    setNotifications(mockNotifications);
  };

  const handleNotificationRead = (id: string) => {
    setNotifications(notifs =>
      notifs.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleNotificationDismiss = (id: string) => {
    setNotifications(notifs => notifs.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Platform Hub</h1>
          <p className="text-slate-400">System-wide overview and management</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchStats}
            className="p-3 rounded-lg hover:bg-slate-700/50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-slate-400 hover:text-blue-400" />
          </button>
          <NotificationBell
            notifications={notifications}
            onNotificationRead={handleNotificationRead}
            onNotificationDismiss={handleNotificationDismiss}
          />
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading statistics...</div>
      ) : stats ? (
        <>
          {/* Primary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <ClickableCard
              title="Total Clients"
              description="Active and registered clients"
              icon={<Users />}
              count={stats.totalClients}
              badge={`${stats.activeClients} Active`}
              status="active"
              onClick={() => setClientsModal.open()}
            />
            <ClickableCard
              title="Bookings"
              description="Across all platforms"
              icon={<Calendar />}
              count={stats.totalBookings}
              badge={`${stats.pendingBookings} Pending`}
              status="pending"
              onClick={() => setBookingsModal.open()}
            />
            <ClickableCard
              title="Inquiries & Leads"
              description="New contacts and inquiries"
              icon={<Mail />}
              count={stats.totalContacts + stats.totalInquiries}
              badge={`${stats.newContacts} New`}
              status={stats.newContacts > 0 ? 'pending' : 'active'}
              onClick={() => setContactsModal.open()}
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <ClickableCard
              title="Real-time Support"
              description="Active chat conversations"
              icon={<MessageSquare />}
              count={stats.totalChats}
              badge={`${stats.activeChats} Active`}
              status={stats.activeChats > 0 ? 'active' : 'inactive'}
              onClick={() => {}}
            />
            <ClickableCard
              title="System Health"
              description="All services operational"
              icon={<Activity />}
              status="active"
              onClick={() => {}}
            />
          </div>

          {/* Activity Feed & System Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
              <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-700/30 transition-colors cursor-pointer">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-100">Client activity #{i}</p>
                      <p className="text-xs text-slate-500">2 hours ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
              <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
                  Add Client
                </button>
                <button className="w-full px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
                  View Reports
                </button>
                <button className="w-full px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
                  System Settings
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Modals */}
      <Modal
        isOpen={setClientsModal.isOpen}
        onClose={setClientsModal.close}
        title="Client Management"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-6">
            Manage all registered clients and their configurations.
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                onClick={() => setSelectedClientModal.open({ clientId: `client-${i}` })}
                className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-blue-500/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-100">Client {i} Inc.</h4>
                    <p className="text-xs text-slate-400">Active • Signed up 3 months ago</p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={setBookingsModal.isOpen}
        onClose={setBookingsModal.close}
        title="Booking Overview"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-6">
            All bookings across the platform grouped by status.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-slate-400 mb-1">Confirmed</p>
              <p className="text-2xl font-bold text-blue-400">245</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-slate-400 mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-400">18</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-500/10 border border-slate-500/20">
              <p className="text-xs text-slate-400 mb-1">Cancelled</p>
              <p className="text-2xl font-bold text-slate-400">5</p>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={setContactsModal.isOpen}
        onClose={setContactsModal.close}
        title="Contacts & Inquiries"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-6">
            Recent inquiries and contact submissions.
          </p>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-slate-100">Contact {i}</h4>
                  <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">New</span>
                </div>
                <p className="text-sm text-slate-400">inquiry@company.com</p>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

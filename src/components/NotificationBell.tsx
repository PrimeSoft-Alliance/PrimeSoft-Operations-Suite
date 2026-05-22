import React, { useState } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface NotificationBellProps {
  notifications: Notification[];
  onNotificationRead: (id: string) => void;
  onNotificationDismiss: (id: string) => void;
  onNotificationAction?: (notification: Notification) => void;
}

export function NotificationBell({
  notifications,
  onNotificationRead,
  onNotificationDismiss,
  onNotificationAction
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-300 hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 shadow-2xl z-50">
          {/* Header */}
          <div className="sticky top-0 p-4 border-b border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-100">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-700/50 rounded transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.read) {
                      onNotificationRead(notification.id);
                    }
                  }}
                  className={`p-4 cursor-pointer transition-colors ${
                    notification.read
                      ? 'hover:bg-slate-700/20'
                      : 'bg-slate-700/20 hover:bg-slate-700/30'
                  } ${getBgColor(notification.type)} border-l-4`}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-slate-100">
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNotificationDismiss(notification.id);
                          }}
                          className="p-1 hover:bg-slate-600/50 rounded transition-colors flex-shrink-0"
                        >
                          <X className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </span>
                        {notification.action && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (notification.action?.onClick) {
                                notification.action.onClick();
                              }
                              if (onNotificationAction) {
                                onNotificationAction(notification);
                              }
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                          >
                            {notification.action.label}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

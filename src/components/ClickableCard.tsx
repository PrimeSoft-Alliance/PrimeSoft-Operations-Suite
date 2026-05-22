import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ClickableCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  onClick: () => void;
  badge?: string;
  count?: number;
  status?: 'active' | 'pending' | 'error' | 'inactive';
  className?: string;
}

export function ClickableCard({
  title,
  description,
  icon,
  onClick,
  badge,
  count,
  status,
  className = ''
}: ClickableCardProps) {
  const statusColors = {
    active: 'bg-emerald-500/20 border-emerald-500/30',
    pending: 'bg-amber-500/20 border-amber-500/30',
    error: 'bg-red-500/20 border-red-500/30',
    inactive: 'bg-slate-500/20 border-slate-500/30'
  };

  return (
    <button
      onClick={onClick}
      className={`
        group relative flex flex-col w-full p-6 rounded-lg border transition-all duration-300
        bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-slate-700/50
        hover:from-slate-900/80 hover:to-slate-800/50 hover:border-slate-600/80
        hover:shadow-lg hover:shadow-blue-500/10
        active:scale-98 focus:outline-none focus:ring-2 focus:ring-blue-500/50
        ${status ? statusColors[status] : ''}
        ${className}
      `}
    >
      {/* Top section with icon and badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          {icon && (
            <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
              <div className="text-blue-400 w-5 h-5">
                {icon}
              </div>
            </div>
          )}
          <div className="flex-1 text-left">
            <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
              {title}
            </h3>
          </div>
        </div>
        {badge && (
          <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-500/30 text-blue-300 ml-2">
            {badge}
          </span>
        )}
      </div>

      {/* Description and count */}
      {description && (
        <p className="text-xs text-slate-400 mb-4 flex-1 text-left group-hover:text-slate-300 transition-colors">
          {description}
        </p>
      )}

      {/* Footer with count and arrow */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50 group-hover:border-slate-600/50 transition-colors">
        {count !== undefined && (
          <span className="text-sm font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
            {count} item{count !== 1 ? 's' : ''}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300 ml-auto" />
      </div>
    </button>
  );
}

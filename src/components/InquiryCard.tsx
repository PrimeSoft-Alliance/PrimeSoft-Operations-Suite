import React from 'react';
import { Mail, Trash2, Clock, User, Check, Star, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLongPress } from '../hooks/useLongPress';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface Inquiry {
  _id: string;
  threadId: string;
  senderEmail: string;
  subject?: string;
  body?: string;
  status: 'inbox' | 'unread' | 'starred' | 'assigned' | 'archived' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  imageUrl?: string;
}

interface InquiryCardProps {
  inq: Inquiry;
  isSelected: boolean;
  isSelectionMode: boolean;
  onLongPress: (id: string) => void;
  onClick: (inq: Inquiry) => void;
  deleteInquiry: (id: string) => void;
  updateInquiryStatus: (id: string, updates: Partial<Inquiry>) => void;
}

export const InquiryCard: React.FC<InquiryCardProps> = ({
  inq,
  isSelected,
  isSelectionMode,
  onLongPress,
  onClick,
  deleteInquiry,
  updateInquiryStatus
}) => {
  const { isPressed, ...longPressProps } = useLongPress({
    onLongPress: () => onLongPress(inq._id),
    onClick: () => onClick(inq),
    disabled: isSelectionMode,
  });

  return (
    <motion.div
      key={inq._id}
      layoutId={inq._id}
      {...longPressProps}
      className={cn(
        "bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all group relative flex flex-col justify-between cursor-pointer",
        inq.status === 'unread' && "border-l-4 border-l-amber-500",
        isSelected && "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30",
        isPressed && "scale-[0.98] opacity-90 transition-all duration-200"
      )}
    >
      <div className="relative z-10 flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {isSelectionMode && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -top-1 -left-1 z-30"
              >
                <div className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all",
                  isSelected 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                    : "bg-white border-slate-200 text-transparent"
                )}>
                  <Check className="w-4 h-4" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Mail className="w-4 h-4" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {!isSelectionMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteInquiry(inq._id);
                }}
                className="relative z-20 p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-md text-slate-300 hover:text-rose-600 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
              inq.priority === 'high' ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
            )}>
              {inq.priority}
            </span>
          </div>
          {inq.status === 'starred' && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
        </div>
      </div>
      
      <div className="relative z-10 space-y-0.5 mb-2 flex-1 overflow-hidden pointer-events-none">
        <div className="text-xs font-black text-slate-900 tracking-tight uppercase group-hover:text-indigo-600 transition-colors truncate">
          {inq.subject || 'No Subject'}
        </div>
        <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 truncate">
          <User className="w-3 h-3 flex-shrink-0" />
          {inq.senderEmail}
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-2 pt-2 border-t border-slate-50 justify-between">
        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
          <Clock className="w-2.5 h-2.5" />
          {format(new Date(inq.createdAt), 'MMM dd')}
        </div>
        
        {!isSelectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateInquiryStatus(inq._id, { status: inq.status === 'closed' ? 'inbox' : 'closed' });
            }}
            className={cn(
              "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 cursor-pointer",
              inq.status === 'closed' 
                ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
            )}
          >
            {inq.status === 'closed' ? (
              <>
                <RefreshCw className="w-2.5 h-2.5" />
                Reopen
              </>
            ) : (
              <>
                <ShieldCheck className="w-2.5 h-2.5" />
                Close
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
};

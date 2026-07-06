import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Edit3, Trash2, Mail, Phone, MessageSquare, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useLongPress } from '../hooks/useLongPress';

interface ContactCardProps {
  c: any;
  isSelected: boolean;
  isSelectionMode: boolean;
  handleLongPress: (id: string) => void;
  handleCardClick: (c: any) => void;
  handleOpenEditModal: (c: any) => void;
  handleDeleteContact: (id: string) => void;
  navigate: (path: string) => void;
  onToggleAI?: (c: any) => void;
}

export function ContactCard({
  c,
  isSelected,
  isSelectionMode,
  handleLongPress,
  handleCardClick,
  handleOpenEditModal,
  handleDeleteContact,
  navigate,
  onToggleAI
}: ContactCardProps) {
  const id = c._id || c.id;
  const hasEmail = c.email && !c.email.includes('@manual.com');
  const hasWhatsApp = !!c.whatsappJid || c.platform === 'whatsapp' || c.source === 'whatsapp';
  const hasTelegram = !!c.telegramChatId || !!c.telegramUsername || c.platform === 'telegram' || c.source === 'telegram';

  const { isPressed, ...longPressProps } = useLongPress({
    onLongPress: () => handleLongPress(id),
    onClick: () => handleCardClick(c),
    disabled: isSelectionMode,
  });

  return (
    <motion.div 
      layoutId={id}
      {...longPressProps}
      className={cn(
        "bg-white p-6 rounded-[2.5rem] border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-600/5 transition-all group cursor-pointer relative",
        isSelected && "border-indigo-500 ring-2 ring-indigo-500 ring-inset bg-indigo-50/10",
        isPressed && "scale-[0.98] opacity-90 transition-all duration-200"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {isSelectionMode && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute top-4 left-4 z-20"
              >
                <div className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all",
                  isSelected 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                    : "bg-white border-slate-200 text-transparent"
                )}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center font-black text-sm shrink-0 transition-all">
            {c.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{c.name || 'Unknown Contact'}</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{c.source || c.platform || 'manual'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isSelectionMode && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenEditModal(c); }}
                className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteContact(id); }}
                className="p-1.5 hover:bg-rose-50 text-rose-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2.5 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {hasEmail && (
            <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 text-[8px] font-black rounded-md uppercase tracking-tighter">Email</span>
          )}
          {hasWhatsApp && (
            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[8px] font-black rounded-md uppercase tracking-tighter">WhatsApp</span>
          )}
          {hasTelegram && (
            <span className="px-2 py-0.5 bg-sky-50 border border-sky-100 text-sky-700 text-[8px] font-black rounded-md uppercase tracking-tighter">Telegram</span>
          )}
          {onToggleAI ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAI(c);
              }}
              title="Click to toggle AI Representative for this contact"
              className={cn(
                "px-2 py-0.5 text-[8px] font-black rounded-md uppercase tracking-tighter flex items-center gap-1 transition-all duration-200 border cursor-pointer hover:scale-105 active:scale-95",
                c.aiEnabled !== false
                  ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600"
                  : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-500"
              )}
            >
              <span className={cn(
                "w-1 h-1 rounded-full",
                c.aiEnabled !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-400"
              )} />
              AI: {c.aiEnabled !== false ? 'Active' : 'Muted'}
            </button>
          ) : (
            c.aiEnabled !== false ? (
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100/60 text-emerald-600 text-[8px] font-black rounded-md uppercase tracking-tighter flex items-center gap-1">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                AI Active
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-rose-50 border border-rose-100/60 text-rose-500 text-[8px] font-black rounded-md uppercase tracking-tighter flex items-center gap-1">
                <span className="w-1 h-1 bg-rose-400 rounded-full" />
                AI Muted
              </span>
            )
          )}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <Mail className="w-3 h-3 text-slate-300" />
            <span className="truncate">{hasEmail ? c.email : 'No email address'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <Phone className="w-3 h-3 text-slate-300" />
            <span>{c.phone || 'No phone linked'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
          {c.lastActive || c.updatedAt 
            ? format(new Date(c.lastActive || c.updatedAt), 'MMM dd, HH:mm')
            : 'Never active'}
        </div>
        {!isSelectionMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (c.email) navigate(`/dashboard/shared-inbox?email=${c.email}`);
                else if (c.whatsappJid) navigate(`/dashboard/shared-inbox?phone=${c.whatsappJid.split('@')[0]}`);
                else if (c.phone) navigate(`/dashboard/shared-inbox?phone=${c.phone}`);
              }}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Message
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

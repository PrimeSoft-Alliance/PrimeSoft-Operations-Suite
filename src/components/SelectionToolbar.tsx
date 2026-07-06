import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X, CheckSquare, Square } from 'lucide-react';
import { cn } from '../lib/utils';

interface SelectionToolbarProps {
  isVisible: boolean;
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onCancel: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  itemName?: string;
}

export function SelectionToolbar({
  isVisible,
  selectedCount,
  totalCount,
  onDelete,
  onCancel,
  onSelectAll,
  onDeselectAll,
  itemName = 'items',
}: SelectionToolbarProps) {
  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 150, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 150, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          className="fixed bottom-4 left-0 right-0 z-[100] px-4 pointer-events-none flex justify-center"
        >
          <div className="w-full max-w-lg bg-slate-900/95 backdrop-blur-xl text-white p-3 sm:p-4 rounded-[2rem] shadow-2xl flex items-center justify-between gap-2 border border-slate-700/50 pointer-events-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-300 hover:text-white shrink-0"
                title="Cancel selection"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-black tracking-tight leading-none text-white">
                  {selectedCount} <span className="text-slate-400 font-medium">{itemName}</span>
                </span>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">
                  Selected
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={isAllSelected ? onDeselectAll : onSelectAll}
                className="w-10 h-10 sm:w-auto sm:px-4 flex items-center justify-center sm:gap-2 bg-slate-800 hover:bg-slate-700 rounded-full sm:rounded-2xl transition-colors text-slate-300 hover:text-white shrink-0"
                title={isAllSelected ? "Deselect All" : "Select All"}
              >
                {isAllSelected ? (
                  <>
                    <Square className="w-5 h-5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Clear</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-5 h-5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">All</span>
                  </>
                )}
              </button>
              
              <div className="w-px h-8 bg-slate-700 mx-1 hidden sm:block" />

              <button
                onClick={onDelete}
                className="w-10 h-10 sm:w-auto sm:px-5 flex items-center justify-center sm:gap-2 bg-rose-500 hover:bg-rose-400 text-white rounded-full sm:rounded-2xl transition-all shadow-lg shadow-rose-900/20 shrink-0"
                title="Delete Selected"
              >
                <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">Delete</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

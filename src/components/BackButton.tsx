import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface BackButtonProps {
  className?: string;
  label?: string;
}

export default function BackButton({ className, label = 'Back' }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      id="back-button"
      onClick={() => navigate(-1)}
      className={cn(
        "flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all group",
        className
      )}
    >
      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      {label}
    </button>
  );
}

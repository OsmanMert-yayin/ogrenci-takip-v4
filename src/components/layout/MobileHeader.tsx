import React from 'react';
import { BookOpen } from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface MobileHeaderProps {
  title: string;
  termName?: string;
  onGoHome: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ title, termName, onGoHome }) => {
  return (
    <header className="print-hidden lg:hidden sticky top-0 z-30 h-12 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onGoHome}
          aria-label="Anasayfa"
          className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0"
        >
          <BookOpen className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-slate-900 truncate leading-tight">{title}</h1>
          {termName && (
            <p className="text-[11px] text-slate-500 truncate leading-tight">{termName}</p>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <PWAInstallButton compact />
      </div>
    </header>
  );
};

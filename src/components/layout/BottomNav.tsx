import React from 'react';
import { BookOpenCheck, ClipboardCheck, Landmark, Menu } from 'lucide-react';
import type { ModuleKey } from '../../types';

interface BottomNavProps {
  activeModule: ModuleKey;
  menuOpen: boolean;
  onSelectModule: (key: ModuleKey) => void;
  onOpenMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeModule,
  menuOpen,
  onSelectModule,
  onOpenMenu,
}) => {
  const isAttendance = !menuOpen && activeModule === 'attendance';
  const isLessons = !menuOpen && activeModule === 'lessons';
  const isFridayOrHome = !menuOpen && (activeModule === 'friday' || activeModule === 'home');
  const isMenuHighlight =
    menuOpen ||
    (activeModule !== 'attendance' &&
      activeModule !== 'lessons' &&
      activeModule !== 'friday' &&
      activeModule !== 'home');

  const handleSummaryOrFriday = () => {
    // Opens Friday Leave summary directly; tapping again switches to Home overview
    if (activeModule === 'friday') {
      onSelectModule('home');
    } else {
      onSelectModule('friday');
    }
  };

  return (
    <nav
      aria-label="Mobil alt menü"
      className="print-hidden lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
    >
      <div className="grid grid-cols-4 h-14">
        <button
          type="button"
          onClick={() => onSelectModule('attendance')}
          className={`flex flex-col items-center justify-center min-h-[44px] gap-0.5 transition-colors cursor-pointer ${
            isAttendance ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <ClipboardCheck className="w-5 h-5" strokeWidth={isAttendance ? 2.4 : 1.9} />
          <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">Yoklama</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectModule('lessons')}
          className={`flex flex-col items-center justify-center min-h-[44px] gap-0.5 transition-colors cursor-pointer ${
            isLessons ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <BookOpenCheck className="w-5 h-5" strokeWidth={isLessons ? 2.4 : 1.9} />
          <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
            Ders Dinle
          </span>
        </button>

        <button
          type="button"
          onClick={handleSummaryOrFriday}
          className={`flex flex-col items-center justify-center min-h-[44px] gap-0.5 transition-colors cursor-pointer ${
            isFridayOrHome ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <Landmark className="w-5 h-5" strokeWidth={isFridayOrHome ? 2.4 : 1.9} />
          <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
            Cuma / Özet
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenMenu}
          aria-expanded={menuOpen}
          className={`flex flex-col items-center justify-center min-h-[44px] gap-0.5 transition-colors cursor-pointer ${
            isMenuHighlight ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <Menu className="w-5 h-5" strokeWidth={isMenuHighlight ? 2.4 : 1.9} />
          <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
            Veli / Menü
          </span>
        </button>
      </div>
    </nav>
  );
};

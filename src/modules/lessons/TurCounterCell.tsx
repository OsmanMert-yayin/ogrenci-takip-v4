import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface TurCounterCellProps {
  value: number;
  onChange: (next: number) => void;
  size?: 'sm' | 'lg';
  disabled?: boolean;
}

export function getTurToneClasses(tur: number): {
  wrapper: string;
  badgeText: string;
  btnHover: string;
} {
  if (tur >= 5) {
    return {
      wrapper: 'border-red-300 bg-red-50/90 text-red-800',
      badgeText: 'text-red-800 font-bold',
      btnHover: 'hover:bg-red-100 text-red-700',
    };
  }
  if (tur >= 3) {
    return {
      wrapper: 'border-amber-300 bg-amber-50/90 text-amber-800',
      badgeText: 'text-amber-800 font-semibold',
      btnHover: 'hover:bg-amber-100 text-amber-700',
    };
  }
  return {
    wrapper: 'border-emerald-200/90 bg-emerald-50/60 text-emerald-900',
    badgeText: 'text-emerald-800 font-semibold',
    btnHover: 'hover:bg-emerald-100/80 text-emerald-700',
  };
}

export const TurCounterCell: React.FC<TurCounterCellProps> = React.memo(
  ({ value, onChange, size = 'sm', disabled = false }) => {
    const safeVal = Math.max(1, Math.floor(value || 1));
    const tone = getTurToneClasses(safeVal);

    const handleDec = () => {
      if (disabled || safeVal <= 1) return;
      onChange(safeVal - 1);
    };

    const handleInc = () => {
      if (disabled) return;
      onChange(safeVal + 1);
    };

    if (size === 'lg') {
      return (
        <div
          className={`inline-flex items-center justify-between w-full rounded-xl border p-1.5 transition-colors ${tone.wrapper}`}
        >
          <button
            type="button"
            onClick={handleDec}
            disabled={disabled || safeVal <= 1}
            aria-label="Turu azalt"
            className={`min-h-[44px] min-w-[52px] rounded-lg flex items-center justify-center border border-slate-200/70 bg-white shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${tone.btnHover}`}
          >
            <Minus className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center px-3">
            <span className={`text-base tabular-nums ${tone.badgeText}`}>Tur: {safeVal}</span>
            <span className="text-[11px] text-slate-500">
              {safeVal >= 5 ? 'Yoğun tekrar' : safeVal >= 3 ? 'Tekrar artıyor' : 'Normal akış'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleInc}
            disabled={disabled}
            aria-label="Turu artır"
            className={`min-h-[44px] min-w-[52px] rounded-lg flex items-center justify-center border border-slate-200/70 bg-white shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${tone.btnHover}`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      );
    }

    return (
      <div
        className={`inline-flex items-center rounded-lg border overflow-hidden select-none transition-colors ${tone.wrapper}`}
        title="Tur sayısı (puanı etkilemez)"
      >
        <button
          type="button"
          onClick={handleDec}
          disabled={disabled || safeVal <= 1}
          aria-label="Turu azalt"
          className={`w-6 h-7 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${tone.btnHover}`}
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className={`min-w-[22px] text-center text-xs tabular-nums ${tone.badgeText}`}>
          {safeVal}
        </span>
        <button
          type="button"
          onClick={handleInc}
          disabled={disabled}
          aria-label="Turu artır"
          className={`w-6 h-7 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${tone.btnHover}`}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    );
  }
);

TurCounterCell.displayName = 'TurCounterCell';

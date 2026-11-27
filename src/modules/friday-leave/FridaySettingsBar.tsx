import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import type { DayOfWeek, FridayLeaveSettings } from '../../types';
import { formatFullDDMMYYYY } from '../../utils/duplicateAndMakeupEngine';
import type { FridayWeekRange } from '../../utils/fridayLeaveEngine';
import { DAYS_OF_WEEK } from '../curriculum/curriculumConstants';

interface FridaySettingsBarProps {
  weekRange: FridayWeekRange;
  weekOffset: number;
  onChangeWeekOffset: (delta: number | 'reset') => void;
  settings: FridayLeaveSettings;
  onUpdateSettings: (patch: Partial<FridayLeaveSettings>) => void;
}

export const FridaySettingsBar: React.FC<FridaySettingsBarProps> = ({
  weekRange,
  weekOffset,
  onChangeWeekOffset,
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Friday Week Navigator */}
        <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => onChangeWeekOffset(-1)}
            className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-white inline-flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Önceki Cuma
          </button>
          <button
            type="button"
            onClick={() => onChangeWeekOffset('reset')}
            className="h-8 px-3 rounded-lg bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer tabular-nums"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{formatFullDDMMYYYY(weekRange.fridayISO)} Cuması</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeWeekOffset(1)}
            className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-white inline-flex items-center gap-1 cursor-pointer"
          >
            Sonraki Cuma
            <ChevronRight className="w-4 h-4" />
          </button>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => onChangeWeekOffset('reset')}
              className="h-8 px-2 text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
            >
              Bu Hafta
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 tabular-nums">
          Değerlendirme Aralığı:{' '}
          <strong className="text-slate-800">
            {formatFullDDMMYYYY(weekRange.rangeStartISO)} – {formatFullDDMMYYYY(weekRange.rangeEndISO)}
          </strong>
        </div>
      </div>

      {/* Customizable Leave Rules */}
      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
        <div className="inline-flex items-center gap-1.5 text-slate-600 font-semibold">
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
          <span>İzin Kuralları:</span>
        </div>

        {/* Week Start / End Days */}
        <div className="inline-flex items-center gap-1.5">
          <span className="text-slate-500">Hafta Aralığı:</span>
          <select
            value={settings.weekStartDay}
            onChange={(e) =>
              onUpdateSettings({ weekStartDay: Number(e.target.value) as DayOfWeek })
            }
            aria-label="Hafta başlangıç günü"
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 cursor-pointer"
          >
            {DAYS_OF_WEEK.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <span className="text-slate-400">–</span>
          <select
            value={settings.weekEndDay}
            onChange={(e) =>
              onUpdateSettings({ weekEndDay: Number(e.target.value) as DayOfWeek })
            }
            aria-label="Hafta bitiş günü"
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 cursor-pointer"
          >
            {DAYS_OF_WEEK.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Blocker Threshold */}
        <div className="inline-flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-slate-500">Engel Eşiği:</span>
          <select
            value={settings.maxBlockerLimit}
            onChange={(e) => onUpdateSettings({ maxBlockerLimit: Number(e.target.value) })}
            aria-label="Engel eşik sayısı"
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold cursor-pointer tabular-nums"
          >
            <option value={0}>0 Engel (Sıfır Hata)</option>
            <option value={2}>2 Engel (X/2)</option>
            <option value={3}>3 Engel (X/3)</option>
            <option value={5}>5 Engel (X/5)</option>
            <option value={7}>7 Engel (X/7 - Varsayılan)</option>
            <option value={10}>10 Engel (X/10)</option>
          </select>
        </div>

        {/* Saturday Advance Lesson Toggle */}
        <label className="inline-flex items-center gap-2 ml-auto cursor-pointer select-none bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-100/70">
          <input
            type="checkbox"
            checked={settings.requireSaturdayAdvanceLesson}
            onChange={(e) =>
              onUpdateSettings({ requireSaturdayAdvanceLesson: e.target.checked })
            }
            className="w-4 h-4 rounded accent-emerald-700 cursor-pointer"
          />
          <span className="font-medium text-slate-700">
            Cumartesi / Hafta Sonu Peşin Dersi Şartı
          </span>
        </label>
      </div>
    </div>
  );
};

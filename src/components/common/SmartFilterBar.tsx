import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';

export interface FilterOptionItem {
  value: string;
  label: string;
}

export interface SmartFilterField {
  id: string;
  label: string;
  type: 'search' | 'select';
  placeholder?: string;
  options?: FilterOptionItem[];
}

interface SmartFilterBarProps {
  pageKey: string;
  coreFilters: SmartFilterField[];
  optionalFilters: SmartFilterField[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  onReset: () => void;
  resultSummary?: string;
}

export const SmartFilterBar: React.FC<SmartFilterBarProps> = ({
  pageKey,
  coreFilters,
  optionalFilters,
  values,
  onChange,
  onReset,
  resultSummary,
}) => {
  const { db, setPageFilterPrefs } = useAppStore();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const enabledOptionalIds = useMemo(
    () => db.filterPreferences[pageKey] ?? [],
    [db.filterPreferences, pageKey]
  );

  useEffect(() => {
    if (!popoverOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopoverOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [popoverOpen]);

  const activeOptionalFields = useMemo(
    () => optionalFilters.filter((f) => enabledOptionalIds.includes(f.id)),
    [optionalFilters, enabledOptionalIds]
  );

  const visibleFields = useMemo(
    () => [...coreFilters, ...activeOptionalFields],
    [coreFilters, activeOptionalFields]
  );

  const hasActiveValues = useMemo(
    () =>
      visibleFields.some((field) => {
        const val = values[field.id];
        return Boolean(val && val !== 'all' && val !== 'default');
      }),
    [visibleFields, values]
  );

  const toggleOptionalFilter = (id: string) => {
    const isEnabled = enabledOptionalIds.includes(id);
    const next = isEnabled
      ? enabledOptionalIds.filter((item) => item !== id)
      : [...enabledOptionalIds, id];
    setPageFilterPrefs(pageKey, next);
    if (isEnabled) {
      onChange(id, '');
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        {visibleFields.map((field) => {
          const val = values[field.id] ?? '';
          if (field.type === 'search') {
            return (
              <div
                key={field.id}
                className="relative flex-1 min-w-[200px] sm:min-w-[220px] max-w-md"
              >
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={val}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  placeholder={field.placeholder ?? `${field.label}...`}
                  aria-label={field.label}
                  className="w-full min-h-[40px] pl-9 pr-8 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 transition-colors"
                />
                {val && (
                  <button
                    type="button"
                    onClick={() => onChange(field.id, '')}
                    aria-label="Aramayı temizle"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          }

          return (
            <div key={field.id} className="min-w-[148px] sm:min-w-[164px]">
              <select
                value={val}
                onChange={(e) => onChange(field.id, e.target.value)}
                aria-label={field.label}
                className="w-full min-h-[40px] px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 transition-colors cursor-pointer"
              >
                <option value="">{field.placeholder ?? `${field.label}: Tümü`}</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}

        <div className="flex items-center gap-2 ml-auto">
          {resultSummary && (
            <span className="hidden md:inline text-xs text-slate-500 tabular-nums whitespace-nowrap pr-1">
              {resultSummary}
            </span>
          )}

          {hasActiveValues && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Temizle
            </button>
          )}

          {optionalFilters.length > 0 && (
            <div className="relative" ref={popoverRef}>
              <button
                type="button"
                onClick={() => setPopoverOpen((prev) => !prev)}
                aria-expanded={popoverOpen}
                className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  popoverOpen || enabledOptionalIds.length > 0
                    ? 'border-emerald-600/40 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Filtre</span>
                {enabledOptionalIds.length > 0 && (
                  <span className="tabular-nums font-semibold">({enabledOptionalIds.length})</span>
                )}
              </button>

              {popoverOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-900/10 py-2 z-30">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
                      Sayfa Filtreleri
                    </span>
                    <span className="text-[11px] text-slate-400">Otomatik kaydedilir</span>
                  </div>
                  <div className="py-1 max-h-64 overflow-y-auto">
                    {optionalFilters.map((opt) => {
                      const checked = enabledOptionalIds.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleOptionalFilter(opt.id)}
                          className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <span className={checked ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                            {opt.label}
                          </span>
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                              checked
                                ? 'bg-emerald-700 border-emerald-700 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

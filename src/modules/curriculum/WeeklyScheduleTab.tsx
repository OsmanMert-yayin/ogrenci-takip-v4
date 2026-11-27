import React, { useMemo, useState } from 'react';
import { Clock, Copy, Plus } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { SmartFilterBar, type SmartFilterField } from '../../components/common/SmartFilterBar';
import { useAppStore } from '../../store/AppStoreContext';
import {
  GENERAL_SCHEDULE_CLASS_ID,
  type DayOfWeek,
  type LessonSlot,
  type ScheduleEntry,
} from '../../types';
import { DAYS_OF_WEEK, isEtutOrMutalaa } from './curriculumConstants';
import { CopyDayModal, ScheduleCellModal } from './ScheduleModals';

interface ScheduleRowProps {
  slot: LessonSlot;
  days: typeof DAYS_OF_WEEK;
  entryMap: Map<string, ScheduleEntry>;
  fallbackGeneralMap: Map<string, ScheduleEntry>;
  isGeneralScope: boolean;
  requirementFilter: string;
  onCellClick: (day: DayOfWeek, slot: LessonSlot, ownEntry: ScheduleEntry | null) => void;
}

const ScheduleGridRow: React.FC<ScheduleRowProps> = React.memo(
  ({
    slot,
    days,
    entryMap,
    fallbackGeneralMap,
    isGeneralScope,
    requirementFilter,
    onCellClick,
  }) => {
    const isSlotEtut = slot.category === 'etut';

    return (
      <tr className="border-b border-slate-100 last:border-b-0">
        <td
          className={`py-2.5 pl-4 pr-3 align-top border-r border-slate-100 w-40 ${
            isSlotEtut ? 'bg-amber-50/50' : 'bg-slate-50/50'
          }`}
        >
          <div className="text-xs font-semibold text-slate-900">{slot.name}</div>
          <div className="font-mono text-[11px] text-slate-500 tabular-nums mt-0.5 inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {slot.startTime}–{slot.endTime}
          </div>
          <div className="text-[11px] mt-0.5 text-slate-500">
            {isSlotEtut ? (
              <span className="text-amber-800 font-medium">Etüt / Mütalaa</span>
            ) : (
              <span>Normal Ders</span>
            )}
          </div>
        </td>

        {days.map((day) => {
          const key = `${day.value}|${slot.id}`;
          const ownEntry = entryMap.get(key) ?? null;
          const inheritedEntry = !ownEntry && !isGeneralScope ? fallbackGeneralMap.get(key) ?? null : null;
          const effective = ownEntry ?? inheritedEntry;

          const hiddenByReq =
            requirementFilter &&
            effective &&
            (effective.requirement ?? slot.requirement) !== requirementFilter;

          const mutalaaVisual = isEtutOrMutalaa(slot, effective ?? undefined);

          return (
            <td key={day.value} className="p-1.5 align-top border-r border-slate-100 last:border-r-0 min-w-[136px]">
              <button
                type="button"
                onClick={() => onCellClick(day.value, slot, ownEntry)}
                className={`w-full min-h-[68px] p-2.5 rounded-lg text-left transition-colors cursor-pointer border ${
                  !effective || hiddenByReq
                    ? 'border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 text-slate-400'
                    : mutalaaVisual
                      ? 'bg-amber-50/70 border-amber-200/80 hover:border-amber-400'
                      : inheritedEntry
                        ? 'bg-slate-50 border-slate-200/70 hover:border-emerald-400'
                        : 'bg-white border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20'
                }`}
              >
                {effective && !hiddenByReq ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-semibold truncate ${
                          mutalaaVisual ? 'text-amber-900' : 'text-slate-900'
                        }`}
                      >
                        {effective.subjectName}
                      </span>
                      {(effective.requirement ?? slot.requirement) === 'secmeli' && (
                        <span className="text-[10px] text-slate-400 shrink-0">Seçmeli</span>
                      )}
                    </div>
                    {effective.defaultTopic && (
                      <div className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                        {effective.defaultTopic}
                      </div>
                    )}
                    {inheritedEntry && (
                      <div className="text-[10px] text-slate-400 italic">Ortak programdan</div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-400 gap-1">
                    <Plus className="w-3 h-3" />
                    <span>Ata</span>
                  </div>
                )}
              </button>
            </td>
          );
        })}
      </tr>
    );
  }
);

ScheduleGridRow.displayName = 'ScheduleGridRow';

export const WeeklyScheduleTab: React.FC = () => {
  const { db, activeTerm, upsertScheduleEntry, deleteScheduleEntry, copyDaySchedule, showToast } =
    useAppStore();

  const [filters, setFilters] = useState<Record<string, string>>({
    classId: GENERAL_SCHEDULE_CLASS_ID,
  });
  const [cellModal, setCellModal] = useState<{
    day: DayOfWeek;
    slot: LessonSlot;
    entry: ScheduleEntry | null;
  } | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);

  const termId = activeTerm?.id ?? db.terms[0]?.id ?? 'term_default';
  const selectedClassId = filters.classId || GENERAL_SCHEDULE_CLASS_ID;
  const isGeneralScope = selectedClassId === GENERAL_SCHEDULE_CLASS_ID;

  const selectedClassLabel = useMemo(() => {
    if (isGeneralScope) return 'Genel / Ortak Program';
    return db.classes.find((c) => c.id === selectedClassId)?.name ?? 'Genel / Ortak Program';
  }, [isGeneralScope, db.classes, selectedClassId]);

  const coreFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'classId',
        label: 'Sınıf / Program',
        type: 'select',
        placeholder: 'Genel / Ortak Program',
        options: [
          { value: GENERAL_SCHEDULE_CLASS_ID, label: 'Genel / Ortak Program' },
          ...db.classes.map((c) => ({ value: c.id, label: `${c.name} (${c.shiftType})` })),
        ],
      },
      {
        id: 'day',
        label: 'Gün',
        type: 'select',
        placeholder: 'Gün: Tüm Hafta (Pzt–Paz)',
        options: [
          { value: 'weekdays', label: 'Hafta İçi (Pzt–Cum)' },
          ...DAYS_OF_WEEK.map((d) => ({ value: String(d.value), label: d.label })),
        ],
      },
    ],
    [db.classes]
  );

  const optionalFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'slotKind',
        label: 'Ders / Etüt Türü',
        type: 'select',
        placeholder: 'Dilim Türü: Tümü',
        options: [
          { value: 'normal', label: 'Yalnızca Normal Dersler' },
          { value: 'etut', label: 'Yalnızca Etüt / Mütalaa' },
        ],
      },
      {
        id: 'requirement',
        label: 'Zorunluluk',
        type: 'select',
        placeholder: 'Zorunluluk: Tümü',
        options: [
          { value: 'zorunlu', label: 'Zorunlu' },
          { value: 'secmeli', label: 'Seçmeli' },
        ],
      },
    ],
    []
  );

  const visibleDays = useMemo(() => {
    const dayFilter = filters.day ?? '';
    if (dayFilter === 'weekdays') return DAYS_OF_WEEK.slice(0, 5);
    if (dayFilter) {
      const n = Number(dayFilter);
      return DAYS_OF_WEEK.filter((d) => d.value === n);
    }
    return DAYS_OF_WEEK;
  }, [filters.day]);

  const visibleSlots = useMemo(() => {
    const kind = filters.slotKind ?? '';
    return db.lessonSlots.filter((s) => {
      if (kind === 'normal' && s.category !== 'normal') return false;
      if (kind === 'etut' && s.category !== 'etut') return false;
      return true;
    });
  }, [db.lessonSlots, filters.slotKind]);

  const { entryMap, fallbackGeneralMap } = useMemo(() => {
    const own = new Map<string, ScheduleEntry>();
    const general = new Map<string, ScheduleEntry>();
    for (const item of db.schedule) {
      if (item.termId && item.termId !== termId) continue;
      const key = `${item.dayOfWeek}|${item.lessonSlotId}`;
      if (item.classId === selectedClassId) {
        own.set(key, item);
      }
      if (item.classId === GENERAL_SCHEDULE_CLASS_ID) {
        general.set(key, item);
      }
    }
    return { entryMap: own, fallbackGeneralMap: general };
  }, [db.schedule, termId, selectedClassId]);

  const handleOpenCell = (day: DayOfWeek, slot: LessonSlot, ownEntry: ScheduleEntry | null) => {
    setCellModal({ day, slot, entry: ownEntry });
  };

  if (db.lessonSlots.length === 0) {
    return (
      <EmptyState
        title="Önce ders saatleri tanımlanmalı"
        description="Haftalık ders programını oluşturmak için Kurum & Dönem > Ders Saatleri sekmesinden en az bir ders saati ekleyin."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Günlük & Haftalık Ders Programı</h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Herhangi bir ders hücresine tıklayarak ders, varsayılan konu ve zorunluluk durumunu atayın.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCopyModalOpen(true)}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <Copy className="w-3.5 h-3.5" />
          Günü Başka Güne Kopyala
        </button>
      </div>

      <SmartFilterBar
        pageKey="curriculum_schedule"
        coreFilters={coreFilters}
        optionalFilters={optionalFilters}
        values={filters}
        onChange={(id, val) => setFilters((prev) => ({ ...prev, [id]: val }))}
        onReset={() => setFilters({ classId: GENERAL_SCHEDULE_CLASS_ID })}
        resultSummary={`${visibleSlots.length} saat · ${visibleDays.length} gün`}
      />

      {/* Clean Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 px-1">
        <span>
          Aktif Kapsam: <strong className="text-slate-800">{selectedClassLabel}</strong>
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-amber-300 bg-amber-50 inline-block" />
          Etüt / Mütalaa (Ders Takip ekranında otomatik ayrılır)
        </span>
      </div>

      {/* Desktop Weekly Matrix */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
              <th className="py-3 pl-4 pr-3 border-r border-slate-200/80 w-40">Ders Saati</th>
              {visibleDays.map((day) => (
                <th
                  key={day.value}
                  className="py-3 px-3 border-r border-slate-200/60 last:border-r-0"
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleSlots.map((slot) => (
              <ScheduleGridRow
                key={slot.id}
                slot={slot}
                days={visibleDays}
                entryMap={entryMap}
                fallbackGeneralMap={fallbackGeneralMap}
                isGeneralScope={isGeneralScope}
                requirementFilter={filters.requirement ?? ''}
                onCellClick={handleOpenCell}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Day-by-Day Cards */}
      <div className="md:hidden space-y-4">
        {visibleDays.map((day) => (
          <div key={day.value} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-800">
              {day.label}
            </div>
            <div className="divide-y divide-slate-100">
              {visibleSlots.map((slot) => {
                const key = `${day.value}|${slot.id}`;
                const ownEntry = entryMap.get(key) ?? null;
                const inherited = !ownEntry && !isGeneralScope ? fallbackGeneralMap.get(key) ?? null : null;
                const effective = ownEntry ?? inherited;
                const mutalaaVisual = isEtutOrMutalaa(slot, effective ?? undefined);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleOpenCell(day.value, slot, ownEntry)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 ${
                      mutalaaVisual ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-slate-500 tabular-nums">
                        {slot.startTime}–{slot.endTime} · {slot.name}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                        {effective ? effective.subjectName : 'Atanmadı'}
                      </div>
                      {effective?.defaultTopic && (
                        <div className="text-xs text-slate-500 truncate">{effective.defaultTopic}</div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-emerald-700 shrink-0">
                      {ownEntry ? 'Düzenle' : 'Ata'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ScheduleCellModal
        open={Boolean(cellModal)}
        termId={termId}
        classId={selectedClassId}
        classLabel={selectedClassLabel}
        dayOfWeek={cellModal?.day ?? 1}
        slot={cellModal?.slot ?? null}
        existingEntry={cellModal?.entry ?? null}
        teachers={db.teachers}
        topicPool={db.topicPool}
        onClose={() => setCellModal(null)}
        onSave={(entry) => {
          upsertScheduleEntry(entry);
          setCellModal(null);
          showToast('Ders programı hücresi kaydedildi.');
        }}
        onDelete={(entryId) => {
          deleteScheduleEntry(entryId);
          setCellModal(null);
          showToast('Program hücresi temizlendi.', 'info');
        }}
      />

      <CopyDayModal
        open={copyModalOpen}
        classLabel={selectedClassLabel}
        onClose={() => setCopyModalOpen(false)}
        onConfirm={(fromDay, toDays) => {
          copyDaySchedule(termId, selectedClassId, fromDay, toDays);
          showToast(`Günlük program ${toDays.length} güne kopyalandı.`);
        }}
      />
    </div>
  );
};

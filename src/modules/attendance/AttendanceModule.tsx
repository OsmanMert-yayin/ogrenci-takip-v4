import React, { useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, Table2 } from 'lucide-react';
import { SmartFilterBar, type SmartFilterField } from '../../components/common/SmartFilterBar';
import { useAppStore } from '../../store/AppStoreContext';
import { DAILY_ATTENDANCE_SLOT_ID } from '../../types';
import { formatTurkishDate, getTodayISO } from '../../utils/id';
import {
  ATTENDANCE_STATUS_ORDER,
  buildAttendanceLookup,
  getDayOfWeekFromISO,
} from './attendanceMeta';
import { DailyGeneralTab } from './DailyGeneralTab';
import { MobileAttendanceCommander } from './MobileAttendanceCommander';
import { SlotMatrixTab } from './SlotMatrixTab';
import { getDayLabel } from '../curriculum/curriculumConstants';

type AttendanceTabKey = 'daily' | 'matrix';

export const AttendanceModule: React.FC = () => {
  const { db } = useAppStore();
  const [date, setDate] = useState<string>(() => getTodayISO());
  const [activeTab, setActiveTab] = useState<AttendanceTabKey>('daily');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const classMap = useMemo(() => new Map(db.classes.map((c) => [c.id, c])), [db.classes]);
  const dayLabel = useMemo(() => getDayLabel(getDayOfWeekFromISO(date)), [date]);
  const attendanceLookup = useMemo(
    () => buildAttendanceLookup(db.attendance, date),
    [db.attendance, date]
  );

  const coreFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'classId',
        label: 'Sınıf / Grup',
        type: 'select',
        placeholder: 'Sınıf / Grup: Tümü',
        options: db.classes.map((c) => ({ value: c.id, label: `${c.name} (${c.shiftType})` })),
      },
      {
        id: 'q',
        label: 'Hızlı Öğrenci Ara',
        type: 'search',
        placeholder: 'Öğrenci adı veya numara ara...',
      },
    ],
    [db.classes]
  );

  const optionalFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'shift',
        label: 'Sabah / Öğle Grubu',
        type: 'select',
        placeholder: 'Vakit: Tümü',
        options: [
          { value: 'Sabah', label: 'Sabah' },
          { value: 'Öğleden Sonra', label: 'Öğleden Sonra' },
          { value: 'Tam Gün', label: 'Tam Gün' },
          { value: 'Yatılı', label: 'Yatılı' },
        ],
      },
      {
        id: 'status',
        label: 'Yoklama Durumu',
        type: 'select',
        placeholder: 'Durum: Tümü',
        options: [
          ...ATTENDANCE_STATUS_ORDER.map((s) => ({ value: s, label: s })),
          { value: '__unrecorded__', label: 'Henüz Kayıtsız' },
        ],
      },
      {
        id: 'program',
        label: 'Program Türü',
        type: 'select',
        placeholder: 'Program: Tümü',
        options: [
          { value: 'Yüzüne & Ezber', label: 'Yüzüne & Ezber' },
          { value: 'Hafızlık', label: 'Hafızlık' },
        ],
      },
    ],
    []
  );

  const filteredStudents = useMemo(() => {
    const q = (filters.q ?? '').trim().toLocaleLowerCase('tr-TR');
    const classId = filters.classId ?? '';
    const shift = filters.shift ?? '';
    const statusFilter = filters.status ?? '';
    const program = filters.program ?? '';

    return db.students
      .filter((s) => s.status === 'Aktif')
      .filter((s) => {
        if (classId && s.classId !== classId) return false;
        if (program && s.programType !== program) return false;
        if (shift) {
          const cls = classMap.get(s.classId);
          if (!cls || cls.shiftType !== shift) return false;
        }
        if (statusFilter) {
          const studentDayRecords = db.attendance.filter(
            (r) => r.date === date && r.studentId === s.id
          );
          if (statusFilter === '__unrecorded__') {
            if (studentDayRecords.length > 0) return false;
          } else {
            const hasDailyMatch =
              attendanceLookup.get(`${s.id}|${DAILY_ATTENDANCE_SLOT_ID}`)?.status === statusFilter;
            const hasAnyMatch = studentDayRecords.some((r) => r.status === statusFilter);
            if (!hasDailyMatch && !hasAnyMatch) return false;
          }
        }
        if (q) {
          const hay = `${s.fullName} ${s.studentNo ?? ''}`.toLocaleLowerCase('tr-TR');
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [db.students, db.attendance, filters, classMap, date, attendanceLookup]);

  return (
    <div className="space-y-5">
      {/* Mobile Classroom Commander (lg:hidden) */}
      <div className="lg:hidden">
        <MobileAttendanceCommander
          date={date}
          onDateChange={setDate}
          selectedClassId={filters.classId ?? ''}
          onClassChange={(val) => setFilters((prev) => ({ ...prev, classId: val }))}
          students={filteredStudents}
          classMap={classMap}
          lookup={attendanceLookup}
        />
      </div>

      {/* Desktop Management View (hidden lg:block) */}
      <div className="hidden lg:block space-y-5">
        {/* Top Date Strip + Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
          <div className="flex items-center gap-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'daily'}
              onClick={() => setActiveTab('daily')}
              className={`inline-flex items-center gap-2 min-h-[44px] px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'daily'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Günlük Genel Liste</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'matrix'}
              onClick={() => setActiveTab('matrix')}
              className={`inline-flex items-center gap-2 min-h-[44px] px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'matrix'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>Ders Saati Matrisi</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 pb-2">
            <span className="text-xs text-slate-500 hidden xl:inline">
              {formatTurkishDate(date)} · {dayLabel}
            </span>
            <label className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 min-h-[38px]">
              <CalendarDays className="w-4 h-4 text-emerald-700 shrink-0" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Yoklama tarihi"
                className="text-xs font-medium text-slate-800 tabular-nums focus:outline-none bg-transparent"
              />
            </label>
            {date !== getTodayISO() && (
              <button
                type="button"
                onClick={() => setDate(getTodayISO())}
                className="min-h-[38px] px-3 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer whitespace-nowrap"
              >
                Bugün
              </button>
            )}
          </div>
        </div>

        <SmartFilterBar
          pageKey="attendance_desktop"
          coreFilters={coreFilters}
          optionalFilters={optionalFilters}
          values={filters}
          onChange={(id, val) => setFilters((prev) => ({ ...prev, [id]: val }))}
          onReset={() => setFilters({})}
          resultSummary={`${filteredStudents.length} aktif öğrenci`}
        />

        {activeTab === 'daily' ? (
          <DailyGeneralTab
            date={date}
            students={filteredStudents}
            classMap={classMap}
            lookup={attendanceLookup}
          />
        ) : (
          <SlotMatrixTab
            date={date}
            students={filteredStudents}
            classMap={classMap}
            selectedClassId={filters.classId ?? ''}
            lookup={attendanceLookup}
          />
        )}
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Grid3X3 } from 'lucide-react';
import {
  SmartFilterBar,
  type SmartFilterField,
} from '../../components/common/SmartFilterBar';
import { useAppStore } from '../../store/AppStoreContext';
import type { ModuleKey } from '../../types';
import { evaluateAllStudentsFridayLeave } from '../../utils/fridayLeaveEngine';
import { getTodayISO } from '../../utils/id';
import { inferLessonStatus } from '../../utils/lessonScheduleResolver';
import { getDayOfWeekFromISO } from '../attendance/attendanceMeta';
import { getDayLabel } from '../curriculum/curriculumConstants';
import { DailyInlineTab } from './DailyInlineTab';
import { WeeklyMatrixTab } from './WeeklyMatrixTab';
import { MobileLessonCommander } from './MobileLessonCommander';

type DesktopLessonTab = 'daily' | 'weekly';

interface LessonsModuleProps {
  onNavigate?: (key: ModuleKey) => void;
}

function shiftISODate(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return getTodayISO();
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const LessonsModule: React.FC<LessonsModuleProps> = ({ onNavigate }) => {
  const { db, activeTerm, showToast } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [desktopTab, setDesktopTab] = useState<DesktopLessonTab>('daily');

  const [filters, setFilters] = useState<Record<string, string>>({
    classId: '',
    search: '',
    session: '',
    programType: '',
    lessonFilter: '',
  });

  const classMap = useMemo(
    () => new Map(db.classes.map((c) => [c.id, c.name])),
    [db.classes]
  );

  const classSessionMap = useMemo(
    () => new Map(db.classes.map((c) => [c.id, c.shiftType])),
    [db.classes]
  );

  const coreFilters: SmartFilterField[] = useMemo(
    () => [
      {
        id: 'classId',
        label: 'Sınıf / Grup',
        type: 'select',
        placeholder: 'Sınıf / Grup: Tümü',
        options: db.classes.map((c) => ({ value: c.id, label: c.name })),
      },
      {
        id: 'search',
        label: 'Öğrenci Ara',
        type: 'search',
        placeholder: 'Hızlı öğrenci ara...',
      },
    ],
    [db.classes]
  );

  const optionalFilters: SmartFilterField[] = useMemo(
    () => [
      {
        id: 'session',
        label: 'Sabah / Öğle Grubu',
        type: 'select',
        placeholder: 'Oturum: Tümü',
        options: [
          { value: 'Sabah', label: 'Sabah' },
          { value: 'Öğleden Sonra', label: 'Öğleden Sonra' },
          { value: 'Tam Gün', label: 'Tam Gün' },
          { value: 'Yatılı', label: 'Yatılı' },
        ],
      },
      {
        id: 'programType',
        label: 'Program Türü',
        type: 'select',
        placeholder: 'Program: Tümü',
        options: [
          { value: 'Yüzüne & Ezber', label: 'Yüzüne & Ezber' },
          { value: 'Hafızlık', label: 'Hafızlık' },
        ],
      },
      {
        id: 'lessonFilter',
        label: 'Günlük Ders Durumu',
        type: 'select',
        placeholder: 'Ders Durumu: Tümü',
        options: [
          { value: 'has_entry', label: 'Bugün Ders Girilenler' },
          { value: 'no_entry', label: 'Henüz Girilmeyenler' },
          { value: 'needs_attention', label: 'Tekrar veya Vermedi Olanlar' },
        ],
      },
    ],
    []
  );

  const dayLessonsByStudent = useMemo(() => {
    const map = new Map<string, typeof db.lessons>();
    for (const l of db.lessons) {
      if (l.date !== selectedDate) continue;
      const list = map.get(l.studentId);
      if (list) list.push(l);
      else map.set(l.studentId, [l]);
    }
    return map;
  }, [db.lessons, selectedDate]);

  const filteredStudents = useMemo(() => {
    const q = (filters.search ?? '').trim().toLocaleLowerCase('tr-TR');
    return db.students
      .filter((s) => {
        if (s.status !== 'Aktif') return false;
        if (filters.classId && s.classId !== filters.classId) return false;
        if (filters.session && classSessionMap.get(s.classId) !== filters.session) return false;
        if (filters.programType && s.programType !== filters.programType) return false;
        if (q) {
          const hay = `${s.fullName} ${s.studentNo ?? ''}`.toLocaleLowerCase('tr-TR');
          if (!hay.includes(q)) return false;
        }
        if (filters.lessonFilter) {
          const sLessons = dayLessonsByStudent.get(s.id) ?? [];
          if (filters.lessonFilter === 'has_entry' && sLessons.length === 0) return false;
          if (filters.lessonFilter === 'no_entry' && sLessons.length > 0) return false;
          if (
            filters.lessonFilter === 'needs_attention' &&
            !sLessons.some((l) => {
              const st = inferLessonStatus(l);
              return st === 'Tekrar' || st === 'Vermedi';
            })
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr-TR'));
  }, [db.students, filters, classSessionMap, dayLessonsByStudent]);

  const fridayEvaluations = useMemo(
    () =>
      evaluateAllStudentsFridayLeave({
        students: db.students,
        attendance: db.attendance,
        lessons: db.lessons,
        schedule: db.schedule,
        lessonSlots: db.lessonSlots,
        fridayPermissions: db.fridayPermissions,
        fridaySettings: db.fridaySettings,
        activeTermId: activeTerm?.id ?? '',
        referenceISO: selectedDate,
      }).evaluations,
    [
      db.students,
      db.attendance,
      db.lessons,
      db.schedule,
      db.lessonSlots,
      db.fridayPermissions,
      db.fridaySettings,
      activeTerm?.id,
      selectedDate,
    ]
  );

  const selectedDayLabel = getDayLabel(getDayOfWeekFromISO(selectedDate));

  return (
    <div className="space-y-4">
      {/* Mobile Classroom Lesson Commander (< lg) */}
      <div className="lg:hidden">
        <MobileLessonCommander
          date={selectedDate}
          onChangeDate={setSelectedDate}
          fridayEvaluations={fridayEvaluations}
          onOpenFridayLeave={() => onNavigate?.('friday')}
          onNotify={(msg) => showToast(msg)}
        />
      </div>

      {/* Desktop Lesson Tracking Workspace (>= lg) */}
      <div className="hidden lg:block space-y-4">
        {/* Top Header: Date Switcher + 2 Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ders Takip</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Günlük program tabanlı hızlı ders girişi, yoklama entegrasyonu ve haftalık takip matrisi
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* İşlem Günü Date Strip */}
            <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftISODate(d, -1))}
                aria-label="Önceki gün"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 px-1">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-700" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  aria-label="İşlem Günü"
                  className="text-xs font-semibold tabular-nums text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                />
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800">
                  {selectedDayLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftISODate(d, 1))}
                aria-label="Sonraki gün"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayISO())}
                className="h-8 px-2.5 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 cursor-pointer"
              >
                Bugün
              </button>
            </div>

            {/* 2 Desktop Tabs */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setDesktopTab('daily')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  desktopTab === 'daily'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Günlük Ders Çizelgesi
              </button>
              <button
                type="button"
                onClick={() => setDesktopTab('weekly')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  desktopTab === 'weekly'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                Haftalık Ders &amp; Yoklama Matrisi
              </button>
            </div>
          </div>
        </div>

        {/* SmartFilterBar */}
        <SmartFilterBar
          pageKey="lessons_desktop"
          coreFilters={coreFilters}
          optionalFilters={optionalFilters}
          values={filters}
          onChange={(id, val) => setFilters((prev) => ({ ...prev, [id]: val }))}
          onReset={() =>
            setFilters({
              classId: '',
              search: '',
              session: '',
              programType: '',
              lessonFilter: '',
            })
          }
          resultSummary={`${filteredStudents.length} aktif öğrenci`}
        />

        {/* Active Desktop Tab */}
        {desktopTab === 'daily' ? (
          <DailyInlineTab
            date={selectedDate}
            students={filteredStudents}
            classMap={classMap}
            fridayEvaluations={fridayEvaluations}
            onOpenFridayLeave={() => onNavigate?.('friday')}
            onNotify={(msg) => showToast(msg)}
          />
        ) : (
          <WeeklyMatrixTab
            selectedDate={selectedDate}
            students={filteredStudents}
            classMap={classMap}
            onJumpToDate={(iso) => {
              setSelectedDate(iso);
              setDesktopTab('daily');
            }}
          />
        )}
      </div>
    </div>
  );
};

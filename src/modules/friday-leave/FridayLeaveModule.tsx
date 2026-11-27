import React, { useMemo, useState } from 'react';
import { ShieldAlert, ShieldCheck, UserCheck } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import {
  SmartFilterBar,
  type SmartFilterField,
} from '../../components/common/SmartFilterBar';
import { useAppStore } from '../../store/AppStoreContext';
import type { ModuleKey } from '../../types';
import { evaluateAllStudentsFridayLeave } from '../../utils/fridayLeaveEngine';
import { getTodayISO } from '../../utils/id';
import { FridayLeaveCard } from './FridayLeaveCard';
import { FridaySettingsBar } from './FridaySettingsBar';
import { MobileFridaySummary } from './MobileFridaySummary';

interface FridayLeaveModuleProps {
  onNavigate?: (key: ModuleKey) => void;
}

export const FridayLeaveModule: React.FC<FridayLeaveModuleProps> = ({ onNavigate }) => {
  const {
    db,
    activeTerm,
    updateFridaySettings,
    upsertFridayPermission,
    deleteFridayPermission,
    showToast,
  } = useAppStore();

  const [weekOffset, setWeekOffset] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({
    classId: '',
    search: '',
    leaveStatus: '',
    programType: '',
  });

  const classMap = useMemo(
    () => new Map(db.classes.map((c) => [c.id, c.name])),
    [db.classes]
  );

  const activeStudents = useMemo(
    () =>
      db.students
        .filter((s) => s.status === 'Aktif')
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr-TR')),
    [db.students]
  );

  const { weekRange, evaluations } = useMemo(
    () =>
      evaluateAllStudentsFridayLeave({
        students: activeStudents,
        attendance: db.attendance,
        lessons: db.lessons,
        schedule: db.schedule,
        lessonSlots: db.lessonSlots,
        fridayPermissions: db.fridayPermissions,
        fridaySettings: db.fridaySettings,
        activeTermId: activeTerm?.id ?? '',
        referenceISO: getTodayISO(),
        weekOffset,
      }),
    [
      activeStudents,
      db.attendance,
      db.lessons,
      db.schedule,
      db.lessonSlots,
      db.fridayPermissions,
      db.fridaySettings,
      activeTerm?.id,
      weekOffset,
    ]
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
        id: 'leaveStatus',
        label: 'İzin Durumu',
        type: 'select',
        placeholder: 'İzin Durumu: Tümü',
        options: [
          { value: 'eligible', label: 'İzne Uygun (0 Engel)' },
          { value: 'has_blockers', label: 'Engeli Olanlar' },
          { value: 'blocked_limit', label: 'Eşiği Aşanlar (İzin Yok)' },
          { value: 'manual_approved', label: 'Mazeretli Onaylılar' },
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
    ],
    []
  );

  const filteredStudents = useMemo(() => {
    const q = (filters.search ?? '').trim().toLocaleLowerCase('tr-TR');
    return activeStudents.filter((s) => {
      if (filters.classId && s.classId !== filters.classId) return false;
      if (filters.programType && s.programType !== filters.programType) return false;
      if (q && !s.fullName.toLocaleLowerCase('tr-TR').includes(q)) return false;

      const ev = evaluations.get(s.id);
      if (filters.leaveStatus && ev) {
        if (filters.leaveStatus === 'eligible' && ev.blockerCount > 0) return false;
        if (filters.leaveStatus === 'has_blockers' && ev.blockerCount === 0) return false;
        if (filters.leaveStatus === 'blocked_limit' && ev.canLeave) return false;
        if (filters.leaveStatus === 'manual_approved' && !ev.manualApproval) return false;
      }
      return true;
    });
  }, [activeStudents, filters, evaluations]);

  const summary = useMemo(() => {
    let eligible = 0;
    let hasBlockers = 0;
    let manualApproved = 0;
    for (const s of filteredStudents) {
      const ev = evaluations.get(s.id);
      if (!ev) continue;
      if (ev.manualApproval) manualApproved += 1;
      if (ev.canLeave) eligible += 1;
      if (ev.blockerCount > 0) hasBlockers += 1;
    }
    return { eligible, hasBlockers, manualApproved };
  }, [filteredStudents, evaluations]);

  return (
    <div className="space-y-4">
      {/* Mobile View (< lg) */}
      <div className="lg:hidden">
        <MobileFridaySummary
          students={filteredStudents}
          classMap={classMap}
          weekRange={weekRange}
          evaluations={evaluations}
          onSavePermission={(input) => {
            upsertFridayPermission(input);
            showToast('Cuma izni durumu güncellendi.');
          }}
          onResetPermission={(date, studentId) => {
            deleteFridayPermission(date, studentId);
            showToast('Mazeret onayı kaldırıldı.', 'info');
          }}
          onNavigate={onNavigate}
        />
      </div>

      {/* Desktop View (>= lg) */}
      <div className="hidden lg:block space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cuma İzni</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Adil engel motoru, özürsüz yoklama &amp; zorunlu ders takibi ve mazeretli onay yönetimi
            </p>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold tabular-nums">
              <ShieldCheck className="w-4 h-4" />
              İzne Çıkabilir: {summary.eligible}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold tabular-nums">
              <ShieldAlert className="w-4 h-4" />
              Engeli Var: {summary.hasBlockers}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-semibold tabular-nums">
              <UserCheck className="w-4 h-4" />
              Mazeretli Onay: {summary.manualApproved}
            </span>
          </div>
        </div>

        <FridaySettingsBar
          weekRange={weekRange}
          weekOffset={weekOffset}
          onChangeWeekOffset={(d) => setWeekOffset((prev) => (d === 'reset' ? 0 : prev + d))}
          settings={db.fridaySettings}
          onUpdateSettings={(patch) => {
            updateFridaySettings(patch);
            showToast('Cuma izni kuralları kaydedildi.');
          }}
        />

        <SmartFilterBar
          pageKey="friday_leave"
          coreFilters={coreFilters}
          optionalFilters={optionalFilters}
          values={filters}
          onChange={(id, val) => setFilters((prev) => ({ ...prev, [id]: val }))}
          onReset={() =>
            setFilters({ classId: '', search: '', leaveStatus: '', programType: '' })
          }
          resultSummary={`${filteredStudents.length} öğrenci`}
        />

        {filteredStudents.length === 0 ? (
          <EmptyState
            title="Eşleşen öğrenci bulunamadı"
            description="Filtreleri sıfırlayarak Cuma izni listesini görüntüleyebilirsiniz."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredStudents.map((student) => {
              const ev = evaluations.get(student.id);
              if (!ev) return null;
              return (
                <FridayLeaveCard
                  key={student.id}
                  student={student}
                  classNameLabel={classMap.get(student.classId) ?? 'Sınıfsız'}
                  evaluation={ev}
                  onSavePermission={(input) => {
                    upsertFridayPermission(input);
                    showToast(`${student.fullName} için Cuma izni kaydedildi.`);
                  }}
                  onResetPermission={(date, studentId) => {
                    deleteFridayPermission(date, studentId);
                    showToast(`${student.fullName} mazeret onayı kaldırıldı.`, 'info');
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

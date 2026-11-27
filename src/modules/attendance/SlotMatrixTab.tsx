import React, { useCallback, useMemo, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { useAppStore } from '../../store/AppStoreContext';
import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassGroup,
  LessonSlot,
  Student,
} from '../../types';
import { AttendanceCellModal } from './AttendanceCellModal';
import {
  ATTENDANCE_STATUS_META,
  getDayOfWeekFromISO,
  getScheduledSubjectForSlot,
  resolveStudentSlotAttendance,
} from './attendanceMeta';

interface MatrixRowProps {
  student: Student;
  classGroup?: ClassGroup;
  slots: LessonSlot[];
  lookup: Map<string, AttendanceRecord>;
  onCellClick: (student: Student, slot: LessonSlot) => void;
}

const MatrixStudentRow: React.FC<MatrixRowProps> = React.memo(
  ({ student, classGroup, slots, lookup, onCellClick }) => {
    return (
      <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors">
        <td className="py-2.5 pl-4 pr-3 sticky left-0 bg-white z-10 border-r border-slate-100 min-w-[190px]">
          <div className="text-sm font-semibold text-slate-900 truncate">{student.fullName}</div>
          <div className="text-[11px] text-slate-500 truncate">{classGroup?.name ?? 'Sınıf Yok'}</div>
        </td>

        {slots.map((slot) => {
          const eff = resolveStudentSlotAttendance(lookup, student.id, slot.id);
          const status = eff.status;

          return (
            <td
              key={slot.id}
              className="p-1.5 text-center border-r border-slate-100 last:border-r-0 min-w-[92px]"
            >
              <button
                type="button"
                onClick={() => onCellClick(student, slot)}
                title={
                  status
                    ? `${status}${eff.inheritedFromDaily ? ' (Günlük listeden)' : ''}${eff.note ? ` — ${eff.note}` : ''}`
                    : 'Yoklama alınmadı — işaretlemek için tıklayın'
                }
                className={`w-full min-h-[38px] px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex flex-col items-center justify-center border ${
                  !status
                    ? 'border-transparent bg-slate-50/70 text-slate-300 hover:border-slate-300 hover:text-slate-500'
                    : status === 'Geldi'
                      ? 'border-emerald-100 bg-emerald-50/50 text-emerald-700 hover:border-emerald-300'
                      : ATTENDANCE_STATUS_META[status].cellBadgeClass
                }`}
              >
                {!status ? (
                  <span className="text-base leading-none">·</span>
                ) : (
                  <>
                    <span className="leading-tight">
                      {ATTENDANCE_STATUS_META[status].compactCode}
                    </span>
                    {eff.inheritedFromDaily && (
                      <span className="text-[9px] font-normal opacity-80 leading-none mt-0.5">
                        Günlük
                      </span>
                    )}
                  </>
                )}
              </button>
            </td>
          );
        })}
      </tr>
    );
  }
);

MatrixStudentRow.displayName = 'MatrixStudentRow';

interface SlotMatrixTabProps {
  date: string;
  students: Student[];
  classMap: Map<string, ClassGroup>;
  selectedClassId: string;
  lookup: Map<string, AttendanceRecord>;
}

export const SlotMatrixTab: React.FC<SlotMatrixTabProps> = ({
  date,
  students,
  classMap,
  selectedClassId,
  lookup,
}) => {
  const { db, activeTerm, upsertAttendance, batchUpsertAttendance, deleteAttendance, showToast } =
    useAppStore();
  const [showEtut, setShowEtut] = useState(true);
  const [activeCell, setActiveCell] = useState<{ student: Student; slot: LessonSlot } | null>(null);

  const dayOfWeek = useMemo(() => getDayOfWeekFromISO(date), [date]);
  const termId = activeTerm?.id ?? db.terms[0]?.id ?? '';

  const visibleSlots = useMemo(() => {
    return db.lessonSlots.filter((s) => (showEtut ? true : s.category !== 'etut'));
  }, [db.lessonSlots, showEtut]);

  const slotSubjects = useMemo(() => {
    const map = new Map<string, string>();
    const refClassId = selectedClassId || students[0]?.classId || '';
    for (const slot of visibleSlots) {
      const scheduled = getScheduledSubjectForSlot(
        db.schedule,
        termId,
        refClassId,
        dayOfWeek,
        slot.id
      );
      if (scheduled) map.set(slot.id, scheduled.subjectName);
    }
    return map;
  }, [db.schedule, termId, selectedClassId, students, dayOfWeek, visibleSlots]);

  const handleCellClick = useCallback((student: Student, slot: LessonSlot) => {
    setActiveCell({ student, slot });
  }, []);

  const handleMarkSlotPresent = (slot: LessonSlot) => {
    const batch = students
      .filter((s) => !resolveStudentSlotAttendance(lookup, s.id, slot.id).status)
      .map((s) => ({
        date,
        studentId: s.id,
        classId: s.classId,
        lessonSlotId: slot.id,
        status: 'Geldi' as AttendanceStatus,
      }));
    if (batch.length === 0) {
      showToast(`${slot.name} için kayıtsız öğrenci kalmadı.`, 'info');
      return;
    }
    batchUpsertAttendance(batch);
    showToast(`${slot.name} — ${batch.length} öğrenci "Geldi" işaretlendi.`);
  };

  const activeCellState = useMemo(() => {
    if (!activeCell) return null;
    const eff = resolveStudentSlotAttendance(lookup, activeCell.student.id, activeCell.slot.id);
    const slotIdx = db.lessonSlots.findIndex((s) => s.id === activeCell.slot.id);
    const remainingSlots = slotIdx >= 0 ? db.lessonSlots.slice(slotIdx + 1) : [];
    const scheduled = getScheduledSubjectForSlot(
      db.schedule,
      termId,
      activeCell.student.classId,
      dayOfWeek,
      activeCell.slot.id
    );
    return {
      eff,
      remainingSlots,
      subjectLabel: scheduled?.subjectName,
    };
  }, [activeCell, lookup, db.lessonSlots, db.schedule, termId, dayOfWeek]);

  const handleModalSave = (
    status: AttendanceStatus,
    note: string,
    applyToRemaining: boolean
  ) => {
    if (!activeCell || !activeCellState) return;
    if (applyToRemaining && status === 'Kurstan İzinsiz Çıktı') {
      const targetSlots = [activeCell.slot, ...activeCellState.remainingSlots];
      batchUpsertAttendance(
        targetSlots.map((slot) => ({
          date,
          studentId: activeCell.student.id,
          classId: activeCell.student.classId,
          lessonSlotId: slot.id,
          status,
          note: note || undefined,
        }))
      );
      showToast(
        `${activeCell.student.fullName} — ${targetSlots.length} ders saati "Kurstan İzinsiz Çıktı" işaretlendi.`,
        'info'
      );
    } else {
      upsertAttendance({
        date,
        studentId: activeCell.student.id,
        classId: activeCell.student.classId,
        lessonSlotId: activeCell.slot.id,
        status,
        note: note || undefined,
      });
    }
    setActiveCell(null);
  };

  const handleModalClear = () => {
    if (!activeCell) return;
    deleteAttendance(date, activeCell.student.id, activeCell.slot.id);
    setActiveCell(null);
    showToast('Saatlik yoklama kaydı temizlendi.', 'info');
  };

  if (students.length === 0) {
    return (
      <EmptyState
        title="Listelenecek öğrenci bulunamadı"
        description="Seçili filtre kriterlerine uyan aktif öğrenci kaydı yok."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Etüt Toggle + Legend */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">✓</span>
            Geldi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-semibold">YOK</span>
            Gelmedi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white font-semibold">DG</span>
            Derse Girmedi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-semibold">KİÇ</span>
            İzinsiz Çıktı
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-yellow-500 text-slate-950 font-semibold">GEÇ</span>
            Geç
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-sky-600 text-white font-semibold">İZİN</span>
            İzinli
          </span>
          <span className="text-slate-400">· Alınmadı</span>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={showEtut}
            onChange={(e) => setShowEtut(e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-700"
          />
          <span>Etüt Saatlerini Göster</span>
        </label>
      </div>

      {/* Slot Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold text-slate-600">
              <th className="py-3 pl-4 pr-3 sticky left-0 bg-slate-50 z-20 border-r border-slate-200/80 min-w-[190px]">
                Öğrenci
              </th>
              {visibleSlots.map((slot) => {
                const subject = slotSubjects.get(slot.id);
                return (
                  <th
                    key={slot.id}
                    className={`py-2.5 px-2 text-center border-r border-slate-200/60 last:border-r-0 min-w-[96px] ${
                      slot.category === 'etut' ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    <div className="text-slate-900 truncate">{slot.name}</div>
                    <div className="font-mono text-[10px] font-normal text-slate-500 tabular-nums">
                      {slot.startTime}
                    </div>
                    {subject && (
                      <div className="text-[10px] font-medium text-emerald-700 truncate mt-0.5">
                        {subject}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleMarkSlotPresent(slot)}
                      title={`${slot.name} kayıtsızları Geldi işaretle`}
                      className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Tümü ✓
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <MatrixStudentRow
                key={student.id}
                student={student}
                classGroup={classMap.get(student.classId)}
                slots={visibleSlots}
                lookup={lookup}
                onCellClick={handleCellClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      <AttendanceCellModal
        open={Boolean(activeCell)}
        student={activeCell?.student ?? null}
        slot={activeCell?.slot ?? null}
        subjectLabel={activeCellState?.subjectLabel}
        initialStatus={activeCellState?.eff.status ?? null}
        initialNote={activeCellState?.eff.note}
        inheritedFromDaily={Boolean(activeCellState?.eff.inheritedFromDaily)}
        remainingSlotCount={activeCellState?.remainingSlots.length ?? 0}
        onClose={() => setActiveCell(null)}
        onSave={handleModalSave}
        onClear={handleModalClear}
      />
    </div>
  );
};

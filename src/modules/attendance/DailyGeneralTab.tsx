import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { useAppStore } from '../../store/AppStoreContext';
import {
  DAILY_ATTENDANCE_SLOT_ID,
  type AttendanceRecord,
  type AttendanceStatus,
  type ClassGroup,
  type Student,
} from '../../types';
import { ATTENDANCE_STATUS_META, DAILY_STATUS_ORDER } from './attendanceMeta';

interface DailyRowProps {
  student: Student;
  classGroup?: ClassGroup;
  record: AttendanceRecord | null;
  onSelectStatus: (student: Student, status: AttendanceStatus) => void;
  onSaveNote: (student: Student, status: AttendanceStatus, note: string) => void;
}

const DailyStudentRow: React.FC<DailyRowProps> = React.memo(
  ({ student, classGroup, record, onSelectStatus, onSaveNote }) => {
    const [noteDraft, setNoteDraft] = useState(record?.note ?? '');

    useEffect(() => {
      setNoteDraft(record?.note ?? '');
    }, [record?.note]);

    const currentStatus = record?.status ?? null;

    const commitNote = () => {
      const trimmed = noteDraft.trim();
      if (trimmed === (record?.note ?? '')) return;
      onSaveNote(student, currentStatus ?? 'Geldi', trimmed);
    };

    return (
      <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors">
        <td className="py-3 pl-4 pr-3 min-w-[200px]">
          <div className="text-sm font-semibold text-slate-900">{student.fullName}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {classGroup?.name ?? 'Sınıf Yok'}
            {classGroup ? ` · ${classGroup.shiftType}` : ''}
          </div>
        </td>

        <td className="py-2.5 px-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {DAILY_STATUS_ORDER.map((status) => {
              const meta = ATTENDANCE_STATUS_META[status];
              const isSelected = currentStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onSelectStatus(student, status)}
                  className={`min-h-[34px] px-2.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                    isSelected ? meta.buttonActiveClass : meta.buttonIdleClass
                  }`}
                >
                  {meta.shortLabel}
                </button>
              );
            })}
          </div>
        </td>

        <td className="py-2.5 pl-3 pr-4 min-w-[220px]">
          <input
            type="text"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={commitNote}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            placeholder={
              currentStatus === 'İzinli'
                ? 'İzin nedeni (ör. Hastaneye gitti)'
                : currentStatus === 'Geç Geldi'
                  ? 'Gecikme notu...'
                  : 'Açıklama notu...'
            }
            className="w-full min-h-[34px] px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600"
          />
        </td>
      </tr>
    );
  }
);

DailyStudentRow.displayName = 'DailyStudentRow';

interface DailyGeneralTabProps {
  date: string;
  students: Student[];
  classMap: Map<string, ClassGroup>;
  lookup: Map<string, AttendanceRecord>;
}

export const DailyGeneralTab: React.FC<DailyGeneralTabProps> = ({
  date,
  students,
  classMap,
  lookup,
}) => {
  const { upsertAttendance, batchUpsertAttendance, showToast } = useAppStore();

  const summary = useMemo(() => {
    const counts = {
      Geldi: 0,
      Gelmedi: 0,
      'Kurstan İzinsiz Çıktı': 0,
      'Geç Geldi': 0,
      İzinli: 0,
      unrecorded: 0,
    };
    for (const s of students) {
      const rec = lookup.get(`${s.id}|${DAILY_ATTENDANCE_SLOT_ID}`);
      if (!rec) {
        counts.unrecorded += 1;
      } else if (rec.status in counts) {
        counts[rec.status as keyof typeof counts] += 1;
      }
    }
    return counts;
  }, [students, lookup]);

  const handleSelectStatus = useCallback(
    (student: Student, status: AttendanceStatus) => {
      const existing = lookup.get(`${student.id}|${DAILY_ATTENDANCE_SLOT_ID}`);
      upsertAttendance({
        date,
        studentId: student.id,
        classId: student.classId,
        lessonSlotId: DAILY_ATTENDANCE_SLOT_ID,
        status,
        note: existing?.note,
      });
    },
    [date, lookup, upsertAttendance]
  );

  const handleSaveNote = useCallback(
    (student: Student, status: AttendanceStatus, note: string) => {
      upsertAttendance({
        date,
        studentId: student.id,
        classId: student.classId,
        lessonSlotId: DAILY_ATTENDANCE_SLOT_ID,
        status,
        note: note || undefined,
      });
    },
    [date, upsertAttendance]
  );

  const handleMarkAllUnrecordedPresent = () => {
    const batch = students
      .filter((s) => !lookup.get(`${s.id}|${DAILY_ATTENDANCE_SLOT_ID}`))
      .map((s) => ({
        date,
        studentId: s.id,
        classId: s.classId,
        lessonSlotId: DAILY_ATTENDANCE_SLOT_ID,
        status: 'Geldi' as AttendanceStatus,
      }));
    if (batch.length === 0) {
      showToast('Kayıtsız öğrenci kalmadı.', 'info');
      return;
    }
    batchUpsertAttendance(batch);
    showToast(`${batch.length} öğrenci "Geldi" olarak işaretlendi.`);
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
      {/* Compact Summary + Batch Action Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
          <span className="text-emerald-700 font-semibold">Geldi: {summary.Geldi}</span>
          <span className="text-red-700 font-semibold">Gelmedi: {summary.Gelmedi}</span>
          <span className="text-slate-950 font-semibold">
            İzinsiz Çıktı: {summary['Kurstan İzinsiz Çıktı']}
          </span>
          <span className="text-yellow-700 font-semibold">Geç: {summary['Geç Geldi']}</span>
          <span className="text-sky-700 font-semibold">İzinli: {summary.İzinli}</span>
          <span className="text-slate-400">Kayıtsız: {summary.unrecorded}</span>
        </div>

        <button
          type="button"
          onClick={handleMarkAllUnrecordedPresent}
          className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <CheckCheck className="w-4 h-4" />
          Kayıtsız Olanların Tümünü Geldi İşaretle
        </button>
      </div>

      <p className="text-xs text-slate-500 px-1">
        Günlük listede <strong>Gelmedi</strong> veya tam gün <strong>İzinli</strong> işaretlenen
        öğrenciler o günkü ders saatleri matrisine de otomatik olarak yansır.
      </p>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
              <th className="py-3 pl-4 pr-3">Öğrenci & Sınıf</th>
              <th className="py-3 px-3">Günlük Yoklama Durumu</th>
              <th className="py-3 pl-3 pr-4">Açıklama / Neden</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <DailyStudentRow
                key={student.id}
                student={student}
                classGroup={classMap.get(student.classId)}
                record={lookup.get(`${student.id}|${DAILY_ATTENDANCE_SLOT_ID}`) ?? null}
                onSelectStatus={handleSelectStatus}
                onSaveNote={handleSaveNote}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

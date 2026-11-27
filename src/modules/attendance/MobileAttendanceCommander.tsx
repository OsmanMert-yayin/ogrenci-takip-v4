import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCheck, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { useAppStore } from '../../store/AppStoreContext';
import {
  DAILY_ATTENDANCE_SLOT_ID,
  type AttendanceRecord,
  type AttendanceStatus,
  type ClassGroup,
  type Student,
} from '../../types';
import {
  ATTENDANCE_STATUS_META,
  ATTENDANCE_STATUS_ORDER,
  DAILY_STATUS_ORDER,
  getAutoSelectedSlotId,
  getDayOfWeekFromISO,
  getScheduledSubjectForSlot,
  resolveStudentSlotAttendance,
} from './attendanceMeta';

interface MobileStudentCardProps {
  student: Student;
  classGroup?: ClassGroup;
  slotId: string;
  isExpanded: boolean;
  status: AttendanceStatus | null;
  note?: string;
  inheritedFromDaily: boolean;
  remainingSlotCount: number;
  onToggleExpand: (studentId: string) => void;
  onSelectStatus: (
    student: Student,
    status: AttendanceStatus,
    note: string,
    applyRemaining: boolean
  ) => void;
  onClear: (student: Student) => void;
}

const MobileAttendanceCard: React.FC<MobileStudentCardProps> = React.memo(
  ({
    student,
    classGroup,
    slotId,
    isExpanded,
    status,
    note,
    inheritedFromDaily,
    remainingSlotCount,
    onToggleExpand,
    onSelectStatus,
    onClear,
  }) => {
    const [noteDraft, setNoteDraft] = useState(note ?? '');
    const [applyRemaining, setApplyRemaining] = useState(true);

    useEffect(() => {
      setNoteDraft(note ?? '');
    }, [note]);

    const isDailyMode = slotId === DAILY_ATTENDANCE_SLOT_ID;
    const statusButtons = isDailyMode ? DAILY_STATUS_ORDER : ATTENDANCE_STATUS_ORDER;

    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => onToggleExpand(student.id)}
          className="w-full min-h-[58px] px-4 py-3 flex items-center justify-between gap-3 text-left active:bg-slate-50"
        >
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{student.fullName}</div>
            <div className="text-xs text-slate-500 truncate mt-0.5">
              {classGroup?.name ?? 'Sınıf Yok'}
              {note ? ` · ${note}` : ''}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {status ? (
              <span
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                  ATTENDANCE_STATUS_META[status].cellBadgeClass
                }`}
              >
                {status === 'Geldi' ? 'Geldi' : ATTENDANCE_STATUS_META[status].shortLabel}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Kayıtsız</span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-100 bg-slate-50/70 space-y-3">
            {inheritedFromDaily && (
              <div className="text-[11px] text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1.5">
                Günlük listeden yansıdı — bu derse özel durum seçebilirsiniz.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {statusButtons.map((st) => {
                const meta = ATTENDANCE_STATUS_META[st];
                const active = status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() =>
                      onSelectStatus(
                        student,
                        st,
                        noteDraft.trim(),
                        !isDailyMode && st === 'Kurstan İzinsiz Çıktı' && applyRemaining
                      )
                    }
                    className={`min-h-[46px] px-3 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-colors ${
                      active ? meta.buttonActiveClass : meta.buttonIdleClass
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        active ? 'bg-white/90' : meta.dotColorClass
                      }`}
                    />
                    <span className="truncate">{meta.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {!isDailyMode && remainingSlotCount > 0 && (
              <label className="flex items-center gap-2 text-xs text-slate-700 px-1">
                <input
                  type="checkbox"
                  checked={applyRemaining}
                  onChange={(e) => setApplyRemaining(e.target.checked)}
                  className="w-4 h-4 rounded accent-slate-900"
                />
                <span>İzinsiz Çıktı seçilirse kalan {remainingSlotCount} derse de uygula</span>
              </label>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={() => {
                  if (status && noteDraft.trim() !== (note ?? '')) {
                    onSelectStatus(student, status, noteDraft.trim(), false);
                  }
                }}
                placeholder="Hızlı not (ör. Hastaneye gitti, 10 dk geç)..."
                className="flex-1 min-h-[42px] px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              {status && !inheritedFromDaily && (
                <button
                  type="button"
                  onClick={() => onClear(student)}
                  aria-label="Kaydı temizle"
                  className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

MobileAttendanceCard.displayName = 'MobileAttendanceCard';

interface MobileAttendanceCommanderProps {
  date: string;
  onDateChange: (date: string) => void;
  selectedClassId: string;
  onClassChange: (classId: string) => void;
  students: Student[];
  classMap: Map<string, ClassGroup>;
  lookup: Map<string, AttendanceRecord>;
}

export const MobileAttendanceCommander: React.FC<MobileAttendanceCommanderProps> = ({
  date,
  onDateChange,
  selectedClassId,
  onClassChange,
  students,
  classMap,
  lookup,
}) => {
  const { db, activeTerm, upsertAttendance, batchUpsertAttendance, deleteAttendance, showToast } =
    useAppStore();
  const [selectedSlotId, setSelectedSlotId] = useState<string>(() =>
    getAutoSelectedSlotId(db.lessonSlots)
  );
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const dayOfWeek = useMemo(() => getDayOfWeekFromISO(date), [date]);
  const termId = activeTerm?.id ?? db.terms[0]?.id ?? '';

  const slotIndex = useMemo(
    () => db.lessonSlots.findIndex((s) => s.id === selectedSlotId),
    [db.lessonSlots, selectedSlotId]
  );

  const remainingSlots = useMemo(
    () => (slotIndex >= 0 ? db.lessonSlots.slice(slotIndex + 1) : []),
    [db.lessonSlots, slotIndex]
  );

  const handleToggleExpand = useCallback((studentId: string) => {
    setExpandedStudentId((cur) => (cur === studentId ? null : studentId));
  }, []);

  const handleSelectStatus = useCallback(
    (student: Student, status: AttendanceStatus, note: string, applyRemaining: boolean) => {
      if (applyRemaining && selectedSlotId !== DAILY_ATTENDANCE_SLOT_ID && status === 'Kurstan İzinsiz Çıktı') {
        const currentSlot = db.lessonSlots[slotIndex];
        const targets = currentSlot ? [currentSlot, ...remainingSlots] : [];
        batchUpsertAttendance(
          targets.map((slot) => ({
            date,
            studentId: student.id,
            classId: student.classId,
            lessonSlotId: slot.id,
            status,
            note: note || undefined,
          }))
        );
        showToast(`${student.fullName} — ${targets.length} ders saatine KİÇ işlendi.`, 'info');
      } else {
        upsertAttendance({
          date,
          studentId: student.id,
          classId: student.classId,
          lessonSlotId: selectedSlotId,
          status,
          note: note || undefined,
        });
      }
      setExpandedStudentId(null);
    },
    [
      date,
      selectedSlotId,
      db.lessonSlots,
      slotIndex,
      remainingSlots,
      upsertAttendance,
      batchUpsertAttendance,
      showToast,
    ]
  );

  const handleClear = useCallback(
    (student: Student) => {
      deleteAttendance(date, student.id, selectedSlotId);
      setExpandedStudentId(null);
    },
    [date, selectedSlotId, deleteAttendance]
  );

  const handleMarkUnrecordedPresent = () => {
    const batch = students
      .filter((s) => !resolveStudentSlotAttendance(lookup, s.id, selectedSlotId).status)
      .map((s) => ({
        date,
        studentId: s.id,
        classId: s.classId,
        lessonSlotId: selectedSlotId,
        status: 'Geldi' as AttendanceStatus,
      }));
    if (batch.length === 0) {
      showToast('Kayıtsız öğrenci kalmadı.', 'info');
      return;
    }
    batchUpsertAttendance(batch);
    showToast(`${batch.length} öğrenci "Geldi" işaretlendi.`);
  };

  const quickSummary = useMemo(() => {
    let absentOrAlert = 0;
    let present = 0;
    for (const s of students) {
      const st = resolveStudentSlotAttendance(lookup, s.id, selectedSlotId).status;
      if (st === 'Geldi') present += 1;
      else if (st) absentOrAlert += 1;
    }
    return { present, absentOrAlert, unrecorded: students.length - present - absentOrAlert };
  }, [students, lookup, selectedSlotId]);

  return (
    <div className="space-y-3.5">
      {/* Top Date + Class Selector */}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          aria-label="Yoklama tarihi"
          className="min-h-[44px] px-3 text-xs font-medium tabular-nums bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
        />
        <select
          value={selectedClassId}
          onChange={(e) => onClassChange(e.target.value)}
          aria-label="Sınıf seçimi"
          className="min-h-[44px] px-3 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
        >
          <option value="">Tüm Sınıflar</option>
          {db.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Horizontal Scrollable Slot Picker */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setSelectedSlotId(DAILY_ATTENDANCE_SLOT_ID)}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-left shrink-0 transition-colors ${
            selectedSlotId === DAILY_ATTENDANCE_SLOT_ID
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-slate-700 border-slate-200'
          }`}
        >
          <div className="text-xs font-semibold whitespace-nowrap">Genel Günlük</div>
          <div
            className={`text-[10px] whitespace-nowrap ${
              selectedSlotId === DAILY_ATTENDANCE_SLOT_ID ? 'text-emerald-100' : 'text-slate-400'
            }`}
          >
            Tam Gün
          </div>
        </button>

        {db.lessonSlots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          const scheduled = getScheduledSubjectForSlot(
            db.schedule,
            termId,
            selectedClassId || students[0]?.classId || '',
            dayOfWeek,
            slot.id
          );
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelectedSlotId(slot.id)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-left shrink-0 transition-colors ${
                isSelected
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <div className="text-xs font-semibold whitespace-nowrap">
                {slot.name}
                {scheduled ? ` (${scheduled.subjectName})` : ''}
              </div>
              <div
                className={`text-[10px] font-mono tabular-nums whitespace-nowrap ${
                  isSelected ? 'text-emerald-100' : 'text-slate-400'
                }`}
              >
                {slot.startTime}–{slot.endTime}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Action + Live Counts */}
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="text-xs text-slate-600 tabular-nums">
          <strong className="text-emerald-700">{quickSummary.present}</strong> geldi ·{' '}
          <strong className="text-red-700">{quickSummary.absentOrAlert}</strong> uyarı ·{' '}
          <span className="text-slate-400">{quickSummary.unrecorded} kayıtsız</span>
        </div>
        <button
          type="button"
          onClick={handleMarkUnrecordedPresent}
          className="inline-flex items-center gap-1 min-h-[36px] px-3 text-xs font-semibold text-white bg-emerald-700 rounded-lg whitespace-nowrap shrink-0"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Kalanı Geldi Yap
        </button>
      </div>

      {/* Student Cards */}
      {students.length === 0 ? (
        <EmptyState
          title="Öğrenci bulunamadı"
          description="Seçili sınıfta aktif öğrenci kaydı bulunmuyor."
        />
      ) : (
        <div className="space-y-2.5">
          {students.map((student) => {
            const eff = resolveStudentSlotAttendance(lookup, student.id, selectedSlotId);
            return (
              <MobileAttendanceCard
                key={student.id}
                student={student}
                classGroup={classMap.get(student.classId)}
                slotId={selectedSlotId}
                isExpanded={expandedStudentId === student.id}
                status={eff.status}
                note={eff.note}
                inheritedFromDaily={eff.inheritedFromDaily}
                remainingSlotCount={remainingSlots.length}
                onToggleExpand={handleToggleExpand}
                onSelectStatus={handleSelectStatus}
                onClear={handleClear}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

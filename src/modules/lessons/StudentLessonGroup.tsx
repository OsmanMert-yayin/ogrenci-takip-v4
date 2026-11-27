import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type {
  AttendanceRecord,
  AttendanceStatus,
  LessonRecord,
  LessonSlot,
  ScheduleEntry,
  Student,
  TopicPoolItem,
} from '../../types';
import {
  inferLessonSubject,
  resolveDailySubjectsForClass,
  resolveRowAttendanceForSubject,
  resolveStudentCardAttendance,
  type DailySubjectTemplate,
  type RowAttendanceInfo,
} from '../../utils/lessonScheduleResolver';
import type { StudentFridayEvaluation } from '../../utils/fridayLeaveEngine';
import { InlineLessonRow } from './InlineLessonRow';
import type { PendingLessonRequest } from './LessonConfirmModals';

interface StudentLessonGroupProps {
  student: Student;
  classNameLabel: string;
  date: string;
  activeTermId: string;
  schedule: ScheduleEntry[];
  lessonSlots: LessonSlot[];
  dayStudentLessons: LessonRecord[];
  allLessons: LessonRecord[];
  topicPool: TopicPoolItem[];
  attendanceLookup: Map<string, AttendanceRecord>;
  fridayEval?: StudentFridayEvaluation;
  onOpenFridayLeave?: () => void;
  onRequestSave: (request: PendingLessonRequest) => void;
  onDeleteSaved: (lessonId: string) => void;
}

interface ExtraDraftItem {
  key: string;
  subjectName: string;
}

interface ResolvedDisplayRow {
  rowKey: string;
  subjectName: string;
  defaultTopic?: string;
  lessonSlotId?: string;
  existingRecord?: LessonRecord;
  isExtraDraft?: boolean;
  extraDraftKey?: string;
  rowAttendance: RowAttendanceInfo;
}

function renderCardAttendanceBadge(status: AttendanceStatus) {
  if (status === 'Kurstan İzinsiz Çıktı') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-900 text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        Kurstan İzinsiz Çıktı
      </span>
    );
  }
  if (status === 'Gelmedi') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-600 text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-red-100" />
        Gelmedi
      </span>
    );
  }
  if (status === 'İzinli') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-600 text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-100" />
        İzinli
      </span>
    );
  }
  return null;
}

export const StudentLessonGroup: React.FC<StudentLessonGroupProps> = React.memo(
  ({
    student,
    classNameLabel,
    date,
    activeTermId,
    schedule,
    lessonSlots,
    dayStudentLessons,
    allLessons,
    topicPool,
    attendanceLookup,
    fridayEval,
    onOpenFridayLeave,
    onRequestSave,
    onDeleteSaved,
  }) => {
    const [extraDrafts, setExtraDrafts] = useState<ExtraDraftItem[]>([]);

    const dailyTemplates: DailySubjectTemplate[] = useMemo(
      () =>
        resolveDailySubjectsForClass(
          schedule,
          lessonSlots,
          activeTermId,
          student.classId,
          date
        ),
      [schedule, lessonSlots, activeTermId, student.classId, date]
    );

    const cardAttendance = useMemo(
      () => resolveStudentCardAttendance(attendanceLookup, student.id),
      [attendanceLookup, student.id]
    );

    const rows: ResolvedDisplayRow[] = useMemo(() => {
      const result: ResolvedDisplayRow[] = [];
      const usedLessonIds = new Set<string>();

      // 1. Pair each scheduled daily template with the first matching saved record (or neutral draft)
      dailyTemplates.forEach((tpl, idx) => {
        const normTpl = tpl.subjectName.toLocaleLowerCase('tr-TR');
        const matched = dayStudentLessons.find(
          (l) =>
            !usedLessonIds.has(l.id) &&
            inferLessonSubject(l).toLocaleLowerCase('tr-TR') === normTpl
        );
        if (matched) usedLessonIds.add(matched.id);

        const rowAtt = resolveRowAttendanceForSubject(
          attendanceLookup,
          student.id,
          tpl.slotIds
        );

        result.push({
          rowKey: matched ? matched.id : `tpl_${student.id}_${date}_${idx}_${tpl.subjectName}`,
          subjectName: tpl.subjectName,
          defaultTopic: tpl.defaultTopic,
          lessonSlotId: tpl.firstSlotId,
          existingRecord: matched,
          rowAttendance: rowAtt,
        });
      });

      // 2. Preserve any additional saved lessons entered on this date (extra rows, combined sessions, etc.)
      for (const lesson of dayStudentLessons) {
        if (usedLessonIds.has(lesson.id)) continue;
        const subj = inferLessonSubject(lesson);
        const matchedTpl = dailyTemplates.find(
          (t) => t.subjectName.toLocaleLowerCase('tr-TR') === subj.toLocaleLowerCase('tr-TR')
        );
        const rowAtt = resolveRowAttendanceForSubject(
          attendanceLookup,
          student.id,
          matchedTpl?.slotIds ?? (lesson.lessonSlotId ? [lesson.lessonSlotId] : [])
        );

        result.push({
          rowKey: lesson.id,
          subjectName: subj,
          lessonSlotId: lesson.lessonSlotId,
          existingRecord: lesson,
          rowAttendance: rowAtt,
        });
      }

      // 3. Append user-added extra blank draft rows
      for (const draft of extraDrafts) {
        result.push({
          rowKey: draft.key,
          subjectName: draft.subjectName,
          isExtraDraft: true,
          extraDraftKey: draft.key,
          rowAttendance: cardAttendance.cardDimmed
            ? { rowDimmed: true, rowBadgeStatus: cardAttendance.cardStatus }
            : { rowDimmed: false, rowBadgeStatus: null },
        });
      }

      return result;
    }, [dailyTemplates, dayStudentLessons, extraDrafts, attendanceLookup, student.id, date, cardAttendance]);

    const handleAddExtraRow = () => {
      setExtraDrafts((prev) => [
        ...prev,
        {
          key: `extra_${student.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          subjectName: student.programType === 'Hafızlık' ? 'Hafızlık' : 'Ezber',
        },
      ]);
    };

    const handleRemoveExtraDraft = (draftKey: string) => {
      setExtraDrafts((prev) => prev.filter((item) => item.key !== draftKey));
    };

    const studentCellNode = (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 leading-snug truncate">
              {student.fullName}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {classNameLabel}
              {student.studentNo ? ` • #${student.studentNo}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddExtraRow}
            title="Bu öğrenciye ek ders satırı ekle"
            aria-label={`${student.fullName} için ek ders satırı ekle`}
            className="w-6 h-6 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {cardAttendance.cardDimmed && cardAttendance.cardStatus && (
            <div>{renderCardAttendanceBadge(cardAttendance.cardStatus)}</div>
          )}
          {fridayEval && (
            <button
              type="button"
              onClick={onOpenFridayLeave}
              title={
                fridayEval.blockers.length > 0
                  ? fridayEval.blockers.map((b) => b.label).join(' • ')
                  : 'Cuma İzni detayına git'
              }
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border tabular-nums transition-colors cursor-pointer ${
                fridayEval.compactBadgeTone === 'emerald'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : fridayEval.compactBadgeTone === 'sky'
                    ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                    : fridayEval.compactBadgeTone === 'amber'
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
              }`}
            >
              {fridayEval.compactBadgeLabel}
            </button>
          )}
        </div>
      </div>
    );

    // STRICT PROGRAM RULE: 'Hafızlık Devam' ONLY when student.programType === 'Hafızlık'.
    // 'Yüzüne & Ezber' students ALWAYS show Yüzüne X • Ezber Y.
    const levelCellNode =
      student.programType === 'Hafızlık' ? (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center self-start px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[11px] font-semibold">
            Hafızlık Devam
          </span>
          <span className="text-[11px] text-slate-600 leading-snug">
            {student.levels.ezber || student.levels.yuzune || 'Hafızlık Programı'}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 text-[11px] leading-snug">
          <div className="text-slate-700">
            <span className="font-semibold text-slate-900">Yüzüne:</span>{' '}
            {student.levels.yuzune || '—'}
          </div>
          <div className="text-slate-600">
            <span className="font-semibold text-slate-800">Ezber:</span>{' '}
            {student.levels.ezber || '—'}
          </div>
        </div>
      );

    return (
      <tbody className="border-b-2 border-slate-200/80 last:border-b-0">
        {rows.map((row, idx) => (
          <InlineLessonRow
            key={row.rowKey}
            student={student}
            date={date}
            initialSubjectName={row.subjectName}
            defaultTopic={row.defaultTopic}
            lessonSlotId={row.lessonSlotId}
            existingRecord={row.existingRecord}
            isExtraDraft={row.isExtraDraft}
            allLessons={allLessons}
            topicPool={topicPool}
            rowAttendance={row.rowAttendance}
            cardDimmed={cardAttendance.cardDimmed}
            isFirstRowOfStudent={idx === 0}
            studentRowSpan={rows.length}
            studentCellNode={idx === 0 ? studentCellNode : undefined}
            levelCellNode={idx === 0 ? levelCellNode : undefined}
            onRequestSave={(req) => {
              onRequestSave({
                ...req,
                onCommitted: () => {
                  req.onCommitted?.();
                  if (row.extraDraftKey) {
                    handleRemoveExtraDraft(row.extraDraftKey);
                  }
                },
              });
            }}
            onDeleteSaved={onDeleteSaved}
            onRemoveExtraDraft={
              row.extraDraftKey
                ? () => handleRemoveExtraDraft(row.extraDraftKey!)
                : undefined
            }
          />
        ))}
      </tbody>
    );
  }
);

StudentLessonGroup.displayName = 'StudentLessonGroup';

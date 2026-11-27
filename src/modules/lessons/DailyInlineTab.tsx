import React, { useCallback, useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { useAppStore } from '../../store/AppStoreContext';
import type { LessonRecord, Student } from '../../types';
import type { LessonUpsertInput } from '../../store/academicMutations';
import {
  findExactDuplicateLesson,
  findPendingMakeupCandidate,
  type DuplicateMatchInfo,
  type MakeupCandidateInfo,
} from '../../utils/duplicateAndMakeupEngine';
import {
  countDistinctLessonSessions,
  inferLessonStatus,
} from '../../utils/lessonScheduleResolver';
import type { StudentFridayEvaluation } from '../../utils/fridayLeaveEngine';
import { buildAttendanceLookup } from '../attendance/attendanceMeta';
import {
  DuplicateConfirmModal,
  MakeupConfirmModal,
  type PendingLessonRequest,
} from './LessonConfirmModals';
import { StudentLessonGroup } from './StudentLessonGroup';
import { BulkLessonModal } from './BulkLessonModal';

interface DailyInlineTabProps {
  date: string;
  students: Student[];
  classMap: Map<string, string>;
  fridayEvaluations?: Map<string, StudentFridayEvaluation>;
  onOpenFridayLeave?: () => void;
  onNotify: (message: string) => void;
}

export const DailyInlineTab: React.FC<DailyInlineTabProps> = ({
  date,
  students,
  classMap,
  fridayEvaluations,
  onOpenFridayLeave,
  onNotify,
}) => {
  const { db, activeTerm, upsertLesson, batchUpsertLessons, deleteLesson } = useAppStore();
  const [bulkOpen, setBulkOpen] = useState(false);

  // Pending confirmation states for Makeup (Telafi) and Duplicate (Mükerrer)
  const [makeupPrompt, setMakeupPrompt] = useState<{
    req: PendingLessonRequest;
    candidate: MakeupCandidateInfo;
  } | null>(null);

  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    req: PendingLessonRequest;
    match: DuplicateMatchInfo;
  } | null>(null);

  const attendanceLookup = useMemo(
    () => buildAttendanceLookup(db.attendance, date),
    [db.attendance, date]
  );

  const lessonsByStudentForDate = useMemo(() => {
    const map = new Map<string, LessonRecord[]>();
    for (const l of db.lessons) {
      if (l.date !== date) continue;
      const list = map.get(l.studentId);
      if (list) list.push(l);
      else map.set(l.studentId, [l]);
    }
    return map;
  }, [db.lessons, date]);

  const dayStats = useMemo(() => {
    const visibleIds = new Set(students.map((s) => s.id));
    const dayLessons = db.lessons.filter((l) => l.date === date && visibleIds.has(l.studentId));
    let gecti = 0;
    let tekrar = 0;
    let vermedi = 0;
    for (const l of dayLessons) {
      const st = inferLessonStatus(l);
      if (st === 'Geçti') gecti += 1;
      else if (st === 'Tekrar') tekrar += 1;
      else vermedi += 1;
    }
    return {
      sessions: countDistinctLessonSessions(dayLessons),
      gecti,
      tekrar,
      vermedi,
    };
  }, [db.lessons, date, students]);

  const commitSave = useCallback(
    (req: PendingLessonRequest, extraPatch?: Partial<LessonUpsertInput>) => {
      upsertLesson({ ...req.input, ...extraPatch });
      req.onCommitted?.();
    },
    [upsertLesson]
  );

  const checkDuplicateOrCommit = useCallback(
    (req: PendingLessonRequest) => {
      const dup = findExactDuplicateLesson(
        db.lessons,
        req.input.studentId,
        req.input.pageOrVerse,
        req.input.id,
        req.input.makeupOfId
      );
      if (dup) {
        setDuplicatePrompt({ req, match: dup });
        return;
      }
      commitSave(req);
    },
    [db.lessons, commitSave]
  );

  const handleRequestSave = useCallback(
    (req: PendingLessonRequest) => {
      // 1. If saving as Geçti without an existing makeup link, check unresolved Vermedi/Tekrar
      if (req.input.status === 'Geçti' && !req.input.makeupOfId) {
        const candidate = findPendingMakeupCandidate(
          db.lessons,
          req.input.studentId,
          req.input.subjectName || 'Ezber',
          req.input.pageOrVerse,
          req.input.topicTitle,
          req.input.id
        );
        if (candidate) {
          setMakeupPrompt({ req, candidate });
          return;
        }
      }
      // 2. Otherwise check exact duplicate on Page/Sure
      checkDuplicateOrCommit(req);
    },
    [db.lessons, checkDuplicateOrCommit]
  );

  const handleDeleteSaved = useCallback(
    (lessonId: string) => {
      deleteLesson(lessonId);
      onNotify('Ders kaydı silindi.');
    },
    [deleteLesson, onNotify]
  );

  const handleBatchCommit = useCallback(
    (inputs: LessonUpsertInput[], summaryMessage: string) => {
      batchUpsertLessons(inputs);
      onNotify(summaryMessage);
    },
    [batchUpsertLessons, onNotify]
  );

  return (
    <div className="space-y-3.5">
      {/* Compact stats + Bulk Entry Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-xl px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Dinlenen Oturum:</span>
            <span className="font-bold text-slate-900 tabular-nums text-sm">
              {dayStats.sessions}
            </span>
          </div>
          <span className="text-slate-200">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-slate-600">Geçti:</span>
            <span className="font-semibold text-emerald-700 tabular-nums">{dayStats.gecti}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-600">Tekrar:</span>
            <span className="font-semibold text-amber-700 tabular-nums">{dayStats.tekrar}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span className="text-slate-600">Vermedi:</span>
            <span className="font-semibold text-red-700 tabular-nums">{dayStats.vermedi}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="min-h-[38px] px-3.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Layers className="w-4 h-4" />
          <span>+ Toplu Ders Girişi</span>
        </button>
      </div>

      {/* Inline Daily Table */}
      {students.length === 0 ? (
        <EmptyState
          title="Listelenecek öğrenci bulunamadı"
          description="Filtreleri değiştirerek veya yeni öğrenci ekleyerek günlük ders takibine başlayabilirsiniz."
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1060px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-3 py-2.5 border-r border-slate-200/70">Öğrenci</th>
                  <th className="px-2.5 py-2.5 border-r border-slate-200/70">Seviye</th>
                  <th className="px-2 py-2.5">Ders</th>
                  <th className="px-2 py-2.5">Konu</th>
                  <th className="px-2 py-2.5">Sayfa / Sure</th>
                  <th className="px-2 py-2.5">Miktar</th>
                  <th className="px-2 py-2.5">Tur</th>
                  <th className="px-2 py-2.5 text-center">Puan</th>
                  <th className="px-2 py-2.5">Durumu</th>
                  <th className="px-2 py-2.5 text-right">Saat &amp; İşlem</th>
                </tr>
              </thead>
              {students.map((student) => (
                <StudentLessonGroup
                  key={student.id}
                  student={student}
                  classNameLabel={classMap.get(student.classId) ?? 'Sınıfsız'}
                  date={date}
                  activeTermId={activeTerm?.id ?? ''}
                  schedule={db.schedule}
                  lessonSlots={db.lessonSlots}
                  dayStudentLessons={lessonsByStudentForDate.get(student.id) ?? []}
                  allLessons={db.lessons}
                  topicPool={db.topicPool}
                  attendanceLookup={attendanceLookup}
                  fridayEval={fridayEvaluations?.get(student.id)}
                  onOpenFridayLeave={onOpenFridayLeave}
                  onRequestSave={handleRequestSave}
                  onDeleteSaved={handleDeleteSaved}
                />
              ))}
            </table>
          </div>
        </div>
      )}

      {/* Bulk Multi-Topic Entry Modal */}
      <BulkLessonModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        date={date}
        students={students}
        classMap={classMap}
        topicPool={db.topicPool}
        attendanceLookup={attendanceLookup}
        onCommitBatch={handleBatchCommit}
      />

      {/* Makeup (Telafi) Confirmation Modal */}
      <MakeupConfirmModal
        open={Boolean(makeupPrompt)}
        studentName={makeupPrompt?.req.studentName ?? ''}
        candidate={makeupPrompt?.candidate ?? null}
        onCancel={() => setMakeupPrompt(null)}
        onSaveAsMakeup={() => {
          if (!makeupPrompt) return;
          const { req, candidate } = makeupPrompt;
          setMakeupPrompt(null);
          commitSave(req, { makeupOfId: candidate.record.id });
          onNotify(`${req.studentName} için ders telafi olarak bağlandı.`);
        }}
        onSaveNormal={() => {
          if (!makeupPrompt) return;
          const { req } = makeupPrompt;
          setMakeupPrompt(null);
          checkDuplicateOrCommit(req);
        }}
      />

      {/* Duplicate Confirmation Modal */}
      <DuplicateConfirmModal
        open={Boolean(duplicatePrompt)}
        studentName={duplicatePrompt?.req.studentName ?? ''}
        pageOrSure={duplicatePrompt?.req.input.pageOrVerse ?? ''}
        match={duplicatePrompt?.match ?? null}
        onCancel={() => setDuplicatePrompt(null)}
        onConfirm={() => {
          if (!duplicatePrompt) return;
          const { req } = duplicatePrompt;
          setDuplicatePrompt(null);
          commitSave(req);
          onNotify(`${req.studentName} için ders kaydedildi.`);
        }}
      />
    </div>
  );
};

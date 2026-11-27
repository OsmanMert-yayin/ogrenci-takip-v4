import React, { useCallback, useMemo, useState } from 'react';
import { ChevronRight, Layers, Search, X } from 'lucide-react';
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
  getSubjectShortCode,
  inferLessonStatus,
  inferLessonSubject,
  resolveDailySubjectsForClass,
  resolveStudentCardAttendance,
} from '../../utils/lessonScheduleResolver';
import type { StudentFridayEvaluation } from '../../utils/fridayLeaveEngine';
import { buildAttendanceLookup } from '../attendance/attendanceMeta';
import {
  DuplicateConfirmModal,
  MakeupConfirmModal,
  type PendingLessonRequest,
} from './LessonConfirmModals';
import { MobileLessonBottomSheet } from './MobileLessonBottomSheet';
import { MobileBulkLessonDrawer } from './MobileBulkLessonDrawer';

interface MobileLessonCommanderProps {
  date: string;
  onChangeDate: (next: string) => void;
  fridayEvaluations?: Map<string, StudentFridayEvaluation>;
  onOpenFridayLeave?: () => void;
  onNotify: (msg: string) => void;
}

export const MobileLessonCommander: React.FC<MobileLessonCommanderProps> = ({
  date,
  onChangeDate,
  fridayEvaluations,
  onOpenFridayLeave,
  onNotify,
}) => {
  const { db, activeTerm, upsertLesson, batchUpsertLessons, deleteLesson } = useAppStore();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [makeupPrompt, setMakeupPrompt] = useState<{
    req: PendingLessonRequest;
    candidate: MakeupCandidateInfo;
  } | null>(null);

  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    req: PendingLessonRequest;
    match: DuplicateMatchInfo;
  } | null>(null);

  const classMap = useMemo(
    () => new Map(db.classes.map((c) => [c.id, c.name])),
    [db.classes]
  );

  const attendanceLookup = useMemo(
    () => buildAttendanceLookup(db.attendance, date),
    [db.attendance, date]
  );

  const dayLessonsByStudent = useMemo(() => {
    const map = new Map<string, LessonRecord[]>();
    for (const l of db.lessons) {
      if (l.date !== date) continue;
      const arr = map.get(l.studentId);
      if (arr) arr.push(l);
      else map.set(l.studentId, [l]);
    }
    return map;
  }, [db.lessons, date]);

  // Filter active students and sort absent/excused/KİÇ students to the bottom
  const sortedStudents = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    const filtered = db.students.filter((s) => {
      if (s.status !== 'Aktif') return false;
      if (selectedClassId && s.classId !== selectedClassId) return false;
      if (q && !s.fullName.toLocaleLowerCase('tr-TR').includes(q)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const attA = resolveStudentCardAttendance(attendanceLookup, a.id).cardDimmed ? 1 : 0;
      const attB = resolveStudentCardAttendance(attendanceLookup, b.id).cardDimmed ? 1 : 0;
      if (attA !== attB) return attA - attB;
      return a.fullName.localeCompare(b.fullName, 'tr-TR');
    });
  }, [db.students, selectedClassId, searchQuery, attendanceLookup]);

  const activeStudent: Student | null = useMemo(
    () => db.students.find((s) => s.id === activeStudentId) ?? null,
    [db.students, activeStudentId]
  );

  const commitSave = useCallback(
    (req: PendingLessonRequest, extraPatch?: Partial<LessonUpsertInput>) => {
      upsertLesson({ ...req.input, ...extraPatch });
      req.onCommitted?.();
      onNotify(`${req.studentName} için ders kaydedildi.`);
    },
    [upsertLesson, onNotify]
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

  return (
    <div className="space-y-3 pb-4">
      {/* Top Commander Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 space-y-2.5 shadow-2xs">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && onChangeDate(e.target.value)}
            aria-label="İşlem Günü"
            className="min-h-[42px] px-2.5 text-xs font-semibold tabular-nums bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600"
          />
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            aria-label="Sınıf veya Grup"
            className="flex-1 min-h-[42px] px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600"
          >
            <option value="">Tüm Sınıflar</option>
            {db.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hızlı öğrenci ara..."
              className="w-full min-h-[42px] pl-9 pr-8 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Temizle"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="min-h-[42px] px-3 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            <Layers className="w-4 h-4" />
            <span>+ Toplu</span>
          </button>
        </div>
      </div>

      {/* Student Cards */}
      {sortedStudents.length === 0 ? (
        <EmptyState
          title="Öğrenci bulunamadı"
          description="Sınıf seçimini veya arama metnini değiştirerek öğrenci listesini görüntüleyin."
        />
      ) : (
        <div className="space-y-2">
          {sortedStudents.map((student) => {
            const cardAtt = resolveStudentCardAttendance(attendanceLookup, student.id);
            const dayLessons = dayLessonsByStudent.get(student.id) ?? [];
            const templates = resolveDailySubjectsForClass(
              db.schedule,
              db.lessonSlots,
              activeTerm?.id ?? '',
              student.classId,
              date
            );

            return (
              <button
                key={student.id}
                type="button"
                onClick={() => setActiveStudentId(student.id)}
                className={`w-full text-left rounded-2xl border p-3.5 transition-all active:scale-[0.99] cursor-pointer ${
                  cardAtt.cardDimmed
                    ? 'bg-slate-50/90 border-slate-200 opacity-55'
                    : 'bg-white border-slate-200/90 shadow-2xs hover:border-emerald-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[15px] font-bold text-slate-900 truncate">
                        {student.fullName}
                      </span>
                      {cardAtt.cardDimmed && cardAtt.cardStatus && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            cardAtt.cardStatus === 'Kurstan İzinsiz Çıktı'
                              ? 'bg-slate-900 text-white'
                              : cardAtt.cardStatus === 'Gelmedi'
                                ? 'bg-red-600 text-white'
                                : 'bg-sky-600 text-white'
                          }`}
                        >
                          {cardAtt.cardStatus}
                        </span>
                      )}
                      {(() => {
                        const fri = fridayEvaluations?.get(student.id);
                        if (!fri) return null;
                        return (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenFridayLeave?.();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                onOpenFridayLeave?.();
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border tabular-nums ${
                              fri.compactBadgeTone === 'emerald'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : fri.compactBadgeTone === 'sky'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : fri.compactBadgeTone === 'amber'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-red-50 text-red-700 border-red-300'
                            }`}
                          >
                            {fri.compactBadgeLabel}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span>{classMap.get(student.classId) ?? 'Sınıfsız'}</span>
                      <span>•</span>
                      {student.programType === 'Hafızlık' ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-semibold">
                          Hafızlık Devam
                        </span>
                      ) : (
                        <span className="truncate">
                          Yüzüne: {student.levels.yuzune || '—'} • Ezber:{' '}
                          {student.levels.ezber || '—'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                </div>

                {/* Today's Mini Subject Status Boxes */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {templates.map((tpl, idx) => {
                    const norm = tpl.subjectName.toLocaleLowerCase('tr-TR');
                    const matched = dayLessons.find(
                      (l) => inferLessonSubject(l).toLocaleLowerCase('tr-TR') === norm
                    );
                    const st = matched ? inferLessonStatus(matched) : null;
                    const code = getSubjectShortCode(tpl.subjectName);

                    const pillStyle =
                      st === 'Geçti'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : st === 'Tekrar'
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : st === 'Vermedi'
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-slate-50 border-slate-200 text-slate-500';

                    const dotStyle =
                      st === 'Geçti'
                        ? 'bg-emerald-600'
                        : st === 'Tekrar'
                          ? 'bg-amber-500'
                          : st === 'Vermedi'
                            ? 'bg-red-600'
                            : 'bg-slate-300';

                    return (
                      <span
                        key={`${tpl.subjectName}_${idx}`}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold tabular-nums ${pillStyle}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${dotStyle}`} />
                        <span>{code}</span>
                        {matched && typeof matched.score === 'number' && (
                          <span className="text-[10px] opacity-80">{matched.score}p</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Student Bottom Sheet */}
      <MobileLessonBottomSheet
        open={Boolean(activeStudent)}
        onClose={() => setActiveStudentId(null)}
        student={activeStudent}
        classNameLabel={activeStudent ? classMap.get(activeStudent.classId) ?? 'Sınıfsız' : ''}
        date={date}
        activeTermId={activeTerm?.id ?? ''}
        schedule={db.schedule}
        lessonSlots={db.lessonSlots}
        dayStudentLessons={activeStudent ? dayLessonsByStudent.get(activeStudent.id) ?? [] : []}
        allLessons={db.lessons}
        topicPool={db.topicPool}
        attendanceLookup={attendanceLookup}
        onRequestSave={handleRequestSave}
        onDeleteSaved={handleDeleteSaved}
      />

      {/* Mobile 3-Step Bulk Drawer */}
      <MobileBulkLessonDrawer
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        date={date}
        students={sortedStudents}
        classMap={classMap}
        topicPool={db.topicPool}
        attendanceLookup={attendanceLookup}
        onCommitBatch={(inputs, summary) => {
          batchUpsertLessons(inputs);
          onNotify(summary);
        }}
      />

      {/* Shared Makeup & Duplicate Confirmation Modals */}
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
        }}
        onSaveNormal={() => {
          if (!makeupPrompt) return;
          const { req } = makeupPrompt;
          setMakeupPrompt(null);
          checkDuplicateOrCommit(req);
        }}
      />

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
        }}
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { Award, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { useAppStore } from '../../store/AppStoreContext';
import type { ExamDefinition, Student } from '../../types';
import { formatShortDDMM } from '../../utils/duplicateAndMakeupEngine';
import { getTodayISO } from '../../utils/id';
import { ExamFormModal } from './ExamFormModal';
import { computeStudentGradeSummaries, getApplicableExams } from './gradesEngine';

interface ExamsGradesTabProps {
  students: Student[];
  selectedClassId: string;
  classMap: Map<string, string>;
}

export const ExamsGradesTab: React.FC<ExamsGradesTabProps> = ({
  students,
  selectedClassId,
  classMap,
}) => {
  const {
    db,
    activeTerm,
    updateGradingSettings,
    upsertExam,
    deleteExam,
    upsertGrade,
    deleteGrade,
    showToast,
  } = useAppStore();

  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamDefinition | null>(null);
  const termId = activeTerm?.id ?? '';

  const visibleExams = useMemo(
    () => getApplicableExams(db.exams, termId, selectedClassId || undefined),
    [db.exams, termId, selectedClassId]
  );

  const gradeSummaries = useMemo(
    () =>
      computeStudentGradeSummaries(
        students,
        db.exams,
        db.grades,
        db.gradingSettings,
        termId
      ),
    [students, db.exams, db.grades, db.gradingSettings, termId]
  );

  const stats = useMemo(() => {
    let graded = 0;
    let passed = 0;
    let failed = 0;
    let sumAvg = 0;
    for (const s of students) {
      const sm = gradeSummaries.get(s.id);
      if (sm && sm.weightedAverage !== null) {
        graded += 1;
        sumAvg += sm.weightedAverage;
        if (sm.passed) passed += 1;
        else failed += 1;
      }
    }
    return {
      graded,
      passed,
      failed,
      classAvg: graded > 0 ? Math.round((sumAvg / graded) * 10) / 10 : null,
    };
  }, [students, gradeSummaries]);

  const handleScoreChange = (
    studentId: string,
    exam: ExamDefinition | null,
    rawVal: string
  ) => {
    const trimmed = rawVal.trim();
    if (trimmed === '') {
      const existing = db.grades.find(
        (g) =>
          g.studentId === studentId &&
          (exam
            ? g.examId === exam.id
            : g.category === 'Kanaat' && !g.examId && g.termId === termId)
      );
      if (existing) deleteGrade(existing.id);
      return;
    }

    const num = Math.max(0, Math.min(100, Number(trimmed)));
    if (Number.isNaN(num)) return;

    upsertGrade({
      termId,
      studentId,
      examId: exam?.id,
      subjectName: exam?.subjectName ?? 'Genel Kanaat',
      title: exam?.title ?? 'Kanaat Notu',
      date: exam?.date ?? getTodayISO(),
      category: exam ? (exam.examType === 'Sözlü' ? 'Sözlü' : 'Sınav') : 'Kanaat',
      score: num,
      weight: exam ? exam.weight : db.gradingSettings.kanaatWeight,
    });
  };

  const passThreshold = db.gradingSettings.passThreshold ?? 50;

  return (
    <div className="space-y-3.5">
      {/* Settings & Summary Strip */}
      <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-1.5">
            <span className="text-slate-600 font-medium">Geçme Barajı:</span>
            <input
              type="number"
              min={0}
              max={100}
              value={passThreshold}
              onChange={(e) =>
                updateGradingSettings({
                  passThreshold: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                })
              }
              className="w-16 h-8 px-2 text-center font-bold tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </label>

          <label className="inline-flex items-center gap-1.5">
            <span className="text-slate-600 font-medium">Kanaat Ağırlığı (%):</span>
            <input
              type="number"
              min={0}
              max={100}
              value={db.gradingSettings.kanaatWeight}
              onChange={(e) =>
                updateGradingSettings({
                  kanaatWeight: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                })
              }
              className="w-16 h-8 px-2 text-center font-bold tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </label>

          <span className="hidden sm:inline text-slate-200">|</span>

          <div className="flex items-center gap-3 tabular-nums">
            <span className="text-slate-600">
              Ortalama:{' '}
              <strong className="text-slate-900">
                {stats.classAvg !== null ? stats.classAvg : '—'}
              </strong>
            </span>
            <span className="text-emerald-700 font-semibold">Geçen: {stats.passed}</span>
            {stats.failed > 0 && (
              <span className="text-red-600 font-semibold">Baraj Altı: {stats.failed}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingExam(null);
            setExamModalOpen(true);
          }}
          className="min-h-[38px] px-3.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yeni Sınav Tanımla
        </button>
      </div>

      {/* Inline Gradebook Table */}
      {students.length === 0 ? (
        <EmptyState
          title="Not girişi için öğrenci bulunamadı"
          description="Sınıf veya arama filtresini değiştirerek öğrencileri listeleyebilirsiniz."
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="px-3.5 py-2.5 border-r border-slate-200/70 w-[210px]">
                    Öğrenci
                  </th>
                  {visibleExams.map((exam) => (
                    <th
                      key={exam.id}
                      className="px-2.5 py-2 text-center border-r border-slate-200/60 min-w-[126px]"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExam(exam);
                            setExamModalOpen(true);
                          }}
                          className="font-semibold text-slate-900 hover:text-emerald-700 truncate max-w-[110px] cursor-pointer"
                          title={`${exam.title} (${exam.subjectName}${exam.topicTitle ? ' - ' + exam.topicTitle : ''})`}
                        >
                          {exam.title}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteExam(exam.id);
                            showToast(`"${exam.title}" sınavı silindi.`, 'info');
                          }}
                          title="Sınavı sil"
                          className="text-slate-300 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5 tabular-nums">
                        {exam.subjectName} • %{exam.weight} • {formatShortDDMM(exam.date)}
                      </div>
                    </th>
                  ))}
                  <th className="px-2.5 py-2 text-center border-r border-slate-200/70 w-[108px] bg-emerald-50/40">
                    <div className="text-emerald-900">Kanaat Notu</div>
                    <div className="text-[10px] font-normal text-emerald-700 tabular-nums">
                      Ağırlık %{db.gradingSettings.kanaatWeight}
                    </div>
                  </th>
                  <th className="px-3 py-2 text-center border-r border-slate-200/70 w-[112px]">
                    Genel Ort.
                  </th>
                  <th className="px-3 py-2 text-center w-[94px]">Sınıf Sırası</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const summary = gradeSummaries.get(student.id);
                  const avg = summary?.weightedAverage ?? null;
                  const belowThreshold = avg !== null && avg < passThreshold;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3.5 py-2.5 border-r border-slate-100">
                        <div className="text-sm font-semibold text-slate-900">
                          {student.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {classMap.get(student.classId) ?? 'Sınıfsız'}
                        </div>
                      </td>

                      {visibleExams.map((exam) => {
                        const val = summary?.examScores[exam.id];
                        const isExamLow = typeof val === 'number' && val < passThreshold;
                        const applies =
                          exam.classId === '__all__' || exam.classId === student.classId;
                        return (
                          <td
                            key={exam.id}
                            className="px-2 py-2 border-r border-slate-100 text-center"
                          >
                            {applies ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={val ?? ''}
                                onChange={(e) =>
                                  handleScoreChange(student.id, exam, e.target.value)
                                }
                                placeholder="—"
                                aria-label={`${student.fullName} ${exam.title}`}
                                className={`w-16 h-8 px-1.5 text-xs text-center font-semibold tabular-nums rounded-md border focus:outline-none focus:bg-white ${
                                  isExamLow
                                    ? 'bg-red-50 border-red-300 text-red-700 focus:border-red-500'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-600'
                                }`}
                              />
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Kanaat Notu */}
                      <td className="px-2 py-2 border-r border-slate-100 text-center bg-emerald-50/20">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={summary?.kanaatScore ?? ''}
                          onChange={(e) =>
                            handleScoreChange(student.id, null, e.target.value)
                          }
                          placeholder="—"
                          aria-label={`${student.fullName} Kanaat Notu`}
                          className="w-16 h-8 px-1.5 text-xs text-center font-semibold tabular-nums rounded-md border border-emerald-200 bg-white text-emerald-900 focus:outline-none focus:border-emerald-600"
                        />
                      </td>

                      {/* Weighted Average */}
                      <td className="px-3 py-2 border-r border-slate-100 text-center">
                        {avg !== null ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-bold tabular-nums border ${
                                belowThreshold
                                  ? 'bg-red-600 text-white border-red-700'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {avg}
                            </span>
                            {belowThreshold && (
                              <span className="text-[10px] font-semibold text-red-600 mt-0.5">
                                Baraj Altı
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Class Rank */}
                      <td className="px-3 py-2 text-center tabular-nums">
                        {summary?.classRank ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                              summary.classRank === 1
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {summary.classRank === 1 && <Award className="w-3 h-3" />}
                            #{summary.classRank}
                            <span className="text-[10px] font-normal opacity-75">
                              /{summary.classTotalRanked}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExamFormModal
        open={examModalOpen}
        onClose={() => setExamModalOpen(false)}
        termId={termId}
        classes={db.classes}
        editingExam={editingExam}
        onSave={(input) => {
          upsertExam(input);
          showToast(`"${input.title}" sınavı kaydedildi.`);
        }}
      />
    </div>
  );
};

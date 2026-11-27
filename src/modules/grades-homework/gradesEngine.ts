import type { ExamDefinition, GradeRecord, GradingSettings, Student } from '../../types';

export interface StudentGradeSummary {
  studentId: string;
  examScores: Record<string, number | undefined>;
  kanaatScore?: number;
  weightedAverage: number | null;
  passed: boolean | null;
  classRank: number | null;
  classTotalRanked: number;
}

export function getApplicableExams(
  exams: ExamDefinition[],
  termId: string,
  classId?: string
): ExamDefinition[] {
  return exams
    .filter((e) => {
      if (termId && e.termId && e.termId !== termId) return false;
      if (!classId) return true;
      return e.classId === '__all__' || e.classId === classId;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'tr-TR'));
}

export function computeStudentGradeSummaries(
  students: Student[],
  exams: ExamDefinition[],
  grades: GradeRecord[],
  settings: GradingSettings,
  termId: string
): Map<string, StudentGradeSummary> {
  const passThreshold = settings.passThreshold ?? 50;
  const kanaatWeight = Math.max(0, settings.kanaatWeight ?? 20);

  const gradesByStudent = new Map<string, GradeRecord[]>();
  for (const g of grades) {
    if (termId && g.termId && g.termId !== termId) continue;
    const arr = gradesByStudent.get(g.studentId);
    if (arr) arr.push(g);
    else gradesByStudent.set(g.studentId, [g]);
  }

  const summaries = new Map<string, StudentGradeSummary>();

  for (const student of students) {
    const sGrades = gradesByStudent.get(student.id) ?? [];
    const sExams = getApplicableExams(exams, termId, student.classId);

    const examScores: Record<string, number | undefined> = {};
    let weightedSum = 0;
    let totalWeight = 0;

    for (const exam of sExams) {
      const rec = sGrades.find((g) => g.examId === exam.id);
      if (rec && typeof rec.score === 'number') {
        examScores[exam.id] = rec.score;
        const w = exam.weight > 0 ? exam.weight : 1;
        weightedSum += rec.score * w;
        totalWeight += w;
      }
    }

    const kanaatRec = sGrades.find((g) => g.category === 'Kanaat' && !g.examId);
    const kanaatScore = typeof kanaatRec?.score === 'number' ? kanaatRec.score : undefined;

    if (typeof kanaatScore === 'number' && kanaatWeight > 0) {
      weightedSum += kanaatScore * kanaatWeight;
      totalWeight += kanaatWeight;
    }

    const weightedAverage =
      totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;

    summaries.set(student.id, {
      studentId: student.id,
      examScores,
      kanaatScore,
      weightedAverage,
      passed: weightedAverage === null ? null : weightedAverage >= passThreshold,
      classRank: null,
      classTotalRanked: 0,
    });
  }

  // Compute class-level success ranking (highest average = #1, ties share same rank)
  const byClass = new Map<string, Student[]>();
  for (const s of students) {
    const list = byClass.get(s.classId);
    if (list) list.push(s);
    else byClass.set(s.classId, [s]);
  }

  for (const classStudents of byClass.values()) {
    const ranked = classStudents
      .map((s) => summaries.get(s.id)!)
      .filter((item) => item.weightedAverage !== null)
      .sort((a, b) => (b.weightedAverage ?? 0) - (a.weightedAverage ?? 0));

    let currentRank = 0;
    let prevAvg: number | null = null;
    ranked.forEach((item, idx) => {
      if (prevAvg === null || item.weightedAverage !== prevAvg) {
        currentRank = idx + 1;
        prevAvg = item.weightedAverage;
      }
      item.classRank = currentRank;
      item.classTotalRanked = ranked.length;
    });
  }

  return summaries;
}

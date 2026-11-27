import type {
  AttendanceRecord,
  AttendanceStatus,
  HomeworkRecord,
  LessonRecord,
  Student,
} from '../types';
import { getResolvedMakeupIds } from './duplicateAndMakeupEngine';
import {
  countDistinctLessonSessions,
  inferLessonStatus,
} from './lessonScheduleResolver';

export type LessonStrengthLevel = 'Kuvvetli' | 'İyi' | 'Pekiştirilmeli' | 'Veri Yok';

export interface StudentAnalyticsRow {
  studentId: string;
  sessionCount: number;
  passedCount: number;
  repeatCount: number;
  missedCount: number;
  unresolvedOpenCount: number;
  avgScore: number | null;
  avgTur: number | null;
  strengthLevel: LessonStrengthLevel;
  strengthReason: string;
  attendanceCounts: Record<AttendanceStatus, number>;
  attendanceRate: number | null;
  homeworkDone: number;
  homeworkTotal: number;
}

export interface OverallAnalyticsSummary {
  totalSessions: number;
  avgScore: number | null;
  avgTur: number | null;
  strongCount: number;
  needsWorkCount: number;
  attendanceRate: number | null;
  attendanceDistribution: Record<AttendanceStatus, number>;
  homeworkCompletionRate: number | null;
}

function createEmptyAttCounts(): Record<AttendanceStatus, number> {
  return {
    Geldi: 0,
    Gelmedi: 0,
    'Derse Girmedi': 0,
    'Kurstan İzinsiz Çıktı': 0,
    'Geç Geldi': 0,
    İzinli: 0,
  };
}

/**
 * Combines Puan (score) + Tur (turCount) to determine true lesson mastery strength:
 * - Low tur (<= 2.2) + high score (>= 80) -> Kuvvetli
 * - High tur (>= 3.5) OR low/mid score (< 70) -> Pekiştirilmeli
 * - Otherwise -> İyi
 */
export function evaluateLessonStrength(
  avgScore: number | null,
  avgTur: number | null,
  lessonCount: number
): { level: LessonStrengthLevel; reason: string } {
  if (lessonCount === 0) {
    return { level: 'Veri Yok', reason: 'Henüz ders kaydı yok' };
  }
  const tur = avgTur ?? 1;
  if (avgScore !== null) {
    if (avgScore >= 80 && tur <= 2.2) {
      return {
        level: 'Kuvvetli',
        reason: `Az tur (${tur}) + yüksek puan (${avgScore})`,
      };
    }
    if (avgScore < 70 || tur >= 3.5) {
      return {
        level: 'Pekiştirilmeli',
        reason:
          tur >= 3.5
            ? `Yüksek tur (${tur}) • tekrar yoğun`
            : `Düşük/orta puan (${avgScore})`,
      };
    }
    return {
      level: 'İyi',
      reason: `Dengeli akış (${avgScore}p • ${tur} tur)`,
    };
  }
  if (tur >= 3.5) {
    return { level: 'Pekiştirilmeli', reason: `Yüksek tur ortalaması (${tur})` };
  }
  return { level: 'İyi', reason: `Ortalama ${tur} tur` };
}

export function computeAnalytics(
  students: Student[],
  lessons: LessonRecord[],
  attendance: AttendanceRecord[],
  homeworks: HomeworkRecord[]
): {
  rows: Map<string, StudentAnalyticsRow>;
  overall: OverallAnalyticsSummary;
} {
  const resolvedMakeupIds = getResolvedMakeupIds(lessons);
  const studentIdSet = new Set(students.map((s) => s.id));

  const lessonsByStudent = new Map<string, LessonRecord[]>();
  for (const l of lessons) {
    if (!studentIdSet.has(l.studentId)) continue;
    const arr = lessonsByStudent.get(l.studentId);
    if (arr) arr.push(l);
    else lessonsByStudent.set(l.studentId, [l]);
  }

  const attByStudent = new Map<string, AttendanceRecord[]>();
  for (const a of attendance) {
    if (!studentIdSet.has(a.studentId)) continue;
    const arr = attByStudent.get(a.studentId);
    if (arr) arr.push(a);
    else attByStudent.set(a.studentId, [a]);
  }

  const hwByStudent = new Map<string, HomeworkRecord[]>();
  for (const h of homeworks) {
    if (!studentIdSet.has(h.studentId)) continue;
    const arr = hwByStudent.get(h.studentId);
    if (arr) arr.push(h);
    else hwByStudent.set(h.studentId, [h]);
  }

  const rows = new Map<string, StudentAnalyticsRow>();
  const overallDist = createEmptyAttCounts();

  let totalSessions = 0;
  let scoreSumAll = 0;
  let scoreCountAll = 0;
  let turSumAll = 0;
  let turCountAll = 0;
  let strongCount = 0;
  let needsWorkCount = 0;
  let hwDoneAll = 0;
  let hwTotalAll = 0;

  for (const student of students) {
    const sLessons = lessonsByStudent.get(student.id) ?? [];
    const sAtts = attByStudent.get(student.id) ?? [];
    const sHws = hwByStudent.get(student.id) ?? [];

    const sessionCount = countDistinctLessonSessions(sLessons);
    totalSessions += sessionCount;

    let passedCount = 0;
    let repeatCount = 0;
    let missedCount = 0;
    let unresolvedOpenCount = 0;
    let sScoreSum = 0;
    let sScoreCnt = 0;
    let sTurSum = 0;

    for (const l of sLessons) {
      const st = inferLessonStatus(l);
      if (st === 'Geçti') passedCount += 1;
      else if (st === 'Tekrar') repeatCount += 1;
      else missedCount += 1;

      if ((st === 'Tekrar' || st === 'Vermedi') && !resolvedMakeupIds.has(l.id)) {
        unresolvedOpenCount += 1;
      }
      if (typeof l.score === 'number') {
        sScoreSum += l.score;
        sScoreCnt += 1;
        scoreSumAll += l.score;
        scoreCountAll += 1;
      }
      const t = Math.max(1, l.turCount || 1);
      sTurSum += t;
      turSumAll += t;
      turCountAll += 1;
    }

    const avgScore = sScoreCnt > 0 ? Math.round((sScoreSum / sScoreCnt) * 10) / 10 : null;
    const avgTur = sLessons.length > 0 ? Math.round((sTurSum / sLessons.length) * 10) / 10 : null;
    const strength = evaluateLessonStrength(avgScore, avgTur, sLessons.length);
    if (strength.level === 'Kuvvetli') strongCount += 1;
    if (strength.level === 'Pekiştirilmeli') needsWorkCount += 1;

    const attCounts = createEmptyAttCounts();
    for (const a of sAtts) {
      attCounts[a.status] += 1;
      overallDist[a.status] += 1;
    }

    const presentSum = attCounts.Geldi + attCounts['Geç Geldi'];
    const totalAtt =
      presentSum +
      attCounts.Gelmedi +
      attCounts['Derse Girmedi'] +
      attCounts['Kurstan İzinsiz Çıktı'];
    const attendanceRate = totalAtt > 0 ? Math.round((presentSum / totalAtt) * 100) : null;

    const hwDone = sHws.filter(
      (h) => h.status === 'Yaptı' || h.status === 'Tamamlandı' || h.status === 'Geç Getirdi'
    ).length;
    hwDoneAll += hwDone;
    hwTotalAll += sHws.length;

    rows.set(student.id, {
      studentId: student.id,
      sessionCount,
      passedCount,
      repeatCount,
      missedCount,
      unresolvedOpenCount,
      avgScore,
      avgTur,
      strengthLevel: strength.level,
      strengthReason: strength.reason,
      attendanceCounts: attCounts,
      attendanceRate,
      homeworkDone: hwDone,
      homeworkTotal: sHws.length,
    });
  }

  const overallPresent = overallDist.Geldi + overallDist['Geç Geldi'];
  const overallTotalAtt =
    overallPresent +
    overallDist.Gelmedi +
    overallDist['Derse Girmedi'] +
    overallDist['Kurstan İzinsiz Çıktı'];

  return {
    rows,
    overall: {
      totalSessions,
      avgScore: scoreCountAll > 0 ? Math.round((scoreSumAll / scoreCountAll) * 10) / 10 : null,
      avgTur: turCountAll > 0 ? Math.round((turSumAll / turCountAll) * 10) / 10 : null,
      strongCount,
      needsWorkCount,
      attendanceRate:
        overallTotalAtt > 0 ? Math.round((overallPresent / overallTotalAtt) * 100) : null,
      attendanceDistribution: overallDist,
      homeworkCompletionRate:
        hwTotalAll > 0 ? Math.round((hwDoneAll / hwTotalAll) * 100) : null,
    },
  };
}

import type { LessonRecord, LessonResultStatus } from '../types';
import { inferLessonStatus, inferLessonSubject } from './lessonScheduleResolver';

/**
 * Normalizes page/sure strings for EXACT duplicate detection.
 * Handles hyphen/dash spacing differences ("561 - 563" === "561-563", "86 - Tarık" === "86-tarık")
 * while never falsely matching partial ranges ("561-563" !== "562").
 */
export function normalizePageOrSureKey(raw?: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[–—−]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ');
}

export function formatShortDDMM(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}.${parts[1]}`;
}

export function formatFullDDMMYYYY(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export interface DuplicateMatchInfo {
  record: LessonRecord;
  shortDate: string; // GG.AA
  fullDate: string; // GG.AA.YYYY
  recordedTime?: string;
  scoreLabel: string;
  status: LessonResultStatus;
  badgeText: string; // Örn: 25.11 • 65p
}

export interface MakeupCandidateInfo {
  record: LessonRecord;
  shortDate: string;
  fullDate: string;
  status: LessonResultStatus;
  label: string;
}

/**
 * Returns IDs of past Vermedi/Tekrar lessons that have already been made up by a Geçti lesson.
 */
export function getResolvedMakeupIds(lessons: LessonRecord[]): Set<string> {
  const resolved = new Set<string>();
  for (const l of lessons) {
    if (l.makeupOfId && inferLessonStatus(l) === 'Geçti') {
      resolved.add(l.makeupOfId);
    }
  }
  return resolved;
}

/**
 * Finds the most recent unresolved Vermedi/Tekrar record for the same student & content
 * so when the teacher enters 'Geçti', the app can ask if this is a makeup (Telafi).
 */
export function findPendingMakeupCandidate(
  allLessons: LessonRecord[],
  studentId: string,
  subjectName: string,
  pageOrVerse?: string,
  topicTitle?: string,
  excludeLessonId?: string
): MakeupCandidateInfo | null {
  const resolvedIds = getResolvedMakeupIds(allLessons);
  const normPage = normalizePageOrSureKey(pageOrVerse);
  const normTopic = normalizePageOrSureKey(topicTitle);
  const normSubject = subjectName.trim().toLocaleLowerCase('tr-TR');

  const candidates = allLessons
    .filter((l) => {
      if (l.studentId !== studentId) return false;
      if (excludeLessonId && l.id === excludeLessonId) return false;
      if (resolvedIds.has(l.id)) return false;

      const status = inferLessonStatus(l);
      if (status !== 'Vermedi' && status !== 'Tekrar') return false;

      const sameSubject = inferLessonSubject(l).toLocaleLowerCase('tr-TR') === normSubject;
      if (!sameSubject) return false;

      // Exact match on page/sure if both provided, otherwise match on topicTitle
      const lPage = normalizePageOrSureKey(l.pageOrVerse);
      const lTopic = normalizePageOrSureKey(l.topicTitle);
      if (normPage && lPage) return lPage === normPage;
      if (normTopic && lTopic) return lTopic === normTopic;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || (b.recordedTime || '').localeCompare(a.recordedTime || ''));

  const best = candidates[0];
  if (!best) return null;

  const status = inferLessonStatus(best);
  return {
    record: best,
    shortDate: formatShortDDMM(best.date),
    fullDate: formatFullDDMMYYYY(best.date),
    status,
    label: best.pageOrVerse || best.topicTitle || inferLessonSubject(best),
  };
}

/**
 * Exact duplicate check on Page/Sure (outside of makeup/Telafi records).
 * Matches exact sure ("86-Tarık"), exact single page ("562"), or exact range ("561-563")
 * after dash/space normalization. Never flags partial overlaps.
 */
export function findExactDuplicateLesson(
  allLessons: LessonRecord[],
  studentId: string,
  pageOrVerse?: string,
  excludeLessonId?: string,
  makeupOfId?: string
): DuplicateMatchInfo | null {
  if (makeupOfId) return null;
  const targetKey = normalizePageOrSureKey(pageOrVerse);
  if (!targetKey) return null;

  const matches = allLessons
    .filter((l) => {
      if (l.studentId !== studentId) return false;
      if (excludeLessonId && l.id === excludeLessonId) return false;
      return normalizePageOrSureKey(l.pageOrVerse) === targetKey;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || (b.recordedTime || '').localeCompare(a.recordedTime || ''));

  const latest = matches[0];
  if (!latest) return null;

  const status = inferLessonStatus(latest);
  const shortDate = formatShortDDMM(latest.date);
  const scoreLabel = typeof latest.score === 'number' ? `${latest.score}p` : status;

  return {
    record: latest,
    shortDate,
    fullDate: formatFullDDMMYYYY(latest.date),
    recordedTime: latest.recordedTime || undefined,
    scoreLabel,
    status,
    badgeText: `${shortDate} • ${scoreLabel}`,
  };
}

export function buildDuplicateConfirmMessage(
  studentName: string,
  pageOrSure: string,
  match: DuplicateMatchInfo
): string {
  const timePart = match.recordedTime ? ` saat ${match.recordedTime}'te` : '';
  const scorePart =
    typeof match.record.score === 'number' ? `${match.record.score} puan ve ` : '';
  return `⚠️ Mükerrer Ders Uyarısı: ${studentName} için '${pageOrSure}' dersini daha önce ${match.fullDate} günü${timePart}, ${scorePart}'${match.status}' durumuyla kaydettiniz. Yine de kaydetmek istiyor musunuz?`;
}

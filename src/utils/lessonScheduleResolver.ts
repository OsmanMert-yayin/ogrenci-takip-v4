import {
  DAILY_ATTENDANCE_SLOT_ID,
  GENERAL_SCHEDULE_CLASS_ID,
  type AttendanceRecord,
  type AttendanceStatus,
  type LessonRecord,
  type LessonResultStatus,
  type LessonSlot,
  type ScheduleEntry,
} from '../types';
import { getDayOfWeekFromISO, resolveStudentSlotAttendance } from '../modules/attendance/attendanceMeta';
import { isEtutOrMutalaa } from '../modules/curriculum/curriculumConstants';

export interface DailySubjectTemplate {
  subjectName: string;
  defaultTopic?: string;
  slotIds: string[];
  firstSlotId?: string;
}

export interface StudentCardAttendanceInfo {
  cardDimmed: boolean;
  cardStatus: AttendanceStatus | null;
  cardNote?: string;
}

export interface RowAttendanceInfo {
  rowDimmed: boolean;
  rowBadgeStatus: AttendanceStatus | null;
  partialWarning?: string;
  note?: string;
}

export function resolveDailySubjectsForClass(
  schedule: ScheduleEntry[],
  lessonSlots: LessonSlot[],
  termId: string,
  classId: string,
  dateISO: string
): DailySubjectTemplate[] {
  const dayOfWeek = getDayOfWeekFromISO(dateISO);
  const slotMap = new Map(lessonSlots.map((s) => [s.id, s]));

  // Check if class has its own schedule entries for this day; otherwise fall back to general program
  const classEntries = schedule.filter(
    (s) => (!s.termId || s.termId === termId) && s.classId === classId && s.dayOfWeek === dayOfWeek
  );
  const effectiveEntries =
    classEntries.length > 0
      ? classEntries
      : schedule.filter(
          (s) =>
            (!s.termId || s.termId === termId) &&
            s.classId === GENERAL_SCHEDULE_CLASS_ID &&
            s.dayOfWeek === dayOfWeek
        );

  // Sort chronologically by lesson slot start time
  const sorted = [...effectiveEntries].sort((a, b) => {
    const slotA = slotMap.get(a.lessonSlotId);
    const slotB = slotMap.get(b.lessonSlotId);
    return (slotA?.startTime ?? '99:99').localeCompare(slotB?.startTime ?? '99:99');
  });

  const deduped = new Map<string, DailySubjectTemplate>();

  for (const entry of sorted) {
    const slot = slotMap.get(entry.lessonSlotId);
    // Exclude Etüt slots and Mütalaa subjects from automatic lesson draft rows
    if (isEtutOrMutalaa(slot, entry)) continue;

    const key = entry.subjectName.trim().toLocaleLowerCase('tr-TR');
    const existing = deduped.get(key);
    if (existing) {
      if (!existing.slotIds.includes(entry.lessonSlotId)) {
        existing.slotIds.push(entry.lessonSlotId);
      }
      if (!existing.defaultTopic && entry.defaultTopic) {
        existing.defaultTopic = entry.defaultTopic;
      }
    } else {
      deduped.set(key, {
        subjectName: entry.subjectName.trim(),
        defaultTopic: entry.defaultTopic,
        slotIds: [entry.lessonSlotId],
        firstSlotId: entry.lessonSlotId,
      });
    }
  }

  const result = Array.from(deduped.values());
  if (result.length === 0) {
    return [
      { subjectName: 'Yüzüne', slotIds: [] },
      { subjectName: 'Ezber', slotIds: [] },
    ];
  }
  return result;
}

export function resolveStudentCardAttendance(
  attendanceLookup: Map<string, AttendanceRecord>,
  studentId: string
): StudentCardAttendanceInfo {
  const daily = attendanceLookup.get(`${studentId}|${DAILY_ATTENDANCE_SLOT_ID}`);
  if (
    daily &&
    (daily.status === 'Gelmedi' ||
      daily.status === 'İzinli' ||
      daily.status === 'Kurstan İzinsiz Çıktı')
  ) {
    return {
      cardDimmed: true,
      cardStatus: daily.status,
      cardNote: daily.note,
    };
  }
  return { cardDimmed: false, cardStatus: daily?.status ?? null, cardNote: daily?.note };
}

const ABSENCE_ROW_STATUSES: AttendanceStatus[] = [
  'Gelmedi',
  'Derse Girmedi',
  'Kurstan İzinsiz Çıktı',
  'İzinli',
];

export function resolveRowAttendanceForSubject(
  attendanceLookup: Map<string, AttendanceRecord>,
  studentId: string,
  slotIds: string[]
): RowAttendanceInfo {
  const cardInfo = resolveStudentCardAttendance(attendanceLookup, studentId);
  if (cardInfo.cardDimmed && cardInfo.cardStatus) {
    return {
      rowDimmed: true,
      rowBadgeStatus: cardInfo.cardStatus,
      note: cardInfo.cardNote,
    };
  }

  if (slotIds.length === 0) {
    return { rowDimmed: false, rowBadgeStatus: null };
  }

  const slotStatuses = slotIds.map((slotId) =>
    resolveStudentSlotAttendance(attendanceLookup, studentId, slotId)
  );
  const missing = slotStatuses.filter(
    (item) => item.status && ABSENCE_ROW_STATUSES.includes(item.status)
  );

  if (missing.length === 0) {
    return { rowDimmed: false, rowBadgeStatus: null };
  }

  // Pick highest severity status: KİÇ > Gelmedi > Derse Girmedi > İzinli
  const priority: AttendanceStatus[] = [
    'Kurstan İzinsiz Çıktı',
    'Gelmedi',
    'Derse Girmedi',
    'İzinli',
  ];
  const dominant =
    priority.find((st) => missing.some((m) => m.status === st)) ?? missing[0].status ?? null;
  const note = missing.find((m) => m.note)?.note;

  if (missing.length === slotIds.length) {
    return {
      rowDimmed: true,
      rowBadgeStatus: dominant,
      note,
    };
  }

  // Partial absence across a multi-hour subject (e.g. 1/2 Derse Girmedi) -> keep row active, show warning
  const shortLabel =
    dominant === 'Kurstan İzinsiz Çıktı'
      ? 'İzinsiz Çıktı'
      : dominant === 'Derse Girmedi'
        ? 'Derse Girmedi'
        : dominant ?? '';
  return {
    rowDimmed: false,
    rowBadgeStatus: null,
    partialWarning: `${missing.length}/${slotIds.length} ${shortLabel}`,
    note,
  };
}

export function getSubjectShortCode(subjectName?: string): string {
  const s = (subjectName ?? '').trim().toLocaleLowerCase('tr-TR');
  if (s.includes('yüzüne') || s.includes('yuzune')) return 'Yüz';
  if (s.includes('ezber')) return 'Ezb';
  if (s.includes('tecvid') || s.includes('talim')) return 'Tcv';
  if (s.includes('dini') || s.includes('fıkıh') || s.includes('akaid') || s.includes('siyer')) {
    return 'Tdb';
  }
  if (s.includes('sosyal') || s.includes('etkinlik')) return 'Sos';
  if (s.includes('hafız') || s.includes('hafiz')) return 'Haf';
  if (s.includes('mütalaa') || s.includes('etüt')) return 'Müt';
  return (subjectName ?? 'Drs').slice(0, 3);
}

export function inferLessonStatus(lesson: LessonRecord): LessonResultStatus {
  if (lesson.status === 'Geçti' || lesson.status === 'Tekrar' || lesson.status === 'Vermedi') {
    return lesson.status;
  }
  if (lesson.evaluation === 'Dinlenmedi') return 'Vermedi';
  if (lesson.evaluation === 'Tekrar') return 'Tekrar';
  return 'Geçti';
}

export function inferLessonSubject(lesson: LessonRecord): string {
  if (lesson.subjectName && lesson.subjectName.trim()) return lesson.subjectName.trim();
  const t = lesson.topicTitle.toLocaleLowerCase('tr-TR');
  if (t.includes('yüzüne') || t.includes('elif-ba')) return 'Yüzüne';
  if (t.includes('hafız')) return 'Hafızlık';
  if (t.includes('tecvid') || t.includes('idğam') || t.includes('mahre')) return 'Talim Tecvid';
  if (t.includes('siyer') || t.includes('fıkıh') || t.includes('akaid') || t.includes('ahlak')) {
    return 'Temel Dini Bilgiler';
  }
  return 'Ezber';
}

/**
 * Counts distinct lesson sessions, collapsing records that share a combinedSessionId
 * (for the same student & date) into 1 session.
 */
export function countDistinctLessonSessions(lessons: LessonRecord[]): number {
  const seen = new Set<string>();
  for (const lesson of lessons) {
    if (lesson.combinedSessionId) {
      seen.add(`comb|${lesson.studentId}|${lesson.date}|${lesson.combinedSessionId}`);
    } else {
      seen.add(`single|${lesson.id}`);
    }
  }
  return seen.size;
}

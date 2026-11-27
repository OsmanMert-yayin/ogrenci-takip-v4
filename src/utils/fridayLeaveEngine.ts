import {
  DAILY_ATTENDANCE_SLOT_ID,
  GENERAL_SCHEDULE_CLASS_ID,
  type AttendanceRecord,
  type DayOfWeek,
  type FridayLeaveSettings,
  type FridayPermissionRecord,
  type LessonRecord,
  type LessonSlot,
  type ScheduleEntry,
  type Student,
} from '../types';
import {
  getDayOfWeekFromISO,
  getScheduledSubjectForSlot,
} from '../modules/attendance/attendanceMeta';
import { getDayLabel } from '../modules/curriculum/curriculumConstants';
import { getResolvedMakeupIds } from './duplicateAndMakeupEngine';
import { inferLessonStatus, inferLessonSubject } from './lessonScheduleResolver';

export type FridayBlockerTone = 'red' | 'amber' | 'black' | 'rose';

export interface FridayBlockerItem {
  id: string;
  date: string;
  dayLabel: string;
  category: 'attendance' | 'lesson' | 'saturday';
  label: string;
  tone: FridayBlockerTone;
}

export interface FridayWeekRange {
  fridayISO: string;
  rangeStartISO: string;
  rangeEndISO: string;
  saturdayISO: string;
}

export interface StudentFridayEvaluation {
  studentId: string;
  fridayISO: string;
  blockers: FridayBlockerItem[];
  blockerCount: number;
  maxBlockerLimit: number;
  isBlockedByLimit: boolean;
  manualApproval: boolean;
  canLeave: boolean;
  permissionRecord: FridayPermissionRecord | null;
  compactBadgeLabel: string;
  compactBadgeTone: 'emerald' | 'amber' | 'red' | 'sky';
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function getMondayOfDate(isoDate: string): Date {
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return new Date();
  const jsDay = parsed.getDay(); // 0=Sun, 1=Mon
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  parsed.setDate(parsed.getDate() + diff);
  return parsed;
}

export function getFridayWeekRange(
  referenceISO: string,
  settings: FridayLeaveSettings,
  weekOffset = 0
): FridayWeekRange {
  const monday = addDays(getMondayOfDate(referenceISO), weekOffset * 7);
  const friday = addDays(monday, 4);
  const saturday = addDays(monday, 5);

  const startDay: DayOfWeek = settings.weekStartDay || 1;
  const endDay: DayOfWeek = settings.weekEndDay || 5;

  // Support ranges like Pazartesi(1)..Cuma(5) or Cumartesi(6)..Cuma(5) (previous Saturday to this Friday)
  const startOffset = startDay > endDay ? startDay - 8 : startDay - 1;
  const endOffset = endDay - 1;

  const rangeStart = addDays(monday, startOffset);
  const rangeEnd = addDays(monday, endOffset);

  return {
    fridayISO: toLocalISO(friday),
    rangeStartISO: toLocalISO(rangeStart),
    rangeEndISO: toLocalISO(rangeEnd),
    saturdayISO: toLocalISO(saturday),
  };
}

function isSubjectMandatory(
  schedule: ScheduleEntry[],
  lessonSlots: LessonSlot[],
  termId: string,
  classId: string,
  dayOfWeek: DayOfWeek,
  subjectName: string,
  lessonSlotId?: string
): boolean {
  const normSubject = subjectName.trim().toLocaleLowerCase('tr-TR');

  const classEntries = schedule.filter(
    (s) => (!s.termId || s.termId === termId) && s.classId === classId && s.dayOfWeek === dayOfWeek
  );
  const effective =
    classEntries.length > 0
      ? classEntries
      : schedule.filter(
          (s) =>
            (!s.termId || s.termId === termId) &&
            s.classId === GENERAL_SCHEDULE_CLASS_ID &&
            s.dayOfWeek === dayOfWeek
        );

  const matched =
    (lessonSlotId ? effective.find((e) => e.lessonSlotId === lessonSlotId) : undefined) ??
    effective.find((e) => e.subjectName.trim().toLocaleLowerCase('tr-TR') === normSubject);

  if (matched?.requirement === 'secmeli') return false;
  if (matched?.requirement === 'zorunlu') return true;

  if (lessonSlotId) {
    const slot = lessonSlots.find((s) => s.id === lessonSlotId);
    if (slot?.requirement === 'secmeli') return false;
  }
  return true;
}

export interface FridayEngineInputs {
  students: Student[];
  attendance: AttendanceRecord[];
  lessons: LessonRecord[];
  schedule: ScheduleEntry[];
  lessonSlots: LessonSlot[];
  fridayPermissions: FridayPermissionRecord[];
  fridaySettings: FridayLeaveSettings;
  activeTermId: string;
  referenceISO: string;
  weekOffset?: number;
}

export function evaluateAllStudentsFridayLeave(
  inputs: FridayEngineInputs
): {
  weekRange: FridayWeekRange;
  evaluations: Map<string, StudentFridayEvaluation>;
} {
  const {
    students,
    attendance,
    lessons,
    schedule,
    lessonSlots,
    fridayPermissions,
    fridaySettings,
    activeTermId,
    referenceISO,
    weekOffset = 0,
  } = inputs;

  const weekRange = getFridayWeekRange(referenceISO, fridaySettings, weekOffset);
  const { fridayISO, rangeStartISO, rangeEndISO, saturdayISO } = weekRange;

  const resolvedMakeupIds = getResolvedMakeupIds(lessons);
  const slotMap = new Map(lessonSlots.map((s) => [s.id, s]));

  // Pre-group range attendance & lessons by studentId for O(N) performance
  const attByStudent = new Map<string, AttendanceRecord[]>();
  for (const a of attendance) {
    if (a.date < rangeStartISO || a.date > rangeEndISO) continue;
    const arr = attByStudent.get(a.studentId);
    if (arr) arr.push(a);
    else attByStudent.set(a.studentId, [a]);
  }

  const lessonsByStudent = new Map<string, LessonRecord[]>();
  const satAdvancePassStudents = new Set<string>();
  for (const l of lessons) {
    const st = inferLessonStatus(l);
    if (
      st === 'Geçti' &&
      (l.date === saturdayISO ||
        (l.date === fridayISO &&
          `${l.topicTitle} ${l.note ?? ''}`.toLocaleLowerCase('tr-TR').includes('peşin')) ||
        (l.date >= rangeStartISO &&
          l.date <= saturdayISO &&
          `${l.topicTitle} ${l.note ?? ''}`.toLocaleLowerCase('tr-TR').includes('cumartesi')))
    ) {
      satAdvancePassStudents.add(l.studentId);
    }

    if (l.date < rangeStartISO || l.date > rangeEndISO) continue;
    const arr = lessonsByStudent.get(l.studentId);
    if (arr) arr.push(l);
    else lessonsByStudent.set(l.studentId, [l]);
  }

  const permByStudent = new Map<string, FridayPermissionRecord>();
  for (const p of fridayPermissions) {
    if (p.date === fridayISO) {
      permByStudent.set(p.studentId, p);
    }
  }

  const evaluations = new Map<string, StudentFridayEvaluation>();

  for (const student of students) {
    const blockers: FridayBlockerItem[] = [];

    // 1. Attendance blockers (strictly ignoring 'İzinli', 'Geldi', 'Geç Geldi')
    const sAtts = (attByStudent.get(student.id) ?? []).sort(
      (a, b) => a.date.localeCompare(b.date) || a.lessonSlotId.localeCompare(b.lessonSlotId)
    );
    const byDate = new Map<string, AttendanceRecord[]>();
    for (const rec of sAtts) {
      const list = byDate.get(rec.date);
      if (list) list.push(rec);
      else byDate.set(rec.date, [rec]);
    }

    for (const [dateISO, dayRecs] of byDate.entries()) {
      const dayOfWeek = getDayOfWeekFromISO(dateISO);
      const dayLabel = getDayLabel(dayOfWeek);

      const dailyRec = dayRecs.find((r) => r.lessonSlotId === DAILY_ATTENDANCE_SLOT_ID);
      const slotRecs = dayRecs.filter((r) => r.lessonSlotId !== DAILY_ATTENDANCE_SLOT_ID);

      // Full-day KİÇ
      if (dailyRec?.status === 'Kurstan İzinsiz Çıktı') {
        blockers.push({
          id: `att_kic_${dateISO}`,
          date: dateISO,
          dayLabel,
          category: 'attendance',
          label: `${dayLabel}: Kurstan İzinsiz Çıktı`,
          tone: 'black',
        });
        continue;
      }

      // Full-day Gelmedi
      if (dailyRec?.status === 'Gelmedi') {
        blockers.push({
          id: `att_abs_${dateISO}`,
          date: dateISO,
          dayLabel,
          category: 'attendance',
          label: `${dayLabel}: Kursa Gelmedi`,
          tone: 'red',
        });
        continue;
      }

      // Full-day İzinli -> NEVER a blocker
      if (dailyRec?.status === 'İzinli') {
        continue;
      }

      // Slot-level unexcused records
      let recordedSlotKicForDay = false;
      let recordedSlotGelmediForDay = false;

      for (const rec of slotRecs) {
        if (rec.status === 'Geldi' || rec.status === 'İzinli' || rec.status === 'Geç Geldi') {
          continue;
        }
        const scheduled = getScheduledSubjectForSlot(
          schedule,
          activeTermId,
          student.classId,
          dayOfWeek,
          rec.lessonSlotId
        );
        const lessonLabel =
          scheduled?.subjectName || slotMap.get(rec.lessonSlotId)?.name || 'Ders';

        if (rec.status === 'Kurstan İzinsiz Çıktı') {
          if (recordedSlotKicForDay) continue;
          recordedSlotKicForDay = true;
          blockers.push({
            id: `att_slot_kic_${rec.id}`,
            date: dateISO,
            dayLabel,
            category: 'attendance',
            label: `${dayLabel} - ${lessonLabel}: Kurstan İzinsiz Çıktı`,
            tone: 'black',
          });
        } else if (rec.status === 'Derse Girmedi') {
          blockers.push({
            id: `att_dg_${rec.id}`,
            date: dateISO,
            dayLabel,
            category: 'attendance',
            label: `${dayLabel} - ${lessonLabel}: Derse Girmedi`,
            tone: 'amber',
          });
        } else if (rec.status === 'Gelmedi') {
          if (recordedSlotGelmediForDay) continue;
          recordedSlotGelmediForDay = true;
          blockers.push({
            id: `att_sg_${rec.id}`,
            date: dateISO,
            dayLabel,
            category: 'attendance',
            label: `${dayLabel}: Kursa Gelmedi`,
            tone: 'red',
          });
        }
      }
    }

    // 2. Unresolved 'Vermedi' mandatory lessons (deduplicating combinedSessionId into 1 blocker!)
    const sLessons = lessonsByStudent.get(student.id) ?? [];
    const seenCombinedVermedi = new Set<string>();

    for (const lesson of sLessons) {
      if (inferLessonStatus(lesson) !== 'Vermedi') continue;
      if (resolvedMakeupIds.has(lesson.id)) continue;

      const dayOfWeek = getDayOfWeekFromISO(lesson.date);
      const subject = inferLessonSubject(lesson);

      if (
        !isSubjectMandatory(
          schedule,
          lessonSlots,
          activeTermId,
          student.classId,
          dayOfWeek,
          subject,
          lesson.lessonSlotId
        )
      ) {
        continue;
      }

      if (lesson.combinedSessionId) {
        const combKey = `${lesson.date}|${lesson.combinedSessionId}`;
        if (seenCombinedVermedi.has(combKey)) continue;
        seenCombinedVermedi.add(combKey);
      }

      const dayLabel = getDayLabel(dayOfWeek);
      const detail = lesson.combinedSessionId
        ? `${subject} (Birleşik Oturum)`
        : lesson.pageOrVerse
          ? `${subject} (${lesson.pageOrVerse})`
          : subject;

      blockers.push({
        id: `lsn_${lesson.id}`,
        date: lesson.date,
        dayLabel,
        category: 'lesson',
        label: `${dayLabel} - ${detail}: Vermedi`,
        tone: 'rose',
      });
    }

    // 3. Optional Saturday / Weekend Advance Lesson rule
    if (fridaySettings.requireSaturdayAdvanceLesson && !satAdvancePassStudents.has(student.id)) {
      blockers.push({
        id: `sat_adv_${fridayISO}`,
        date: fridayISO,
        dayLabel: 'Cumartesi',
        category: 'saturday',
        label: 'Cumartesi Peşin Dersi: Henüz Verilmedi',
        tone: 'amber',
      });
    }

    const perm = permByStudent.get(student.id) ?? null;
    const manualApproval = Boolean(perm?.manualApproval || perm?.status === 'Mazeretli Onaylı');
    const blockerCount = blockers.length;
    const maxBlockerLimit = Math.max(0, fridaySettings.maxBlockerLimit);
    const isBlockedByLimit =
      maxBlockerLimit === 0 ? blockerCount > 0 : blockerCount >= maxBlockerLimit;
    const canLeave = manualApproval || !isBlockedByLimit;

    let compactBadgeLabel: string;
    let compactBadgeTone: 'emerald' | 'amber' | 'red' | 'sky';

    if (manualApproval) {
      compactBadgeLabel = 'Mazeretli Onaylı';
      compactBadgeTone = 'sky';
    } else if (blockerCount === 0) {
      compactBadgeLabel = 'İzne Uygun';
      compactBadgeTone = 'emerald';
    } else if (maxBlockerLimit === 0) {
      compactBadgeLabel = `Engel (${blockerCount})`;
      compactBadgeTone = 'red';
    } else {
      compactBadgeLabel = `Engel (${blockerCount}/${maxBlockerLimit})`;
      compactBadgeTone = isBlockedByLimit ? 'red' : 'amber';
    }

    evaluations.set(student.id, {
      studentId: student.id,
      fridayISO,
      blockers,
      blockerCount,
      maxBlockerLimit,
      isBlockedByLimit,
      manualApproval,
      canLeave,
      permissionRecord: perm,
      compactBadgeLabel,
      compactBadgeTone,
    });
  }

  return { weekRange, evaluations };
}

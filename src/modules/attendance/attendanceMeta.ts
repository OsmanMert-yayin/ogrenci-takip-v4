import {
  DAILY_ATTENDANCE_SLOT_ID,
  GENERAL_SCHEDULE_CLASS_ID,
  type AttendanceRecord,
  type AttendanceStatus,
  type DayOfWeek,
  type LessonSlot,
  type ScheduleEntry,
} from '../../types';
import { getCurrentTimeHHmm } from '../../utils/id';

export interface AttendanceStatusStyle {
  status: AttendanceStatus;
  shortLabel: string;
  compactCode: string;
  buttonActiveClass: string;
  buttonIdleClass: string;
  cellBadgeClass: string;
  textClass: string;
  dotColorClass: string;
  description: string;
}

export const ATTENDANCE_STATUS_ORDER: AttendanceStatus[] = [
  'Geldi',
  'Gelmedi',
  'Derse Girmedi',
  'Kurstan İzinsiz Çıktı',
  'Geç Geldi',
  'İzinli',
];

export const DAILY_STATUS_ORDER: AttendanceStatus[] = [
  'Geldi',
  'Gelmedi',
  'Kurstan İzinsiz Çıktı',
  'Geç Geldi',
  'İzinli',
];

export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, AttendanceStatusStyle> = {
  Geldi: {
    status: 'Geldi',
    shortLabel: 'Geldi',
    compactCode: '✓',
    buttonActiveClass: 'bg-emerald-600 text-white border-emerald-700',
    buttonIdleClass: 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60',
    cellBadgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    textClass: 'text-emerald-700',
    dotColorClass: 'bg-emerald-600',
    description: 'Kursta ve derste mevcut',
  },
  Gelmedi: {
    status: 'Gelmedi',
    shortLabel: 'Gelmedi',
    compactCode: 'YOK',
    buttonActiveClass: 'bg-red-600 text-white border-red-700',
    buttonIdleClass: 'bg-white text-slate-700 border-slate-200 hover:border-red-300 hover:bg-red-50/60',
    cellBadgeClass: 'bg-red-600 text-white border-red-700',
    textClass: 'text-red-700',
    dotColorClass: 'bg-red-600',
    description: 'Öğrenci o gün kursa hiç gelmedi',
  },
  'Derse Girmedi': {
    status: 'Derse Girmedi',
    shortLabel: 'Derse Girmedi',
    compactCode: 'DG',
    buttonActiveClass: 'bg-amber-600 text-white border-amber-700',
    buttonIdleClass: 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:bg-amber-50/70',
    cellBadgeClass: 'bg-amber-600 text-white border-amber-700',
    textClass: 'text-amber-700',
    dotColorClass: 'bg-amber-600',
    description: 'Kursta mevcut ama ilgili derse katılmadı',
  },
  'Kurstan İzinsiz Çıktı': {
    status: 'Kurstan İzinsiz Çıktı',
    shortLabel: 'İzinsiz Çıktı',
    compactCode: 'KİÇ',
    buttonActiveClass: 'bg-slate-900 text-white border-slate-950',
    buttonIdleClass: 'bg-white text-slate-800 border-slate-300 hover:border-slate-900 hover:bg-slate-100',
    cellBadgeClass: 'bg-slate-900 text-white border-slate-950',
    textClass: 'text-slate-950',
    dotColorClass: 'bg-slate-950',
    description: 'Öğrenci kurstan izinsiz ayrıldı',
  },
  'Geç Geldi': {
    status: 'Geç Geldi',
    shortLabel: 'Geç Geldi',
    compactCode: 'GEÇ',
    buttonActiveClass: 'bg-yellow-500 text-slate-950 border-yellow-600',
    buttonIdleClass: 'bg-white text-slate-700 border-slate-200 hover:border-yellow-400 hover:bg-yellow-50',
    cellBadgeClass: 'bg-yellow-500 text-slate-950 border-yellow-600',
    textClass: 'text-yellow-700',
    dotColorClass: 'bg-yellow-500',
    description: 'Derse veya kursa geç katıldı',
  },
  İzinli: {
    status: 'İzinli',
    shortLabel: 'İzinli',
    compactCode: 'İZİN',
    buttonActiveClass: 'bg-sky-600 text-white border-sky-700',
    buttonIdleClass: 'bg-white text-slate-700 border-slate-200 hover:border-sky-400 hover:bg-sky-50/70',
    cellBadgeClass: 'bg-sky-600 text-white border-sky-700',
    textClass: 'text-sky-700',
    dotColorClass: 'bg-sky-600',
    description: 'İzinli veya mazeretli (hastane, aile izni vb.)',
  },
};

export interface EffectiveSlotStatus {
  record: AttendanceRecord | null;
  status: AttendanceStatus | null;
  note?: string;
  inheritedFromDaily: boolean;
}

export function buildAttendanceLookup(
  records: AttendanceRecord[],
  date: string
): Map<string, AttendanceRecord> {
  const map = new Map<string, AttendanceRecord>();
  for (const rec of records) {
    if (rec.date === date) {
      map.set(`${rec.studentId}|${rec.lessonSlotId}`, rec);
    }
  }
  return map;
}

/**
 * Resolves effective attendance for a student on a specific lesson slot.
 * If no slot-level record exists, full-day 'Gelmedi', 'İzinli', or 'Kurstan İzinsiz Çıktı'
 * from Daily General Attendance propagates automatically into the slot.
 */
export function resolveStudentSlotAttendance(
  lookup: Map<string, AttendanceRecord>,
  studentId: string,
  slotId: string
): EffectiveSlotStatus {
  const exact = lookup.get(`${studentId}|${slotId}`) ?? null;
  if (exact) {
    return {
      record: exact,
      status: exact.status,
      note: exact.note,
      inheritedFromDaily: false,
    };
  }

  if (slotId !== DAILY_ATTENDANCE_SLOT_ID) {
    const daily = lookup.get(`${studentId}|${DAILY_ATTENDANCE_SLOT_ID}`) ?? null;
    if (
      daily &&
      (daily.status === 'Gelmedi' ||
        daily.status === 'İzinli' ||
        daily.status === 'Kurstan İzinsiz Çıktı')
    ) {
      return {
        record: daily,
        status: daily.status,
        note: daily.note,
        inheritedFromDaily: true,
      };
    }
  }

  return { record: null, status: null, inheritedFromDaily: false };
}

export function getDayOfWeekFromISO(isoDate: string): DayOfWeek {
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return 1;
  const jsDay = parsed.getDay(); // 0=Sunday, 1=Monday...
  return (jsDay === 0 ? 7 : jsDay) as DayOfWeek;
}

export function getScheduledSubjectForSlot(
  schedule: ScheduleEntry[],
  termId: string,
  classId: string,
  dayOfWeek: DayOfWeek,
  slotId: string
): ScheduleEntry | undefined {
  const own = schedule.find(
    (s) =>
      (!s.termId || s.termId === termId) &&
      s.classId === classId &&
      s.dayOfWeek === dayOfWeek &&
      s.lessonSlotId === slotId
  );
  if (own) return own;
  return schedule.find(
    (s) =>
      (!s.termId || s.termId === termId) &&
      s.classId === GENERAL_SCHEDULE_CLASS_ID &&
      s.dayOfWeek === dayOfWeek &&
      s.lessonSlotId === slotId
  );
}

/**
 * Finds the lesson slot matching the current HH:mm clock.
 * Returns DAILY_ATTENDANCE_SLOT_ID if current time is outside defined lesson slots.
 */
export function getAutoSelectedSlotId(lessonSlots: LessonSlot[]): string {
  const now = getCurrentTimeHHmm();
  const active = lessonSlots.find((s) => now >= s.startTime && now <= s.endTime);
  if (active) return active.id;
  return DAILY_ATTENDANCE_SLOT_ID;
}

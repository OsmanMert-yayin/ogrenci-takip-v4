import type {
  AppDatabase,
  AttendanceRecord,
  DayOfWeek,
  LessonRecord,
  ScheduleEntry,
  TopicPoolItem,
} from '../types';
import { createId, getCurrentTimeHHmm } from '../utils/id';

export function applyUpsertSchedule(prev: AppDatabase, entry: ScheduleEntry): AppDatabase {
  const existsIdx = prev.schedule.findIndex(
    (item) =>
      item.id === entry.id ||
      (item.termId === entry.termId &&
        item.classId === entry.classId &&
        item.dayOfWeek === entry.dayOfWeek &&
        item.lessonSlotId === entry.lessonSlotId)
  );
  const nextSchedule =
    existsIdx >= 0
      ? prev.schedule.map((item, idx) => (idx === existsIdx ? entry : item))
      : [...prev.schedule, entry];
  return { ...prev, schedule: nextSchedule };
}

export function applyDeleteSchedule(prev: AppDatabase, entryId: string): AppDatabase {
  return {
    ...prev,
    schedule: prev.schedule.filter((item) => item.id !== entryId),
  };
}

export function applyCopyDaySchedule(
  prev: AppDatabase,
  termId: string,
  classId: string,
  fromDay: DayOfWeek,
  toDays: DayOfWeek[]
): AppDatabase {
  const targetDays = toDays.filter((d) => d !== fromDay);
  if (targetDays.length === 0) return prev;

  const sourceEntries = prev.schedule.filter(
    (item) => item.termId === termId && item.classId === classId && item.dayOfWeek === fromDay
  );

  const retained = prev.schedule.filter(
    (item) =>
      !(item.termId === termId && item.classId === classId && targetDays.includes(item.dayOfWeek))
  );

  const copied: ScheduleEntry[] = [];
  for (const targetDay of targetDays) {
    for (const src of sourceEntries) {
      copied.push({
        ...src,
        id: createId('sch'),
        dayOfWeek: targetDay,
      });
    }
  }

  return {
    ...prev,
    schedule: [...retained, ...copied],
  };
}

export function applyUpsertTopic(prev: AppDatabase, topic: TopicPoolItem): AppDatabase {
  const exists = prev.topicPool.some((t) => t.id === topic.id);
  const next = exists
    ? prev.topicPool.map((t) => (t.id === topic.id ? topic : t))
    : [...prev.topicPool, topic];
  next.sort((a, b) => a.order - b.order);
  return { ...prev, topicPool: next };
}

export function applyDeleteTopic(prev: AppDatabase, topicId: string): AppDatabase {
  return {
    ...prev,
    topicPool: prev.topicPool.filter((t) => t.id !== topicId),
  };
}

export function applyReorderTopic(
  prev: AppDatabase,
  topicId: string,
  direction: 'up' | 'down',
  scopedCategory?: string
): AppDatabase {
  const ordered = [...prev.topicPool].sort((a, b) => a.order - b.order);
  const scoped = scopedCategory
    ? ordered.filter((t) => t.category === scopedCategory)
    : ordered;
  const idx = scoped.findIndex((t) => t.id === topicId);
  if (idx < 0) return prev;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= scoped.length) return prev;

  const current = scoped[idx];
  const neighbor = scoped[swapIdx];

  const next = prev.topicPool.map((t) => {
    if (t.id === current.id) return { ...t, order: neighbor.order };
    if (t.id === neighbor.id) return { ...t, order: current.order };
    return t;
  });
  next.sort((a, b) => a.order - b.order);
  return { ...prev, topicPool: next };
}

export type AttendanceUpsertInput = Omit<AttendanceRecord, 'id'> & { id?: string };

export function applyBatchUpsertAttendance(
  prev: AppDatabase,
  inputs: AttendanceUpsertInput[]
): AppDatabase {
  if (inputs.length === 0) return prev;
  const byKey = new Map<string, AttendanceRecord>();
  for (const rec of prev.attendance) {
    byKey.set(`${rec.date}|${rec.studentId}|${rec.lessonSlotId}`, rec);
  }
  const nowTime = getCurrentTimeHHmm();
  for (const input of inputs) {
    const key = `${input.date}|${input.studentId}|${input.lessonSlotId}`;
    const existing = byKey.get(key);
    byKey.set(key, {
      ...existing,
      ...input,
      id: existing?.id ?? input.id ?? createId('att'),
      recordedTime: input.recordedTime ?? nowTime,
    });
  }
  return {
    ...prev,
    attendance: Array.from(byKey.values()),
  };
}

export function applyDeleteAttendance(
  prev: AppDatabase,
  date: string,
  studentId: string,
  lessonSlotId: string
): AppDatabase {
  return {
    ...prev,
    attendance: prev.attendance.filter(
      (r) => !(r.date === date && r.studentId === studentId && r.lessonSlotId === lessonSlotId)
    ),
  };
}

export type LessonUpsertInput = Omit<LessonRecord, 'id' | 'recordedTime'> & {
  id?: string;
  recordedTime?: string;
};

export function applyUpsertLesson(prev: AppDatabase, input: LessonUpsertInput): AppDatabase {
  return applyBatchUpsertLessons(prev, [input]);
}

export function applyBatchUpsertLessons(
  prev: AppDatabase,
  inputs: LessonUpsertInput[]
): AppDatabase {
  if (inputs.length === 0) return prev;
  const nowTime = getCurrentTimeHHmm();
  const next = [...prev.lessons];

  for (const item of inputs) {
    const record: LessonRecord = {
      ...item,
      id: item.id || createId('lsn'),
      turCount: Math.max(1, item.turCount || 1),
      recordedTime: item.recordedTime || nowTime,
    };
    const idx = next.findIndex((existing) => existing.id === record.id);
    if (idx >= 0) {
      next[idx] = { ...next[idx], ...record, recordedTime: nowTime };
    } else {
      next.push(record);
    }
  }

  return { ...prev, lessons: next };
}

export function applyDeleteLesson(prev: AppDatabase, lessonId: string): AppDatabase {
  return {
    ...prev,
    lessons: prev.lessons.filter((l) => l.id !== lessonId),
  };
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AcademicTerm,
  AppDatabase,
  AttendanceRecord,
  AutomationSettings,
  ClassGroup,
  CloudSyncSettings,
  DayOfWeek,
  FridayLeaveSettings,
  GradingSettings,
  HomeworkStatus,
  InstitutionInfo,
  LessonSlot,
  ScheduleEntry,
  Student,
  Teacher,
  TopicPoolItem,
  WhatsAppQueueItem,
} from '../types';
import { createSeedDatabase } from '../utils/seedData';
import {
  applyBatchUpsertAttendance,
  applyBatchUpsertLessons,
  applyCopyDaySchedule,
  applyDeleteAttendance,
  applyDeleteLesson,
  applyDeleteSchedule,
  applyDeleteTopic,
  applyReorderTopic,
  applyUpsertLesson,
  applyUpsertSchedule,
  applyUpsertTopic,
  type AttendanceUpsertInput,
  type LessonUpsertInput,
} from './academicMutations';
import {
  applyBatchCreateHomeworks,
  applyDeleteExam,
  applyDeleteFridayPermission,
  applyDeleteGrade,
  applyDeleteHomeworkGroup,
  applyUpdateFridaySettings,
  applyUpdateGradingSettings,
  applyUpdateHomeworkStatus,
  applyUpsertExam,
  applyUpsertFridayPermission,
  applyUpsertGrade,
  type ExamUpsertInput,
  type FridayPermissionUpsertInput,
  type GradeUpsertInput,
  type HomeworkUpsertInput,
} from './phase4Mutations';
import {
  applyClearWhatsAppQueue,
  applyEnqueueWhatsAppItems,
  applyMarkAutomationLog,
  applyRemoveWhatsAppQueueItem,
  applyUpdateAutomationSettings,
  applyUpdateCloudSyncSettings,
  applyUpdateGuardianTelegramChatId,
  applyUpdateWhatsAppQueueItem,
} from './phase5Mutations';
import {
  buildAttendanceAlertPlan,
  buildDailyReportPlan,
  computeAutoEzberVermedi,
  evaluateScheduledAutomationTick,
} from '../utils/automationScheduler';
import { getTodayISO } from '../utils/id';
import { sendTelegramMessage } from '../utils/reportFormatter';
import { pushDatabaseToCloud } from '../utils/cloudSyncEngine';

const STORAGE_KEY = 'ogrenci_takip_v4_db';
const WRITE_DEBOUNCE_MS = 400;

interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}

interface AppStoreContextValue {
  db: AppDatabase;
  activeTerm: AcademicTerm | undefined;
  storageSizeKB: number;
  toast: ToastMessage | null;
  showToast: (text: string, tone?: ToastMessage['tone']) => void;
  dismissToast: () => void;

  // Institution & Terms & Classes & Slots
  updateInstitution: (patch: Partial<InstitutionInfo>) => void;
  upsertTerm: (term: AcademicTerm) => void;
  deleteTerm: (termId: string) => void;
  setActiveTerm: (termId: string) => void;

  upsertClass: (cls: ClassGroup) => void;
  deleteClass: (classId: string) => void;

  upsertLessonSlot: (slot: LessonSlot) => void;
  deleteLessonSlot: (slotId: string) => void;

  // Students & Teachers
  upsertStudent: (student: Student) => void;
  deleteStudent: (studentId: string) => void;

  upsertTeacher: (teacher: Teacher) => void;
  deleteTeacher: (teacherId: string) => void;

  // Curriculum & Schedule
  upsertScheduleEntry: (entry: ScheduleEntry) => void;
  deleteScheduleEntry: (entryId: string) => void;
  copyDaySchedule: (
    termId: string,
    classId: string,
    fromDay: DayOfWeek,
    toDays: DayOfWeek[]
  ) => void;
  upsertTopic: (topic: TopicPoolItem) => void;
  deleteTopic: (topicId: string) => void;
  reorderTopic: (topicId: string, direction: 'up' | 'down', scopedCategory?: string) => void;

  // Attendance
  upsertAttendance: (record: AttendanceUpsertInput) => void;
  batchUpsertAttendance: (records: AttendanceUpsertInput[]) => void;
  deleteAttendance: (date: string, studentId: string, lessonSlotId: string) => void;

  // Lessons (Ders Takip)
  upsertLesson: (lesson: LessonUpsertInput) => void;
  batchUpsertLessons: (lessons: LessonUpsertInput[]) => void;
  deleteLesson: (lessonId: string) => void;

  // Friday Leave (Cuma İzni)
  updateFridaySettings: (patch: Partial<FridayLeaveSettings>) => void;
  upsertFridayPermission: (record: FridayPermissionUpsertInput) => void;
  deleteFridayPermission: (date: string, studentId: string) => void;

  // Grades & Homework (Not & Ödev)
  updateGradingSettings: (patch: Partial<GradingSettings>) => void;
  upsertExam: (exam: ExamUpsertInput) => void;
  deleteExam: (examId: string) => void;
  upsertGrade: (grade: GradeUpsertInput) => void;
  deleteGrade: (gradeId: string) => void;
  batchCreateHomeworks: (items: HomeworkUpsertInput[]) => void;
  updateHomeworkStatus: (homeworkId: string, status: HomeworkStatus, note?: string) => void;
  deleteHomeworkGroup: (assignmentKey: string) => void;

  // Phase 5: Parent Automation, WhatsApp Queue, Telegram & Cloud Sync
  updateAutomationSettings: (patch: Partial<AutomationSettings>) => void;
  enqueueWhatsAppItems: (items: WhatsAppQueueItem[]) => void;
  updateWhatsAppQueueItem: (itemId: string, message: string) => void;
  removeWhatsAppQueueItem: (itemId: string) => void;
  clearWhatsAppQueue: () => void;
  updateCloudSyncSettings: (patch: Partial<CloudSyncSettings>) => void;
  updateGuardianTelegramChatId: (studentId: string, guardianId: string, chatId: string) => void;
  triggerManualDailyReportBatch: (
    dateISO?: string,
    studentIds?: string[]
  ) => Promise<{ queued: number; telegramSent: number; telegramFailed: number }>;
  runAutoEzberNow: (dateISO?: string) => number;

  // Smart Filter Preferences per page
  setPageFilterPrefs: (pageKey: string, enabledOptionalIds: string[]) => void;

  // Backup & Restore
  importDatabase: (incoming: AppDatabase, mode: 'replace' | 'merge') => void;
  resetToSeedData: () => void;
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

function loadInitialDatabase(): AppDatabase {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedDatabase();
    const parsed = JSON.parse(raw) as Partial<AppDatabase>;
    if (!parsed || typeof parsed !== 'object') return createSeedDatabase();
    const seed = createSeedDatabase();
    const isOldMinimalTopics =
      Array.isArray(parsed.topicPool) &&
      parsed.topicPool.length <= 2 &&
      parsed.topicPool.every((t) => t.id === 'top_1' || t.id === 'top_2');
    const needsDefaultSchedule = !Array.isArray(parsed.schedule) || parsed.schedule.length === 0;

    return {
      ...seed,
      ...parsed,
      schemaVersion: 4,
      institution: { ...seed.institution, ...(parsed.institution ?? {}) },
      automation: {
        ...seed.automation,
        ...(parsed.automation ?? {}),
        templates: {
          ...seed.automation.templates,
          ...(parsed.automation?.templates ?? {}),
        },
        dailyReportSections: {
          ...seed.automation.dailyReportSections,
          ...(parsed.automation?.dailyReportSections ?? {}),
        },
        portalSettings: {
          ...seed.automation.portalSettings,
          ...(parsed.automation?.portalSettings ?? {}),
        },
      },
      whatsappQueue: Array.isArray(parsed.whatsappQueue) ? parsed.whatsappQueue : [],
      cloudSync: { ...seed.cloudSync, ...(parsed.cloudSync ?? {}) },
      automationLog:
        parsed.automationLog && typeof parsed.automationLog === 'object'
          ? parsed.automationLog
          : {},
      topicPool: isOldMinimalTopics || !parsed.topicPool ? seed.topicPool : parsed.topicPool,
      schedule: needsDefaultSchedule ? seed.schedule : (parsed.schedule ?? seed.schedule),
      exams: Array.isArray(parsed.exams) ? parsed.exams : seed.exams,
      grades: Array.isArray(parsed.grades) ? parsed.grades : seed.grades,
      gradingSettings: { ...seed.gradingSettings, ...(parsed.gradingSettings ?? {}) },
      homeworks: Array.isArray(parsed.homeworks) ? parsed.homeworks : seed.homeworks,
      fridayPermissions: Array.isArray(parsed.fridayPermissions) ? parsed.fridayPermissions : [],
      fridaySettings: { ...seed.fridaySettings, ...(parsed.fridaySettings ?? {}) },
      filterPreferences: parsed.filterPreferences ?? {},
    };
  } catch {
    return createSeedDatabase();
  }
}

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => loadInitialDatabase());
  const [storageSizeKB, setStorageSizeKB] = useState<number>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? '';
      return Math.max(1, Math.round((new Blob([raw]).size / 1024) * 10) / 10);
    } catch {
      return 0;
    }
  });
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const latestDbRef = useRef<AppDatabase>(db);
  const saveTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  latestDbRef.current = db;

  const persistNow = useCallback((snapshot: AppDatabase) => {
    try {
      const serialized = JSON.stringify(snapshot);
      window.localStorage.setItem(STORAGE_KEY, serialized);
      const kb = Math.max(0.1, Math.round((new Blob([serialized]).size / 1024) * 10) / 10);
      setStorageSizeKB(kb);
    } catch {
      // Quota or private mode error ignored gracefully
    }
  }, []);

  // Debounced localStorage write so UI never freezes during rapid interactions
  useEffect(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      persistNow(latestDbRef.current);
      saveTimerRef.current = null;
    }, WRITE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [db, persistNow]);

  // Flush pending writes before browser tab closes
  useEffect(() => {
    const handleUnload = () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        persistNow(latestDbRef.current);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [persistNow]);

  const showToast = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now(), text, tone });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3200);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const updateInstitution = useCallback((patch: Partial<InstitutionInfo>) => {
    setDb((prev) => ({
      ...prev,
      institution: {
        ...prev.institution,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const upsertTerm = useCallback((term: AcademicTerm) => {
    setDb((prev) => {
      const exists = prev.terms.some((t) => t.id === term.id);
      const nextTerms = exists
        ? prev.terms.map((t) => (t.id === term.id ? term : t))
        : [...prev.terms, term];
      const normalized = term.isActive
        ? nextTerms.map((t) => ({ ...t, isActive: t.id === term.id }))
        : nextTerms;
      return { ...prev, terms: normalized };
    });
  }, []);

  const deleteTerm = useCallback((termId: string) => {
    setDb((prev) => {
      const remaining = prev.terms.filter((t) => t.id !== termId);
      if (remaining.length > 0 && !remaining.some((t) => t.isActive)) {
        remaining[0] = { ...remaining[0], isActive: true };
      }
      return { ...prev, terms: remaining };
    });
  }, []);

  const setActiveTerm = useCallback((termId: string) => {
    setDb((prev) => ({
      ...prev,
      terms: prev.terms.map((t) => ({ ...t, isActive: t.id === termId })),
    }));
  }, []);

  const upsertClass = useCallback((cls: ClassGroup) => {
    setDb((prev) => {
      const exists = prev.classes.some((c) => c.id === cls.id);
      const nextClasses = exists
        ? prev.classes.map((c) => (c.id === cls.id ? cls : c))
        : [...prev.classes, cls];

      // Keep teacher assignedClassIds synced
      const nextTeachers = prev.teachers.map((t) => {
        const hadClass = t.assignedClassIds.includes(cls.id);
        const shouldHave = cls.teacherId === t.id;
        if (shouldHave && !hadClass) {
          return { ...t, assignedClassIds: [...t.assignedClassIds, cls.id] };
        }
        if (!shouldHave && hadClass) {
          return { ...t, assignedClassIds: t.assignedClassIds.filter((id) => id !== cls.id) };
        }
        return t;
      });

      return { ...prev, classes: nextClasses, teachers: nextTeachers };
    });
  }, []);

  const deleteClass = useCallback((classId: string) => {
    setDb((prev) => ({
      ...prev,
      classes: prev.classes.filter((c) => c.id !== classId),
      teachers: prev.teachers.map((t) => ({
        ...t,
        assignedClassIds: t.assignedClassIds.filter((id) => id !== classId),
      })),
    }));
  }, []);

  const upsertLessonSlot = useCallback((slot: LessonSlot) => {
    setDb((prev) => {
      const exists = prev.lessonSlots.some((s) => s.id === slot.id);
      const nextSlots = exists
        ? prev.lessonSlots.map((s) => (s.id === slot.id ? slot : s))
        : [...prev.lessonSlots, slot];
      nextSlots.sort((a, b) => a.startTime.localeCompare(b.startTime) || a.order - b.order);
      return { ...prev, lessonSlots: nextSlots };
    });
  }, []);

  const deleteLessonSlot = useCallback((slotId: string) => {
    setDb((prev) => ({
      ...prev,
      lessonSlots: prev.lessonSlots.filter((s) => s.id !== slotId),
    }));
  }, []);

  const upsertStudent = useCallback((student: Student) => {
    setDb((prev) => {
      const exists = prev.students.some((s) => s.id === student.id);
      const nextStudents = exists
        ? prev.students.map((s) => (s.id === student.id ? student : s))
        : [student, ...prev.students];
      return { ...prev, students: nextStudents };
    });
  }, []);

  const deleteStudent = useCallback((studentId: string) => {
    setDb((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== studentId),
    }));
  }, []);

  const upsertTeacher = useCallback((teacher: Teacher) => {
    setDb((prev) => {
      const exists = prev.teachers.some((t) => t.id === teacher.id);
      const nextTeachers = exists
        ? prev.teachers.map((t) => (t.id === teacher.id ? teacher : t))
        : [...prev.teachers, teacher];

      // Keep class.teacherId synced with teacher.assignedClassIds
      const nextClasses = prev.classes.map((c) => {
        if (teacher.assignedClassIds.includes(c.id)) {
          return { ...c, teacherId: teacher.id };
        }
        if (c.teacherId === teacher.id) {
          return { ...c, teacherId: undefined };
        }
        return c;
      });

      return { ...prev, teachers: nextTeachers, classes: nextClasses };
    });
  }, []);

  const deleteTeacher = useCallback((teacherId: string) => {
    setDb((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((t) => t.id !== teacherId),
      classes: prev.classes.map((c) =>
        c.teacherId === teacherId ? { ...c, teacherId: undefined } : c
      ),
    }));
  }, []);

  const upsertScheduleEntry = useCallback((entry: ScheduleEntry) => {
    setDb((prev) => applyUpsertSchedule(prev, entry));
  }, []);

  const deleteScheduleEntry = useCallback((entryId: string) => {
    setDb((prev) => applyDeleteSchedule(prev, entryId));
  }, []);

  const copyDaySchedule = useCallback(
    (termId: string, classId: string, fromDay: DayOfWeek, toDays: DayOfWeek[]) => {
      setDb((prev) => applyCopyDaySchedule(prev, termId, classId, fromDay, toDays));
    },
    []
  );

  const upsertTopic = useCallback((topic: TopicPoolItem) => {
    setDb((prev) => applyUpsertTopic(prev, topic));
  }, []);

  const deleteTopic = useCallback((topicId: string) => {
    setDb((prev) => applyDeleteTopic(prev, topicId));
  }, []);

  const reorderTopic = useCallback(
    (topicId: string, direction: 'up' | 'down', scopedCategory?: string) => {
      setDb((prev) => applyReorderTopic(prev, topicId, direction, scopedCategory));
    },
    []
  );

  const dispatchInstantAttendanceAlerts = useCallback(
    (savedRecords: AttendanceUpsertInput[]) => {
      const snapshot = latestDbRef.current;
      if (snapshot.automation.attendanceMode !== 'instant') return;
      const termId = snapshot.terms.find((t) => t.isActive)?.id ?? snapshot.terms[0]?.id ?? '';
      const normalized: AttendanceRecord[] = savedRecords.map((r) => ({
        ...r,
        id: r.id ?? 'tmp',
      }));
      const plan = buildAttendanceAlertPlan(snapshot, termId, normalized, false);
      if (plan.whatsappItems.length === 0 && plan.telegramTasks.length === 0) return;

      setDb((prev) => {
        let next = applyEnqueueWhatsAppItems(prev, plan.whatsappItems);
        next = applyMarkAutomationLog(next, plan.logKeys);
        return next;
      });

      if (plan.telegramTasks.length > 0 && snapshot.automation.telegramBotToken?.trim()) {
        const token = snapshot.automation.telegramBotToken.trim();
        void Promise.all(
          plan.telegramTasks.map((t) => sendTelegramMessage(token, t.chatId, t.message))
        );
      }
    },
    []
  );

  const upsertAttendance = useCallback(
    (record: AttendanceUpsertInput) => {
      setDb((prev) => applyBatchUpsertAttendance(prev, [record]));
      dispatchInstantAttendanceAlerts([record]);
    },
    [dispatchInstantAttendanceAlerts]
  );

  const batchUpsertAttendance = useCallback(
    (records: AttendanceUpsertInput[]) => {
      setDb((prev) => applyBatchUpsertAttendance(prev, records));
      dispatchInstantAttendanceAlerts(records);
    },
    [dispatchInstantAttendanceAlerts]
  );

  const deleteAttendance = useCallback(
    (date: string, studentId: string, lessonSlotId: string) => {
      setDb((prev) => applyDeleteAttendance(prev, date, studentId, lessonSlotId));
    },
    []
  );

  const upsertLesson = useCallback((lesson: LessonUpsertInput) => {
    setDb((prev) => applyUpsertLesson(prev, lesson));
  }, []);

  const batchUpsertLessons = useCallback((lessons: LessonUpsertInput[]) => {
    setDb((prev) => applyBatchUpsertLessons(prev, lessons));
  }, []);

  const deleteLesson = useCallback((lessonId: string) => {
    setDb((prev) => applyDeleteLesson(prev, lessonId));
  }, []);

  const updateFridaySettings = useCallback((patch: Partial<FridayLeaveSettings>) => {
    setDb((prev) => applyUpdateFridaySettings(prev, patch));
  }, []);

  const upsertFridayPermission = useCallback((record: FridayPermissionUpsertInput) => {
    setDb((prev) => applyUpsertFridayPermission(prev, record));
  }, []);

  const deleteFridayPermission = useCallback((date: string, studentId: string) => {
    setDb((prev) => applyDeleteFridayPermission(prev, date, studentId));
  }, []);

  const updateGradingSettings = useCallback((patch: Partial<GradingSettings>) => {
    setDb((prev) => applyUpdateGradingSettings(prev, patch));
  }, []);

  const upsertExam = useCallback((exam: ExamUpsertInput) => {
    setDb((prev) => applyUpsertExam(prev, exam));
  }, []);

  const deleteExam = useCallback((examId: string) => {
    setDb((prev) => applyDeleteExam(prev, examId));
  }, []);

  const upsertGrade = useCallback((grade: GradeUpsertInput) => {
    setDb((prev) => applyUpsertGrade(prev, grade));
  }, []);

  const deleteGrade = useCallback((gradeId: string) => {
    setDb((prev) => applyDeleteGrade(prev, gradeId));
  }, []);

  const batchCreateHomeworks = useCallback((items: HomeworkUpsertInput[]) => {
    setDb((prev) => applyBatchCreateHomeworks(prev, items));
  }, []);

  const updateHomeworkStatus = useCallback(
    (homeworkId: string, status: HomeworkStatus, note?: string) => {
      setDb((prev) => applyUpdateHomeworkStatus(prev, homeworkId, status, note));
    },
    []
  );

  const deleteHomeworkGroup = useCallback((assignmentKey: string) => {
    setDb((prev) => applyDeleteHomeworkGroup(prev, assignmentKey));
  }, []);

  const updateAutomationSettings = useCallback((patch: Partial<AutomationSettings>) => {
    setDb((prev) => applyUpdateAutomationSettings(prev, patch));
  }, []);

  const enqueueWhatsAppItems = useCallback((items: WhatsAppQueueItem[]) => {
    setDb((prev) => applyEnqueueWhatsAppItems(prev, items));
  }, []);

  const updateWhatsAppQueueItem = useCallback((itemId: string, message: string) => {
    setDb((prev) => applyUpdateWhatsAppQueueItem(prev, itemId, message));
  }, []);

  const removeWhatsAppQueueItem = useCallback((itemId: string) => {
    setDb((prev) => applyRemoveWhatsAppQueueItem(prev, itemId));
  }, []);

  const clearWhatsAppQueue = useCallback(() => {
    setDb((prev) => applyClearWhatsAppQueue(prev));
  }, []);

  const updateCloudSyncSettings = useCallback((patch: Partial<CloudSyncSettings>) => {
    setDb((prev) => applyUpdateCloudSyncSettings(prev, patch));
  }, []);

  const updateGuardianTelegramChatId = useCallback(
    (studentId: string, guardianId: string, chatId: string) => {
      setDb((prev) => applyUpdateGuardianTelegramChatId(prev, studentId, guardianId, chatId));
    },
    []
  );

  const runAutoEzberNow = useCallback((dateISO?: string): number => {
    const snapshot = latestDbRef.current;
    const termId = snapshot.terms.find((t) => t.isActive)?.id ?? snapshot.terms[0]?.id ?? '';
    const targetDate = dateISO || getTodayISO();
    const res = computeAutoEzberVermedi(snapshot, termId, targetDate);
    if (res.newLessons.length > 0 || res.logKeys.length > 0) {
      setDb((prev) => {
        let next = applyBatchUpsertLessons(prev, res.newLessons);
        next = applyMarkAutomationLog(next, res.logKeys);
        return next;
      });
    }
    return res.newLessons.length;
  }, []);

  const triggerManualDailyReportBatch = useCallback(
    async (dateISO?: string, studentIds?: string[]) => {
      const snapshot = latestDbRef.current;
      const termId = snapshot.terms.find((t) => t.isActive)?.id ?? snapshot.terms[0]?.id ?? '';
      const targetDate = dateISO || getTodayISO();
      const plan = buildDailyReportPlan(snapshot, termId, targetDate, {
        studentIds,
        ignoreProcessedLog: true,
      });

      if (plan.whatsappItems.length > 0) {
        setDb((prev) => applyEnqueueWhatsAppItems(prev, plan.whatsappItems));
      }

      let telegramSent = 0;
      let telegramFailed = 0;
      const token = snapshot.automation.telegramBotToken?.trim();
      if (token && plan.telegramTasks.length > 0) {
        const results = await Promise.all(
          plan.telegramTasks.map((t) => sendTelegramMessage(token, t.chatId, t.message))
        );
        results.forEach((r) => {
          if (r.ok) telegramSent += 1;
          else telegramFailed += 1;
        });
      }

      return {
        queued: plan.whatsappItems.length,
        telegramSent,
        telegramFailed,
      };
    },
    []
  );

  // Lightweight 60-second background automation scheduler (never per-second)
  useEffect(() => {
    const runTick = () => {
      const snapshot = latestDbRef.current;
      const termId = snapshot.terms.find((t) => t.isActive)?.id ?? snapshot.terms[0]?.id ?? '';
      const result = evaluateScheduledAutomationTick(snapshot, termId);
      if (
        result.autoEzberLessons.length === 0 &&
        result.whatsappItems.length === 0 &&
        result.telegramTasks.length === 0 &&
        result.logKeys.length === 0
      ) {
        return;
      }

      setDb((prev) => {
        let next = prev;
        if (result.autoEzberLessons.length > 0) {
          next = applyBatchUpsertLessons(next, result.autoEzberLessons);
        }
        if (result.whatsappItems.length > 0) {
          next = applyEnqueueWhatsAppItems(next, result.whatsappItems);
        }
        if (result.logKeys.length > 0) {
          next = applyMarkAutomationLog(next, result.logKeys);
        }
        return next;
      });

      const token = snapshot.automation.telegramBotToken?.trim();
      if (token && result.telegramTasks.length > 0) {
        void Promise.all(
          result.telegramTasks.map((t) => sendTelegramMessage(token, t.chatId, t.message))
        );
      }
    };

    const initialTimer = window.setTimeout(runTick, 3500);
    const intervalId = window.setInterval(runTick, 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
    };
  }, []);

  // Optional debounced auto cloud sync (only pushes when meaningful data changes)
  const autoCloudTimerRef = useRef<number | null>(null);
  const lastCloudFingerprintRef = useRef<string>('');
  useEffect(() => {
    if (!db.cloudSync.autoSyncEnabled || !db.cloudSync.webAppUrl.trim()) return;
    const fingerprint = `${db.students.length}|${db.attendance.length}|${db.lessons.length}|${db.grades.length}|${db.homeworks.length}|${db.fridayPermissions.length}|${db.schedule.length}`;
    if (lastCloudFingerprintRef.current === '') {
      lastCloudFingerprintRef.current = fingerprint;
      return;
    }
    if (lastCloudFingerprintRef.current === fingerprint) return;
    lastCloudFingerprintRef.current = fingerprint;

    if (autoCloudTimerRef.current !== null) {
      window.clearTimeout(autoCloudTimerRef.current);
    }
    autoCloudTimerRef.current = window.setTimeout(() => {
      const snap = latestDbRef.current;
      void pushDatabaseToCloud(snap.cloudSync.webAppUrl, snap.cloudSync.secretToken, snap).then(
        (res) => {
          if (res.ok) {
            setDb((prev) =>
              applyUpdateCloudSyncSettings(prev, {
                lastSyncedAt: res.updatedAt,
                lastSyncStatus: 'success',
                lastSyncMessage: 'Otomatik eşitlendi',
              })
            );
          }
        }
      );
    }, 6000);

    return () => {
      if (autoCloudTimerRef.current !== null) {
        window.clearTimeout(autoCloudTimerRef.current);
      }
    };
  }, [
    db.cloudSync.autoSyncEnabled,
    db.cloudSync.webAppUrl,
    db.students.length,
    db.attendance.length,
    db.lessons.length,
    db.grades.length,
    db.homeworks.length,
    db.fridayPermissions.length,
    db.schedule.length,
  ]);

  const setPageFilterPrefs = useCallback((pageKey: string, enabledOptionalIds: string[]) => {
    setDb((prev) => ({
      ...prev,
      filterPreferences: {
        ...prev.filterPreferences,
        [pageKey]: enabledOptionalIds,
      },
    }));
  }, []);

  const importDatabase = useCallback((incoming: AppDatabase, mode: 'replace' | 'merge') => {
    setDb((prev) => {
      if (mode === 'replace') {
        return {
          ...incoming,
          filterPreferences: {
            ...prev.filterPreferences,
            ...incoming.filterPreferences,
          },
        };
      }
      // Merge by ID, incoming overrides matching IDs
      const mergeById = <T extends { id: string }>(base: T[], extra: T[]): T[] => {
        const map = new Map<string, T>();
        base.forEach((item) => map.set(item.id, item));
        extra.forEach((item) => map.set(item.id, item));
        return Array.from(map.values());
      };

      return {
        ...prev,
        institution: incoming.institution ?? prev.institution,
        terms: mergeById(prev.terms, incoming.terms),
        classes: mergeById(prev.classes, incoming.classes),
        lessonSlots: mergeById(prev.lessonSlots, incoming.lessonSlots),
        teachers: mergeById(prev.teachers, incoming.teachers),
        students: mergeById(prev.students, incoming.students),
        schedule: mergeById(prev.schedule, incoming.schedule),
        topicPool: mergeById(prev.topicPool, incoming.topicPool),
        attendance: mergeById(prev.attendance, incoming.attendance),
        lessons: mergeById(prev.lessons, incoming.lessons),
        exams: mergeById(prev.exams, incoming.exams),
        grades: mergeById(prev.grades, incoming.grades),
        gradingSettings: { ...prev.gradingSettings, ...(incoming.gradingSettings ?? {}) },
        homeworks: mergeById(prev.homeworks, incoming.homeworks),
        fridayPermissions: mergeById(prev.fridayPermissions, incoming.fridayPermissions),
        fridaySettings: { ...prev.fridaySettings, ...(incoming.fridaySettings ?? {}) },
        automation: {
          ...prev.automation,
          ...(incoming.automation ?? {}),
          templates: {
            ...prev.automation.templates,
            ...(incoming.automation?.templates ?? {}),
          },
          dailyReportSections: {
            ...prev.automation.dailyReportSections,
            ...(incoming.automation?.dailyReportSections ?? {}),
          },
          portalSettings: {
            ...prev.automation.portalSettings,
            ...(incoming.automation?.portalSettings ?? {}),
          },
        },
        cloudSync: incoming.cloudSync?.webAppUrl
          ? { ...prev.cloudSync, ...incoming.cloudSync }
          : prev.cloudSync,
        automationLog: { ...(prev.automationLog ?? {}), ...(incoming.automationLog ?? {}) },
      };
    });
  }, []);

  const resetToSeedData = useCallback(() => {
    const fresh = createSeedDatabase();
    setDb(fresh);
  }, []);

  const activeTerm = useMemo(
    () => db.terms.find((t) => t.isActive) ?? db.terms[0],
    [db.terms]
  );

  const value = useMemo<AppStoreContextValue>(
    () => ({
      db,
      activeTerm,
      storageSizeKB,
      toast,
      showToast,
      dismissToast,
      updateInstitution,
      upsertTerm,
      deleteTerm,
      setActiveTerm,
      upsertClass,
      deleteClass,
      upsertLessonSlot,
      deleteLessonSlot,
      upsertStudent,
      deleteStudent,
      upsertTeacher,
      deleteTeacher,
      upsertScheduleEntry,
      deleteScheduleEntry,
      copyDaySchedule,
      upsertTopic,
      deleteTopic,
      reorderTopic,
      upsertAttendance,
      batchUpsertAttendance,
      deleteAttendance,
      upsertLesson,
      batchUpsertLessons,
      deleteLesson,
      updateFridaySettings,
      upsertFridayPermission,
      deleteFridayPermission,
      updateGradingSettings,
      upsertExam,
      deleteExam,
      upsertGrade,
      deleteGrade,
      batchCreateHomeworks,
      updateHomeworkStatus,
      deleteHomeworkGroup,
      updateAutomationSettings,
      enqueueWhatsAppItems,
      updateWhatsAppQueueItem,
      removeWhatsAppQueueItem,
      clearWhatsAppQueue,
      updateCloudSyncSettings,
      updateGuardianTelegramChatId,
      triggerManualDailyReportBatch,
      runAutoEzberNow,
      setPageFilterPrefs,
      importDatabase,
      resetToSeedData,
    }),
    [
      db,
      activeTerm,
      storageSizeKB,
      toast,
      showToast,
      dismissToast,
      updateInstitution,
      upsertTerm,
      deleteTerm,
      setActiveTerm,
      upsertClass,
      deleteClass,
      upsertLessonSlot,
      deleteLessonSlot,
      upsertStudent,
      deleteStudent,
      upsertTeacher,
      deleteTeacher,
      upsertScheduleEntry,
      deleteScheduleEntry,
      copyDaySchedule,
      upsertTopic,
      deleteTopic,
      reorderTopic,
      upsertAttendance,
      batchUpsertAttendance,
      deleteAttendance,
      upsertLesson,
      batchUpsertLessons,
      deleteLesson,
      updateFridaySettings,
      upsertFridayPermission,
      deleteFridayPermission,
      updateGradingSettings,
      upsertExam,
      deleteExam,
      upsertGrade,
      deleteGrade,
      batchCreateHomeworks,
      updateHomeworkStatus,
      deleteHomeworkGroup,
      updateAutomationSettings,
      enqueueWhatsAppItems,
      updateWhatsAppQueueItem,
      removeWhatsAppQueueItem,
      clearWhatsAppQueue,
      updateCloudSyncSettings,
      updateGuardianTelegramChatId,
      triggerManualDailyReportBatch,
      runAutoEzberNow,
      setPageFilterPrefs,
      importDatabase,
      resetToSeedData,
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
};

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error('useAppStore must be used inside AppStoreProvider');
  }
  return ctx;
}

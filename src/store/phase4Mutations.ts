import type {
  AppDatabase,
  ExamDefinition,
  FridayLeaveSettings,
  FridayPermissionRecord,
  GradeRecord,
  GradingSettings,
  HomeworkRecord,
  HomeworkStatus,
} from '../types';
import { createId, getCurrentTimeHHmm } from '../utils/id';

export type FridayPermissionUpsertInput = Omit<FridayPermissionRecord, 'id'> & { id?: string };
export type ExamUpsertInput = Omit<ExamDefinition, 'id'> & { id?: string };
export type GradeUpsertInput = Omit<GradeRecord, 'id'> & { id?: string };
export type HomeworkUpsertInput = Omit<HomeworkRecord, 'id'> & { id?: string };

export function applyUpdateFridaySettings(
  prev: AppDatabase,
  patch: Partial<FridayLeaveSettings>
): AppDatabase {
  return {
    ...prev,
    fridaySettings: {
      ...prev.fridaySettings,
      ...patch,
    },
  };
}

export function applyUpsertFridayPermission(
  prev: AppDatabase,
  input: FridayPermissionUpsertInput
): AppDatabase {
  const existingIdx = prev.fridayPermissions.findIndex(
    (r) =>
      (input.id && r.id === input.id) ||
      (r.date === input.date && r.studentId === input.studentId)
  );
  const record: FridayPermissionRecord = {
    ...(existingIdx >= 0 ? prev.fridayPermissions[existingIdx] : {}),
    ...input,
    id: existingIdx >= 0 ? prev.fridayPermissions[existingIdx].id : input.id ?? createId('fri'),
  };

  const next =
    existingIdx >= 0
      ? prev.fridayPermissions.map((r, i) => (i === existingIdx ? record : r))
      : [...prev.fridayPermissions, record];

  return { ...prev, fridayPermissions: next };
}

export function applyDeleteFridayPermission(
  prev: AppDatabase,
  date: string,
  studentId: string
): AppDatabase {
  return {
    ...prev,
    fridayPermissions: prev.fridayPermissions.filter(
      (r) => !(r.date === date && r.studentId === studentId)
    ),
  };
}

export function applyUpdateGradingSettings(
  prev: AppDatabase,
  patch: Partial<GradingSettings>
): AppDatabase {
  return {
    ...prev,
    gradingSettings: {
      ...prev.gradingSettings,
      ...patch,
    },
  };
}

export function applyUpsertExam(prev: AppDatabase, input: ExamUpsertInput): AppDatabase {
  const record: ExamDefinition = {
    ...input,
    id: input.id || createId('exm'),
  };
  const exists = prev.exams.some((e) => e.id === record.id);
  return {
    ...prev,
    exams: exists
      ? prev.exams.map((e) => (e.id === record.id ? record : e))
      : [...prev.exams, record],
  };
}

export function applyDeleteExam(prev: AppDatabase, examId: string): AppDatabase {
  return {
    ...prev,
    exams: prev.exams.filter((e) => e.id !== examId),
    grades: prev.grades.filter((g) => g.examId !== examId),
  };
}

export function applyUpsertGrade(prev: AppDatabase, input: GradeUpsertInput): AppDatabase {
  const idx = prev.grades.findIndex(
    (g) =>
      (input.id && g.id === input.id) ||
      (input.examId && g.examId === input.examId && g.studentId === input.studentId) ||
      (!input.examId &&
        input.category === 'Kanaat' &&
        g.category === 'Kanaat' &&
        !g.examId &&
        g.termId === input.termId &&
        g.studentId === input.studentId)
  );

  const record: GradeRecord = {
    ...(idx >= 0 ? prev.grades[idx] : {}),
    ...input,
    id: idx >= 0 ? prev.grades[idx].id : input.id ?? createId('grd'),
  };

  const next =
    idx >= 0
      ? prev.grades.map((g, i) => (i === idx ? record : g))
      : [...prev.grades, record];

  return { ...prev, grades: next };
}

export function applyDeleteGrade(prev: AppDatabase, gradeId: string): AppDatabase {
  return {
    ...prev,
    grades: prev.grades.filter((g) => g.id !== gradeId),
  };
}

export function applyBatchCreateHomeworks(
  prev: AppDatabase,
  inputs: HomeworkUpsertInput[]
): AppDatabase {
  if (inputs.length === 0) return prev;
  const created: HomeworkRecord[] = inputs.map((item) => ({
    ...item,
    id: item.id || createId('hw'),
  }));
  return {
    ...prev,
    homeworks: [...prev.homeworks, ...created],
  };
}

export function applyUpdateHomeworkStatus(
  prev: AppDatabase,
  homeworkId: string,
  status: HomeworkStatus,
  note?: string
): AppDatabase {
  const nowTime = getCurrentTimeHHmm();
  return {
    ...prev,
    homeworks: prev.homeworks.map((hw) =>
      hw.id === homeworkId
        ? {
            ...hw,
            status,
            checkedAt: nowTime,
            note: note !== undefined ? note : hw.note,
          }
        : hw
    ),
  };
}

export function applyDeleteHomeworkGroup(
  prev: AppDatabase,
  assignmentKey: string
): AppDatabase {
  return {
    ...prev,
    homeworks: prev.homeworks.filter((hw) => {
      const key = hw.assignmentId || `${hw.title}|${hw.dueDate}`;
      return key !== assignmentKey;
    }),
  };
}

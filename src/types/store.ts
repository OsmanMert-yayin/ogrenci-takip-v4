import type {
  AttendanceRecord,
  AutomationSettings,
  CloudSyncSettings,
  ExamDefinition,
  FridayLeaveSettings,
  FridayPermissionRecord,
  GradeRecord,
  GradingSettings,
  HomeworkRecord,
  LessonRecord,
  ScheduleEntry,
  TopicPoolItem,
  WhatsAppQueueItem,
} from './academic';
import type { AcademicTerm, ClassGroup, InstitutionInfo, LessonSlot } from './institution';
import type { Student, Teacher } from './people';

export type FilterPreferencesMap = Record<string, string[]>;

export interface AppDatabase {
  schemaVersion: 4;
  exportedAt?: string;
  institution: InstitutionInfo;
  terms: AcademicTerm[];
  classes: ClassGroup[];
  lessonSlots: LessonSlot[];
  teachers: Teacher[];
  students: Student[];
  schedule: ScheduleEntry[];
  topicPool: TopicPoolItem[];
  attendance: AttendanceRecord[];
  lessons: LessonRecord[];
  exams: ExamDefinition[];
  grades: GradeRecord[];
  gradingSettings: GradingSettings;
  homeworks: HomeworkRecord[];
  fridayPermissions: FridayPermissionRecord[];
  fridaySettings: FridayLeaveSettings;
  automation: AutomationSettings;
  whatsappQueue: WhatsAppQueueItem[];
  cloudSync: CloudSyncSettings;
  automationLog: Record<string, string>;
  filterPreferences: FilterPreferencesMap;
}

export interface ImportMappingReport {
  sourceVersion: 'v4' | 'v3-legacy' | 'partial';
  counts: {
    terms: number;
    classes: number;
    lessonSlots: number;
    teachers: number;
    students: number;
    attendance: number;
    lessons: number;
    otherRecords: number;
  };
  warnings: string[];
  mappedDatabase: AppDatabase;
}

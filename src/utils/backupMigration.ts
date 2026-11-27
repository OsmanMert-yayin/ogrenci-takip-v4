import type {
  AcademicTerm,
  AppDatabase,
  AttendanceRecord,
  AttendanceStatus,
  ClassGroup,
  GroupShiftType,
  GuardianContact,
  GuardianRelation,
  ImportMappingReport,
  LessonRecord,
  LessonSlot,
  NotificationPreference,
  ProgramType,
  Student,
  StudentStatus,
  Teacher,
} from '../types';
import {
  migrateAttendanceFromBackup,
  migrateLessonsFromBackup,
  migrateScheduleFromBackup,
  migrateTopicPoolFromBackup,
} from './backupCurriculumMigration';
import {
  migrateExamsAndGradesFromBackup,
  migrateFridayFromBackup,
  migrateHomeworksFromBackup,
} from './backupPhase4Migration';
import {
  migrateAutomationFromBackup,
  migrateCloudSyncFromBackup,
  migrateWhatsAppQueueFromBackup,
} from './backupPhase5Migration';
import { createId, getTodayISO } from './id';
import { createSeedDatabase } from './seedData';

type AnyRecord = Record<string, unknown>;

function asRecord(val: unknown): AnyRecord {
  return val && typeof val === 'object' && !Array.isArray(val) ? (val as AnyRecord) : {};
}

function asArray(val: unknown): AnyRecord[] {
  return Array.isArray(val) ? val.map((item) => asRecord(item)) : [];
}

function pickStr(obj: AnyRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 0) return val.trim();
    if (typeof val === 'number') return String(val);
  }
  return fallback;
}

function pickBool(obj: AnyRecord, keys: string[], fallback: boolean): boolean {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'boolean') return val;
    if (val === 'true' || val === 1 || val === 'Aktif') return true;
    if (val === 'false' || val === 0 || val === 'Pasif') return false;
  }
  return fallback;
}

function pickNum(obj: AnyRecord, keys: string[], fallback: number): number {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) {
      return Number(val);
    }
  }
  return fallback;
}

function pickArray(root: AnyRecord, keys: string[]): AnyRecord[] {
  for (const key of keys) {
    if (Array.isArray(root[key])) return asArray(root[key]);
  }
  return [];
}

function normalizeShift(raw: string): GroupShiftType {
  const lower = raw.toLocaleLowerCase('tr-TR');
  if (lower.includes('öğle') || lower.includes('ogle') || lower.includes('afternoon')) {
    return 'Öğleden Sonra';
  }
  if (lower.includes('yatı') || lower.includes('yati') || lower.includes('board')) {
    return 'Yatılı';
  }
  if (lower.includes('tam') || lower.includes('full')) return 'Tam Gün';
  return 'Sabah';
}

function normalizeProgram(raw: string): ProgramType {
  const lower = raw.toLocaleLowerCase('tr-TR');
  if (lower.includes('hafız') || lower.includes('hafiz')) return 'Hafızlık';
  return 'Yüzüne & Ezber';
}

function normalizeStudentStatus(raw: string, activeBool?: boolean): StudentStatus {
  const lower = raw.toLocaleLowerCase('tr-TR');
  if (lower.includes('mezun')) return 'Mezun';
  if (lower.includes('dondur')) return 'Kayıt Dondurdu';
  if (lower.includes('pasif') || lower.includes('ayrıl') || activeBool === false) return 'Pasif';
  return 'Aktif';
}

const VALID_RELATIONS: GuardianRelation[] = [
  'Baba',
  'Anne',
  'Dede',
  'Babaanne',
  'Anneanne',
  'Ağabey',
  'Abla',
  'Amca',
  'Dayı',
  'Teyze',
  'Hala',
  'Vasi',
  'Diğer',
];

function normalizeRelation(raw: string): GuardianRelation {
  const match = VALID_RELATIONS.find(
    (rel) => rel.toLocaleLowerCase('tr-TR') === raw.toLocaleLowerCase('tr-TR')
  );
  if (match) return match;
  const lower = raw.toLocaleLowerCase('tr-TR');
  if (lower.includes('abi') || lower.includes('agabey')) return 'Ağabey';
  if (lower.includes('father')) return 'Baba';
  if (lower.includes('mother')) return 'Anne';
  return 'Baba';
}

function normalizeNotifPref(raw: string): NotificationPreference {
  const lower = raw.toLocaleLowerCase('tr-TR');
  if (lower.includes('sms')) return 'SMS';
  if (lower.includes('ara') || lower.includes('tel') || lower.includes('call')) return 'Arama';
  if (lower.includes('yok') || lower.includes('istem') || lower.includes('none')) {
    return 'Bildirim İstemiyor';
  }
  return 'WhatsApp';
}

function normalizeAttendanceStatus(raw: string): AttendanceStatus {
  const lower = raw.toLocaleLowerCase('tr-TR');
  if (lower.includes('izinsiz')) return 'Kurstan İzinsiz Çıktı';
  if (lower.includes('derse girmedi') || lower.includes('girmedi')) return 'Derse Girmedi';
  if (lower.includes('geç') || lower.includes('gec') || lower.includes('late')) return 'Geç Geldi';
  if (lower.includes('izin') || lower.includes('excused')) return 'İzinli';
  if (lower.includes('gelmedi') || lower.includes('yok') || lower.includes('absent')) {
    return 'Gelmedi';
  }
  return 'Geldi';
}

export function exportDatabaseToJson(db: AppDatabase): void {
  const payload: AppDatabase = {
    ...db,
    schemaVersion: 4,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ogrenci_takip_v4_yedek_${getTodayISO()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function parseAndMigrateBackup(rawInput: unknown): ImportMappingReport {
  const seed = createSeedDatabase();
  const outer = asRecord(rawInput);
  // Support backups wrapped in { data: {...} } or { state: {...} } or { db: {...} }
  const root =
    outer.data && typeof outer.data === 'object'
      ? asRecord(outer.data)
      : outer.state && typeof outer.state === 'object'
        ? asRecord(outer.state)
        : outer.db && typeof outer.db === 'object'
          ? asRecord(outer.db)
          : outer;

  const isV4 = root.schemaVersion === 4;
  const warnings: string[] = [];

  // 1. Institution
  const rawInst = asRecord(
    root.institution ?? root.kurum ?? root.kurumBilgileri ?? root.settings ?? {}
  );
  const institution = {
    id: pickStr(rawInst, ['id'], seed.institution.id),
    name: pickStr(
      rawInst,
      ['name', 'kurumAdi', 'kurum_adi', 'institutionName', 'title'],
      seed.institution.name
    ),
    district: pickStr(rawInst, ['district', 'ilce'], seed.institution.district),
    city: pickStr(rawInst, ['city', 'il', 'sehir'], seed.institution.city),
    phone: pickStr(rawInst, ['phone', 'telefon', 'tel'], seed.institution.phone),
    managerName: pickStr(
      rawInst,
      ['managerName', 'mudur', 'yonetici', 'manager'],
      seed.institution.managerName
    ),
    address: pickStr(rawInst, ['address', 'adres'], seed.institution.address),
    updatedAt: new Date().toISOString(),
  };

  // 2. Terms
  const rawTerms = pickArray(root, ['terms', 'donemler', 'academicTerms', 'akademikDonemler']);
  const terms: AcademicTerm[] =
    rawTerms.length > 0
      ? rawTerms.map((t, idx) => ({
          id: pickStr(t, ['id', 'donemId'], createId('term')),
          name: pickStr(t, ['name', 'ad', 'donemAdi', 'title'], `Dönem ${idx + 1}`),
          startDate: pickStr(t, ['startDate', 'baslangic', 'baslangicTarihi'], '2026-09-01'),
          endDate: pickStr(t, ['endDate', 'bitis', 'bitisTarihi'], '2027-06-30'),
          isActive: pickBool(t, ['isActive', 'aktif', 'active'], idx === 0),
          notes: pickStr(t, ['notes', 'not', 'aciklama']),
        }))
      : seed.terms;

  if (!terms.some((t) => t.isActive) && terms.length > 0) {
    terms[0].isActive = true;
  }
  const activeTermId = terms.find((t) => t.isActive)?.id ?? terms[0]?.id ?? 'term_default';

  // 3. Teachers
  const rawTeachers = pickArray(root, ['teachers', 'ogretmenler', 'hocalar', 'instructors']);
  const teachers: Teacher[] = rawTeachers.map((t, idx) => {
    const rawAssigned = t.assignedClassIds ?? t.siniflar ?? t.classIds;
    const assignedClassIds = Array.isArray(rawAssigned)
      ? rawAssigned.map((v) => String(v))
      : [];
    return {
      id: pickStr(t, ['id', 'teacherId', 'hocaId'], createId('tch')),
      fullName: pickStr(
        t,
        ['fullName', 'adSoyad', 'ad_soyad', 'name', 'isim'],
        `Öğretmen ${idx + 1}`
      ),
      title: pickStr(t, ['title', 'unvan', 'brans'], "Kur'an Kursu Öğreticisi"),
      phone: pickStr(t, ['phone', 'telefon', 'tel']),
      email: pickStr(t, ['email', 'eposta']),
      assignedClassIds,
      isActive: pickBool(t, ['isActive', 'aktif', 'active'], true),
      notes: pickStr(t, ['notes', 'not']),
      createdAt: pickStr(t, ['createdAt'], new Date().toISOString()),
    };
  });

  // 4. Classes
  const rawClasses = pickArray(root, ['classes', 'siniflar', 'groups', 'gruplar', 'classGroups']);
  const classes: ClassGroup[] = rawClasses.map((c, idx) => ({
    id: pickStr(c, ['id', 'classId', 'sinifId'], createId('cls')),
    termId: pickStr(c, ['termId', 'donemId'], activeTermId),
    name: pickStr(c, ['name', 'ad', 'sinifAdi', 'grupAdi', 'title'], `Sınıf ${idx + 1}`),
    shiftType: normalizeShift(
      pickStr(c, ['shiftType', 'grupTipi', 'vakit', 'shift', 'type'], 'Sabah')
    ),
    roomName: pickStr(c, ['roomName', 'derslik', 'oda', 'room']),
    capacity: pickNum(c, ['capacity', 'kapasite', 'kontenjan'], 20),
    teacherId: pickStr(c, ['teacherId', 'hocaId', 'ogretmenId']) || undefined,
    notes: pickStr(c, ['notes', 'not', 'aciklama']),
    isActive: pickBool(c, ['isActive', 'aktif', 'active'], true),
  }));

  // 5. Lesson Slots
  const rawSlots = pickArray(root, [
    'lessonSlots',
    'dersSaatleri',
    'saatler',
    'slots',
    'timeSlots',
  ]);
  const lessonSlots: LessonSlot[] =
    rawSlots.length > 0
      ? rawSlots.map((s, idx) => {
          const catRaw = pickStr(s, ['category', 'tur', 'tip', 'type', 'isEtut'], 'normal');
          const isEtut =
            s.isEtut === true ||
            catRaw.toLocaleLowerCase('tr-TR').includes('etüt') ||
            catRaw.toLocaleLowerCase('tr-TR').includes('etut') ||
            catRaw.toLocaleLowerCase('tr-TR').includes('mütalaa');
          const reqRaw = pickStr(s, ['requirement', 'zorunluluk', 'durum'], 'zorunlu');
          const isOptional =
            s.isOptional === true ||
            reqRaw.toLocaleLowerCase('tr-TR').includes('seçmeli') ||
            reqRaw.toLocaleLowerCase('tr-TR').includes('secmeli');

          return {
            id: pickStr(s, ['id', 'slotId'], createId('slot')),
            name: pickStr(s, ['name', 'ad', 'baslik', 'label'], `${idx + 1}. Ders`),
            startTime: pickStr(s, ['startTime', 'baslangic', 'baslamaSaati', 'start'], '08:00'),
            endTime: pickStr(s, ['endTime', 'bitis', 'bitisSaati', 'end'], '09:00'),
            category: isEtut ? 'etut' : 'normal',
            requirement: isOptional ? 'secmeli' : 'zorunlu',
            order: pickNum(s, ['order', 'sira'], idx + 1),
            isActive: pickBool(s, ['isActive', 'aktif'], true),
          };
        })
      : seed.lessonSlots;

  // 6. Students (flexible v3 field mapping)
  const rawStudents = pickArray(root, ['students', 'ogrenciler', 'studentList', 'talebe']);
  const defaultClassId = classes[0]?.id ?? '';
  const students: Student[] = rawStudents.map((st, idx) => {
    const rawLevels = asRecord(st.levels ?? st.seviyeler ?? {});
    const guardiansRaw = Array.isArray(st.guardians)
      ? asArray(st.guardians)
      : Array.isArray(st.veliler)
        ? asArray(st.veliler)
        : Array.isArray(st.parents)
          ? asArray(st.parents)
          : [];

    const guardians: GuardianContact[] = guardiansRaw.map((g, gIdx) => ({
      id: pickStr(g, ['id'], createId('grd')),
      fullName: pickStr(g, ['fullName', 'adSoyad', 'name', 'veliAdi', 'ad'], 'Veli'),
      phone: pickStr(g, ['phone', 'telefon', 'tel', 'gsm']),
      relation: normalizeRelation(pickStr(g, ['relation', 'yakinlik', 'derece'], 'Baba')),
      notificationPreference: normalizeNotifPref(
        pickStr(g, ['notificationPreference', 'bildirimTercihi', 'bildirim'], 'WhatsApp')
      ),
      telegramChatId: pickStr(g, ['telegramChatId', 'telegramId', 'chatId']) || undefined,
      isPrimary: pickBool(g, ['isPrimary', 'birincil'], gIdx === 0),
      notes: pickStr(g, ['notes', 'not']),
    }));

    // Handle flat v3 guardian fields (e.g. veliAdi, veliTelefon, babaAdi, anneTelefon)
    if (guardians.length === 0) {
      const flatName = pickStr(st, ['veliAdi', 'veli_adi', 'parentName', 'babaAdi']);
      const flatPhone = pickStr(st, ['veliTelefon', 'veli_tel', 'parentPhone', 'telefon', 'phone']);
      if (flatName || flatPhone) {
        guardians.push({
          id: createId('grd'),
          fullName: flatName || 'Birincil Veli',
          phone: flatPhone,
          relation: normalizeRelation(pickStr(st, ['veliYakinlik', 'yakinlik'], 'Baba')),
          notificationPreference: 'WhatsApp',
          isPrimary: true,
        });
      }
      const momName = pickStr(st, ['anneAdi', 'anne_adi']);
      const momPhone = pickStr(st, ['anneTelefon', 'anne_tel']);
      if (momName || momPhone) {
        guardians.push({
          id: createId('grd'),
          fullName: momName || 'Anne',
          phone: momPhone,
          relation: 'Anne',
          notificationPreference: 'WhatsApp',
          isPrimary: guardians.length === 0,
        });
      }
    }

    const firstName = pickStr(st, ['firstName', 'ad', 'isim']);
    const lastName = pickStr(st, ['lastName', 'soyad']);
    const combinedName = `${firstName} ${lastName}`.trim();

    let resolvedClassId = pickStr(st, ['classId', 'sinifId', 'sinif_id', 'grupId']);
    if (!resolvedClassId) {
      const classNameRef = pickStr(st, ['className', 'sinif', 'sinifAdi', 'grup']);
      const matchedClass = classes.find(
        (c) => c.name.toLocaleLowerCase('tr-TR') === classNameRef.toLocaleLowerCase('tr-TR')
      );
      resolvedClassId = matchedClass?.id ?? defaultClassId;
    }

    return {
      id: pickStr(st, ['id', 'studentId', 'ogrenciId'], createId('std')),
      studentNo: pickStr(st, ['studentNo', 'numara', 'no', 'okulNo']),
      fullName: pickStr(
        st,
        ['fullName', 'adSoyad', 'ad_soyad', 'name', 'ogrenciAdi'],
        combinedName || `Öğrenci ${idx + 1}`
      ),
      classId: resolvedClassId,
      programType: normalizeProgram(
        pickStr(st, ['programType', 'program', 'programTuru', 'alan'], 'Yüzüne & Ezber')
      ),
      levels: {
        yuzune: pickStr(
          rawLevels,
          ['yuzune', 'yuzuneSeviye'],
          pickStr(st, ['yuzune', 'yuzuneSeviye', 'kuranSeviye'], 'Belirtilmedi')
        ),
        ezber: pickStr(
          rawLevels,
          ['ezber', 'ezberSeviye', 'hafizlik'],
          pickStr(st, ['ezber', 'ezberSeviye', 'hafizlikDurumu'], 'Belirtilmedi')
        ),
        tecvid: pickStr(
          rawLevels,
          ['tecvid', 'tecvidSeviye'],
          pickStr(st, ['tecvid', 'tecvidSeviye'], 'Başlangıç')
        ),
      },
      status: normalizeStudentStatus(
        pickStr(st, ['status', 'durum'], 'Aktif'),
        typeof st.isActive === 'boolean' ? st.isActive : undefined
      ),
      birthYear: pickStr(st, ['birthYear', 'dogumYili', 'dogum_yili']),
      enrollmentDate: pickStr(st, ['enrollmentDate', 'kayitTarihi', 'kayit_tarihi'], getTodayISO()),
      guardians,
      notes: pickStr(st, ['notes', 'not', 'aciklama']),
      createdAt: pickStr(st, ['createdAt'], new Date().toISOString()),
      updatedAt: new Date().toISOString(),
    };
  });

  // 7. Attendance (v3 + v4 compatible, supports daily + all 6 statuses including KİÇ)
  const attendance: AttendanceRecord[] = migrateAttendanceFromBackup(
    root,
    defaultClassId,
    lessonSlots
  );

  // 8. Lesson Records (v3 + v4 compatible, preserving score, status, amount, turCount, makeupOfId, combinedSessionId, recordedTime)
  const lessons: LessonRecord[] = migrateLessonsFromBackup(root, defaultClassId);

  // Preserve and migrate Phase 2-5 tables (v3 + v4 compatible)
  const schedule = migrateScheduleFromBackup(
    root,
    activeTermId,
    classes,
    lessonSlots,
    isV4 ? [] : seed.schedule
  );
  const topicPool = migrateTopicPoolFromBackup(root, seed.topicPool);
  const { exams, grades, gradingSettings } = migrateExamsAndGradesFromBackup(
    root,
    activeTermId,
    seed.gradingSettings
  );
  const homeworks = migrateHomeworksFromBackup(root, defaultClassId);
  const { fridayPermissions, fridaySettings } = migrateFridayFromBackup(
    root,
    seed.fridaySettings
  );
  const automation = migrateAutomationFromBackup(root, seed.automation);
  const cloudSync = migrateCloudSyncFromBackup(root, seed.cloudSync);
  const whatsappQueue = migrateWhatsAppQueueFromBackup(root);
  const automationLog = asRecord(root.automationLog) as Record<string, string>;
  const filterPreferences = asRecord(root.filterPreferences) as AppDatabase['filterPreferences'];

  if (!isV4) {
    warnings.push(
      'Dosya eski sürüm (v3 veya harici JSON) biçiminde algılandı; alan adları otomatik olarak v4 şemasına eşleştirildi.'
    );
  }
  if (rawStudents.length === 0 && rawClasses.length === 0 && rawTeachers.length === 0) {
    warnings.push('Dosyada öğrenci, sınıf veya öğretmen kaydı bulunamadı.');
  }

  const mappedDatabase: AppDatabase = {
    schemaVersion: 4,
    institution,
    terms,
    classes,
    lessonSlots,
    teachers,
    students,
    schedule,
    topicPool,
    attendance,
    lessons,
    exams,
    grades,
    gradingSettings,
    homeworks,
    fridayPermissions,
    fridaySettings,
    automation,
    whatsappQueue,
    cloudSync,
    automationLog,
    filterPreferences,
  };

  const sourceVersion = isV4
    ? 'v4'
    : rawStudents.length > 0 || rawClasses.length > 0
      ? 'v3-legacy'
      : 'partial';

  return {
    sourceVersion,
    counts: {
      terms: terms.length,
      classes: classes.length,
      lessonSlots: lessonSlots.length,
      teachers: teachers.length,
      students: students.length,
      attendance: attendance.length,
      lessons: lessons.length,
      otherRecords:
        schedule.length + exams.length + grades.length + homeworks.length + fridayPermissions.length,
    },
    warnings,
    mappedDatabase,
  };
}

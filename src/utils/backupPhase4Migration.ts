import type {
  DayOfWeek,
  ExamDefinition,
  ExamType,
  FridayLeaveSettings,
  FridayPermissionRecord,
  FridayPermissionStatus,
  GradeRecord,
  GradingSettings,
  HomeworkRecord,
  HomeworkStatus,
} from '../types';
import { createId, getTodayISO } from './id';

type AnyRecord = Record<string, unknown>;

function asRecord(val: unknown): AnyRecord {
  return val && typeof val === 'object' && !Array.isArray(val) ? (val as AnyRecord) : {};
}

function pickArray(root: AnyRecord, keys: string[]): AnyRecord[] {
  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key].map((item) => asRecord(item));
  }
  return [];
}

function pickStr(obj: AnyRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 0) return val.trim();
    if (typeof val === 'number') return String(val);
  }
  return fallback;
}

function pickNum(obj: AnyRecord, keys: string[], fallback?: number): number | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) {
      return Number(val);
    }
  }
  return fallback;
}

function normalizeExamType(raw: string): ExamType {
  const s = raw.toLocaleLowerCase('tr-TR');
  if (s.includes('kanaat')) return 'Kanaat';
  if (s.includes('söz') || s.includes('soz') || s.includes('uygulama')) return 'Sözlü';
  return 'Yazılı';
}

function normalizeHomeworkStatusV3(raw: string): HomeworkStatus {
  const s = raw.toLocaleLowerCase('tr-TR');
  if (s.includes('geç') || s.includes('gec')) return 'Geç Getirdi';
  if (s.includes('eksik') || s.includes('yarım') || s.includes('yarim')) return 'Eksik';
  if (s.includes('yapmadı') || s.includes('yapmadi') || s.includes('yapılmadı')) return 'Yapmadı';
  if (s.includes('yaptı') || s.includes('yapti') || s.includes('tamam')) return 'Yaptı';
  return 'Verildi';
}

function normalizeFridayStatusV3(raw: string, manualApproval?: boolean): FridayPermissionStatus {
  const s = raw.toLocaleLowerCase('tr-TR');
  if (s.includes('döndü') || s.includes('dondu')) return 'Döndü';
  if (s.includes('teslim') || s.includes('veli')) return 'Veli Teslim Aldı';
  if (s.includes('kaldı') || s.includes('kaldi') || s.includes('red') || s.includes('engel')) {
    return 'Kursta Kaldı';
  }
  if (s.includes('mazeret') || s.includes('onay') || manualApproval) return 'Mazeretli Onaylı';
  return 'İzinli Çıktı';
}

export function migrateExamsAndGradesFromBackup(
  root: AnyRecord,
  activeTermId: string,
  fallbackSettings: GradingSettings
): { exams: ExamDefinition[]; grades: GradeRecord[]; gradingSettings: GradingSettings } {
  const rawExams = pickArray(root, ['exams', 'sinavlar', 'sinavTanimlari', 'assessments']);
  const exams: ExamDefinition[] = rawExams.map((e, idx) => ({
    id: pickStr(e, ['id', 'examId', 'sinavId'], createId('exm')),
    termId: pickStr(e, ['termId', 'donemId'], activeTermId),
    classId: pickStr(e, ['classId', 'sinifId', 'grupId'], '__all__'),
    title: pickStr(e, ['title', 'ad', 'sinavAdi', 'name'], `Sınav ${idx + 1}`),
    subjectName: pickStr(e, ['subjectName', 'ders', 'dersAdi', 'subject'], 'Talim Tecvid'),
    topicTitle: pickStr(e, ['topicTitle', 'konu', 'icerik']) || undefined,
    date: pickStr(e, ['date', 'tarih'], getTodayISO()),
    examType: normalizeExamType(pickStr(e, ['examType', 'tur', 'tip', 'type'], 'Yazılı')),
    weight: Math.max(0, Math.min(100, pickNum(e, ['weight', 'agirlik', 'yuzde'], 40) ?? 40)),
    maxScore: pickNum(e, ['maxScore', 'tamPuan'], 100),
  }));

  const rawGrades = pickArray(root, ['grades', 'notlar', 'sinavNotlari', 'kanaatNotlari', 'gradeRecords']);
  const grades: GradeRecord[] = [];
  for (const g of rawGrades) {
    const studentId = pickStr(g, ['studentId', 'ogrenciId', 'ogrenci_id']);
    if (!studentId) continue;

    const catRaw = pickStr(g, ['category', 'kategori', 'tur', 'tip'], 'Sınav').toLocaleLowerCase('tr-TR');
    const category: GradeRecord['category'] = catRaw.includes('kanaat')
      ? 'Kanaat'
      : catRaw.includes('söz') || catRaw.includes('soz')
        ? 'Sözlü'
        : catRaw.includes('dönem') || catRaw.includes('donem')
          ? 'Dönem Sonu'
          : 'Sınav';

    grades.push({
      id: pickStr(g, ['id'], createId('grd')),
      termId: pickStr(g, ['termId', 'donemId'], activeTermId),
      studentId,
      examId: pickStr(g, ['examId', 'sinavId']) || undefined,
      subjectName: pickStr(g, ['subjectName', 'ders', 'dersAdi']) || undefined,
      title: pickStr(g, ['title', 'baslik', 'sinavAdi']) || undefined,
      date: pickStr(g, ['date', 'tarih'], getTodayISO()),
      category,
      score: pickNum(g, ['score', 'puan', 'not', 'notDegeri']),
      weight: pickNum(g, ['weight', 'agirlik']),
      opinionText: pickStr(g, ['opinionText', 'kanaatMetni', 'notAciklama', 'aciklama']) || undefined,
      teacherId: pickStr(g, ['teacherId', 'hocaId']) || undefined,
    });
  }

  const rawSettings = asRecord(root.gradingSettings ?? root.notAyarlari ?? {});
  const gradingSettings: GradingSettings = {
    passThreshold:
      pickNum(rawSettings, ['passThreshold', 'baraj', 'gecmeNotu'], fallbackSettings.passThreshold) ??
      fallbackSettings.passThreshold,
    kanaatWeight:
      pickNum(rawSettings, ['kanaatWeight', 'kanaatAgirligi'], fallbackSettings.kanaatWeight) ??
      fallbackSettings.kanaatWeight,
  };

  return { exams, grades, gradingSettings };
}

export function migrateHomeworksFromBackup(
  root: AnyRecord,
  defaultClassId: string
): HomeworkRecord[] {
  const rawHomeworks = pickArray(root, ['homeworks', 'odevler', 'odevKayitlari', 'homeworkRecords']);
  const migrated: HomeworkRecord[] = [];

  for (const h of rawHomeworks) {
    const studentId = pickStr(h, ['studentId', 'ogrenciId', 'ogrenci_id']);
    if (!studentId) continue;

    migrated.push({
      id: pickStr(h, ['id'], createId('hw')),
      assignmentId: pickStr(h, ['assignmentId', 'odevGrupId', 'grupId']) || undefined,
      studentId,
      classId: pickStr(h, ['classId', 'sinifId', 'grupId'], defaultClassId),
      subjectName: pickStr(h, ['subjectName', 'ders', 'dersAdi']) || undefined,
      title: pickStr(h, ['title', 'baslik', 'odevAdi', 'konu'], 'Ödev'),
      assignedDate: pickStr(h, ['assignedDate', 'verilisTarihi', 'tarih'], getTodayISO()),
      dueDate: pickStr(h, ['dueDate', 'teslimTarihi', 'sonTarih'], getTodayISO()),
      status: normalizeHomeworkStatusV3(pickStr(h, ['status', 'durum'], 'Verildi')),
      checkedAt: pickStr(h, ['checkedAt', 'kontrolSaati', 'saat']) || undefined,
      note: pickStr(h, ['note', 'not', 'aciklama']) || undefined,
    });
  }

  return migrated;
}

export function migrateFridayFromBackup(
  root: AnyRecord,
  fallbackSettings: FridayLeaveSettings
): { fridayPermissions: FridayPermissionRecord[]; fridaySettings: FridayLeaveSettings } {
  const rawList = pickArray(root, [
    'fridayPermissions',
    'cumaIzinleri',
    'cumaIzni',
    'izinKayitlari',
    'fridayLeaveRecords',
  ]);

  const fridayPermissions: FridayPermissionRecord[] = [];
  for (const f of rawList) {
    const studentId = pickStr(f, ['studentId', 'ogrenciId', 'ogrenci_id']);
    if (!studentId) continue;

    const manualApproval =
      f.manualApproval === true ||
      f.mazeretOnayi === true ||
      f.manuelOnay === true ||
      f.hocaOnayi === true;

    fridayPermissions.push({
      id: pickStr(f, ['id'], createId('fri')),
      date: pickStr(f, ['date', 'tarih', 'cumaTarihi'], getTodayISO()),
      studentId,
      status: normalizeFridayStatusV3(pickStr(f, ['status', 'durum'], 'İzinli Çıktı'), manualApproval),
      manualApproval,
      manualApprovalNote:
        pickStr(f, ['manualApprovalNote', 'mazeretNotu', 'onayNotu']) || undefined,
      pickupGuardianName:
        pickStr(f, ['pickupGuardianName', 'teslimAlan', 'veliAdi']) || undefined,
      departureTime: pickStr(f, ['departureTime', 'cikisSaati', 'cikis']) || undefined,
      returnTime: pickStr(f, ['returnTime', 'donusSaati', 'donus']) || undefined,
      note: pickStr(f, ['note', 'not', 'aciklama']) || undefined,
    });
  }

  const rawSettings = asRecord(
    root.fridaySettings ?? root.cumaAyarlari ?? root.cumaIzniAyarlari ?? {}
  );
  const startRaw = pickNum(rawSettings, ['weekStartDay', 'haftaBaslangic'], fallbackSettings.weekStartDay) ?? 1;
  const endRaw = pickNum(rawSettings, ['weekEndDay', 'haftaBitis'], fallbackSettings.weekEndDay) ?? 5;

  const fridaySettings: FridayLeaveSettings = {
    weekStartDay: Math.max(1, Math.min(7, startRaw)) as DayOfWeek,
    weekEndDay: Math.max(1, Math.min(7, endRaw)) as DayOfWeek,
    maxBlockerLimit: Math.max(
      0,
      pickNum(
        rawSettings,
        ['maxBlockerLimit', 'engelEsik', 'maxEngel', 'engelLimiti'],
        fallbackSettings.maxBlockerLimit
      ) ?? fallbackSettings.maxBlockerLimit
    ),
    requireSaturdayAdvanceLesson:
      rawSettings.requireSaturdayAdvanceLesson === true ||
      rawSettings.cumartesiPesinSarti === true ||
      false,
  };

  return { fridayPermissions, fridaySettings };
}

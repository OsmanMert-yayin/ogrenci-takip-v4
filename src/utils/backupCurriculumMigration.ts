import {
  DAILY_ATTENDANCE_SLOT_ID,
  GENERAL_SCHEDULE_CLASS_ID,
  type AttendanceRecord,
  type AttendanceStatus,
  type ClassGroup,
  type DayOfWeek,
  type LessonSlot,
  type ScheduleEntry,
  type TopicCategory,
  type TopicPoolItem,
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

function normalizeDayOfWeek(raw: unknown): DayOfWeek {
  if (typeof raw === 'number') {
    if (raw >= 1 && raw <= 7) return raw as DayOfWeek;
    if (raw === 0) return 7;
  }
  const s = String(raw ?? '').trim().toLocaleLowerCase('tr-TR');
  if (s === '1' || s.startsWith('pzt') || s.includes('pazartesi') || s.startsWith('mon')) return 1;
  if (s === '2' || s.startsWith('sal') || s.startsWith('tue')) return 2;
  if (s === '3' || s.startsWith('çar') || s.startsWith('car') || s.startsWith('wed')) return 3;
  if (s === '4' || s.startsWith('per') || s.startsWith('thu')) return 4;
  if (s === '5' || s.startsWith('cum') && !s.includes('tesi') || s.startsWith('fri')) return 5;
  if (s === '6' || s.startsWith('cmt') || s.includes('cumartesi') || s.startsWith('sat')) return 6;
  if (s === '7' || s === '0' || s.startsWith('paz') || s.startsWith('sun')) return 7;
  return 1;
}

export function normalizeTopicCategory(raw: string): TopicCategory {
  const lower = raw.toLocaleLowerCase('tr-TR');
  if (lower.includes('yüzüne') || lower.includes('yuzune') || lower.includes('kur')) return 'Yüzüne';
  if (lower.includes('ezber') || lower.includes('sure') || lower.includes('dua')) return 'Ezber';
  if (lower.includes('tecvid') || lower.includes('talim') || lower.includes('mahre')) {
    return 'Talim Tecvid';
  }
  if (
    lower.includes('dini') ||
    lower.includes('fıkıh') ||
    lower.includes('fikih') ||
    lower.includes('akaid') ||
    lower.includes('siyer') ||
    lower.includes('ahlak')
  ) {
    return 'Temel Dini Bilgiler';
  }
  if (lower.includes('sosyal') || lower.includes('etkinlik')) return 'Sosyal Etkinlik';
  if (lower.includes('hafız') || lower.includes('hafiz')) return 'Hafızlık';
  return 'Diğer';
}

export function normalizeAttendanceStatusV3(raw: string): AttendanceStatus {
  const lower = raw.toLocaleLowerCase('tr-TR').trim();
  if (
    lower === 'kiç' ||
    lower === 'kic' ||
    lower.includes('izinsiz') ||
    lower.includes('kaçtı') ||
    lower.includes('kacti')
  ) {
    return 'Kurstan İzinsiz Çıktı';
  }
  if (
    lower === 'dg' ||
    lower.includes('derse girmedi') ||
    lower.includes('girmedi') ||
    lower.includes('katılmadı')
  ) {
    return 'Derse Girmedi';
  }
  if (lower === 'gç' || lower === 'gc' || lower.includes('geç') || lower.includes('gec') || lower.includes('late')) {
    return 'Geç Geldi';
  }
  if (lower === 'iz' || lower === 'İZ' || lower.includes('izin') || lower.includes('rapor') || lower.includes('excused')) {
    return 'İzinli';
  }
  if (lower === 'y' || lower.includes('gelmedi') || lower.includes('yok') || lower.includes('absent')) {
    return 'Gelmedi';
  }
  return 'Geldi';
}

export function migrateScheduleFromBackup(
  root: AnyRecord,
  activeTermId: string,
  classes: ClassGroup[],
  lessonSlots: LessonSlot[],
  fallbackSchedule: ScheduleEntry[]
): ScheduleEntry[] {
  const rawList = pickArray(root, [
    'schedule',
    'dersProgrami',
    'haftalikProgram',
    'program',
    'scheduleEntries',
    'timetable',
  ]);
  if (rawList.length === 0) return fallbackSchedule;

  return rawList.map((item) => {
    let classId = pickStr(item, ['classId', 'sinifId', 'grupId'], GENERAL_SCHEDULE_CLASS_ID);
    if (
      classId !== GENERAL_SCHEDULE_CLASS_ID &&
      !classes.some((c) => c.id === classId)
    ) {
      const lowerRef = classId.toLocaleLowerCase('tr-TR');
      if (lowerRef.includes('genel') || lowerRef.includes('ortak') || lowerRef === 'all') {
        classId = GENERAL_SCHEDULE_CLASS_ID;
      } else {
        const matched = classes.find((c) => c.name.toLocaleLowerCase('tr-TR') === lowerRef);
        classId = matched?.id ?? GENERAL_SCHEDULE_CLASS_ID;
      }
    }

    let slotId = pickStr(item, ['lessonSlotId', 'dersSaatiId', 'slotId', 'saatId']);
    if (!slotId || !lessonSlots.some((s) => s.id === slotId)) {
      const slotName = pickStr(item, ['slotName', 'dersSaati', 'saat']);
      const matchedSlot = lessonSlots.find(
        (s) =>
          s.name.toLocaleLowerCase('tr-TR') === slotName.toLocaleLowerCase('tr-TR') ||
          s.startTime === slotName
      );
      slotId = matchedSlot?.id ?? lessonSlots[0]?.id ?? 'slot_ders_1';
    }

    const reqRaw = pickStr(item, ['requirement', 'zorunluluk', 'tur'], 'zorunlu').toLocaleLowerCase('tr-TR');
    return {
      id: pickStr(item, ['id'], createId('sch')),
      termId: pickStr(item, ['termId', 'donemId'], activeTermId),
      classId,
      dayOfWeek: normalizeDayOfWeek(item.dayOfWeek ?? item.gun ?? item.day ?? 1),
      lessonSlotId: slotId,
      subjectName: pickStr(item, ['subjectName', 'ders', 'dersAdi', 'subject', 'title'], 'Yüzüne'),
      defaultTopic: pickStr(item, ['defaultTopic', 'konu', 'varsayilanKonu', 'icerik']) || undefined,
      requirement: reqRaw.includes('seç') || reqRaw.includes('sec') ? 'secmeli' : 'zorunlu',
      teacherId: pickStr(item, ['teacherId', 'hocaId', 'ogretmenId']) || undefined,
      notes: pickStr(item, ['notes', 'not', 'aciklama']) || undefined,
    };
  });
}

export function migrateTopicPoolFromBackup(
  root: AnyRecord,
  fallbackTopics: TopicPoolItem[]
): TopicPoolItem[] {
  const rawTopics = pickArray(root, [
    'topicPool',
    'konular',
    'konuHavuzu',
    'mufredat',
    'topics',
    'sureler',
    'curriculum',
  ]);
  if (rawTopics.length === 0) return fallbackTopics;

  return rawTopics.map((item, idx) => ({
    id: pickStr(item, ['id'], createId('top')),
    title: pickStr(item, ['title', 'ad', 'konu', 'sureAdi', 'name'], `Konu ${idx + 1}`),
    category: normalizeTopicCategory(pickStr(item, ['category', 'kategori', 'ders', 'alan'], 'Ezber')),
    subGroup: pickStr(item, ['subGroup', 'altGrup', 'grup', 'bolum']) || undefined,
    cuzNo: pickNum(item, ['cuzNo', 'cuz', 'cuzNumarasi']),
    pageRange: pickStr(item, ['pageRange', 'sayfaAraligi', 'sayfa']) || undefined,
    order: pickNum(item, ['order', 'sira'], idx + 1) ?? idx + 1,
    isActive: item.isActive !== false && item.aktif !== false,
    notes: pickStr(item, ['notes', 'not', 'aciklama']) || undefined,
  }));
}

export function migrateAttendanceFromBackup(
  root: AnyRecord,
  defaultClassId: string,
  lessonSlots: LessonSlot[]
): AttendanceRecord[] {
  const rawAttendance = pickArray(root, [
    'attendance',
    'yoklama',
    'yoklamalar',
    'attendanceRecords',
    'devamsizlik',
  ]);

  const migrated: AttendanceRecord[] = [];
  for (const a of rawAttendance) {
    const studentId = pickStr(a, ['studentId', 'ogrenciId', 'ogrenci_id']);
    if (!studentId) continue;

    let slotId = pickStr(a, ['lessonSlotId', 'dersSaatiId', 'slotId', 'saatId']);
    const lowerSlot = slotId.toLocaleLowerCase('tr-TR');
    if (
      !slotId ||
      lowerSlot === 'genel' ||
      lowerSlot === 'daily' ||
      lowerSlot === 'tam_gun' ||
      lowerSlot === DAILY_ATTENDANCE_SLOT_ID
    ) {
      slotId = DAILY_ATTENDANCE_SLOT_ID;
    } else if (!lessonSlots.some((s) => s.id === slotId)) {
      const byName = lessonSlots.find(
        (s) => s.name.toLocaleLowerCase('tr-TR') === lowerSlot || s.startTime === slotId
      );
      slotId = byName?.id ?? slotId;
    }

    migrated.push({
      id: pickStr(a, ['id'], createId('att')),
      date: pickStr(a, ['date', 'tarih'], getTodayISO()),
      classId: pickStr(a, ['classId', 'sinifId', 'grupId'], defaultClassId),
      lessonSlotId: slotId,
      studentId,
      status: normalizeAttendanceStatusV3(pickStr(a, ['status', 'durum', 'kod'], 'Geldi')),
      recordedTime: pickStr(a, ['recordedTime', 'saat', 'kayitSaati']) || undefined,
      note: pickStr(a, ['note', 'not', 'aciklama', 'neden']) || undefined,
      teacherId: pickStr(a, ['teacherId', 'hocaId']) || undefined,
    });
  }
  return migrated;
}

export function normalizeLessonStatusV3(
  rawStatus: string,
  rawEval: string
): 'Geçti' | 'Tekrar' | 'Vermedi' {
  const s = `${rawStatus} ${rawEval}`.toLocaleLowerCase('tr-TR');
  if (s.includes('vermedi') || s.includes('dinlenmedi') || s.includes('yapmadı')) return 'Vermedi';
  if (s.includes('tekrar') || s.includes('kaldı') || s.includes('kaldi')) return 'Tekrar';
  return 'Geçti';
}

export function statusToEvaluation(
  status: 'Geçti' | 'Tekrar' | 'Vermedi',
  score?: number
): 'Pekiyi' | 'İyi' | 'Orta' | 'Tekrar' | 'Dinlenmedi' {
  if (status === 'Vermedi') return 'Dinlenmedi';
  if (status === 'Tekrar') return 'Tekrar';
  if (typeof score === 'number') {
    if (score >= 85) return 'Pekiyi';
    if (score >= 70) return 'İyi';
    return 'Orta';
  }
  return 'İyi';
}

export function migrateLessonsFromBackup(
  root: AnyRecord,
  defaultClassId: string
): import('../types').LessonRecord[] {
  const rawLessons = pickArray(root, [
    'lessons',
    'dersKayitlari',
    'dersler',
    'lessonRecords',
    'dersTakip',
  ]);

  const migrated: import('../types').LessonRecord[] = [];
  for (const l of rawLessons) {
    const studentId = pickStr(l, ['studentId', 'ogrenciId', 'ogrenci_id']);
    if (!studentId) continue;

    const status = normalizeLessonStatusV3(
      pickStr(l, ['status', 'durum', 'sonuc']),
      pickStr(l, ['evaluation', 'degerlendirme'])
    );
    const score = pickNum(l, ['score', 'puan', 'notDegeri']);
    const turCount = Math.max(1, pickNum(l, ['turCount', 'tur', 'turSayisi'], 1) ?? 1);

    migrated.push({
      id: pickStr(l, ['id'], createId('lsn')),
      date: pickStr(l, ['date', 'tarih'], getTodayISO()),
      studentId,
      classId: pickStr(l, ['classId', 'sinifId', 'grupId'], defaultClassId),
      lessonSlotId: pickStr(l, ['lessonSlotId', 'dersSaatiId', 'slotId']) || undefined,
      subjectName:
        pickStr(l, ['subjectName', 'ders', 'dersAdi', 'kategori', 'category']) || 'Yüzüne',
      topicId: pickStr(l, ['topicId', 'konuId']) || undefined,
      topicTitle: pickStr(l, ['topicTitle', 'konu', 'konuBasligi', 'title'], ''),
      pageOrVerse:
        pickStr(l, ['pageOrVerse', 'sayfaSure', 'sayfa', 'sure', 'ayet', 'icerik']) || undefined,
      amount: pickStr(l, ['amount', 'miktar']) || undefined,
      score,
      status,
      evaluation: statusToEvaluation(status, score),
      turCount,
      makeupOfId: pickStr(l, ['makeupOfId', 'telafiId', 'telafiEdilenId']) || undefined,
      combinedSessionId:
        pickStr(l, ['combinedSessionId', 'birlesikOturumId', 'sessionId']) || undefined,
      recordedTime: pickStr(l, ['recordedTime', 'saat', 'kayitSaati', 'time'], '09:00'),
      teacherId: pickStr(l, ['teacherId', 'hocaId']) || undefined,
      note: pickStr(l, ['note', 'not', 'aciklama']) || undefined,
    });
  }
  return migrated;
}

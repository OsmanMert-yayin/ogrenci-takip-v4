import type {
  AttendanceRecord,
  AttendanceStatus,
  AutomationSettings,
  ClassGroup,
  DailyReportSectionsConfig,
  ExamDefinition,
  GradeRecord,
  GradingSettings,
  GuardianContact,
  LessonRecord,
  LessonSlot,
  MessageTemplateKey,
  ScheduleEntry,
  Student,
} from '../types';
import { DAILY_ATTENDANCE_SLOT_ID } from '../types';
import { computeStudentGradeSummaries } from '../modules/grades-homework/gradesEngine';
import { formatTurkishDate } from './id';
import {
  inferLessonStatus,
  inferLessonSubject,
  resolveDailySubjectsForClass,
} from './lessonScheduleResolver';

export const DEFAULT_DAILY_REPORT_SECTIONS: DailyReportSectionsConfig = {
  showAttendance: true,
  showPassedLessons: true,
  showMissedLessons: true,
  showAutoTag: true,
  showUnenteredScheduled: false,
  showAdviceFooter: true,
  showAcademicAverage: false,
  showExamResults: false,
  showPortalLink: true,
};

export const DEFAULT_MESSAGE_TEMPLATES: Record<MessageTemplateKey, string> = {
  dailyReport: [
    'Sayın {veli_adi},',
    '{ogrenci_adi} ({sinif}) için {tarih} tarihli günlük takip özeti:',
    '',
    '{ders_bilgisi}',
    '',
    '{portal_linki}',
  ].join('\n'),
  gelmedi:
    'Sayın {veli_adi}, öğrencimiz {ogrenci_adi} ({sinif}) {tarih} tarihinde kursa gelmemiştir. Bilginize sunar, hayırlı günler dileriz.',
  derseGirmedi:
    'Sayın {veli_adi}, öğrencimiz {ogrenci_adi} ({sinif}) {tarih} tarihinde {ders_bilgisi} katılmamıştır. Bilginize sunarız.',
  izinsizCikti:
    'ÖNEMLİ BİLGİLENDİRME: Sayın {veli_adi}, öğrencimiz {ogrenci_adi} ({sinif}) {tarih} saat {saat} itibarıyla {ders_bilgisi} kurstan izinsiz çıkış yapmıştır. Lütfen kurumumuzla iletişime geçiniz.',
  gecGeldi:
    'Sayın {veli_adi}, öğrencimiz {ogrenci_adi} ({sinif}) {tarih} tarihinde {ders_bilgisi} saat {saat} itibarıyla geç katılmıştır. Bilginize sunarız.',
  izinli:
    'Sayın {veli_adi}, öğrencimiz {ogrenci_adi} ({sinif}) {tarih} tarihinde {ders_bilgisi} izinli olarak kaydedilmiştir. Bilginize sunarız.',
};

export const TEMPLATE_VARIABLES: { token: string; label: string }[] = [
  { token: '{veli_adi}', label: 'Veli Adı' },
  { token: '{yakinlik}', label: 'Yakınlık' },
  { token: '{ogrenci_adi}', label: 'Öğrenci Adı' },
  { token: '{sinif}', label: 'Sınıf' },
  { token: '{tarih}', label: 'Tarih' },
  { token: '{saat}', label: 'Saat' },
  { token: '{durum}', label: 'Durum' },
  { token: '{ders_bilgisi}', label: 'Ders / Rapor İçeriği' },
  { token: '{portal_linki}', label: 'Veli Portal Linki' },
];

export function formatTurPhrase(turCount?: number): string {
  const tur = Math.max(1, Math.round(turCount ?? 1));
  return tur === 1 ? '1. Turda tek seferde' : `${tur}. Turda`;
}

/**
 * Puan + Tur Birleşik Kuvvet Yorumu:
 * Sadece tur sayısına değil, puan ve tur değerini birlikte değerlendirir.
 * Orta (50-69p) puanlara asla "Kuvvetli" demez.
 */
export function buildPuanTurCommentary(score?: number, turCount?: number): string {
  const tur = Math.max(1, Math.round(turCount ?? 1));
  const turPhrase = formatTurPhrase(tur);

  if (typeof score !== 'number' || Number.isNaN(score)) {
    if (tur <= 2) return `🟢 ${turPhrase} sorunsuz verdi`;
    if (tur <= 4) return `🟡 ${turPhrase} zorlanarak verdi`;
    return `🟠 ${tur} Tur gidip gelerek verdi — Pekiştirilmeli`;
  }

  if (score >= 85) {
    if (tur <= 2) return `🟢 ${turPhrase} akıcı ve kuvvetli verdi`;
    if (tur <= 4) return `🟡 ${turPhrase} birkaç denemeyle iyi seviyede verdi`;
    return `🟠 ${tur} Tur gidip gelerek tamamladı — Kalıcılık için pekiştirilmeli`;
  }

  if (score >= 70) {
    if (tur <= 2) return `🟢 ${turPhrase} iyi seviyede verdi`;
    if (tur <= 4) return `🟡 ${turPhrase} biraz zorlanarak verdi — Tekrar faydalı olur`;
    return `🟠 ${tur} Tur gidip gelerek verdi — Pekiştirilmeli`;
  }

  if (score >= 50) {
    if (tur <= 2) return `🟡 ${turPhrase} verdi ancak eksikleri var — Pekiştirilmeli`;
    if (tur <= 4) return `🟠 ${turPhrase} zorlanarak orta seviyede verdi — Tekrar edilmeli`;
    return `🔴 ${tur} Turda çok zorlanarak sınırda verdi — Ciddi tekrar şart`;
  }

  return '🔴 Eksikleri fazla — Tekrar çalışılmalı';
}

/**
 * "4. Ders dersine" tekrarını tamamen engelleyen doğal Türkçe ifade üreticisi.
 * - Ders adı varsa: "4. Ders (Talim Tecvid) dersine"
 * - Ders adı yoksa ve slot "Ders" ile bitiyorsa: "4. Derse"
 */
export function formatSlotLessonPhrase(slotName?: string, subjectName?: string): string {
  const cleanSlot = (slotName ?? '').trim();
  const cleanSubj = (subjectName ?? '').trim();

  if (!cleanSlot || cleanSlot === DAILY_ATTENDANCE_SLOT_ID) {
    return cleanSubj ? `${cleanSubj} dersine` : 'günlük programa';
  }

  if (cleanSubj) {
    return `${cleanSlot} (${cleanSubj}) dersine`;
  }

  if (/\bders$/i.test(cleanSlot)) {
    return cleanSlot.replace(/\bders$/i, 'Derse');
  }
  if (/etüt$/i.test(cleanSlot)) {
    return `${cleanSlot} saatine`;
  }
  return `${cleanSlot} oturumuna`;
}

/**
 * WhatsApp ve düz metin mesajlarında ham markdown "_" veya "*" kalıntılarını temizler.
 * URL içindeki alt çizgilere dokunmaz.
 */
export function sanitizePlainMessage(raw: string): string {
  const lines = raw.split('\n').map((line) => {
    const trimmed = line.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return line
      .replace(/(^|\s)[*_]+([^\s*_](?:[^*_]*[^\s*_])?)[*_]+(?=\s|[.,!?:;)]|$)/g, '$1$2')
      .replace(/\s{2,}/g, ' ')
      .trimEnd();
  });

  // Collapse 3+ consecutive blank lines into max 1 blank line
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatTelegramHtml(plainMessage: string): string {
  const clean = sanitizePlainMessage(plainMessage);
  const escaped = clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold section header lines cleanly with HTML <b> tags
  return escaped
    .split('\n')
    .map((line) => {
      if (
        /^(📋|✅|❌|⏳|📊|📝|💡|🌐)\s+[^:]+:?$/.test(line.trim()) ||
        /^ÖNEMLİ BİLGİLENDİRME:/.test(line.trim())
      ) {
        return `<b>${line}</b>`;
      }
      return line;
    })
    .join('\n');
}

export function getPrimaryGuardian(student: Student): GuardianContact | undefined {
  return (
    student.guardians.find((g) => g.isPrimary && g.phone.trim()) ??
    student.guardians.find((g) => g.phone.trim()) ??
    student.guardians[0]
  );
}

export function buildParentPortalUrl(studentNo?: string): string {
  if (typeof window === 'undefined') return '?portal=veli';
  const base = `${window.location.origin}${window.location.pathname}`;
  const params = new URLSearchParams();
  params.set('portal', 'veli');
  if (studentNo && studentNo.trim()) {
    params.set('no', studentNo.trim());
  }
  return `${base}?${params.toString()}`;
}

export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('90') && digits.length >= 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `9${digits}`;
  if (digits.length === 10 && digits.startsWith('5')) return `90${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  const normalized = normalizePhoneForWhatsApp(phone);
  const cleanText = sanitizePlainMessage(text);
  const encoded = encodeURIComponent(cleanText);
  if (!normalized) return `https://wa.me/?text=${encoded}`;
  return `https://wa.me/${normalized}?text=${encoded}`;
}

export function attendanceStatusToTemplateKey(status: AttendanceStatus): MessageTemplateKey | null {
  switch (status) {
    case 'Gelmedi':
      return 'gelmedi';
    case 'Derse Girmedi':
      return 'derseGirmedi';
    case 'Kurstan İzinsiz Çıktı':
      return 'izinsizCikti';
    case 'Geç Geldi':
      return 'gecGeldi';
    case 'İzinli':
      return 'izinli';
    default:
      return null;
  }
}

export interface BuildAttendanceMessageInput {
  student: Student;
  classGroup?: ClassGroup;
  record: AttendanceRecord;
  slot?: LessonSlot;
  subjectName?: string;
  automation: AutomationSettings;
}

export function buildAttendanceNotificationMessage(input: BuildAttendanceMessageInput): string {
  const { student, classGroup, record, slot, subjectName, automation } = input;
  const tplKey = attendanceStatusToTemplateKey(record.status) ?? 'gelmedi';
  const template =
    automation.templates?.[tplKey] || DEFAULT_MESSAGE_TEMPLATES[tplKey];
  const guardian = getPrimaryGuardian(student);
  const guardianLabel = guardian
    ? automation.autoIncludeGuardianRelation
      ? `${guardian.fullName} (${guardian.relation})`
      : guardian.fullName
    : 'Velimiz';

  const isDaily = record.lessonSlotId === DAILY_ATTENDANCE_SLOT_ID;
  const dersBilgisi = isDaily
    ? 'günlük programa'
    : formatSlotLessonPhrase(slot?.name, subjectName);

  const portalUrl = automation.portalSettings?.enabled
    ? `Veli Takip Portalı: ${buildParentPortalUrl(student.studentNo)}`
    : '';

  const rendered = template
    .replace(/\{veli_adi\}/g, guardianLabel)
    .replace(/\{yakinlik\}/g, guardian?.relation ?? 'Veli')
    .replace(/\{ogrenci_adi\}/g, student.fullName)
    .replace(/\{sinif\}/g, classGroup?.name ?? 'Sınıf')
    .replace(/\{tarih\}/g, formatTurkishDate(record.date))
    .replace(/\{saat\}/g, record.recordedTime || '—')
    .replace(/\{durum\}/g, record.status)
    .replace(/\{ders_bilgisi\}/g, dersBilgisi)
    .replace(/\{portal_linki\}/g, portalUrl);

  return sanitizePlainMessage(rendered);
}

export interface BuildDailyReportInput {
  student: Student;
  classGroup?: ClassGroup;
  dateISO: string;
  activeTermId: string;
  attendance: AttendanceRecord[];
  lessons: LessonRecord[];
  schedule: ScheduleEntry[];
  lessonSlots: LessonSlot[];
  exams: ExamDefinition[];
  grades: GradeRecord[];
  gradingSettings: GradingSettings;
  allActiveStudents: Student[];
  automation: AutomationSettings;
}

export function buildDailyStudentReportMessage(input: BuildDailyReportInput): string {
  const {
    student,
    classGroup,
    dateISO,
    activeTermId,
    attendance,
    lessons,
    schedule,
    lessonSlots,
    exams,
    grades,
    gradingSettings,
    allActiveStudents,
    automation,
  } = input;

  const sections = {
    ...DEFAULT_DAILY_REPORT_SECTIONS,
    ...(automation.dailyReportSections ?? {}),
  };

  const guardian = getPrimaryGuardian(student);
  const guardianLabel = guardian
    ? automation.autoIncludeGuardianRelation
      ? `${guardian.fullName} (${guardian.relation})`
      : guardian.fullName
    : 'Velimiz';

  const slotMap = new Map(lessonSlots.map((s) => [s.id, s]));
  const dayAtt = attendance.filter((a) => a.studentId === student.id && a.date === dateISO);
  const dayLessons = lessons.filter((l) => l.studentId === student.id && l.date === dateISO);
  const scheduledSubjects = resolveDailySubjectsForClass(
    schedule,
    lessonSlots,
    activeTermId,
    student.classId,
    dateISO
  );

  const blocks: string[] = [];

  // 1. Yoklama Bölümü
  if (sections.showAttendance) {
    const dailyRec = dayAtt.find((a) => a.lessonSlotId === DAILY_ATTENDANCE_SLOT_ID);
    const slotRecs = dayAtt.filter((a) => a.lessonSlotId !== DAILY_ATTENDANCE_SLOT_ID);
    const attLines: string[] = [];

    if (dailyRec) {
      attLines.push(`• Günlük Yoklama: ${dailyRec.status}`);
    }
    const notableSlots = slotRecs.filter((r) => r.status !== 'Geldi');
    if (notableSlots.length > 0) {
      for (const r of notableSlots) {
        const slotName = slotMap.get(r.lessonSlotId)?.name ?? 'Ders';
        attLines.push(`• ${slotName}: ${r.status}${r.recordedTime ? ` (${r.recordedTime})` : ''}`);
      }
    } else if (!dailyRec && slotRecs.length > 0) {
      attLines.push(`• Tüm yoklama saatlerine (${slotRecs.length} ders) eksiksiz katıldı.`);
    }

    if (attLines.length > 0) {
      blocks.push(['📋 Yoklama Durumu:', ...attLines].join('\n'));
    }
  }

  // 2. Verdiği Dersler (Geçti)
  const passedLessons = dayLessons.filter((l) => inferLessonStatus(l) === 'Geçti');
  if (sections.showPassedLessons && passedLessons.length > 0) {
    const lines = passedLessons.map((l) => {
      const subj = inferLessonSubject(l);
      const detail = [l.pageOrVerse, l.topicTitle !== subj ? l.topicTitle : '', l.amount]
        .filter(Boolean)
        .join(' · ');
      const scoreText = typeof l.score === 'number' ? `${l.score} puan` : '';
      const comment = buildPuanTurCommentary(l.score, l.turCount);
      const head = detail ? `${subj} (${detail})` : subj;
      return `• ${head}${scoreText ? ` — ${scoreText}` : ''} (${comment})`;
    });
    blocks.push(['✅ Verdiği Dersler:', ...lines].join('\n'));
  }

  // 3. Vermediği / Tekrar Dersleri
  const missedLessons = dayLessons.filter((l) => {
    const st = inferLessonStatus(l);
    return st === 'Vermedi' || st === 'Tekrar';
  });
  if (sections.showMissedLessons && missedLessons.length > 0) {
    const lines = missedLessons.map((l) => {
      const subj = inferLessonSubject(l);
      const st = inferLessonStatus(l);
      const detail = [l.pageOrVerse, l.topicTitle !== subj ? l.topicTitle : '']
        .filter(Boolean)
        .join(' · ');
      const autoNote = l.isAutoGenerated && sections.showAutoTag ? ' (Otomatik kayıt)' : '';
      const scorePart = typeof l.score === 'number' ? ` — ${l.score} puan` : '';
      const head = detail ? `${subj} (${detail})` : subj;
      return `• ${head}: ${st}${scorePart}${autoNote}`;
    });
    blocks.push(['❌ Vermediği / Tekrar Dersleri:', ...lines].join('\n'));
  }

  // 4. Programda Olup Değerlendirme Girilmeyenler
  if (sections.showUnenteredScheduled && scheduledSubjects.length > 0) {
    const enteredNorm = new Set(
      dayLessons.map((l) => inferLessonSubject(l).toLocaleLowerCase('tr-TR'))
    );
    const unentered = scheduledSubjects.filter(
      (s) => !enteredNorm.has(s.subjectName.toLocaleLowerCase('tr-TR'))
    );
    if (unentered.length > 0) {
      blocks.push(
        `⏳ Programda Olup Değerlendirme Girilmeyenler:\n• ${unentered
          .map((u) => u.subjectName)
          .join(', ')}`
      );
    }
  }

  // 5. Akademik Ortalama Özeti
  if (sections.showAcademicAverage) {
    const summaries = computeStudentGradeSummaries(
      allActiveStudents,
      exams,
      grades,
      gradingSettings,
      activeTermId
    );
    const summary = summaries.get(student.id);
    if (summary && summary.weightedAverage !== null) {
      blocks.push(
        `📊 Akademik Ortalama Özeti:\n• Dönem Ağırlıklı Ortalaması: ${summary.weightedAverage} (${summary.passed ? 'Başarılı' : 'Desteklenmeli'})`
      );
    }
  }

  // 6. Sınav Sonuçları
  if (sections.showExamResults) {
    const studentGrades = grades.filter(
      (g) => g.studentId === student.id && g.termId === activeTermId && typeof g.score === 'number'
    );
    if (studentGrades.length > 0) {
      const examMap = new Map(exams.map((e) => [e.id, e]));
      const recent = studentGrades.slice(-3).map((g) => {
        const ex = g.examId ? examMap.get(g.examId) : undefined;
        const label = ex?.title || g.title || g.subjectName || g.category;
        return `• ${label}: ${g.score} puan`;
      });
      blocks.push(['📝 Güncel Sınav Sonuçları:', ...recent].join('\n'));
    }
  }

  // 7. Alt Tavsiye Notu
  if (sections.showAdviceFooter) {
    let advice =
      'Evde düzenli tekrar ve sesli okuma çalışması öğrencimizin kalıcılığını artıracaktır.';
    if (missedLessons.length > 0) {
      advice =
        'Verilemeyen veya tekrara kalan derslerin akşam evde dinlenerek telafiye hazırlanması faydalı olacaktır.';
    } else if (
      passedLessons.length > 0 &&
      passedLessons.every((l) => (l.score ?? 90) >= 85 && (l.turCount ?? 1) <= 2)
    ) {
      advice =
        'Maşallah, bugünkü derslerini çok güzel bir disiplinle verdi. Aynı düzenle devamını dileriz.';
    }
    blocks.push(`💡 Öğretmen Tavsiyesi:\n${advice}`);
  }

  const bodyText =
    blocks.length > 0
      ? blocks.join('\n\n')
      : 'Bugün için sisteme işlenmiş ders veya yoklama kaydı bulunmamaktadır.';

  const portalLine =
    sections.showPortalLink && automation.portalSettings?.enabled
      ? `🌐 Veli Takip Portalı: ${buildParentPortalUrl(student.studentNo)}`
      : '';

  const template =
    automation.templates?.dailyReport || DEFAULT_MESSAGE_TEMPLATES.dailyReport;

  const rendered = template
    .replace(/\{veli_adi\}/g, guardianLabel)
    .replace(/\{yakinlik\}/g, guardian?.relation ?? 'Veli')
    .replace(/\{ogrenci_adi\}/g, student.fullName)
    .replace(/\{sinif\}/g, classGroup?.name ?? 'Sınıf')
    .replace(/\{tarih\}/g, formatTurkishDate(dateISO))
    .replace(/\{saat\}/g, '')
    .replace(/\{durum\}/g, 'Günlük Rapor')
    .replace(/\{ders_bilgisi\}/g, bodyText)
    .replace(/\{portal_linki\}/g, portalLine);

  return sanitizePlainMessage(rendered);
}

export interface TelegramSendResult {
  ok: boolean;
  error?: string;
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  plainMessage: string
): Promise<TelegramSendResult> {
  const token = botToken.trim();
  const chat = chatId.trim();
  if (!token || !chat) {
    return { ok: false, error: 'Bot Token veya Veli Chat ID eksik.' };
  }

  try {
    const htmlBody = formatTelegramHtml(plainMessage);
    const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: htmlBody,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.description || `Telegram API hatası (${res.status})`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Telegram bağlantısı kurulamadı.',
    };
  }
}

import type {
  AutomationSettings,
  CloudSyncSettings,
  WhatsAppQueueItem,
} from '../types';
import { DEFAULT_DAILY_REPORT_SECTIONS, DEFAULT_MESSAGE_TEMPLATES } from './reportFormatter';

type AnyRecord = Record<string, unknown>;

function asRecord(val: unknown): AnyRecord {
  return val && typeof val === 'object' && !Array.isArray(val) ? (val as AnyRecord) : {};
}

function pickStr(obj: AnyRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 0) return val.trim();
  }
  return fallback;
}

function pickBool(obj: AnyRecord, keys: string[], fallback: boolean): boolean {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'boolean') return val;
    if (val === 'true' || val === 1) return true;
    if (val === 'false' || val === 0) return false;
  }
  return fallback;
}

export function migrateAutomationFromBackup(
  root: AnyRecord,
  fallback: AutomationSettings
): AutomationSettings {
  const rawAuto = asRecord(root.automation ?? root.otomasyon ?? root.notifications ?? {});
  const rawSettings = asRecord(root.settings ?? root.ayarlar ?? {});
  const rawTemplates = asRecord(rawAuto.templates ?? rawAuto.sablonlar ?? root.templates ?? {});
  const rawSections = asRecord(
    rawAuto.dailyReportSections ?? rawAuto.raporBolumleri ?? {}
  );
  const rawPortal = asRecord(rawAuto.portalSettings ?? root.portalSettings ?? root.veliPortali ?? {});

  const attendanceModeRaw = pickStr(
    rawAuto,
    ['attendanceMode', 'yoklamaModu'],
    fallback.attendanceMode
  );
  const attendanceMode =
    attendanceModeRaw === 'instant' ||
    attendanceModeRaw === 'scheduled' ||
    attendanceModeRaw === 'manual'
      ? attendanceModeRaw
      : fallback.attendanceMode;

  const dailyReportModeRaw = pickStr(
    rawAuto,
    ['dailyReportMode', 'raporModu'],
    fallback.dailyReportMode
  );
  const dailyReportMode =
    dailyReportModeRaw === 'scheduled' || dailyReportModeRaw === 'manual'
      ? dailyReportModeRaw
      : fallback.dailyReportMode;

  const normalizeChannel = (
    rawVal: string,
    def: AutomationSettings['attendanceChannel']
  ): AutomationSettings['attendanceChannel'] => {
    if (rawVal === 'whatsapp' || rawVal === 'telegram' || rawVal === 'both') return rawVal;
    return def;
  };

  return {
    ...fallback,
    whatsappTemplateAttendance: pickStr(
      rawAuto,
      ['whatsappTemplateAttendance'],
      fallback.whatsappTemplateAttendance
    ),
    whatsappTemplateLesson: pickStr(
      rawAuto,
      ['whatsappTemplateLesson'],
      fallback.whatsappTemplateLesson
    ),
    whatsappTemplateFriday: pickStr(
      rawAuto,
      ['whatsappTemplateFriday'],
      fallback.whatsappTemplateFriday
    ),
    autoIncludeGuardianRelation: pickBool(
      rawAuto,
      ['autoIncludeGuardianRelation'],
      fallback.autoIncludeGuardianRelation
    ),
    defaultNotifyOnAbsent: pickBool(
      rawAuto,
      ['defaultNotifyOnAbsent'],
      fallback.defaultNotifyOnAbsent
    ),
    defaultNotifyOnLeftWithoutPermission: pickBool(
      rawAuto,
      ['defaultNotifyOnLeftWithoutPermission'],
      fallback.defaultNotifyOnLeftWithoutPermission
    ),
    attendanceMode,
    attendanceTime: pickStr(rawAuto, ['attendanceTime', 'yoklamaSaati'], fallback.attendanceTime),
    attendanceChannel: normalizeChannel(
      pickStr(rawAuto, ['attendanceChannel', 'yoklamaKanali'], fallback.attendanceChannel),
      fallback.attendanceChannel
    ),
    dailyReportMode,
    dailyReportTime: pickStr(
      rawAuto,
      ['dailyReportTime', 'gunlukRaporSaati'],
      fallback.dailyReportTime
    ),
    dailyReportChannel: normalizeChannel(
      pickStr(rawAuto, ['dailyReportChannel', 'raporKanali'], fallback.dailyReportChannel),
      fallback.dailyReportChannel
    ),
    autoEzberEnabled: pickBool(
      rawAuto,
      ['autoEzberEnabled', 'otoEzberAktif'],
      fallback.autoEzberEnabled
    ),
    autoEzberTime: pickStr(rawAuto, ['autoEzberTime', 'otoEzberSaati'], fallback.autoEzberTime),
    templates: {
      dailyReport: pickStr(
        rawTemplates,
        ['dailyReport', 'gunlukRapor'],
        DEFAULT_MESSAGE_TEMPLATES.dailyReport
      ),
      gelmedi: pickStr(rawTemplates, ['gelmedi'], DEFAULT_MESSAGE_TEMPLATES.gelmedi),
      derseGirmedi: pickStr(
        rawTemplates,
        ['derseGirmedi'],
        DEFAULT_MESSAGE_TEMPLATES.derseGirmedi
      ),
      izinsizCikti: pickStr(
        rawTemplates,
        ['izinsizCikti'],
        DEFAULT_MESSAGE_TEMPLATES.izinsizCikti
      ),
      gecGeldi: pickStr(rawTemplates, ['gecGeldi'], DEFAULT_MESSAGE_TEMPLATES.gecGeldi),
      izinli: pickStr(rawTemplates, ['izinli'], DEFAULT_MESSAGE_TEMPLATES.izinli),
    },
    dailyReportSections: {
      showAttendance: pickBool(
        rawSections,
        ['showAttendance'],
        DEFAULT_DAILY_REPORT_SECTIONS.showAttendance
      ),
      showPassedLessons: pickBool(
        rawSections,
        ['showPassedLessons'],
        DEFAULT_DAILY_REPORT_SECTIONS.showPassedLessons
      ),
      showMissedLessons: pickBool(
        rawSections,
        ['showMissedLessons'],
        DEFAULT_DAILY_REPORT_SECTIONS.showMissedLessons
      ),
      showAutoTag: pickBool(rawSections, ['showAutoTag'], DEFAULT_DAILY_REPORT_SECTIONS.showAutoTag),
      showUnenteredScheduled: pickBool(
        rawSections,
        ['showUnenteredScheduled'],
        DEFAULT_DAILY_REPORT_SECTIONS.showUnenteredScheduled
      ),
      showAdviceFooter: pickBool(
        rawSections,
        ['showAdviceFooter'],
        DEFAULT_DAILY_REPORT_SECTIONS.showAdviceFooter
      ),
      showAcademicAverage: pickBool(
        rawSections,
        ['showAcademicAverage'],
        DEFAULT_DAILY_REPORT_SECTIONS.showAcademicAverage
      ),
      showExamResults: pickBool(
        rawSections,
        ['showExamResults'],
        DEFAULT_DAILY_REPORT_SECTIONS.showExamResults
      ),
      showPortalLink: pickBool(
        rawSections,
        ['showPortalLink'],
        DEFAULT_DAILY_REPORT_SECTIONS.showPortalLink
      ),
    },
    telegramBotToken: pickStr(
      rawAuto,
      ['telegramBotToken', 'telegramToken'],
      pickStr(rawSettings, ['telegramBotToken', 'telegramToken'], fallback.telegramBotToken)
    ),
    portalSettings: {
      enabled: pickBool(rawPortal, ['enabled', 'aktif'], fallback.portalSettings.enabled),
      accessCode: pickStr(
        rawPortal,
        ['accessCode', 'erisimKodu', 'kod'],
        fallback.portalSettings.accessCode
      ),
      showAttendance: pickBool(
        rawPortal,
        ['showAttendance', 'yoklamaGoster'],
        fallback.portalSettings.showAttendance
      ),
      showLessons: pickBool(
        rawPortal,
        ['showLessons', 'derslerGoster'],
        fallback.portalSettings.showLessons
      ),
      showHomeworks: pickBool(
        rawPortal,
        ['showHomeworks', 'odevlerGoster'],
        fallback.portalSettings.showHomeworks
      ),
      showGrades: pickBool(
        rawPortal,
        ['showGrades', 'notlarGoster'],
        fallback.portalSettings.showGrades
      ),
      showClassRank: pickBool(
        rawPortal,
        ['showClassRank', 'siralamaGoster'],
        fallback.portalSettings.showClassRank
      ),
      showFridayLeave: pickBool(
        rawPortal,
        ['showFridayLeave', 'cumaIzniGoster'],
        fallback.portalSettings.showFridayLeave
      ),
    },
  };
}

export function migrateCloudSyncFromBackup(
  root: AnyRecord,
  fallback: CloudSyncSettings
): CloudSyncSettings {
  const rawCloud = asRecord(root.cloudSync ?? root.bulutSenkron ?? root.googleSync ?? {});
  const rawSettings = asRecord(root.settings ?? {});

  return {
    webAppUrl: pickStr(
      rawCloud,
      ['webAppUrl', 'appsScriptUrl', 'url', 'scriptUrl'],
      pickStr(rawSettings, ['cloudSyncUrl', 'appsScriptUrl'], fallback.webAppUrl)
    ),
    secretToken: pickStr(rawCloud, ['secretToken', 'token'], fallback.secretToken),
    autoSyncEnabled: pickBool(
      rawCloud,
      ['autoSyncEnabled', 'otomatik'],
      fallback.autoSyncEnabled
    ),
    lastSyncedAt: pickStr(rawCloud, ['lastSyncedAt']) || undefined,
    lastSyncStatus: 'idle',
    lastSyncMessage: undefined,
  };
}

export function migrateWhatsAppQueueFromBackup(root: AnyRecord): WhatsAppQueueItem[] {
  if (!Array.isArray(root.whatsappQueue)) return [];
  return root.whatsappQueue
    .filter((item) => item && typeof item === 'object')
    .map((raw) => {
      const obj = asRecord(raw);
      const category: WhatsAppQueueItem['category'] =
        obj.category === 'dailyReport' || obj.category === 'attendance' || obj.category === 'manual'
          ? obj.category
          : 'manual';
      return {
        id: pickStr(obj, ['id'], `waq_${Math.random().toString(36).slice(2, 8)}`),
        studentId: pickStr(obj, ['studentId']),
        studentName: pickStr(obj, ['studentName'], 'Öğrenci'),
        guardianName: pickStr(obj, ['guardianName'], 'Veli'),
        guardianPhone: pickStr(obj, ['guardianPhone']),
        category,
        label: pickStr(obj, ['label'], 'Bildirim'),
        message: pickStr(obj, ['message']),
        createdAt: pickStr(obj, ['createdAt'], new Date().toISOString()),
      };
    })
    .filter((item) => item.message.length > 0);
}

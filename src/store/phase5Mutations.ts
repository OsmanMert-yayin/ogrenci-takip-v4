import type {
  AppDatabase,
  AutomationSettings,
  CloudSyncSettings,
  WhatsAppQueueItem,
} from '../types';

export function applyUpdateAutomationSettings(
  prev: AppDatabase,
  patch: Partial<AutomationSettings>
): AppDatabase {
  return {
    ...prev,
    automation: {
      ...prev.automation,
      ...patch,
      templates: patch.templates
        ? { ...prev.automation.templates, ...patch.templates }
        : prev.automation.templates,
      dailyReportSections: patch.dailyReportSections
        ? { ...prev.automation.dailyReportSections, ...patch.dailyReportSections }
        : prev.automation.dailyReportSections,
      portalSettings: patch.portalSettings
        ? { ...prev.automation.portalSettings, ...patch.portalSettings }
        : prev.automation.portalSettings,
    },
  };
}

export function applyEnqueueWhatsAppItems(
  prev: AppDatabase,
  items: WhatsAppQueueItem[]
): AppDatabase {
  if (items.length === 0) return prev;
  // Deduplicate identical student+category+message items already sitting in queue
  const existingKeys = new Set(
    prev.whatsappQueue.map((q) => `${q.studentId}|${q.category}|${q.label}|${q.message}`)
  );
  const fresh = items.filter(
    (item) => !existingKeys.has(`${item.studentId}|${item.category}|${item.label}|${item.message}`)
  );
  if (fresh.length === 0) return prev;
  return {
    ...prev,
    whatsappQueue: [...fresh, ...prev.whatsappQueue],
  };
}

export function applyUpdateWhatsAppQueueItem(
  prev: AppDatabase,
  itemId: string,
  message: string
): AppDatabase {
  return {
    ...prev,
    whatsappQueue: prev.whatsappQueue.map((item) =>
      item.id === itemId ? { ...item, message } : item
    ),
  };
}

export function applyRemoveWhatsAppQueueItem(prev: AppDatabase, itemId: string): AppDatabase {
  return {
    ...prev,
    whatsappQueue: prev.whatsappQueue.filter((item) => item.id !== itemId),
  };
}

export function applyClearWhatsAppQueue(prev: AppDatabase): AppDatabase {
  return {
    ...prev,
    whatsappQueue: [],
  };
}

export function applyUpdateCloudSyncSettings(
  prev: AppDatabase,
  patch: Partial<CloudSyncSettings>
): AppDatabase {
  return {
    ...prev,
    cloudSync: {
      ...prev.cloudSync,
      ...patch,
    },
  };
}

export function applyMarkAutomationLog(prev: AppDatabase, keys: string[]): AppDatabase {
  if (keys.length === 0) return prev;
  const nowIso = new Date().toISOString();
  const nextLog = { ...(prev.automationLog ?? {}) };
  for (const k of keys) {
    nextLog[k] = nowIso;
  }
  return {
    ...prev,
    automationLog: nextLog,
  };
}

export function applyUpdateGuardianTelegramChatId(
  prev: AppDatabase,
  studentId: string,
  guardianId: string,
  chatId: string
): AppDatabase {
  return {
    ...prev,
    students: prev.students.map((st) => {
      if (st.id !== studentId) return st;
      return {
        ...st,
        guardians: st.guardians.map((g) =>
          g.id === guardianId ? { ...g, telegramChatId: chatId.trim() || undefined } : g
        ),
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

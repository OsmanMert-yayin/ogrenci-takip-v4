import type { AppDatabase } from '../types';
import { parseAndMigrateBackup } from './backupMigration';

export const APPS_SCRIPT_SERVER_CODE = `// Öğrenci ve Ders Takip Sistemi v4 — Google Apps Script Canlı Bulut Eşitleme Sunucusu
// Kurulum: script.google.com -> Yeni Proje -> Bu kodu yapıştırın -> Dağıt -> Yeni Dağıtım -> Web Uygulaması
// Erişim Yetkisi: "Herkes" olarak seçip oluşturulan Web App URL'sini Sistem & Yedek sayfasına yapıştırın.

const FILE_NAME = 'ogrenci_takip_v4_cloud_db.json';
const SECRET_TOKEN = ''; // İsteğe bağlı güvenlik anahtarı (boş bırakılabilir)

function getOrCreateDbFile_() {
  const files = DriveApp.getFilesByName(FILE_NAME);
  if (files.hasNext()) return files.next();
  return DriveApp.createFile(FILE_NAME, JSON.stringify({ updatedAt: '', db: null }), MimeType.PLAIN_TEXT);
}

function checkToken_(token) {
  if (!SECRET_TOKEN) return true;
  return String(token || '') === SECRET_TOKEN;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const token = (e && e.parameter && e.parameter.token) || '';
    if (!checkToken_(token)) {
      return jsonOut_({ ok: false, error: 'Geçersiz erişim anahtarı.' });
    }
    const file = getOrCreateDbFile_();
    const raw = file.getBlob().getDataAsString('UTF-8');
    const parsed = raw ? JSON.parse(raw) : { updatedAt: '', db: null };
    return jsonOut_({ ok: true, updatedAt: parsed.updatedAt || '', db: parsed.db || null });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!checkToken_(body.token)) {
      return jsonOut_({ ok: false, error: 'Geçersiz erişim anahtarı.' });
    }
    if (!body.db || typeof body.db !== 'object') {
      return jsonOut_({ ok: false, error: 'Geçersiz veritabanı paketi.' });
    }
    const nowIso = new Date().toISOString();
    const file = getOrCreateDbFile_();
    file.setContent(JSON.stringify({ updatedAt: nowIso, db: body.db }));
    return jsonOut_({ ok: true, updatedAt: nowIso });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}`;

export interface CloudSyncResult {
  ok: boolean;
  message: string;
  updatedAt?: string;
  remoteDb?: AppDatabase;
  action?: 'pushed' | 'pulled' | 'merged';
}

function isValidAppsScriptUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function pushDatabaseToCloud(
  webAppUrl: string,
  secretToken: string,
  db: AppDatabase
): Promise<CloudSyncResult> {
  if (!isValidAppsScriptUrl(webAppUrl)) {
    return { ok: false, message: 'Geçerli bir Google Apps Script Web App URL adresi giriniz.' };
  }

  try {
    const payload: AppDatabase = {
      ...db,
      schemaVersion: 4,
      exportedAt: new Date().toISOString(),
    };
    // text/plain prevents CORS OPTIONS preflight failure on Google Apps Script
    const res = await fetch(webAppUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        token: secretToken.trim(),
        db: payload,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      updatedAt?: string;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        message: data.error || `Buluta gönderim başarısız oldu (${res.status}).`,
      };
    }
    return {
      ok: true,
      action: 'pushed',
      updatedAt: data.updatedAt || new Date().toISOString(),
      message: 'Veriler Google Bulut deposuna başarıyla gönderildi.',
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Bağlantı hatası: ${err.message}`
          : 'Google Apps Script sunucusuna ulaşılamadı.',
    };
  }
}

export async function pullDatabaseFromCloud(
  webAppUrl: string,
  secretToken: string
): Promise<CloudSyncResult> {
  if (!isValidAppsScriptUrl(webAppUrl)) {
    return { ok: false, message: 'Geçerli bir Google Apps Script Web App URL adresi giriniz.' };
  }

  try {
    const urlObj = new URL(webAppUrl.trim());
    if (secretToken.trim()) {
      urlObj.searchParams.set('token', secretToken.trim());
    }
    urlObj.searchParams.set('t', String(Date.now()));

    const res = await fetch(urlObj.toString(), { method: 'GET' });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      updatedAt?: string;
      db?: unknown;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        message: data.error || `Buluttan veri çekilemedi (${res.status}).`,
      };
    }

    if (!data.db) {
      return {
        ok: false,
        message: 'Bulutta henüz kayıtlı bir veritabanı yok. Önce "Buluta Gönder" işlemini yapın.',
      };
    }

    const report = parseAndMigrateBackup(data.db);
    return {
      ok: true,
      action: 'pulled',
      updatedAt: data.updatedAt || new Date().toISOString(),
      remoteDb: report.mappedDatabase,
      message: `Buluttan ${report.counts.students} öğrenci ve ${report.counts.lessons} ders kaydı çekildi.`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Bağlantı hatası: ${err.message}`
          : 'Buluttan veri okunurken hata oluştu.',
    };
  }
}

/**
 * Akıllı Eşitleme: Bulutu kontrol eder; bulut boşsa yerel veriyi gönderir,
 * bulutta veri varsa yerel ve bulut kayıtlarını birleştirip güncel halini buluta yazar.
 */
export async function syncDatabaseWithCloud(
  webAppUrl: string,
  secretToken: string,
  localDb: AppDatabase
): Promise<CloudSyncResult> {
  const pullRes = await pullDatabaseFromCloud(webAppUrl, secretToken);
  if (!pullRes.ok && pullRes.message.includes('henüz kayıtlı bir veritabanı yok')) {
    return pushDatabaseToCloud(webAppUrl, secretToken, localDb);
  }
  if (!pullRes.ok || !pullRes.remoteDb) {
    return pullRes;
  }

  const mergeById = <T extends { id: string }>(remote: T[], local: T[]): T[] => {
    const map = new Map<string, T>();
    remote.forEach((item) => map.set(item.id, item));
    local.forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  };

  const remote = pullRes.remoteDb;
  const mergedDb: AppDatabase = {
    ...remote,
    ...localDb,
    schemaVersion: 4,
    terms: mergeById(remote.terms, localDb.terms),
    classes: mergeById(remote.classes, localDb.classes),
    lessonSlots: mergeById(remote.lessonSlots, localDb.lessonSlots),
    teachers: mergeById(remote.teachers, localDb.teachers),
    students: mergeById(remote.students, localDb.students),
    schedule: mergeById(remote.schedule, localDb.schedule),
    topicPool: mergeById(remote.topicPool, localDb.topicPool),
    attendance: mergeById(remote.attendance, localDb.attendance),
    lessons: mergeById(remote.lessons, localDb.lessons),
    exams: mergeById(remote.exams, localDb.exams),
    grades: mergeById(remote.grades, localDb.grades),
    homeworks: mergeById(remote.homeworks, localDb.homeworks),
    fridayPermissions: mergeById(remote.fridayPermissions, localDb.fridayPermissions),
    automationLog: { ...(remote.automationLog ?? {}), ...(localDb.automationLog ?? {}) },
  };

  const pushRes = await pushDatabaseToCloud(webAppUrl, secretToken, mergedDb);
  if (!pushRes.ok) {
    return pushRes;
  }

  return {
    ok: true,
    action: 'merged',
    updatedAt: pushRes.updatedAt,
    remoteDb: mergedDb,
    message: 'Yerel ve bulut verileri birleştirilerek eşitlendi.',
  };
}

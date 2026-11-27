import React, { useState } from 'react';
import {
  Check,
  Cloud,
  CloudDownload,
  CloudUpload,
  Code2,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useAppStore } from '../../store/AppStoreContext';
import {
  APPS_SCRIPT_SERVER_CODE,
  pullDatabaseFromCloud,
  pushDatabaseToCloud,
  syncDatabaseWithCloud,
} from '../../utils/cloudSyncEngine';

export const CloudSyncCard: React.FC = () => {
  const { db, updateCloudSyncSettings, importDatabase, showToast } = useAppStore();
  const [busyAction, setBusyAction] = useState<'sync' | 'pull' | 'push' | null>(null);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const cloud = db.cloudSync;

  const handlePush = async () => {
    setBusyAction('push');
    const res = await pushDatabaseToCloud(cloud.webAppUrl, cloud.secretToken, db);
    setBusyAction(null);
    updateCloudSyncSettings({
      lastSyncedAt: res.ok ? res.updatedAt : cloud.lastSyncedAt,
      lastSyncStatus: res.ok ? 'success' : 'error',
      lastSyncMessage: res.message,
    });
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  const handlePull = async () => {
    setBusyAction('pull');
    const res = await pullDatabaseFromCloud(cloud.webAppUrl, cloud.secretToken);
    setBusyAction(null);
    if (res.ok && res.remoteDb) {
      importDatabase(res.remoteDb, 'replace');
    }
    updateCloudSyncSettings({
      lastSyncedAt: res.ok ? res.updatedAt : cloud.lastSyncedAt,
      lastSyncStatus: res.ok ? 'success' : 'error',
      lastSyncMessage: res.message,
    });
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  const handleSmartSync = async () => {
    setBusyAction('sync');
    const res = await syncDatabaseWithCloud(cloud.webAppUrl, cloud.secretToken, db);
    setBusyAction(null);
    if (res.ok && res.remoteDb) {
      importDatabase(res.remoteDb, 'replace');
    }
    updateCloudSyncSettings({
      lastSyncedAt: res.ok ? res.updatedAt : cloud.lastSyncedAt,
      lastSyncStatus: res.ok ? 'success' : 'error',
      lastSyncMessage: res.message,
    });
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_SERVER_CODE);
      setCopiedCode(true);
      showToast('Google Apps Script (Code.gs) kodu kopyalandı.');
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast('Kopyalama başarısız oldu, kodu manuel seçebilirsiniz.', 'error');
    }
  };

  const formattedLastSync = cloud.lastSyncedAt
    ? new Date(cloud.lastSyncedAt).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Henüz eşitlenmedi';

  return (
    <>
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <Cloud className="w-4 h-4" />
              <span>Kendi Google Drive Hesabınızda Canlı Eşitleme</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Google Apps Script Canlı Bulut Eşitlemesi
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Bilgisayar ve telefon arasında verilerinizi kendi Google Apps Script Web App
              bağlantınız üzerinden anlık eşitleyin. Üçüncü parti sunucuya gerek yoktur.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCodeModalOpen(true)}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Code2 className="w-4 h-4 text-emerald-700" />
            Apps Script Kodunu Göster (Code.gs)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          <div className="lg:col-span-8">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Google Apps Script Web App URL
            </label>
            <input
              type="url"
              value={cloud.webAppUrl}
              onChange={(e) => updateCloudSyncSettings({ webAppUrl: e.target.value })}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full h-10 px-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Gizli Erişim Anahtarı (İsteğe Bağlı)
            </label>
            <input
              type="password"
              value={cloud.secretToken}
              onChange={(e) => updateCloudSyncSettings({ secretToken: e.target.value })}
              placeholder="Boş bırakılabilir"
              autoComplete="off"
              className="w-full h-10 px-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={cloud.autoSyncEnabled}
                onClick={() =>
                  updateCloudSyncSettings({ autoSyncEnabled: !cloud.autoSyncEnabled })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                  cloud.autoSyncEnabled ? 'bg-emerald-700' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                    cloud.autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-xs font-semibold text-slate-800">
                Otomatik Bulut Eşitleme
              </span>
            </label>

            <span className="text-xs text-slate-500 tabular-nums">
              Son Eşitleme: <strong className="text-slate-700">{formattedLastSync}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busyAction !== null || !cloud.webAppUrl.trim()}
              onClick={() => void handlePull()}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              <CloudDownload className="w-4 h-4 text-emerald-700" />
              {busyAction === 'pull' ? 'Çekiliyor...' : 'Buluttan Çek'}
            </button>

            <button
              type="button"
              disabled={busyAction !== null || !cloud.webAppUrl.trim()}
              onClick={() => void handlePush()}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              <CloudUpload className="w-4 h-4 text-emerald-700" />
              {busyAction === 'push' ? 'Gönderiliyor...' : 'Buluta Gönder'}
            </button>

            <button
              type="button"
              disabled={busyAction !== null || !cloud.webAppUrl.trim()}
              onClick={() => void handleSmartSync()}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${busyAction === 'sync' ? 'animate-spin' : ''}`} />
              {busyAction === 'sync' ? 'Eşitleniyor...' : 'Şimdi Eşitle'}
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        title="Google Apps Script Sunucu Kodu (Code.gs)"
        maxWidthClass="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCodeModalOpen(false)}
              className="min-h-[38px] px-4 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Kapat
            </button>
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              className="min-h-[38px] px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Kodu Kopyala
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>script.google.com</strong> adresinde yeni proje oluşturup aşağıdaki kodu
            yapıştırın. Ardından <strong>Dağıt → Yeni Dağıtım → Web Uygulaması</strong> adımlarını
            izleyip erişim yetkisini <strong>Herkes</strong> seçerek aldığınız URL&apos;yi yukarıya
            yapıştırın.
          </p>
          <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-100 text-[11px] font-mono overflow-x-auto max-h-80 leading-relaxed">
            {APPS_SCRIPT_SERVER_CODE}
          </pre>
        </div>
      </Modal>
    </>
  );
};

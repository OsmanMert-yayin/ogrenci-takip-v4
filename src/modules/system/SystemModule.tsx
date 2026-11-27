import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useAppStore } from '../../store/AppStoreContext';
import type { ImportMappingReport } from '../../types';
import { exportDatabaseToJson, parseAndMigrateBackup } from '../../utils/backupMigration';
import { CloudSyncCard } from './CloudSyncCard';

export const SystemModule: React.FC = () => {
  const { db, storageSizeKB, importDatabase, resetToSeedData, showToast } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingReport, setPendingReport] = useState<ImportMappingReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const handleExport = () => {
    exportDatabaseToJson(db);
    showToast('v4 JSON yedeği indirildi.');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportError(null);
    setPendingReport(null);

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const report = parseAndMigrateBackup(parsed);
      setPendingReport(report);
    } catch {
      setImportError(
        'Seçilen dosya geçerli bir JSON yedeği değil. Lütfen bozulmamış bir .json yedek dosyası seçin.'
      );
    }
  };

  const confirmImport = () => {
    if (!pendingReport) return;
    importDatabase(pendingReport.mappedDatabase, importMode);
    setPendingReport(null);
    showToast(
      importMode === 'replace'
        ? 'Yedek başarıyla yüklendi ve tüm veriler güncellendi.'
        : 'Yedek mevcut verilerle başarıyla birleştirildi.'
    );
  };

  const confirmReset = () => {
    resetToSeedData();
    setResetModalOpen(false);
    showToast('Sistem başlangıç örnek verisine sıfırlandı.', 'info');
  };

  const summaryRows = [
    { label: 'Akademik Dönemler', count: db.terms.length },
    { label: 'Sınıflar & Gruplar', count: db.classes.length },
    { label: 'Ders & Etüt Saatleri', count: db.lessonSlots.length },
    { label: 'Öğretmenler', count: db.teachers.length },
    { label: 'Öğrenciler', count: db.students.length },
    { label: 'Yoklama Kayıtları', count: db.attendance.length },
    { label: 'Ders Dinleme Kayıtları', count: db.lessons.length },
    {
      label: 'Program / Konu / Not / Cuma',
      count:
        db.schedule.length +
        db.topicPool.length +
        db.grades.length +
        db.homeworks.length +
        db.fridayPermissions.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Backup & Restore Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Export Card */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700">
              <Download className="w-4 h-4" />
              <span>Güvenli Dışa Aktarım</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Yedek İndir (.json)</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kurum ayarları, akademik dönemler, sınıflar, ders saatleri, tüm öğrenci/veli
              kayıtları ve ders geçmişini tek bir standart v4 JSON dosyası olarak cihazınıza
              indirin.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 tabular-nums">
              Şema v{db.schemaVersion} · Yaklaşık {storageSizeKB} KB
            </span>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              JSON Yedek İndir
            </button>
          </div>
        </section>

        {/* Import Card (v4 & v3 Compatible) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
              <FileJson className="w-4 h-4 text-emerald-700" />
              <span>v4 ve Eski v3 Uyumlu Akıllı Aktarım</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Yedek Yükle (İçe Aktar)</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Hem güncel v4 yedeklerini hem de eski v3 JSON dosyalarını esnek alan eşleştirmesi ile
              veri kaybetmeden içeri aktarır. Uygulamadan önce eşleştirme özeti gösterilir.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">Desteklenen biçim: .json</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => void handleFileChange(e)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 text-sm font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              Yedek Dosyası Seç
            </button>
          </div>
        </section>
      </div>

      {/* Google Apps Script Canlı Bulut Eşitleme */}
      <CloudSyncCard />

      {/* Import Error Feedback */}
      {importError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div>{importError}</div>
        </div>
      )}

      {/* Pending Import Preview Panel */}
      {pendingReport && (
        <section className="bg-white border border-emerald-300 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Dosya Okundu · Kaynak:{' '}
                  {pendingReport.sourceVersion === 'v4'
                    ? 'v4 Standart Yedek'
                    : pendingReport.sourceVersion === 'v3-legacy'
                      ? 'v3 / Eski Biçim (Otomatik Eşleştirildi)'
                      : 'Kısmi JSON'}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mt-1">
                İçe Aktarım Önizlemesi
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setPendingReport(null)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Vazgeç
            </button>
          </div>

          {pendingReport.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
              {pendingReport.warnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
              <div className="text-slate-500">Öğrenci</div>
              <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                {pendingReport.counts.students}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
              <div className="text-slate-500">Sınıf / Öğretmen</div>
              <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                {pendingReport.counts.classes} / {pendingReport.counts.teachers}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
              <div className="text-slate-500">Dönem / Saat</div>
              <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                {pendingReport.counts.terms} / {pendingReport.counts.lessonSlots}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
              <div className="text-slate-500">Yoklama / Ders</div>
              <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                {pendingReport.counts.attendance} / {pendingReport.counts.lessons}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Üzerine Yaz (Tam Geri Yükle)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  importMode === 'merge'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mevcut Verilerle Birleştir
              </button>
            </div>

            <button
              type="button"
              onClick={confirmImport}
              className="min-h-[42px] px-5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Aktarımı Onayla
            </button>
          </div>
        </section>
      )}

      {/* Safe Data Summary */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-semibold text-slate-900">Güvenli Veri Özeti</h3>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            Yerel depolama kullanımı: {storageSizeKB} KB (Gecikmeli otomatik kayıt etkin)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {summaryRows.slice(0, 4).map((row) => (
            <div key={row.label} className="p-4 sm:p-5">
              <div className="text-xs text-slate-500">{row.label}</div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{row.count}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-slate-100 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {summaryRows.slice(4).map((row) => (
            <div key={row.label} className="p-4 sm:p-5">
              <div className="text-xs text-slate-500">{row.label}</div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{row.count}</div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Tüm veriler yalnızca bu cihazın yerel deposunda tutulur. Düzenli JSON yedeği almanız
            önerilir.
          </span>

          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Örnek Veriye Sıfırla
          </button>
        </div>
      </section>

      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Örnek Veriye Sıfırla"
        maxWidthClass="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="min-h-[40px] px-4 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={confirmReset}
              className="min-h-[40px] px-4 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors cursor-pointer"
            >
              Evet, Sıfırla
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Mevcut tüm yerel kayıtlar silinerek uygulama başlangıç örnek verisine (1 dönem, 2 sınıf,
          5 örnek öğrenci) döndürülecektir. Devam etmeden önce yedek almanız tavsiye edilir.
        </p>
      </Modal>
    </div>
  );
};

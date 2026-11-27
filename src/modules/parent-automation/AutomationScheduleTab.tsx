import React from 'react';
import { BellRing, BookX, Clock, FileText, Play } from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import type {
  AutomationAttendanceMode,
  AutomationChannel,
  AutomationDailyReportMode,
} from '../../types';
import { AUTO_EZBER_MILAT_DATE } from '../../utils/automationScheduler';
import { formatTurkishDate } from '../../utils/id';

const CHANNEL_OPTIONS: { value: AutomationChannel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp Kuyruğuna Ekle' },
  { value: 'telegram', label: 'Telegram Otomatik Gönder' },
  { value: 'both', label: 'WhatsApp Kuyruğu + Telegram' },
];

export const AutomationScheduleTab: React.FC = () => {
  const { db, updateAutomationSettings, runAutoEzberNow, showToast } = useAppStore();
  const auto = db.automation;

  const handleRunEzberNow = () => {
    const created = runAutoEzberNow();
    if (created > 0) {
      showToast(`${created} öğrenci için otomatik Ezber "Vermedi" kaydı oluşturuldu.`);
    } else {
      showToast('Bugün için eksik Ezber kaydı bulunamadı veya zaten işlendi.', 'info');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Card 1: Yoklama Bildirimi */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Yoklama Bildirimi</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Gelmedi, Derse Girmedi, Kurstan İzinsiz Çıktı, Geç Geldi ve İzinli kayıtları.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Bildirim Modu
                </label>
                <select
                  value={auto.attendanceMode}
                  onChange={(e) =>
                    updateAutomationSettings({
                      attendanceMode: e.target.value as AutomationAttendanceMode,
                    })
                  }
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 cursor-pointer"
                >
                  <option value="instant">Girer Girmez Anında Otomatik</option>
                  <option value="scheduled">Belirli Saatte Otomatik</option>
                  <option value="manual">Sadece Manuel</option>
                </select>
              </div>

              {auto.attendanceMode === 'scheduled' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Otomatik Gönderim Saati
                  </label>
                  <input
                    type="time"
                    value={auto.attendanceTime}
                    onChange={(e) => updateAutomationSettings({ attendanceTime: e.target.value })}
                    className="w-full h-10 px-3 text-sm tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gönderim Kanalı
                </label>
                <select
                  value={auto.attendanceChannel}
                  onChange={(e) =>
                    updateAutomationSettings({
                      attendanceChannel: e.target.value as AutomationChannel,
                    })
                  }
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 cursor-pointer"
                >
                  {CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
            {auto.attendanceMode === 'instant'
              ? 'Yoklama girildiği anda ilgili şablonla kuyruğa alınır veya Telegram ile iletilir.'
              : auto.attendanceMode === 'scheduled'
                ? `Her gün saat ${auto.attendanceTime} itibarıyla günün devamsızlıkları işlenir.`
                : 'Yoklama bildirimleri otomatik gönderilmez.'}
          </div>
        </section>

        {/* Card 2: Günlük Ders Raporu */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Günlük Ders Raporu</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Puan + Tur birleşik değerlendirme yorumuyla tüm öğrencilerin akşam özeti.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gönderim Modu
                </label>
                <select
                  value={auto.dailyReportMode}
                  onChange={(e) =>
                    updateAutomationSettings({
                      dailyReportMode: e.target.value as AutomationDailyReportMode,
                    })
                  }
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 cursor-pointer"
                >
                  <option value="scheduled">Belirli Saatte Otomatik</option>
                  <option value="manual">Sadece Manuel</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Günlük Rapor Saati
                </label>
                <input
                  type="time"
                  value={auto.dailyReportTime}
                  disabled={auto.dailyReportMode === 'manual'}
                  onChange={(e) => updateAutomationSettings({ dailyReportTime: e.target.value })}
                  className="w-full h-10 px-3 text-sm tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gönderim Kanalı
                </label>
                <select
                  value={auto.dailyReportChannel}
                  onChange={(e) =>
                    updateAutomationSettings({
                      dailyReportChannel: e.target.value as AutomationChannel,
                    })
                  }
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 cursor-pointer"
                >
                  {CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
            Aynı gün aynı öğrenci için kalıcı kilit kullanılır; mükerrer rapor oluşturulmaz.
          </div>
        </section>

        {/* Card 3: Ezber Otomatik "Vermedi" */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <BookX className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Ezber Otomatik &ldquo;Vermedi&rdquo;
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Programında Ezber olup gün sonuna kadar dinletmeyenlere otomatik kayıt atar.
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={auto.autoEzberEnabled}
                onClick={() =>
                  updateAutomationSettings({ autoEzberEnabled: !auto.autoEzberEnabled })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                  auto.autoEzberEnabled ? 'bg-emerald-700' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                    auto.autoEzberEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tetikleme Saati
                </label>
                <input
                  type="time"
                  value={auto.autoEzberTime}
                  disabled={!auto.autoEzberEnabled}
                  onChange={(e) => updateAutomationSettings({ autoEzberTime: e.target.value })}
                  className="w-full h-10 px-3 text-sm tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 disabled:opacity-50"
                />
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-600 space-y-1">
                <div>• Tam gün Gelmedi veya İzinli öğrencilere uygulanmaz.</div>
                <div>• Günlük Rapor ile aynı saatteyse önce bu kural çalışır.</div>
                <div>
                  • Milat koruması: {formatTurkishDate(AUTO_EZBER_MILAT_DATE)} ve sonrası geçerlidir.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              Dakikada 1 kontrol
            </span>
            <button
              type="button"
              onClick={handleRunEzberNow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3" />
              Şimdi Kontrol Et
            </button>
          </div>
        </section>
      </div>

      {/* Guardian Relation Toggle */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-900">
            Veli Hitabında Yakınlık Derecesini Göster
          </div>
          <div className="text-xs text-slate-500">
            Etkin olduğunda mesajlarda &ldquo;Mehmet Karahan (Baba)&rdquo; şeklinde hitap kullanılır.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={auto.autoIncludeGuardianRelation}
          onClick={() =>
            updateAutomationSettings({
              autoIncludeGuardianRelation: !auto.autoIncludeGuardianRelation,
            })
          }
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
            auto.autoIncludeGuardianRelation ? 'bg-emerald-700' : 'bg-slate-200'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
              auto.autoIncludeGuardianRelation ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

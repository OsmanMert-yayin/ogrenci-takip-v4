import React, { useMemo, useState } from 'react';
import { Bot, Check, Copy, ExternalLink, Globe, Send } from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import type { ParentPortalSettings } from '../../types';
import {
  buildParentPortalUrl,
  getPrimaryGuardian,
  sendTelegramMessage,
} from '../../utils/reportFormatter';

const PORTAL_VISIBILITY_ITEMS: { key: keyof Omit<ParentPortalSettings, 'enabled' | 'accessCode'>; label: string }[] = [
  { key: 'showAttendance', label: 'Yoklama Kayıtları' },
  { key: 'showLessons', label: 'Günlük Dersler & Kuvvet Yorumları' },
  { key: 'showHomeworks', label: 'Ödev Durumları' },
  { key: 'showGrades', label: 'Sınav & Kanaat Notları' },
  { key: 'showClassRank', label: 'Sınıf Sıralaması' },
  { key: 'showFridayLeave', label: 'Cuma İzni Uygunluk Durumu' },
];

export const PortalTelegramTab: React.FC = () => {
  const {
    db,
    updateAutomationSettings,
    updateGuardianTelegramChatId,
    showToast,
  } = useAppStore();

  const [testChatId, setTestChatId] = useState('');
  const [testing, setTesting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeStudents = useMemo(
    () => db.students.filter((s) => s.status === 'Aktif'),
    [db.students]
  );
  const classMap = useMemo(() => new Map(db.classes.map((c) => [c.id, c.name])), [db.classes]);
  const portalSettings = db.automation.portalSettings;
  const generalPortalUrl = buildParentPortalUrl();

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast('Bağlantı panoya kopyalandı.');
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast('Kopyalama desteklenmedi, bağlantıyı manuel seçebilirsiniz.', 'error');
    }
  };

  const handleTestTelegram = async () => {
    const token = db.automation.telegramBotToken.trim();
    const firstBoundChat =
      testChatId.trim() ||
      activeStudents
        .flatMap((s) => s.guardians)
        .find((g) => g.telegramChatId?.trim())?.telegramChatId?.trim() ||
      '';

    if (!token) {
      showToast('Önce Telegram Bot Token bilgisini girin.', 'error');
      return;
    }
    if (!firstBoundChat) {
      showToast('Test için bir Chat ID yazın veya aşağıdan bir veliye Chat ID tanımlayın.', 'error');
      return;
    }

    setTesting(true);
    const res = await sendTelegramMessage(
      token,
      firstBoundChat,
      `✅ ${db.institution.name}\nTelegram Bot bağlantısı başarıyla doğrulandı. Veli bildirimleri bu kanal üzerinden iletilebilir.`
    );
    setTesting(false);

    if (res.ok) {
      showToast('Telegram test mesajı başarıyla gönderildi.');
    } else {
      showToast(`Telegram hatası: ${res.error}`, 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Row 1: Veli Portalı + Telegram Bot Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Veli Takip Portalı */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Salt Okunur Veli Takip Portalı
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Veliler öğrenci numarası ve telefon son 4 hanesi ile giriş yapar.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={portalSettings.enabled}
              onClick={() =>
                updateAutomationSettings({
                  portalSettings: { ...portalSettings, enabled: !portalSettings.enabled },
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
                portalSettings.enabled ? 'bg-emerald-700' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                  portalSettings.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Shareable Portal URL */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
            <div className="text-xs font-medium text-slate-700">Genel Veli Portalı Bağlantısı</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generalPortalUrl}
                className="flex-1 h-9 px-2.5 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700"
              />
              <button
                type="button"
                onClick={() => void handleCopy(generalPortalUrl, 'general')}
                className="h-9 px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedKey === 'general' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Kopyala
              </button>
              <a
                href={generalPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-3 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg inline-flex items-center gap-1.5 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Önizle
              </a>
            </div>
          </div>

          {/* Optional Access Code */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Alternatif Kurum Giriş Kodu (Telefon son 4 hane yerine kullanılabilir)
            </label>
            <input
              type="text"
              value={portalSettings.accessCode}
              onChange={(e) =>
                updateAutomationSettings({
                  portalSettings: { ...portalSettings, accessCode: e.target.value },
                })
              }
              placeholder="Örn: 2026"
              className="w-44 h-9 px-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          {/* Portal Visibility Switches */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-800">
              Veli Portalında Görünecek Bölümler
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PORTAL_VISIBILITY_ITEMS.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200/80 bg-slate-50/50 cursor-pointer"
                >
                  <span className="text-xs font-medium text-slate-700">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={portalSettings[item.key]}
                    onChange={() =>
                      updateAutomationSettings({
                        portalSettings: {
                          ...portalSettings,
                          [item.key]: !portalSettings[item.key],
                        },
                      })
                    }
                    className="w-4 h-4 accent-emerald-700 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Telegram Bot Configuration */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Telegram Bot Entegrasyonu
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  BotFather üzerinden alınan Token ile velilere HTML formatında otomatik bildirim
                  gönderin.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Telegram Bot Token
              </label>
              <input
                type="password"
                value={db.automation.telegramBotToken}
                onChange={(e) =>
                  updateAutomationSettings({ telegramBotToken: e.target.value })
                }
                placeholder="123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                className="w-full h-10 px-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3.5 space-y-2.5">
              <div className="text-xs font-semibold text-slate-800">Bağlantı Testi</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testChatId}
                  onChange={(e) => setTestChatId(e.target.value)}
                  placeholder="Test Chat ID (boşsa ilk kayıtlı veli kullanılır)"
                  className="flex-1 h-9 px-3 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  disabled={testing}
                  onClick={() => void handleTestTelegram()}
                  className="h-9 px-3.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  {testing ? 'Gönderiliyor...' : 'Test Mesajı Gönder'}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
            Veli Chat ID öğrenmek için velinin Telegram botunuza <span className="font-mono">/start</span>{' '}
            yazması yeterlidir. Aşağıdaki tablodan her öğrencinin birincil velisine Chat ID
            eşleştirebilirsiniz.
          </div>
        </section>
      </div>

      {/* Row 2: Guardian Telegram Chat ID & Per-Student Portal Link Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Veli Telegram Chat ID Eşleştirme & Kişisel Portal Linkleri
            </h3>
            <p className="text-xs text-slate-500">
              {activeStudents.length} aktif öğrenci · Değişiklikler otomatik kaydedilir
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-2.5">Öğrenci</th>
                <th className="px-4 py-2.5">Sınıf</th>
                <th className="px-4 py-2.5">Birincil Veli</th>
                <th className="px-4 py-2.5">Telegram Chat ID</th>
                <th className="px-4 py-2.5 text-right">Portal Linki</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {activeStudents.map((st) => {
                const guardian = getPrimaryGuardian(st);
                const studentPortalUrl = buildParentPortalUrl(st.studentNo);
                return (
                  <tr key={st.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900">{st.fullName}</div>
                      {st.studentNo && (
                        <div className="text-xs text-slate-400 tabular-nums">No: {st.studentNo}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {classMap.get(st.classId) ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-700">
                      {guardian ? (
                        <div>
                          <div className="font-medium text-slate-800">
                            {guardian.fullName} ({guardian.relation})
                          </div>
                          <div className="text-slate-400 tabular-nums">{guardian.phone || '—'}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Veli kaydı yok</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {guardian ? (
                        <input
                          type="text"
                          value={guardian.telegramChatId ?? ''}
                          onChange={(e) =>
                            updateGuardianTelegramChatId(st.id, guardian.id, e.target.value)
                          }
                          placeholder="Örn: 548192034"
                          className="w-40 h-8 px-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => void handleCopy(studentPortalUrl, st.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                      >
                        {copiedKey === st.id ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        Linki Kopyala
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

import React, { useState } from 'react';
import { Clock, FileText, Globe, Send } from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import { getTodayISO } from '../../utils/id';
import { AutomationScheduleTab } from './AutomationScheduleTab';
import { MessageTemplatesTab } from './MessageTemplatesTab';
import { PortalTelegramTab } from './PortalTelegramTab';

type ParentTabKey = 'schedule' | 'templates' | 'portal';

export const ParentAutomationModule: React.FC = () => {
  const { db, triggerManualDailyReportBatch, showToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<ParentTabKey>('schedule');
  const [reportDate, setReportDate] = useState<string>(() => getTodayISO());
  const [sendingBatch, setSendingBatch] = useState(false);

  const handleBatchDailyReport = async () => {
    setSendingBatch(true);
    const res = await triggerManualDailyReportBatch(reportDate);
    setSendingBatch(false);

    const parts: string[] = [];
    if (res.queued > 0) parts.push(`${res.queued} WhatsApp mesajı kuyruğa eklendi`);
    if (res.telegramSent > 0) parts.push(`${res.telegramSent} Telegram mesajı gönderildi`);
    if (res.telegramFailed > 0) parts.push(`${res.telegramFailed} Telegram gönderimi başarısız`);

    if (parts.length > 0) {
      showToast(parts.join(' · '), res.telegramFailed > 0 ? 'info' : 'success');
    } else {
      showToast('Seçili kanal için gönderilecek veli bulunamadı.', 'info');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Veli &amp; Otomasyon Merkezi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Zamanlı bildirim kuralları, Puan+Tur akıllı rapor şablonları, Telegram Bot ve Veli
            Portalı yönetimi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            aria-label="Günlük Rapor Tarihi"
            className="h-10 px-3 text-xs font-medium tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-600"
          />
          <button
            type="button"
            disabled={sendingBatch}
            onClick={() => void handleBatchDailyReport()}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            {sendingBatch ? 'Hazırlanıyor...' : 'Toplu Günlük Rapor Gönder'}
          </button>
        </div>
      </section>

      {/* 3 Clean Top Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 min-w-[160px] min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>Zamanlama &amp; Kurallar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex-1 min-w-[160px] min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'templates'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Mesaj Şablonları</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('portal')}
          className={`flex-1 min-w-[180px] min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'portal'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Globe className="w-4 h-4 shrink-0" />
          <span>Veli Portalı &amp; Telegram Bot</span>
          {db.whatsappQueue.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                activeTab === 'portal'
                  ? 'bg-emerald-900/40 text-white'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {db.whatsappQueue.length}
            </span>
          )}
        </button>
      </div>

      {/* Active Tab Body */}
      {activeTab === 'schedule' && <AutomationScheduleTab />}
      {activeTab === 'templates' && <MessageTemplatesTab />}
      {activeTab === 'portal' && <PortalTelegramTab />}
    </div>
  );
};

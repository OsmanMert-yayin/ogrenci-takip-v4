import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  ExternalLink,
  MessageCircle,
  MessageSquareText,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import type { ModuleKey } from '../../types';
import { buildWhatsAppUrl } from '../../utils/reportFormatter';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { NAV_ITEMS } from './navConfig';

interface MobileMenuDrawerProps {
  open: boolean;
  activeModule: ModuleKey;
  institutionName: string;
  onClose: () => void;
  onSelect: (key: ModuleKey) => void;
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  open,
  activeModule,
  institutionName,
  onClose,
  onSelect,
}) => {
  const {
    db,
    removeWhatsAppQueueItem,
    clearWhatsAppQueue,
    triggerManualDailyReportBatch,
    showToast,
  } = useAppStore();
  const [sendingQuickBatch, setSendingQuickBatch] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handlePick = (key: ModuleKey) => {
    onSelect(key);
    onClose();
  };

  const handleQuickDailyReport = async () => {
    setSendingQuickBatch(true);
    const res = await triggerManualDailyReportBatch();
    setSendingQuickBatch(false);
    if (res.queued > 0 || res.telegramSent > 0) {
      showToast(
        `${res.queued > 0 ? `${res.queued} WhatsApp hazır` : ''}${
          res.queued > 0 && res.telegramSent > 0 ? ' · ' : ''
        }${res.telegramSent > 0 ? `${res.telegramSent} Telegram gönderildi` : ''}`
      );
    } else {
      showToast('Gönderilecek veli bulunamadı.', 'info');
    }
  };

  const queue = db.whatsappQueue;

  return (
    <div
      className="lg:hidden fixed inset-0 z-50 flex items-end bg-slate-950/45 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full bg-white rounded-t-3xl border-t border-slate-200 max-h-[88vh] flex flex-col pb-safe">
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 truncate">
              Veli Bildirimi &amp; Modüller
            </h2>
            <p className="text-xs text-slate-500 truncate">{institutionName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Menüyü kapat"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3.5 space-y-3.5">
          {/* 1. Pending WhatsApp Notifications (Mobile 1-Tap Send) */}
          {queue.length > 0 && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                  <MessageCircle className="w-4 h-4 text-emerald-700" />
                  <span>Bekleyen WhatsApp Bildirimleri ({queue.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearWhatsAppQueue();
                    showToast('Kuyruk temizlendi.', 'info');
                  }}
                  className="text-[11px] font-medium text-emerald-800 hover:text-red-700 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Temizle
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {queue.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-emerald-200/80 px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {item.studentName} ·{' '}
                        <span className="text-emerald-700">{item.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.guardianName} ({item.guardianPhone})
                      </div>
                    </div>
                    <a
                      href={buildWhatsAppUrl(item.guardianPhone, item.message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => removeWhatsAppQueueItem(item.id)}
                      className="min-h-[36px] px-3 rounded-lg bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Gönder
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Quick Daily Report & Veli Otomasyon Card */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handlePick('automation')}
                className="flex-1 flex items-center gap-2.5 text-left min-w-0"
              >
                <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <MessageSquareText className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    Veli &amp; Otomasyon Merkezi
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Şablonlar, zamanlama, Telegram ve Portal
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>

            <button
              type="button"
              disabled={sendingQuickBatch}
              onClick={() => void handleQuickDailyReport()}
              className="w-full min-h-[42px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              {sendingQuickBatch
                ? 'Günlük Raporlar Hazırlanıyor...'
                : 'Bugünün Günlük Raporlarını Hazırla / Gönder'}
            </button>
          </div>

          {/* 3. All Other Modules Grid */}
          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.filter((i) => i.key !== 'automation').map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handlePick(item.key)}
                  className={`min-h-[50px] px-3.5 py-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors ${
                    isActive
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-100' : 'text-emerald-700'}`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{item.label}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-1 flex justify-center">
            <PWAInstallButton />
          </div>
        </div>
      </div>
    </div>
  );
};

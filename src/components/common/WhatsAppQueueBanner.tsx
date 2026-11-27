import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, ExternalLink, MessageCircle, Trash2, X } from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import type { WhatsAppQueueItem } from '../../types';
import { buildWhatsAppUrl } from '../../utils/reportFormatter';
import { Modal } from './Modal';

export const WhatsAppQueueBanner: React.FC = () => {
  const {
    db,
    updateWhatsAppQueueItem,
    removeWhatsAppQueueItem,
    clearWhatsAppQueue,
    showToast,
  } = useAppStore();

  const [expanded, setExpanded] = useState(false);
  const [editingItem, setEditingItem] = useState<WhatsAppQueueItem | null>(null);
  const [draftMessage, setDraftMessage] = useState('');

  const queue = db.whatsappQueue;
  if (queue.length === 0) return null;

  const openEditor = (item: WhatsAppQueueItem) => {
    setEditingItem(item);
    setDraftMessage(item.message);
  };

  const saveEdit = () => {
    if (!editingItem) return;
    updateWhatsAppQueueItem(editingItem.id, draftMessage);
    setEditingItem(null);
    showToast('Mesaj metni güncellendi.');
  };

  return (
    <>
      <div className="print-hidden hidden lg:block bg-emerald-900 text-white border-b border-emerald-800">
        <div className="px-8 py-2 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2.5 text-xs font-semibold hover:text-emerald-200 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>
              Bekleyen WhatsApp Bildirim Kuyruğu:{' '}
              <span className="tabular-nums underline decoration-emerald-400">
                {queue.length} mesaj hazır
              </span>
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-emerald-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-emerald-300" />
            )}
          </button>

          <div className="flex items-center gap-2">
            {!expanded && queue[0] && (
              <a
                href={buildWhatsAppUrl(queue[0].guardianPhone, queue[0].message)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => removeWhatsAppQueueItem(queue[0].id)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                İlk Mesajı Gönder ({queue[0].studentName})
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                clearWhatsAppQueue();
                setExpanded(false);
                showToast('WhatsApp kuyruğu temizlendi.', 'info');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Tümünü Temizle
            </button>
          </div>
        </div>

        {expanded && (
          <div className="px-8 pb-3 pt-1 max-h-72 overflow-y-auto">
            <div className="bg-white text-slate-900 rounded-xl border border-emerald-200 divide-y divide-slate-100 shadow-sm">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-4 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {item.studentName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                        {item.label}
                      </span>
                      <span className="text-xs text-slate-500 truncate">
                        {item.guardianName} · {item.guardianPhone}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{item.message}</div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditor(item)}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Önizle / Düzenle
                    </button>
                    <a
                      href={buildWhatsAppUrl(item.guardianPhone, item.message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => removeWhatsAppQueueItem(item.id)}
                      className="h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Gönder
                    </a>
                    <button
                      type="button"
                      onClick={() => removeWhatsAppQueueItem(item.id)}
                      aria-label="Kuyruktan kaldır"
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title={
          editingItem
            ? `${editingItem.studentName} — ${editingItem.guardianName}`
            : 'Mesajı Düzenle'
        }
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="min-h-[38px] px-4 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="min-h-[38px] px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              Metni Kaydet
            </button>
            {editingItem && (
              <a
                href={buildWhatsAppUrl(editingItem.guardianPhone, draftMessage)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  removeWhatsAppQueueItem(editingItem.id);
                  setEditingItem(null);
                }}
                className="min-h-[38px] px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                WhatsApp&apos;ta Gönder
              </a>
            )}
          </>
        }
      >
        <div className="space-y-2">
          <div className="text-xs text-slate-500">
            Alıcı Telefon: <span className="font-mono text-slate-800">{editingItem?.guardianPhone}</span>
          </div>
          <textarea
            rows={10}
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            className="w-full p-3 text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
          />
        </div>
      </Modal>
    </>
  );
};

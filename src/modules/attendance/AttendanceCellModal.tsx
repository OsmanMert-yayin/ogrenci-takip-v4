import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import type { AttendanceStatus, LessonSlot, Student } from '../../types';
import { ATTENDANCE_STATUS_META, ATTENDANCE_STATUS_ORDER } from './attendanceMeta';

interface AttendanceCellModalProps {
  open: boolean;
  student: Student | null;
  slot: LessonSlot | null;
  subjectLabel?: string;
  initialStatus: AttendanceStatus | null;
  initialNote?: string;
  inheritedFromDaily: boolean;
  remainingSlotCount: number;
  onClose: () => void;
  onSave: (status: AttendanceStatus, note: string, applyToRemaining: boolean) => void;
  onClear: () => void;
}

export const AttendanceCellModal: React.FC<AttendanceCellModalProps> = ({
  open,
  student,
  slot,
  subjectLabel,
  initialStatus,
  initialNote,
  inheritedFromDaily,
  remainingSlotCount,
  onClose,
  onSave,
  onClear,
}) => {
  const [selected, setSelected] = useState<AttendanceStatus>(initialStatus ?? 'Geldi');
  const [note, setNote] = useState(initialNote ?? '');
  const [applyToRemaining, setApplyToRemaining] = useState(true);

  useEffect(() => {
    if (!open) return;
    setSelected(initialStatus ?? 'Geldi');
    setNote(initialNote ?? '');
    setApplyToRemaining(true);
  }, [open, initialStatus, initialNote]);

  if (!student || !slot) return null;

  const showApplyRemaining = selected === 'Kurstan İzinsiz Çıktı' && remainingSlotCount > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student.fullName}
      subtitle={`${slot.name} (${slot.startTime}–${slot.endTime})${subjectLabel ? ` · ${subjectLabel}` : ''}`}
      maxWidthClass="max-w-lg"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          {initialStatus && !inheritedFromDaily ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Kaydı Temizle
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg cursor-pointer"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => onSave(selected, note.trim(), showApplyRemaining && applyToRemaining)}
              className="min-h-[40px] px-4 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
            >
              Kaydet
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {inheritedFromDaily && (
          <div className="text-xs text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-3.5 py-2.5">
            Bu durum <strong>Günlük Genel Liste</strong> kaydından otomatik yansımaktadır. Aşağıdan
            yalnızca bu ders saatine özel bir durum seçebilirsiniz.
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">Yoklama Durumu</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ATTENDANCE_STATUS_ORDER.map((status) => {
              const meta = ATTENDANCE_STATUS_META[status];
              const isSelected = selected === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelected(status)}
                  className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg border transition-colors text-left flex items-center gap-2 cursor-pointer ${
                    isSelected ? meta.buttonActiveClass : meta.buttonIdleClass
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-white/90' : meta.dotColorClass
                    }`}
                  />
                  <span className="truncate">{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {ATTENDANCE_STATUS_META[selected].description}
          </p>
        </div>

        {showApplyRemaining && (
          <label className="flex items-start gap-2.5 p-3 bg-slate-900 text-white rounded-xl text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyToRemaining}
              onChange={(e) => setApplyToRemaining(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-400"
            />
            <span>
              <strong>Günün kalan {remainingSlotCount} ders saatine de uygula</strong> — Öğrenci
              kurstan izinsiz ayrıldığı için sonraki tüm ders saatleri otomatik olarak siyah KİÇ
              işaretlenir.
            </span>
          </label>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Açıklama / Not (İsteğe Bağlı)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              selected === 'İzinli'
                ? 'Örn: Hastaneye gitti, aile izni...'
                : selected === 'Geç Geldi'
                  ? 'Örn: 15 dakika geç geldi...'
                  : 'Kısa açıklama...'
            }
            className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>
    </Modal>
  );
};

import React from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import type { LessonEvaluation, LessonResultStatus } from '../../types';
import type { LessonUpsertInput } from '../../store/academicMutations';
import {
  buildDuplicateConfirmMessage,
  type DuplicateMatchInfo,
  type MakeupCandidateInfo,
} from '../../utils/duplicateAndMakeupEngine';

export interface PendingLessonRequest {
  input: LessonUpsertInput;
  studentName: string;
  onCommitted?: () => void;
}

export function lessonStatusToEvaluation(
  status: LessonResultStatus,
  score?: number
): LessonEvaluation {
  if (status === 'Vermedi') return 'Dinlenmedi';
  if (status === 'Tekrar') return 'Tekrar';
  if (typeof score === 'number') {
    if (score >= 85) return 'Pekiyi';
    if (score >= 70) return 'İyi';
    return 'Orta';
  }
  return 'İyi';
}

interface DuplicateConfirmModalProps {
  open: boolean;
  studentName: string;
  pageOrSure: string;
  match: DuplicateMatchInfo | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DuplicateConfirmModal: React.FC<DuplicateConfirmModalProps> = ({
  open,
  studentName,
  pageOrSure,
  match,
  onCancel,
  onConfirm,
}) => {
  if (!match) return null;
  const message = buildDuplicateConfirmMessage(studentName, pageOrSure, match);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Mükerrer Ders Uyarısı"
      subtitle="Aynı sayfa/sure için daha önce kayıt oluşturulmuş"
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[40px] px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[40px] px-4 rounded-lg bg-amber-600 text-sm font-medium text-white hover:bg-amber-700 transition-colors cursor-pointer"
          >
            Evet, Yine de Kaydet
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm text-amber-950 leading-relaxed">
          <p className="font-medium">{message}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-amber-800">
            <span className="px-2 py-0.5 rounded bg-white/80 border border-amber-200 tabular-nums">
              Önceki Tarih: {match.fullDate}
              {match.recordedTime ? ` • ${match.recordedTime}` : ''}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/80 border border-amber-200 tabular-nums">
              Durum: {match.status} ({match.scoreLabel})
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

interface MakeupConfirmModalProps {
  open: boolean;
  studentName: string;
  candidate: MakeupCandidateInfo | null;
  onCancel: () => void;
  onSaveNormal: () => void;
  onSaveAsMakeup: () => void;
}

export const MakeupConfirmModal: React.FC<MakeupConfirmModalProps> = ({
  open,
  studentName,
  candidate,
  onCancel,
  onSaveNormal,
  onSaveAsMakeup,
}) => {
  if (!candidate) return null;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Telafi Dersi Eşleşmesi Bulundu"
      subtitle="Öğrencinin kapanmamış önceki dersi telafi olarak bağlansın mı?"
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[40px] px-3.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onSaveNormal}
            className="min-h-[40px] px-3.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Normal Ders Olarak Kaydet
          </button>
          <button
            type="button"
            onClick={onSaveAsMakeup}
            className="min-h-[40px] px-4 rounded-lg bg-emerald-700 text-sm font-medium text-white hover:bg-emerald-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Telafi Olarak Bağla
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <RefreshCw className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-800 space-y-1.5">
            <p>
              <span className="font-semibold text-slate-900">{studentName}</span> için{' '}
              <span className="font-semibold text-slate-900">{candidate.fullDate}</span> tarihli{' '}
              <span className="font-semibold text-amber-800">&apos;{candidate.status}&apos;</span>{' '}
              durumunda bekleyen <span className="font-semibold">{candidate.label}</span> kaydı
              bulundu.
            </p>
            <p className="text-xs text-slate-600">
              &ldquo;Telafi Olarak Bağla&rdquo; seçeneği bu dersi önceki açığın telafisi olarak
              işaretler, mükerrer uyarısı oluşturmaz ve öğrencinin açık ders sayacını düşürür.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

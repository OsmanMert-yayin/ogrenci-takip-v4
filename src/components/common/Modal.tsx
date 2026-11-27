import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  maxWidthClass = 'max-w-2xl',
  children,
  footer,
}) => {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClass} bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl shadow-slate-950/15 flex flex-col max-h-[92vh]`}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-slate-900 truncate">
              {title}
            </h2>
            {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="min-h-[40px] min-w-[40px] -mr-2 -mt-1 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 rounded-b-2xl flex items-center justify-end gap-2.5 shrink-0 pb-safe">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

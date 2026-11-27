import React from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';

export const Toast: React.FC = () => {
  const { toast, dismissToast } = useAppStore();
  if (!toast) return null;

  const toneStyles =
    toast.tone === 'error'
      ? 'bg-red-900 text-white border-red-800'
      : toast.tone === 'info'
        ? 'bg-slate-900 text-white border-slate-800'
        : 'bg-emerald-900 text-white border-emerald-800';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-6 right-4 z-50 max-w-sm"
    >
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm ${toneStyles}`}
      >
        {toast.tone === 'error' ? (
          <XCircle className="w-4 h-4 shrink-0 text-red-300" />
        ) : toast.tone === 'info' ? (
          <Info className="w-4 h-4 shrink-0 text-slate-300" />
        ) : (
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
        )}
        <span className="leading-snug">{toast.text}</span>
        <button
          type="button"
          onClick={dismissToast}
          aria-label="Bildirimi kapat"
          className="ml-2 p-1 text-white/70 hover:text-white rounded cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

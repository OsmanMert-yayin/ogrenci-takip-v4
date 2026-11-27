import React, { useState } from 'react';
import { Download, Share, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../../store/usePWAInstall';
import { Modal } from './Modal';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          compact
            ? 'min-h-[38px] px-2.5 text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            : 'min-h-[40px] px-3.5 py-2 text-xs bg-emerald-700 text-white hover:bg-emerald-800'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{compact ? 'Yükle' : 'Ana Ekrana Ekle'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-2.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Share className="w-3.5 h-3.5" />
          <span>Ana Ekrana Ekle</span>
        </button>

        <Modal
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="iPhone / iPad Ana Ekrana Ekle"
          maxWidthClass="max-w-sm"
          footer={
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="min-h-[42px] px-4 text-sm font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              Anladım
            </button>
          }
        >
          <ol className="space-y-3 text-sm text-slate-700 list-decimal pl-5">
            <li>
              Safari alt araç çubuğundaki <strong>Paylaş</strong> simgesine dokunun.
            </li>
            <li>
              Açılan listede aşağı kaydırıp <strong>Ana Ekrana Ekle</strong> seçeneğine dokunun.
            </li>
            <li>
              Sağ üstteki <strong>Ekle</strong> düğmesine basarak uygulamayı tam ekran başlatın.
            </li>
          </ol>
        </Modal>
      </>
    );
  }

  return null;
};

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Çevrimdışı mod — Veriler cihazınızda güvenle saklanmaya devam ediyor.</span>
    </div>
  );
};

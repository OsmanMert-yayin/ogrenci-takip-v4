import React, { useState } from 'react';
import { useAppStore } from '../../store/AppStoreContext';
import type { ModuleKey } from '../../types';
import { OfflineBanner, PWAInstallButton } from '../common/PWAInstallButton';
import { Toast } from '../common/Toast';
import { WhatsAppQueueBanner } from '../common/WhatsAppQueueBanner';
import { BottomNav } from './BottomNav';
import { MobileHeader } from './MobileHeader';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { getNavItem } from './navConfig';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  activeModule: ModuleKey;
  onSelectModule: (key: ModuleKey) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeModule,
  onSelectModule,
  children,
}) => {
  const { db, activeTerm } = useAppStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentNav = getNavItem(activeModule);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onSelect={onSelectModule}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        institutionName={db.institution.name}
      />

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <OfflineBanner />

        {/* Mobile Compact Header */}
        <MobileHeader
          title={currentNav.label}
          termName={activeTerm?.name}
          onGoHome={() => onSelectModule('home')}
        />

        {/* Desktop Contextual Header */}
        <header className="print-hidden hidden lg:flex h-14 px-8 bg-white border-b border-slate-200 items-center justify-between gap-6 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 whitespace-nowrap">
              {currentNav.label}
            </h1>
            <span className="text-slate-300" aria-hidden="true">
              /
            </span>
            <span className="text-sm text-slate-500 truncate">{db.institution.name}</span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {activeTerm && (
              <span className="text-xs font-medium text-slate-600 tabular-nums whitespace-nowrap">
                {activeTerm.name}
              </span>
            )}
            <PWAInstallButton />
          </div>
        </header>

        {/* Desktop Pending WhatsApp Queue Banner */}
        <WhatsAppQueueBanner />

        {/* Page Content Viewport */}
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 pb-24 lg:pb-10 max-w-[1360px] w-full mx-auto print:p-0 print:max-w-none">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation & Module Drawer */}
      <BottomNav
        activeModule={activeModule}
        menuOpen={mobileMenuOpen}
        onSelectModule={(key) => {
          setMobileMenuOpen(false);
          onSelectModule(key);
        }}
        onOpenMenu={() => setMobileMenuOpen(true)}
      />

      <MobileMenuDrawer
        open={mobileMenuOpen}
        activeModule={activeModule}
        institutionName={db.institution.name}
        onClose={() => setMobileMenuOpen(false)}
        onSelect={onSelectModule}
      />

      <Toast />
    </div>
  );
};

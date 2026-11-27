import { useCallback, useMemo, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { AnalyticsModule } from './modules/analytics/AnalyticsModule';
import { AttendanceModule } from './modules/attendance/AttendanceModule';
import { CurriculumModule } from './modules/curriculum/CurriculumModule';
import { FridayLeaveModule } from './modules/friday-leave/FridayLeaveModule';
import { GradesHomeworkModule } from './modules/grades-homework/GradesHomeworkModule';
import { HomeModule } from './modules/home/HomeModule';
import { InstitutionModule } from './modules/institution/InstitutionModule';
import { LessonsModule } from './modules/lessons/LessonsModule';
import { ParentAutomationModule } from './modules/parent-automation/ParentAutomationModule';
import { ParentPortalView } from './modules/parent-portal/ParentPortalView';
import { RecordsModule } from './modules/records/RecordsModule';
import { SystemModule } from './modules/system/SystemModule';
import { AppStoreProvider } from './store/AppStoreContext';
import type { ModuleKey } from './types';

function AppContent() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('home');

  const isParentPortal = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('portal') === 'veli';
  }, []);

  const handleNavigate = useCallback((key: ModuleKey) => {
    setActiveModule(key);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  if (isParentPortal) {
    return <ParentPortalView />;
  }

  return (
    <AppShell activeModule={activeModule} onSelectModule={handleNavigate}>
      {activeModule === 'home' && <HomeModule onNavigate={handleNavigate} />}
      {activeModule === 'institution' && <InstitutionModule />}
      {activeModule === 'records' && <RecordsModule />}
      {activeModule === 'curriculum' && <CurriculumModule />}
      {activeModule === 'attendance' && <AttendanceModule />}
      {activeModule === 'lessons' && <LessonsModule onNavigate={handleNavigate} />}
      {activeModule === 'grades' && <GradesHomeworkModule />}
      {activeModule === 'friday' && <FridayLeaveModule onNavigate={handleNavigate} />}
      {activeModule === 'analytics' && <AnalyticsModule />}
      {activeModule === 'automation' && <ParentAutomationModule />}
      {activeModule === 'system' && <SystemModule />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <AppContent />
    </AppStoreProvider>
  );
}

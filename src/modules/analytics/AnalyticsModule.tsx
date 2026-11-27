import React, { useMemo, useState } from 'react';
import { BarChart3, Printer } from 'lucide-react';
import {
  SmartFilterBar,
  type SmartFilterField,
} from '../../components/common/SmartFilterBar';
import { useAppStore } from '../../store/AppStoreContext';
import { computeAnalytics } from '../../utils/analyticsEngine';
import { AnalysisOverviewTab } from './AnalysisOverviewTab';
import { PrintReportsTab } from './PrintReportsTab';

type AnalyticsTab = 'overview' | 'print';

export const AnalyticsModule: React.FC = () => {
  const { db } = useAppStore();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [filters, setFilters] = useState<Record<string, string>>({
    classId: '',
    search: '',
    programType: '',
  });

  const classMap = useMemo(
    () => new Map(db.classes.map((c) => [c.id, c.name])),
    [db.classes]
  );

  const coreFilters: SmartFilterField[] = useMemo(
    () => [
      {
        id: 'classId',
        label: 'Sınıf / Grup',
        type: 'select',
        placeholder: 'Sınıf / Grup: Tümü',
        options: db.classes.map((c) => ({ value: c.id, label: c.name })),
      },
      {
        id: 'search',
        label: 'Öğrenci Ara',
        type: 'search',
        placeholder: 'Hızlı öğrenci ara...',
      },
    ],
    [db.classes]
  );

  const optionalFilters: SmartFilterField[] = useMemo(
    () => [
      {
        id: 'programType',
        label: 'Program Türü',
        type: 'select',
        placeholder: 'Program: Tümü',
        options: [
          { value: 'Yüzüne & Ezber', label: 'Yüzüne & Ezber' },
          { value: 'Hafızlık', label: 'Hafızlık' },
        ],
      },
    ],
    []
  );

  const filteredStudents = useMemo(() => {
    const q = (filters.search ?? '').trim().toLocaleLowerCase('tr-TR');
    return db.students
      .filter((s) => {
        if (s.status !== 'Aktif') return false;
        if (filters.classId && s.classId !== filters.classId) return false;
        if (filters.programType && s.programType !== filters.programType) return false;
        if (q && !s.fullName.toLocaleLowerCase('tr-TR').includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr-TR'));
  }, [db.students, filters]);

  const analytics = useMemo(
    () => computeAnalytics(filteredStudents, db.lessons, db.attendance, db.homeworks),
    [filteredStudents, db.lessons, db.attendance, db.homeworks]
  );

  return (
    <div className="space-y-4">
      <div className="print-hidden space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Analiz &amp; Rapor
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Puan + Tur ders kuvveti analizi, devamsızlık dağılımı ve A4 çıktı merkezi
            </p>
          </div>

          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`min-h-[36px] px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Başarı, Kuvvet &amp; Devamsızlık
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('print')}
              className={`min-h-[36px] px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'print'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              Yazdırılabilir Raporlar (A4)
            </button>
          </div>
        </div>

        <SmartFilterBar
          pageKey="analytics_reports"
          coreFilters={coreFilters}
          optionalFilters={optionalFilters}
          values={filters}
          onChange={(id, val) => setFilters((prev) => ({ ...prev, [id]: val }))}
          onReset={() => setFilters({ classId: '', search: '', programType: '' })}
          resultSummary={`${filteredStudents.length} öğrenci`}
        />
      </div>

      {activeTab === 'overview' ? (
        <AnalysisOverviewTab
          students={filteredStudents}
          classMap={classMap}
          rows={analytics.rows}
          overall={analytics.overall}
        />
      ) : (
        <PrintReportsTab
          students={filteredStudents}
          selectedClassId={filters.classId}
          classMap={classMap}
          analyticsRows={analytics.rows}
        />
      )}
    </div>
  );
};

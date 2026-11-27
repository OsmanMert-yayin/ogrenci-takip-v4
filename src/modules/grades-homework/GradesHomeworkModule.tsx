import React, { useMemo, useState } from 'react';
import { ClipboardCheck, FileSpreadsheet } from 'lucide-react';
import {
  SmartFilterBar,
  type SmartFilterField,
} from '../../components/common/SmartFilterBar';
import { useAppStore } from '../../store/AppStoreContext';
import { ExamsGradesTab } from './ExamsGradesTab';
import { HomeworkTab } from './HomeworkTab';

type GradesHomeworkTab = 'exams' | 'homework';

export const GradesHomeworkModule: React.FC = () => {
  const { db } = useAppStore();
  const [activeTab, setActiveTab] = useState<GradesHomeworkTab>('exams');
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

  return (
    <div className="space-y-4">
      {/* Header + 2 Top Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Not &amp; Ödev</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Yazılı / sözlü sınav notları, ağırlıklı kanaat ortalaması ve tek tıkla ödev kontrol listesi
          </p>
        </div>

        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className={`min-h-[36px] px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'exams'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Sınav &amp; Kanaat Notları
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('homework')}
            className={`min-h-[36px] px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'homework'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Ödev Takibi
          </button>
        </div>
      </div>

      <SmartFilterBar
        pageKey="grades_homework"
        coreFilters={coreFilters}
        optionalFilters={optionalFilters}
        values={filters}
        onChange={(id, val) => setFilters((prev) => ({ ...prev, [id]: val }))}
        onReset={() => setFilters({ classId: '', search: '', programType: '' })}
        resultSummary={`${filteredStudents.length} öğrenci`}
      />

      {activeTab === 'exams' ? (
        <ExamsGradesTab
          students={filteredStudents}
          selectedClassId={filters.classId}
          classMap={classMap}
        />
      ) : (
        <HomeworkTab students={filteredStudents} classMap={classMap} />
      )}
    </div>
  );
};

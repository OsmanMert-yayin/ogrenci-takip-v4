import React, { useState } from 'react';
import { GraduationCap, UserCheck } from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import { StudentsTab } from './StudentsTab';
import { TeachersTab } from './TeachersTab';

type RecordsTabKey = 'students' | 'teachers';

export const RecordsModule: React.FC = () => {
  const { db } = useAppStore();
  const [activeTab, setActiveTab] = useState<RecordsTabKey>('students');

  return (
    <div className="space-y-5">
      {/* 2 Structured Top Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'students'}
            onClick={() => setActiveTab('students')}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'students'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Öğrenciler</span>
            <span className="text-xs text-slate-400 tabular-nums">({db.students.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'teachers'}
            onClick={() => setActiveTab('teachers')}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'teachers'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Öğretmenler & Sınıf Atamaları</span>
            <span className="text-xs text-slate-400 tabular-nums">({db.teachers.length})</span>
          </button>
        </div>
      </div>

      <div>
        {activeTab === 'students' && <StudentsTab />}
        {activeTab === 'teachers' && <TeachersTab />}
      </div>
    </div>
  );
};

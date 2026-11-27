import React, { useState } from 'react';
import { BookMarked, CalendarRange } from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import { TopicPoolTab } from './TopicPoolTab';
import { WeeklyScheduleTab } from './WeeklyScheduleTab';

type CurriculumTabKey = 'schedule' | 'topics';

export const CurriculumModule: React.FC = () => {
  const { db } = useAppStore();
  const [activeTab, setActiveTab] = useState<CurriculumTabKey>('schedule');

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'schedule'}
            onClick={() => setActiveTab('schedule')}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'schedule'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            <span>Günlük & Haftalık Ders Programı</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'topics'}
            onClick={() => setActiveTab('topics')}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'topics'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Ders, Konu ve Sure Havuzu</span>
            <span className="text-xs text-slate-400 tabular-nums">({db.topicPool.length})</span>
          </button>
        </div>
      </div>

      <div>
        {activeTab === 'schedule' && <WeeklyScheduleTab />}
        {activeTab === 'topics' && <TopicPoolTab />}
      </div>
    </div>
  );
};

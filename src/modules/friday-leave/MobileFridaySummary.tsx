import React, { useMemo, useState } from 'react';
import { CheckCircle2, Home, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { ModuleKey, Student } from '../../types';
import type { FridayPermissionUpsertInput } from '../../store/phase4Mutations';
import { formatFullDDMMYYYY } from '../../utils/duplicateAndMakeupEngine';
import type {
  FridayBlockerItem,
  FridayWeekRange,
  StudentFridayEvaluation,
} from '../../utils/fridayLeaveEngine';

interface MobileFridaySummaryProps {
  students: Student[];
  classMap: Map<string, string>;
  weekRange: FridayWeekRange;
  evaluations: Map<string, StudentFridayEvaluation>;
  onSavePermission: (input: FridayPermissionUpsertInput) => void;
  onResetPermission: (date: string, studentId: string) => void;
  onNavigate?: (key: ModuleKey) => void;
}

function blockerChipClass(tone: FridayBlockerItem['tone']): string {
  if (tone === 'black') return 'bg-slate-900 text-white border-slate-950 font-semibold';
  if (tone === 'red') return 'bg-red-50 text-red-800 border-red-200 font-medium';
  if (tone === 'amber') return 'bg-amber-50 text-amber-800 border-amber-300 font-medium';
  return 'bg-rose-50 text-rose-800 border-rose-200 font-medium';
}

export const MobileFridaySummary: React.FC<MobileFridaySummaryProps> = ({
  students,
  classMap,
  weekRange,
  evaluations,
  onSavePermission,
  onResetPermission,
  onNavigate,
}) => {
  const [tab, setTab] = useState<'eligible' | 'blocked'>('blocked');

  const { eligibleList, withBlockersList } = useMemo(() => {
    const eligible: Student[] = [];
    const withBlockers: Student[] = [];
    for (const s of students) {
      const ev = evaluations.get(s.id);
      if (!ev) continue;
      if (ev.canLeave && ev.blockerCount === 0) {
        eligible.push(s);
      } else if (!ev.canLeave || ev.blockerCount > 0) {
        withBlockers.push(s);
      }
    }
    return { eligibleList: eligible, withBlockersList: withBlockers };
  }, [students, evaluations]);

  const activeList = tab === 'eligible' ? eligibleList : withBlockersList;

  return (
    <div className="space-y-3 pb-4">
      {/* Header strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Cuma İzni Özeti</h2>
            <p className="text-xs text-slate-500 tabular-nums">
              {formatFullDDMMYYYY(weekRange.fridayISO)} Cuması
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="min-h-[38px] px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              Kurum Özeti
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab('eligible')}
            className={`min-h-[54px] rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
              tab === 'eligible'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-emerald-50/70 text-emerald-900 border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-lg font-bold tabular-nums">{eligibleList.length}</span>
            </div>
            <div className="text-xs font-semibold mt-0.5">İzne Çıkabilecekler</div>
          </button>

          <button
            type="button"
            onClick={() => setTab('blocked')}
            className={`min-h-[54px] rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
              tab === 'blocked'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-amber-50/80 text-amber-950 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-lg font-bold tabular-nums">{withBlockersList.length}</span>
            </div>
            <div className="text-xs font-semibold mt-0.5">Engeli Olanlar</div>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2.5">
        {activeList.map((student) => {
          const ev = evaluations.get(student.id);
          if (!ev) return null;

          return (
            <div
              key={student.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-slate-900 truncate">
                    {student.fullName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {classMap.get(student.classId) ?? 'Sınıfsız'}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold tabular-nums shrink-0 ${
                    ev.compactBadgeTone === 'emerald'
                      ? 'bg-emerald-100 text-emerald-800'
                      : ev.compactBadgeTone === 'sky'
                        ? 'bg-sky-100 text-sky-800'
                        : ev.compactBadgeTone === 'amber'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-600 text-white'
                  }`}
                >
                  {ev.compactBadgeLabel}
                </span>
              </div>

              {ev.blockers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ev.blockers.map((b) => (
                    <span
                      key={b.id}
                      className={`px-2 py-1 rounded-lg border text-[11px] leading-tight ${blockerChipClass(
                        b.tone
                      )}`}
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              )}

              {/* 1-tap Teacher Approval */}
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (ev.manualApproval) {
                      onResetPermission(ev.fridayISO, student.id);
                    } else {
                      onSavePermission({
                        id: ev.permissionRecord?.id,
                        date: ev.fridayISO,
                        studentId: student.id,
                        status: 'Mazeretli Onaylı',
                        manualApproval: true,
                        manualApprovalNote: 'Mobil ekrandan hoca onayı verildi',
                      });
                    }
                  }}
                  className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold border inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    ev.manualApproval
                      ? 'bg-sky-50 border-sky-300 text-sky-800'
                      : 'bg-emerald-700 border-emerald-700 text-white hover:bg-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {ev.manualApproval ? 'Onayı Geri Al' : 'Hoca Onayı Ver (Mazeretli)'}
                </button>
              </div>
            </div>
          );
        })}

        {activeList.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-500">
            {tab === 'eligible'
              ? 'Engelsiz izne çıkabilecek öğrenci kaydı bulunamadı.'
              : 'Bu hafta engeli bulunan öğrenci yok. Tüm öğrenciler izne uygun!'}
          </div>
        )}
      </div>
    </div>
  );
};

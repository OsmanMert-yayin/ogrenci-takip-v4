import React, { useState } from 'react';
import { CheckCircle2, Clock, ShieldCheck, ShieldX, UserCheck } from 'lucide-react';
import type { FridayPermissionStatus, Student } from '../../types';
import type { FridayPermissionUpsertInput } from '../../store/phase4Mutations';
import { getCurrentTimeHHmm } from '../../utils/id';
import type { FridayBlockerItem, StudentFridayEvaluation } from '../../utils/fridayLeaveEngine';

interface FridayLeaveCardProps {
  student: Student;
  classNameLabel: string;
  evaluation: StudentFridayEvaluation;
  onSavePermission: (input: FridayPermissionUpsertInput) => void;
  onResetPermission: (date: string, studentId: string) => void;
}

function getBlockerChipClass(tone: FridayBlockerItem['tone']): string {
  switch (tone) {
    case 'black':
      return 'bg-slate-900 text-white border-slate-950 font-semibold';
    case 'red':
      return 'bg-red-50 text-red-800 border-red-200 font-medium';
    case 'amber':
      return 'bg-amber-50 text-amber-800 border-amber-300 font-medium';
    case 'rose':
    default:
      return 'bg-rose-50 text-rose-800 border-rose-200 font-medium';
  }
}

export const FridayLeaveCard: React.FC<FridayLeaveCardProps> = React.memo(
  ({ student, classNameLabel, evaluation, onSavePermission, onResetPermission }) => {
    const perm = evaluation.permissionRecord;
    const [noteInput, setNoteInput] = useState(perm?.manualApprovalNote ?? perm?.note ?? '');

    const primaryGuardian =
      student.guardians.find((g) => g.isPrimary)?.fullName ?? student.guardians[0]?.fullName ?? '';

    const handleToggleManualApproval = () => {
      if (evaluation.manualApproval) {
        onResetPermission(evaluation.fridayISO, student.id);
        return;
      }
      onSavePermission({
        id: perm?.id,
        date: evaluation.fridayISO,
        studentId: student.id,
        status: 'Mazeretli Onaylı',
        manualApproval: true,
        manualApprovalNote: noteInput.trim() || 'Hoca inisiyatifiyle mazeretli onaylandı',
        pickupGuardianName: perm?.pickupGuardianName || primaryGuardian || undefined,
        departureTime: perm?.departureTime,
        returnTime: perm?.returnTime,
      });
    };

    const handleQuickStatus = (nextStatus: FridayPermissionStatus) => {
      const now = getCurrentTimeHHmm();
      onSavePermission({
        id: perm?.id,
        date: evaluation.fridayISO,
        studentId: student.id,
        status: nextStatus,
        manualApproval: evaluation.manualApproval || nextStatus === 'Mazeretli Onaylı',
        manualApprovalNote: perm?.manualApprovalNote,
        pickupGuardianName: perm?.pickupGuardianName || primaryGuardian || undefined,
        departureTime:
          nextStatus === 'İzinli Çıktı' || nextStatus === 'Veli Teslim Aldı'
            ? perm?.departureTime || now
            : perm?.departureTime,
        returnTime: nextStatus === 'Döndü' ? perm?.returnTime || now : perm?.returnTime,
        note: noteInput.trim() || perm?.note,
      });
    };

    const handleGuardianChange = (guardianName: string) => {
      onSavePermission({
        id: perm?.id,
        date: evaluation.fridayISO,
        studentId: student.id,
        status: perm?.status ?? (evaluation.canLeave ? 'İzinli Çıktı' : 'Kursta Kaldı'),
        manualApproval: evaluation.manualApproval,
        manualApprovalNote: perm?.manualApprovalNote,
        pickupGuardianName: guardianName || undefined,
        departureTime: perm?.departureTime,
        returnTime: perm?.returnTime,
        note: perm?.note,
      });
    };

    const badgeClasses =
      evaluation.compactBadgeTone === 'emerald'
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : evaluation.compactBadgeTone === 'sky'
          ? 'bg-sky-100 text-sky-800 border-sky-200'
          : evaluation.compactBadgeTone === 'amber'
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-red-600 text-white border-red-700';

    return (
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-[15px] font-bold text-slate-900">
                {student.fullName}
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold tabular-nums ${badgeClasses}`}
              >
                {evaluation.canLeave ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <ShieldX className="w-3.5 h-3.5" />
                )}
                {evaluation.compactBadgeLabel}
              </span>
              {perm?.status && perm.status !== 'Mazeretli Onaylı' && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  {perm.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {classNameLabel} • {student.programType}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleManualApproval}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              evaluation.manualApproval
                ? 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100'
                : 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {evaluation.manualApproval ? 'Mazeret Onayını Kaldır' : 'Mazeretli İzin Ver / Onayla'}
          </button>
        </div>

        {/* Blocker reasons list */}
        {evaluation.blockers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {evaluation.blockers.map((blocker) => (
              <span
                key={blocker.id}
                className={`inline-flex items-center px-2 py-1 rounded-lg border text-[11px] leading-snug ${getBlockerChipClass(
                  blocker.tone
                )}`}
              >
                {blocker.label}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-emerald-700 bg-emerald-50/70 border border-emerald-200/70 rounded-lg px-3 py-2">
            Bu hafta için herhangi bir devamsızlık veya zorunlu ders engeli bulunmuyor.
          </div>
        )}

        {/* Pickup guardian & quick departure/return actions */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={perm?.pickupGuardianName ?? primaryGuardian}
                onChange={(e) => handleGuardianChange(e.target.value)}
                aria-label="Teslim alan veli"
                className="h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 cursor-pointer"
              >
                <option value="">Veli Seçilmedi</option>
                {student.guardians.map((g) => (
                  <option key={g.id} value={`${g.fullName} (${g.relation})`}>
                    {g.fullName} ({g.relation})
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Mazeret / çıkış notu..."
              className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 w-44 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {perm?.departureTime && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 tabular-nums mr-1">
                <Clock className="w-3 h-3" />
                Çıkış: {perm.departureTime}
                {perm.returnTime ? ` • Dönüş: ${perm.returnTime}` : ''}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleQuickStatus('Veli Teslim Aldı')}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium border cursor-pointer ${
                perm?.status === 'Veli Teslim Aldı'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
              }`}
            >
              Teslim Edildi
            </button>
            <button
              type="button"
              onClick={() => handleQuickStatus('Kursta Kaldı')}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium border cursor-pointer ${
                perm?.status === 'Kursta Kaldı'
                  ? 'bg-slate-800 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Kursta Kaldı
            </button>
            <button
              type="button"
              onClick={() => handleQuickStatus('Döndü')}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium border cursor-pointer ${
                perm?.status === 'Döndü'
                  ? 'bg-sky-700 text-white border-sky-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50'
              }`}
            >
              Döndü
            </button>
          </div>
        </div>
      </div>
    );
  }
);

FridayLeaveCard.displayName = 'FridayLeaveCard';

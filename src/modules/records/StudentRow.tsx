import React from 'react';
import { ChevronRight, Pencil, Phone, Trash2 } from 'lucide-react';
import type { ClassGroup, Student } from '../../types';

interface StudentItemProps {
  student: Student;
  classGroup?: ClassGroup;
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

function getStatusTextClass(status: Student['status']): string {
  switch (status) {
    case 'Aktif':
      return 'text-emerald-700';
    case 'Mezun':
      return 'text-slate-600';
    case 'Kayıt Dondurdu':
      return 'text-amber-700';
    default:
      return 'text-red-700';
  }
}

export const StudentTableRow: React.FC<StudentItemProps> = React.memo(
  ({ student, classGroup, onView, onEdit, onDelete }) => {
    const primaryGuardian =
      student.guardians.find((g) => g.isPrimary) ?? student.guardians[0];

    return (
      <tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-b-0">
        <td className="py-3 pl-4 pr-3 text-xs font-mono text-slate-400 tabular-nums whitespace-nowrap">
          {student.studentNo || '—'}
        </td>

        <td className="py-3 px-3 min-w-[200px]">
          <button
            type="button"
            onClick={() => onView(student)}
            className="text-left group cursor-pointer"
          >
            <div className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
              {student.fullName}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {student.programType}
              <span className="mx-1.5 text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className={`font-medium ${getStatusTextClass(student.status)}`}>
                {student.status}
              </span>
            </div>
          </button>
        </td>

        <td className="py-3 px-3 text-sm text-slate-700 whitespace-nowrap">
          <div className="font-medium text-slate-800">{classGroup?.name ?? 'Sınıf Yok'}</div>
          {classGroup && (
            <div className="text-xs text-slate-500 mt-0.5">{classGroup.shiftType}</div>
          )}
        </td>

        <td className="py-3 px-3 text-xs text-slate-600 max-w-[260px]">
          <div className="truncate">
            <span className="text-slate-400">Yüzüne:</span> {student.levels.yuzune || '—'}
          </div>
          <div className="truncate mt-0.5">
            <span className="text-slate-400">Ezber:</span> {student.levels.ezber || '—'}
          </div>
        </td>

        <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
          {primaryGuardian ? (
            <div>
              <div className="font-medium text-slate-800">
                {primaryGuardian.fullName}{' '}
                <span className="font-normal text-slate-400">({primaryGuardian.relation})</span>
              </div>
              <div className="font-mono text-slate-500 tabular-nums mt-0.5">
                {primaryGuardian.phone || 'Telefon yok'}
                {student.guardians.length > 1 && (
                  <span className="font-sans text-slate-400 ml-1.5">
                    +{student.guardians.length - 1} veli
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-slate-400">Veli girilmedi</span>
          )}
        </td>

        <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(student)}
              aria-label={`${student.fullName} düzenle`}
              className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(student)}
              aria-label={`${student.fullName} sil`}
              className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }
);

StudentTableRow.displayName = 'StudentTableRow';

export const StudentMobileCard: React.FC<StudentItemProps> = React.memo(
  ({ student, classGroup, onView, onEdit }) => {
    const primaryGuardian =
      student.guardians.find((g) => g.isPrimary) ?? student.guardians[0];

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onView(student)}
            className="text-left min-w-0 flex-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-900 truncate">
                {student.fullName}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5">
              <span>{classGroup?.name ?? 'Sınıf Yok'}</span>
              <span aria-hidden="true">·</span>
              <span>{student.programType}</span>
              <span aria-hidden="true">·</span>
              <span className={`font-medium ${getStatusTextClass(student.status)}`}>
                {student.status}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onEdit(student)}
            aria-label="Öğrenciyi düzenle"
            className="min-h-[40px] min-w-[40px] -mr-1 -mt-1 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-xs">
          <div className="min-w-0">
            <div className="text-slate-400">Yüzüne</div>
            <div className="text-slate-700 font-medium truncate mt-0.5">
              {student.levels.yuzune || '—'}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-slate-400">Ezber</div>
            <div className="text-slate-700 font-medium truncate mt-0.5">
              {student.levels.ezber || '—'}
            </div>
          </div>
        </div>

        {primaryGuardian && (
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 truncate">
              {primaryGuardian.fullName} ({primaryGuardian.relation})
            </span>
            {primaryGuardian.phone && (
              <span className="font-mono text-slate-500 tabular-nums inline-flex items-center gap-1 shrink-0">
                <Phone className="w-3 h-3 text-emerald-700" />
                {primaryGuardian.phone}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

StudentMobileCard.displayName = 'StudentMobileCard';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { useAppStore } from '../../store/AppStoreContext';
import type { AttendanceRecord, AttendanceStatus, LessonRecord, Student } from '../../types';
import {
  formatFullDDMMYYYY,
  getResolvedMakeupIds,
} from '../../utils/duplicateAndMakeupEngine';
import {
  countDistinctLessonSessions,
  getSubjectShortCode,
  inferLessonStatus,
  inferLessonSubject,
} from '../../utils/lessonScheduleResolver';

interface WeeklyMatrixTabProps {
  selectedDate: string;
  students: Student[];
  classMap: Map<string, string>;
  onJumpToDate: (isoDate: string) => void;
}

const WEEK_DAY_SHORT = ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'];
const WEEK_DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayOfISO(isoDate: string): Date {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return new Date();
  const jsDay = d.getDay(); // 0=Sun, 1=Mon
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function getAttendanceShortBadge(status: AttendanceStatus): {
  code: string;
  className: string;
  title: string;
} | null {
  switch (status) {
    case 'Kurstan İzinsiz Çıktı':
      return {
        code: 'KİÇ',
        className: 'bg-slate-900 text-white border-slate-950',
        title: 'Kurstan İzinsiz Çıktı',
      };
    case 'Gelmedi':
      return {
        code: 'YOK',
        className: 'bg-red-600 text-white border-red-700',
        title: 'Gelmedi',
      };
    case 'Derse Girmedi':
      return {
        code: 'DG',
        className: 'bg-amber-600 text-white border-amber-700',
        title: 'Derse Girmedi',
      };
    case 'İzinli':
      return {
        code: 'İZ',
        className: 'bg-sky-600 text-white border-sky-700',
        title: 'İzinli',
      };
    case 'Geç Geldi':
      return {
        code: 'GEÇ',
        className: 'bg-yellow-400 text-slate-950 border-yellow-500',
        title: 'Geç Geldi',
      };
    default:
      return null;
  }
}

export const WeeklyMatrixTab: React.FC<WeeklyMatrixTabProps> = ({
  selectedDate,
  students,
  classMap,
  onJumpToDate,
}) => {
  const { db } = useAppStore();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDates = useMemo(() => {
    const monday = addDays(getMondayOfISO(selectedDate), weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i);
      return {
        iso: toLocalISO(d),
        dayNum: d.getDate(),
        shortLetter: WEEK_DAY_SHORT[i],
        shortName: WEEK_DAY_NAMES[i],
      };
    });
  }, [selectedDate, weekOffset]);

  const weekDateSet = useMemo(() => new Set(weekDates.map((d) => d.iso)), [weekDates]);

  const resolvedMakeupIds = useMemo(
    () => getResolvedMakeupIds(db.lessons),
    [db.lessons]
  );

  // Index lessons by studentId|date for the visible week
  const weekLessonMap = useMemo(() => {
    const map = new Map<string, LessonRecord[]>();
    for (const l of db.lessons) {
      if (!weekDateSet.has(l.date)) continue;
      const key = `${l.studentId}|${l.date}`;
      const list = map.get(key);
      if (list) list.push(l);
      else map.set(key, [l]);
    }
    return map;
  }, [db.lessons, weekDateSet]);

  // Index attendance by studentId|date for the visible week
  const weekAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    for (const a of db.attendance) {
      if (!weekDateSet.has(a.date)) continue;
      const key = `${a.studentId}|${a.date}`;
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    return map;
  }, [db.attendance, weekDateSet]);

  // Precompute Term Summary per student: Ders (distinct sessions), Açık (unresolved Vermedi/Tekrar), İzin (distinct İzinli/Gelmedi dates)
  const termSummaryMap = useMemo(() => {
    const lessonsByStudent = new Map<string, LessonRecord[]>();
    for (const l of db.lessons) {
      const arr = lessonsByStudent.get(l.studentId);
      if (arr) arr.push(l);
      else lessonsByStudent.set(l.studentId, [l]);
    }

    const leaveDatesByStudent = new Map<string, Set<string>>();
    for (const a of db.attendance) {
      if (a.status === 'İzinli' || a.status === 'Gelmedi') {
        let set = leaveDatesByStudent.get(a.studentId);
        if (!set) {
          set = new Set<string>();
          leaveDatesByStudent.set(a.studentId, set);
        }
        set.add(a.date);
      }
    }

    const summary = new Map<string, { ders: number; acik: number; izin: number }>();
    for (const s of students) {
      const sLessons = lessonsByStudent.get(s.id) ?? [];
      const ders = countDistinctLessonSessions(sLessons);
      let acik = 0;
      for (const l of sLessons) {
        const st = inferLessonStatus(l);
        if ((st === 'Vermedi' || st === 'Tekrar') && !resolvedMakeupIds.has(l.id)) {
          acik += 1;
        }
      }
      const izin = leaveDatesByStudent.get(s.id)?.size ?? 0;
      summary.set(s.id, { ders, acik, izin });
    }
    return summary;
  }, [db.lessons, db.attendance, students, resolvedMakeupIds]);

  return (
    <div className="space-y-3.5">
      {/* Week navigator & legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 text-xs font-medium cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Önceki Hafta
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="h-9 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold cursor-pointer tabular-nums"
          >
            {formatFullDDMMYYYY(weekDates[0].iso)} – {formatFullDDMMYYYY(weekDates[6].iso)}
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 text-xs font-medium cursor-pointer"
          >
            Sonraki Hafta
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
            Yüz / Ezb Geçti
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
            Tekrar
          </span>
          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
            Vermedi
          </span>
          <span className="text-slate-300">|</span>
          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-semibold">YOK</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white font-semibold">DG</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-semibold">KİÇ</span>
          <span className="px-1.5 py-0.5 rounded bg-sky-600 text-white font-semibold">İZ</span>
        </div>
      </div>

      {students.length === 0 ? (
        <EmptyState
          title="Matriste gösterilecek öğrenci yok"
          description="Sınıf veya arama filtresini temizleyerek haftalık ders ve yoklama matrisini görüntüleyebilirsiniz."
        />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="px-3.5 py-2.5 border-r border-slate-200/80 w-[200px]">
                    Öğrenci
                  </th>
                  {weekDates.map((d) => {
                    const isSelected = d.iso === selectedDate;
                    return (
                      <th
                        key={d.iso}
                        className={`px-2 py-2 text-center border-r border-slate-200/60 min-w-[92px] ${
                          isSelected ? 'bg-emerald-50/80 text-emerald-900' : ''
                        }`}
                      >
                        <div className="text-xs font-bold">
                          {d.shortLetter}{' '}
                          <span className="font-normal text-slate-400">({d.shortName})</span>
                        </div>
                        <div className="text-[11px] tabular-nums text-slate-500 mt-0.5">
                          {String(d.dayNum).padStart(2, '0')}.{d.iso.slice(5, 7)}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-3 py-2 text-center bg-slate-100/70 w-[166px]">
                    <div>Dönem Özeti</div>
                    <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                      Ders &nbsp;|&nbsp; Açık &nbsp;|&nbsp; İzin
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const stats = termSummaryMap.get(student.id) ?? { ders: 0, acik: 0, izin: 0 };

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3.5 py-2.5 border-r border-slate-200/70 align-top">
                        <div className="text-sm font-semibold text-slate-900 leading-snug">
                          {student.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {classMap.get(student.classId) ?? 'Sınıfsız'}
                        </div>
                      </td>

                      {weekDates.map((d) => {
                        const key = `${student.id}|${d.iso}`;
                        const dayLessons = weekLessonMap.get(key) ?? [];
                        const dayAtts = weekAttendanceMap.get(key) ?? [];

                        // Distinct non-present attendance statuses in severity order
                        const attStatusPriority: AttendanceStatus[] = [
                          'Kurstan İzinsiz Çıktı',
                          'Gelmedi',
                          'Derse Girmedi',
                          'İzinli',
                          'Geç Geldi',
                        ];
                        const presentFlags = attStatusPriority
                          .filter((st) => dayAtts.some((a) => a.status === st))
                          .map((st) => getAttendanceShortBadge(st))
                          .filter((b): b is NonNullable<typeof b> => Boolean(b));

                        return (
                          <td
                            key={d.iso}
                            onClick={() => onJumpToDate(d.iso)}
                            title="Günlük çizelgeye gitmek için tıklayın"
                            className={`px-1.5 py-2 border-r border-slate-100 align-top cursor-pointer hover:bg-emerald-50/40 transition-colors ${
                              d.iso === selectedDate ? 'bg-emerald-50/25' : ''
                            }`}
                          >
                            <div className="flex flex-col gap-1.5 min-h-[34px]">
                              {/* Lesson short-code badges */}
                              {dayLessons.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {dayLessons.map((lesson) => {
                                    const st = inferLessonStatus(lesson);
                                    const code = getSubjectShortCode(inferLessonSubject(lesson));
                                    const badgeColor =
                                      st === 'Geçti'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                        : st === 'Tekrar'
                                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                                          : 'bg-red-100 text-red-700 border-red-200';
                                    return (
                                      <span
                                        key={lesson.id}
                                        title={`${inferLessonSubject(lesson)}: ${lesson.pageOrVerse || lesson.topicTitle} (${st}${typeof lesson.score === 'number' ? ' • ' + lesson.score + 'p' : ''})`}
                                        className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold leading-none ${badgeColor}`}
                                      >
                                        {code}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Separated Attendance badges */}
                              {presentFlags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5 border-t border-dashed border-slate-200/80">
                                  {presentFlags.map((badge) => (
                                    <span
                                      key={badge.code}
                                      title={badge.title}
                                      className={`px-1.5 py-0.5 rounded border text-[10px] font-bold leading-none ${badge.className}`}
                                    >
                                      {badge.code}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {dayLessons.length === 0 && presentFlags.length === 0 && (
                                <span className="text-[11px] text-slate-300 text-center block pt-1">
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Rightmost Dönem Özeti */}
                      <td className="px-2.5 py-2.5 bg-slate-50/50 align-middle">
                        <div className="grid grid-cols-3 gap-1 text-center tabular-nums">
                          <div className="px-1.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80">
                            <div className="text-xs font-bold text-emerald-800">{stats.ders}</div>
                            <div className="text-[9px] text-emerald-700">Ders</div>
                          </div>
                          <div
                            className={`px-1.5 py-1 rounded-md border ${
                              stats.acik > 0
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-white border-slate-200 text-slate-500'
                            }`}
                          >
                            <div className="text-xs font-bold">{stats.acik}</div>
                            <div className="text-[9px]">Açık</div>
                          </div>
                          <div
                            className={`px-1.5 py-1 rounded-md border ${
                              stats.izin > 0
                                ? 'bg-sky-50 border-sky-200 text-sky-800'
                                : 'bg-white border-slate-200 text-slate-500'
                            }`}
                          >
                            <div className="text-xs font-bold">{stats.izin}</div>
                            <div className="text-[9px]">İzin</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

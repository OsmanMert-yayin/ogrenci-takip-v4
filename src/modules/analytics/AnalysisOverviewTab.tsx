import React from 'react';
import { EmptyState } from '../../components/common/EmptyState';
import type { AttendanceStatus, Student } from '../../types';
import type {
  LessonStrengthLevel,
  OverallAnalyticsSummary,
  StudentAnalyticsRow,
} from '../../utils/analyticsEngine';

interface AnalysisOverviewTabProps {
  students: Student[];
  classMap: Map<string, string>;
  rows: Map<string, StudentAnalyticsRow>;
  overall: OverallAnalyticsSummary;
}

const STRENGTH_BADGE: Record<LessonStrengthLevel, string> = {
  Kuvvetli: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  İyi: 'bg-sky-100 text-sky-800 border-sky-200',
  Pekiştirilmeli: 'bg-amber-100 text-amber-800 border-amber-300',
  'Veri Yok': 'bg-slate-100 text-slate-500 border-slate-200',
};

const ATT_BAR_ITEMS: {
  status: AttendanceStatus;
  label: string;
  barClass: string;
  chipClass: string;
}[] = [
  {
    status: 'Geldi',
    label: 'Geldi',
    barClass: 'bg-emerald-600',
    chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    status: 'Geç Geldi',
    label: 'Geç Geldi',
    barClass: 'bg-yellow-400',
    chipClass: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  },
  {
    status: 'İzinli',
    label: 'İzinli',
    barClass: 'bg-sky-600',
    chipClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  {
    status: 'Derse Girmedi',
    label: 'Derse Girmedi',
    barClass: 'bg-amber-500',
    chipClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    status: 'Gelmedi',
    label: 'Gelmedi',
    barClass: 'bg-red-600',
    chipClass: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    status: 'Kurstan İzinsiz Çıktı',
    label: 'İzinsiz Çıktı (KİÇ)',
    barClass: 'bg-slate-900',
    chipClass: 'bg-slate-900 text-white border-slate-950',
  },
];

export const AnalysisOverviewTab: React.FC<AnalysisOverviewTabProps> = ({
  students,
  classMap,
  rows,
  overall,
}) => {
  const totalAttRecords = Object.values(overall.attendanceDistribution).reduce(
    (sum, n) => sum + n,
    0
  );

  return (
    <div className="space-y-4">
      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Ders Kuvveti (Puan / Tur)</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
            {overall.avgScore !== null ? `${overall.avgScore}p` : '—'}{' '}
            <span className="text-sm font-medium text-slate-400">
              / {overall.avgTur !== null ? `${overall.avgTur} tur` : '—'}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            <span className="text-emerald-700 font-semibold">{overall.strongCount} kuvvetli</span> ·{' '}
            <span className="text-amber-700 font-semibold">
              {overall.needsWorkCount} pekiştirilmeli
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Genel Devam Oranı</div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700 tabular-nums">
            {overall.attendanceRate !== null ? `%${overall.attendanceRate}` : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Toplam {totalAttRecords} yoklama kaydı
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Toplam Ders Oturumu</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
            {overall.totalSessions}
          </div>
          <div className="mt-1 text-xs text-slate-500">Birleşik oturumlar tek sayılır</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Ödev Tamamlanma</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
            {overall.homeworkCompletionRate !== null ? `%${overall.homeworkCompletionRate}` : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500">Yaptı + Geç Getirdi oranı</div>
        </div>
      </div>

      {/* Attendance Distribution Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">Devamsızlık &amp; Katılım Dağılımı</h2>
          <span className="text-xs text-slate-500 tabular-nums">{totalAttRecords} kayıt</span>
        </div>

        {totalAttRecords > 0 ? (
          <>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
              {ATT_BAR_ITEMS.map((item) => {
                const count = overall.attendanceDistribution[item.status];
                if (count === 0) return null;
                const pct = (count / totalAttRecords) * 100;
                return (
                  <div
                    key={item.status}
                    style={{ width: `${pct}%` }}
                    className={`${item.barClass} h-full`}
                    title={`${item.label}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {ATT_BAR_ITEMS.map((item) => {
                const count = overall.attendanceDistribution[item.status];
                return (
                  <span
                    key={item.status}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold tabular-nums ${item.chipClass}`}
                  >
                    <span>{item.label}:</span>
                    <span>{count}</span>
                  </span>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500">
            Seçili filtre için henüz yoklama kaydı bulunmuyor.
          </p>
        )}
      </div>

      {/* Student-by-Student Strength & Curriculum Progress Table */}
      {students.length === 0 ? (
        <EmptyState
          title="Analiz edilecek öğrenci bulunamadı"
          description="Sınıf veya arama filtresini temizleyerek analiz tablosunu görebilirsiniz."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Öğrenci Bazlı Ders Kuvveti (Puan + Tur) &amp; Müfredat İlerlemesi
            </h2>
            <span className="text-xs text-slate-400">
              Az tur + yüksek puan = Kuvvetli
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-3.5 py-2.5">Öğrenci</th>
                  <th className="px-3 py-2.5">Müfredat / Cüz Durumu</th>
                  <th className="px-3 py-2.5 text-center">Oturum</th>
                  <th className="px-3 py-2.5 text-center">Ort. Puan</th>
                  <th className="px-3 py-2.5 text-center">Ort. Tur</th>
                  <th className="px-3 py-2.5">Ders Kuvveti</th>
                  <th className="px-3 py-2.5 text-center">Devam %</th>
                  <th className="px-3 py-2.5 text-center">Ödev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {students.map((student) => {
                  const row = rows.get(student.id);
                  if (!row) return null;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70">
                      <td className="px-3.5 py-2.5">
                        <div className="text-sm font-semibold text-slate-900">
                          {student.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {classMap.get(student.classId) ?? 'Sınıfsız'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {student.programType === 'Hafızlık' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex self-start px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-semibold">
                              Hafızlık Devam
                            </span>
                            <span className="text-[11px] text-slate-600">
                              {student.levels.ezber || '—'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-700 leading-snug">
                            <div>
                              <strong>Yüzüne:</strong> {student.levels.yuzune || '—'}
                            </div>
                            <div className="text-slate-500">
                              <strong>Ezber:</strong> {student.levels.ezber || '—'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-900 tabular-nums">
                        {row.sessionCount}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-slate-900">
                        {row.avgScore !== null ? row.avgScore : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-slate-700">
                        {row.avgTur !== null ? row.avgTur : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col items-start gap-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${STRENGTH_BADGE[row.strengthLevel]}`}
                          >
                            {row.strengthLevel}
                          </span>
                          <span className="text-[10px] text-slate-500">{row.strengthReason}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold tabular-nums">
                        {row.attendanceRate !== null ? (
                          <span
                            className={
                              row.attendanceRate >= 85
                                ? 'text-emerald-700'
                                : row.attendanceRate >= 70
                                  ? 'text-amber-700'
                                  : 'text-red-600'
                            }
                          >
                            %{row.attendanceRate}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-700">
                        {row.homeworkTotal > 0 ? `${row.homeworkDone}/${row.homeworkTotal}` : '—'}
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

import React from 'react';
import type {
  AttendanceRecord,
  ExamDefinition,
  InstitutionInfo,
  LessonRecord,
  Student,
} from '../../types';
import type { StudentAnalyticsRow } from '../../utils/analyticsEngine';
import { formatFullDDMMYYYY } from '../../utils/duplicateAndMakeupEngine';
import type { FridayWeekRange, StudentFridayEvaluation } from '../../utils/fridayLeaveEngine';
import {
  getSubjectShortCode,
  inferLessonStatus,
  inferLessonSubject,
} from '../../utils/lessonScheduleResolver';
import type { StudentGradeSummary } from '../grades-homework/gradesEngine';

export type PrintReportType = 'friday_list' | 'weekly_matrix' | 'grade_sheet' | 'student_card';

interface CommonPrintHeaderProps {
  institution: InstitutionInfo;
  termName: string;
  reportTitle: string;
  subtitle: string;
}

const PrintHeader: React.FC<CommonPrintHeaderProps> = ({
  institution,
  termName,
  reportTitle,
  subtitle,
}) => (
  <div className="border-b-2 border-slate-800 pb-3 mb-4 flex items-start justify-between gap-4">
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
        {institution.name}
      </div>
      <h2 className="text-lg font-bold text-slate-950 mt-0.5">{reportTitle}</h2>
      <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
    </div>
    <div className="text-right text-xs text-slate-600 tabular-nums shrink-0">
      <div className="font-semibold text-slate-900">{termName}</div>
      <div>
        {institution.district} / {institution.city}
      </div>
      <div>Çıktı Tarihi: {formatFullDDMMYYYY(new Date().toISOString().slice(0, 10))}</div>
    </div>
  </div>
);

const PrintFooter: React.FC<{ managerName: string }> = ({ managerName }) => (
  <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600 print-break-avoid">
    <div>
      <div className="font-semibold text-slate-800">Sınıf Hocası İmza</div>
      <div className="mt-8 border-b border-dashed border-slate-400 w-44" />
    </div>
    <div className="text-right flex flex-col items-end">
      <div className="font-semibold text-slate-800">Kurum Yöneticisi</div>
      <div className="text-slate-700 mt-0.5">{managerName || '—'}</div>
      <div className="mt-6 border-b border-dashed border-slate-400 w-44" />
    </div>
  </div>
);

/* 1) Cuma İzni Listesi */
export const FridayLeavePrintSheet: React.FC<{
  institution: InstitutionInfo;
  termName: string;
  weekRange: FridayWeekRange;
  students: Student[];
  classMap: Map<string, string>;
  evaluations: Map<string, StudentFridayEvaluation>;
}> = ({ institution, termName, weekRange, students, classMap, evaluations }) => (
  <div className="print-container bg-white p-6 rounded-xl border border-slate-200">
    <PrintHeader
      institution={institution}
      termName={termName}
      reportTitle="Cuma İzni Değerlendirme ve Teslim Listesi"
      subtitle={`${formatFullDDMMYYYY(weekRange.fridayISO)} Cuması • Değerlendirme: ${formatFullDDMMYYYY(
        weekRange.rangeStartISO
      )} – ${formatFullDDMMYYYY(weekRange.rangeEndISO)}`}
    />
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="bg-slate-100 border-y border-slate-300 font-semibold text-slate-800">
          <th className="py-2 px-2 w-8">#</th>
          <th className="py-2 px-2">Öğrenci</th>
          <th className="py-2 px-2">Sınıf</th>
          <th className="py-2 px-2">Durum</th>
          <th className="py-2 px-2">Engel Nedenleri / Not</th>
          <th className="py-2 px-2 w-32">Teslim Alan İmza</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {students.map((s, idx) => {
          const ev = evaluations.get(s.id);
          return (
            <tr key={s.id} className="print-break-avoid">
              <td className="py-2 px-2 tabular-nums text-slate-500">{idx + 1}</td>
              <td className="py-2 px-2 font-semibold text-slate-900">{s.fullName}</td>
              <td className="py-2 px-2 text-slate-600">{classMap.get(s.classId) ?? '—'}</td>
              <td className="py-2 px-2 font-semibold">
                {ev?.compactBadgeLabel ?? 'İzne Uygun'}
              </td>
              <td className="py-2 px-2 text-[11px] text-slate-700">
                {ev && ev.blockers.length > 0
                  ? ev.blockers.map((b) => b.label).join(' • ')
                  : 'Engel bulunmuyor'}
              </td>
              <td className="py-2 px-2 text-[11px] text-slate-500">
                {ev?.permissionRecord?.pickupGuardianName || ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    <PrintFooter managerName={institution.managerName} />
  </div>
);

/* 2) Haftalık Ders & Yoklama Çizelgesi */
export const WeeklyMatrixPrintSheet: React.FC<{
  institution: InstitutionInfo;
  termName: string;
  weekDates: { iso: string; shortName: string }[];
  students: Student[];
  classMap: Map<string, string>;
  lessons: LessonRecord[];
  attendance: AttendanceRecord[];
}> = ({ institution, termName, weekDates, students, classMap, lessons, attendance }) => (
  <div className="print-container bg-white p-6 rounded-xl border border-slate-200">
    <PrintHeader
      institution={institution}
      termName={termName}
      reportTitle="Haftalık Ders & Yoklama Çizelgesi"
      subtitle={`${formatFullDDMMYYYY(weekDates[0].iso)} – ${formatFullDDMMYYYY(
        weekDates[6].iso
      )}`}
    />
    <table className="w-full text-left border-collapse text-[11px]">
      <thead>
        <tr className="bg-slate-100 border-y border-slate-300 font-semibold text-slate-800">
          <th className="py-2 px-2 w-40">Öğrenci</th>
          {weekDates.map((d) => (
            <th key={d.iso} className="py-2 px-1.5 text-center border-l border-slate-200">
              <div>{d.shortName}</div>
              <div className="text-[10px] font-normal tabular-nums">{d.iso.slice(8, 10)}.{d.iso.slice(5, 7)}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {students.map((s) => (
          <tr key={s.id} className="print-break-avoid">
            <td className="py-2 px-2">
              <div className="font-semibold text-slate-900">{s.fullName}</div>
              <div className="text-[10px] text-slate-500">{classMap.get(s.classId) ?? ''}</div>
            </td>
            {weekDates.map((d) => {
              const dayL = lessons.filter((l) => l.studentId === s.id && l.date === d.iso);
              const dayA = attendance.filter(
                (a) => a.studentId === s.id && a.date === d.iso && a.status !== 'Geldi'
              );
              return (
                <td
                  key={d.iso}
                  className="py-1.5 px-1 text-center border-l border-slate-200 align-top"
                >
                  <div className="space-y-0.5">
                    {dayL.map((l) => (
                      <div key={l.id} className="font-medium text-slate-800">
                        {getSubjectShortCode(inferLessonSubject(l))}({inferLessonStatus(l)[0]})
                      </div>
                    ))}
                    {dayA.length > 0 && (
                      <div className="text-[10px] font-bold text-slate-900">
                        {dayA[0].status === 'Kurstan İzinsiz Çıktı'
                          ? 'KİÇ'
                          : dayA[0].status === 'Derse Girmedi'
                            ? 'DG'
                            : dayA[0].status === 'İzinli'
                              ? 'İZ'
                              : 'YOK'}
                      </div>
                    )}
                    {dayL.length === 0 && dayA.length === 0 && (
                      <span className="text-slate-300">—</span>
                    )}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
    <PrintFooter managerName={institution.managerName} />
  </div>
);

/* 3) Sınıf Not Çizelgesi */
export const GradeSheetPrintSheet: React.FC<{
  institution: InstitutionInfo;
  termName: string;
  students: Student[];
  classMap: Map<string, string>;
  exams: ExamDefinition[];
  gradeSummaries: Map<string, StudentGradeSummary>;
  passThreshold: number;
}> = ({ institution, termName, students, classMap, exams, gradeSummaries, passThreshold }) => (
  <div className="print-container bg-white p-6 rounded-xl border border-slate-200">
    <PrintHeader
      institution={institution}
      termName={termName}
      reportTitle="Sınav ve Kanaat Not Çizelgesi"
      subtitle={`Geçme Barajı: ${passThreshold} Puan • Toplam ${students.length} Öğrenci`}
    />
    <table className="w-full text-left border-collapse text-xs">
      <thead>
        <tr className="bg-slate-100 border-y border-slate-300 font-semibold text-slate-800">
          <th className="py-2 px-2 w-8">#</th>
          <th className="py-2 px-2">Öğrenci</th>
          <th className="py-2 px-2">Sınıf</th>
          {exams.map((ex) => (
            <th key={ex.id} className="py-2 px-2 text-center">
              {ex.title} (%{ex.weight})
            </th>
          ))}
          <th className="py-2 px-2 text-center">Kanaat</th>
          <th className="py-2 px-2 text-center">Ortalama</th>
          <th className="py-2 px-2 text-center">Sıra</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 tabular-nums">
        {students.map((s, idx) => {
          const sm = gradeSummaries.get(s.id);
          return (
            <tr key={s.id} className="print-break-avoid">
              <td className="py-2 px-2 text-slate-500">{idx + 1}</td>
              <td className="py-2 px-2 font-semibold text-slate-900">{s.fullName}</td>
              <td className="py-2 px-2 text-slate-600">{classMap.get(s.classId) ?? '—'}</td>
              {exams.map((ex) => (
                <td key={ex.id} className="py-2 px-2 text-center">
                  {sm?.examScores[ex.id] ?? '—'}
                </td>
              ))}
              <td className="py-2 px-2 text-center">{sm?.kanaatScore ?? '—'}</td>
              <td
                className={`py-2 px-2 text-center font-bold ${
                  sm?.weightedAverage !== null &&
                  sm?.weightedAverage !== undefined &&
                  sm.weightedAverage < passThreshold
                    ? 'text-red-700'
                    : 'text-emerald-800'
                }`}
              >
                {sm?.weightedAverage ?? '—'}
              </td>
              <td className="py-2 px-2 text-center font-semibold">
                {sm?.classRank ? `#${sm.classRank}` : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    <PrintFooter managerName={institution.managerName} />
  </div>
);

/* 4) Bireysel Öğrenci Durum Karnesi */
export const StudentReportCardPrintSheet: React.FC<{
  institution: InstitutionInfo;
  termName: string;
  student: Student | null;
  classNameLabel: string;
  analyticsRow?: StudentAnalyticsRow;
  gradeSummary?: StudentGradeSummary;
  fridayEval?: StudentFridayEvaluation;
  recentLessons: LessonRecord[];
}> = ({
  institution,
  termName,
  student,
  classNameLabel,
  analyticsRow,
  gradeSummary,
  fridayEval,
  recentLessons,
}) => {
  if (!student) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
        Karne önizlemesi için yukarıdan bir öğrenci seçin.
      </div>
    );
  }

  return (
    <div className="print-container bg-white p-6 rounded-xl border border-slate-200 space-y-5">
      <PrintHeader
        institution={institution}
        termName={termName}
        reportTitle="Bireysel Öğrenci Gelişim ve Durum Karnesi"
        subtitle={`${student.fullName} • ${classNameLabel} • ${student.programType}`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="border border-slate-200 rounded-lg p-3">
          <div className="text-slate-500">Ders Kuvveti</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {analyticsRow?.strengthLevel ?? '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {analyticsRow?.avgScore ?? '—'}p • {analyticsRow?.avgTur ?? '—'} tur
          </div>
        </div>
        <div className="border border-slate-200 rounded-lg p-3">
          <div className="text-slate-500">Devam Oranı</div>
          <div className="text-base font-bold text-emerald-800 mt-0.5 tabular-nums">
            {analyticsRow?.attendanceRate !== null && analyticsRow?.attendanceRate !== undefined
              ? `%${analyticsRow.attendanceRate}`
              : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            Gelmedi: {analyticsRow?.attendanceCounts.Gelmedi ?? 0} • KİÇ:{' '}
            {analyticsRow?.attendanceCounts['Kurstan İzinsiz Çıktı'] ?? 0}
          </div>
        </div>
        <div className="border border-slate-200 rounded-lg p-3">
          <div className="text-slate-500">Not Ortalaması / Sıra</div>
          <div className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
            {gradeSummary?.weightedAverage ?? '—'}{' '}
            {gradeSummary?.classRank ? `(#${gradeSummary.classRank})` : ''}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Kanaat: {gradeSummary?.kanaatScore ?? '—'}
          </div>
        </div>
        <div className="border border-slate-200 rounded-lg p-3">
          <div className="text-slate-500">Haftalık Cuma İzni</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {fridayEval?.compactBadgeLabel ?? 'İzne Uygun'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Ödev: {analyticsRow?.homeworkDone ?? 0}/{analyticsRow?.homeworkTotal ?? 0}
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-3.5 text-xs space-y-1">
        <div className="font-bold text-slate-900">Müfredat ve Seviye Bilgisi</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-700">
          <div>
            <strong>Yüzüne:</strong> {student.levels.yuzune || '—'}
          </div>
          <div>
            <strong>Ezber:</strong> {student.levels.ezber || '—'}
          </div>
          <div>
            <strong>Tecvid:</strong> {student.levels.tecvid || '—'}
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-bold text-slate-900 mb-2">Son Dinlenen Ders Kayıtları</div>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-300 text-slate-700">
              <th className="py-1.5 px-2">Tarih</th>
              <th className="py-1.5 px-2">Ders</th>
              <th className="py-1.5 px-2">Sayfa / Sure</th>
              <th className="py-1.5 px-2 text-center">Tur</th>
              <th className="py-1.5 px-2 text-center">Puan</th>
              <th className="py-1.5 px-2 text-center">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 tabular-nums">
            {recentLessons.slice(0, 12).map((l) => (
              <tr key={l.id}>
                <td className="py-1.5 px-2">{formatFullDDMMYYYY(l.date)}</td>
                <td className="py-1.5 px-2 font-medium">{inferLessonSubject(l)}</td>
                <td className="py-1.5 px-2">{l.pageOrVerse || l.topicTitle}</td>
                <td className="py-1.5 px-2 text-center">{l.turCount}</td>
                <td className="py-1.5 px-2 text-center">{l.score ?? '—'}</td>
                <td className="py-1.5 px-2 text-center font-semibold">{inferLessonStatus(l)}</td>
              </tr>
            ))}
            {recentLessons.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  Henüz ders kaydı bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PrintFooter managerName={institution.managerName} />
    </div>
  );
};

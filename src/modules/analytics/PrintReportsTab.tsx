import React, { useMemo, useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import type { Student } from '../../types';
import type { StudentAnalyticsRow } from '../../utils/analyticsEngine';
import {
  evaluateAllStudentsFridayLeave,
  getMondayOfDate,
} from '../../utils/fridayLeaveEngine';
import { getTodayISO } from '../../utils/id';
import {
  computeStudentGradeSummaries,
  getApplicableExams,
} from '../grades-homework/gradesEngine';
import {
  FridayLeavePrintSheet,
  GradeSheetPrintSheet,
  StudentReportCardPrintSheet,
  WeeklyMatrixPrintSheet,
  type PrintReportType,
} from './PrintTemplates';

interface PrintReportsTabProps {
  students: Student[];
  selectedClassId: string;
  classMap: Map<string, string>;
  analyticsRows: Map<string, StudentAnalyticsRow>;
}

const REPORT_CARDS: { id: PrintReportType; num: string; title: string; desc: string }[] = [
  {
    id: 'friday_list',
    num: '1',
    title: 'Cuma İzni Listesi',
    desc: 'Engel nedenleri ve veli teslim imza çizelgesi',
  },
  {
    id: 'weekly_matrix',
    num: '2',
    title: 'Haftalık Ders & Yoklama Çizelgesi',
    desc: 'Pazartesi–Pazar ders kodları ve devamsızlık özeti',
  },
  {
    id: 'grade_sheet',
    num: '3',
    title: 'Sınıf Not Çizelgesi',
    desc: 'Sınav, kanaat, ortalama ve sınıf sıralaması',
  },
  {
    id: 'student_card',
    num: '4',
    title: 'Bireysel Öğrenci Durum Karnesi',
    desc: 'Kuvvet analizi, devam, not ve son ders dökümü',
  },
];

const SHORT_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function buildWeekDates(refISO: string) {
  const mon = getMondayOfDate(refISO);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    return { iso, shortName: SHORT_DAYS[i] };
  });
}

export const PrintReportsTab: React.FC<PrintReportsTabProps> = ({
  students,
  selectedClassId,
  classMap,
  analyticsRows,
}) => {
  const { db, activeTerm } = useAppStore();
  const [reportType, setReportType] = useState<PrintReportType>('friday_list');
  const [refDate, setRefDate] = useState(getTodayISO());
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id ?? '');

  const termId = activeTerm?.id ?? '';
  const termName = activeTerm?.name ?? 'Aktif Dönem';

  const fridayData = useMemo(
    () =>
      evaluateAllStudentsFridayLeave({
        students,
        attendance: db.attendance,
        lessons: db.lessons,
        schedule: db.schedule,
        lessonSlots: db.lessonSlots,
        fridayPermissions: db.fridayPermissions,
        fridaySettings: db.fridaySettings,
        activeTermId: termId,
        referenceISO: refDate,
      }),
    [students, db, termId, refDate]
  );

  const weekDates = useMemo(() => buildWeekDates(refDate), [refDate]);

  const visibleExams = useMemo(
    () => getApplicableExams(db.exams, termId, selectedClassId || undefined),
    [db.exams, termId, selectedClassId]
  );

  const gradeSummaries = useMemo(
    () =>
      computeStudentGradeSummaries(
        students,
        db.exams,
        db.grades,
        db.gradingSettings,
        termId
      ),
    [students, db.exams, db.grades, db.gradingSettings, termId]
  );

  const targetStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? students[0] ?? null,
    [students, selectedStudentId]
  );

  const recentStudentLessons = useMemo(() => {
    if (!targetStudent) return [];
    return db.lessons
      .filter((l) => l.studentId === targetStudent.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.lessons, targetStudent]);

  return (
    <div className="space-y-4">
      {/* Report selector & print trigger (hidden in A4 printout) */}
      <div className="print-hidden space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {REPORT_CARDS.map((card) => {
            const active = reportType === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setReportType(card.id)}
                className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-50/80 border-emerald-600 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                      active ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {card.num}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{card.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">{card.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              <FileText className="w-4 h-4 text-emerald-700" />
              A4 Önizleme Ayarları:
            </span>

            {(reportType === 'friday_list' || reportType === 'weekly_matrix') && (
              <label className="inline-flex items-center gap-1.5">
                <span className="text-slate-500">Hafta Tarihi:</span>
                <input
                  type="date"
                  value={refDate}
                  onChange={(e) => e.target.value && setRefDate(e.target.value)}
                  className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg tabular-nums"
                />
              </label>
            )}

            {reportType === 'student_card' && (
              <label className="inline-flex items-center gap-1.5">
                <span className="text-slate-500">Öğrenci:</span>
                <select
                  value={targetStudent?.id ?? ''}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 cursor-pointer"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[40px] px-4 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            A4 Yazdır / PDF Kaydet
          </button>
        </div>
      </div>

      {/* Live Printable A4 Area */}
      <div>
        {reportType === 'friday_list' && (
          <FridayLeavePrintSheet
            institution={db.institution}
            termName={termName}
            weekRange={fridayData.weekRange}
            students={students}
            classMap={classMap}
            evaluations={fridayData.evaluations}
          />
        )}

        {reportType === 'weekly_matrix' && (
          <WeeklyMatrixPrintSheet
            institution={db.institution}
            termName={termName}
            weekDates={weekDates}
            students={students}
            classMap={classMap}
            lessons={db.lessons}
            attendance={db.attendance}
          />
        )}

        {reportType === 'grade_sheet' && (
          <GradeSheetPrintSheet
            institution={db.institution}
            termName={termName}
            students={students}
            classMap={classMap}
            exams={visibleExams}
            gradeSummaries={gradeSummaries}
            passThreshold={db.gradingSettings.passThreshold ?? 50}
          />
        )}

        {reportType === 'student_card' && (
          <StudentReportCardPrintSheet
            institution={db.institution}
            termName={termName}
            student={targetStudent}
            classNameLabel={targetStudent ? classMap.get(targetStudent.classId) ?? '—' : '—'}
            analyticsRow={targetStudent ? analyticsRows.get(targetStudent.id) : undefined}
            gradeSummary={targetStudent ? gradeSummaries.get(targetStudent.id) : undefined}
            fridayEval={
              targetStudent ? fridayData.evaluations.get(targetStudent.id) : undefined
            }
            recentLessons={recentStudentLessons}
          />
        )}
      </div>
    </div>
  );
};

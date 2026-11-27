import React, { useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  Landmark,
  Lock,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import type { Student } from '../../types';
import { DAILY_ATTENDANCE_SLOT_ID } from '../../types';
import { evaluateAllStudentsFridayLeave } from '../../utils/fridayLeaveEngine';
import { formatTurkishDate, getTodayISO } from '../../utils/id';
import { inferLessonStatus, inferLessonSubject } from '../../utils/lessonScheduleResolver';
import { buildPuanTurCommentary } from '../../utils/reportFormatter';
import { computeStudentGradeSummaries } from '../grades-homework/gradesEngine';

export const ParentPortalView: React.FC = () => {
  const { db, activeTerm } = useAppStore();
  const portalSettings = db.automation.portalSettings;

  const initialNo = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('no') ?? '';
  }, []);

  const [studentNoInput, setStudentNoInput] = useState(initialNo);
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifiedStudentId, setVerifiedStudentId] = useState<string | null>(null);

  const verifiedStudent: Student | undefined = useMemo(
    () => db.students.find((s) => s.id === verifiedStudentId),
    [db.students, verifiedStudentId]
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const noNorm = studentNoInput.trim().toLocaleLowerCase('tr-TR');
    const codeNorm = verifyCodeInput.trim().replace(/\D/g, '') || verifyCodeInput.trim();

    if (!noNorm || !codeNorm) {
      setAuthError('Lütfen öğrenci numarasını ve doğrulama bilgisini eksiksiz giriniz.');
      return;
    }

    const candidate = db.students.find(
      (s) =>
        s.status === 'Aktif' &&
        ((s.studentNo ?? '').trim().toLocaleLowerCase('tr-TR') === noNorm ||
          s.fullName.trim().toLocaleLowerCase('tr-TR') === noNorm)
    );

    if (!candidate) {
      setAuthError('Girilen öğrenci numarasına ait aktif kayıt bulunamadı.');
      return;
    }

    const matchesGuardianPhone = candidate.guardians.some((g) => {
      const digits = g.phone.replace(/\D/g, '');
      return digits.length >= 4 && digits.slice(-4) === codeNorm;
    });
    const matchesAccessCode =
      portalSettings.accessCode.trim().length > 0 &&
      portalSettings.accessCode.trim() === verifyCodeInput.trim();

    if (!matchesGuardianPhone && !matchesAccessCode) {
      setAuthError('Veli telefon son 4 hanesi veya kurum giriş kodu eşleşmedi.');
      return;
    }

    setVerifiedStudentId(candidate.id);
  };

  const todayISO = getTodayISO();

  const studentSummary = useMemo(() => {
    if (!verifiedStudent) return null;
    const classGroup = db.classes.find((c) => c.id === verifiedStudent.classId);
    const slotMap = new Map(db.lessonSlots.map((s) => [s.id, s.name]));
    const activeStudents = db.students.filter((s) => s.status === 'Aktif');
    const activeTermId = activeTerm?.id ?? '';

    const recentAttendance = db.attendance
      .filter((a) => a.studentId === verifiedStudent.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12);

    const recentLessons = db.lessons
      .filter((l) => l.studentId === verifiedStudent.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.recordedTime.localeCompare(a.recordedTime))
      .slice(0, 15);

    const studentHomeworks = db.homeworks
      .filter((h) => h.studentId === verifiedStudent.id)
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
      .slice(0, 10);

    const gradeSummaries = computeStudentGradeSummaries(
      activeStudents,
      db.exams,
      db.grades,
      db.gradingSettings,
      activeTermId
    );
    const myGradeSummary = gradeSummaries.get(verifiedStudent.id);

    // Optional class rank calculation
    const classPeers = activeStudents.filter((s) => s.classId === verifiedStudent.classId);
    const ranked = classPeers
      .map((s) => ({ id: s.id, avg: gradeSummaries.get(s.id)?.weightedAverage ?? -1 }))
      .filter((r) => r.avg >= 0)
      .sort((a, b) => b.avg - a.avg);
    const rankIndex = ranked.findIndex((r) => r.id === verifiedStudent.id);

    const studentGrades = db.grades
      .filter((g) => g.studentId === verifiedStudent.id && g.termId === activeTermId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const examMap = new Map(db.exams.map((e) => [e.id, e]));

    const fridayEval = evaluateAllStudentsFridayLeave({
      students: [verifiedStudent],
      attendance: db.attendance,
      lessons: db.lessons,
      schedule: db.schedule,
      lessonSlots: db.lessonSlots,
      fridayPermissions: db.fridayPermissions,
      fridaySettings: db.fridaySettings,
      activeTermId,
      referenceISO: todayISO,
    });
    const myFriday = fridayEval.evaluations.get(verifiedStudent.id);

    return {
      classGroup,
      slotMap,
      recentAttendance,
      recentLessons,
      studentHomeworks,
      myGradeSummary,
      classRank: rankIndex >= 0 ? { rank: rankIndex + 1, total: ranked.length } : null,
      studentGrades,
      examMap,
      myFriday,
    };
  }, [
    verifiedStudent,
    db.classes,
    db.lessonSlots,
    db.students,
    db.attendance,
    db.lessons,
    db.homeworks,
    db.exams,
    db.grades,
    db.gradingSettings,
    db.schedule,
    db.fridayPermissions,
    db.fridaySettings,
    activeTerm?.id,
    todayISO,
  ]);

  if (!portalSettings.enabled) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Veli Portalı Şu An Kapalı</h1>
          <p className="text-sm text-slate-500">
            {db.institution.name} tarafından Veli Takip Portalı geçici olarak devre dışı
            bırakılmıştır.
          </p>
        </div>
      </div>
    );
  }

  // Verification Gate
  if (!verifiedStudent || !studentSummary) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="bg-emerald-800 text-white px-6 py-5">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-200">
              <GraduationCap className="w-4 h-4" />
              <span>Veli Bilgilendirme Portalı</span>
            </div>
            <h1 className="text-lg font-bold mt-1">{db.institution.name}</h1>
            <p className="text-xs text-emerald-100/90 mt-1">
              Öğrencinizin yoklama, ders, ödev ve Cuma izni bilgilerini salt okunur olarak
              görüntüleyin.
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Öğrenci Numarası
              </label>
              <input
                type="text"
                value={studentNoInput}
                onChange={(e) => setStudentNoInput(e.target.value)}
                placeholder="Örn: 101"
                required
                className="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Veli Telefon Son 4 Hanesi (veya Kurum Kodu)
              </label>
              <input
                type="password"
                value={verifyCodeInput}
                onChange={(e) => setVerifyCodeInput(e.target.value)}
                placeholder="Örn: 4512"
                required
                className="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Öğrenci Durumunu Görüntüle
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Clean Read-Only Portal Header */}
      <header className="bg-emerald-800 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-emerald-200 truncate">
              {db.institution.name} · Veli Takip Portalı
            </div>
            <h1 className="text-lg font-bold truncate mt-0.5">{verifiedStudent.fullName}</h1>
            <div className="text-xs text-emerald-100/90 mt-0.5">
              {studentSummary.classGroup?.name ?? 'Sınıf'} · No: {verifiedStudent.studentNo || '—'} ·{' '}
              {verifiedStudent.programType}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setVerifiedStudentId(null);
              setVerifyCodeInput('');
            }}
            className="h-9 px-3 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 text-xs font-medium text-emerald-100 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Çıkış
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Level Strip */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-slate-500">Yüzüne Seviyesi</div>
            <div className="font-semibold text-slate-900 mt-0.5">
              {verifiedStudent.levels.yuzune || '—'}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-slate-500">Ezber / Hafızlık</div>
            <div className="font-semibold text-slate-900 mt-0.5">
              {verifiedStudent.levels.ezber || '—'}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-slate-500">Tecvid Seviyesi</div>
            <div className="font-semibold text-slate-900 mt-0.5">
              {verifiedStudent.levels.tecvid || '—'}
            </div>
          </div>
        </section>

        {/* Cuma İzni Status */}
        {portalSettings.showFridayLeave && studentSummary.myFriday && (
          <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Landmark className="w-4 h-4 text-emerald-700" />
                <span>Bu Haftaki Cuma İzni Durumu</span>
              </div>
              {studentSummary.myFriday.canLeave ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  İzne Uygun
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {studentSummary.myFriday.blockerCount} Engel Var
                </span>
              )}
            </div>

            {studentSummary.myFriday.blockers.length > 0 && (
              <ul className="space-y-1 text-xs text-slate-700 pt-1">
                {studentSummary.myFriday.blockers.map((b) => (
                  <li key={b.id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>{b.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Günlük Dersler + Puan/Tur Kuvvet Yorumu */}
        {portalSettings.showLessons && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-semibold text-slate-900">Son Ders Kayıtları</h2>
            </div>
            {studentSummary.recentLessons.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">Henüz ders kaydı bulunmuyor.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {studentSummary.recentLessons.map((lsn) => {
                  const subj = inferLessonSubject(lsn);
                  const st = inferLessonStatus(lsn);
                  const commentary =
                    st === 'Geçti' ? buildPuanTurCommentary(lsn.score, lsn.turCount) : null;
                  return (
                    <div key={lsn.id} className="px-4 sm:px-5 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                          {subj}
                          {lsn.pageOrVerse ? ` · ${lsn.pageOrVerse}` : ''}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            st === 'Geçti'
                              ? 'bg-emerald-50 text-emerald-800'
                              : st === 'Tekrar'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {st}
                          {typeof lsn.score === 'number' ? ` (${lsn.score}p)` : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {formatTurkishDate(lsn.date)} · {lsn.turCount} Tur
                        {lsn.amount ? ` · ${lsn.amount}` : ''}
                      </div>
                      {commentary && (
                        <div className="text-xs text-slate-700 bg-slate-50 rounded-md px-2.5 py-1.5">
                          {commentary}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Yoklama Kayıtları */}
        {portalSettings.showAttendance && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-semibold text-slate-900">Son Yoklama Kayıtları</h2>
            </div>
            {studentSummary.recentAttendance.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">Yoklama kaydı bulunmuyor.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {studentSummary.recentAttendance.map((att) => (
                  <div
                    key={att.id}
                    className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        {formatTurkishDate(att.date)}
                      </span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="text-slate-600">
                        {att.lessonSlotId === DAILY_ATTENDANCE_SLOT_ID
                          ? 'Günlük Yoklama'
                          : studentSummary.slotMap.get(att.lessonSlotId) ?? 'Ders'}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        att.status === 'Geldi'
                          ? 'bg-emerald-50 text-emerald-800'
                          : att.status === 'İzinli'
                            ? 'bg-sky-50 text-sky-800'
                            : att.status === 'Kurstan İzinsiz Çıktı'
                              ? 'bg-slate-900 text-white'
                              : att.status === 'Gelmedi'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {att.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Sınav & Kanaat Notları */}
        {portalSettings.showGrades && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-semibold text-slate-900">Sınav &amp; Kanaat Notları</h2>
              </div>
              {studentSummary.myGradeSummary?.weightedAverage !== null &&
                studentSummary.myGradeSummary?.weightedAverage !== undefined && (
                  <span className="text-xs font-bold text-emerald-800 tabular-nums">
                    Ortalama: {studentSummary.myGradeSummary.weightedAverage}
                    {portalSettings.showClassRank && studentSummary.classRank
                      ? ` · Sınıf Sırası: ${studentSummary.classRank.rank}/${studentSummary.classRank.total}`
                      : ''}
                  </span>
                )}
            </div>
            {studentSummary.studentGrades.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">Girilmiş sınav notu bulunmuyor.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {studentSummary.studentGrades.map((g) => {
                  const ex = g.examId ? studentSummary.examMap.get(g.examId) : undefined;
                  return (
                    <div
                      key={g.id}
                      className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">
                          {ex?.title || g.title || g.subjectName || g.category}
                        </div>
                        <div className="text-slate-400 tabular-nums">
                          {formatTurkishDate(g.date)}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-slate-900 tabular-nums">
                        {typeof g.score === 'number' ? `${g.score} puan` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Ödevler */}
        {portalSettings.showHomeworks && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-semibold text-slate-900">Ödev Takibi</h2>
            </div>
            {studentSummary.studentHomeworks.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">Tanımlı ödev bulunmuyor.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {studentSummary.studentHomeworks.map((hw) => (
                  <div
                    key={hw.id}
                    className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{hw.title}</div>
                      <div className="text-slate-400 tabular-nums">
                        Son Teslim: {formatTurkishDate(hw.dueDate)}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        hw.status === 'Yaptı' || hw.status === 'Tamamlandı'
                          ? 'bg-emerald-50 text-emerald-800'
                          : hw.status === 'Yapmadı'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {hw.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

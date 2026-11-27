import React, { useMemo } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  HardDriveDownload,
  Landmark,
  MapPin,
  MessageSquareText,
} from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import type { ModuleKey } from '../../types';
import { evaluateAllStudentsFridayLeave } from '../../utils/fridayLeaveEngine';
import { formatTodayHeader, formatTurkishDate, getTodayISO } from '../../utils/id';
import { countDistinctLessonSessions } from '../../utils/lessonScheduleResolver';
import { computeStudentGradeSummaries } from '../grades-homework/gradesEngine';

interface HomeModuleProps {
  onNavigate: (key: ModuleKey) => void;
}

export const HomeModule: React.FC<HomeModuleProps> = ({ onNavigate }) => {
  const { db, activeTerm } = useAppStore();
  const todayISO = getTodayISO();

  const stats = useMemo(() => {
    const activeStudents = db.students.filter((s) => s.status === 'Aktif');
    const hafizlikCount = activeStudents.filter((s) => s.programType === 'Hafızlık').length;
    const yuzuneCount = activeStudents.length - hafizlikCount;
    const activeClasses = db.classes.filter((c) => c.isActive);
    const activeTeachers = db.teachers.filter((t) => t.isActive);
    const todayAttendance = db.attendance.filter((a) => a.date === todayISO);
    const presentIds = new Set<string>();
    const absentIds = new Set<string>();
    const kicIds = new Set<string>();
    const excusedIds = new Set<string>();
    for (const rec of todayAttendance) {
      if (rec.status === 'Geldi' || rec.status === 'Geç Geldi') presentIds.add(rec.studentId);
      if (rec.status === 'Gelmedi' || rec.status === 'Derse Girmedi') absentIds.add(rec.studentId);
      if (rec.status === 'Kurstan İzinsiz Çıktı') kicIds.add(rec.studentId);
      if (rec.status === 'İzinli') excusedIds.add(rec.studentId);
    }
    const todayLessons = db.lessons.filter((l) => l.date === todayISO);

    const fridayEval = evaluateAllStudentsFridayLeave({
      students: activeStudents,
      attendance: db.attendance,
      lessons: db.lessons,
      schedule: db.schedule,
      lessonSlots: db.lessonSlots,
      fridayPermissions: db.fridayPermissions,
      fridaySettings: db.fridaySettings,
      activeTermId: activeTerm?.id ?? '',
      referenceISO: todayISO,
    });
    let fridayEligible = 0;
    let fridayWithBlockers = 0;
    for (const ev of fridayEval.evaluations.values()) {
      if (ev.canLeave) fridayEligible += 1;
      if (ev.blockerCount > 0) fridayWithBlockers += 1;
    }

    const gradeSummaries = computeStudentGradeSummaries(
      activeStudents,
      db.exams,
      db.grades,
      db.gradingSettings,
      activeTerm?.id ?? ''
    );
    let gradedCount = 0;
    let gradeSum = 0;
    for (const sm of gradeSummaries.values()) {
      if (sm.weightedAverage !== null) {
        gradedCount += 1;
        gradeSum += sm.weightedAverage;
      }
    }
    const overallGradeAvg =
      gradedCount > 0 ? Math.round((gradeSum / gradedCount) * 10) / 10 : null;

    const pendingHomeworks = db.homeworks.filter(
      (h) => h.status === 'Verildi' || h.status === 'Eksik' || h.status === 'Yapmadı'
    ).length;

    return {
      activeStudentCount: activeStudents.length,
      totalStudentCount: db.students.length,
      hafizlikCount,
      yuzuneCount,
      activeClassCount: activeClasses.length,
      activeTeacherCount: activeTeachers.length,
      todayAttendanceCount: todayAttendance.length,
      todayPresent: presentIds.size,
      todayAbsent: absentIds.size,
      todayKic: kicIds.size,
      todayExcused: excusedIds.size,
      todayLessonCount: countDistinctLessonSessions(todayLessons),
      fridayEligible,
      fridayWithBlockers,
      overallGradeAvg,
      examCount: db.exams.length,
      pendingHomeworks,
      totalHomeworks: db.homeworks.length,
    };
  }, [
    db.students,
    db.classes,
    db.teachers,
    db.attendance,
    db.lessons,
    db.schedule,
    db.lessonSlots,
    db.fridayPermissions,
    db.fridaySettings,
    db.exams,
    db.grades,
    db.gradingSettings,
    db.homeworks,
    activeTerm?.id,
    todayISO,
  ]);

  const classBreakdown = useMemo(() => {
    const teacherMap = new Map(db.teachers.map((t) => [t.id, t.fullName]));
    return db.classes.map((cls) => {
      const studentCount = db.students.filter(
        (s) => s.classId === cls.id && s.status === 'Aktif'
      ).length;
      return {
        ...cls,
        studentCount,
        teacherName: cls.teacherId ? teacherMap.get(cls.teacherId) ?? 'Atanmadı' : 'Atanmadı',
      };
    });
  }, [db.classes, db.students, db.teachers]);

  const shortcuts: {
    key: ModuleKey;
    title: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      key: 'attendance',
      title: 'Günlük & Saatlik Yoklama',
      subtitle: `Bugün ${stats.todayPresent} mevcut${stats.todayKic > 0 ? ` · ${stats.todayKic} KİÇ` : ''} · ders saati matrisi`,
      icon: ClipboardCheck,
    },
    {
      key: 'lessons',
      title: 'Ders Takip & Dinleme',
      subtitle: `Bugün ${stats.todayLessonCount} ders oturumu · tur sayacı ve haftalık matris`,
      icon: BookOpenCheck,
    },
    {
      key: 'friday',
      title: 'Cuma İzni & Engel Özeti',
      subtitle: `${stats.fridayEligible} izne uygun · ${stats.fridayWithBlockers} öğrencide engel kaydı var`,
      icon: Landmark,
    },
    {
      key: 'grades',
      title: 'Not & Ödev Takibi',
      subtitle: `${stats.examCount} sınav (${stats.overallGradeAvg !== null ? `Ort. ${stats.overallGradeAvg}` : 'not bekleniyor'}) · ${stats.pendingHomeworks} bekleyen ödev`,
      icon: FileSpreadsheet,
    },
    {
      key: 'analytics',
      title: 'Analiz & A4 Çıktı Merkezi',
      subtitle: 'Puan + tur ders kuvveti analizi ve 4 hazır A4 yazdırılabilir rapor',
      icon: BarChart3,
    },
    {
      key: 'automation',
      title: 'Veli & Otomasyon Merkezi',
      subtitle:
        db.whatsappQueue.length > 0
          ? `${db.whatsappQueue.length} bekleyen WhatsApp mesajı · şablonlar, Telegram ve Veli Portalı`
          : 'Zamanlı bildirimler, Puan+Tur rapor şablonları, Telegram Bot ve Veli Portalı',
      icon: MessageSquareText,
    },
    {
      key: 'system',
      title: 'Yedek Al / Google Bulut Eşitle',
      subtitle: 'JSON yedekleme, v3 veri aktarımı ve Google Apps Script canlı bulut eşitlemesi',
      icon: HardDriveDownload,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Institutional Header Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-emerald-700">
              <span>{activeTerm ? activeTerm.name : 'Aktif Dönem Tanımlanmadı'}</span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-500 capitalize">{formatTodayHeader()}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {db.institution.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {db.institution.district} / {db.institution.city}
              </span>
              {db.institution.managerName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Yönetici: {db.institution.managerName}</span>
                </>
              )}
              {activeTerm && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                    {formatTurkishDate(activeTerm.startDate)} – {formatTurkishDate(activeTerm.endDate)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('institution')}
              className="min-h-[42px] px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Kurumu Yönet
            </button>
            <button
              type="button"
              onClick={() => onNavigate('records')}
              className="min-h-[42px] px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Kayıtlara Geç
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Summary KPI Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">Aktif Öğrenci</div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
            {stats.activeStudentCount}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
            Hafızlık: {stats.hafizlikCount} · Yüzüne: {stats.yuzuneCount}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">Sınıf & Grup</div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
            {stats.activeClassCount}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {db.lessonSlots.length} tanımlı ders / etüt saati
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">Öğretmen Kadrosu</div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
            {stats.activeTeacherCount}
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            Aktif görevli öğretici
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="bg-white border border-slate-200 hover:border-emerald-400 rounded-xl p-4 sm:p-5 text-left transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500">Bugünkü Yoklama / Ders</div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-700 tabular-nums">
            {stats.todayPresent}{' '}
            <span className="text-slate-300 font-normal">/</span> {stats.todayLessonCount}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {stats.todayPresent} mevcut
            {stats.todayAbsent > 0 ? ` · ${stats.todayAbsent} gelmedi` : ''}
            {stats.todayKic > 0 ? ` · ${stats.todayKic} KİÇ` : ''}
            {stats.todayExcused > 0 ? ` · ${stats.todayExcused} izinli` : ''}
            {stats.todayAbsent === 0 && stats.todayKic === 0 && stats.todayExcused === 0
              ? ` · ${stats.todayAttendanceCount} kayıt`
              : ''}
          </div>
        </button>
      </section>

      {/* Main 2-Column Workspace Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Quick Shortcuts */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Hızlı Erişim</h3>
            <span className="text-xs text-slate-400">Tek tıkla modül geçişi</span>
          </div>
          <div className="divide-y divide-slate-100">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className="w-full px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-700 flex items-center justify-center shrink-0 transition-colors">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{item.subtitle}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Classes & Daily Schedule Summary */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Sınıf & Grup Özeti</h3>
              <button
                type="button"
                onClick={() => onNavigate('institution')}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                Düzenle
              </button>
            </div>
            {classBreakdown.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                Henüz sınıf tanımlanmamış.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {classBreakdown.map((cls) => (
                  <div key={cls.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{cls.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {cls.shiftType} · {cls.teacherName}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-slate-900 tabular-nums inline-flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                        {cls.studentCount}
                        {cls.capacity ? ` / ${cls.capacity}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400">öğrenci</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Günlük Ders Saatleri</h3>
              <span className="text-xs text-slate-400 tabular-nums">
                {db.lessonSlots.length} dilim
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {db.lessonSlots.slice(0, 5).map((slot) => (
                <div
                  key={slot.id}
                  className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800">{slot.name}</span>
                    <span className="text-xs text-slate-400 ml-2">
                      {slot.category === 'etut' ? 'Etüt' : 'Normal'}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-600 tabular-nums inline-flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {slot.startTime} – {slot.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

import React, { useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import type {
  AttendanceRecord,
  AttendanceStatus,
  DailyReportSectionsConfig,
  MessageTemplateKey,
} from '../../types';
import { DAILY_ATTENDANCE_SLOT_ID } from '../../types';
import { getTodayISO } from '../../utils/id';
import {
  buildAttendanceNotificationMessage,
  buildDailyStudentReportMessage,
  DEFAULT_DAILY_REPORT_SECTIONS,
  DEFAULT_MESSAGE_TEMPLATES,
  formatTelegramHtml,
  TEMPLATE_VARIABLES,
} from '../../utils/reportFormatter';

const TEMPLATE_TABS: { key: MessageTemplateKey; label: string; sampleStatus?: AttendanceStatus }[] =
  [
    { key: 'dailyReport', label: '📖 Günlük Rapor' },
    { key: 'gelmedi', label: '❌ Gelmedi', sampleStatus: 'Gelmedi' },
    { key: 'derseGirmedi', label: '🟠 Derse Girmedi', sampleStatus: 'Derse Girmedi' },
    {
      key: 'izinsizCikti',
      label: '⚫ Kurstan İzinsiz Çıktı',
      sampleStatus: 'Kurstan İzinsiz Çıktı',
    },
    { key: 'gecGeldi', label: '⏳ Geç Geldi', sampleStatus: 'Geç Geldi' },
    { key: 'izinli', label: '📋 İzinli', sampleStatus: 'İzinli' },
  ];

const REPORT_SECTION_TOGGLES: { key: keyof DailyReportSectionsConfig; label: string }[] = [
  { key: 'showAttendance', label: 'Yoklama Bölümü' },
  { key: 'showPassedLessons', label: 'Verdiği Dersler' },
  { key: 'showMissedLessons', label: 'Vermediği / Tekrar Dersleri' },
  { key: 'showAutoTag', label: '"(Otomatik kayıt)" notu' },
  { key: 'showUnenteredScheduled', label: 'Programda Olup Girilmeyenler' },
  { key: 'showAdviceFooter', label: 'Alt Tavsiye Notu' },
  { key: 'showAcademicAverage', label: 'Akademik Ortalama Özeti' },
  { key: 'showExamResults', label: 'Sınav Sonuçları' },
  { key: 'showPortalLink', label: 'Veli Portal Linki' },
];

export const MessageTemplatesTab: React.FC = () => {
  const { db, activeTerm, updateAutomationSettings, showToast } = useAppStore();
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplateKey>('dailyReport');
  const [previewChannel, setPreviewChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const activeStudents = useMemo(
    () => db.students.filter((s) => s.status === 'Aktif'),
    [db.students]
  );
  const [previewStudentId, setPreviewStudentId] = useState<string>(
    () => activeStudents[0]?.id ?? ''
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentValue =
    db.automation.templates?.[selectedTemplate] ?? DEFAULT_MESSAGE_TEMPLATES[selectedTemplate];

  const handleTemplateChange = (nextText: string) => {
    updateAutomationSettings({
      templates: {
        ...db.automation.templates,
        [selectedTemplate]: nextText,
      },
    });
  };

  const handleInsertVariable = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      handleTemplateChange(`${currentValue} ${token}`);
      return;
    }
    const start = el.selectionStart ?? currentValue.length;
    const end = el.selectionEnd ?? currentValue.length;
    const next = currentValue.slice(0, start) + token + currentValue.slice(end);
    handleTemplateChange(next);
    window.requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleResetSelected = () => {
    updateAutomationSettings({
      templates: {
        ...db.automation.templates,
        [selectedTemplate]: DEFAULT_MESSAGE_TEMPLATES[selectedTemplate],
      },
      ...(selectedTemplate === 'dailyReport'
        ? { dailyReportSections: { ...DEFAULT_DAILY_REPORT_SECTIONS } }
        : {}),
    });
    showToast('Seçili şablon varsayılan haline sıfırlandı.', 'info');
  };

  const handleToggleSection = (key: keyof DailyReportSectionsConfig) => {
    updateAutomationSettings({
      dailyReportSections: {
        ...db.automation.dailyReportSections,
        [key]: !db.automation.dailyReportSections[key],
      },
    });
  };

  const previewStudent = useMemo(
    () => activeStudents.find((s) => s.id === previewStudentId) ?? activeStudents[0],
    [activeStudents, previewStudentId]
  );

  const livePreviewText = useMemo(() => {
    if (!previewStudent) return 'Önizleme için aktif öğrenci bulunmuyor.';
    const todayISO = getTodayISO();
    const classGroup = db.classes.find((c) => c.id === previewStudent.classId);

    if (selectedTemplate === 'dailyReport') {
      return buildDailyStudentReportMessage({
        student: previewStudent,
        classGroup,
        dateISO: todayISO,
        activeTermId: activeTerm?.id ?? '',
        attendance: db.attendance,
        lessons: db.lessons,
        schedule: db.schedule,
        lessonSlots: db.lessonSlots,
        exams: db.exams,
        grades: db.grades,
        gradingSettings: db.gradingSettings,
        allActiveStudents: activeStudents,
        automation: db.automation,
      });
    }

    const tabMeta = TEMPLATE_TABS.find((t) => t.key === selectedTemplate);
    const sampleSlot =
      selectedTemplate === 'gelmedi'
        ? undefined
        : db.lessonSlots.find((s) => s.category === 'normal') ?? db.lessonSlots[0];
    const sampleRecord: AttendanceRecord = {
      id: 'preview_att',
      date: todayISO,
      classId: previewStudent.classId,
      lessonSlotId:
        selectedTemplate === 'gelmedi'
          ? DAILY_ATTENDANCE_SLOT_ID
          : sampleSlot?.id ?? DAILY_ATTENDANCE_SLOT_ID,
      studentId: previewStudent.id,
      status: tabMeta?.sampleStatus ?? 'Gelmedi',
      recordedTime: '14:50',
    };

    return buildAttendanceNotificationMessage({
      student: previewStudent,
      classGroup,
      record: sampleRecord,
      slot: sampleSlot,
      subjectName: selectedTemplate === 'gelmedi' ? undefined : 'Talim Tecvid',
      automation: db.automation,
    });
  }, [
    previewStudent,
    selectedTemplate,
    db.classes,
    db.attendance,
    db.lessons,
    db.schedule,
    db.lessonSlots,
    db.exams,
    db.grades,
    db.gradingSettings,
    db.automation,
    activeStudents,
    activeTerm?.id,
  ]);

  const telegramPreviewLines = useMemo(() => {
    const html = formatTelegramHtml(livePreviewText);
    return html.split('\n').map((line, idx) => {
      const boldMatch = line.match(/^<b>(.*)<\/b>$/);
      const unescape = (s: string) =>
        s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      if (boldMatch) {
        return (
          <div key={idx} className="font-bold text-slate-900">
            {unescape(boldMatch[1])}
          </div>
        );
      }
      return (
        <div key={idx} className="min-h-[1.15em]">
          {unescape(line)}
        </div>
      );
    });
  }, [livePreviewText]);

  return (
    <div className="space-y-4">
      {/* Single-Row 6-Template Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center gap-1.5 overflow-x-auto">
        {TEMPLATE_TABS.map((tab) => {
          const active = selectedTemplate === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTemplate(tab.key)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                active
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Left Editor + Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Template Editor + Variables + Daily Report Section Toggles */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Şablon Metni</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Değişken etiketlerine tıklayarak metne anında ekleyebilirsiniz.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Varsayılana Sıfırla
            </button>
          </div>

          <textarea
            ref={textareaRef}
            rows={selectedTemplate === 'dailyReport' ? 7 : 5}
            value={currentValue}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full p-3.5 text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 font-sans"
          />

          {/* Variable Chips */}
          <div>
            <div className="text-xs font-medium text-slate-600 mb-2">Eklenebilir Değişkenler</div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => handleInsertVariable(v.token)}
                  title={v.label}
                  className="px-2.5 py-1 text-xs font-mono text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                >
                  {v.token}
                </button>
              ))}
            </div>
          </div>

          {/* 9 Section Show/Hide Toggles for Daily Report */}
          {selectedTemplate === 'dailyReport' && (
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="text-xs font-semibold text-slate-800">
                Günlük Rapor Bölümleri (Aç / Kapat)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REPORT_SECTION_TOGGLES.map((item) => {
                  const checked = db.automation.dailyReportSections[item.key];
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="text-xs font-medium text-slate-700">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleSection(item.key)}
                        className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Right: Live Message Preview */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Canlı Mesaj Önizlemesi</h3>
              <p className="text-[11px] text-slate-500">
                Gerçek öğrenci verisiyle anlık oluşturulur
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setPreviewChannel('whatsapp')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  previewChannel === 'whatsapp'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setPreviewChannel('telegram')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  previewChannel === 'telegram'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Telegram
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Önizlenecek Öğrenci
            </label>
            <select
              value={previewStudent?.id ?? ''}
              onChange={(e) => setPreviewStudentId(e.target.value)}
              className="w-full h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              {activeStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.fullName} {st.studentNo ? `(#${st.studentNo})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Chat Bubble Simulation */}
          <div
            className={`p-4 min-h-[280px] ${
              previewChannel === 'whatsapp' ? 'bg-emerald-50/60' : 'bg-sky-50/60'
            }`}
          >
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-sm p-4 shadow-xs text-[13px] leading-relaxed text-slate-800">
              {previewChannel === 'whatsapp' ? (
                <div className="whitespace-pre-wrap break-words">{livePreviewText}</div>
              ) : (
                <div className="space-y-0.5 break-words">{telegramPreviewLines}</div>
              )}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  {previewChannel === 'whatsapp'
                    ? 'WhatsApp temiz düz metin'
                    : 'Telegram HTML biçimi'}
                </span>
                <span className="tabular-nums">{livePreviewText.length} karakter</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

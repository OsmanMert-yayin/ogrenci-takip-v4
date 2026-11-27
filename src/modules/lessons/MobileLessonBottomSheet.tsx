import React, { useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import type {
  AttendanceRecord,
  LessonRecord,
  LessonResultStatus,
  LessonSlot,
  ScheduleEntry,
  Student,
  TopicPoolItem,
} from '../../types';
import {
  findExactDuplicateLesson,
  type DuplicateMatchInfo,
} from '../../utils/duplicateAndMakeupEngine';
import {
  getSubjectShortCode,
  inferLessonStatus,
  inferLessonSubject,
  resolveDailySubjectsForClass,
  resolveRowAttendanceForSubject,
} from '../../utils/lessonScheduleResolver';
import { SUBJECT_PRESETS } from '../curriculum/curriculumConstants';
import { TurCounterCell } from './TurCounterCell';
import { lessonStatusToEvaluation, type PendingLessonRequest } from './LessonConfirmModals';

interface MobileLessonBottomSheetProps {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  classNameLabel: string;
  date: string;
  activeTermId: string;
  schedule: ScheduleEntry[];
  lessonSlots: LessonSlot[];
  dayStudentLessons: LessonRecord[];
  allLessons: LessonRecord[];
  topicPool: TopicPoolItem[];
  attendanceLookup: Map<string, AttendanceRecord>;
  onRequestSave: (req: PendingLessonRequest) => void;
  onDeleteSaved: (lessonId: string) => void;
}

interface SheetTabItem {
  key: string;
  subjectName: string;
  defaultTopic?: string;
  slotIds: string[];
  firstSlotId?: string;
  existingRecord?: LessonRecord;
  isExtra?: boolean;
}

const QUICK_SCORES = [60, 70, 80, 85, 90, 95, 100];
const EXTRA_SUBJECTS = SUBJECT_PRESETS.filter(
  (s) => s.toLocaleLowerCase('tr-TR') !== 'mütalaa'
);

export const MobileLessonBottomSheet: React.FC<MobileLessonBottomSheetProps> = ({
  open,
  onClose,
  student,
  classNameLabel,
  date,
  activeTermId,
  schedule,
  lessonSlots,
  dayStudentLessons,
  allLessons,
  topicPool,
  attendanceLookup,
  onRequestSave,
  onDeleteSaved,
}) => {
  const datalistId = useId();
  const [extraTabSubjects, setExtraTabSubjects] = useState<string[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>('');

  const [subjectName, setSubjectName] = useState('Yüzüne');
  const [topicTitle, setTopicTitle] = useState('');
  const [pageOrVerse, setPageOrVerse] = useState('');
  const [amount, setAmount] = useState('');
  const [turCount, setTurCount] = useState(1);
  const [scoreStr, setScoreStr] = useState('');

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset extra tabs when student changes
  useEffect(() => {
    setExtraTabSubjects([]);
    setActiveTabKey('');
  }, [student?.id, date, open]);

  const tabs: SheetTabItem[] = useMemo(() => {
    if (!student) return [];
    const templates = resolveDailySubjectsForClass(
      schedule,
      lessonSlots,
      activeTermId,
      student.classId,
      date
    );
    const usedIds = new Set<string>();
    const list: SheetTabItem[] = [];

    templates.forEach((tpl, idx) => {
      const norm = tpl.subjectName.toLocaleLowerCase('tr-TR');
      const matched = dayStudentLessons.find(
        (l) => !usedIds.has(l.id) && inferLessonSubject(l).toLocaleLowerCase('tr-TR') === norm
      );
      if (matched) usedIds.add(matched.id);
      list.push({
        key: matched ? matched.id : `tpl_${idx}_${tpl.subjectName}`,
        subjectName: tpl.subjectName,
        defaultTopic: tpl.defaultTopic,
        slotIds: tpl.slotIds,
        firstSlotId: tpl.firstSlotId,
        existingRecord: matched,
      });
    });

    for (const l of dayStudentLessons) {
      if (usedIds.has(l.id)) continue;
      list.push({
        key: l.id,
        subjectName: inferLessonSubject(l),
        slotIds: l.lessonSlotId ? [l.lessonSlotId] : [],
        firstSlotId: l.lessonSlotId,
        existingRecord: l,
      });
    }

    extraTabSubjects.forEach((subj, idx) => {
      list.push({
        key: `extra_${idx}_${subj}`,
        subjectName: subj,
        slotIds: [],
        isExtra: true,
      });
    });

    return list;
  }, [student, schedule, lessonSlots, activeTermId, date, dayStudentLessons, extraTabSubjects]);

  // Pick initial or valid tab
  const currentTab = useMemo(() => {
    if (tabs.length === 0) return null;
    return tabs.find((t) => t.key === activeTabKey) ?? tabs[0];
  }, [tabs, activeTabKey]);

  // Load form values when switching tab
  useEffect(() => {
    if (!currentTab) return;
    if (currentTab.existingRecord) {
      const r = currentTab.existingRecord;
      setSubjectName(inferLessonSubject(r));
      setTopicTitle(r.topicTitle ?? '');
      setPageOrVerse(r.pageOrVerse ?? '');
      setAmount(r.amount ?? '');
      setTurCount(r.turCount ?? 1);
      setScoreStr(typeof r.score === 'number' ? String(r.score) : '');
    } else {
      setSubjectName(currentTab.subjectName);
      setTopicTitle(currentTab.defaultTopic ?? '');
      setPageOrVerse('');
      setAmount('');
      setTurCount(1);
      setScoreStr('');
    }
  }, [currentTab?.key, currentTab?.existingRecord?.id]);

  const subjectSuggestions = useMemo(() => {
    const norm = subjectName.trim().toLocaleLowerCase('tr-TR');
    return topicPool
      .filter((t) => t.isActive && t.category.toLocaleLowerCase('tr-TR') === norm)
      .slice(0, 40);
  }, [topicPool, subjectName]);

  const duplicateMatch: DuplicateMatchInfo | null = useMemo(() => {
    if (!student) return null;
    return findExactDuplicateLesson(
      allLessons,
      student.id,
      pageOrVerse,
      currentTab?.existingRecord?.id,
      currentTab?.existingRecord?.makeupOfId
    );
  }, [allLessons, student, pageOrVerse, currentTab]);

  const rowAttendance = useMemo(() => {
    if (!student || !currentTab) return { rowDimmed: false, rowBadgeStatus: null };
    return resolveRowAttendanceForSubject(attendanceLookup, student.id, currentTab.slotIds);
  }, [attendanceLookup, student, currentTab]);

  if (!open || !student || !currentTab) return null;

  const handleSaveWithStatus = (chosenStatus: LessonResultStatus) => {
    const parsedScore =
      scoreStr.trim() === '' ? undefined : Math.max(0, Math.min(100, Number(scoreStr)));
    const validScore =
      typeof parsedScore === 'number' && !Number.isNaN(parsedScore) ? parsedScore : undefined;

    onRequestSave({
      studentName: student.fullName,
      input: {
        id: currentTab.existingRecord?.id,
        date,
        studentId: student.id,
        classId: student.classId,
        lessonSlotId: currentTab.existingRecord?.lessonSlotId ?? currentTab.firstSlotId,
        subjectName,
        topicTitle: topicTitle.trim() || subjectName,
        pageOrVerse: pageOrVerse.trim() || undefined,
        amount: amount.trim() || undefined,
        score: validScore,
        status: chosenStatus,
        evaluation: lessonStatusToEvaluation(chosenStatus, validScore),
        turCount: Math.max(1, turCount),
        makeupOfId: currentTab.existingRecord?.makeupOfId,
        combinedSessionId: currentTab.existingRecord?.combinedSessionId,
        isAutoGenerated: false,
      },
      onCommitted: () => {
        // Auto-advance to next unentered tab if available, otherwise close
        const nextUnentered = tabs.find(
          (t) => t.key !== currentTab.key && !t.existingRecord
        );
        if (nextUnentered) {
          setActiveTabKey(nextUnentered.key);
        } else {
          onClose();
        }
      },
    });
  };

  const handleAddExtraTab = () => {
    const defaultExtra = student.programType === 'Hafızlık' ? 'Hafızlık' : 'Ezber';
    const nextIdx = extraTabSubjects.length;
    setExtraTabSubjects((prev) => [...prev, defaultExtra]);
    setActiveTabKey(`extra_${nextIdx}_${defaultExtra}`);
  };

  const currentSavedStatus = currentTab.existingRecord
    ? inferLessonStatus(currentTab.existingRecord)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Drag handle & Header */}
        <div className="pt-2.5 pb-3 px-4 border-b border-slate-200 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-2.5" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                {student.fullName}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                <span>{classNameLabel}</span>
                <span>•</span>
                {student.programType === 'Hafızlık' ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-semibold">
                    Hafızlık Devam
                  </span>
                ) : (
                  <span>
                    Yüzüne: {student.levels.yuzune || '—'} • Ezber: {student.levels.ezber || '—'}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="min-h-[40px] min-w-[40px] -mr-1 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Horizontal Subject Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-0.5 -mx-1 px-1">
            {tabs.map((tab) => {
              const active = tab.key === currentTab.key;
              const st = tab.existingRecord ? inferLessonStatus(tab.existingRecord) : null;
              const dotClass =
                st === 'Geçti'
                  ? 'bg-emerald-500'
                  : st === 'Tekrar'
                    ? 'bg-amber-500'
                    : st === 'Vermedi'
                      ? 'bg-red-500'
                      : 'bg-slate-300';

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTabKey(tab.key)}
                  className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold border whitespace-nowrap inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                    active
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${active ? 'bg-white' : dotClass}`} />
                  <span>{tab.subjectName}</span>
                  <span className={`text-[10px] ${active ? 'text-emerald-100' : 'text-slate-400'}`}>
                    ({getSubjectShortCode(tab.subjectName)})
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleAddExtraTab}
              className="min-h-[38px] px-2.5 rounded-xl text-xs font-semibold border border-dashed border-emerald-400 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/70 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Ek
            </button>
          </div>
        </div>

        {/* Scrollable form body */}
        <div className="px-4 py-4 overflow-y-auto space-y-4 flex-1">
          {/* Attendance warning if dimmed or partial */}
          {(rowAttendance.rowBadgeStatus || rowAttendance.partialWarning) && (
            <div
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                rowAttendance.rowBadgeStatus === 'Kurstan İzinsiz Çıktı'
                  ? 'bg-slate-900 text-white'
                  : rowAttendance.rowBadgeStatus === 'Gelmedi'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : rowAttendance.rowBadgeStatus === 'İzinli'
                      ? 'bg-sky-50 text-sky-800 border border-sky-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <span>
                Yoklama Durumu:{' '}
                {rowAttendance.rowBadgeStatus ?? rowAttendance.partialWarning}
              </span>
              <span className="text-[11px] font-normal opacity-85">Manuel giriş açık</span>
            </div>
          )}

          {/* Extra subject selector when adding extra tab */}
          {currentTab.isExtra && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ders Seçimi</label>
              <select
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full min-h-[44px] px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
              >
                {EXTRA_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sayfa / Sure — Full Width + Duplicate Badge Below */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Sayfa / Sure / Başlık</label>
              {currentTab.existingRecord?.makeupOfId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
                  <RefreshCw className="w-3 h-3" />
                  Telafi Kaydı
                </span>
              )}
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <input
                type="text"
                list={datalistId}
                value={pageOrVerse}
                onChange={(e) => setPageOrVerse(e.target.value)}
                placeholder="Örn: 86-Tarık, 562, 561-563, İzhar..."
                className={`w-full min-h-[46px] px-3.5 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white ${
                  duplicateMatch
                    ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500'
                    : 'border-slate-200 focus:border-emerald-600'
                }`}
              />
              <datalist id={datalistId}>
                {subjectSuggestions.map((t) => (
                  <option key={t.id} value={t.title} />
                ))}
              </datalist>

              {duplicateMatch && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-800 tabular-nums">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>⚠️ Tekrar: {duplicateMatch.badgeText}</span>
                </div>
              )}
            </div>

            {/* Quick topic chips for fast thumb tap */}
            {subjectSuggestions.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5">
                {subjectSuggestions.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPageOrVerse(item.title)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs border whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      pageOrVerse === item.title
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Konu & Miktar */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Konu</label>
              <input
                type="text"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder={subjectName}
                className="w-full min-h-[42px] px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Miktar</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1 Sayfa / 1 Sure"
                className="w-full min-h-[42px] px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Big Thumb Tur Counter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tur Sayacı (Puanı düşürmez)
            </label>
            <TurCounterCell value={turCount} onChange={setTurCount} size="lg" />
          </div>

          {/* Quick Score Buttons + Manual Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Puan</label>
              <input
                type="number"
                min={0}
                max={100}
                value={scoreStr}
                onChange={(e) => setScoreStr(e.target.value)}
                placeholder="Manuel"
                aria-label="Manuel Puan"
                className="w-24 h-9 px-2.5 text-sm text-center font-semibold tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {QUICK_SCORES.map((val) => {
                const selected = scoreStr === String(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScoreStr(String(val))}
                    className={`min-h-[44px] rounded-xl text-xs font-bold tabular-nums border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>

          {currentTab.existingRecord && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400 tabular-nums inline-flex items-center gap-1.5">
                <span>
                  Kayıtlı Durum: <strong className="text-slate-700">{currentSavedStatus}</strong> •{' '}
                  {currentTab.existingRecord.recordedTime}
                </span>
                {currentTab.existingRecord.isAutoGenerated && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-semibold text-slate-600 leading-none">
                    Oto
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  onDeleteSaved(currentTab.existingRecord!.id);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Kaydı Sil
              </button>
            </div>
          )}
        </div>

        {/* Bottom 3 Large Thumb Action Buttons */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/90 shrink-0 pb-safe">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSaveWithStatus('Vermedi')}
              className={`min-h-[50px] rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                currentSavedStatus === 'Vermedi'
                  ? 'bg-red-700 text-white ring-2 ring-red-400'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              Vermedi
            </button>
            <button
              type="button"
              onClick={() => handleSaveWithStatus('Tekrar')}
              className={`min-h-[50px] rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                currentSavedStatus === 'Tekrar'
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              Tekrar
            </button>
            <button
              type="button"
              onClick={() => handleSaveWithStatus('Geçti')}
              className={`min-h-[50px] rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                currentSavedStatus === 'Geçti'
                  ? 'bg-emerald-800 text-white ring-2 ring-emerald-400'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              Geçti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Layers, Plus, Users, X } from 'lucide-react';
import type {
  AttendanceRecord,
  LessonResultStatus,
  Student,
  TopicPoolItem,
} from '../../types';
import type { LessonUpsertInput } from '../../store/academicMutations';
import { createId } from '../../utils/id';
import { resolveStudentCardAttendance } from '../../utils/lessonScheduleResolver';
import { SUBJECT_PRESETS } from '../curriculum/curriculumConstants';
import { lessonStatusToEvaluation } from './LessonConfirmModals';

interface MobileBulkLessonDrawerProps {
  open: boolean;
  onClose: () => void;
  date: string;
  students: Student[];
  classMap: Map<string, string>;
  topicPool: TopicPoolItem[];
  attendanceLookup: Map<string, AttendanceRecord>;
  onCommitBatch: (inputs: LessonUpsertInput[], summaryMessage: string) => void;
}

interface MobileStudentBulkRow {
  selected: boolean;
  score: number;
  status: LessonResultStatus;
}

const SUBJECTS = SUBJECT_PRESETS.filter(
  (s) => s.toLocaleLowerCase('tr-TR') !== 'mütalaa'
);
const QUICK_BULK_SCORES = [70, 80, 90, 100];

export const MobileBulkLessonDrawer: React.FC<MobileBulkLessonDrawerProps> = ({
  open,
  onClose,
  date,
  students,
  classMap,
  topicPool,
  attendanceLookup,
  onCommitBatch,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subjectName, setSubjectName] = useState('Talim Tecvid');
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [amount, setAmount] = useState('1 Ders');
  const [turCount, setTurCount] = useState(1);
  const [rows, setRows] = useState<Record<string, MobileStudentBulkRow>>({});

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const init: Record<string, MobileStudentBulkRow> = {};
    for (const s of students) {
      const att = resolveStudentCardAttendance(attendanceLookup, s.id);
      init[s.id] = {
        selected: !att.cardDimmed,
        score: 90,
        status: 'Geçti',
      };
    }
    setRows(init);
    setStep(1);
    setSelectedTitles([]);
    setCustomTitle('');
    setTopicSearch('');

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, students, attendanceLookup]);

  const filteredTopics = useMemo(() => {
    const normSubj = subjectName.trim().toLocaleLowerCase('tr-TR');
    const q = topicSearch.trim().toLocaleLowerCase('tr-TR');
    return topicPool.filter((t) => {
      if (!t.isActive) return false;
      if (t.category.toLocaleLowerCase('tr-TR') !== normSubj) return false;
      if (!q) return true;
      return t.title.toLocaleLowerCase('tr-TR').includes(q);
    });
  }, [topicPool, subjectName, topicSearch]);

  const selectedStudents = useMemo(
    () => students.filter((s) => rows[s.id]?.selected),
    [students, rows]
  );

  if (!open) return null;

  const toggleTitle = (title: string) => {
    setSelectedTitles((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]
    );
  };

  const addCustom = () => {
    const clean = customTitle.trim();
    if (!clean) return;
    if (!selectedTitles.includes(clean)) {
      setSelectedTitles((prev) => [...prev, clean]);
    }
    setCustomTitle('');
  };

  const selectAllPresent = () => {
    setRows((prev) => {
      const next = { ...prev };
      for (const s of students) {
        const att = resolveStudentCardAttendance(attendanceLookup, s.id);
        next[s.id] = { ...next[s.id], selected: !att.cardDimmed };
      }
      return next;
    });
  };

  const clearAll = () => {
    setRows((prev) => {
      const next = { ...prev };
      for (const s of students) {
        next[s.id] = { ...next[s.id], selected: false };
      }
      return next;
    });
  };

  const handleFinish = () => {
    if (selectedStudents.length === 0) return;
    const titlesToSave = selectedTitles.length > 0 ? selectedTitles : [subjectName];
    const isCombined = titlesToSave.length > 1;
    const combinedSessionId = isCombined ? createId('comb') : undefined;
    const inputs: LessonUpsertInput[] = [];

    for (const st of selectedStudents) {
      const cfg = rows[st.id];
      for (const title of titlesToSave) {
        inputs.push({
          date,
          studentId: st.id,
          classId: st.classId,
          subjectName,
          topicTitle: subjectName,
          pageOrVerse: title,
          amount: amount.trim() || undefined,
          score: cfg.score,
          status: cfg.status,
          evaluation: lessonStatusToEvaluation(cfg.status, cfg.score),
          turCount: Math.max(1, turCount),
          combinedSessionId,
        });
      }
    }

    const msg = isCombined
      ? `${selectedStudents.length} öğrenciye ${titlesToSave.length} başlık tek oturum olarak işlendi.`
      : `${selectedStudents.length} öğrenciye toplu ders kaydedildi.`;

    onCommitBatch(inputs, msg);
    onClose();
  };

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
        {/* Header & 3-Step Indicator */}
        <div className="pt-2.5 pb-3 px-4 border-b border-slate-200 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-2.5" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-700" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Toplu Ders İşle</h2>
                <p className="text-xs text-slate-500">
                  Adım {step}/3 •{' '}
                  {step === 1
                    ? 'Ders & Başlık Seçimi'
                    : step === 2
                      ? 'Öğrenciler & Puan'
                      : 'Özet & Onay'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 rounded-full transition-colors ${
                  step >= n ? 'bg-emerald-700' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 overflow-y-auto flex-1 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ders</label>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => {
                        setSubjectName(subj);
                        setSelectedTitles([]);
                      }}
                      className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                        subjectName === subj
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Sayfa / Sure / Başlıklar (Çoklu)
                  </label>
                  {selectedTitles.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[11px] font-semibold tabular-nums">
                      {selectedTitles.length} Başlık Seçildi
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder="Konu veya sure ara..."
                  className="w-full min-h-[42px] px-3 mb-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-600"
                />

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {filteredTopics.map((item) => {
                    const checked = selectedTitles.includes(item.title);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleTitle(item.title)}
                        className="w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 cursor-pointer"
                      >
                        <span
                          className={`text-sm ${
                            checked ? 'font-semibold text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${
                            checked
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                  {filteredTopics.length === 0 && (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Başlık bulunamadı, aşağıdan manuel ekleyebilirsiniz.
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Özel başlık/sayfa ekle..."
                    className="flex-1 min-h-[42px] px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={addCustom}
                    className="min-h-[42px] px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Ekle
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Varsayılan Miktar
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full min-h-[42px] px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Varsayılan Tur
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={turCount}
                    onChange={(e) => setTurCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full min-h-[42px] px-3 text-sm tabular-nums bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={selectAllPresent}
                  className="min-h-[40px] px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  Tüm Gelenleri Seç
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="min-h-[40px] px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Temizle ({selectedStudents.length})
                </button>
              </div>

              <div className="space-y-2">
                {students.map((s) => {
                  const cfg = rows[s.id];
                  if (!cfg) return null;
                  const att = resolveStudentCardAttendance(attendanceLookup, s.id);

                  return (
                    <div
                      key={s.id}
                      className={`rounded-xl border p-3 transition-colors ${
                        att.cardDimmed && !cfg.selected
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : cfg.selected
                            ? 'bg-emerald-50/35 border-emerald-300'
                            : 'bg-white border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setRows((prev) => ({
                            ...prev,
                            [s.id]: { ...prev[s.id], selected: !prev[s.id].selected },
                          }))
                        }
                        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {s.fullName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-500">
                              {classMap.get(s.classId) ?? ''}
                            </span>
                            {att.cardDimmed && att.cardStatus && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  att.cardStatus === 'Kurstan İzinsiz Çıktı'
                                    ? 'bg-slate-900 text-white'
                                    : att.cardStatus === 'Gelmedi'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-sky-600 text-white'
                                }`}
                              >
                                {att.cardStatus}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${
                            cfg.selected
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {cfg.selected && <Check className="w-4 h-4" strokeWidth={3} />}
                        </span>
                      </button>

                      {cfg.selected && (
                        <div className="mt-2.5 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            {QUICK_BULK_SCORES.map((sc) => (
                              <button
                                key={sc}
                                type="button"
                                onClick={() =>
                                  setRows((prev) => ({
                                    ...prev,
                                    [s.id]: { ...prev[s.id], score: sc },
                                  }))
                                }
                                className={`h-8 px-2 rounded-lg text-xs font-bold tabular-nums border cursor-pointer ${
                                  cfg.score === sc
                                    ? 'bg-emerald-700 text-white border-emerald-700'
                                    : 'bg-white text-slate-700 border-slate-200'
                                }`}
                              >
                                {sc}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1">
                            {(['Geçti', 'Tekrar'] as LessonResultStatus[]).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  setRows((prev) => ({
                                    ...prev,
                                    [s.id]: { ...prev[s.id], status: st },
                                  }))
                                }
                                className={`h-8 px-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                                  cfg.status === st
                                    ? st === 'Geçti'
                                      ? 'bg-emerald-700 text-white border-emerald-700'
                                      : 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-white text-slate-600 border-slate-200'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                <div className="text-sm font-bold text-emerald-950">Kayıt Özeti</div>
                <div className="text-xs text-slate-700 space-y-1">
                  <div>
                    <span className="font-semibold">Tarih:</span> {date}
                  </div>
                  <div>
                    <span className="font-semibold">Ders:</span> {subjectName}
                  </div>
                  <div>
                    <span className="font-semibold">Başlıklar:</span>{' '}
                    {selectedTitles.length > 0 ? selectedTitles.join(', ') : subjectName}
                  </div>
                  <div>
                    <span className="font-semibold">Seçili Öğrenci:</span>{' '}
                    <span className="tabular-nums font-bold text-emerald-800">
                      {selectedStudents.length} öğrenci
                    </span>
                  </div>
                </div>
                {selectedTitles.length > 1 && (
                  <p className="text-[11px] text-emerald-800 bg-white/80 rounded-lg px-2.5 py-1.5 border border-emerald-200">
                    {selectedTitles.length} başlık aynı birleşik oturum kimliğiyle kaydedilir; Cuma
                    izni ve oturum analizlerinde 1 ders oturumu olarak sayılır.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step Navigation Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-2 shrink-0 pb-safe">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              className="min-h-[46px] px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Geri
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 cursor-pointer"
            >
              Vazgeç
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              disabled={step === 2 && selectedStudents.length === 0}
              className="min-h-[46px] px-5 rounded-xl bg-emerald-700 text-white text-sm font-bold inline-flex items-center gap-1 hover:bg-emerald-800 disabled:opacity-45 cursor-pointer"
            >
              İleri
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={selectedStudents.length === 0}
              className="min-h-[46px] px-6 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 disabled:opacity-45 cursor-pointer"
            >
              Kaydet ({selectedStudents.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

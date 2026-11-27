import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Layers, Plus, Users, X } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import type {
  AttendanceRecord,
  AttendanceStatus,
  LessonResultStatus,
  Student,
  TopicPoolItem,
} from '../../types';
import type { LessonUpsertInput } from '../../store/academicMutations';
import { createId } from '../../utils/id';
import { resolveStudentCardAttendance } from '../../utils/lessonScheduleResolver';
import { SUBJECT_PRESETS } from '../curriculum/curriculumConstants';
import { TurCounterCell } from './TurCounterCell';
import { lessonStatusToEvaluation } from './LessonConfirmModals';

interface BulkLessonModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  students: Student[];
  classMap: Map<string, string>;
  topicPool: TopicPoolItem[];
  attendanceLookup: Map<string, AttendanceRecord>;
  onCommitBatch: (inputs: LessonUpsertInput[], summaryMessage: string) => void;
}

interface StudentBulkEntry {
  selected: boolean;
  score: string;
  amount: string;
  turCount: number;
  status: LessonResultStatus;
}

const BULK_SUBJECTS = SUBJECT_PRESETS.filter(
  (s) => s.toLocaleLowerCase('tr-TR') !== 'mütalaa'
);

function renderAbsenceWarning(status: AttendanceStatus) {
  if (status === 'Kurstan İzinsiz Çıktı') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-white">
        Kurstan İzinsiz Çıktı
      </span>
    );
  }
  if (status === 'Gelmedi') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-600 text-white">
        Gelmedi
      </span>
    );
  }
  if (status === 'İzinli') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-600 text-white">
        İzinli
      </span>
    );
  }
  return null;
}

export const BulkLessonModal: React.FC<BulkLessonModalProps> = ({
  open,
  onClose,
  date,
  students,
  classMap,
  topicPool,
  attendanceLookup,
  onCommitBatch,
}) => {
  const [subjectName, setSubjectName] = useState<string>('Talim Tecvid');
  const [commonTopic, setCommonTopic] = useState<string>('');
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [defaultAmount, setDefaultAmount] = useState('1 Başlık');
  const [defaultScore, setDefaultScore] = useState('90');
  const [defaultStatus, setDefaultStatus] = useState<LessonResultStatus>('Geçti');
  const [entries, setEntries] = useState<Record<string, StudentBulkEntry>>({});

  // Initialize student selection states whenever modal opens
  useEffect(() => {
    if (!open) return;
    const initial: Record<string, StudentBulkEntry> = {};
    for (const s of students) {
      const cardAtt = resolveStudentCardAttendance(attendanceLookup, s.id);
      initial[s.id] = {
        selected: !cardAtt.cardDimmed,
        score: '90',
        amount: '1 Ders',
        turCount: 1,
        status: 'Geçti',
      };
    }
    setEntries(initial);
    setSelectedTitles([]);
    setCustomTitle('');
    setCommonTopic('');
    setTopicSearch('');
    setDropdownOpen(false);
  }, [open, students, attendanceLookup]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [dropdownOpen]);

  const subjectTopics = useMemo(() => {
    const normSubj = subjectName.trim().toLocaleLowerCase('tr-TR');
    const q = topicSearch.trim().toLocaleLowerCase('tr-TR');
    return topicPool.filter((t) => {
      if (!t.isActive) return false;
      if (t.category.toLocaleLowerCase('tr-TR') !== normSubj) return false;
      if (!q) return true;
      return (
        t.title.toLocaleLowerCase('tr-TR').includes(q) ||
        (t.subGroup ?? '').toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [topicPool, subjectName, topicSearch]);

  const toggleTitle = (title: string) => {
    setSelectedTitles((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]
    );
  };

  const handleAddCustomTitle = () => {
    const clean = customTitle.trim();
    if (!clean) return;
    if (!selectedTitles.includes(clean)) {
      setSelectedTitles((prev) => [...prev, clean]);
    }
    setCustomTitle('');
  };

  const updateStudentEntry = (studentId: string, patch: Partial<StudentBulkEntry>) => {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...patch },
    }));
  };

  const selectAllPresent = () => {
    setEntries((prev) => {
      const next = { ...prev };
      for (const s of students) {
        const cardAtt = resolveStudentCardAttendance(attendanceLookup, s.id);
        next[s.id] = { ...next[s.id], selected: !cardAtt.cardDimmed };
      }
      return next;
    });
  };

  const clearSelection = () => {
    setEntries((prev) => {
      const next = { ...prev };
      for (const s of students) {
        next[s.id] = { ...next[s.id], selected: false };
      }
      return next;
    });
  };

  const applyDefaultsToSelected = () => {
    setEntries((prev) => {
      const next = { ...prev };
      for (const s of students) {
        if (next[s.id]?.selected) {
          next[s.id] = {
            ...next[s.id],
            amount: defaultAmount,
            score: defaultScore,
            status: defaultStatus,
          };
        }
      }
      return next;
    });
  };

  const selectedStudents = useMemo(
    () => students.filter((s) => entries[s.id]?.selected),
    [students, entries]
  );

  const handleSave = () => {
    if (selectedStudents.length === 0) return;

    const titlesToCreate =
      selectedTitles.length > 0
        ? selectedTitles
        : [commonTopic.trim() || subjectName];

    const isCombined = titlesToCreate.length > 1;
    const sharedSessionId = isCombined ? createId('comb') : undefined;
    const batchInputs: LessonUpsertInput[] = [];

    for (const student of selectedStudents) {
      const row = entries[student.id];
      const parsedScore =
        row.score.trim() === '' ? undefined : Math.max(0, Math.min(100, Number(row.score)));
      const validScore =
        typeof parsedScore === 'number' && !Number.isNaN(parsedScore) ? parsedScore : undefined;

      for (const title of titlesToCreate) {
        batchInputs.push({
          date,
          studentId: student.id,
          classId: student.classId,
          subjectName,
          topicTitle: commonTopic.trim() || subjectName,
          pageOrVerse: title,
          amount: row.amount.trim() || undefined,
          score: validScore,
          status: row.status,
          evaluation: lessonStatusToEvaluation(row.status, validScore),
          turCount: Math.max(1, row.turCount || 1),
          combinedSessionId: sharedSessionId,
        });
      }
    }

    const summary = isCombined
      ? `${selectedStudents.length} öğrenci için ${titlesToCreate.length} başlık tek oturum (birleşik) olarak kaydedildi.`
      : `${selectedStudents.length} öğrenci için toplu ders kaydı oluşturuldu.`;

    onCommitBatch(batchInputs, summary);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Toplu Çoklu Ders Girişi"
      subtitle={`${date} • Aynı derste birden fazla başlığı/sureyi tek seferde işleyin`}
      maxWidthClass="max-w-4xl"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="text-xs text-slate-600 tabular-nums">
            <span className="font-semibold text-slate-900">{selectedStudents.length}</span> öğrenci
            {selectedTitles.length > 1 && (
              <>
                {' '}•{' '}
                <span className="font-semibold text-emerald-700">
                  {selectedTitles.length} başlık (tek birleşik oturum)
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={selectedStudents.length === 0}
              className="min-h-[40px] px-5 rounded-lg bg-emerald-700 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Toplu Kaydet
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Step 1: Subject + Multi-Select Checkbox Dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ders</label>
            <select
              value={subjectName}
              onChange={(e) => {
                setSubjectName(e.target.value);
                setSelectedTitles([]);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              {BULK_SUBJECTS.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6 relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ortak Sayfa / Sure / Başlıklar (Çoklu Seçim)
            </label>
            <button
              type="button"
              onClick={() => setDropdownOpen((p) => !p)}
              className="w-full min-h-[40px] px-3 text-sm bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-left hover:border-emerald-500 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 min-w-0 truncate">
                <Layers className="w-4 h-4 text-emerald-700 shrink-0" />
                {selectedTitles.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-white text-xs font-semibold tabular-nums">
                      {selectedTitles.length} Başlık Seçildi
                    </span>
                    <span className="text-xs text-slate-500 truncate">
                      {selectedTitles.slice(0, 2).join(', ')}
                      {selectedTitles.length > 2 ? '...' : ''}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-400">Müfredat havuzundan çoklu seçim yapın...</span>
                )}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2.5 space-y-2">
                <input
                  type="text"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder="Başlık veya sure ara..."
                  className="w-full h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
                />
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {subjectTopics.map((item) => {
                    const checked = selectedTitles.includes(item.title);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleTitle(item.title)}
                        className="w-full px-2.5 py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 text-xs transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className={checked ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                            {item.title}
                          </div>
                          {item.subGroup && (
                            <div className="text-[11px] text-slate-400">{item.subGroup}</div>
                          )}
                        </div>
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                            checked
                              ? 'bg-emerald-700 border-emerald-700 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                  {subjectTopics.length === 0 && (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Eşleşen müfredat başlığı bulunamadı.
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTitle();
                      }
                    }}
                    placeholder="Özel sayfa/başlık ekle (ör. 561-563)..."
                    className="flex-1 h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTitle}
                    className="h-8 px-2.5 rounded-md bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ekle
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ortak Konu (Opsiyonel)
            </label>
            <input
              type="text"
              value={commonTopic}
              onChange={(e) => setCommonTopic(e.target.value)}
              placeholder={subjectName}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {selectedTitles.length > 0 && (
            <div className="md:col-span-12 flex flex-wrap items-center gap-1.5 pt-1">
              {selectedTitles.map((title) => (
                <span
                  key={title}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900"
                >
                  {title}
                  <button
                    type="button"
                    onClick={() => toggleTitle(title)}
                    aria-label={`${title} kaldır`}
                    className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quick defaults bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllPresent}
              className="h-8 px-2.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium hover:bg-emerald-100 inline-flex items-center gap-1 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              Gelenleri Seç
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="h-8 px-2.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium hover:bg-slate-100 cursor-pointer"
            >
              Temizle
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={defaultAmount}
              onChange={(e) => setDefaultAmount(e.target.value)}
              placeholder="Miktar"
              className="w-24 h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={defaultScore}
              onChange={(e) => setDefaultScore(e.target.value)}
              placeholder="Puan"
              className="w-16 h-8 px-2 text-xs text-center tabular-nums bg-slate-50 border border-slate-200 rounded-md"
            />
            <select
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value as LessonResultStatus)}
              className="h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md cursor-pointer"
            >
              <option value="Geçti">Geçti</option>
              <option value="Tekrar">Tekrar</option>
              <option value="Vermedi">Vermedi</option>
            </select>
            <button
              type="button"
              onClick={applyDefaultsToSelected}
              className="h-8 px-3 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 cursor-pointer"
            >
              Seçililere Uygula
            </button>
          </div>
        </div>

        {/* Student table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="max-h-[340px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 pl-3 pr-2 w-10">Seç</th>
                  <th className="py-2.5 px-2">Öğrenci</th>
                  <th className="py-2.5 px-2 w-24">Miktar</th>
                  <th className="py-2.5 px-2 w-24">Tur</th>
                  <th className="py-2.5 px-2 w-20">Puan</th>
                  <th className="py-2.5 px-2 pr-3 w-32">Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const row = entries[student.id];
                  if (!row) return null;
                  const cardAtt = resolveStudentCardAttendance(attendanceLookup, student.id);
                  const isAbsent = cardAtt.cardDimmed;

                  return (
                    <tr
                      key={student.id}
                      className={`transition-colors ${
                        isAbsent && !row.selected
                          ? 'bg-slate-50/80 opacity-60'
                          : row.selected
                            ? 'bg-emerald-50/25'
                            : 'bg-white'
                      }`}
                    >
                      <td className="py-2 pl-3 pr-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) =>
                            updateStudentEntry(student.id, { selected: e.target.checked })
                          }
                          aria-label={`${student.fullName} seç`}
                          className="w-4 h-4 rounded accent-emerald-700 cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-900">
                            {student.fullName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {classMap.get(student.classId) ?? ''}
                          </span>
                          {isAbsent && cardAtt.cardStatus && renderAbsenceWarning(cardAtt.cardStatus)}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={row.amount}
                          disabled={!row.selected}
                          onChange={(e) =>
                            updateStudentEntry(student.id, { amount: e.target.value })
                          }
                          className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <TurCounterCell
                          value={row.turCount}
                          disabled={!row.selected}
                          onChange={(next) => updateStudentEntry(student.id, { turCount: next })}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={row.score}
                          disabled={!row.selected}
                          onChange={(e) =>
                            updateStudentEntry(student.id, { score: e.target.value })
                          }
                          className="w-full h-8 px-2 text-xs text-center tabular-nums bg-white border border-slate-200 rounded-md disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                      <td className="py-2 px-2 pr-3">
                        <select
                          value={row.status}
                          disabled={!row.selected}
                          onChange={(e) =>
                            updateStudentEntry(student.id, {
                              status: e.target.value as LessonResultStatus,
                            })
                          }
                          className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                        >
                          <option value="Geçti">Geçti</option>
                          <option value="Tekrar">Tekrar</option>
                          <option value="Vermedi">Vermedi</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};

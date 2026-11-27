import React, { useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, Check, RefreshCw, Trash2 } from 'lucide-react';
import type {
  AttendanceStatus,
  LessonRecord,
  LessonResultStatus,
  Student,
  TopicPoolItem,
} from '../../types';
import {
  findExactDuplicateLesson,
  type DuplicateMatchInfo,
} from '../../utils/duplicateAndMakeupEngine';
import {
  inferLessonStatus,
  inferLessonSubject,
  type RowAttendanceInfo,
} from '../../utils/lessonScheduleResolver';
import { SUBJECT_PRESETS } from '../curriculum/curriculumConstants';
import { TurCounterCell } from './TurCounterCell';
import { lessonStatusToEvaluation, type PendingLessonRequest } from './LessonConfirmModals';

export interface InlineLessonRowProps {
  student: Student;
  date: string;
  initialSubjectName: string;
  defaultTopic?: string;
  lessonSlotId?: string;
  existingRecord?: LessonRecord;
  isExtraDraft?: boolean;
  allLessons: LessonRecord[];
  topicPool: TopicPoolItem[];
  rowAttendance: RowAttendanceInfo;
  cardDimmed: boolean;
  isFirstRowOfStudent: boolean;
  studentRowSpan: number;
  studentCellNode?: React.ReactNode;
  levelCellNode?: React.ReactNode;
  onRequestSave: (request: PendingLessonRequest) => void;
  onDeleteSaved: (lessonId: string) => void;
  onRemoveExtraDraft?: () => void;
}

const LESSON_SUBJECT_OPTIONS = SUBJECT_PRESETS.filter(
  (s) => s.toLocaleLowerCase('tr-TR') !== 'mütalaa'
);

function renderRowAttendanceBadge(status: AttendanceStatus) {
  if (status === 'Kurstan İzinsiz Çıktı') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-white leading-tight">
        Kurstan İzinsiz Çıktı
      </span>
    );
  }
  if (status === 'Derse Girmedi') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 leading-tight">
        Derse Girmedi
      </span>
    );
  }
  if (status === 'İzinli') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200 leading-tight">
        İzinli
      </span>
    );
  }
  if (status === 'Gelmedi') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200 leading-tight">
        Gelmedi
      </span>
    );
  }
  return null;
}

const STATUS_SELECT_STYLE: Record<'' | LessonResultStatus, string> = {
  '': 'bg-slate-50 border-slate-200 text-slate-500',
  Geçti: 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold',
  Tekrar: 'bg-amber-50 border-amber-300 text-amber-800 font-semibold',
  Vermedi: 'bg-red-50 border-red-300 text-red-800 font-semibold',
};

export const InlineLessonRow: React.FC<InlineLessonRowProps> = React.memo(
  ({
    student,
    date,
    initialSubjectName,
    defaultTopic = '',
    lessonSlotId,
    existingRecord,
    isExtraDraft = false,
    allLessons,
    topicPool,
    rowAttendance,
    cardDimmed,
    isFirstRowOfStudent,
    studentRowSpan,
    studentCellNode,
    levelCellNode,
    onRequestSave,
    onDeleteSaved,
    onRemoveExtraDraft,
  }) => {
    const datalistId = useId();

    const [subjectName, setSubjectName] = useState<string>(
      existingRecord ? inferLessonSubject(existingRecord) : initialSubjectName
    );
    const [topicTitle, setTopicTitle] = useState<string>(
      existingRecord?.topicTitle ?? defaultTopic
    );
    const [pageOrVerse, setPageOrVerse] = useState<string>(existingRecord?.pageOrVerse ?? '');
    const [amount, setAmount] = useState<string>(existingRecord?.amount ?? '');
    const [turCount, setTurCount] = useState<number>(existingRecord?.turCount ?? 1);
    const [scoreStr, setScoreStr] = useState<string>(
      typeof existingRecord?.score === 'number' ? String(existingRecord.score) : ''
    );
    const [status, setStatus] = useState<'' | LessonResultStatus>(
      existingRecord ? inferLessonStatus(existingRecord) : ''
    );
    const [dirty, setDirty] = useState(false);

    // Sync local inputs whenever the underlying saved record or date changes
    useEffect(() => {
      if (existingRecord) {
        setSubjectName(inferLessonSubject(existingRecord));
        setTopicTitle(existingRecord.topicTitle ?? '');
        setPageOrVerse(existingRecord.pageOrVerse ?? '');
        setAmount(existingRecord.amount ?? '');
        setTurCount(existingRecord.turCount ?? 1);
        setScoreStr(typeof existingRecord.score === 'number' ? String(existingRecord.score) : '');
        setStatus(inferLessonStatus(existingRecord));
        setDirty(false);
      } else {
        setSubjectName(initialSubjectName);
        setTopicTitle(defaultTopic);
        setPageOrVerse('');
        setAmount('');
        setTurCount(1);
        setScoreStr('');
        setStatus('');
        setDirty(false);
      }
    }, [existingRecord, initialSubjectName, defaultTopic, date]);

    const subjectOptions = useMemo(() => {
      if (LESSON_SUBJECT_OPTIONS.includes(subjectName)) return LESSON_SUBJECT_OPTIONS;
      return [subjectName, ...LESSON_SUBJECT_OPTIONS];
    }, [subjectName]);

    const topicSuggestions = useMemo(() => {
      const normSubj = subjectName.trim().toLocaleLowerCase('tr-TR');
      return topicPool
        .filter((t) => t.isActive && t.category.toLocaleLowerCase('tr-TR') === normSubj)
        .slice(0, 60);
    }, [topicPool, subjectName]);

    const duplicateMatch: DuplicateMatchInfo | null = useMemo(
      () =>
        findExactDuplicateLesson(
          allLessons,
          student.id,
          pageOrVerse,
          existingRecord?.id,
          existingRecord?.makeupOfId
        ),
      [allLessons, student.id, pageOrVerse, existingRecord?.id, existingRecord?.makeupOfId]
    );

    const isDimmed = rowAttendance.rowDimmed && !existingRecord && !status;
    const dimClass = isDimmed ? 'opacity-50' : '';

    const triggerSave = (overrides?: {
      subjectName?: string;
      topicTitle?: string;
      pageOrVerse?: string;
      amount?: string;
      turCount?: number;
      scoreStr?: string;
      status?: '' | LessonResultStatus;
    }) => {
      const nextSubj = overrides?.subjectName ?? subjectName;
      const nextTopic = overrides?.topicTitle ?? topicTitle;
      const nextPage = overrides?.pageOrVerse ?? pageOrVerse;
      const nextAmount = overrides?.amount ?? amount;
      const nextTur = overrides?.turCount ?? turCount;
      const nextScoreStr = overrides?.scoreStr ?? scoreStr;
      const nextStatus = overrides?.status ?? status;

      // Never persist completely neutral/empty draft rows
      if (!nextStatus) return;

      const parsedScore =
        nextScoreStr.trim() === ''
          ? undefined
          : Math.max(0, Math.min(100, Number(nextScoreStr)));
      const validScore =
        typeof parsedScore === 'number' && !Number.isNaN(parsedScore) ? parsedScore : undefined;

      onRequestSave({
        studentName: student.fullName,
        input: {
          id: existingRecord?.id,
          date,
          studentId: student.id,
          classId: student.classId,
          lessonSlotId: existingRecord?.lessonSlotId ?? lessonSlotId,
          subjectName: nextSubj,
          topicTitle: nextTopic.trim() || nextSubj,
          pageOrVerse: nextPage.trim() || undefined,
          amount: nextAmount.trim() || undefined,
          score: validScore,
          status: nextStatus,
          evaluation: lessonStatusToEvaluation(nextStatus, validScore),
          turCount: Math.max(1, nextTur),
          makeupOfId: existingRecord?.makeupOfId,
          combinedSessionId: existingRecord?.combinedSessionId,
          isAutoGenerated: false,
          note: existingRecord?.note,
        },
        onCommitted: () => setDirty(false),
      });
    };

    const handleStatusChange = (nextVal: '' | LessonResultStatus) => {
      setStatus(nextVal);
      if (!nextVal) {
        if (existingRecord) {
          onDeleteSaved(existingRecord.id);
        }
        setDirty(false);
        return;
      }
      setDirty(true);
      triggerSave({ status: nextVal });
    };

    const handleTurChange = (nextTur: number) => {
      setTurCount(nextTur);
      if (status) {
        setDirty(true);
        triggerSave({ turCount: nextTur });
      }
    };

    const handleFieldBlur = () => {
      if (dirty && status) {
        triggerSave();
      }
    };

    const showSlotBadge =
      !cardDimmed && rowAttendance.rowDimmed && rowAttendance.rowBadgeStatus;

    return (
      <tr
        className={`border-b border-slate-100 last:border-b-0 transition-colors ${
          existingRecord ? 'bg-white' : 'bg-white hover:bg-slate-50/70'
        }`}
      >
        {isFirstRowOfStudent && (
          <>
            <td
              rowSpan={studentRowSpan}
              className={`px-3 py-2.5 align-top border-r border-slate-100 bg-white w-[180px] min-w-[168px] ${
                cardDimmed ? 'opacity-55 bg-slate-50/60' : ''
              }`}
            >
              {studentCellNode}
            </td>
            <td
              rowSpan={studentRowSpan}
              className={`px-2.5 py-2.5 align-top border-r border-slate-100 bg-white w-[142px] min-w-[132px] ${
                cardDimmed ? 'opacity-55 bg-slate-50/60' : ''
              }`}
            >
              {levelCellNode}
            </td>
          </>
        )}

        {/* Ders */}
        <td className={`px-2 py-2 align-top w-[124px] min-w-[118px] ${dimClass}`}>
          <div className="flex flex-col items-start gap-1">
            <select
              value={subjectName}
              onChange={(e) => {
                setSubjectName(e.target.value);
                setDirty(true);
              }}
              onBlur={handleFieldBlur}
              aria-label="Ders"
              className="w-full h-8 px-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-600 cursor-pointer"
            >
              {subjectOptions.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
            {showSlotBadge && renderRowAttendanceBadge(rowAttendance.rowBadgeStatus!)}
            {rowAttendance.partialWarning && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 leading-tight">
                {rowAttendance.partialWarning}
              </span>
            )}
          </div>
        </td>

        {/* Konu */}
        <td className={`px-2 py-2 align-top min-w-[116px] ${dimClass}`}>
          <input
            type="text"
            value={topicTitle}
            onChange={(e) => {
              setTopicTitle(e.target.value);
              setDirty(true);
            }}
            onBlur={handleFieldBlur}
            placeholder="Konu..."
            aria-label="Konu"
            className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600"
          />
        </td>

        {/* Sayfa / Sure — ALWAYS full-width input with duplicate badge BELOW */}
        <td className={`px-2 py-2 align-top min-w-[162px] ${dimClass}`}>
          <div className="flex flex-col items-start gap-1">
            <input
              type="text"
              list={datalistId}
              value={pageOrVerse}
              onChange={(e) => {
                setPageOrVerse(e.target.value);
                setDirty(true);
              }}
              onBlur={handleFieldBlur}
              placeholder="Sayfa veya Sure..."
              aria-label="Sayfa veya Sure"
              className={`w-full h-8 px-2 text-xs bg-slate-50 border rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-colors ${
                duplicateMatch
                  ? 'border-amber-400 focus:border-amber-500 bg-amber-50/40'
                  : 'border-slate-200 focus:border-emerald-600'
              }`}
            />
            <datalist id={datalistId}>
              {topicSuggestions.map((t) => (
                <option key={t.id} value={t.title} />
              ))}
            </datalist>

            {duplicateMatch && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-[10px] font-medium text-amber-800 leading-tight tabular-nums"
                title={`Önceki kayıt: ${duplicateMatch.fullDate}${duplicateMatch.recordedTime ? ' ' + duplicateMatch.recordedTime : ''} (${duplicateMatch.status})`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Tekrar: {duplicateMatch.badgeText}</span>
              </span>
            )}

            {existingRecord?.makeupOfId && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-medium text-emerald-700 leading-tight">
                <RefreshCw className="w-2.5 h-2.5 shrink-0" />
                <span>Telafi</span>
              </span>
            )}
          </div>
        </td>

        {/* Miktar */}
        <td className={`px-2 py-2 align-top w-[92px] min-w-[86px] ${dimClass}`}>
          <input
            type="text"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setDirty(true);
            }}
            onBlur={handleFieldBlur}
            placeholder="1 Sayfa"
            aria-label="Miktar"
            className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600"
          />
        </td>

        {/* Tur */}
        <td className={`px-2 py-2 align-top w-[84px] ${dimClass}`}>
          <TurCounterCell value={turCount} onChange={handleTurChange} size="sm" />
        </td>

        {/* Puan */}
        <td className={`px-2 py-2 align-top w-[72px] ${dimClass}`}>
          <input
            type="number"
            min={0}
            max={100}
            value={scoreStr}
            onChange={(e) => {
              setScoreStr(e.target.value);
              setDirty(true);
            }}
            onBlur={handleFieldBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && status) triggerSave();
            }}
            placeholder="—"
            aria-label="Puan"
            className="w-full h-8 px-2 text-xs text-center tabular-nums bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600"
          />
        </td>

        {/* Durumu */}
        <td className={`px-2 py-2 align-top w-[122px] min-w-[116px] ${dimClass}`}>
          <div className="flex flex-col items-start gap-1">
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as '' | LessonResultStatus)}
              aria-label="Ders Durumu"
              className={`w-full h-8 px-2 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition-colors cursor-pointer ${STATUS_SELECT_STYLE[status]}`}
            >
              <option value="">— Girilmedi —</option>
              <option value="Geçti">Geçti</option>
              <option value="Tekrar">Tekrar</option>
              <option value="Vermedi">Vermedi</option>
            </select>
            {existingRecord?.isAutoGenerated && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-semibold text-slate-600 leading-none"
                title="Otomatik Ezber Vermedi kaydı — durumu değiştirerek güncelleyebilirsiniz"
              >
                Oto
              </span>
            )}
          </div>
        </td>

        {/* Tarih & İşlem */}
        <td className={`px-2 py-2 align-top w-[86px] ${dimClass}`}>
          <div className="flex items-center justify-end gap-1 h-8">
            {existingRecord?.recordedTime && (
              <span
                className="text-[11px] text-slate-400 tabular-nums mr-0.5"
                title={`Kayıt saati: ${existingRecord.recordedTime}`}
              >
                {existingRecord.recordedTime}
              </span>
            )}
            {dirty && status && (
              <button
                type="button"
                onClick={() => triggerSave()}
                title="Değişikliği kaydet"
                aria-label="Kaydet"
                className="w-7 h-7 rounded-md bg-emerald-700 text-white hover:bg-emerald-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            {existingRecord ? (
              <button
                type="button"
                onClick={() => onDeleteSaved(existingRecord.id)}
                title="Ders kaydını sil"
                aria-label="Sil"
                className="w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : isExtraDraft && onRemoveExtraDraft ? (
              <button
                type="button"
                onClick={onRemoveExtraDraft}
                title="Ek satırı kaldır"
                aria-label="Ek satırı kaldır"
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </td>
      </tr>
    );
  }
);

InlineLessonRow.displayName = 'InlineLessonRow';

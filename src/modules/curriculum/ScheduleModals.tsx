import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import type {
  DayOfWeek,
  LessonRequirementType,
  LessonSlot,
  ScheduleEntry,
  Teacher,
  TopicPoolItem,
} from '../../types';
import { createId } from '../../utils/id';
import { DAYS_OF_WEEK, getDayLabel, SUBJECT_PRESETS } from './curriculumConstants';

interface ScheduleCellModalProps {
  open: boolean;
  termId: string;
  classId: string;
  classLabel: string;
  dayOfWeek: DayOfWeek;
  slot: LessonSlot | null;
  existingEntry: ScheduleEntry | null;
  teachers: Teacher[];
  topicPool: TopicPoolItem[];
  onClose: () => void;
  onSave: (entry: ScheduleEntry) => void;
  onDelete: (entryId: string) => void;
}

export const ScheduleCellModal: React.FC<ScheduleCellModalProps> = ({
  open,
  termId,
  classId,
  classLabel,
  dayOfWeek,
  slot,
  existingEntry,
  teachers,
  topicPool,
  onClose,
  onSave,
  onDelete,
}) => {
  const [subjectName, setSubjectName] = useState('Yüzüne');
  const [defaultTopic, setDefaultTopic] = useState('');
  const [requirement, setRequirement] = useState<LessonRequirementType>('zorunlu');
  const [teacherId, setTeacherId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open || !slot) return;
    if (existingEntry) {
      setSubjectName(existingEntry.subjectName);
      setDefaultTopic(existingEntry.defaultTopic ?? '');
      setRequirement(existingEntry.requirement ?? slot.requirement);
      setTeacherId(existingEntry.teacherId ?? '');
      setNotes(existingEntry.notes ?? '');
    } else {
      setSubjectName(slot.category === 'etut' ? 'Mütalaa' : 'Yüzüne');
      setDefaultTopic('');
      setRequirement(slot.requirement);
      setTeacherId('');
      setNotes('');
    }
  }, [open, slot, existingEntry]);

  const matchingTopics = useMemo(() => {
    const lower = subjectName.toLocaleLowerCase('tr-TR');
    return topicPool.filter(
      (t) => t.isActive && t.category.toLocaleLowerCase('tr-TR') === lower
    );
  }, [topicPool, subjectName]);

  if (!slot) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;
    onSave({
      id: existingEntry?.id ?? createId('sch'),
      termId,
      classId,
      dayOfWeek,
      lessonSlotId: slot.id,
      subjectName: subjectName.trim(),
      defaultTopic: defaultTopic.trim() || undefined,
      requirement,
      teacherId: teacherId || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${getDayLabel(dayOfWeek)} · ${slot.name}`}
      subtitle={`${classLabel} · ${slot.startTime}–${slot.endTime} (${slot.category === 'etut' ? 'Etüt / Mütalaa' : 'Normal Ders'})`}
      maxWidthClass="max-w-lg"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          {existingEntry ? (
            <button
              type="button"
              onClick={() => onDelete(existingEntry.id)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hücreyi Temizle
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              form="schedule-cell-form"
              className="min-h-[40px] px-4 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              Kaydet
            </button>
          </div>
        </div>
      }
    >
      <form id="schedule-cell-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Ders Adı *</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SUBJECT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSubjectName(preset)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                  subjectName === preset
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            type="text"
            required
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="Ders adı yazın veya yukarıdan seçin"
            className="w-full min-h-[40px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Varsayılan Konu / İçerik
          </label>
          <input
            type="text"
            list="schedule-topic-suggestions"
            value={defaultTopic}
            onChange={(e) => setDefaultTopic(e.target.value)}
            placeholder="Örn: Amme Cüzü, Mahreçler, Namaz Sureleri..."
            className="w-full min-h-[40px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
          />
          <datalist id="schedule-topic-suggestions">
            {matchingTopics.map((t) => (
              <option key={t.id} value={t.title} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Zorunlu / Seçmeli
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRequirement('zorunlu')}
                className={`min-h-[40px] text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  requirement === 'zorunlu'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Zorunlu
              </button>
              <button
                type="button"
                onClick={() => setRequirement('secmeli')}
                className={`min-h-[40px] text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  requirement === 'secmeli'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Seçmeli
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Ders Hocası (İsteğe Bağlı)
            </label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full min-h-[40px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            >
              <option value="">Sınıf Hocası (Varsayılan)</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Kısa Not</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="İsteğe bağlı ders notu..."
            className="w-full min-h-[40px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
          />
        </div>
      </form>
    </Modal>
  );
};

interface CopyDayModalProps {
  open: boolean;
  classLabel: string;
  onClose: () => void;
  onConfirm: (fromDay: DayOfWeek, toDays: DayOfWeek[]) => void;
}

export const CopyDayModal: React.FC<CopyDayModalProps> = ({
  open,
  classLabel,
  onClose,
  onConfirm,
}) => {
  const [fromDay, setFromDay] = useState<DayOfWeek>(1);
  const [toDays, setToDays] = useState<DayOfWeek[]>([2, 3, 4, 5]);

  const toggleTarget = (day: DayOfWeek) => {
    setToDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Günlük Programı Kopyala"
      subtitle={`${classLabel} için seçtiğiniz günün tüm derslerini diğer günlere çoğaltın.`}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg cursor-pointer"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={toDays.filter((d) => d !== fromDay).length === 0}
            onClick={() => {
              onConfirm(
                fromDay,
                toDays.filter((d) => d !== fromDay)
              );
              onClose();
            }}
            className="min-h-[40px] px-4 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg cursor-pointer"
          >
            Programı Kopyala
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Kaynak Gün</label>
          <select
            value={fromDay}
            onChange={(e) => setFromDay(Number(e.target.value) as DayOfWeek)}
            className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
          >
            {DAYS_OF_WEEK.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">
            Hedef Günler (Üzerine Yazılır)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DAYS_OF_WEEK.filter((d) => d.value !== fromDay).map((d) => {
              const checked = toDays.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleTarget(d.value)}
                  className={`min-h-[40px] px-3 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                    checked
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import type { ClassGroup, ExamDefinition, ExamType } from '../../types';
import type { ExamUpsertInput } from '../../store/phase4Mutations';
import { getTodayISO } from '../../utils/id';
import { SUBJECT_PRESETS } from '../curriculum/curriculumConstants';

interface ExamFormModalProps {
  open: boolean;
  onClose: () => void;
  termId: string;
  classes: ClassGroup[];
  editingExam?: ExamDefinition | null;
  onSave: (exam: ExamUpsertInput) => void;
}

const EXAM_SUBJECTS = SUBJECT_PRESETS.filter(
  (s) => s.toLocaleLowerCase('tr-TR') !== 'mütalaa'
);

export const ExamFormModal: React.FC<ExamFormModalProps> = ({
  open,
  onClose,
  termId,
  classes,
  editingExam,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState('Talim Tecvid');
  const [topicTitle, setTopicTitle] = useState('');
  const [examType, setExamType] = useState<ExamType>('Yazılı');
  const [classId, setClassId] = useState('__all__');
  const [date, setDate] = useState(getTodayISO());
  const [weight, setWeight] = useState('40');

  useEffect(() => {
    if (!open) return;
    if (editingExam) {
      setTitle(editingExam.title);
      setSubjectName(editingExam.subjectName);
      setTopicTitle(editingExam.topicTitle ?? '');
      setExamType(editingExam.examType);
      setClassId(editingExam.classId);
      setDate(editingExam.date);
      setWeight(String(editingExam.weight));
    } else {
      setTitle('');
      setSubjectName('Talim Tecvid');
      setTopicTitle('');
      setExamType('Yazılı');
      setClassId('__all__');
      setDate(getTodayISO());
      setWeight('40');
    }
  }, [open, editingExam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const numericWeight = Math.max(1, Math.min(100, Number(weight) || 20));
    onSave({
      id: editingExam?.id,
      termId,
      classId,
      title: title.trim(),
      subjectName,
      topicTitle: topicTitle.trim() || undefined,
      date,
      examType,
      weight: numericWeight,
      maxScore: 100,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingExam ? 'Sınav Tanımını Düzenle' : 'Yeni Sınav / Uygulama Tanımla'}
      subtitle="Ders, konu ve ağırlık yüzdesini belirleyerek hızlı not girişi başlatın"
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            form="exam-form"
            className="min-h-[40px] px-5 rounded-lg bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
          >
            Kaydet
          </button>
        </>
      }
    >
      <form id="exam-form" onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Sınav Adı *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: 1. Tecvid Yazılısı veya Amme Cüzü Sözlüsü"
            className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ders</label>
            <select
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
            >
              {EXAM_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sınav Türü</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value as ExamType)}
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
            >
              <option value="Yazılı">Yazılı</option>
              <option value="Sözlü">Sözlü / Uygulama</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Konu / Kapsam (Opsiyonel)
          </label>
          <input
            type="text"
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            placeholder="Örn: Mahreçler, İzhar–İhfa kuralları"
            className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sınıf</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full h-10 px-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
            >
              <option value="__all__">Tüm Sınıflar</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tarih</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-2.5 text-sm tabular-nums bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ağırlık (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full h-10 px-3 text-sm tabular-nums bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

import React, { useMemo, useState } from 'react';
import { Clock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAppStore } from '../../store/AppStoreContext';
import type { LessonRequirementType, LessonSlot, LessonSlotCategory } from '../../types';
import { createId, HOUR_OPTIONS, MINUTE_OPTIONS, splitHHmm } from '../../utils/id';

interface SlotFormState {
  id: string;
  name: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  category: LessonSlotCategory;
  requirement: LessonRequirementType;
}

const initialSlotForm = (): SlotFormState => ({
  id: '',
  name: '',
  startHour: '08',
  startMinute: '00',
  endHour: '09',
  endMinute: '00',
  category: 'normal',
  requirement: 'zorunlu',
});

export const LessonSlotsTab: React.FC = () => {
  const { db, upsertLessonSlot, deleteLessonSlot, showToast } = useAppStore();
  const [form, setForm] = useState<SlotFormState>(initialSlotForm);
  const [categoryFilter, setCategoryFilter] = useState<'all' | LessonSlotCategory>('all');

  const visibleSlots = useMemo(() => {
    return db.lessonSlots.filter((s) =>
      categoryFilter === 'all' ? true : s.category === categoryFilter
    );
  }, [db.lessonSlots, categoryFilter]);

  const startEdit = (slot: LessonSlot) => {
    const start = splitHHmm(slot.startTime);
    const end = splitHHmm(slot.endTime);
    setForm({
      id: slot.id,
      name: slot.name,
      startHour: start.hour,
      startMinute: start.minute,
      endHour: end.hour,
      endMinute: end.minute,
      category: slot.category,
      requirement: slot.requirement,
    });
  };

  const resetForm = () => setForm(initialSlotForm());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const startTime = `${form.startHour}:${form.startMinute}`;
    const endTime = `${form.endHour}:${form.endMinute}`;
    if (endTime <= startTime) {
      showToast('Bitiş saati başlangıç saatinden sonra olmalıdır.', 'error');
      return;
    }

    const isEdit = Boolean(form.id);
    upsertLessonSlot({
      id: form.id || createId('slot'),
      name: form.name.trim(),
      startTime,
      endTime,
      category: form.category,
      requirement: form.requirement,
      order: isEdit
        ? (db.lessonSlots.find((s) => s.id === form.id)?.order ?? db.lessonSlots.length + 1)
        : db.lessonSlots.length + 1,
      isActive: true,
    });
    resetForm();
    showToast(isEdit ? 'Ders saati güncellendi.' : 'Yeni ders / etüt saati eklendi.');
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Ders Saatleri & Tanımlar</h3>
        <p className="text-xs sm:text-sm text-slate-500">
          Normal ders ve etüt / mütalaa dilimlerini saat-dakika seçici ile düzenli biçimde tanımlayın.
        </p>
      </div>

      {/* Clean Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Add / Edit Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-900">
              {form.id ? 'Saat Dilimini Düzenle' : 'Yeni Ders / Etüt Saati'}
            </h4>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Vazgeç
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Saat / Dilim Adı *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Örn: 1. Ders veya Etüt 1 (Sabah)"
              className="w-full min-h-[42px] px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Hour & Minute Dropdown Selectors */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Başlangıç Saati
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  aria-label="Başlangıç saati"
                  value={form.startHour}
                  onChange={(e) => setForm((prev) => ({ ...prev, startHour: e.target.value }))}
                  className="min-h-[42px] px-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Başlangıç dakikası"
                  value={form.startMinute}
                  onChange={(e) => setForm((prev) => ({ ...prev, startMinute: e.target.value }))}
                  className="min-h-[42px] px-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Bitiş Saati
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  aria-label="Bitiş saati"
                  value={form.endHour}
                  onChange={(e) => setForm((prev) => ({ ...prev, endHour: e.target.value }))}
                  className="min-h-[42px] px-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Bitiş dakikası"
                  value={form.endMinute}
                  onChange={(e) => setForm((prev) => ({ ...prev, endMinute: e.target.value }))}
                  className="min-h-[42px] px-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Category: Normal Ders vs Etüt / Mütalaa */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Dilim Türü</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, category: 'normal' }))}
                className={`min-h-[40px] px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  form.category === 'normal'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Normal Ders
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, category: 'etut' }))}
                className={`min-h-[40px] px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  form.category === 'etut'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Etüt / Mütalaa
              </button>
            </div>
          </div>

          {/* Requirement: Zorunlu vs Seçmeli */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Katılım Durumu</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, requirement: 'zorunlu' }))}
                className={`min-h-[40px] px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  form.requirement === 'zorunlu'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Zorunlu
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, requirement: 'secmeli' }))}
                className={`min-h-[40px] px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  form.requirement === 'secmeli'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Seçmeli
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {form.id ? 'Değişiklikleri Kaydet' : 'Saat Dilimini Ekle'}
          </button>
        </form>

        {/* Right Column: Defined Slots List */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              Tanımlı Saatler ({visibleSlots.length})
            </span>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'Tümü' },
                  { id: 'normal', label: 'Normal Ders' },
                  { id: 'etut', label: 'Etüt / Mütalaa' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {visibleSlots.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              Bu filtrede tanımlı ders saati bulunmuyor.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-emerald-800 tabular-nums inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-700" />
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {slot.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span>{slot.category === 'etut' ? 'Etüt / Mütalaa' : 'Normal Ders'}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          slot.requirement === 'zorunlu'
                            ? 'text-slate-700 font-medium'
                            : 'text-slate-500'
                        }
                      >
                        {slot.requirement === 'zorunlu' ? 'Zorunlu' : 'Seçmeli'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(slot)}
                      aria-label="Saati düzenle"
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteLessonSlot(slot.id);
                        if (form.id === slot.id) resetForm();
                        showToast(`"${slot.name}" silindi.`, 'info');
                      }}
                      aria-label="Saati sil"
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

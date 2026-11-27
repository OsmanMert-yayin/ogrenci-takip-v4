import React, { useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useAppStore } from '../../store/AppStoreContext';
import type { AcademicTerm } from '../../types';
import { createId, formatTurkishDate } from '../../utils/id';

const emptyTermForm = (): AcademicTerm => ({
  id: '',
  name: '',
  startDate: '2026-09-14',
  endDate: '2027-06-18',
  isActive: false,
  notes: '',
});

export const TermsTab: React.FC = () => {
  const { db, upsertTerm, deleteTerm, setActiveTerm, showToast } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AcademicTerm>(emptyTermForm);

  const openNew = () => {
    setForm({ ...emptyTermForm(), isActive: db.terms.length === 0 });
    setModalOpen(true);
  };

  const openEdit = (term: AcademicTerm) => {
    setForm({ ...term });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const isEdit = Boolean(form.id);
    upsertTerm({
      ...form,
      id: form.id || createId('term'),
      name: form.name.trim(),
      notes: form.notes?.trim() || undefined,
    });
    setModalOpen(false);
    showToast(isEdit ? 'Akademik dönem güncellendi.' : 'Yeni akademik dönem eklendi.');
  };

  const handleDelete = (term: AcademicTerm) => {
    if (db.terms.length <= 1) {
      showToast('En az bir akademik dönem bulunmalıdır.', 'error');
      return;
    }
    deleteTerm(term.id);
    showToast(`"${term.name}" dönemi silindi.`, 'info');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Akademik Dönemler</h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Eğitim yıllarını tanımlayın ve aktif çalışma dönemini belirleyin.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Yeni Dönem Ekle
        </button>
      </div>

      {db.terms.length === 0 ? (
        <EmptyState
          title="Henüz akademik dönem yok"
          description="Sınıfları ve öğrenci kayıtlarını dönem bazlı takip etmek için ilk eğitim yılını ekleyin."
          actionLabel="İlk Dönemi Ekle"
          onAction={openNew}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          {db.terms.map((term) => {
            const classCount = db.classes.filter((c) => c.termId === term.id).length;
            return (
              <div
                key={term.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-semibold text-slate-900">
                      {term.name}
                    </span>
                    {term.isActive && (
                      <span className="text-xs font-semibold text-emerald-700">· Aktif Dönem</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>
                      {formatTurkishDate(term.startDate)} – {formatTurkishDate(term.endDate)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{classCount} sınıf</span>
                  </div>
                  {term.notes && <p className="text-xs text-slate-500">{term.notes}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!term.isActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTerm(term.id);
                        showToast(`"${term.name}" aktif dönem olarak seçildi.`);
                      }}
                      className="inline-flex items-center gap-1 min-h-[38px] px-3 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aktif Yap
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(term)}
                    aria-label="Dönemi düzenle"
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(term)}
                    aria-label="Dönemi sil"
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Akademik Dönemi Düzenle' : 'Yeni Akademik Dönem'}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[40px] px-4 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              form="term-form"
              className="min-h-[40px] px-4 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              Kaydet
            </button>
          </>
        }
      >
        <form id="term-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Dönem Adı *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Örn: 2026-2027 Eğitim Yılı"
              className="w-full min-h-[42px] px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full min-h-[42px] px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full min-h-[42px] px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Notlar</label>
            <textarea
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="İsteğe bağlı dönem açıklaması..."
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 rounded accent-emerald-700"
            />
            <span>Bu dönemi aktif çalışma dönemi olarak işaretle</span>
          </label>
        </form>
      </Modal>
    </div>
  );
};

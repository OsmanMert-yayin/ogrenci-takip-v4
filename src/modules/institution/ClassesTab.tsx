import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SmartFilterBar, type SmartFilterField } from '../../components/common/SmartFilterBar';
import { useAppStore } from '../../store/AppStoreContext';
import type { ClassGroup, GroupShiftType } from '../../types';
import { createId } from '../../utils/id';

const SHIFT_TYPES: GroupShiftType[] = ['Sabah', 'Öğleden Sonra', 'Tam Gün', 'Yatılı'];

export const ClassesTab: React.FC = () => {
  const { db, activeTerm, upsertClass, deleteClass, showToast } = useAppStore();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ClassGroup>({
    id: '',
    termId: activeTerm?.id ?? '',
    name: '',
    shiftType: 'Sabah',
    roomName: '',
    capacity: 18,
    teacherId: '',
    notes: '',
    isActive: true,
  });

  const teacherMap = useMemo(() => new Map(db.teachers.map((t) => [t.id, t])), [db.teachers]);

  const coreFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'q',
        label: 'Sınıf Ara',
        type: 'search',
        placeholder: 'Sınıf adı veya derslik ara...',
      },
      {
        id: 'shift',
        label: 'Grup Tipi',
        type: 'select',
        placeholder: 'Grup Tipi: Tümü',
        options: SHIFT_TYPES.map((s) => ({ value: s, label: s })),
      },
    ],
    []
  );

  const optionalFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'teacherId',
        label: 'Sorumlu Hoca',
        type: 'select',
        placeholder: 'Öğretmen: Tümü',
        options: [
          { value: '__none__', label: 'Atanmamış' },
          ...db.teachers.map((t) => ({ value: t.id, label: t.fullName })),
        ],
      },
      {
        id: 'status',
        label: 'Durum',
        type: 'select',
        placeholder: 'Durum: Tümü',
        options: [
          { value: 'active', label: 'Aktif Sınıflar' },
          { value: 'inactive', label: 'Pasif Sınıflar' },
        ],
      },
      {
        id: 'sort',
        label: 'Sıralama',
        type: 'select',
        placeholder: 'Sırala: Varsayılan',
        options: [
          { value: 'name_asc', label: 'Ada Göre (A-Z)' },
          { value: 'students_desc', label: 'Öğrenci Sayısı (Çoktan Aza)' },
        ],
      },
    ],
    [db.teachers]
  );

  const filteredClasses = useMemo(() => {
    const q = (filters.q ?? '').trim().toLocaleLowerCase('tr-TR');
    const shift = filters.shift ?? '';
    const teacherId = filters.teacherId ?? '';
    const status = filters.status ?? '';
    const sort = filters.sort ?? '';

    const list = db.classes
      .map((cls) => ({
        ...cls,
        studentCount: db.students.filter((s) => s.classId === cls.id && s.status === 'Aktif').length,
      }))
      .filter((cls) => {
        if (q) {
          const hay = `${cls.name} ${cls.roomName ?? ''} ${cls.shiftType}`.toLocaleLowerCase('tr-TR');
          if (!hay.includes(q)) return false;
        }
        if (shift && cls.shiftType !== shift) return false;
        if (teacherId === '__none__' && cls.teacherId) return false;
        if (teacherId && teacherId !== '__none__' && cls.teacherId !== teacherId) return false;
        if (status === 'active' && !cls.isActive) return false;
        if (status === 'inactive' && cls.isActive) return false;
        return true;
      });

    if (sort === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
    } else if (sort === 'students_desc') {
      list.sort((a, b) => b.studentCount - a.studentCount);
    }

    return list;
  }, [db.classes, db.students, filters]);

  const openNew = () => {
    setForm({
      id: '',
      termId: activeTerm?.id ?? db.terms[0]?.id ?? '',
      name: '',
      shiftType: 'Sabah',
      roomName: '',
      capacity: 18,
      teacherId: '',
      notes: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (cls: ClassGroup) => {
    setForm({ ...cls, teacherId: cls.teacherId ?? '' });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const isEdit = Boolean(form.id);
    upsertClass({
      ...form,
      id: form.id || createId('cls'),
      termId: form.termId || activeTerm?.id || db.terms[0]?.id || '',
      name: form.name.trim(),
      roomName: form.roomName?.trim() || undefined,
      teacherId: form.teacherId || undefined,
      notes: form.notes?.trim() || undefined,
    });
    setModalOpen(false);
    showToast(isEdit ? 'Sınıf bilgileri güncellendi.' : 'Yeni sınıf oluşturuldu.');
  };

  const handleDelete = (cls: ClassGroup) => {
    const enrolled = db.students.filter((s) => s.classId === cls.id).length;
    if (enrolled > 0) {
      showToast(`Bu sınıfta ${enrolled} kayıtlı öğrenci var. Önce öğrencileri taşıyın.`, 'error');
      return;
    }
    deleteClass(cls.id);
    showToast(`"${cls.name}" sınıfı silindi.`, 'info');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Kurs / Sınıf & Gruplar</h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Sabah, Öğleden Sonra, Tam Gün ve Yatılı sınıflarını oluşturup hoca eşleştirin.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Yeni Sınıf Ekle
        </button>
      </div>

      <SmartFilterBar
        pageKey="institution_classes"
        coreFilters={coreFilters}
        optionalFilters={optionalFilters}
        values={filters}
        onChange={(id, val) => setFilters((prev) => ({ ...prev, [id]: val }))}
        onReset={() => setFilters({})}
        resultSummary={`${filteredClasses.length} sınıf`}
      />

      {filteredClasses.length === 0 ? (
        <EmptyState
          title="Eşleşen sınıf bulunamadı"
          description="Filtreleri temizleyebilir veya yeni bir sınıf / grup tanımlayabilirsiniz."
          actionLabel="Yeni Sınıf Oluştur"
          onAction={openNew}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredClasses.map((cls) => {
            const teacher = cls.teacherId ? teacherMap.get(cls.teacherId) : undefined;
            return (
              <div
                key={cls.id}
                className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-base font-semibold text-slate-900 truncate">{cls.name}</h4>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span className="font-medium text-emerald-700">{cls.shiftType}</span>
                        {cls.roomName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{cls.roomName}</span>
                          </>
                        )}
                        {!cls.isActive && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-700 font-medium">Pasif</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(cls)}
                        aria-label="Sınıfı düzenle"
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cls)}
                        aria-label="Sınıfı sil"
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {cls.notes && <p className="text-xs text-slate-500 pt-1">{cls.notes}</p>}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Sorumlu Hoca:{' '}
                    <strong className="text-slate-900 font-medium">
                      {teacher ? teacher.fullName : 'Atanmadı'}
                    </strong>
                  </span>
                  <span className="text-slate-600 tabular-nums">
                    <strong className="text-slate-900 font-semibold">{cls.studentCount}</strong>
                    {cls.capacity ? ` / ${cls.capacity}` : ''} öğrenci
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Sınıf / Grup Düzenle' : 'Yeni Sınıf / Grup'}
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
              form="class-form"
              className="min-h-[40px] px-4 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              Kaydet
            </button>
          </>
        }
      >
        <form id="class-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Sınıf Adı *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Örn: 1-A Sabah Yüzüne Grubu"
              className="w-full min-h-[42px] px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Grup Tipi</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SHIFT_TYPES.map((shift) => (
                <button
                  key={shift}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, shiftType: shift }))}
                  className={`min-h-[40px] px-2.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                    form.shiftType === shift
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Sorumlu Hoca
              </label>
              <select
                value={form.teacherId ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                className="w-full min-h-[42px] px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              >
                <option value="">Hoca Seçilmedi</option>
                {db.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Kontenjan (Kapasite)
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={form.capacity ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    capacity: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full min-h-[42px] px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600 tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Derslik / Kat
              </label>
              <input
                type="text"
                value={form.roomName ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, roomName: e.target.value }))}
                placeholder="Örn: 1. Kat - Derslik 102"
                className="w-full min-h-[42px] px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Bağlı Dönem
              </label>
              <select
                value={form.termId}
                onChange={(e) => setForm((prev) => ({ ...prev, termId: e.target.value }))}
                className="w-full min-h-[42px] px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              >
                {db.terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Notlar</label>
            <input
              type="text"
              value={form.notes ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Sınıf hakkında kısa not..."
              className="w-full min-h-[42px] px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 rounded accent-emerald-700"
            />
            <span>Sınıf aktif durumda</span>
          </label>
        </form>
      </Modal>
    </div>
  );
};

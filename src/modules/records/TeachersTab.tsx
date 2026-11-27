import React, { useMemo, useState } from 'react';
import { Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SmartFilterBar, type SmartFilterField } from '../../components/common/SmartFilterBar';
import { useAppStore } from '../../store/AppStoreContext';
import type { Teacher } from '../../types';
import { createId, formatPhoneLink } from '../../utils/id';

const emptyTeacher = (): Teacher => ({
  id: '',
  fullName: '',
  title: "Kur'an Kursu Öğreticisi",
  phone: '',
  email: '',
  assignedClassIds: [],
  isActive: true,
  notes: '',
  createdAt: new Date().toISOString(),
});

export const TeachersTab: React.FC = () => {
  const { db, upsertTeacher, deleteTeacher, showToast } = useAppStore();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Teacher>(emptyTeacher);

  const classMap = useMemo(() => new Map(db.classes.map((c) => [c.id, c])), [db.classes]);

  const coreFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'q',
        label: 'Hoca Ara',
        type: 'search',
        placeholder: 'Öğretmen adı, unvan veya telefon ara...',
      },
      {
        id: 'status',
        label: 'Durum',
        type: 'select',
        placeholder: 'Durum: Tümü',
        options: [
          { value: 'active', label: 'Aktif' },
          { value: 'inactive', label: 'Pasif' },
        ],
      },
    ],
    []
  );

  const optionalFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'classId',
        label: 'Sorumlu Sınıf',
        type: 'select',
        placeholder: 'Sınıf: Tümü',
        options: db.classes.map((c) => ({ value: c.id, label: c.name })),
      },
    ],
    [db.classes]
  );

  const filteredTeachers = useMemo(() => {
    const q = (filters.q ?? '').trim().toLocaleLowerCase('tr-TR');
    const status = filters.status ?? '';
    const classId = filters.classId ?? '';

    return db.teachers.filter((t) => {
      if (status === 'active' && !t.isActive) return false;
      if (status === 'inactive' && t.isActive) return false;
      if (classId && !t.assignedClassIds.includes(classId)) return false;
      if (q) {
        const hay = `${t.fullName} ${t.title ?? ''} ${t.phone} ${t.email ?? ''}`.toLocaleLowerCase(
          'tr-TR'
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [db.teachers, filters]);

  const openNew = () => {
    setForm(emptyTeacher());
    setModalOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setForm({ ...teacher, assignedClassIds: [...teacher.assignedClassIds] });
    setModalOpen(true);
  };

  const toggleClassAssign = (classId: string) => {
    setForm((prev) => ({
      ...prev,
      assignedClassIds: prev.assignedClassIds.includes(classId)
        ? prev.assignedClassIds.filter((id) => id !== classId)
        : [...prev.assignedClassIds, classId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    const isEdit = Boolean(form.id);
    upsertTeacher({
      ...form,
      id: form.id || createId('tch'),
      fullName: form.fullName.trim(),
      title: form.title?.trim() || undefined,
      phone: form.phone.trim(),
      email: form.email?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      createdAt: form.id ? form.createdAt : new Date().toISOString(),
    });
    setModalOpen(false);
    showToast(isEdit ? 'Öğretmen bilgileri güncellendi.' : 'Yeni öğretmen kaydedildi.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Öğretmenler & Sınıf Atamaları</h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Görevli hocaları kaydedin ve sorumlu oldukları sınıfları eşleştirin.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Yeni Öğretmen Ekle
        </button>
      </div>

      <SmartFilterBar
        pageKey="records_teachers"
        coreFilters={coreFilters}
        optionalFilters={optionalFilters}
        values={filters}
        onChange={(id, val) => setFilters((prev) => ({ ...prev, [id]: val }))}
        onReset={() => setFilters({})}
        resultSummary={`${filteredTeachers.length} öğretmen`}
      />

      {filteredTeachers.length === 0 ? (
        <EmptyState
          title="Öğretmen kaydı bulunamadı"
          description="Sınıflara sorumlu hoca atamak için yeni bir öğretici kaydı oluşturun."
          actionLabel="Yeni Öğretmen Ekle"
          onAction={openNew}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredTeachers.map((teacher) => {
            const assignedNames = teacher.assignedClassIds
              .map((id) => classMap.get(id)?.name)
              .filter(Boolean) as string[];

            return (
              <div
                key={teacher.id}
                className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-base font-semibold text-slate-900 truncate">
                        {teacher.fullName}
                      </h4>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5">
                        <span>{teacher.title || 'Öğretici'}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            teacher.isActive
                              ? 'text-emerald-700 font-medium'
                              : 'text-slate-400 font-medium'
                          }
                        >
                          {teacher.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(teacher)}
                        aria-label="Öğretmeni düzenle"
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteTeacher(teacher.id);
                          showToast(`"${teacher.fullName}" kaydı silindi.`, 'info');
                        }}
                        aria-label="Öğretmeni sil"
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {teacher.phone && (
                      <a
                        href={formatPhoneLink(teacher.phone)}
                        className="inline-flex items-center gap-1.5 font-mono tabular-nums hover:text-emerald-700"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {teacher.phone}
                      </a>
                    )}
                    {teacher.email && (
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {teacher.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-400">Sorumlu Sınıflar: </span>
                  <span className="text-slate-800 font-medium">
                    {assignedNames.length > 0 ? assignedNames.join(', ') : 'Henüz sınıf atanmadı'}
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
        title={form.id ? 'Öğretmen Bilgilerini Düzenle' : 'Yeni Öğretmen Kaydı'}
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
              form="teacher-form"
              className="min-h-[40px] px-4 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              Kaydet
            </button>
          </>
        }
      >
        <form id="teacher-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Ad Soyad *</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              placeholder="Örn: Mustafa Yılmaz"
              className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Ünvan / Branş
              </label>
              <input
                type="text"
                value={form.title ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Örn: Hafızlık Hocası"
                className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Telefon</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="05XX XXX XX XX"
                className="w-full min-h-[42px] px-3 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">E-posta</label>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="istegebagli@kurs.org"
              className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Sorumlu Olduğu Sınıflar
            </label>
            {db.classes.length === 0 ? (
              <p className="text-xs text-slate-500">Önce Kurum & Dönem bölümünden sınıf ekleyin.</p>
            ) : (
              <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/70 max-h-44 overflow-y-auto">
                {db.classes.map((cls) => {
                  const checked = form.assignedClassIds.includes(cls.id);
                  return (
                    <label
                      key={cls.id}
                      className="flex items-center justify-between gap-2 text-sm text-slate-700 cursor-pointer py-1"
                    >
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleClassAssign(cls.id)}
                          className="w-4 h-4 rounded accent-emerald-700"
                        />
                        <span className="font-medium text-slate-800">{cls.name}</span>
                      </span>
                      <span className="text-xs text-slate-500">{cls.shiftType}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="w-4 h-4 rounded accent-emerald-700"
            />
            <span>Öğretmen aktif görevde</span>
          </label>
        </form>
      </Modal>
    </div>
  );
};

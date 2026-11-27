import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import type {
  ClassGroup,
  GuardianContact,
  GuardianRelation,
  NotificationPreference,
  ProgramType,
  Student,
  StudentStatus,
} from '../../types';
import { createId, getTodayISO } from '../../utils/id';

const GUARDIAN_RELATIONS: GuardianRelation[] = [
  'Baba',
  'Anne',
  'Dede',
  'Babaanne',
  'Anneanne',
  'Ağabey',
  'Abla',
  'Amca',
  'Dayı',
  'Teyze',
  'Hala',
  'Vasi',
  'Diğer',
];

const NOTIFICATION_PREFS: NotificationPreference[] = [
  'WhatsApp',
  'SMS',
  'Arama',
  'Bildirim İstemiyor',
];

const STUDENT_STATUSES: StudentStatus[] = ['Aktif', 'Pasif', 'Mezun', 'Kayıt Dondurdu'];

interface StudentFormModalProps {
  open: boolean;
  initialStudent: Student | null;
  classes: ClassGroup[];
  onClose: () => void;
  onSave: (student: Student) => void;
}

function makeEmptyGuardian(isPrimary = false): GuardianContact {
  return {
    id: createId('grd'),
    fullName: '',
    phone: '',
    relation: isPrimary ? 'Baba' : 'Anne',
    notificationPreference: 'WhatsApp',
    isPrimary,
    notes: '',
  };
}

function makeDefaultStudent(defaultClassId: string): Student {
  const now = new Date().toISOString();
  return {
    id: '',
    studentNo: '',
    fullName: '',
    classId: defaultClassId,
    programType: 'Yüzüne & Ezber',
    levels: {
      yuzune: '',
      ezber: '',
      tecvid: 'Başlangıç',
    },
    status: 'Aktif',
    birthYear: '',
    enrollmentDate: getTodayISO(),
    guardians: [makeEmptyGuardian(true)],
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  open,
  initialStudent,
  classes,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<Student>(() =>
    makeDefaultStudent(classes[0]?.id ?? '')
  );

  useEffect(() => {
    if (!open) return;
    if (initialStudent) {
      setForm({
        ...initialStudent,
        levels: { ...initialStudent.levels },
        guardians:
          initialStudent.guardians.length > 0
            ? initialStudent.guardians.map((g) => ({ ...g }))
            : [makeEmptyGuardian(true)],
      });
    } else {
      setForm(makeDefaultStudent(classes[0]?.id ?? ''));
    }
  }, [open, initialStudent, classes]);

  const updateGuardian = (id: string, patch: Partial<GuardianContact>) => {
    setForm((prev) => ({
      ...prev,
      guardians: prev.guardians.map((g) => {
        if (patch.isPrimary) {
          return g.id === id ? { ...g, ...patch, isPrimary: true } : { ...g, isPrimary: false };
        }
        return g.id === id ? { ...g, ...patch } : g;
      }),
    }));
  };

  const addGuardian = () => {
    setForm((prev) => ({
      ...prev,
      guardians: [...prev.guardians, makeEmptyGuardian(prev.guardians.length === 0)],
    }));
  };

  const removeGuardian = (id: string) => {
    setForm((prev) => {
      const next = prev.guardians.filter((g) => g.id !== id);
      if (next.length > 0 && !next.some((g) => g.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return { ...prev, guardians: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    const cleanedGuardians = form.guardians
      .filter((g) => g.fullName.trim() || g.phone.trim())
      .map((g, idx) => ({
        ...g,
        fullName: g.fullName.trim() || g.relation,
        phone: g.phone.trim(),
        notes: g.notes?.trim() || undefined,
        isPrimary: g.isPrimary ?? idx === 0,
      }));

    if (cleanedGuardians.length > 0 && !cleanedGuardians.some((g) => g.isPrimary)) {
      cleanedGuardians[0].isPrimary = true;
    }

    const now = new Date().toISOString();
    onSave({
      ...form,
      id: form.id || createId('std'),
      studentNo: form.studentNo?.trim() || undefined,
      fullName: form.fullName.trim(),
      levels: {
        yuzune: form.levels.yuzune.trim(),
        ezber: form.levels.ezber.trim(),
        tecvid: form.levels.tecvid.trim(),
      },
      birthYear: form.birthYear?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      guardians: cleanedGuardians,
      createdAt: form.id ? form.createdAt : now,
      updatedAt: now,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={form.id ? 'Öğrenci Kaydını Düzenle' : 'Yeni Öğrenci Kaydı'}
      subtitle="Öğrenci bilgilerini, seviyelerini ve veli iletişim kişilerini tanımlayın."
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit"
            form="student-form"
            className="min-h-[40px] px-5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            Kaydet
          </button>
        </>
      }
    >
      <form id="student-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Core Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          <div className="sm:col-span-6">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Ad Soyad *
            </label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              placeholder="Örn: Yusuf Emre Karahan"
              className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Öğrenci No</label>
            <input
              type="text"
              value={form.studentNo ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, studentNo: e.target.value }))}
              placeholder="Örn: 106"
              className="w-full min-h-[42px] px-3 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Durum</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value as StudentStatus }))
              }
              className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            >
              {STUDENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-6">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Sınıf / Grup</label>
            <select
              value={form.classId}
              onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))}
              className="w-full min-h-[42px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            >
              <option value="">Sınıf Seçilmedi</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.shiftType})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-6">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Resmi Program Türü
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Yüzüne & Ezber', 'Hafızlık'] as ProgramType[]).map((prog) => (
                <button
                  key={prog}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, programType: prog }))}
                  className={`min-h-[42px] px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    form.programType === prog
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {prog}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Academic Levels */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-semibold text-slate-600 mb-3">Ders Seviyeleri</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Yüzüne Seviyesi
              </label>
              <input
                type="text"
                value={form.levels.yuzune}
                onChange={(e) =>
                  setForm((p) => ({ ...p, levels: { ...p.levels, yuzune: e.target.value } }))
                }
                placeholder="Örn: Elif-Ba, 4. Cüz"
                className="w-full min-h-[40px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Ezber / Hafızlık
              </label>
              <input
                type="text"
                value={form.levels.ezber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, levels: { ...p.levels, ezber: e.target.value } }))
                }
                placeholder="Örn: Amme Cüzü, 3. Hizb"
                className="w-full min-h-[40px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Tecvid Seviyesi
              </label>
              <input
                type="text"
                value={form.levels.tecvid}
                onChange={(e) =>
                  setForm((p) => ({ ...p, levels: { ...p.levels, tecvid: e.target.value } }))
                }
                placeholder="Başlangıç / Orta / İleri"
                className="w-full min-h-[40px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Multi-Guardian Contacts */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-600">
              Veli İletişim Listesi ({form.guardians.length})
            </h3>
            <button
              type="button"
              onClick={addGuardian}
              className="inline-flex items-center gap-1 min-h-[34px] px-3 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Veli Ekle
            </button>
          </div>

          <div className="space-y-3">
            {form.guardians.map((guardian, idx) => (
              <div
                key={guardian.id}
                className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="primary-guardian"
                      checked={Boolean(guardian.isPrimary)}
                      onChange={() => updateGuardian(guardian.id, { isPrimary: true })}
                      className="accent-emerald-700"
                    />
                    <span>Veli #{idx + 1} (Birincil İletişim)</span>
                  </label>

                  {form.guardians.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGuardian(guardian.id)}
                      aria-label="Veliyi kaldır"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={guardian.fullName}
                      onChange={(e) =>
                        updateGuardian(guardian.id, { fullName: e.target.value })
                      }
                      placeholder="Veli Ad Soyad"
                      className="w-full min-h-[38px] px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <select
                      aria-label="Yakınlık derecesi"
                      value={guardian.relation}
                      onChange={(e) =>
                        updateGuardian(guardian.id, {
                          relation: e.target.value as GuardianRelation,
                        })
                      }
                      className="w-full min-h-[38px] px-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      {GUARDIAN_RELATIONS.map((rel) => (
                        <option key={rel} value={rel}>
                          {rel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="tel"
                      value={guardian.phone}
                      onChange={(e) => updateGuardian(guardian.id, { phone: e.target.value })}
                      placeholder="05XX XXX XX XX"
                      className="w-full min-h-[38px] px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <select
                      aria-label="Bildirim tercihi"
                      value={guardian.notificationPreference}
                      onChange={(e) =>
                        updateGuardian(guardian.id, {
                          notificationPreference: e.target.value as NotificationPreference,
                        })
                      }
                      className="w-full min-h-[38px] px-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      {NOTIFICATION_PREFS.map((pref) => (
                        <option key={pref} value={pref}>
                          {pref}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes & Enrollment Date */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Kayıt Tarihi</label>
            <input
              type="date"
              value={form.enrollmentDate}
              onChange={(e) => setForm((p) => ({ ...p, enrollmentDate: e.target.value }))}
              className="w-full min-h-[40px] px-3 text-sm tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div className="sm:col-span-8">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Notlar</label>
            <input
              type="text"
              value={form.notes ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Öğrenci hakkında özel takip notları..."
              className="w-full min-h-[40px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

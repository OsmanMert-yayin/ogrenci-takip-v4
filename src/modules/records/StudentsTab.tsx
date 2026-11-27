import React, { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { SmartFilterBar, type SmartFilterField } from '../../components/common/SmartFilterBar';
import { useAppStore } from '../../store/AppStoreContext';
import type { Student } from '../../types';
import { StudentDetailModal } from './StudentDetailModal';
import { StudentFormModal } from './StudentFormModal';
import { StudentMobileCard, StudentTableRow } from './StudentRow';

export const StudentsTab: React.FC = () => {
  const { db, upsertStudent, deleteStudent, showToast } = useAppStore();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  const classMap = useMemo(() => new Map(db.classes.map((c) => [c.id, c])), [db.classes]);
  const teacherMap = useMemo(() => new Map(db.teachers.map((t) => [t.id, t])), [db.teachers]);

  const coreFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'classId',
        label: 'Sınıf / Grup',
        type: 'select',
        placeholder: 'Sınıf / Grup: Tümü',
        options: db.classes.map((c) => ({ value: c.id, label: c.name })),
      },
      {
        id: 'q',
        label: 'Hızlı Öğrenci Ara',
        type: 'search',
        placeholder: 'Öğrenci, no veya veli ara...',
      },
    ],
    [db.classes]
  );

  const optionalFilters = useMemo<SmartFilterField[]>(
    () => [
      {
        id: 'program',
        label: 'Program Türü',
        type: 'select',
        placeholder: 'Program: Tümü',
        options: [
          { value: 'Yüzüne & Ezber', label: 'Yüzüne & Ezber' },
          { value: 'Hafızlık', label: 'Hafızlık' },
        ],
      },
      {
        id: 'shift',
        label: 'Sabah / Öğle Grubu',
        type: 'select',
        placeholder: 'Vakit: Tümü',
        options: [
          { value: 'Sabah', label: 'Sabah' },
          { value: 'Öğleden Sonra', label: 'Öğleden Sonra' },
          { value: 'Tam Gün', label: 'Tam Gün' },
          { value: 'Yatılı', label: 'Yatılı' },
        ],
      },
      {
        id: 'status',
        label: 'Durum',
        type: 'select',
        placeholder: 'Durum: Tümü',
        options: [
          { value: 'Aktif', label: 'Aktif' },
          { value: 'Pasif', label: 'Pasif' },
          { value: 'Mezun', label: 'Mezun' },
          { value: 'Kayıt Dondurdu', label: 'Kayıt Dondurdu' },
        ],
      },
      {
        id: 'tecvid',
        label: 'Tecvid Seviyesi',
        type: 'select',
        placeholder: 'Tecvid: Tümü',
        options: [
          { value: 'Başlangıç', label: 'Başlangıç' },
          { value: 'Orta', label: 'Orta' },
          { value: 'İleri', label: 'İleri' },
        ],
      },
      {
        id: 'sort',
        label: 'Sıralama',
        type: 'select',
        placeholder: 'Sırala: Varsayılan',
        options: [
          { value: 'name_asc', label: 'Ad Soyad (A-Z)' },
          { value: 'name_desc', label: 'Ad Soyad (Z-A)' },
          { value: 'no_asc', label: 'Öğrenci No (Artan)' },
        ],
      },
    ],
    []
  );

  const filteredStudents = useMemo(() => {
    const q = (filters.q ?? '').trim().toLocaleLowerCase('tr-TR');
    const classId = filters.classId ?? '';
    const program = filters.program ?? '';
    const shift = filters.shift ?? '';
    const status = filters.status ?? '';
    const tecvid = (filters.tecvid ?? '').toLocaleLowerCase('tr-TR');
    const sort = filters.sort ?? '';

    const list = db.students.filter((st) => {
      if (classId && st.classId !== classId) return false;
      if (program && st.programType !== program) return false;
      if (status && st.status !== status) return false;
      if (shift) {
        const cls = classMap.get(st.classId);
        if (!cls || cls.shiftType !== shift) return false;
      }
      if (tecvid && !st.levels.tecvid.toLocaleLowerCase('tr-TR').includes(tecvid)) {
        return false;
      }
      if (q) {
        const guardianHay = st.guardians.map((g) => `${g.fullName} ${g.phone}`).join(' ');
        const hay = `${st.fullName} ${st.studentNo ?? ''} ${st.levels.yuzune} ${st.levels.ezber} ${guardianHay}`.toLocaleLowerCase(
          'tr-TR'
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === 'name_asc') {
      list.sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr-TR'));
    } else if (sort === 'name_desc') {
      list.sort((a, b) => b.fullName.localeCompare(a.fullName, 'tr-TR'));
    } else if (sort === 'no_asc') {
      list.sort((a, b) => (a.studentNo ?? '9999').localeCompare(b.studentNo ?? '9999', 'tr-TR'));
    }

    return list;
  }, [db.students, filters, classMap]);

  const handleOpenNew = useCallback(() => {
    setEditingStudent(null);
    setFormOpen(true);
  }, []);

  const handleView = useCallback((student: Student) => {
    setViewingStudentId(student.id);
  }, []);

  const handleEdit = useCallback((student: Student) => {
    setEditingStudent(student);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    (student: Student) => {
      deleteStudent(student.id);
      setViewingStudentId((cur) => (cur === student.id ? null : cur));
      showToast(`"${student.fullName}" kaydı silindi.`, 'info');
    },
    [deleteStudent, showToast]
  );

  const handleSave = useCallback(
    (student: Student) => {
      const isEdit = db.students.some((s) => s.id === student.id);
      upsertStudent(student);
      setFormOpen(false);
      showToast(isEdit ? 'Öğrenci bilgileri güncellendi.' : 'Yeni öğrenci kaydedildi.');
    },
    [db.students, upsertStudent, showToast]
  );

  const viewingStudent = useMemo(
    () => (viewingStudentId ? db.students.find((s) => s.id === viewingStudentId) ?? null : null),
    [viewingStudentId, db.students]
  );

  const viewingClass = viewingStudent ? classMap.get(viewingStudent.classId) : undefined;
  const viewingTeacher = viewingClass?.teacherId
    ? teacherMap.get(viewingClass.teacherId)
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Öğrenci Listesi</h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Detaylı bilgi kartını açmak için öğrenci ismine tıklayın.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Yeni Öğrenci Ekle
        </button>
      </div>

      <SmartFilterBar
        pageKey="records_students"
        coreFilters={coreFilters}
        optionalFilters={optionalFilters}
        values={filters}
        onChange={(id, val) => setFilters((prev) => ({ ...prev, [id]: val }))}
        onReset={() => setFilters({})}
        resultSummary={`${filteredStudents.length} / ${db.students.length} öğrenci`}
      />

      {filteredStudents.length === 0 ? (
        <EmptyState
          title="Öğrenci bulunamadı"
          description="Arama veya filtre kriterlerinize uyan öğrenci kaydı yok."
          actionLabel="Yeni Öğrenci Ekle"
          onAction={handleOpenNew}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="py-3 pl-4 pr-3 w-16">No</th>
                  <th className="py-3 px-3">Öğrenci / Program</th>
                  <th className="py-3 px-3">Sınıf & Grup</th>
                  <th className="py-3 px-3">Seviye Özeti</th>
                  <th className="py-3 px-3">Birincil Veli</th>
                  <th className="py-3 pl-3 pr-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <StudentTableRow
                    key={student.id}
                    student={student}
                    classGroup={classMap.get(student.classId)}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Sleek Cards */}
          <div className="md:hidden space-y-3">
            {filteredStudents.map((student) => (
              <StudentMobileCard
                key={student.id}
                student={student}
                classGroup={classMap.get(student.classId)}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      <StudentFormModal
        open={formOpen}
        initialStudent={editingStudent}
        classes={db.classes}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      <StudentDetailModal
        student={viewingStudent}
        classGroup={viewingClass}
        teacher={viewingTeacher}
        onClose={() => setViewingStudentId(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

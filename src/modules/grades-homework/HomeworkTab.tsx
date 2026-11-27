import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useAppStore } from '../../store/AppStoreContext';
import type { HomeworkRecord, HomeworkStatus, Student } from '../../types';
import { formatFullDDMMYYYY } from '../../utils/duplicateAndMakeupEngine';
import { createId, getTodayISO } from '../../utils/id';
import { SUBJECT_PRESETS } from '../curriculum/curriculumConstants';

interface HomeworkTabProps {
  students: Student[];
  classMap: Map<string, string>;
}

const HOMEWORK_STATUS_BUTTONS: {
  status: HomeworkStatus;
  label: string;
  activeClass: string;
  idleClass: string;
}[] = [
  {
    status: 'Yaptı',
    label: 'Yaptı',
    activeClass: 'bg-emerald-700 text-white border-emerald-700',
    idleClass: 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50',
  },
  {
    status: 'Eksik',
    label: 'Eksik',
    activeClass: 'bg-amber-500 text-white border-amber-500',
    idleClass: 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50',
  },
  {
    status: 'Yapmadı',
    label: 'Yapmadı',
    activeClass: 'bg-red-600 text-white border-red-600',
    idleClass: 'bg-white text-slate-700 border-slate-200 hover:bg-red-50',
  },
  {
    status: 'Geç Getirdi',
    label: 'Geç Getirdi',
    activeClass: 'bg-sky-600 text-white border-sky-600',
    idleClass: 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50',
  },
];

interface HomeworkGroup {
  key: string;
  title: string;
  subjectName: string;
  assignedDate: string;
  dueDate: string;
  items: HomeworkRecord[];
}

export const HomeworkTab: React.FC<HomeworkTabProps> = ({ students, classMap }) => {
  const {
    db,
    batchCreateHomeworks,
    updateHomeworkStatus,
    deleteHomeworkGroup,
    showToast,
  } = useAppStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('');

  // New homework modal form state
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState('Ezber');
  const [dueDate, setDueDate] = useState(getTodayISO());
  const [targetClassId, setTargetClassId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const studentMap = useMemo(
    () => new Map(db.students.map((s) => [s.id, s])),
    [db.students]
  );

  const visibleStudentIdSet = useMemo(
    () => new Set(students.map((s) => s.id)),
    [students]
  );

  const groups: HomeworkGroup[] = useMemo(() => {
    const map = new Map<string, HomeworkGroup>();
    for (const hw of db.homeworks) {
      if (!visibleStudentIdSet.has(hw.studentId)) continue;
      const key = hw.assignmentId || `${hw.title}|${hw.dueDate}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(hw);
      } else {
        map.set(key, {
          key,
          title: hw.title,
          subjectName: hw.subjectName || 'Genel',
          assignedDate: hw.assignedDate,
          dueDate: hw.dueDate,
          items: [hw],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }, [db.homeworks, visibleStudentIdSet]);

  const activeGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return groups.find((g) => g.key === selectedGroupKey) ?? groups[0];
  }, [groups, selectedGroupKey]);

  const openNewModal = () => {
    setTitle('');
    setSubjectName('Ezber');
    setDueDate(getTodayISO());
    setTargetClassId('');
    setSelectedStudentIds(students.map((s) => s.id));
    setNote('');
    setModalOpen(true);
  };

  const handleClassTargetChange = (clsId: string) => {
    setTargetClassId(clsId);
    const matching = db.students
      .filter((s) => s.status === 'Aktif' && (!clsId || s.classId === clsId))
      .map((s) => s.id);
    setSelectedStudentIds(matching);
  };

  const toggleStudentInModal = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedStudentIds.length === 0) return;

    const assignmentId = createId('asg');
    const today = getTodayISO();
    const inputs = selectedStudentIds.map((sid) => ({
      assignmentId,
      studentId: sid,
      classId: studentMap.get(sid)?.classId ?? '',
      subjectName,
      title: title.trim(),
      assignedDate: today,
      dueDate,
      status: 'Verildi' as HomeworkStatus,
      note: note.trim() || undefined,
    }));

    batchCreateHomeworks(inputs);
    setSelectedGroupKey(assignmentId);
    setModalOpen(false);
    showToast(`${selectedStudentIds.length} öğrenciye yeni ödev tanımlandı.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200/90 rounded-xl px-4 py-2.5">
        <div className="text-xs text-slate-600 tabular-nums">
          Toplam <strong className="text-slate-900">{groups.length}</strong> ödev başlığı
        </div>
        <button
          type="button"
          onClick={openNewModal}
          className="min-h-[38px] px-3.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yeni Ödev Ver
        </button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="Henüz ödev tanımlanmamış"
          description="Sınıfa veya seçili öğrencilere son teslim tarihli ödev verip tek tıkla kontrol edebilirsiniz."
          actionLabel="İlk Ödevi Ver"
          onAction={openNewModal}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Assignment List */}
          <div className="lg:col-span-4 space-y-2">
            {groups.map((grp) => {
              const doneCount = grp.items.filter(
                (i) => i.status === 'Yaptı' || i.status === 'Tamamlandı' || i.status === 'Geç Getirdi'
              ).length;
              const isSelected = activeGroup?.key === grp.key;

              return (
                <div
                  key={grp.key}
                  onClick={() => setSelectedGroupKey(grp.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedGroupKey(grp.key);
                  }}
                  className={`rounded-xl border p-3.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        {grp.subjectName}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug mt-0.5">
                        {grp.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHomeworkGroup(grp.key);
                        showToast('Ödev grubu silindi.', 'info');
                      }}
                      aria-label="Ödevi sil"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                      Son Teslim: {formatFullDDMMYYYY(grp.dueDate)}
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {doneCount}/{grp.items.length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checklist Detail */}
          {activeGroup && (
            <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{activeGroup.title}</h3>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {activeGroup.subjectName} • Son Teslim:{' '}
                    {formatFullDDMMYYYY(activeGroup.dueDate)}
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-600 tabular-nums">
                  {activeGroup.items.length} öğrenci
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {activeGroup.items.map((hw) => {
                  const st = studentMap.get(hw.studentId);
                  if (!st) return null;
                  const normalizedStatus: HomeworkStatus =
                    hw.status === 'Tamamlandı' ? 'Yaptı' : hw.status;

                  return (
                    <div
                      key={hw.id}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{st.fullName}</div>
                        <div className="text-[11px] text-slate-500">
                          {classMap.get(st.classId) ?? 'Sınıfsız'}
                          {hw.checkedAt ? ` • Kontrol: ${hw.checkedAt}` : ''}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 sm:flex items-center gap-1.5 shrink-0">
                        {HOMEWORK_STATUS_BUTTONS.map((btn) => {
                          const active = normalizedStatus === btn.status;
                          return (
                            <button
                              key={btn.status}
                              type="button"
                              onClick={() => updateHomeworkStatus(hw.id, btn.status)}
                              className={`min-h-[38px] sm:min-h-[34px] px-2 sm:px-2.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                active ? btn.activeClass : btn.idleClass
                              }`}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Homework Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Yeni Ödev Ver"
        subtitle="Sınıfa veya seçili öğrencilere son teslim tarihli ödev tanımlayın"
        maxWidthClass="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[40px] px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              form="homework-form"
              disabled={selectedStudentIds.length === 0}
              className="min-h-[40px] px-5 rounded-lg bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-45 cursor-pointer"
            >
              Ödevi Ver ({selectedStudentIds.length})
            </button>
          </>
        }
      >
        <form id="homework-form" onSubmit={handleCreateHomework} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ödev Başlığı / Görevi *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Nebe Suresi 1-15. Ayetler Tekrar & Yazma"
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ders</label>
              <select
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
              >
                {SUBJECT_PRESETS.filter((s) => s !== 'Mütalaa').map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sınıf Hızlı Seç</label>
              <select
                value={targetClassId}
                onChange={(e) => handleClassTargetChange(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
              >
                <option value="">Tüm Aktif Öğrenciler</option>
                {db.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Son Teslim</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-2.5 text-sm tabular-nums bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Öğrenciler ({selectedStudentIds.length} seçili)
            </label>
            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {db.students
                .filter((s) => s.status === 'Aktif' && (!targetClassId || s.classId === targetClassId))
                .map((s) => {
                  const checked = selectedStudentIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStudentInModal(s.id)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left text-xs hover:bg-slate-50 cursor-pointer"
                    >
                      <span className={checked ? 'font-semibold text-slate-900' : 'text-slate-600'}>
                        {s.fullName}{' '}
                        <span className="text-slate-400">({classMap.get(s.classId) ?? ''})</span>
                      </span>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
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
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React from 'react';
import { MessageCircle, Pencil, Phone, Trash2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import type { ClassGroup, Student, Teacher } from '../../types';
import { formatPhoneLink, formatTurkishDate, formatWhatsAppLink } from '../../utils/id';

interface StudentDetailModalProps {
  student: Student | null;
  classGroup?: ClassGroup;
  teacher?: Teacher;
  onClose: () => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  classGroup,
  teacher,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!student) return null;

  return (
    <Modal
      open={Boolean(student)}
      onClose={onClose}
      title={student.fullName}
      subtitle={`${classGroup?.name ?? 'Sınıf Atanmamış'} · ${student.programType} · ${student.status}`}
      maxWidthClass="max-w-2xl"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onDelete(student)}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Kaydı Sil
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              Kapat
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(student);
              }}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-4 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Düzenle
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* General Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-100 text-sm">
          <div>
            <div className="text-xs text-slate-400">Öğrenci No</div>
            <div className="font-mono font-medium text-slate-900 tabular-nums mt-0.5">
              {student.studentNo || '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Sorumlu Hoca</div>
            <div className="font-medium text-slate-900 mt-0.5">
              {teacher?.fullName ?? 'Atanmadı'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Grup Tipi</div>
            <div className="font-medium text-slate-900 mt-0.5">
              {classGroup?.shiftType ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Kayıt Tarihi</div>
            <div className="font-medium text-slate-900 tabular-nums mt-0.5">
              {formatTurkishDate(student.enrollmentDate)}
            </div>
          </div>
        </div>

        {/* Academic Levels */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 mb-3">
            Kur&apos;an ve Ders Seviyeleri
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5">
              <div className="text-xs text-slate-500">Yüzüne Seviyesi</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                {student.levels.yuzune || 'Belirtilmedi'}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5">
              <div className="text-xs text-slate-500">Ezber / Hafızlık</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                {student.levels.ezber || 'Belirtilmedi'}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5">
              <div className="text-xs text-slate-500">Tecvid Seviyesi</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                {student.levels.tecvid || 'Belirtilmedi'}
              </div>
            </div>
          </div>
        </div>

        {/* Guardians Contact List */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 mb-3">
            Veli İletişim Bilgileri ({student.guardians.length})
          </h3>
          {student.guardians.length === 0 ? (
            <p className="text-sm text-slate-500">Kayıtlı veli iletişim bilgisi bulunmuyor.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {student.guardians.map((g) => (
                <div
                  key={g.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="font-semibold text-slate-900">{g.fullName}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-medium text-emerald-700">{g.relation}</span>
                      {g.isPrimary && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">Birincil</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                      <span className="font-mono tabular-nums">{g.phone || 'Telefon yok'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Bildirim: {g.notificationPreference}</span>
                    </div>
                    {g.notes && <div className="text-xs text-slate-500 mt-1">{g.notes}</div>}
                  </div>

                  {g.phone && (
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={formatPhoneLink(g.phone)}
                        className="inline-flex items-center gap-1.5 min-h-[36px] px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Ara
                      </a>
                      <a
                        href={formatWhatsAppLink(g.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 min-h-[36px] px-3 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {student.notes && (
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 mb-1.5">Öğrenci Notları</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{student.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

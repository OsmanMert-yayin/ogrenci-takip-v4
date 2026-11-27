export type GroupShiftType = 'Sabah' | 'Öğleden Sonra' | 'Tam Gün' | 'Yatılı';

export type LessonSlotCategory = 'normal' | 'etut';

export type LessonRequirementType = 'zorunlu' | 'secmeli';

export interface InstitutionInfo {
  id: string;
  name: string;
  district: string;
  city: string;
  phone: string;
  managerName: string;
  address: string;
  updatedAt: string;
}

export interface AcademicTerm {
  id: string;
  name: string; // Örn: 2026-2027 Eğitim Yılı
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean;
  notes?: string;
}

export interface ClassGroup {
  id: string;
  termId: string;
  name: string;
  shiftType: GroupShiftType;
  roomName?: string;
  capacity?: number;
  teacherId?: string; // Sorumlu hoca ID
  notes?: string;
  isActive: boolean;
}

export interface LessonSlot {
  id: string;
  name: string; // Örn: 1. Ders, Etüt 1
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: LessonSlotCategory; // 'normal' | 'etut'
  requirement: LessonRequirementType; // 'zorunlu' | 'secmeli'
  order: number;
  isActive: boolean;
}

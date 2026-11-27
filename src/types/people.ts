export type ProgramType = 'Yüzüne & Ezber' | 'Hafızlık';

export type StudentStatus = 'Aktif' | 'Pasif' | 'Mezun' | 'Kayıt Dondurdu';

export type GuardianRelation =
  | 'Baba'
  | 'Anne'
  | 'Dede'
  | 'Babaanne'
  | 'Anneanne'
  | 'Ağabey'
  | 'Abla'
  | 'Amca'
  | 'Dayı'
  | 'Teyze'
  | 'Hala'
  | 'Vasi'
  | 'Diğer';

export type NotificationPreference = 'WhatsApp' | 'SMS' | 'Arama' | 'Bildirim İstemiyor';

export interface GuardianContact {
  id: string;
  fullName: string;
  phone: string;
  relation: GuardianRelation;
  notificationPreference: NotificationPreference;
  telegramChatId?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface StudentLevels {
  yuzune: string; // Örn: Elif-Ba, Cüz 4, Bakara 2. Cüz
  ezber: string; // Örn: Namaz Sureleri, Amme Cüzü, 5. Hizb
  tecvid: string; // Örn: Başlangıç, Orta, İleri
}

export interface Student {
  id: string;
  studentNo?: string;
  fullName: string;
  classId: string;
  programType: ProgramType;
  levels: StudentLevels;
  status: StudentStatus;
  birthYear?: string;
  enrollmentDate: string; // YYYY-MM-DD
  guardians: GuardianContact[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  id: string;
  fullName: string;
  title?: string; // Örn: Kur'an Kursu Öğreticisi, Hafızlık Hocası
  phone: string;
  email?: string;
  assignedClassIds: string[];
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

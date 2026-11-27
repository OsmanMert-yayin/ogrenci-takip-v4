import type { DayOfWeek, ScheduleEntry, TopicPoolItem } from '../types';
import { GENERAL_SCHEDULE_CLASS_ID } from '../types';

export function createDefaultTopicPool(): TopicPoolItem[] {
  const items: Omit<TopicPoolItem, 'id' | 'order' | 'isActive'>[] = [
    // Yüzüne
    {
      title: "Kur'an-ı Kerim (Sayfa ve Cüz Takibi)",
      category: 'Yüzüne',
      subGroup: 'Sayfa ve Cüz Takibi',
      pageRange: '1-604',
    },
    {
      title: 'Elif-Ba (Harfler, Harekeler ve Birleştirme)',
      category: 'Yüzüne',
      subGroup: 'Başlangıç',
    },
    {
      title: 'Hatim Okuma ve Akıcılık Çalışması',
      category: 'Yüzüne',
      subGroup: 'Sayfa ve Cüz Takibi',
    },

    // Ezber — Sureler
    { title: 'Fatiha Suresi', category: 'Ezber', subGroup: 'Sureler', cuzNo: 1 },
    { title: 'Fil – Nas Sureleri (Namaz Sureleri)', category: 'Ezber', subGroup: 'Sureler', cuzNo: 30 },
    { title: 'Nebe – Duha Sureleri (30. Cüz İlk Bölüm)', category: 'Ezber', subGroup: 'Sureler', cuzNo: 30 },
    { title: 'İnşirah – Asr Sureleri (30. Cüz Orta Bölüm)', category: 'Ezber', subGroup: 'Sureler', cuzNo: 30 },
    { title: 'Yasin Suresi', category: 'Ezber', subGroup: 'Sureler', cuzNo: 22 },
    { title: 'Mülk (Tebareke) Suresi', category: 'Ezber', subGroup: 'Sureler', cuzNo: 29 },
    { title: 'Fetih Suresi', category: 'Ezber', subGroup: 'Sureler', cuzNo: 26 },
    { title: 'Rahman Suresi', category: 'Ezber', subGroup: 'Sureler', cuzNo: 27 },
    { title: 'Vakıa Suresi', category: 'Ezber', subGroup: 'Sureler', cuzNo: 27 },

    // Ezber — Dualar & Ayetler
    {
      title: 'Namaz Duaları (Sübhaneke, Ettehiyyatü, Salli-Barik, Rabbena, Kunut)',
      category: 'Ezber',
      subGroup: 'Dualar & Ayetler',
    },
    { title: 'Ezan Duası ve Kamet', category: 'Ezber', subGroup: 'Dualar & Ayetler' },
    { title: 'Ayetel Kürsi (Bakara 255)', category: 'Ezber', subGroup: 'Dualar & Ayetler', cuzNo: 3 },
    { title: 'Amenerrasulü (Bakara 285-286)', category: 'Ezber', subGroup: 'Dualar & Ayetler', cuzNo: 3 },
    { title: 'Hüvallahüllezi (Haşr 22-24)', category: 'Ezber', subGroup: 'Dualar & Ayetler', cuzNo: 28 },

    // Ezber — Toplu Cüz Seçenekleri
    {
      title: '30. Cüz (Tamamı - Amme Cüzü)',
      category: 'Ezber',
      subGroup: 'Toplu Cüz Seçenekleri',
      cuzNo: 30,
      pageRange: '582-604',
    },
    {
      title: '29. Cüz (Tamamı - Tebareke Cüzü)',
      category: 'Ezber',
      subGroup: 'Toplu Cüz Seçenekleri',
      cuzNo: 29,
      pageRange: '562-581',
    },
    {
      title: '1–30. Cüz Tamamı',
      category: 'Ezber',
      subGroup: 'Toplu Cüz Seçenekleri',
      pageRange: '1-604',
    },

    // Talim Tecvid — Mahreçler (Tashih-i Huruf)
    {
      title: 'Mahreçler ve Harflerin Çıkış Yerleri',
      category: 'Talim Tecvid',
      subGroup: 'Mahreçler (Tashih-i Huruf)',
    },
    {
      title: 'Kalın, İnce ve Peltek Harfler (Tashih-i Huruf)',
      category: 'Talim Tecvid',
      subGroup: 'Mahreçler (Tashih-i Huruf)',
    },

    // Talim Tecvid — Tecvid Kuralları
    { title: 'İzhar', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    { title: 'İdğam-ı Meal Gunne', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    { title: 'İdğam-ı Bila Gunne', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    { title: 'İklab', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    { title: 'İhfa', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    { title: 'İdğam-ı Misleyn', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    { title: 'İdğam-ı Mütecaniseyn', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    { title: 'İdğam-ı Mütekaribeyn', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    { title: 'İzhar-ı Şefevi', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    { title: 'Kalkale', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    {
      title: 'Medler (Tabii, Muttasıl, Munfasıl, Lazım, Arız, Lin)',
      category: 'Talim Tecvid',
      subGroup: 'Tecvid Kuralları',
    },
    { title: "Ra'nın Hükümleri", category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    { title: 'Lafzatullah', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },
    { title: 'Sekte', category: 'Talim Tecvid', subGroup: 'Tecvid Kuralları' },

    // Temel Dini Bilgiler
    { title: 'İtikad / Akaid (İmanın Şartları ve Esma-i Hüsna)', category: 'Temel Dini Bilgiler', subGroup: 'İtikad / Akaid' },
    { title: 'İbadet / Fıkıh (Taharet, Abdest, Namaz, Oruç)', category: 'Temel Dini Bilgiler', subGroup: 'İbadet / Fıkıh' },
    { title: 'Siyer (Peygamber Efendimizin Hayatı)', category: 'Temel Dini Bilgiler', subGroup: 'Siyer' },
    { title: 'Ahlak (Edep, Anne-Baba Hakkı ve Doğruluk)', category: 'Temel Dini Bilgiler', subGroup: 'Ahlak' },

    // Sosyal Etkinlik
    { title: 'Kitap Okuma ve Değerler Sohbeti', category: 'Sosyal Etkinlik', subGroup: 'Kültürel' },
    { title: 'Sportif ve Grup Etkinliği', category: 'Sosyal Etkinlik', subGroup: 'Sosyal' },

    // Hafızlık
    { title: 'Yeni Sayfa (Çiğ Ders Dinleme)', category: 'Hafızlık', subGroup: 'Günlük Ders' },
    { title: 'Has / Tekrar (Dönüş Cüzü)', category: 'Hafızlık', subGroup: 'Tekrar' },
    { title: 'Cüz Tamamlama Dinletisi', category: 'Hafızlık', subGroup: 'Cüz Takibi' },
  ];

  return items.map((item, idx) => ({
    ...item,
    id: `top_seed_${idx + 1}`,
    order: idx + 1,
    isActive: true,
  }));
}

export function createDefaultSchedule(termId: string): ScheduleEntry[] {
  const weekdays: DayOfWeek[] = [1, 2, 3, 4, 5];
  const entries: ScheduleEntry[] = [];

  for (const day of weekdays) {
    entries.push(
      {
        id: `sch_gen_${day}_etut1`,
        termId,
        classId: GENERAL_SCHEDULE_CLASS_ID,
        dayOfWeek: day,
        lessonSlotId: 'slot_etut_1',
        subjectName: 'Mütalaa',
        defaultTopic: 'Sabah hazırlık ve tekrar',
        requirement: 'zorunlu',
      },
      {
        id: `sch_gen_${day}_d1`,
        termId,
        classId: GENERAL_SCHEDULE_CLASS_ID,
        dayOfWeek: day,
        lessonSlotId: 'slot_ders_1',
        subjectName: 'Yüzüne',
        defaultTopic: "Kur'an-ı Kerim (Sayfa ve Cüz Takibi)",
        requirement: 'zorunlu',
      },
      {
        id: `sch_gen_${day}_d2`,
        termId,
        classId: GENERAL_SCHEDULE_CLASS_ID,
        dayOfWeek: day,
        lessonSlotId: 'slot_ders_2',
        subjectName: 'Ezber',
        defaultTopic: day === 5 ? 'Haftalık Ezber Tekrarı' : 'Sureler ve Namaz Duaları',
        requirement: 'zorunlu',
      },
      {
        id: `sch_gen_${day}_d3`,
        termId,
        classId: GENERAL_SCHEDULE_CLASS_ID,
        dayOfWeek: day,
        lessonSlotId: 'slot_ders_3',
        subjectName: day === 5 ? 'Sosyal Etkinlik' : 'Talim Tecvid',
        defaultTopic: day === 5 ? 'Değerler Sohbeti' : 'Mahreçler ve Tecvid Kuralları',
        requirement: day === 5 ? 'secmeli' : 'zorunlu',
      },
      {
        id: `sch_gen_${day}_etut2`,
        termId,
        classId: GENERAL_SCHEDULE_CLASS_ID,
        dayOfWeek: day,
        lessonSlotId: 'slot_etut_2',
        subjectName: 'Mütalaa',
        defaultTopic: 'Öğle etüt çalışması',
        requirement: 'secmeli',
      },
      {
        id: `sch_gen_${day}_d4`,
        termId,
        classId: GENERAL_SCHEDULE_CLASS_ID,
        dayOfWeek: day,
        lessonSlotId: 'slot_ders_4',
        subjectName: 'Temel Dini Bilgiler',
        defaultTopic: day % 2 === 0 ? 'İbadet / Fıkıh' : 'İtikad / Akaid & Siyer',
        requirement: 'zorunlu',
      }
    );
  }

  return entries;
}

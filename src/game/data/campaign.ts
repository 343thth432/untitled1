export interface ChapterDef {
  id: number;
  name: string;
  subtitle: string;
  bg: [string, string];
  accent: string;
}

export const STAGES_PER_CHAPTER = 12;

export const CHAPTERS: ChapterDef[] = [
  { id: 1, name: 'Пепельные Врата', subtitle: 'Там, где всё началось', bg: ['#3a1220', '#0a0710'], accent: '#ff6b4a' },
  { id: 2, name: 'Тихая Гавань', subtitle: 'Вода помнит имена', bg: ['#0f2a3d', '#070a14'], accent: '#4fb8ff' },
  { id: 3, name: 'Роща Шёпотов', subtitle: 'Не отвечай деревьям', bg: ['#12301f', '#060d0a'], accent: '#68e08a' },
  { id: 4, name: 'Стеклянная Пустошь', subtitle: 'Песок под ногами звенит', bg: ['#33291a', '#0d0a08'], accent: '#ffc857' },
  { id: 5, name: 'Лунный Разлом', subtitle: 'Небо треснуло здесь', bg: ['#241a3d', '#0a0714'], accent: '#a06bff' },
  { id: 6, name: 'Хребет Затмения', subtitle: 'Выше только тьма', bg: ['#2b1b2e', '#0b0710'], accent: '#ff5ea8' },
  { id: 7, name: 'Затопленный Храм', subtitle: 'Молитвы всплывают', bg: ['#0d2c33', '#050d10'], accent: '#4fe3ff' },
  { id: 8, name: 'Сад Костяных Лоз', subtitle: 'Цветёт круглый год', bg: ['#1f2c18', '#080d06'], accent: '#9ae66e' },
  { id: 9, name: 'Цитадель Зари', subtitle: 'Последний свет', bg: ['#38300f', '#100d05'], accent: '#ffe07a' },
  { id: 10, name: 'Полночный Двор', subtitle: 'Здесь танцуют тени', bg: ['#1d1435', '#080614'], accent: '#b57cff' },
  { id: 11, name: 'Обсерватория Пустоты', subtitle: 'Звёзды смотрят в ответ', bg: ['#151a3a', '#060814'], accent: '#7f8fff' },
  { id: 12, name: 'Око Затмения', subtitle: 'Оно моргнуло', bg: ['#2f0d1c', '#0c050a'], accent: '#ff2e63' },
];

export const TOTAL_STAGES = CHAPTERS.length * STAGES_PER_CHAPTER;

export interface StageInfo {
  index: number;
  chapter: ChapterDef;
  stage: number;
  label: string;
  boss: boolean;
  elite: boolean;
}

export function stageInfo(index: number): StageInfo {
  const clamped = Math.max(0, Math.min(TOTAL_STAGES - 1, index));
  const ch = Math.floor(clamped / STAGES_PER_CHAPTER);
  const st = clamped % STAGES_PER_CHAPTER;
  return {
    index: clamped,
    chapter: CHAPTERS[ch],
    stage: st + 1,
    label: `${ch + 1}-${st + 1}`,
    boss: st === STAGES_PER_CHAPTER - 1,
    elite: st === 5,
  };
}

/** Условная «сила» этапа — по ней растут враги и офлайн-доход */
export function stagePower(index: number): number {
  return 1 + index * 0.11 + Math.pow(index / 14, 2.1);
}

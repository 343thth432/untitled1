export interface ChapterDef {
  id: number;
  name: string;
  subtitle: string;
  bg: [string, string];
  accent: string;
}

export const STAGES_PER_CHAPTER = 12;

export const CHAPTERS: ChapterDef[] = [
  { id: 1, name: 'Пепельные Врата', subtitle: 'Там, где всё началось', bg: ['#ffe4e0', '#fdf2f6'], accent: '#ff6b4a' },
  { id: 2, name: 'Тихая Гавань', subtitle: 'Вода помнит имена', bg: ['#dff0ff', '#eef6fd'], accent: '#4fb8ff' },
  { id: 3, name: 'Роща Шёпотов', subtitle: 'Не отвечай деревьям', bg: ['#e0f7e6', '#f0fbf2'], accent: '#68e08a' },
  { id: 4, name: 'Стеклянная Пустошь', subtitle: 'Песок под ногами звенит', bg: ['#fff0d6', '#fdf7ec'], accent: '#ffc857' },
  { id: 5, name: 'Лунный Разлом', subtitle: 'Небо треснуло здесь', bg: ['#ece4ff', '#f4f0fd'], accent: '#a06bff' },
  { id: 6, name: 'Хребет Затмения', subtitle: 'Выше только тьма', bg: ['#ffe2f0', '#fdf0f7'], accent: '#ff5ea8' },
  { id: 7, name: 'Затопленный Храм', subtitle: 'Молитвы всплывают', bg: ['#dbf5f8', '#eefafc'], accent: '#4fe3ff' },
  { id: 8, name: 'Сад Костяных Лоз', subtitle: 'Цветёт круглый год', bg: ['#e8f6d9', '#f4fbee'], accent: '#9ae66e' },
  { id: 9, name: 'Цитадель Зари', subtitle: 'Последний свет', bg: ['#fff6d8', '#fdfaee'], accent: '#ffe07a' },
  { id: 10, name: 'Полночный Двор', subtitle: 'Здесь танцуют тени', bg: ['#efe4ff', '#f6f1fd'], accent: '#b57cff' },
  { id: 11, name: 'Обсерватория Пустоты', subtitle: 'Звёзды смотрят в ответ', bg: ['#e2e6ff', '#f1f3fd'], accent: '#7f8fff' },
  { id: 12, name: 'Око Затмения', subtitle: 'Оно моргнуло', bg: ['#ffe0e6', '#fdf0f3'], accent: '#ff2e63' },
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

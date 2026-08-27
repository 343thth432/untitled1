import type { Element, FloorId, FoeDef, Intent, Portrait } from '../types';
import { HERO_BY_ID } from './heroes';

/** тень путницы: тот же огонёк в глазах, но выцветший и холодный */
function shade(baseId: string, tint: string, over: Partial<Portrait> = {}): Portrait {
  const b = HERO_BY_ID[baseId].portrait;
  return {
    aura: tint,
    eyes: mixHex(b.eyes, tint, 0.55),
    ...over,
  };
}

function mixHex(a: string, b: string, k: number): string {
  const p = (h: string): [number, number, number] => {
    const s = h.replace('#', '');
    const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const m = (x: number, y: number): number => Math.round(x + (y - x) * k);
  return `#${((1 << 24) + (m(r1, r2) << 16) + (m(g1, g2) << 8) + m(b1, b2)).toString(16).slice(1)}`;
}

const strike = (v: number, hits = 1): Intent => ({
  kind: 'strike',
  v,
  hits,
  label: hits > 1 ? `${v}×${hits}` : `${v}`,
});
const guard = (block: number): Intent => ({ kind: 'guard', block, label: `${block}` });
function cursed(id: 'weak' | 'frail' | 'burn' | 'bleed', v: number): Intent {
  const names = { weak: 'слабость', frail: 'надлом', burn: 'ожог', bleed: 'кровь' };
  return { kind: 'curse', status: { who: 'foe', id, v }, label: names[id] };
}
const buff = (id: 'might' | 'grace' | 'thorns', v: number): Intent => ({
  kind: 'buff',
  status: { who: 'self', id, v },
  label: id === 'might' ? `+${v} силы` : id === 'grace' ? `+${v} плавности` : `+${v} шипов`,
});

const RAW: FoeDef[] = [
  // ── рядовые ──
  {
    id: 'mourner', name: 'Плакальщица', title: 'тень с обочины', tier: 'foe', element: 'umbra', hp: 42,
    portrait: shade('rei', '#8b6fd6'), where: ['crypt', 'catacomb'], count: 2,
    pattern: [[strike(6)], [strike(4, 2)], [cursed('weak', 2)], [strike(8)]],
  },
  {
    id: 'strayhound', name: 'Бродячая свора', title: 'голодные тени', tier: 'foe', element: 'verdant', hp: 38,
    portrait: shade('koharu', '#5fbf7a'), where: ['crypt', 'catacomb'], count: 3,
    pattern: [[strike(3, 3)], [guard(5), strike(3)], [strike(3, 3)]],
  },
  {
    id: 'saltwidow', name: 'Соляная вдова', title: 'иссохшая', tier: 'foe', element: 'lumen', hp: 46,
    portrait: shade('hikari', '#d8b45c'), where: ['sanctum'],
    pattern: [[cursed('frail', 2)], [strike(9)], [guard(7), strike(4)]],
  },
  {
    id: 'rainwarden', name: 'Дождевая стража', title: 'стоит на посту', tier: 'foe', element: 'tide', hp: 52,
    portrait: shade('seira', '#5aa8d8'), where: ['catacomb'], count: 2,
    pattern: [[guard(9)], [strike(7)], [guard(9), strike(3)], [strike(5, 2)]],
  },
  {
    id: 'emberkin', name: 'Углеродная', title: 'дышит жаром', tier: 'foe', element: 'flame', hp: 40,
    portrait: shade('akane', '#e2703f'), where: ['crypt', 'sanctum'],
    pattern: [[strike(5), cursed('burn', 3)], [strike(8)], [buff('might', 2)]],
  },
  {
    id: 'thornmaid', name: 'Терновница', title: 'вросла в дорогу', tier: 'foe', element: 'verdant', hp: 55,
    portrait: shade('midori', '#57a86b'), where: ['crypt', 'catacomb'],
    pattern: [[buff('thorns', 3), guard(5)], [strike(8)], [strike(4, 2)]],
  },
  {
    id: 'lampkeeper', name: 'Фонарщица', title: 'светит не тебе', tier: 'foe', element: 'lumen', hp: 48,
    portrait: shade('ame', '#d9bf6a'), where: ['catacomb'], count: 2,
    pattern: [[strike(6), cursed('weak', 1)], [guard(8)], [strike(10)]],
  },
  {
    id: 'undertowgirl', name: 'Утопленница', title: 'тянет за собой', tier: 'foe', element: 'tide', hp: 44,
    portrait: shade('yuki', '#6ea8cc'), where: ['catacomb', 'sanctum'],
    pattern: [[strike(4, 2)], [cursed('frail', 2), guard(5)], [strike(9)]],
  },

  // ── элита ──
  {
    id: 'roadjudge', name: 'Судья дороги', title: 'взвешивает шаги', tier: 'elite', element: 'lumen', hp: 86,
    portrait: shade('sora', '#e6cf7a'), where: ['crypt', 'catacomb', 'sanctum'],
    pattern: [[strike(8), cursed('frail', 2)], [guard(11), buff('might', 2)], [strike(6, 3)], [strike(13)]],
  },
  {
    id: 'ashqueen', name: 'Пепельная владычица', title: 'жжёт молча', tier: 'elite', element: 'flame', hp: 80,
    portrait: shade('honoka', '#e0672f', { horns: true }), where: ['crypt', 'sanctum'],
    pattern: [[strike(7), cursed('burn', 4)], [buff('might', 3)], [strike(5, 3)], [strike(13), cursed('burn', 3)]],
  },
  {
    id: 'deepmother', name: 'Мать глубин', title: 'помнит все реки', tier: 'elite', element: 'tide', hp: 94,
    portrait: shade('mitsuki', '#4f95c9'), where: ['catacomb'],
    pattern: [[guard(14)], [strike(11)], [cursed('weak', 3), guard(9)], [strike(6, 3)]],
  },
  {
    id: 'brambleknight', name: 'Терновый рыцарь', title: 'не сходит с пути', tier: 'elite', element: 'verdant', hp: 88,
    portrait: shade('tsubaki', '#4f9c63'), where: ['crypt', 'catacomb'],
    pattern: [[buff('thorns', 5), guard(11)], [strike(12)], [strike(5, 3)], [buff('might', 3), guard(9)]],
  },

  // ── хранители отрезков ──
  {
    id: 'fogkeeper', name: 'Хранитель тумана', title: 'первый порог', tier: 'boss', element: 'umbra', hp: 120,
    portrait: shade('kuro', '#9a72e6', { horns: true }), where: ['crypt'],
    pattern: [
      [strike(7), cursed('weak', 2)],
      [guard(10)],
      [strike(4, 3)],
      [strike(14)],
      [cursed('frail', 2), strike(5, 2)],
    ],
  },
  {
    id: 'stormrider', name: 'Всадница ливня', title: 'второй порог', tier: 'boss', element: 'tide', hp: 150,
    portrait: shade('yuna', '#4f8fd6', { horns: true }), where: ['catacomb'],
    pattern: [
      [strike(5, 3)],
      [guard(14), cursed('frail', 2)],
      [buff('might', 2), strike(8)],
      [strike(16)],
      [guard(10), strike(6, 2)],
    ],
  },
  {
    id: 'saltcrown', name: 'Соляная корона', title: 'конец дороги', tier: 'boss', element: 'lumen', hp: 205,
    portrait: shade('neko', '#e8d089', { horns: true }), where: ['sanctum'],
    pattern: [
      [strike(10), cursed('frail', 2)],
      [buff('might', 3), guard(14)],
      [strike(7, 3)],
      [cursed('weak', 2), strike(13)],
      [strike(23)],
    ],
  },
];

export const FOES: Record<string, FoeDef> = Object.fromEntries(RAW.map((f) => [f.id, f]));

export function foePool(tier: 'foe' | 'elite', floor: FloorId): string[] {
  const ids = RAW.filter((f) => f.tier === tier && f.where.includes(floor)).map((f) => f.id);
  return ids.length ? ids : RAW.filter((f) => f.tier === tier).map((f) => f.id);
}

export function bossFor(floor: FloorId): string {
  const b = RAW.find((f) => f.tier === 'boss' && f.where.includes(floor));
  return b ? b.id : RAW.find((f) => f.tier === 'boss')!.id;
}

export type { Element };

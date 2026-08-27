import type { Appearance, Element, FoeDef, Intent } from '../types';
import { HERO_BY_ID } from './heroes';

/** тень путницы: тот же силуэт, но выцветший и холодный */
function shade(baseId: string, tint: string, over: Partial<Appearance> = {}): Appearance {
  const b = HERO_BY_ID[baseId].look;
  return {
    ...b,
    hairColor: mixHex(b.hairColor, tint, 0.5),
    hairColor2: mixHex(b.hairColor2, tint, 0.6),
    eyeColor: tint,
    skin: mixHex(b.skin, '#9aa3b8', 0.4),
    outfit: mixHex(b.outfit, '#1b1a2a', 0.55),
    outfitTrim: tint,
    aura: tint,
    mood: 0.05,
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
    look: shade('rei', '#8b6fd6'), where: ['mist', 'city'],
    pattern: [[strike(7)], [strike(5, 2)], [cursed('weak', 2)], [strike(9)]],
  },
  {
    id: 'strayhound', name: 'Бродячая свора', title: 'голодные тени', tier: 'foe', element: 'verdant', hp: 38,
    look: shade('koharu', '#5fbf7a'), where: ['mist', 'steppe'],
    pattern: [[strike(4, 3)], [guard(6), strike(4)], [strike(4, 3)]],
  },
  {
    id: 'saltwidow', name: 'Соляная вдова', title: 'иссохшая', tier: 'foe', element: 'lumen', hp: 46,
    look: shade('hikari', '#d8b45c'), where: ['salt'],
    pattern: [[cursed('frail', 2)], [strike(11)], [guard(8), strike(5)]],
  },
  {
    id: 'rainwarden', name: 'Дождевая стража', title: 'стоит на посту', tier: 'foe', element: 'tide', hp: 52,
    look: shade('seira', '#5aa8d8'), where: ['steppe', 'city'],
    pattern: [[guard(10)], [strike(8)], [guard(10), strike(4)], [strike(6, 2)]],
  },
  {
    id: 'emberkin', name: 'Углеродная', title: 'дышит жаром', tier: 'foe', element: 'flame', hp: 40,
    look: shade('akane', '#e2703f'), where: ['mist', 'salt'],
    pattern: [[strike(6), cursed('burn', 3)], [strike(9)], [buff('might', 2)]],
  },
  {
    id: 'thornmaid', name: 'Терновница', title: 'вросла в дорогу', tier: 'foe', element: 'verdant', hp: 55,
    look: shade('midori', '#57a86b'), where: ['mist', 'steppe'],
    pattern: [[buff('thorns', 3), guard(6)], [strike(10)], [strike(5, 2)]],
  },
  {
    id: 'lampkeeper', name: 'Фонарщица', title: 'светит не тебе', tier: 'foe', element: 'lumen', hp: 48,
    look: shade('ame', '#d9bf6a'), where: ['city'],
    pattern: [[strike(7), cursed('weak', 1)], [guard(9)], [strike(12)]],
  },
  {
    id: 'undertowgirl', name: 'Утопленница', title: 'тянет за собой', tier: 'foe', element: 'tide', hp: 44,
    look: shade('yuki', '#6ea8cc'), where: ['steppe', 'salt'],
    pattern: [[strike(5, 2)], [cursed('frail', 2), guard(6)], [strike(11)]],
  },

  // ── элита ──
  {
    id: 'roadjudge', name: 'Судья дороги', title: 'взвешивает шаги', tier: 'elite', element: 'lumen', hp: 96,
    look: shade('sora', '#e6cf7a', { accessory: 'crown' }), where: ['mist', 'steppe', 'salt', 'city'],
    pattern: [[strike(9), cursed('frail', 2)], [guard(12), buff('might', 2)], [strike(7, 3)], [strike(16)]],
  },
  {
    id: 'ashqueen', name: 'Пепельная владычица', title: 'жжёт молча', tier: 'elite', element: 'flame', hp: 88,
    look: shade('honoka', '#e0672f', { accessory: 'horns' }), where: ['mist', 'salt'],
    pattern: [[strike(8), cursed('burn', 4)], [buff('might', 3)], [strike(6, 3)], [strike(15), cursed('burn', 3)]],
  },
  {
    id: 'deepmother', name: 'Мать глубин', title: 'помнит все реки', tier: 'elite', element: 'tide', hp: 104,
    look: shade('mitsuki', '#4f95c9', { accessory: 'veil' }), where: ['steppe', 'city'],
    pattern: [[guard(16)], [strike(13)], [cursed('weak', 3), guard(10)], [strike(7, 3)]],
  },
  {
    id: 'brambleknight', name: 'Терновый рыцарь', title: 'не сходит с пути', tier: 'elite', element: 'verdant', hp: 110,
    look: shade('tsubaki', '#4f9c63', { accessory: 'visor' }), where: ['mist', 'steppe'],
    pattern: [[buff('thorns', 5), guard(12)], [strike(14)], [strike(6, 3)], [buff('might', 3), guard(10)]],
  },

  // ── хранители отрезков ──
  {
    id: 'fogkeeper', name: 'Хранитель тумана', title: 'первый порог', tier: 'boss', element: 'umbra', hp: 165,
    look: shade('kuro', '#9a72e6', { accessory: 'horns', cape: true }), where: ['mist'],
    pattern: [
      [strike(10), cursed('weak', 2)],
      [guard(14), buff('might', 3)],
      [strike(6, 4)],
      [strike(20)],
      [cursed('frail', 3), strike(8, 2)],
    ],
  },
  {
    id: 'stormrider', name: 'Всадница ливня', title: 'второй порог', tier: 'boss', element: 'tide', hp: 205,
    look: shade('yuna', '#4f8fd6', { accessory: 'crown', cape: true }), where: ['steppe'],
    pattern: [
      [strike(8, 3)],
      [guard(20), cursed('frail', 3)],
      [buff('might', 4), strike(10)],
      [strike(26)],
      [guard(16), strike(9, 2)],
    ],
  },
  {
    id: 'saltcrown', name: 'Соляная корона', title: 'конец дороги', tier: 'boss', element: 'lumen', hp: 255,
    look: shade('neko', '#e8d089', { accessory: 'halo', cape: true }), where: ['salt', 'city'],
    pattern: [
      [strike(12), cursed('frail', 2)],
      [buff('might', 4), guard(18)],
      [strike(9, 4)],
      [cursed('weak', 3), strike(16)],
      [strike(32)],
    ],
  },
];

export const FOES: Record<string, FoeDef> = Object.fromEntries(RAW.map((f) => [f.id, f]));

export function foePool(biome: string, tier: 'foe' | 'elite'): string[] {
  const ids = RAW.filter((f) => f.tier === tier && f.where.includes(biome as never)).map((f) => f.id);
  return ids.length ? ids : RAW.filter((f) => f.tier === tier).map((f) => f.id);
}

export function bossFor(biome: string): string {
  const b = RAW.find((f) => f.tier === 'boss' && f.where.includes(biome as never));
  return b ? b.id : 'fogkeeper';
}

export type { Element };

import type { CardDef, Element } from '../types';

/**
 * Карты. Базовые есть у всех, остальные падают в наградах.
 * Улучшенная версия карты — отдельная запись с суффиксом «+».
 */
const RAW: CardDef[] = [
  // ── базовые ──
  {
    id: 'strike', name: 'Удар', type: 'attack', cost: 1, element: null, rare: 'base',
    text: 'Наносит {0} урона.', effects: [{ t: 'damage', v: 6 }], up: 'strike+', anim: 'attack',
  },
  {
    id: 'strike+', name: 'Удар+', type: 'attack', cost: 1, element: null, rare: 'base',
    text: 'Наносит {0} урона.', effects: [{ t: 'damage', v: 9 }], anim: 'attack',
  },
  {
    id: 'guard', name: 'Заслон', type: 'guard', cost: 1, element: null, rare: 'base',
    text: 'Даёт {0} блока.', effects: [{ t: 'block', v: 5 }], up: 'guard+',
  },
  {
    id: 'guard+', name: 'Заслон+', type: 'guard', cost: 1, element: null, rare: 'base',
    text: 'Даёт {0} блока.', effects: [{ t: 'block', v: 8 }],
  },

  // ── пламя ──
  {
    id: 'ember', name: 'Уголёк', type: 'attack', cost: 1, element: 'flame', rare: 'common',
    text: 'Наносит {0} урона и накладывает {1} ожога.',
    effects: [{ t: 'damage', v: 5 }, { t: 'status', who: 'foe', id: 'burn', v: 3 }], up: 'ember+', anim: 'attack',
  },
  {
    id: 'ember+', name: 'Уголёк+', type: 'attack', cost: 1, element: 'flame', rare: 'common',
    text: 'Наносит {0} урона и накладывает {1} ожога.',
    effects: [{ t: 'damage', v: 7 }, { t: 'status', who: 'foe', id: 'burn', v: 5 }], anim: 'attack',
  },
  {
    id: 'flurry', name: 'Росчерк', type: 'attack', cost: 1, element: 'flame', rare: 'common',
    text: 'Наносит {0} урона {1} раза.', effects: [{ t: 'damage', v: 4, hits: 3 }], up: 'flurry+', anim: 'attack',
  },
  {
    id: 'flurry+', name: 'Росчерк+', type: 'attack', cost: 1, element: 'flame', rare: 'common',
    text: 'Наносит {0} урона {1} раза.', effects: [{ t: 'damage', v: 5, hits: 4 }], anim: 'attack',
  },
  {
    id: 'pyre', name: 'Костёр', type: 'art', cost: 2, element: 'flame', rare: 'rare',
    text: 'Даёт {0} силы и накладывает на себя {1} ожога.',
    effects: [{ t: 'status', who: 'self', id: 'might', v: 3 }, { t: 'status', who: 'self', id: 'burn', v: 3 }],
    up: 'pyre+', anim: 'cast',
  },
  {
    id: 'pyre+', name: 'Костёр+', type: 'art', cost: 2, element: 'flame', rare: 'rare',
    text: 'Даёт {0} силы и накладывает на себя {1} ожога.',
    effects: [{ t: 'status', who: 'self', id: 'might', v: 5 }, { t: 'status', who: 'self', id: 'burn', v: 2 }], anim: 'cast',
  },
  {
    id: 'ashfall', name: 'Пеплопад', type: 'attack', cost: 2, element: 'flame', rare: 'rare',
    text: 'Наносит {0} урона за каждый ожог на противнике.',
    effects: [{ t: 'perStatus', id: 'burn', who: 'foe', damage: 3 }], up: 'ashfall+', anim: 'attack',
  },
  {
    id: 'ashfall+', name: 'Пеплопад+', type: 'attack', cost: 2, element: 'flame', rare: 'rare',
    text: 'Наносит {0} урона за каждый ожог на противнике.',
    effects: [{ t: 'perStatus', id: 'burn', who: 'foe', damage: 5 }], anim: 'attack',
  },

  // ── прилив ──
  {
    id: 'undertow', name: 'Отбойник', type: 'guard', cost: 1, element: 'tide', rare: 'common',
    text: 'Даёт {0} блока и {1} слабости противнику.',
    effects: [{ t: 'block', v: 5 }, { t: 'status', who: 'foe', id: 'weak', v: 1 }], up: 'undertow+',
  },
  {
    id: 'undertow+', name: 'Отбойник+', type: 'guard', cost: 1, element: 'tide', rare: 'common',
    text: 'Даёт {0} блока и {1} слабости противнику.',
    effects: [{ t: 'block', v: 8 }, { t: 'status', who: 'foe', id: 'weak', v: 2 }],
  },
  {
    id: 'ripple', name: 'Круги по воде', type: 'art', cost: 1, element: 'tide', rare: 'common',
    text: 'Берёшь {0} карты.', effects: [{ t: 'draw', v: 2 }], up: 'ripple+', anim: 'cast',
  },
  {
    id: 'ripple+', name: 'Круги по воде+', type: 'art', cost: 0, element: 'tide', rare: 'common',
    text: 'Берёшь {0} карты.', effects: [{ t: 'draw', v: 2 }], anim: 'cast',
  },
  {
    id: 'tidewall', name: 'Стена прилива', type: 'guard', cost: 2, element: 'tide', rare: 'rare',
    text: 'Даёт {0} блока. Удваивает весь блок.',
    effects: [{ t: 'block', v: 8 }, { t: 'doubleBlock' }], up: 'tidewall+',
  },
  {
    id: 'tidewall+', name: 'Стена прилива+', type: 'guard', cost: 2, element: 'tide', rare: 'rare',
    text: 'Даёт {0} блока. Удваивает весь блок.',
    effects: [{ t: 'block', v: 12 }, { t: 'doubleBlock' }],
  },
  {
    id: 'crash', name: 'Обвал волны', type: 'attack', cost: 2, element: 'tide', rare: 'rare',
    text: 'Обращает весь блок в урон.', effects: [{ t: 'damage', v: 0, fromBlock: true }], up: 'crash+', anim: 'attack',
  },
  {
    id: 'crash+', name: 'Обвал волны+', type: 'attack', cost: 1, element: 'tide', rare: 'rare',
    text: 'Обращает весь блок в урон.', effects: [{ t: 'damage', v: 0, fromBlock: true }], anim: 'attack',
  },

  // ── лоза ──
  {
    id: 'thistle', name: 'Чертополох', type: 'guard', cost: 1, element: 'verdant', rare: 'common',
    text: 'Даёт {0} блока и {1} шипов.',
    effects: [{ t: 'block', v: 4 }, { t: 'status', who: 'self', id: 'thorns', v: 2 }], up: 'thistle+',
  },
  {
    id: 'thistle+', name: 'Чертополох+', type: 'guard', cost: 1, element: 'verdant', rare: 'common',
    text: 'Даёт {0} блока и {1} шипов.',
    effects: [{ t: 'block', v: 6 }, { t: 'status', who: 'self', id: 'thorns', v: 3 }],
  },
  {
    id: 'sap', name: 'Живица', type: 'art', cost: 1, element: 'verdant', rare: 'common',
    text: 'Даёт {0} истока.', effects: [{ t: 'status', who: 'self', id: 'regen', v: 4 }], up: 'sap+', anim: 'cast',
  },
  {
    id: 'sap+', name: 'Живица+', type: 'art', cost: 1, element: 'verdant', rare: 'common',
    text: 'Даёт {0} истока.', effects: [{ t: 'status', who: 'self', id: 'regen', v: 7 }], anim: 'cast',
  },
  {
    id: 'bindroot', name: 'Путы корней', type: 'art', cost: 2, element: 'verdant', rare: 'rare',
    text: 'Противник пропускает {0} ход.', effects: [{ t: 'status', who: 'foe', id: 'root', v: 1 }], up: 'bindroot+', anim: 'cast',
  },
  {
    id: 'bindroot+', name: 'Путы корней+', type: 'art', cost: 1, element: 'verdant', rare: 'rare',
    text: 'Противник пропускает {0} ход.', effects: [{ t: 'status', who: 'foe', id: 'root', v: 1 }], anim: 'cast',
  },
  {
    id: 'bloom', name: 'Цветение', type: 'art', cost: 2, element: 'verdant', rare: 'rare',
    text: 'Даёт {0} плавности и лечит {1}.',
    effects: [{ t: 'status', who: 'self', id: 'grace', v: 2 }, { t: 'heal', v: 6 }], up: 'bloom+', anim: 'cast',
  },
  {
    id: 'bloom+', name: 'Цветение+', type: 'art', cost: 2, element: 'verdant', rare: 'rare',
    text: 'Даёт {0} плавности и лечит {1}.',
    effects: [{ t: 'status', who: 'self', id: 'grace', v: 3 }, { t: 'heal', v: 10 }], anim: 'cast',
  },

  // ── свет ──
  {
    id: 'glint', name: 'Проблеск', type: 'attack', cost: 0, element: 'lumen', rare: 'common',
    text: 'Наносит {0} урона.', effects: [{ t: 'damage', v: 4 }], up: 'glint+', anim: 'attack',
  },
  {
    id: 'glint+', name: 'Проблеск+', type: 'attack', cost: 0, element: 'lumen', rare: 'common',
    text: 'Наносит {0} урона.', effects: [{ t: 'damage', v: 7 }], anim: 'attack',
  },
  {
    id: 'dawn', name: 'Рассвет', type: 'art', cost: 1, element: 'lumen', rare: 'common',
    text: 'Лечит {0} и даёт {1} энергии.',
    effects: [{ t: 'heal', v: 5 }, { t: 'energy', v: 1 }], up: 'dawn+', anim: 'cast',
  },
  {
    id: 'dawn+', name: 'Рассвет+', type: 'art', cost: 1, element: 'lumen', rare: 'common',
    text: 'Лечит {0} и даёт {1} энергии.',
    effects: [{ t: 'heal', v: 9 }, { t: 'energy', v: 1 }], anim: 'cast',
  },
  {
    id: 'verdict', name: 'Приговор', type: 'attack', cost: 2, element: 'lumen', rare: 'rare',
    text: 'Наносит {0} урона и накладывает {1} надлома.',
    effects: [{ t: 'damage', v: 12 }, { t: 'status', who: 'foe', id: 'frail', v: 2 }], up: 'verdict+', anim: 'attack',
  },
  {
    id: 'verdict+', name: 'Приговор+', type: 'attack', cost: 2, element: 'lumen', rare: 'rare',
    text: 'Наносит {0} урона и накладывает {1} надлома.',
    effects: [{ t: 'damage', v: 17 }, { t: 'status', who: 'foe', id: 'frail', v: 3 }], anim: 'attack',
  },
  {
    id: 'halo', name: 'Нимб', type: 'art', cost: 1, element: 'lumen', rare: 'rare',
    text: 'Даёт {0} сосредоточения. Уходит из колоды.',
    effects: [{ t: 'status', who: 'self', id: 'focus', v: 1 }], exhaust: true, up: 'halo+', anim: 'cast',
  },
  {
    id: 'halo+', name: 'Нимб+', type: 'art', cost: 1, element: 'lumen', rare: 'rare',
    text: 'Даёт {0} сосредоточения. Уходит из колоды.',
    effects: [{ t: 'status', who: 'self', id: 'focus', v: 2 }], exhaust: true, anim: 'cast',
  },

  // ── тьма ──
  {
    id: 'nick', name: 'Надрез', type: 'attack', cost: 1, element: 'umbra', rare: 'common',
    text: 'Наносит {0} урона и накладывает {1} крови.',
    effects: [{ t: 'damage', v: 4 }, { t: 'status', who: 'foe', id: 'bleed', v: 3 }], up: 'nick+', anim: 'attack',
  },
  {
    id: 'nick+', name: 'Надрез+', type: 'attack', cost: 1, element: 'umbra', rare: 'common',
    text: 'Наносит {0} урона и накладывает {1} крови.',
    effects: [{ t: 'damage', v: 6 }, { t: 'status', who: 'foe', id: 'bleed', v: 4 }], anim: 'attack',
  },
  {
    id: 'veil', name: 'Покров', type: 'guard', cost: 1, element: 'umbra', rare: 'common',
    text: 'Даёт {0} блока. Берёшь {1} карту.',
    effects: [{ t: 'block', v: 4 }, { t: 'draw', v: 1 }], up: 'veil+',
  },
  {
    id: 'veil+', name: 'Покров+', type: 'guard', cost: 1, element: 'umbra', rare: 'common',
    text: 'Даёт {0} блока. Берёшь {1} карту.',
    effects: [{ t: 'block', v: 7 }, { t: 'draw', v: 1 }],
  },
  {
    id: 'eclipse', name: 'Затмение', type: 'art', cost: 2, element: 'umbra', rare: 'legend',
    text: 'Даёт {0} силы. Уходит из колоды.',
    effects: [{ t: 'status', who: 'self', id: 'might', v: 4 }], exhaust: true, up: 'eclipse+', anim: 'cast',
  },
  {
    id: 'eclipse+', name: 'Затмение+', type: 'art', cost: 2, element: 'umbra', rare: 'legend',
    text: 'Даёт {0} силы. Уходит из колоды.',
    effects: [{ t: 'status', who: 'self', id: 'might', v: 6 }], exhaust: true, anim: 'cast',
  },
  {
    id: 'reap', name: 'Жатва', type: 'attack', cost: 2, element: 'umbra', rare: 'rare',
    text: 'Наносит {0} урона за каждую каплю крови на противнике.',
    effects: [{ t: 'perStatus', id: 'bleed', who: 'foe', damage: 4 }], up: 'reap+', anim: 'attack',
  },
  {
    id: 'reap+', name: 'Жатва+', type: 'attack', cost: 2, element: 'umbra', rare: 'rare',
    text: 'Наносит {0} урона за каждую каплю крови на противнике.',
    effects: [{ t: 'perStatus', id: 'bleed', who: 'foe', damage: 6 }], anim: 'attack',
  },

  // ── тяготы: попадают в колоду из знамений ──
  {
    id: 'weight', name: 'Тягота', type: 'burden', cost: 1, element: null, rare: 'base',
    text: 'Ничего не делает.', effects: [],
  },
  {
    id: 'scar', name: 'Шрам', type: 'burden', cost: 0, element: null, rare: 'base',
    text: 'Отнимает {0} здоровья. Уходит из колоды.',
    effects: [{ t: 'heal', v: -3 }], exhaust: true,
  },
];

export const CARDS: Record<string, CardDef> = Object.fromEntries(RAW.map((c) => [c.id, c]));

/** карты, которые могут выпасть в награду за бой */
export function rewardPool(element: Element): string[] {
  return RAW.filter(
    (c) => c.rare !== 'base' && c.type !== 'burden' && !c.id.endsWith('+') && (c.element === element || c.element === null),
  ).map((c) => c.id);
}

/** любая небазовая карта — для торговца и редких наград */
export const ANY_POOL = RAW.filter(
  (c) => c.rare !== 'base' && c.type !== 'burden' && !c.id.endsWith('+'),
).map((c) => c.id);

/** подставляет числа в текст карты */
export function cardText(c: CardDef): string {
  const nums: number[] = [];
  for (const e of c.effects) {
    if (e.t === 'damage') {
      nums.push(e.v);
      if (e.hits) nums.push(e.hits);
    } else if (e.t === 'block' || e.t === 'draw' || e.t === 'energy' || e.t === 'heal' || e.t === 'discard') {
      nums.push(Math.abs(e.v));
    } else if (e.t === 'status') {
      nums.push(e.v);
    } else if (e.t === 'perStatus') {
      nums.push(e.damage);
    }
  }
  return c.text.replace(/\{(\d)\}/g, (_, i) => String(nums[Number(i)] ?? '?'));
}

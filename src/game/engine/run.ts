import type { Element, FloorId, Leg, NodeKind, RunNode, RunState } from '../types';
import { ANY_POOL, CARDS, rewardPool } from '../data/cards';
import { FOUND_POOL, RELICS } from '../data/relics';
import { OMEN_IDS } from '../data/omens';
import { bossFor, foePool } from '../data/foes';
import { HERO_BY_ID } from '../data/heroes';
import { pick, range, rng, sample, shuffle, type Rng } from './rng';

/** Этажи спуска: каждый — отдельная карта, последний зал охраняет хранитель */
const FLOORS: { tier: FloorId; name: string; events: number }[] = [
  { tier: 'crypt', name: 'Склеп', events: 6 },
  { tier: 'catacomb', name: 'Катакомбы', events: 7 },
  { tier: 'sanctum', name: 'Святилище Затмения', events: 7 },
];

let uid = 0;
function node(kind: NodeKind, extra: Partial<RunNode> = {}): RunNode {
  uid++;
  return { id: `n${uid}`, kind, ...extra };
}

function wares(r: Rng, element: Element): RunNode['wares'] {
  const cards = sample(r, [...rewardPool(element), ...ANY_POOL], 4);
  const relics = sample(r, FOUND_POOL, 2);
  return {
    cards,
    relics,
    prices: [
      ...cards.map((id) => (CARDS[id].rare === 'rare' ? range(r, 55, 75) : range(r, 30, 48))),
      ...relics.map((id) => (RELICS[id].rare === 'legend' ? range(r, 130, 170) : range(r, 70, 110))),
    ],
  };
}

/** Собирает узел нужного типа с начинкой */
function makeNode(r: Rng, kind: NodeKind, tier: FloorId, element: Element): RunNode {
  if (kind === 'foe') return node('foe', { foe: pick(r, foePool('foe', tier)) });
  if (kind === 'elite') return node('elite', { foe: pick(r, foePool('elite', tier)) });
  if (kind === 'boss') return node('boss', { foe: bossFor(tier) });
  if (kind === 'omen') return node('omen', { omen: pick(r, OMEN_IDS) });
  if (kind === 'trade') return node('trade', { wares: wares(r, element) });
  return node(kind);
}

/**
 * Этаж: события раскиданы по залам, хранитель стоит у спуска.
 * Порядок в списке — порядок залов на карте, последний зал самый дальний.
 */
function buildFloorLeg(r: Rng, i: number, element: Element): Leg {
  const { tier, name, events } = FLOORS[i];
  const filler: NodeKind[] = shuffle(r, [
    'foe', 'omen', 'rest', 'foe', 'find', 'trade', 'foe', 'elite', 'omen', 'find', 'rest', 'foe',
  ]);
  const kinds: NodeKind[] = ['foe'];
  let fi = 0;
  while (kinds.length < events - 1) {
    const k = filler[fi++ % filler.length];
    // два привала подряд обесценивают лечение
    if (k === 'rest' && kinds[kinds.length - 1] === 'rest') continue;
    kinds.push(k);
  }
  kinds.push('rest');
  const nodes = kinds.map((k) => makeNode(r, k, tier, element));
  nodes.push(makeNode(r, 'boss', tier, element));
  return { tier, name, seed: `${tier}-${i}-${Math.floor(r() * 1e9)}`, nodes };
}

export function newRun(heroId: string, seed = String(Date.now())): RunState {
  const hero = HERO_BY_ID[heroId];
  const r = rng(seed);
  uid = 0;
  return {
    seed,
    heroId,
    hp: hero.maxHp + relicMaxHp([hero.relic]),
    maxHp: hero.maxHp + relicMaxHp([hero.relic]),
    sparks: 40,
    deck: hero.deck.slice(),
    relics: [hero.relic],
    legs: FLOORS.map((_, i) => buildFloorLeg(r, i, hero.element)),
    leg: 0,
    done: [],
  };
}

/** прибавка к пределу здоровья от реликвий */
export function relicMaxHp(relics: string[]): number {
  let v = 0;
  for (const id of relics) {
    const r = RELICS[id];
    if (!r) continue;
    for (const h of r.hooks) if (h.t === 'maxHp') v += h.v;
  }
  return v;
}

export function currentLeg(run: RunState): Leg {
  return run.legs[Math.min(run.leg, run.legs.length - 1)];
}

/** событие, на которое встал игрок */
export function nodeById(run: RunState, id: string): RunNode | undefined {
  return currentLeg(run).nodes.find((n) => n.id === id);
}

export function isDone(run: RunState, id: string): boolean {
  return run.done.includes(id);
}

/** сила противников растёт с глубиной и по мере зачистки этажа */
export function foeScale(run: RunState): number {
  const leg = currentLeg(run);
  const cleared = leg.nodes.filter((n) => run.done.includes(n.id)).length;
  return (1 + run.leg * 0.3) * (1 + (cleared / Math.max(1, leg.nodes.length)) * 0.14);
}

export function isRunOver(run: RunState): boolean {
  return run.leg >= run.legs.length;
}

/** спуск на следующий этаж */
export function descend(run: RunState): void {
  run.leg++;
  run.done = [];
}

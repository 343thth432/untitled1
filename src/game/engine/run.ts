import type { BiomeId } from '../../art/road';
import type { Element, Leg, NodeKind, RunNode, RunState } from '../types';
import { ANY_POOL, CARDS, rewardPool } from '../data/cards';
import { FOUND_POOL, RELICS } from '../data/relics';
import { OMEN_IDS } from '../data/omens';
import { bossFor, foePool } from '../data/foes';
import { HERO_BY_ID } from '../data/heroes';
import { pick, range, rng, sample, shuffle, type Rng } from './rng';

/** Отрезки пути: биом, название и длина */
const LEGS: { biome: BiomeId; name: string; steps: number }[] = [
  { biome: 'mist', name: 'Туманный лес', steps: 8 },
  { biome: 'steppe', name: 'Дождевая степь', steps: 9 },
  { biome: 'salt', name: 'Соляные равнины', steps: 10 },
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
function makeNode(r: Rng, kind: NodeKind, biome: BiomeId, element: Element): RunNode {
  if (kind === 'foe') return node('foe', { foe: pick(r, foePool(biome, 'foe')) });
  if (kind === 'elite') return node('elite', { foe: pick(r, foePool(biome, 'elite')) });
  if (kind === 'boss') return node('boss', { foe: bossFor(biome) });
  if (kind === 'omen') return node('omen', { omen: pick(r, OMEN_IDS) });
  if (kind === 'trade') return node('trade', { wares: wares(r, element) });
  return node(kind);
}

/**
 * Путь: каждый шаг — либо один узел, либо развилка из двух.
 * Первый шаг всегда бой, последний — хранитель, перед ним привал.
 */
function buildLeg(r: Rng, i: number, element: Element): Leg {
  const { biome, name, steps } = LEGS[i];
  const out: RunNode[][] = [];
  const filler: NodeKind[] = shuffle(r, [
    'foe', 'omen', 'rest', 'foe', 'find', 'omen', 'trade', 'foe', 'rest', 'elite', 'omen', 'find', 'foe',
  ]);
  let fi = 0;
  const next = (): NodeKind => filler[fi++ % filler.length];

  out.push([makeNode(r, 'foe', biome, element)]);
  for (let s = 1; s < steps - 2; s++) {
    const fork = r() < 0.55;
    if (fork) {
      let a = next();
      let b = next();
      if (a === b) b = a === 'foe' ? 'omen' : 'foe';
      out.push([makeNode(r, a, biome, element), makeNode(r, b, biome, element)]);
    } else {
      out.push([makeNode(r, next(), biome, element)]);
    }
  }
  out.push([makeNode(r, 'rest', biome, element)]);
  out.push([makeNode(r, 'boss', biome, element)]);
  return { biome, name, steps: out };
}

export function newRun(heroId: string, seed = String(Date.now())): RunState {
  const hero = HERO_BY_ID[heroId];
  const r = rng(seed);
  uid = 0;
  const others = Object.keys(HERO_BY_ID).filter((id) => id !== heroId);
  return {
    seed,
    heroId,
    companion: others[Math.floor(r() * others.length) % others.length],
    hp: hero.maxHp + relicMaxHp([hero.relic]),
    maxHp: hero.maxHp + relicMaxHp([hero.relic]),
    sparks: 40,
    deck: hero.deck.slice(),
    relics: [hero.relic],
    legs: LEGS.map((_, i) => buildLeg(r, i, hero.element)),
    leg: 0,
    step: 0,
    picked: 0,
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

export function currentOptions(run: RunState): RunNode[] {
  const leg = currentLeg(run);
  return leg.steps[Math.min(run.step, leg.steps.length - 1)];
}

/** сила противников растёт по отрезкам и шагам */
export function foeScale(run: RunState): number {
  const legK = 1 + run.leg * 0.3;
  const stepK = 1 + (run.step / Math.max(1, currentLeg(run).steps.length)) * 0.12;
  return legK * stepK;
}

export function isRunOver(run: RunState): boolean {
  return run.leg >= run.legs.length;
}

/** переход к следующему шагу; возвращает true, если отрезок пройден */
export function advance(run: RunState): void {
  const leg = currentLeg(run);
  run.step++;
  run.picked = 0;
  if (run.step >= leg.steps.length) {
    run.leg++;
    run.step = 0;
  }
}

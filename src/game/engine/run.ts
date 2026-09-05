import type { FloorId, Leg, RunState } from '../types';
import { FOES, bossFor, foePool } from '../../dungeon/foes';
import { HERO_BY_ID } from '../data/heroes';
import { pick, range, rng, type Rng } from './rng';
import type { FloorPlan } from '../../dungeon/map';

/** Этажи спуска: чем глубже, тем гуще нежить */
const FLOORS: { tier: FloorId; name: string; foes: number; elites: number }[] = [
  { tier: 'crypt', name: 'Склеп', foes: 7, elites: 1 },
  { tier: 'catacomb', name: 'Катакомбы', foes: 9, elites: 2 },
  { tier: 'sanctum', name: 'Святилище Затмения', foes: 11, elites: 3 },
];

// на старте уже есть двухстволка, в подземелье добираются остальные
const GUNS = ['chaingun', 'launcher'] as const;

function plan(r: Rng, i: number): FloorPlan {
  const f = FLOORS[i];
  const foes: FloorPlan['foes'] = [];
  const pool = foePool('foe', f.tier);
  const elite = foePool('elite', f.tier);
  // мелочь ставится стаями: у каждой твари свой размер выводка
  while (foes.length < f.foes) {
    const id = pick(r, pool);
    for (let k = 0; k < FOES[id].count; k++) foes.push({ id, tier: 'foe' });
  }
  for (let k = 0; k < f.elites; k++) foes.push({ id: pick(r, elite), tier: 'elite' });
  foes.push({ id: bossFor(f.tier), tier: 'boss' });

  const loot: FloorPlan['loot'] = [];
  for (let k = 0; k < 4 + i; k++) loot.push({ kind: 'ammo', give: 'shells', amount: range(r, 7, 11) });
  for (let k = 0; k < 3 + i; k++) loot.push({ kind: 'ammo', give: 'bullets', amount: range(r, 30, 55) });
  if (i > 0) for (let k = 0; k < i; k++) loot.push({ kind: 'ammo', give: 'rockets', amount: range(r, 2, 4) });
  for (let k = 0; k < 2 + i; k++) loot.push({ kind: 'heal', amount: range(r, 18, 30) });
  loot.push({ kind: 'relic', amount: 10 });
  // каждый ярус даёт новый ствол
  if (i < GUNS.length) loot.push({ kind: 'weapon', give: GUNS[i], amount: 0 });
  return { loot, foes };
}

function buildLeg(r: Rng, i: number): Leg {
  const f = FLOORS[i];
  return { tier: f.tier, name: f.name, seed: `${f.tier}-${i}-${Math.floor(r() * 1e9)}`, plan: plan(r, i) };
}

export function newRun(heroId: string, seed = String(Date.now())): RunState {
  const hero = HERO_BY_ID[heroId];
  const r = rng(seed);
  return {
    seed,
    heroId,
    hp: hero.maxHp,
    maxHp: hero.maxHp,
    // ближнего боя нет: без патронов героиня беззащитна, поэтому их на
    // старте вдвое больше прежнего, и по ярусам их тоже прибавили
    ammo: { shells: 20, bullets: 0, rockets: 0 },
    weapon: 'ssg',
    guns: ['ssg'],
    legs: FLOORS.map((_, i) => buildLeg(r, i)),
    leg: 0,
  };
}

export function currentLeg(run: RunState): Leg {
  return run.legs[Math.min(run.leg, run.legs.length - 1)];
}

export function isRunOver(run: RunState): boolean {
  return run.leg >= run.legs.length;
}

/** сила противников растёт с глубиной */
export function foeScale(run: RunState): number {
  return 1 + run.leg * 0.28;
}

export function descend(run: RunState): void {
  run.leg++;
}

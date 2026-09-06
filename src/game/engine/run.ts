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
  // тип патронов в россыпи не задаётся: ствол у героини один, и находка
  // подходит к тому, что у неё в руках. Считаем только сколько россыпей
  for (let k = 0; k < 8 + i * 2; k++) loot.push({ kind: 'ammo', amount: 0 });
  for (let k = 0; k < 2 + i; k++) loot.push({ kind: 'heal', amount: range(r, 18, 30) });
  loot.push({ kind: 'relic', amount: 10 });
  // каждый ярус даёт новый ствол
  // amount -1 — ствол лежит нетронутым: подобравший получит начальный
  // запас. Дальше в этом поле хранится боезапас брошенного ствола
  if (i < GUNS.length) loot.push({ kind: 'weapon', give: GUNS[i], amount: -1 });
  // ── западня: три волны, последняя с элитой ──────────────
  // Твари берутся из того же пула, что и на ярусе, так что западня не
  // подсовывает никого, кого игрок здесь ещё не видел
  const waves: FloorPlan['waves'] = [];
  for (let k = 0; k < 3; k++) {
    const wave: FloorPlan['waves'][number] = [];
    for (let n = 0; n < 3 + k + i; n++) wave.push({ id: pick(r, pool), tier: 'foe' });
    if (k === 2) wave.push({ id: pick(r, elite), tier: 'elite' });
    waves.push(wave);
  }

  return { loot, foes, waves };
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

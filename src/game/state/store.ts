import { create } from 'zustand';
import type { CardDef, OmenDef, RelicDef, RunNode, RunState } from '../types';
import { ANY_POOL, CARDS, rewardPool } from '../data/cards';
import { FOUND_POOL, RELICS } from '../data/relics';
import { OMENS } from '../data/omens';
import { FOES } from '../data/foes';
import { HERO_BY_ID, HEROES } from '../data/heroes';
import { Duel } from '../engine/duel';
import { advance, currentLeg, currentOptions, foeScale, isRunOver, newRun, relicMaxHp } from '../engine/run';
import { pick, rng, sample } from '../engine/rng';
import { loadRaw, saveRaw, clearSave } from './storage';

export type Scene =
  | { s: 'title' }
  | { s: 'road' }
  | { s: 'duel' }
  | { s: 'reward'; cards: string[]; sparks: number; relic?: string }
  | { s: 'rest' }
  | { s: 'find'; relic: string }
  | { s: 'trade'; node: RunNode }
  | { s: 'omen'; omen: OmenDef; result?: string }
  | { s: 'defeat' }
  | { s: 'victory' };

export interface Meta {
  /** открытые героини */
  unlocked: string[];
  /** пройденные забеги */
  wins: number;
  runs: number;
  /** накопленные искры памяти */
  memory: number;
}

interface Store {
  ready: boolean;
  meta: Meta;
  run: RunState | null;
  scene: Scene;
  duel: Duel | null;
  /** растёт при каждом изменении дуэли — чтобы UI перерисовался */
  tick: number;

  boot(): Promise<void>;
  start(heroId: string, seed?: string): void;
  abandon(): void;

  choose(i: number): void;
  enterNode(): void;

  playCard(i: number): void;
  endTurn(): void;
  finishDuel(): void;

  takeCard(id: string | null): void;
  restHeal(): void;
  restUpgrade(id: string): void;
  takeRelic(id: string): void;
  buy(kind: 'card' | 'relic', i: number): void;
  leaveTrade(): void;
  answerOmen(i: number): void;
  closeOmen(): void;
  toRoad(): void;
}

const STARTERS = ['ayane', 'seira', 'midori', 'hikari', 'kuro'];

function defaultMeta(): Meta {
  return { unlocked: STARTERS.slice(), wins: 0, runs: 0, memory: 0 };
}

function relicDefs(ids: string[]): RelicDef[] {
  return ids.map((id) => RELICS[id]).filter(Boolean);
}

export function cardOf(id: string): CardDef {
  return CARDS[id];
}

async function persist(meta: Meta, run: RunState | null): Promise<void> {
  try {
    await saveRaw(JSON.stringify({ v: 1, meta, run }));
  } catch {
    /* сейв не критичен */
  }
}

export const useGame = create<Store>((set, get) => ({
  ready: false,
  meta: defaultMeta(),
  run: null,
  scene: { s: 'title' },
  duel: null,
  tick: 0,

  async boot() {
    let meta = defaultMeta();
    let run: RunState | null = null;
    try {
      const raw = await loadRaw();
      if (raw) {
        const p = JSON.parse(raw) as { meta?: Meta; run?: RunState | null };
        if (p.meta) meta = { ...defaultMeta(), ...p.meta };
        if (p.run) run = p.run;
      }
    } catch {
      /* повреждённый сейв просто игнорируем */
    }
    set({ ready: true, meta, run, scene: run ? { s: 'road' } : { s: 'title' } });
  },

  start(heroId, seed) {
    const run = newRun(heroId, seed);
    const meta = { ...get().meta, runs: get().meta.runs + 1 };
    set({ run, meta, scene: { s: 'road' }, duel: null });
    void persist(meta, run);
  },

  abandon() {
    set({ run: null, duel: null, scene: { s: 'title' } });
    void persist(get().meta, null);
    void clearSave().then(() => persist(get().meta, null));
  },

  choose(i) {
    const run = get().run;
    if (!run) return;
    set({ run: { ...run, picked: i } });
  },

  enterNode() {
    const run = get().run;
    if (!run) return;
    const node = currentOptions(run)[run.picked] ?? currentOptions(run)[0];
    const hero = HERO_BY_ID[run.heroId];
    switch (node.kind) {
      case 'foe':
      case 'elite':
      case 'boss': {
        const foe = FOES[node.foe ?? 'mourner'];
        const duel = new Duel({
          deck: run.deck,
          hero: { hp: run.hp, maxHp: run.maxHp, element: hero.element },
          foe,
          scale: foeScale(run) * (node.kind === 'elite' ? 1.05 : 1),
          relics: relicDefs(run.relics),
          rng: rng(`${run.seed}-${run.leg}-${run.step}-${run.picked}`),
        });
        set({ duel, scene: { s: 'duel' }, tick: get().tick + 1 });
        break;
      }
      case 'rest':
        set({ scene: { s: 'rest' } });
        break;
      case 'find':
        set({ scene: { s: 'find', relic: pickRelic(run) } });
        break;
      case 'trade':
        set({ scene: { s: 'trade', node } });
        break;
      case 'omen':
        set({ scene: { s: 'omen', omen: OMENS[node.omen ?? 'wellspring'] } });
        break;
    }
  },

  playCard(i) {
    const d = get().duel;
    if (!d) return;
    d.play(i);
    set({ duel: d, tick: get().tick + 1 });
  },

  endTurn() {
    const d = get().duel;
    if (!d || d.over) return;
    d.endTurn();
    set({ duel: d, tick: get().tick + 1 });
  },

  finishDuel() {
    const d = get().duel;
    const run = get().run;
    if (!d || !run) return;
    if (d.over === 'lose') {
      const meta = { ...get().meta, memory: get().meta.memory + run.leg * 30 + run.step * 6 };
      set({ scene: { s: 'defeat' }, meta });
      void persist(meta, null);
      return;
    }
    const node = currentOptions(run)[run.picked];
    const hero = HERO_BY_ID[run.heroId];
    const r = rng(`${run.seed}-r-${run.leg}-${run.step}`);
    const extra = run.relics.includes('oldmap') ? 1 : 0;
    const pool = [...new Set([...rewardPool(hero.element), ...sample(r, ANY_POOL, 6)])];
    const cards = sample(r, pool, 3 + extra);
    const sparks = node.kind === 'boss' ? 90 : node.kind === 'elite' ? 55 : 28;
    const relic = node.kind === 'elite' || node.kind === 'boss' ? pickRelic(run, r()) : undefined;
    const next: RunState = { ...run, hp: d.hero.hp, maxHp: d.hero.maxHp };
    set({ run: next, scene: { s: 'reward', cards, sparks, relic }, duel: null });
  },

  takeCard(id) {
    const run = get().run;
    const sc = get().scene;
    if (!run || sc.s !== 'reward') return;
    const deck = id ? [...run.deck, id] : run.deck;
    let next: RunState = { ...run, deck, sparks: run.sparks + sc.sparks };
    if (sc.relic) next = withRelic(next, sc.relic);
    set({ run: next });
    get().toRoad();
  },

  restHeal() {
    const run = get().run;
    if (!run) return;
    const bonus = run.relics.includes('kettle') ? 8 : 0;
    const heal = Math.round(run.maxHp * 0.3) + bonus;
    set({ run: { ...run, hp: Math.min(run.maxHp, run.hp + heal) } });
    get().toRoad();
  },

  restUpgrade(id) {
    const run = get().run;
    if (!run) return;
    const up = CARDS[id]?.up;
    if (!up) return get().toRoad();
    const i = run.deck.indexOf(id);
    const deck = run.deck.slice();
    if (i >= 0) deck[i] = up;
    set({ run: { ...run, deck } });
    get().toRoad();
  },

  takeRelic(id) {
    const run = get().run;
    if (!run) return;
    set({ run: withRelic(run, id) });
    get().toRoad();
  },

  buy(kind, i) {
    const run = get().run;
    const sc = get().scene;
    if (!run || sc.s !== 'trade' || !sc.node.wares) return;
    const w = sc.node.wares;
    const idx = kind === 'card' ? i : w.cards.length + i;
    const price = w.prices[idx];
    if (price <= 0 || run.sparks < price) return;
    const prices = w.prices.slice();
    prices[idx] = 0;
    const node: RunNode = { ...sc.node, wares: { ...w, prices } };
    const next: RunState =
      kind === 'card'
        ? { ...run, sparks: run.sparks - price, deck: [...run.deck, w.cards[i]] }
        : withRelic({ ...run, sparks: run.sparks - price }, w.relics[i]);
    set({ run: next, scene: { s: 'trade', node } });
  },

  leaveTrade() {
    get().toRoad();
  },

  answerOmen(i) {
    const run = get().run;
    const sc = get().scene;
    if (!run || sc.s !== 'omen') return;
    const ch = sc.omen.choices[i];
    const e = ch.effects;
    const r = rng(`${run.seed}-o-${run.leg}-${run.step}-${i}`);
    let next: RunState = { ...run };
    if (e.hp) next.hp = Math.max(1, Math.min(next.maxHp, next.hp + e.hp));
    if (e.maxHp) next.maxHp += e.maxHp;
    if (e.sparks) next.sparks = Math.max(0, next.sparks + e.sparks);
    if (e.card) next.deck = [...next.deck, e.card === 'random' ? pick(r, ANY_POOL) : e.card];
    if (e.removeCard) {
      const i2 = next.deck.findIndex((c) => CARDS[c].type === 'burden') ;
      const j = i2 >= 0 ? i2 : next.deck.findIndex((c) => c === 'strike' || c === 'guard');
      if (j >= 0) next.deck = next.deck.filter((_, k) => k !== j);
    }
    if (e.relic) {
      const id = e.relic === 'random' ? pickRelic(next, r()) : e.relic;
      if (!next.relics.includes(id)) next = withRelic(next, id);
    }
    if (e.upgrade) {
      const j = next.deck.findIndex((c) => CARDS[c].up);
      if (j >= 0) {
        const deck = next.deck.slice();
        deck[j] = CARDS[deck[j]].up as string;
        next.deck = deck;
      }
    }
    set({ run: next, scene: { s: 'omen', omen: sc.omen, result: ch.outcome } });
  },

  closeOmen() {
    get().toRoad();
  },

  toRoad() {
    const run = get().run;
    if (!run) return;
    const next = { ...run };
    advance(next);
    if (isRunOver(next)) {
      const meta = {
        ...get().meta,
        wins: get().meta.wins + 1,
        memory: get().meta.memory + 200,
        unlocked: unlockNext(get().meta),
      };
      set({ run: next, meta, scene: { s: 'victory' } });
      void persist(meta, null);
      return;
    }
    set({ run: next, scene: { s: 'road' } });
    void persist(get().meta, next);
  },
}));

/** реликвия с пересчётом предела здоровья */
function withRelic(run: RunState, id: string): RunState {
  if (run.relics.includes(id)) return run;
  const relics = [...run.relics, id];
  const maxHp = HERO_BY_ID[run.heroId].maxHp + relicMaxHp(relics);
  return { ...run, relics, maxHp, hp: Math.min(maxHp, run.hp + (maxHp - run.maxHp)) };
}

function pickRelic(run: RunState, roll = Math.random()): string {
  const owned = new Set(run.relics);
  const free = FOUND_POOL.filter((id) => !owned.has(id));
  if (!free.length) return FOUND_POOL[0];
  return free[Math.floor(roll * free.length) % free.length];
}

function unlockNext(meta: Meta): string[] {
  const locked = HEROES.map((h) => h.id).filter((id) => !meta.unlocked.includes(id));
  if (!locked.length) return meta.unlocked;
  return [...meta.unlocked, locked[0]];
}

export { currentLeg, currentOptions, isRunOver };

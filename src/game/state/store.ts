import { create } from 'zustand';
import type { RunState } from '../types';
import { HERO_BY_ID, HEROES } from '../data/heroes';
import { currentLeg, descend, foeScale, isRunOver, newRun } from '../engine/run';
import type { CrawlState } from '../../dungeon/Crawl';
import { loadRaw, saveRaw, clearSave } from './storage';

export type Scene = { s: 'title' } | { s: 'crawl' } | { s: 'defeat' } | { s: 'victory' };

export interface Meta {
  /** открытые героини */
  unlocked: string[];
  /** пройденные забеги */
  wins: number;
  runs: number;
  /** глубина лучшего спуска */
  best: number;
}

interface Store {
  ready: boolean;
  meta: Meta;
  run: RunState | null;
  scene: Scene;
  /** живое состояние вылазки — пишется из движка каждый кадр событий */
  live: CrawlState | null;

  boot(): Promise<void>;
  start(heroId: string, seed?: string): void;
  abandon(): void;
  sync(s: CrawlState): void;
  descend(s: CrawlState): void;
  die(): void;
}

const EMPTY: Meta = { unlocked: [HEROES[0].id], wins: 0, runs: 0, best: 0 };

async function persist(meta: Meta, run: RunState | null): Promise<void> {
  await saveRaw(JSON.stringify({ v: 2, meta, run }));
}

export const useGame = create<Store>((set, get) => ({
  ready: false,
  meta: EMPTY,
  run: null,
  scene: { s: 'title' },
  live: null,

  async boot() {
    let meta = EMPTY;
    let run: RunState | null = null;
    try {
      const raw = await loadRaw();
      if (raw) {
        const d = JSON.parse(raw) as { v: number; meta: Meta; run: RunState | null };
        if (d.v === 2) {
          meta = { ...EMPTY, ...d.meta };
          run = d.run;
        }
      }
    } catch {
      // повреждённое сохранение не должно мешать играть
    }
    set({ ready: true, meta, run, scene: run ? { s: 'crawl' } : { s: 'title' } });
  },

  start(heroId, seed) {
    const run = newRun(heroId, seed);
    const meta = { ...get().meta, runs: get().meta.runs + 1 };
    set({ run, meta, scene: { s: 'crawl' }, live: null });
    void persist(meta, run);
  },

  abandon() {
    set({ run: null, live: null, scene: { s: 'title' } });
    void clearSave();
    void persist(get().meta, null);
  },

  sync(s) {
    set({ live: s });
  },

  descend(s) {
    const run = get().run;
    if (!run) return;
    const next: RunState = {
      ...run,
      hp: s.hp,
      maxHp: s.maxHp,
      ammo: s.ammo,
      weapon: s.weapon,
      guns: s.guns,
    };
    descend(next);
    const meta = { ...get().meta, best: Math.max(get().meta.best, next.leg) };
    if (isRunOver(next)) {
      const won = {
        ...meta,
        wins: meta.wins + 1,
        unlocked: unlockNext(meta),
      };
      set({ run: next, meta: won, scene: { s: 'victory' }, live: null });
      void persist(won, null);
      return;
    }
    set({ run: next, meta, scene: { s: 'crawl' }, live: null });
    void persist(meta, next);
  },

  die() {
    const meta = get().meta;
    set({ scene: { s: 'defeat' }, live: null });
    void persist(meta, null);
  },
}));

function unlockNext(meta: Meta): string[] {
  const locked = HEROES.map((h) => h.id).filter((id) => !meta.unlocked.includes(id));
  if (!locked.length) return meta.unlocked;
  return [...meta.unlocked, locked[0]];
}

export { currentLeg, foeScale, isRunOver, HERO_BY_ID };

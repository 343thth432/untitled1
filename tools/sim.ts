/**
 * Прогон дороги без интерфейса: проверяем, что забег проходим
 * и что кривая сложности не ломается. `npm run sim`
 */
import { CARDS, rewardPool } from '../src/game/data/cards';
import { RELICS, FOUND_POOL } from '../src/game/data/relics';
import { FOES } from '../src/game/data/foes';
import { HERO_BY_ID } from '../src/game/data/heroes';
import { Duel } from '../src/game/engine/duel';
import { currentLeg, descend, foeScale, isRunOver, newRun, relicMaxHp } from '../src/game/engine/run';
import { pick, rng, sample } from '../src/game/engine/rng';
import type { RunState } from '../src/game/types';

/** простая, но не глупая игра: держим блок под входящий урон, остальное в атаку */
function playDuel(d: Duel): 'win' | 'lose' {
  let guard = 0;
  while (!d.over && guard++ < 400) {
    const incoming = d.intents.reduce(
      (s, it) => s + (it.kind === 'strike' || it.kind === 'special' ? (it.v ?? 0) * (it.hits ?? 1) : 0),
      0,
    );
    let acted = true;
    while (acted && !d.over) {
      acted = false;
      const need = Math.max(0, incoming - d.hero.block);
      // сначала защита, если бьют больно
      const order = d.hand
        .map((id, i) => ({ i, c: CARDS[id] }))
        .filter(({ i }) => d.canPlay(i))
        .sort((a, b) => {
          const score = (c: (typeof a)['c']): number => {
            if (c.type === 'guard') return need > 6 ? 3 : 1;
            if (c.type === 'attack') return 2.5;
            if (c.type === 'art') return 2.2;
            return 0;
          };
          return score(b.c) - score(a.c);
        });
      if (order.length) {
        d.play(order[0].i);
        acted = true;
      }
    }
    if (!d.over) d.endTurn();
  }
  return d.over === 'lose' ? 'lose' : 'win';
}

function autoRun(heroId: string, seed: string): { win: boolean; leg: number; step: number; hp: number; deck: number } {
  const run: RunState = newRun(heroId, seed);
  const hero = HERO_BY_ID[heroId];
  let guard = 0;
  while (!isRunOver(run) && guard++ < 300) {
    const leg = currentLeg(run);
    const rest = leg.nodes.filter((n) => !run.done.includes(n.id));
    if (!rest.length) {
      descend(run);
      continue;
    }
    // хранитель берётся последним, привал — когда мало здоровья
    const low = run.hp < run.maxHp * 0.45;
    const boss = rest.find((n) => n.kind === 'boss');
    const others = rest.filter((n) => n.kind !== 'boss');
    const node =
      (low ? others.find((n) => n.kind === 'rest') : undefined) ??
      others[0] ??
      boss ??
      rest[0];
    const step = run.done.length;
    const r = rng(`${seed}-${run.leg}-${node.id}`);
    if (node.kind === 'foe' || node.kind === 'elite' || node.kind === 'boss') {
      const d = new Duel({
        deck: run.deck,
        hero: { hp: run.hp, maxHp: run.maxHp, element: hero.element },
        foe: FOES[node.foe ?? 'mourner'],
        scale: foeScale(run) * (node.kind === 'elite' ? 1.15 : 1),
        relics: run.relics.map((id) => RELICS[id]).filter(Boolean),
        rng: rng(`${seed}-d-${run.leg}-${node.id}`),
      });
      const res = playDuel(d);
      run.hp = d.hero.hp;
      turnsTotal += d.turn;
      duels++;
      if (res === 'lose') {
        deaths.push(`${node.foe}@${run.leg}.${step}`);
        return { win: false, leg: run.leg, step, hp: 0, deck: run.deck.length };
      }
      const cards = sample(r, rewardPool(hero.element), 3);
      run.deck.push(pick(r, cards));
      if (node.kind === 'elite' || node.kind === 'boss') {
        const free = FOUND_POOL.filter((id) => !run.relics.includes(id));
        if (free.length) {
          run.relics.push(pick(r, free));
          const cap = hero.maxHp + relicMaxHp(run.relics);
          run.hp += cap - run.maxHp;
          run.maxHp = cap;
        }
      }
      run.sparks += node.kind === 'boss' ? 90 : node.kind === 'elite' ? 55 : 28;
    } else if (node.kind === 'rest') {
      const up = run.deck.findIndex((id) => CARDS[id].up);
      if (run.hp > run.maxHp * 0.62 && up >= 0) run.deck[up] = CARDS[run.deck[up]].up as string;
      else run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * 0.3));
    } else if (node.kind === 'find') {
      const free = FOUND_POOL.filter((id) => !run.relics.includes(id));
      if (free.length) {
        run.relics.push(pick(r, free));
        const cap = hero.maxHp + relicMaxHp(run.relics);
        run.hp += cap - run.maxHp;
        run.maxHp = cap;
      }
    } else if (node.kind === 'omen') {
      run.hp = Math.min(run.maxHp, run.hp + 8);
    }
    run.done.push(node.id);
    if (node.kind === 'boss') descend(run);
  }
  return { win: true, leg: run.leg, step: run.done.length, hp: run.hp, deck: run.deck.length };
}

const deaths: string[] = [];
let turnsTotal = 0;
let duels = 0;
const N = 60;
const rows: string[] = [];
let totalWin = 0;
const SAMPLE = ['ayane', 'mitsuki', 'midori', 'hikari', 'kuro'];
for (const h of SAMPLE.map((id) => HERO_BY_ID[id])) {
  let win = 0;
  let sumLeg = 0;
  let hp = 0;
  for (let i = 0; i < N; i++) {
    const res = autoRun(h.id, `sim-${h.id}-${i}`);
    if (res.win) {
      win++;
      hp += res.hp;
    }
    sumLeg += res.leg + res.step / 10;
  }
  totalWin += win;
  rows.push(
    `${h.name.padEnd(10)} побед ${String(Math.round((win / N) * 100)).padStart(3)}%  ` +
      `средний прогресс ${(sumLeg / N).toFixed(1)} отрезка  ` +
      `здоровья на финише ${win ? Math.round(hp / win) : 0}`,
  );
}
console.log('— Дорога: автопрогон —');
for (const r of rows) console.log(r);
console.log(`\nобщая доля побед: ${Math.round((totalWin / (N * SAMPLE.length)) * 100)}%`);
console.log(`ходов на дуэль: ${(turnsTotal / Math.max(1, duels)).toFixed(1)}  ·  дуэлей: ${duels}`);
const tally = new Map<string, number>();
for (const d of deaths) tally.set(d.split('@')[0], (tally.get(d.split('@')[0]) ?? 0) + 1);
const legs = new Map<string, number>();
for (const d of deaths) legs.set(d.split('@')[1].split('.')[0], (legs.get(d.split('@')[1].split('.')[0]) ?? 0) + 1);
console.log('гибель по отрезкам:', [...legs].sort().map(([k, v]) => `${k}: ${v}`).join('  '));
console.log('чаще всего убивают:', [...tally].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join('  '));

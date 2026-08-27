import type { CardDef, Effect, Element, FoeDef, Intent, RelicDef, StatusId } from '../types';
import { CARDS } from '../data/cards';
import { elementBonus } from '../data/elements';
import { shuffle, type Rng } from './rng';

export type Who = 'hero' | 'foe';

export interface Side {
  hp: number;
  maxHp: number;
  block: number;
  status: Partial<Record<StatusId, number>>;
  element: Element;
}

export type DuelEvent =
  | { t: 'hit'; who: Who; v: number; blocked: number; kind: 'attack' | 'burn' | 'bleed' | 'thorns' }
  | { t: 'block'; who: Who; v: number }
  | { t: 'heal'; who: Who; v: number }
  | { t: 'status'; who: Who; id: StatusId; v: number }
  | { t: 'card'; id: string; anim?: 'attack' | 'cast' | 'win' }
  | { t: 'draw'; ids: string[] }
  | { t: 'foeTurn' }
  | { t: 'turn'; n: number }
  | { t: 'over'; win: boolean };

const START_ENERGY = 3;
const HAND_SIZE = 5;

export interface DuelOpts {
  deck: string[];
  hero: { hp: number; maxHp: number; element: Element };
  foe: FoeDef;
  /** множитель силы противника по отрезку пути */
  scale: number;
  relics: RelicDef[];
  rng: Rng;
}

export class Duel {
  hero: Side;
  foe: Side;
  foeDef: FoeDef;
  drawPile: string[] = [];
  hand: string[] = [];
  discard: string[] = [];
  gone: string[] = [];
  energy = START_ENERGY;
  maxEnergy = START_ENERGY;
  turn = 0;
  intents: Intent[] = [];
  events: DuelEvent[] = [];
  over: 'win' | 'lose' | null = null;
  private relics: RelicDef[];
  private r: Rng;
  private playedThisTurn = 0;

  constructor(o: DuelOpts) {
    this.r = o.rng;
    this.relics = o.relics;
    this.foeDef = o.foe;
    this.hero = { hp: o.hero.hp, maxHp: o.hero.maxHp, block: 0, status: {}, element: o.hero.element };
    this.foe = {
      hp: Math.round(o.foe.hp * o.scale),
      maxHp: Math.round(o.foe.hp * o.scale),
      block: 0,
      status: {},
      element: o.foe.element,
    };
    for (const h of this.hookAll('maxHp')) {
      this.hero.maxHp += h.v;
      this.hero.hp += h.v;
    }
    for (const h of this.hookAll('startStatus')) this.addStatus('hero', h.id, h.v);
    this.drawPile = shuffle(this.r, o.deck);
    this.rollIntents();
    this.startTurn();
  }

  // ── реликвии ───────────────────────────────────────────────
  private hookAll<K extends string>(t: K): Extract<RelicDef['hooks'][number], { t: K }>[] {
    const out: Extract<RelicDef['hooks'][number], { t: K }>[] = [];
    for (const r of this.relics) {
      for (const h of r.hooks) if (h.t === t) out.push(h as Extract<RelicDef['hooks'][number], { t: K }>);
    }
    return out;
  }

  private sumHook(t: 'startEnergy' | 'startBlock' | 'startDraw' | 'damageBonus' | 'blockBonus' | 'onKillHeal' | 'healAfterDuel' | 'restBonus'): number {
    let v = 0;
    for (const r of this.relics) {
      for (const h of r.hooks) if (h.t === t && 'v' in h) v += h.v;
    }
    return v;
  }

  // ── статусы ────────────────────────────────────────────────
  private side(w: Who): Side {
    return w === 'hero' ? this.hero : this.foe;
  }

  st(w: Who, id: StatusId): number {
    return this.side(w).status[id] ?? 0;
  }

  private addStatus(w: Who, id: StatusId, v: number): void {
    const s = this.side(w);
    s.status[id] = Math.max(0, (s.status[id] ?? 0) + v);
    if (!s.status[id]) delete s.status[id];
    this.events.push({ t: 'status', who: w, id, v });
  }

  // ── урон ───────────────────────────────────────────────────
  private deal(from: Who, to: Who, base: number, kind: 'attack' | 'burn' | 'bleed' | 'thorns'): void {
    const a = this.side(from);
    const d = this.side(to);
    let v = base;
    if (kind === 'attack') {
      v += this.st(from, 'might');
      v += from === 'hero' ? this.sumHook('damageBonus') : 0;
      if (this.st(from, 'weak')) v *= 0.7;
      v *= elementBonus(a.element, d.element);
    }
    if (this.st(to, 'frail')) v *= 1.4;
    v = Math.max(0, Math.round(v));
    const blocked = kind === 'attack' ? Math.min(d.block, v) : 0;
    d.block -= blocked;
    const through = v - blocked;
    d.hp = Math.max(0, d.hp - through);
    this.events.push({ t: 'hit', who: to, v: through, blocked, kind });

    if (kind === 'attack' && through > 0) {
      const th = this.st(to, 'thorns');
      if (th > 0) this.deal(to, from, th, 'thorns');
    }
    this.checkOver();
  }

  private gainBlock(w: Who, v: number): void {
    const add = Math.max(0, v + this.st(w, 'grace') + (w === 'hero' ? this.sumHook('blockBonus') : 0));
    this.side(w).block += add;
    this.events.push({ t: 'block', who: w, v: add });
  }

  private heal(w: Who, v: number): void {
    const s = this.side(w);
    if (v >= 0) {
      const add = Math.min(v, s.maxHp - s.hp);
      s.hp += add;
      this.events.push({ t: 'heal', who: w, v: add });
    } else {
      s.hp = Math.max(0, s.hp + v);
      this.events.push({ t: 'hit', who: w, v: -v, blocked: 0, kind: 'bleed' });
      this.checkOver();
    }
  }

  private checkOver(): void {
    if (this.over) return;
    if (this.foe.hp <= 0) {
      this.over = 'win';
      this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + this.sumHook('onKillHeal') + this.sumHook('healAfterDuel'));
      this.events.push({ t: 'over', win: true });
    } else if (this.hero.hp <= 0) {
      this.over = 'lose';
      this.events.push({ t: 'over', win: false });
    }
  }

  // ── колода ─────────────────────────────────────────────────
  private drawCards(n: number): void {
    const got: string[] = [];
    for (let i = 0; i < n; i++) {
      if (!this.drawPile.length) {
        if (!this.discard.length) break;
        this.drawPile = shuffle(this.r, this.discard);
        this.discard = [];
      }
      const id = this.drawPile.pop();
      if (!id) break;
      this.hand.push(id);
      got.push(id);
    }
    if (got.length) this.events.push({ t: 'draw', ids: got });
  }

  // ── ход ────────────────────────────────────────────────────
  private startTurn(): void {
    this.turn++;
    this.playedThisTurn = 0;
    this.hero.block = 0;
    this.energy = this.maxEnergy + this.sumHook('startEnergy');
    this.gainBlock('hero', this.sumHook('startBlock'));
    this.drawCards(HAND_SIZE + this.st('hero', 'focus') + this.sumHook('startDraw'));
    this.events.push({ t: 'turn', n: this.turn });
  }

  canPlay(i: number): boolean {
    const c = CARDS[this.hand[i]];
    if (!c || this.over) return false;
    if (c.type === 'burden' && c.id === 'weight') return false;
    const free = this.playedThisTurn === 0 && this.hookAll('firstCardFree').length > 0;
    return free || c.cost <= this.energy;
  }

  play(i: number): boolean {
    if (!this.canPlay(i)) return false;
    const id = this.hand[i];
    const c = CARDS[id];
    const free = this.playedThisTurn === 0 && this.hookAll('firstCardFree').length > 0;
    if (!free) this.energy -= c.cost;
    this.hand.splice(i, 1);
    this.playedThisTurn++;
    this.events.push({ t: 'card', id, anim: c.anim });
    this.apply(c);
    const bleed = this.st('hero', 'bleed');
    if (bleed > 0 && !this.over) this.deal('foe', 'hero', 1, 'bleed');
    if (c.exhaust) this.gone.push(id);
    else this.discard.push(id);
    return true;
  }

  private apply(c: CardDef): void {
    for (const e of c.effects) this.effect(e);
  }

  private effect(e: Effect): void {
    if (this.over) return;
    switch (e.t) {
      case 'damage': {
        const base = e.fromBlock ? this.hero.block : e.v;
        for (let i = 0; i < (e.hits ?? 1); i++) this.deal('hero', 'foe', base, 'attack');
        break;
      }
      case 'block':
        for (let i = 0; i < (e.times ?? 1); i++) this.gainBlock('hero', e.v);
        break;
      case 'status':
        this.addStatus(e.who === 'self' ? 'hero' : 'foe', e.id, e.v);
        break;
      case 'draw':
        this.drawCards(e.v);
        break;
      case 'energy':
        this.energy += e.v;
        break;
      case 'heal':
        this.heal('hero', e.v);
        break;
      case 'discard': {
        for (let i = 0; i < e.v && this.hand.length; i++) {
          const j = Math.floor(this.r() * this.hand.length);
          this.discard.push(this.hand[j]);
          this.hand.splice(j, 1);
        }
        break;
      }
      case 'perStatus': {
        const n = this.st(e.who === 'self' ? 'hero' : 'foe', e.id);
        if (n > 0) this.deal('hero', 'foe', e.damage * n, 'attack');
        break;
      }
      case 'doubleBlock':
        this.hero.block *= 2;
        this.events.push({ t: 'block', who: 'hero', v: 0 });
        break;
      case 'reflect':
        this.addStatus('hero', 'thorns', 3);
        break;
    }
  }

  /** конец хода: статусы, ход противника, новый ход */
  endTurn(): void {
    if (this.over) return;
    this.discard.push(...this.hand);
    this.hand = [];
    this.tickEnd('hero');
    if (this.over) return;

    this.events.push({ t: 'foeTurn' });
    this.foe.block = 0;
    if (this.st('foe', 'root') > 0) {
      this.addStatus('foe', 'root', -1);
    } else {
      for (const it of this.intents) this.act(it);
    }
    if (this.over) return;
    this.tickEnd('foe');
    if (this.over) return;
    this.rollIntents();
    this.startTurn();
  }

  private act(it: Intent): void {
    switch (it.kind) {
      case 'strike':
        for (let i = 0; i < (it.hits ?? 1); i++) this.deal('foe', 'hero', it.v ?? 0, 'attack');
        break;
      case 'guard':
        this.gainBlock('foe', it.block ?? 0);
        break;
      case 'buff':
      case 'curse':
        if (it.status) this.addStatus(it.status.who === 'self' ? 'foe' : 'hero', it.status.id, it.status.v);
        break;
      case 'special':
        if (it.v) for (let i = 0; i < (it.hits ?? 1); i++) this.deal('foe', 'hero', it.v, 'attack');
        if (it.block) this.gainBlock('foe', it.block);
        if (it.status) this.addStatus(it.status.who === 'self' ? 'foe' : 'hero', it.status.id, it.status.v);
        break;
      case 'rest':
        break;
    }
  }

  private tickEnd(w: Who): void {
    const burn = this.st(w, 'burn');
    if (burn > 0) {
      this.deal(w === 'hero' ? 'foe' : 'hero', w, burn, 'burn');
      this.addStatus(w, 'burn', -1);
    }
    const reg = this.st(w, 'regen');
    if (reg > 0) {
      this.heal(w, reg);
      this.addStatus(w, 'regen', -1);
    }
    for (const id of ['frail', 'weak', 'bleed'] as StatusId[]) {
      if (this.st(w, id) > 0) this.addStatus(w, id, -1);
    }
  }

  private rollIntents(): void {
    const p = this.foeDef.pattern;
    this.intents = p[(this.turn) % p.length];
  }
}

import type {
  BattleLogEntry,
  BattleResult,
  Combatant,
  Effect,
  FloatKind,
  HeroDef,
  ModKey,
  SkillDef,
  StatKey,
  Stats,
  StatusInstance,
  TargetSel,
} from '../types';
import { factionMultiplier } from '../data/factions';
import { RNG } from './rng';

export const TICK = 0.1;
export const ULT_COST = 100;
const BASE_ATTACK_INTERVAL = 2.4;
const CAST_TIME = 0.75;
/** Сколько героиня ждёт нажатия игрока, прежде чем применит ульту сама */
const MANUAL_HOLD_LIMIT = 3.5;
export const BATTLE_TIMEOUT = 95;

export interface UnitSpec {
  def: HeroDef;
  stats: Stats;
  mods: { dmgDealt: number; dmgTaken: number; healPower: number };
  skillLevels: number[];
  uid: string;
  /** переопределение имени (для боссов и порождений затмения) */
  name?: string;
  /** доля здоровья на старте боя (для башни) */
  hpFraction?: number;
}

export interface TickEvents {
  floats: { uid: string; text: string; kind: FloatKind }[];
  hits: string[];
  ults: { uid: string; name: string }[];
  log: BattleLogEntry[];
  deaths: string[];
}

function emptyEvents(): TickEvents {
  return { floats: [], hits: [], ults: [], log: [], deaths: [] };
}

export function makeCombatant(spec: UnitSpec, side: 'ally' | 'foe', slot: number): Unit {
  return {
    uid: spec.uid,
    defId: spec.def.id,
    name: spec.name ?? spec.def.name,
    faction: spec.def.faction,
    role: spec.def.role,
    rarity: spec.def.rarity,
    look: spec.def.look,
    side,
    slot,
    stats: { ...spec.stats },
    maxHp: Math.round(spec.stats.hp),
    hp: Math.round(spec.stats.hp * (spec.hpFraction ?? 1)),
    energy: 0,
    atkTimer: BASE_ATTACK_INTERVAL * (100 / Math.max(40, spec.stats.spd)) * (0.55 + slot * 0.06),
    statuses: [],
    skills: spec.def.skills,
    skillLevels: spec.skillLevels.slice(),
    alive: (spec.hpFraction ?? 1) > 0,
    passiveState: {},
    dmgDone: 0,
    healDone: 0,
    mods: { ...spec.mods },
    castTimer: 0,
    castName: null,
    holdingUlt: false,
  };
}

type Unit = Combatant;


export class Battle {
  units: Unit[];
  time = 0;
  finished = false;
  result: BattleResult | null = null;
  manual = false;
  private rng: RNG;

  constructor(allies: UnitSpec[], foes: UnitSpec[], seed: number | string, manual = false) {
    this.rng = new RNG(seed);
    this.manual = manual;
    this.units = [
      ...allies.map((s, i) => makeCombatant(s, 'ally', i) as Unit),
      ...foes.map((s, i) => makeCombatant(s, 'foe', i) as Unit),
    ];
  }

  start(): TickEvents {
    const ev = emptyEvents();
    for (const u of this.units) this.firePassive(u, 'battleStart', ev);
    ev.log.push({ t: 0, text: 'Бой начался', kind: 'info' });
    return ev;
  }

  side(s: 'ally' | 'foe'): Unit[] {
    return this.units.filter((u) => u.side === s);
  }

  alive(s: 'ally' | 'foe'): Unit[] {
    return this.units.filter((u) => u.side === s && u.alive);
  }

  /** Готова ли героиня к ручному применению ульты */
  readyUnits(): Unit[] {
    return this.alive('ally').filter((u) => u.energy >= ULT_COST);
  }

  castUltimateManually(uid: string): TickEvents {
    const ev = emptyEvents();
    const u = this.units.find((x) => x.uid === uid) as Unit | undefined;
    if (!u || !u.alive || u.energy < ULT_COST || u.castTimer > 0) return ev;
    this.castUltimate(u, ev);
    return ev;
  }

  step(): TickEvents {
    const ev = emptyEvents();
    if (this.finished) return ev;
    this.time += TICK;

    for (const u of this.units) {
      if (!u.alive) continue;
      this.tickStatuses(u, ev);
    }

    for (const u of this.units) {
      if (!u.alive || this.finished) continue;

      if (u.castTimer > 0) {
        u.castTimer -= TICK;
        if (u.castTimer <= 0) u.castName = null;
        continue;
      }

      if (this.hasStatus(u, 'stun')) continue;

      // периодические пассивки
      this.firePeriodic(u, ev);

      if (u.energy >= ULT_COST) {
        const wantsManual = this.manual && u.side === 'ally';
        if (!wantsManual) {
          this.castUltimate(u, ev);
          continue;
        }
        // Ждём игрока, но не бесконечно: невнимательность не должна проигрывать бой
        u.passiveState.hold = (u.passiveState.hold ?? 0) + TICK;
        if (u.passiveState.hold >= MANUAL_HOLD_LIMIT) {
          this.castUltimate(u, ev);
          continue;
        }
        u.holdingUlt = true;
      } else {
        u.holdingUlt = false;
        u.passiveState.hold = 0;
      }

      u.atkTimer -= TICK;
      if (u.atkTimer <= 0) {
        u.atkTimer = BASE_ATTACK_INTERVAL * (100 / Math.max(40, this.eff(u, 'spd')));
        this.basicAttack(u, ev);
      }
    }

    this.checkEnd(ev);
    return ev;
  }

  // ── Характеристики с учётом статусов ───────────────────────
  eff(u: Unit, stat: StatKey): number {
    let pct = 0;
    for (const s of u.statuses) if (s.stat === stat && s.pct) pct += s.pct;
    const base = u.stats[stat];
    if (stat === 'crit' || stat === 'critDmg' || stat === 'haste' || stat === 'lifesteal') {
      return base + pct;
    }
    return base * (1 + pct / 100);
  }

  mod(u: Unit, key: 'dmgDealt' | 'dmgTaken' | 'healPower'): number {
    let v = u.mods[key];
    for (const s of u.statuses) if (s.stat === key && s.pct) v += s.pct;
    return v;
  }

  hasStatus(u: Unit, kind: StatusInstance['kind']): boolean {
    return u.statuses.some((s) => s.kind === kind && s.remaining > 0);
  }

  // ── Тик статусов ───────────────────────────────────────────
  private tickStatuses(u: Unit, ev: TickEvents): void {
    for (const s of u.statuses) {
      s.remaining -= TICK;
      if (s.kind === 'dot' && s.power) {
        s.value = (s.value ?? 0) + TICK;
        if (s.value >= 1) {
          s.value -= 1;
          const src = this.units.find((x) => x.uid === s.sourceUid) as Unit | undefined;
          this.dealDamage(src ?? u, u, s.power, ev, { noCrit: true, tag: s.label });
        }
      }
    }
    u.statuses = u.statuses.filter((s) => s.remaining > 0 && !(s.kind === 'shield' && (s.value ?? 0) <= 0));
  }

  // ── Атаки ──────────────────────────────────────────────────
  private basicAttack(u: Unit, ev: TickEvents): void {
    const skill = u.skills[0];
    this.runEffects(u, skill, u.skillLevels[0], ev);
    this.gainEnergy(u, 22, ev);
  }

  private castUltimate(u: Unit, ev: TickEvents): void {
    const skill = u.skills[1];
    u.energy -= ULT_COST;
    u.castTimer = CAST_TIME;
    u.castName = skill.name;
    u.holdingUlt = false;
    u.passiveState.hold = 0;
    ev.ults.push({ uid: u.uid, name: skill.name });
    ev.log.push({ t: this.time, text: `${u.name}: ${skill.name}`, kind: 'ult' });
    this.runEffects(u, skill, u.skillLevels[1], ev);
    this.firePassive(u, 'onUltimate', ev);
  }

  private gainEnergy(u: Unit, amount: number, _ev: TickEvents): void {
    if (!u.alive) return;
    u.energy = Math.min(ULT_COST, u.energy + amount * (1 + this.eff(u, 'haste') / 100));
  }

  // ── Пассивки ───────────────────────────────────────────────
  private firePassive(u: Unit, trigger: SkillDef['trigger'], ev: TickEvents): void {
    for (let i = 0; i < u.skills.length; i++) {
      const sk = u.skills[i];
      if (sk.kind !== 'passive' || sk.trigger !== trigger) continue;
      const key = `p_${sk.id}`;
      if (sk.once && u.passiveState[key]) continue;
      if (sk.cd && (u.passiveState[`cd_${sk.id}`] ?? 0) > this.time) continue;
      u.passiveState[key] = 1;
      if (sk.cd) u.passiveState[`cd_${sk.id}`] = this.time + sk.cd;
      this.runEffects(u, sk, u.skillLevels[i] ?? 1, ev);
    }
  }

  private firePeriodic(u: Unit, ev: TickEvents): void {
    for (let i = 0; i < u.skills.length; i++) {
      const sk = u.skills[i];
      if (sk.kind !== 'passive' || sk.trigger !== 'periodic' || !sk.every) continue;
      const key = `per_${sk.id}`;
      const next = u.passiveState[key] ?? sk.every;
      if (this.time >= next) {
        u.passiveState[key] = this.time + sk.every;
        this.runEffects(u, sk, u.skillLevels[i] ?? 1, ev);
      }
    }
  }

  // ── Эффекты ────────────────────────────────────────────────
  private scaleMult(mult: number, level: number): number {
    return mult * (1 + 0.11 * (level - 1));
  }

  private runEffects(caster: Unit, skill: SkillDef, level: number, ev: TickEvents): void {
    for (const e of skill.effects) this.runEffect(caster, e, level, ev);
  }

  private runEffect(caster: Unit, e: Effect, level: number, ev: TickEvents): void {
    switch (e.t) {
      case 'damage': {
        const hits = e.hits ?? 1;
        for (let h = 0; h < hits; h++) {
          const targets = this.selectTargets(e.target, caster);
          for (const t of targets) {
            const scaleVal =
              e.scale === 'maxHp' ? caster.maxHp : e.scale === 'def' ? this.eff(caster, 'def') : this.eff(caster, 'atk');
            const power = scaleVal * this.scaleMult(e.mult, level);
            this.dealDamage(caster, t, power, ev, { pierce: e.pierce, critBonus: e.critBonus });
          }
        }
        break;
      }
      case 'heal': {
        for (const t of this.selectTargets(e.target, caster)) {
          const scaleVal =
            e.scale === 'atk'
              ? this.eff(caster, 'atk')
              : e.scale === 'casterMaxHp'
                ? caster.maxHp
                : t.maxHp;
          const amount = scaleVal * this.scaleMult(e.mult, level) * (1 + this.mod(caster, 'healPower') / 100);
          this.heal(caster, t, amount, ev);
        }
        break;
      }
      case 'shield': {
        for (const t of this.selectTargets(e.target, caster)) {
          const scaleVal = e.scale === 'atk' ? this.eff(caster, 'atk') : caster.maxHp;
          const value = Math.round(scaleVal * this.scaleMult(e.mult, level));
          this.addStatus(t, {
            id: `shield_${caster.uid}`,
            label: 'Щит',
            kind: 'shield',
            remaining: e.dur,
            value,
            sourceUid: caster.uid,
          });
          ev.floats.push({ uid: t.uid, text: `+${fmt(value)}`, kind: 'shield' });
        }
        break;
      }
      case 'mod': {
        for (const t of this.selectTargets(e.target, caster)) {
          const pct = e.pct * (1 + 0.06 * (level - 1));
          this.addStatus(t, {
            id: e.id,
            label: e.label,
            kind: pct >= 0 === (e.stat !== 'dmgTaken') ? 'buff' : 'debuff',
            stat: e.stat as ModKey,
            pct: Math.round(pct * 10) / 10,
            remaining: e.dur,
            sourceUid: caster.uid,
          });
          if (e.dur < 900) ev.floats.push({ uid: t.uid, text: e.label, kind: 'buff' });
        }
        break;
      }
      case 'dot': {
        for (const t of this.selectTargets(e.target, caster)) {
          this.addStatus(t, {
            id: e.id,
            label: e.label,
            kind: 'dot',
            remaining: e.dur,
            power: this.eff(caster, 'atk') * this.scaleMult(e.mult, level),
            value: 0,
            sourceUid: caster.uid,
          });
        }
        break;
      }
      case 'stun': {
        for (const t of this.selectTargets(e.target, caster)) {
          if (e.chance !== undefined && !this.rng.chance(e.chance)) continue;
          this.addStatus(t, {
            id: 'stun',
            label: 'Стан',
            kind: 'stun',
            remaining: e.dur,
            sourceUid: caster.uid,
          });
          ev.floats.push({ uid: t.uid, text: 'Стан', kind: 'buff' });
        }
        break;
      }
      case 'energy': {
        for (const t of this.selectTargets(e.target, caster)) this.gainEnergy(t, e.amount, ev);
        break;
      }
      case 'cleanse': {
        for (const t of this.selectTargets(e.target, caster)) {
          t.statuses = t.statuses.filter((s) => s.kind !== 'debuff' && s.kind !== 'dot' && s.kind !== 'stun');
          ev.floats.push({ uid: t.uid, text: 'Очищение', kind: 'buff' });
        }
        break;
      }
      case 'revive': {
        const dead = this.units.filter((u) => u.side === caster.side && !u.alive);
        if (!dead.length) break;
        const t = dead[0] as Unit;
        t.alive = true;
        t.hp = Math.round(t.maxHp * e.hpPct);
        t.energy = 0;
        t.statuses = [];
        t.atkTimer = 1.2;
        ev.floats.push({ uid: t.uid, text: 'Возрождение!', kind: 'heal' });
        ev.log.push({ t: this.time, text: `${t.name} возвращается в бой`, kind: 'info' });
        break;
      }
    }
  }

  private addStatus(t: Unit, s: StatusInstance): void {
    if (s.kind === 'shield') {
      const existing = t.statuses.find((x) => x.kind === 'shield' && x.id === s.id);
      if (existing) {
        existing.value = Math.max(existing.value ?? 0, s.value ?? 0);
        existing.remaining = Math.max(existing.remaining, s.remaining);
        return;
      }
      t.statuses.push(s);
      return;
    }
    const existing = t.statuses.find((x) => x.id === s.id && x.sourceUid === s.sourceUid);
    if (existing && s.remaining < 900) {
      existing.remaining = Math.max(existing.remaining, s.remaining);
      existing.pct = s.pct;
      existing.power = s.power;
      return;
    }
    if (existing && s.remaining >= 900) {
      // бессрочные бафы складываются
      existing.pct = (existing.pct ?? 0) + (s.pct ?? 0);
      return;
    }
    t.statuses.push(s);
  }

  // ── Урон и лечение ─────────────────────────────────────────
  private dealDamage(
    src: Unit,
    target: Unit,
    power: number,
    ev: TickEvents,
    opt: { pierce?: number; critBonus?: number; noCrit?: boolean; tag?: string } = {},
  ): void {
    if (!target.alive || this.finished) return;

    const fm = factionMultiplier(src.faction, target.faction);
    const defEff = this.eff(target, 'def') * (1 - (opt.pierce ?? 0));
    const mitigation = defEff / (defEff + 6 * Math.max(20, this.eff(src, 'atk')));
    let dmg = power * fm * (1 - mitigation);

    dmg *= 1 + this.mod(src, 'dmgDealt') / 100;
    dmg *= 1 + this.mod(target, 'dmgTaken') / 100;

    let crit = false;
    if (!opt.noCrit) {
      const chance = (this.eff(src, 'crit') + (opt.critBonus ?? 0)) / 100;
      if (this.rng.chance(chance)) {
        crit = true;
        dmg *= 1.5 + this.eff(src, 'critDmg') / 100;
      }
    }
    dmg = Math.max(1, Math.round(dmg * this.rng.range(0.95, 1.05)));

    // щиты
    let remaining = dmg;
    for (const s of target.statuses) {
      if (s.kind !== 'shield' || (s.value ?? 0) <= 0) continue;
      const absorbed = Math.min(s.value ?? 0, remaining);
      s.value = (s.value ?? 0) - absorbed;
      remaining -= absorbed;
      if (remaining <= 0) break;
    }

    const hpBefore = target.hp;
    target.hp = Math.max(0, target.hp - remaining);
    src.dmgDone += dmg;

    ev.floats.push({ uid: target.uid, text: fmt(dmg), kind: crit ? 'crit' : 'dmg' });
    ev.hits.push(target.uid);

    // энергия за получение урона
    this.gainEnergy(target, 9, ev);

    // вампиризм
    const ls = this.eff(src, 'lifesteal');
    if (ls > 0 && remaining > 0 && src.alive) this.heal(src, src, (remaining * ls) / 100, ev, true);

    if (crit) this.firePassive(src, 'onCrit', ev);

    if (hpBefore > target.maxHp * 0.5 && target.hp <= target.maxHp * 0.5) {
      this.firePassive(target, 'onHpBelow50', ev);
    }

    if (target.hp <= 0 && target.alive) {
      target.alive = false;
      target.statuses = [];
      target.energy = 0;
      ev.deaths.push(target.uid);
      ev.log.push({ t: this.time, text: `${target.name} повержена`, kind: 'death' });
      this.firePassive(src, 'onKill', ev);
      for (const ally of this.units) {
        if (ally.side === target.side && ally.alive) this.firePassive(ally as Unit, 'onAllyDeath', ev);
      }
    }
  }

  private heal(src: Unit, target: Unit, amount: number, ev: TickEvents, silent = false): void {
    if (!target.alive) return;
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + Math.round(amount));
    const healed = target.hp - before;
    if (healed <= 0) return;
    src.healDone += healed;
    if (!silent) ev.floats.push({ uid: target.uid, text: `+${fmt(healed)}`, kind: 'heal' });
  }

  // ── Выбор целей ────────────────────────────────────────────
  private selectTargets(sel: TargetSel, caster: Unit): Unit[] {
    const foes = this.units.filter((u) => u.side !== caster.side && u.alive) as Unit[];
    const allies = this.units.filter((u) => u.side === caster.side && u.alive) as Unit[];
    switch (sel) {
      case 'self':
        return [caster];
      case 'enemyFront':
        return foes.length ? [foes.slice().sort((a, b) => a.slot - b.slot)[0]] : [];
      case 'enemyBack':
        return foes.length ? [foes.slice().sort((a, b) => b.slot - a.slot)[0]] : [];
      case 'enemyLowestHp':
        return foes.length ? [foes.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]] : [];
      case 'enemyHighestAtk':
        return foes.length ? [foes.slice().sort((a, b) => this.eff(b, 'atk') - this.eff(a, 'atk'))[0]] : [];
      case 'enemyRandom':
        return foes.length ? [foes[this.rng.int(foes.length)]] : [];
      case 'enemyAll':
        return foes;
      case 'enemySplash': {
        if (!foes.length) return [];
        const main = foes.slice().sort((a, b) => a.slot - b.slot)[0];
        return foes.filter((f) => Math.abs(f.slot - main.slot) <= 1);
      }
      case 'allyLowestHp':
        return allies.length ? [allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]] : [];
      case 'allyRandom':
        return allies.length ? [allies[this.rng.int(allies.length)]] : [];
      case 'allyAll':
        return allies;
      case 'allyDead':
        return this.units.filter((u) => u.side === caster.side && !u.alive) as Unit[];
    }
  }

  // ── Завершение ─────────────────────────────────────────────
  private checkEnd(ev: TickEvents): void {
    const allies = this.alive('ally');
    const foes = this.alive('foe');
    if (allies.length && foes.length && this.time < BATTLE_TIMEOUT) return;

    let win: boolean;
    if (!foes.length && allies.length) win = true;
    else if (!allies.length && foes.length) win = false;
    else if (!allies.length && !foes.length) win = false;
    else {
      const a = allies.reduce((s, u) => s + u.hp / u.maxHp, 0) / 5;
      const f = foes.reduce((s, u) => s + u.hp / u.maxHp, 0) / 5;
      win = a > f;
    }

    this.finished = true;
    const dmg: Record<string, number> = {};
    const hp: Record<string, number> = {};
    for (const u of this.units) {
      dmg[u.uid] = Math.round(u.dmgDone);
      hp[u.uid] = u.alive ? Math.max(0.01, u.hp / u.maxHp) : 0;
    }
    const mvp =
      this.side('ally')
        .slice()
        .sort((a, b) => b.dmgDone + b.healDone * 0.8 - (a.dmgDone + a.healDone * 0.8))[0]?.uid ?? null;
    this.result = { win, ticks: Math.round(this.time / TICK), mvp, dmg, hp };
    ev.log.push({ t: this.time, text: win ? 'Победа!' : 'Поражение', kind: 'info' });
  }
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(2)}K`;
  return `${Math.round(n)}`;
}

/** Быстрый прогон боя без анимации — для «пропустить» и офлайн-расчёта. */
export function simulate(allies: UnitSpec[], foes: UnitSpec[], seed: number | string): BattleResult {
  const b = new Battle(allies, foes, seed, false);
  b.start();
  let guard = 0;
  while (!b.finished && guard < 20000) {
    b.step();
    guard++;
  }
  return b.result ?? { win: false, ticks: guard, mvp: null, dmg: {}, hp: {} };
}

import { FOES, type FoeId, type Tier } from './foes';
import { ART_H, figSpan, foeAspect, foeSprite, loadFoeArt, viewFor, type PoseId } from './foeArt';
import { solid, type Floor } from './map';
import type { Player } from './player';
import type { Board } from './billboard';

/**
 * Повадки тварей по образцу Doom: спит, пока не увидит или не получит
 * пулю; идёт шагом с раскадровкой; замахивается перед ударом; вздрагивает
 * от боли; умирает по кадрам и остаётся лежать. Крупный урон рвёт в
 * клочья.
 */

export type MobState = 'idle' | 'chase' | 'wind' | 'pain' | 'dead' | 'gib';

// нарисованные кадры тянутся один раз, до первого кадра игры
loadFoeArt();

/** длина шага в клетках: кадр меняется на каждой такой доле пути.
 *  Раньше кадр менялся по времени, и все твари шагали с одной частотой
 *  вне зависимости от скорости — быстрая семенила, не перебирая ногами. */
const STRIDE = 0.3;
const PAIN_T = 0.2;
const DIE_T = 0.16;
const GIB_T = 0.1;
const DIE: PoseId[] = ['d0', 'd1', 'd2', 'd3', 'd4'];
const GIB: PoseId[] = ['g0', 'g1', 'g2', 'g3'];
const WALK: PoseId[] = ['w0', 'w1', 'w2', 'w3'];

export class Mob {
  x: number;
  y: number;
  /** куда смотрит — от этого зависит ракурс спрайта */
  a = 0;
  hp: number;
  maxHp: number;
  state: MobState = 'idle';
  /** время в текущем состоянии */
  t = 0;
  /** откат до следующей атаки */
  cd = 0;
  /** фаза шага, растёт по пройденному пути; стартовый сдвиг свой у
   *  каждой, иначе стая шагает строем */
  step = Math.random() * 4;
  /** собственное время: по нему качается в воздухе летающая */
  private life = Math.random() * 6;
  /** этот замах — когтями, а не снарядом */
  private claw = false;
  readonly id: FoeId;
  readonly tier: Tier;
  readonly name: string;
  readonly dmg: number;
  readonly aura: string;
  /** заявка на выстрел, которую забирает игровой цикл */
  fired: { x: number; y: number; a: number; n: number; speed: number; dmg: number } | null = null;

  constructor(id: FoeId, x: number, y: number, scale: number) {
    const def = FOES[id];
    this.id = id;
    this.tier = def.tier;
    this.name = def.name;
    this.x = x;
    this.y = y;
    this.a = Math.random() * Math.PI * 2;
    this.maxHp = Math.round(def.hp * scale);
    this.hp = this.maxHp;
    this.dmg = Math.round(def.dmg * scale);
    this.aura = def.aura;
  }

  get def() {
    return FOES[this.id];
  }

  /** жива и мешает пройти */
  get alive(): boolean {
    return this.state !== 'dead' && this.state !== 'gib';
  }

  /** высота билборда в клетках */
  get scale(): number {
    return (this.def.scale * ART_H) / figSpan(this.id);
  }

  /**
   * Урон. Крупное попадание по уже подбитой рвёт в клочья, обычное с
   * вероятностью по твари сбивает в кадр боли — как в оригинале, где
   * тяжёлые твари почти не вздрагивают.
   */
  hurtBy(v: number): void {
    if (!this.alive) return;
    this.hp -= v;
    if (this.hp <= 0) {
      this.state = this.hp <= -this.maxHp * 0.55 ? 'gib' : 'dead';
      this.t = 0;
      return;
    }
    if (this.state === 'idle') {
      this.state = 'chase';
      this.t = 0;
    } else if (this.state !== 'wind' && Math.random() < this.def.pain) {
      this.state = 'pain';
      this.t = 0;
    }
  }

  /** тварь услышала шум и просыпается */
  wake(): void {
    if (this.state === 'idle') {
      this.state = 'chase';
      this.t = 0;
    }
  }

  private canSee(f: Floor, px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const n = Math.ceil(Math.sqrt(dx * dx + dy * dy) * 3);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (solid(f, Math.floor(this.x + dx * t), Math.floor(this.y + dy * t))) return false;
    }
    return true;
  }

  private slide(f: Floor, nx: number, ny: number): void {
    const r = 0.3;
    if (!solid(f, Math.floor(nx + r), Math.floor(this.y)) && !solid(f, Math.floor(nx - r), Math.floor(this.y))) this.x = nx;
    if (!solid(f, Math.floor(this.x), Math.floor(ny + r)) && !solid(f, Math.floor(this.x), Math.floor(ny - r))) this.y = ny;
  }

  /** @returns урон, который тварь нанесла игроку в этот кадр */
  update(dt: number, f: Floor, p: Player, others: Mob[]): number {
    this.t += dt;
    this.life += dt;
    this.cd = Math.max(0, this.cd - dt);
    if (!this.alive) return 0;

    const d = this.def;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (this.state === 'pain') {
      if (this.t >= PAIN_T) {
        this.state = 'chase';
        this.t = 0;
      }
      return 0;
    }

    if (this.state === 'idle') {
      if (dist < d.sight && this.canSee(f, p.x, p.y)) {
        this.state = 'chase';
        this.t = 0;
        // рёв будит соседей, как шум боя в оригинале
        for (const o of others) if (o !== this && (o.x - this.x) ** 2 + (o.y - this.y) ** 2 < 49) o.wake();
      }
      return 0;
    }

    // всегда смотрим на игрока в бою — так ракурс спрайта совпадает с боем.
    // Рвущаяся вперёд тварь наводится только до замаха: иначе от рывка,
    // который доворачивает за игроком, некуда деться
    if (!d.lunge || this.state !== 'wind') this.a = Math.atan2(dy, dx);

    if (this.state === 'wind') {
      // рывок: тяжёлая не заносит когти на месте, а наваливается вперёд —
      // и тормозит, дойдя до цели, иначе влезает игроку в лицо
      if (d.lunge && this.t > d.wind * 0.4 && dist > d.reach * 0.8) {
        const sp = d.lunge * dt;
        this.slide(f, this.x + Math.cos(this.a) * sp, this.y + Math.sin(this.a) * sp);
      }
      if (this.t < d.wind) return 0;
      this.state = 'chase';
      this.t = 0;
      this.cd = d.cool;
      if (d.bolts > 0 && !this.claw) {
        this.fired = { x: this.x, y: this.y, a: this.a, n: d.bolts, speed: d.boltSpeed, dmg: this.dmg };
        return 0;
      }
      // когти достают, только если игрок не успел отойти
      return dist <= d.reach + 0.35 ? this.dmg : 0;
    }

    const ranged = d.bolts > 0;
    // стрелка достали вплотную — отходить поздно, бьёт когтями
    const close = dist <= d.reach;
    // рвущаяся тварь заносит когти заранее: рывок донесёт её сам, и на
    // это время у игрока есть шаг в сторону
    const span = d.lunge ? d.lunge * d.wind * 0.6 : 0;
    const canHit = close
      || (ranged
        ? dist < d.sight && dist > 1.4 && this.canSee(f, p.x, p.y)
        : dist <= d.reach + span && (!span || this.canSee(f, p.x, p.y)));
    if (canHit && this.cd <= 0) {
      this.state = 'wind';
      this.t = 0;
      this.claw = close;
      return 0;
    }

    // подходим, расталкивая соседей, чтобы не слипались в одну точку
    let sx = dx / (dist || 1);
    let sy = dy / (dist || 1);
    // стрелки держат дистанцию, но не пятятся из-под самого носа
    if (ranged && dist < 3.5 && !close) {
      sx = -sx;
      sy = -sy;
    }
    for (const o of others) {
      if (o === this || !o.alive) continue;
      const ox = this.x - o.x;
      const oy = this.y - o.y;
      const d2 = ox * ox + oy * oy;
      if (d2 > 0.0001 && d2 < 0.5) {
        const push = (0.5 - d2) * 2.2;
        sx += (ox / Math.sqrt(d2)) * push;
        sy += (oy / Math.sqrt(d2)) * push;
      }
    }
    const len = Math.sqrt(sx * sx + sy * sy) || 1;
    const sp = d.speed * dt;
    const still = dist <= d.reach * 0.9;
    if (!still) {
      this.slide(f, this.x + (sx / len) * sp, this.y + (sy / len) * sp);
      this.step += sp;
    }
    return 0;
  }

  /** кадр раскадровки для текущего состояния */
  private pose(): PoseId {
    switch (this.state) {
      case 'idle':
        // стоящая тварь показывает кадр покоя, а не первую фазу шага:
        // иначе она замирает посреди замаха ногой, да ещё и не во всех
        // ракурсах — шаг нарисован только анфас
        return 'stand';
      case 'pain':
        return 'pain';
      case 'wind': {
        const d = this.def;
        if (d.bolts > 0 && !this.claw) return 'cast';
        // рывок нарисован в три кадра: занос, бросок тела, удар в упор
        if (d.lunge) {
          const k = this.t / d.wind;
          return k < 0.4 ? 'atk' : k < 0.72 ? 'atk1' : 'atk2';
        }
        // ближний бой в два кадра: замах, потом удар
        return this.t < d.wind * 0.55 ? 'atk' : 'atk1';
      }
      case 'dead':
        return DIE[Math.min(DIE.length - 1, Math.max(0, Math.floor(this.t / DIE_T)))];
      case 'gib':
        return GIB[Math.min(GIB.length - 1, Math.max(0, Math.floor(this.t / GIB_T)))];
      default:
        return WALK[Math.max(0, Math.floor(this.step / STRIDE)) % WALK.length];
    }
  }

  /** подъём над полом в долях своей высоты: полёт, качание, падение */
  private get lift(): number {
    const fly = this.def.fly ?? 0;
    if (!fly) return 0;
    // сбитая тварь валится на пол за треть секунды
    const drop = this.alive ? 1 : Math.max(0, 1 - this.t / 0.35);
    return (fly + Math.sin(this.life * 2.4) * 0.05) * drop;
  }

  board(camX: number, camY: number): Board {
    const toCam = Math.atan2(camY - this.y, camX - this.x);
    const flat = this.state === 'dead' || this.state === 'gib';
    // павшую видно с любой стороны одинаково — ракурсов у кучи нет
    const [v, flip] = flat ? [0, false] : viewFor(this.a, toCam);
    const src = foeSprite(this.id, v, this.pose(), flip);
    return {
      x: this.x,
      y: this.y,
      src,
      aspect: foeAspect(this.id),
      scale: this.scale,
      hang: 0,
      lift: this.lift,
      emissive: this.state === 'wind' ? 0.5 : 0.32,
      // еле заметный отсвет: в темноте тварь видно, но нимба вокруг нет
      glow: this.alive ? `${this.aura}22` : undefined,
      tag: this,
    };
  }
}

/** сила противников растёт с глубиной */
export function spawnMobs(f: Floor, scale: number): Mob[] {
  return f.spawns.map((s) => new Mob(s.id as FoeId, s.x, s.y, scale));
}

/** разбудить всех поблизости — выстрел слышно */
export function alert(mobs: Mob[], x: number, y: number, r: number): void {
  const r2 = r * r;
  for (const m of mobs) if (m.alive && (m.x - x) ** 2 + (m.y - y) ** 2 < r2) m.wake();
}

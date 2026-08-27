import { FOES } from '../game/data/foes';
import { solid, type Floor } from './map';
import { foeSilhouette } from './foeArt';
import type { Player } from './player';
import type { Board } from './billboard';
import { charImage } from './foeArt';

export type MobState = 'sleep' | 'chase' | 'wind' | 'hurt' | 'dead';

/** боевые повадки по рангу: рядовые слабее и медленнее хранителя */
const TIER = {
  foe: { speed: 1.35, reach: 1.15, cool: 1.5, wind: 0.45, scale: 1.05, hpK: 1 },
  elite: { speed: 1.65, reach: 1.3, cool: 1.25, wind: 0.4, scale: 1.25, hpK: 1.5 },
  boss: { speed: 1.15, reach: 1.6, cool: 1.05, wind: 0.55, scale: 1.95, hpK: 3.4 },
} as const;

export class Mob {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: MobState = 'sleep';
  /** таймер текущего состояния */
  t = 0;
  /** откат до следующего удара */
  cd = 0;
  /** мигание при попадании */
  flash = 0;
  readonly id: string;
  readonly tier: 'foe' | 'elite' | 'boss';
  readonly name: string;
  readonly dmg: number;
  readonly art: HTMLCanvasElement;
  readonly aura: string;
  private ph: number;

  constructor(id: string, tier: 'foe' | 'elite' | 'boss', x: number, y: number, scale: number) {
    const def = FOES[id] ?? FOES[Object.keys(FOES)[0]];
    const k = TIER[tier];
    this.id = id;
    this.tier = tier;
    this.name = def.name;
    this.x = x;
    this.y = y;
    this.maxHp = Math.round(def.hp * k.hpK * scale);
    this.hp = this.maxHp;
    this.dmg = Math.round((tier === 'boss' ? 16 : tier === 'elite' ? 11 : 7) * scale);
    this.art = foeSilhouette(id, def.portrait, def.count ?? 1, tier === 'boss');
    this.aura = def.portrait.aura;
    this.ph = Math.random() * 6.28;
  }

  get dead(): boolean {
    return this.state === 'dead' && this.t > 1.2;
  }

  get scale(): number {
    return TIER[this.tier].scale;
  }

  hurtBy(v: number): void {
    if (this.state === 'dead') return;
    this.hp -= v;
    this.flash = 1;
    if (this.hp <= 0) {
      this.state = 'dead';
      this.t = 0;
      return;
    }
    if (this.state === 'sleep') this.state = 'chase';
  }

  private canSee(f: Floor, px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const n = Math.ceil(Math.hypot(dx, dy) * 3);
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
    this.flash = Math.max(0, this.flash - dt * 4);
    this.cd = Math.max(0, this.cd - dt);
    if (this.state === 'dead') return 0;

    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    const k = TIER[this.tier];

    if (this.state === 'sleep') {
      if (dist < 9 && this.canSee(f, p.x, p.y)) {
        this.state = 'chase';
        this.t = 0;
      }
      return 0;
    }

    if (this.state === 'wind') {
      if (this.t >= k.wind) {
        this.state = 'chase';
        this.t = 0;
        this.cd = k.cool;
        // удар засчитывается, только если игрок не успел отойти
        return dist <= k.reach + 0.35 ? this.dmg : 0;
      }
      return 0;
    }

    if (dist <= k.reach && this.cd <= 0) {
      this.state = 'wind';
      this.t = 0;
      return 0;
    }

    // подходим, расталкивая соседей, чтобы не слипались в одну точку
    let sx = dx / (dist || 1);
    let sy = dy / (dist || 1);
    for (const o of others) {
      if (o === this || o.state === 'dead') continue;
      const ox = this.x - o.x;
      const oy = this.y - o.y;
      const d2 = ox * ox + oy * oy;
      if (d2 > 0.0001 && d2 < 0.5) {
        const push = (0.5 - d2) * 2.2;
        sx += (ox / Math.sqrt(d2)) * push;
        sy += (oy / Math.sqrt(d2)) * push;
      }
    }
    const len = Math.hypot(sx, sy) || 1;
    const sp = k.speed * dt;
    if (dist > k.reach * 0.9) this.slide(f, this.x + (sx / len) * sp, this.y + (sy / len) * sp);
    return 0;
  }

  board(t: number): Board {
    const k = TIER[this.tier];
    const dead = this.state === 'dead' ? Math.min(1, this.t / 1.2) : 0;
    const wind = this.state === 'wind' ? Math.sin((this.t / k.wind) * Math.PI) : 0;
    const img = charImage('foes', this.id);
    const src: CanvasImageSource = img ?? this.art;
    const iw = img ? img.naturalWidth : 420;
    const ih = img ? img.naturalHeight : 620;
    return {
      x: this.x,
      y: this.y,
      src,
      aspect: iw / ih,
      scale: k.scale * (1 - dead * 0.55) * (1 + wind * 0.08),
      hang: 0,
      emissive: 0.42,
      glow: dead ? undefined : `${this.aura}66`,
      alpha: 1 - dead * 0.9,
      lift: Math.sin(t * 1.4 + this.ph) * 0.008,
      tag: this,
    };
  }
}

/** сила противников растёт с глубиной */
export function spawnMobs(f: Floor, scale: number): Mob[] {
  return f.spawns.map((s) => new Mob(s.id, s.tier, s.x, s.y, scale));
}

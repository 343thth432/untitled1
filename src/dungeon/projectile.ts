import { PixBuf } from './pixel';
import { solid, type Floor } from './map';
import type { Mob } from './mob';
import type { Board } from './billboard';

/** Ракета в полёте и вспышка разрыва. */

const RW = 48;
const RH = 48;
const EW = 128;
const EH = 128;

const RPAL = ['#00000000', '#07080c', '#5a1218', '#9c2028', '#d2434a', '#2e3442', '#616b80', '#ffcf6a', '#fff3cf'];
const EPAL = ['#00000000', '#00000000', '#4a1206', '#8a2a08', '#d1621a', '#ffab3c', '#ffe08a', '#fff8dc', '#2a2a30'];

let rocketArt: HTMLCanvasElement | null = null;
const boomArt: HTMLCanvasElement[] = [];

function makeRocket(): HTMLCanvasElement {
  const b = new PixBuf(RW, RH);
  const cx = RW >> 1;
  // боеголовка, корпус, оперение и хвостовое пламя
  b.ellipse(cx, 12, 7, 9, 3);
  b.ellipse(cx - 2, 10, 4, 5, 4);
  b.rect(cx - 7, 14, 14, 16, 5);
  b.rect(cx - 7, 14, 4, 16, 6);
  b.rect(cx - 8, 20, 16, 3, 2);
  b.quad([[cx - 12, 30], [cx - 6, 24], [cx - 6, 34]], 5);
  b.quad([[cx + 12, 30], [cx + 6, 24], [cx + 6, 34]], 5);
  b.ellipse(cx, 36, 5, 6, 7);
  b.ellipse(cx, 40, 3, 5, 8);
  b.outline(1);
  return b.toCanvas(RPAL);
}

function makeBoom(k: number): HTMLCanvasElement {
  const b = new PixBuf(EW, EH);
  const cx = EW >> 1;
  const cy = EH >> 1;
  const r = 14 + k * 22;
  // клубы: несколько окружностей по кольцу, ядро светлее краёв
  const lobes = 7 + k * 2;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 + k;
    const rr = r * (0.55 + ((i * 37) % 11) / 26);
    const lx = cx + Math.round(Math.cos(a) * r * 0.55);
    const ly = cy + Math.round(Math.sin(a) * r * 0.42) - k * 5;
    b.ellipse(lx, ly, Math.round(rr * 0.5), Math.round(rr * 0.44), k < 2 ? 4 : 3);
    b.ellipse(lx, ly, Math.round(rr * 0.3), Math.round(rr * 0.26), k < 2 ? 5 : 4);
  }
  b.ellipse(cx, cy - k * 4, Math.round(r * 0.5), Math.round(r * 0.44), k < 3 ? 6 : 5);
  if (k < 2) b.ellipse(cx, cy - k * 4, Math.round(r * 0.26), Math.round(r * 0.22), 7);
  // разлетающиеся осколки
  if (k > 1) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const d = r * 0.9;
      b.rect(cx + Math.round(Math.cos(a) * d), cy + Math.round(Math.sin(a) * d * 0.8) - k * 4, 3, 3, 8);
    }
  }
  return b.toCanvas(EPAL);
}

function art(): { rocket: HTMLCanvasElement; boom: HTMLCanvasElement[] } {
  if (!rocketArt) rocketArt = makeRocket();
  if (!boomArt.length) for (let k = 0; k < 5; k++) boomArt.push(makeBoom(k));
  return { rocket: rocketArt, boom: boomArt };
}

export interface Blast {
  x: number;
  y: number;
  t: number;
}

const SPEED = 8.5;
const SPLASH = 2.4;

export class Rocket {
  x: number;
  y: number;
  private dx: number;
  private dy: number;
  private life = 0;
  dead = false;

  constructor(x: number, y: number, a: number) {
    this.x = x;
    this.y = y;
    this.dx = Math.cos(a);
    this.dy = Math.sin(a);
  }

  /** @returns точка разрыва или null, если ракета ещё летит */
  update(dt: number, f: Floor, mobs: Mob[]): [number, number] | null {
    this.life += dt;
    const step = SPEED * dt;
    const n = Math.max(1, Math.ceil(step / 0.2));
    for (let i = 0; i < n; i++) {
      this.x += (this.dx * step) / n;
      this.y += (this.dy * step) / n;
      if (solid(f, Math.floor(this.x), Math.floor(this.y))) {
        this.dead = true;
        return [this.x - (this.dx * step) / n, this.y - (this.dy * step) / n];
      }
      for (const m of mobs) {
        if (!m.alive) continue;
        if ((m.x - this.x) ** 2 + (m.y - this.y) ** 2 < 0.16) {
          this.dead = true;
          return [this.x, this.y];
        }
      }
    }
    if (this.life > 4) this.dead = true;
    return null;
  }

  board(): Board {
    return {
      x: this.x,
      y: this.y,
      src: art().rocket,
      aspect: 1,
      scale: 0.36,
      hang: 0,
      emissive: 0.9,
      glow: 'rgba(255,150,60,0.5)',
      lift: 0.9,
    };
  }
}

/** урон по площади: ближе к центру — сильнее */
export function splash(mobs: Mob[], x: number, y: number, dmg: number): void {
  for (const m of mobs) {
    if (!m.alive) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (d > SPLASH) continue;
    m.hurtBy(Math.round(dmg * (1 - d / SPLASH) ** 1.4));
  }
}

/** насколько разрыв достаёт игрока: своя ракета тоже больно бьёт */
export function splashOn(px: number, py: number, x: number, y: number, dmg: number): number {
  const d = Math.hypot(px - x, py - y);
  if (d > SPLASH) return 0;
  return Math.round(dmg * 0.5 * (1 - d / SPLASH) ** 1.4);
}

export function blastBoard(b: Blast): Board | null {
  const frames = art().boom;
  const k = Math.floor(b.t / 0.075);
  if (k >= frames.length) return null;
  return {
    x: b.x,
    y: b.y,
    src: frames[k],
    aspect: 1,
    scale: 1.5 + k * 0.5,
    hang: 0,
    emissive: 1,
    glow: 'rgba(255,170,70,0.7)',
    lift: 0.4,
  };
}

/** ------- снаряды тварей и кровь ------- */

const BW = 24;
const BOLT_PAL_BASE = ['#00000000', '#0a0710'];
const boltArt = new Map<string, HTMLCanvasElement>();

/** светящийся шар цвета твари */
function makeBolt(tint: string): HTMLCanvasElement {
  const hit = boltArt.get(tint);
  if (hit) return hit;
  const b = new PixBuf(BW, BW);
  const c = BW >> 1;
  b.ellipse(c, c, 9, 9, 2);
  b.ellipse(c, c, 7, 7, 3);
  b.ellipse(c - 1, c - 1, 4, 4, 4);
  b.ellipse(c - 1, c - 1, 2, 2, 5);
  // рваные протуберанцы, чтобы шар не был идеальным кругом
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.rect(c + Math.round(Math.cos(a) * 9) - 1, c + Math.round(Math.sin(a) * 9) - 1, 2, 2, 3);
  }
  // k > 0 — к белому, k < 0 — к чёрному
  const mix = (k: number): string => {
    const n = parseInt(tint.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
      Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)),
    );
    return `#${((1 << 24) + (ch[0] << 16) + (ch[1] << 8) + ch[2]).toString(16).slice(1)}`;
  };
  const cv = b.toCanvas([...BOLT_PAL_BASE, mix(-0.45), mix(0), mix(0.5), mix(0.9)]);
  boltArt.set(tint, cv);
  return cv;
}

/** снаряд твари: летит по прямой, гаснет о стену или об игрока */
export class Bolt {
  x: number;
  y: number;
  private vx: number;
  private vy: number;
  readonly dmg: number;
  private tint: string;
  alive = true;
  /** прожитое время — по нему шар мигает */
  t = 0;

  constructor(x: number, y: number, a: number, speed: number, dmg: number, tint: string) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.dmg = dmg;
    this.tint = tint;
  }

  /** @returns урон игроку в этот кадр */
  update(dt: number, f: Floor, px: number, py: number): number {
    this.t += dt;
    const n = Math.max(1, Math.ceil(Math.hypot(this.vx, this.vy) * dt * 4));
    for (let i = 0; i < n; i++) {
      this.x += (this.vx * dt) / n;
      this.y += (this.vy * dt) / n;
      if (solid(f, Math.floor(this.x), Math.floor(this.y))) {
        this.alive = false;
        return 0;
      }
      if ((this.x - px) ** 2 + (this.y - py) ** 2 < 0.16) {
        this.alive = false;
        return this.dmg;
      }
    }
    if (this.t > 6) this.alive = false;
    return 0;
  }

  board(): Board {
    return {
      x: this.x,
      y: this.y,
      src: makeBolt(this.tint),
      aspect: 1,
      scale: 0.42 + Math.sin(this.t * 22) * 0.03,
      hang: 0,
      emissive: 1,
      glow: `${this.tint}88`,
    };
  }
}

/** брызги крови в точке попадания */
export interface Puff {
  x: number;
  y: number;
  h: number;
  t: number;
}

const PW = 40;
const PPAL = ['#00000000', '#2c0508', '#6d0d13', '#a8151d', '#d63a34', '#ff8a6a'];
const puffArt: HTMLCanvasElement[] = [];

function makePuff(k: number): HTMLCanvasElement {
  const b = new PixBuf(PW, PW);
  const c = PW >> 1;
  const r = 4 + k * 5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + k;
    const d = r * (0.4 + ((i * 23) % 9) / 14);
    b.ellipse(c + Math.round(Math.cos(a) * d), c + Math.round(Math.sin(a) * d), 3 - k, 3 - k, 2 + (i % 2));
  }
  b.ellipse(c, c, Math.max(1, r - 2 - k * 2), Math.max(1, r - 3 - k * 2), 3);
  b.ellipse(c, c - 1, Math.max(1, r - 5), Math.max(1, r - 5), 4);
  return b.toCanvas(PPAL);
}

/** брызги живут четверть секунды и растворяются */
export function puffBoard(p: Puff): Board | null {
  const k = Math.floor(p.t / 0.06);
  if (k > 3) return null;
  if (!puffArt.length) for (let i = 0; i < 4; i++) puffArt.push(makePuff(i));
  return {
    x: p.x,
    y: p.y,
    src: puffArt[k],
    aspect: 1,
    scale: 0.45 + k * 0.12,
    hang: 0,
    emissive: 0.9,
    alpha: 1 - k * 0.22,
    lift: p.h,
  };
}

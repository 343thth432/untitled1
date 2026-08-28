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
        if (m.state === 'dead') continue;
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
    if (m.state === 'dead') continue;
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

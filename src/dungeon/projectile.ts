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

/** ------- ихор: капли жизни, что остаются от убитой твари ------- */

/**
 * С каждой убитой сыплется несколько капель. Они разлетаются, а потом
 * тянутся к игроку и заживляют. Это единственный надёжный способ
 * поправиться: аптечки на ярусе редки. Значит, отсиживаться в углу
 * невыгодно — чтобы держаться, надо идти вперёд и убивать.
 *
 * Первая капля была тремя вложенными эллипсами и выглядела мёртвой.
 * Теперь это живой огонёк: силуэт пляшет по кадрам, ядро добела, за
 * летящей тянется след из собственных прошлых положений, а вокруг
 * вьются две искры. След тем длиннее, чем быстрее каплю тянет к ногам,
 * поэтому подхваченная капля читается как рывок, а не как переползание.
 */
export interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** высота над полом в долях своего размера */
  h: number;
  t: number;
  heal: number;
  /** свой сдвиг фазы: стая не должна мигать в такт */
  ph: number;
  /** след: тройки x, y, h от свежей к старой */
  tr: number[];
  /** накопитель, чтобы след писался не каждый кадр */
  ta: number;
}

/** с какого расстояния каплю тянет к игроку и с какого она подбирается */
const PULL = 3.2;
const TAKE = 0.5;
const MOTE_LIFE = 8;
const TRAIL = 5;

const WW = 34;
const WH = 44;
const WISP_N = 10;
const WPAL = [
  '#00000000',
  '#1c0106',
  '#5e040f',
  '#9c0d18',
  '#d81f1f',
  '#ff4a2c',
  '#ff8f52',
  '#ffd79a',
  '#fff6e2',
];
const wispArt: HTMLCanvasElement[] = [];
let sparkArt: HTMLCanvasElement | null = null;

/**
 * Огонёк ихора: капля-основание и вылизывающий вверх язык. Силуэт
 * задаётся построчно, поэтому кадры перетекают друг в друга, а не
 * подменяются.
 */
function makeWisp(k: number): HTMLCanvasElement {
  const b = new PixBuf(WW, WH);
  const cx = WW >> 1;
  const ph = (k / WISP_N) * Math.PI * 2;
  const bot = WH - 4;
  const top = 4;
  const H = bot - top;
  for (let y = bot; y >= top; y--) {
    const f = (bot - y) / H;
    // основание круглое, к кончику язык виляет и утончается
    const wob = Math.sin(ph + f * 5.4) * f * f * 4.2;
    const half = Math.max(0.7, (1 - f) ** 0.55 * 9.2 * (0.82 + 0.18 * Math.sin(ph * 2 + f * 3.1)));
    const x = cx + wob;
    const put = (w: number, c: number): void => {
      if (w < 0.5) return;
      b.rect(Math.round(x - w), y, Math.max(1, Math.round(w * 2)), 1, c);
    };
    put(half, f < 0.3 ? 2 : 1 + Math.min(1, Math.floor(f * 2)));
    put(half * 0.74, f < 0.72 ? 3 : 2);
    put(half * 0.5, f < 0.55 ? 4 : 3);
    put(half * 0.3, f < 0.4 ? 5 : 4);
    // ядро добела — только в нижней трети, там, где огонь самый плотный
    if (f < 0.34) put(half * 0.17, f < 0.16 ? 8 : 7);
  }
  // тяжёлая капля у основания и её блик
  b.ellipse(cx, bot - 6, 9, 7, 3);
  b.ellipse(cx, bot - 6, 6, 5, 4);
  b.ellipse(cx - 1, bot - 8, 3, 3, 6);
  b.set(cx - 2, bot - 9, 8);
  // оторвавшиеся угольки над языком
  for (let i = 0; i < 3; i++) {
    const a = ph + i * 2.1;
    const ey = top + 2 + ((i * 5 + k) % 9);
    const ex = cx + Math.round(Math.sin(a) * (3 + i * 2));
    b.ellipse(ex, ey, 1, 1, i === 0 ? 6 : 5);
  }
  return b.toCanvas(WPAL);
}

function makeSpark(): HTMLCanvasElement {
  const b = new PixBuf(10, 10);
  b.ellipse(5, 5, 2, 2, 4);
  b.ellipse(5, 5, 1, 1, 7);
  return b.toCanvas(WPAL);
}

function wisp(k: number): HTMLCanvasElement {
  if (!wispArt.length) for (let i = 0; i < WISP_N; i++) wispArt.push(makeWisp(i));
  return wispArt[k % WISP_N];
}

/** капли из точки, где тварь свалилась */
export function spawnMotes(out: Mote[], x: number, y: number, n: number, heal: number): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 1.1 + Math.random() * 1.5;
    out.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      h: 0.3 + Math.random() * 0.3,
      t: 0,
      heal,
      ph: Math.random() * 100,
      tr: [],
      ta: 0,
    });
  }
}

/**
 * Двигает капли и собирает те, до которых игрок дотянулся.
 *
 * @returns сколько здоровья собрано за этот кадр
 */
export function stepMotes(motes: Mote[], dt: number, px: number, py: number): number {
  let got = 0;
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.t += dt;
    if (m.t > MOTE_LIFE) {
      motes.splice(i, 1);
      continue;
    }
    const dx = px - m.x;
    const dy = py - m.y;
    const d = Math.hypot(dx, dy);
    if (d < TAKE) {
      got += m.heal;
      motes.splice(i, 1);
      continue;
    }
    if (d < PULL) {
      // чем ближе, тем сильнее тянет: у самых ног капля уже не убежит
      const k = (1 - d / PULL) ** 2 * 26;
      m.vx += (dx / d) * k * dt;
      m.vy += (dy / d) * k * dt;
    }
    const drag = Math.max(0, 1 - dt * 2.6);
    m.vx *= drag;
    m.vy *= drag;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.h = 0.32 + Math.sin(m.t * 5.5 + m.ph) * 0.09;
    // след пишется с шагом по времени, а не по кадрам: на быстром
    // устройстве он не должен съёживаться
    m.ta += dt;
    if (m.ta > 0.028) {
      m.ta = 0;
      m.tr.unshift(m.x, m.y, m.h);
      if (m.tr.length > TRAIL * 3) m.tr.length = TRAIL * 3;
    }
  }
  return got;
}

/** огонёк, его след и вьющиеся вокруг искры — всё одной каплей */
export function moteBoards(m: Mote, out: Board[]): void {
  if (!sparkArt) sparkArt = makeSpark();
  const k = Math.floor(m.t * 15 + m.ph * 7) % WISP_N;
  const src = wisp(k);
  // последнюю секунду капля гаснет: видно, что сейчас пропадёт
  const fade = Math.min(1, MOTE_LIFE - m.t);
  const sp = Math.hypot(m.vx, m.vy);
  const pulse = 1 + Math.sin(m.t * 9 + m.ph) * 0.08;
  // след виден только на ходу: подхваченная капля читается рывком
  const tail = Math.min(1, sp / 3.4);
  if (tail > 0.05) {
    for (let i = 2; i < m.tr.length; i += 3) {
      const j = (i - 2) / 3;
      out.push({
        x: m.tr[i - 2],
        y: m.tr[i - 1],
        src,
        aspect: WW / WH,
        scale: 0.4 * pulse * (1 - (j + 1) / (TRAIL + 1)) * (0.6 + tail * 0.4),
        hang: 0,
        emissive: 1,
        alpha: fade * tail * 0.42 * (1 - j / TRAIL),
        lift: m.tr[i],
      });
    }
  }
  out.push({
    x: m.x,
    y: m.y,
    src,
    aspect: WW / WH,
    scale: 0.4 * pulse,
    hang: 0,
    emissive: 1,
    alpha: fade,
    glow: '#ff4a2c55',
    lift: m.h,
  });
  for (let i = 0; i < 2; i++) {
    const a = m.t * 3.4 + m.ph + i * Math.PI;
    out.push({
      x: m.x + Math.cos(a) * 0.11,
      y: m.y + Math.sin(a) * 0.11,
      src: sparkArt,
      aspect: 1,
      scale: 0.09 + Math.sin(m.t * 11 + i) * 0.02,
      hang: 0,
      emissive: 1,
      alpha: fade * 0.9,
      lift: m.h + 0.16 + Math.sin(m.t * 4 + i * 2) * 0.1,
    });
  }
}

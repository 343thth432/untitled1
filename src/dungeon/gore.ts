import { bloodDrop, bloodFrames, bloodMasks, loadBlood, type Mask } from './bloodArt';
import { solid, type Floor } from './map';
import { EYE_H, FOV, projOf, WALL_H, type Cam, type Palette, type Raycaster } from './render';

/**
 * Кровь. Раньше попадание давало облачко из четырёх кадров и гасло за
 * четверть секунды — этого мало. Теперь бойня собрана из четырёх слоёв,
 * и каждый работает по-своему:
 *
 *  — брызги: настоящие частицы с тяжестью, они летят по дуге, бьются о
 *    стены и падают на пол, а на лету растянуты по направлению полёта;
 *  — пятна: то, во что брызги превращаются. Лужи на полу и потёки на
 *    стенах остаются до конца яруса и подмешиваются прямо в затенение
 *    камня — это не спрайты поверх, а сам камень, залитый кровью;
 *  — выхлоп: вспышка мяса в точке попадания, разная для головы, корпуса
 *    и ног;
 *  — забрызганный взгляд: если рвануло под носом, кровь летит «на
 *    стекло» и медленно сползает.
 */

/* ─────────────────────── пятна на камне ─────────────────────── */

/** на столько частей дробится клетка пола */
const SUB = 24;
/** сетка потёка на грани стены: вдоль и по высоте */
const WU = 32;
const WV = 24;

// нарисованные листы крови тянутся один раз, до первого кадра игры
loadBlood();

function hash(a: number, b: number): number {
  let n = (a * 374761393 + b * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/**
 * Карта залитости камня. Пол — плотная сетка на весь ярус, стены —
 * разреженная: грань заводится только когда на неё что-то попало.
 */
export class Stains {
  readonly w: number;
  readonly h: number;
  readonly stride: number;
  readonly rows: number;
  readonly floor: Uint8Array;
  private faces = new Map<number, Uint8Array>();

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.stride = w * SUB;
    this.rows = h * SUB;
    this.floor = new Uint8Array(this.stride * this.rows);
  }

  /** доля залитости пола в мировой точке, 0..1 */
  atFloor(fx: number, fy: number): number {
    const gx = (fx * SUB) | 0;
    const gy = (fy * SUB) | 0;
    if (gx < 0 || gy < 0 || gx >= this.stride || gy >= this.rows) return 0;
    return this.floor[gy * this.stride + gx] * (1 / 255);
  }

  /** лужа: нарисованной маской, если лист крови загрузился */
  pool(x: number, y: number, r: number, amt: number): void {
    // мелкая метка от одной капли рисованной формы не стоит: на трёх
    // точках сетки от неё останется то же пятно
    const set = r > 0.14 ? bloodMasks('pool') : null;
    if (set && set.length) {
      this.stamp(x, y, r, amt, set[(Math.random() * set.length) | 0]);
      return;
    }
    const x0 = Math.max(0, Math.floor((x - r) * SUB));
    const x1 = Math.min(this.stride - 1, Math.ceil((x + r) * SUB));
    const y0 = Math.max(0, Math.floor((y - r) * SUB));
    const y1 = Math.min(this.rows - 1, Math.ceil((y + r) * SUB));
    const f = this.floor;
    for (let gy = y0; gy <= y1; gy++) {
      const wy = (gy + 0.5) / SUB;
      for (let gx = x0; gx <= x1; gx++) {
        const wx = (gx + 0.5) / SUB;
        const d = Math.hypot(wx - x, wy - y);
        // край рваный: радиус гуляет от клетки к клетке
        const rr = r * (0.66 + hash(gx, gy) * 0.62);
        if (d > rr) continue;
        const k = 1 - (d / rr) ** 1.7;
        const i = gy * this.stride + gx;
        const v = f[i] + amt * 255 * k;
        f[i] = v > 255 ? 255 : v;
      }
    }
  }

  /** колонка сетки потёка по доле вдоль грани: столбец кадра берёт её раз */
  wallCol(u: number): number {
    const i = (u * WU) | 0;
    return i < 0 ? 0 : i >= WU ? WU - 1 : i;
  }

  /** залитость грани в колонке на мировой высоте, 0..1 */
  wallAt(face: Uint8Array, ui: number, zw: number): number {
    const v = ((zw * WV) / WALL_H) | 0;
    if (v < 0 || v >= WV) return 0;
    return face[v * WU + ui] * (1 / 255);
  }

  /** кладёт маску густоты на пол квадратом со стороной 2r */
  private stamp(x: number, y: number, r: number, amt: number, m: Mask): void {
    const x0 = Math.max(0, Math.floor((x - r) * SUB));
    const x1 = Math.min(this.stride - 1, Math.ceil((x + r) * SUB));
    const y0 = Math.max(0, Math.floor((y - r) * SUB));
    const y1 = Math.min(this.rows - 1, Math.ceil((y + r) * SUB));
    const f = this.floor;
    const k = m.s / (2 * r);
    for (let gy = y0; gy <= y1; gy++) {
      const v = (((gy + 0.5) / SUB - (y - r)) * k) | 0;
      if (v < 0 || v >= m.s) continue;
      for (let gx = x0; gx <= x1; gx++) {
        const u = (((gx + 0.5) / SUB - (x - r)) * k) | 0;
        if (u < 0 || u >= m.s) continue;
        const a = m.a[v * m.s + u];
        if (!a) continue;
        const i = gy * this.stride + gx;
        const val = f[i] + amt * a;
        f[i] = val > 255 ? 255 : val;
      }
    }
  }

  private key(mx: number, my: number, side: number, sign: number): number {
    return ((my * this.w + mx) << 2) | (side << 1) | (sign > 0 ? 1 : 0);
  }

  /** грань стены, если на неё уже попадало */
  faceAt(mx: number, my: number, side: number, sign: number): Uint8Array | undefined {
    return this.faces.get(this.key(mx, my, side, sign));
  }

  /** потёк на грани: u — доля вдоль грани, z — высота в клетках */
  splat(mx: number, my: number, side: number, sign: number, u: number, z: number, r: number, amt: number): void {
    const k = this.key(mx, my, side, sign);
    let a = this.faces.get(k);
    if (!a) {
      a = new Uint8Array(WU * WV);
      this.faces.set(k, a);
    }
    const set = bloodMasks('wall');
    if (set && set.length) {
      const m = set[(Math.random() * set.length) | 0];
      // на кадре брызга сидит в верхней трети клетки, а потёки уходят до
      // низа. Значит квадрат маски вешаем так, чтобы точка удара легла на
      // саму брызгу, а хвост свесился ниже
      const side = r * 5.5;
      const left = u - side / 2;
      const top = z + side * 0.28;
      for (let vv = 0; vv < WV; vv++) {
        const wz = ((vv + 0.5) / WV) * WALL_H;
        const my = (((top - wz) / side) * m.s) | 0;
        if (my < 0 || my >= m.s) continue;
        for (let uu = 0; uu < WU; uu++) {
          const mx = ((((uu + 0.5) / WU - left) / side) * m.s) | 0;
          if (mx < 0 || mx >= m.s) continue;
          const al = m.a[my * m.s + mx];
          if (!al) continue;
          const i = vv * WU + uu;
          const val = a[i] + amt * al;
          a[i] = val > 255 ? 255 : val;
        }
      }
      return;
    }
    const cu = u * WU;
    const cv = (z / WALL_H) * WV;
    const ru = r * WU;
    const rv = r * (WV / WALL_H);
    for (let v = Math.max(0, Math.floor(cv - rv * 1.5)); v <= Math.min(WV - 1, Math.ceil(cv + rv)); v++) {
      for (let uu = Math.max(0, Math.floor(cu - ru * 1.3)); uu <= Math.min(WU - 1, Math.ceil(cu + ru * 1.3)); uu++) {
        const j = 0.66 + hash(uu * 3 + mx, v * 5 + my) * 0.66;
        const du = (uu + 0.5 - cu) / Math.max(0.5, ru * j);
        // вниз пятно тянется сильнее: кровь стекает
        const dv = (v + 0.5 - cv) / Math.max(0.5, rv * j * (v + 0.5 > cv ? 2.2 : 1));
        const d = Math.hypot(du, dv);
        if (d > 1) continue;
        const i = v * WU + uu;
        const val = a[i] + amt * 255 * (1 - d ** 1.5);
        a[i] = val > 255 ? 255 : val;
      }
    }
  }
}

/* ─────────────────────── брызги ─────────────────────── */

/** 0 — взвесь, 1 — капля, 2 — ошмёток */
type Kind = 0 | 1 | 2;

interface Drop {
  x: number;
  y: number;
  /** высота над полом в клетках */
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** радиус в клетках */
  r: number;
  t: number;
  life: number;
  kind: Kind;
  /** сколько отскоков осталось ошмётку */
  hop: number;
}

/** вспышка мяса в точке попадания */
interface Gush {
  x: number;
  y: number;
  z: number;
  t: number;
  /** 0 — корпус, 1 — фонтан из головы, 2 — разрыв */
  sort: number;
  size: number;
}

/** клякса на «стекле» */
interface Lens {
  u: number;
  v: number;
  s: number;
  rot: number;
  t: number;
  life: number;
  art: number;
}

const GRAV = 11;
const MAX_DROPS = 340;

/* ── рисованные кадры ── */


/** ступеней тонировки по мгле: дальняя кровь должна тонуть, как и всё */
const FOGS = 6;
const BS = 40;
const blobs = new Map<string, HTMLCanvasElement>();

/**
 * Кадр капли: круглое ядро, растушёванный край и ни одного угла. Кадр
 * тонируется под мглу заранее — на каждый вид крови и на каждую ступень
 * дальности свой, всего полтора десятка на ярус.
 */
function blob(kind: Kind, band: number, fog: [number, number, number]): HTMLCanvasElement {
  const key = `${kind}|${band}|${fog[0]},${fog[1]},${fog[2]}`;
  const had = blobs.get(key);
  if (had) return had;
  const base = kind === 0 ? [226, 74, 54] : kind === 2 ? [116, 14, 20] : [164, 22, 26];
  const f = band / (FOGS - 1);
  const [r, g, b] = base.map((v, i) => Math.round(v * (1 - f) + fog[i] * f));
  const cv = document.createElement('canvas');
  cv.width = BS;
  cv.height = BS;
  const c = cv.getContext('2d')!;
  const c2 = BS / 2;
  const gr = c.createRadialGradient(c2, c2, 0, c2, c2, c2);
  if (kind === 0) {
    // взвесь: рыхлое облачко без плотного ядра
    gr.addColorStop(0, `rgba(${r},${g},${b},0.85)`);
    gr.addColorStop(0.45, `rgba(${r},${g},${b},0.5)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  } else {
    gr.addColorStop(0, `rgba(${Math.min(255, r + 34)},${g + 14},${b + 12},1)`);
    gr.addColorStop(0.38, `rgba(${r},${g},${b},1)`);
    gr.addColorStop(0.74, `rgba(${r},${g},${b},0.92)`);
    gr.addColorStop(0.92, `rgba(${(r * 0.55) | 0},${(g * 0.5) | 0},${(b * 0.5) | 0},0.5)`);
    gr.addColorStop(1, `rgba(${(r * 0.5) | 0},${(g * 0.5) | 0},${(b * 0.5) | 0},0)`);
  }
  c.fillStyle = gr;
  c.fillRect(0, 0, BS, BS);
  if (kind === 2) {
    // на мокром ошмётке блик: иначе это просто тёмное пятно
    const sp = c.createRadialGradient(c2 - BS * 0.16, c2 - BS * 0.18, 0, c2 - BS * 0.16, c2 - BS * 0.18, BS * 0.22);
    sp.addColorStop(0, 'rgba(255,150,120,0.5)');
    sp.addColorStop(1, 'rgba(255,150,120,0)');
    c.fillStyle = sp;
    c.fillRect(0, 0, BS, BS);
  }
  blobs.set(key, cv);
  return cv;
}

const GW = 128;
const gushArt: HTMLCanvasElement[][] = [];
const GUSH_N = 7;

/** мягкий сгусток: ядро, растушёванный край, ни одного угла */
function gob(c: CanvasRenderingContext2D, x: number, y: number, r: number, tone: number, a: number): void {
  if (r < 0.4) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  // tone: 0 — тёмная венозная гуща, 1 — светлая свежая брызга
  const cr = Math.round(120 + tone * 135);
  const cg = Math.round(10 + tone * 62);
  const cb = Math.round(14 + tone * 52);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
  g.addColorStop(0.55, `rgba(${cr},${cg},${cb},${a * 0.93})`);
  g.addColorStop(0.84, `rgba(${(cr * 0.6) | 0},${(cg * 0.5) | 0},${(cb * 0.5) | 0},${a * 0.55})`);
  g.addColorStop(1, `rgba(${(cr * 0.5) | 0},${(cg * 0.4) | 0},${(cb * 0.4) | 0},0)`);
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

/**
 * Кадр выхлопа из раны. Собран не из пикселей, а из мягких сгустков:
 * ядро, разбегающиеся пальцы и отрывающиеся с их концов капли. Пиксельная
 * звёздочка на месте попадания читалась как значок, а не как кровь.
 */
function makeGush(sort: number, k: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = GW;
  cv.height = GW;
  const c = cv.getContext('2d')!;
  const o = GW / 2;
  const t = k / (GUSH_N - 1);
  const reach = (sort === 2 ? 56 : sort === 1 ? 48 : 40) * (0.24 + t * 0.86);
  const rays = sort === 2 ? 15 : 11;
  const fade = 1 - t * 0.4;
  const rise = t * (sort === 1 ? 16 : 6);
  // ядро: сперва тяжёлый сгусток мяса, потом раздаётся и редеет
  const cr = (sort === 2 ? 34 : 26) * (1 - t * 0.42);
  gob(c, o, o - rise, cr, 0.08, fade);
  gob(c, o, o - rise * 1.1, cr * 0.72, 0.26, fade);
  gob(c, o - cr * 0.15, o - rise * 1.2, cr * 0.4, 0.62, fade);
  for (let i = 0; i < rays; i++) {
    // направление у пальца своё, но одно и то же во всех кадрах: выхлоп
    // растёт, а не мигает новой кляксой. Длины нарочно неровные — ровный
    // веер читается звёздочкой, а не кровью
    let a = (i / rays) * Math.PI * 2 + hash(i, sort) * 0.85;
    if (sort === 1) a = -Math.PI / 2 + (hash(i, 9) - 0.5) * 2.1;
    const short = hash(i, sort + 21) < 0.45;
    const len = reach * (short ? 0.2 + hash(i, 5) * 0.28 : 0.6 + hash(i, sort + 3) * 0.7);
    const wide = (sort === 2 ? 13 : 11) * (1 - t * 0.34) * (short ? 1.25 : 1);
    const steps = 8;
    for (let sN = 1; sN <= steps; sN++) {
      const f = sN / steps;
      const d = f * len;
      const x = o + Math.cos(a) * d + Math.sin(f * 6 + i) * wide * 0.16;
      const y = o + Math.sin(a) * d * 0.9 - rise;
      gob(c, x, y, wide * (1 - f * 0.66), 0.12 + f * 0.55, fade * (1 - f * 0.28));
    }
    // капля, оторвавшаяся с конца пальца
    const ex = o + Math.cos(a) * len * 1.16;
    const ey = o + Math.sin(a) * len * 1.04 - rise * 1.2;
    gob(c, ex, ey, (sort === 2 ? 6 : 4.6) * (1 - t * 0.25), 0.68, fade);
  }
  // мелочь вокруг: россыпь, которая не привязана к пальцам
  for (let i = 0; i < 14; i++) {
    const a = hash(i, sort + 90) * Math.PI * 2;
    const d = reach * (0.35 + hash(i, sort + 77) * 0.85);
    gob(c, o + Math.cos(a) * d, o + Math.sin(a) * d * 0.9 - rise, 1.6 + hash(i, 61) * 3.6, 0.55, fade);
  }
  return cv;
}

const GUSH_SHEET = ['burst-body', 'burst-head', 'burst-gib'] as const;
/** сколько живёт выхлоп: кадры растягиваются на это время, сколько бы их ни было */
const GUSH_T = 0.34;

function gushFrames(sort: number): HTMLCanvasElement[] {
  const drawn = bloodFrames(GUSH_SHEET[sort] ?? 'burst-body');
  if (drawn && drawn.length) return drawn;
  let a = gushArt[sort];
  if (!a) {
    a = [];
    for (let k = 0; k < GUSH_N; k++) a.push(makeGush(sort, k));
    gushArt[sort] = a;
  }
  return a;
}

const LW = 96;
const lensArt: HTMLCanvasElement[] = [];

/**
 * Клякса на «стекле»: несколько слипшихся сгустков, россыпь мелочи
 * вокруг и потёк вниз. Тоже мягкая — брызга на визоре не бывает
 * квадратной.
 */
function makeLens(seed: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = LW;
  cv.height = LW;
  const c = cv.getContext('2d')!;
  const o = LW / 2;
  const lobes = 3 + Math.floor(hash(seed, 1) * 3);
  for (let i = 0; i < lobes; i++) {
    const a = hash(seed, i + 2) * Math.PI * 2;
    const d = hash(seed, i + 9) * 13;
    gob(c, o + Math.cos(a) * d, o + Math.sin(a) * d, 9 + hash(seed, i + 17) * 12, 0.16, 0.95);
  }
  // потёк: сгустки помельче и пожиже, уходящие вниз
  const tail = 3 + Math.floor(hash(seed, 31) * 4);
  for (let i = 1; i <= tail; i++) {
    const f = i / tail;
    gob(c, o + (hash(seed, i + 40) - 0.5) * 7, o + 12 + f * 26, 6 * (1 - f * 0.7), 0.1, 0.8 * (1 - f * 0.6));
  }
  for (let i = 0; i < 11; i++) {
    const a = hash(seed, i + 60) * Math.PI * 2;
    const d = 18 + hash(seed, i + 71) * 24;
    gob(c, o + Math.cos(a) * d, o + Math.sin(a) * d, 1.6 + hash(seed, i + 83) * 3.4, 0.24, 0.9);
  }
  return cv;
}

function lensFrame(i: number): HTMLCanvasElement {
  const drawn = bloodFrames('lens');
  if (drawn && drawn.length) return drawn[i % drawn.length];
  if (!lensArt.length) for (let k = 0; k < 6; k++) lensArt.push(makeLens(k * 13 + 3));
  return lensArt[i % lensArt.length];
}

/* ─────────────────────── общий двигатель ─────────────────────── */

export class Gore {
  readonly stains: Stains;
  private drops: Drop[] = [];
  private gushes: Gush[] = [];
  private lens: Lens[] = [];
  /** тряска камеры: её забирает и гасит игровой цикл */
  shake = 0;
  private cx = 0;
  private cy = 0;

  constructor(w: number, h: number) {
    this.stains = new Stains(w, h);
  }

  private add(d: Drop): void {
    if (this.drops.length >= MAX_DROPS) this.drops.shift();
    this.drops.push(d);
  }

  /**
   * Струя из раны. Кровь идёт тремя пучками, как ей и положено: назад,
   * в стрелка, — самый узкий; вперёд, за спину твари, — самый широкий и
   * быстрый; и вверх дугой, чтобы было чему падать на пол.
   *
   * @param a  направление выстрела
   * @param n  сколько капель — по силе попадания
   * @param zone 0 голова, 1 корпус, 2 ноги
   */
  private jet(x: number, y: number, z: number, a: number, n: number, zone: number, force: number): void {
    for (let i = 0; i < n; i++) {
      const back = i % 4 === 0;
      const up = !back && i % 3 === 0;
      const spread = back ? 0.5 : up ? 1.1 : 0.85;
      const dir = a + Math.PI * (back ? 1 : 0) + (Math.random() - 0.5) * spread;
      const sp = (back ? 1.4 : 2.6) * force * (0.45 + Math.random() * 0.9);
      const kind: Kind = Math.random() < 0.42 ? 0 : 1;
      this.add({
        x,
        y,
        z,
        vx: Math.cos(dir) * sp,
        vy: Math.sin(dir) * sp,
        vz: (up ? 2.6 : zone === 0 ? 1.7 : 0.5) * force * (0.4 + Math.random()) - 0.3,
        r: kind === 0 ? 0.016 + Math.random() * 0.02 : 0.022 + Math.random() * 0.03,
        t: 0,
        life: kind === 0 ? 0.22 + Math.random() * 0.2 : 2.6,
        kind,
        hop: 0,
      });
    }
  }

  /**
   * Попадание пулей.
   *
   * @param zone 0 — голова, 1 — корпус, 2 — ноги: от этого и высота
   *   струи, и её вид
   */
  hit(x: number, y: number, z: number, a: number, dmg: number, zone: number): void {
    const force = 0.75 + Math.min(1.4, dmg / 26);
    const n = Math.round(Math.min(16, 3 + dmg * 0.45));
    this.jet(x, y, z, a, n, zone, force);
    this.gushes.push({ x, y, z, t: 0, sort: zone === 0 ? 1 : 0, size: (zone === 0 ? 0.78 : 0.66) * force });
    if (zone === 0) this.shake = Math.max(this.shake, 0.18);
    this.lensFrom(x, y, zone === 0 ? 3 : 2);
  }

  /** тварь свалилась: последний выброс и лужа под ней */
  fall(x: number, y: number, tall: number, a: number): void {
    this.jet(x, y, tall * 0.45, a, 12, 1, 1.1);
    this.gushes.push({ x, y, z: tall * 0.45, t: 0, sort: 0, size: 0.85 });
    this.stains.pool(x, y, 0.18 + tall * 0.1, 0.5);
    this.lensFrom(x, y, 3);
  }

  /**
   * Разорвало в клочья: взвесь во все стороны, тяжёлые ошмётки с
   * отскоком и сразу широкая лужа.
   */
  gib(x: number, y: number, tall: number): void {
    const z = tall * 0.5;
    for (let i = 0; i < 44; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.6 + Math.random() * 5.4;
      const kind: Kind = Math.random() < 0.5 ? 0 : 1;
      this.add({
        x,
        y,
        z: z * (0.4 + Math.random() * 0.9),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 1.2 + Math.random() * 4.6,
        r: kind === 0 ? 0.02 + Math.random() * 0.025 : 0.026 + Math.random() * 0.036,
        t: 0,
        life: kind === 0 ? 0.3 + Math.random() * 0.25 : 3.2,
        kind,
        hop: 0,
      });
    }
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.1 + Math.random() * 3.4;
      this.add({
        x,
        y,
        z,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 2.2 + Math.random() * 3.6,
        r: 0.055 + Math.random() * 0.055,
        t: 0,
        life: 5,
        kind: 2,
        hop: 1,
      });
    }
    this.gushes.push({ x, y, z, t: 0, sort: 2, size: 0.62 + tall * 0.38 });
    this.stains.pool(x, y, 0.3 + tall * 0.16, 0.85);
    this.shake = Math.max(this.shake, 0.45);
    this.lensFrom(x, y, 6);
  }

  /** труп ещё течёт: лужа растёт, изредка срывается капля */
  bleed(x: number, y: number, tall: number, dt: number): void {
    this.stains.pool(x + (Math.random() - 0.5) * 0.2, y + (Math.random() - 0.5) * 0.2, 0.11 + tall * 0.07, dt * 1.5);
    if (Math.random() < dt * 7) {
      this.add({
        x: x + (Math.random() - 0.5) * 0.24,
        y: y + (Math.random() - 0.5) * 0.24,
        z: tall * 0.22 * Math.random(),
        vx: 0,
        vy: 0,
        vz: 0,
        r: 0.024,
        t: 0,
        life: 2,
        kind: 1,
        hop: 0,
      });
    }
  }

  /** кровь на «стекле», если рвануло под самым носом */
  private lensFrom(x: number, y: number, n: number): void {
    const d = Math.hypot(x - this.cx, y - this.cy);
    if (d > 2.6) return;
    const k = 1 - d / 2.6;
    for (let i = 0; i < n; i++) {
      if (Math.random() > k * 0.85) continue;
      // к краям гуще: середину кадра кровь не должна закрывать — целиться
      // сквозь неё всё равно придётся
      const e = Math.random() < 0.62;
      this.lens.push({
        u: e ? (Math.random() < 0.5 ? Math.random() * 0.26 : 0.74 + Math.random() * 0.26) : 0.2 + Math.random() * 0.6,
        v: e ? (Math.random() < 0.5 ? Math.random() * 0.3 : 0.66 + Math.random() * 0.3) : 0.15 + Math.random() * 0.6,
        s: (0.45 + Math.random() * 0.85) * (0.55 + k * 0.6),
        rot: Math.random() * Math.PI * 2,
        t: 0,
        life: 3 + Math.random() * 3.4,
        art: Math.floor(Math.random() * 6),
      });
    }
    if (this.lens.length > 16) this.lens.splice(0, this.lens.length - 16);
  }

  /** двигает всё разом; заодно запоминает, где стоит глаз */
  step(dt: number, f: Floor, px: number, py: number): void {
    this.cx = px;
    this.cy = py;
    const st = this.stains;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.t += dt;
      if (d.t > d.life) {
        // взвесь просто тает, капля перед смертью всё же метит пол
        if (d.kind !== 0) st.pool(d.x, d.y, d.r * 3, 0.25);
        this.drops.splice(i, 1);
        continue;
      }
      if (d.kind === 0) {
        // взвесь: почти невесома и быстро вязнет в воздухе
        const drag = Math.max(0, 1 - dt * 5.5);
        d.vx *= drag;
        d.vy *= drag;
        d.vz = d.vz * drag - GRAV * 0.22 * dt;
      } else {
        d.vz -= GRAV * dt;
        const drag = Math.max(0, 1 - dt * 0.55);
        d.vx *= drag;
        d.vy *= drag;
      }
      const nx = d.x + d.vx * dt;
      const ny = d.y + d.vy * dt;
      const nz = d.z + d.vz * dt;
      // стена: капля лопается на грани и остаётся потёком
      if (nz < WALL_H && (solid(f, Math.floor(nx), Math.floor(d.y)) || solid(f, Math.floor(d.x), Math.floor(ny)))) {
        if (d.kind !== 0) {
          const side = solid(f, Math.floor(nx), Math.floor(d.y)) ? 0 : 1;
          const mx = side === 0 ? Math.floor(nx) : Math.floor(d.x);
          const my = side === 0 ? Math.floor(d.y) : Math.floor(ny);
          const sign = side === 0 ? (d.vx > 0 ? -1 : 1) : d.vy > 0 ? -1 : 1;
          const u = side === 0 ? ny - Math.floor(ny) : nx - Math.floor(nx);
          st.splat(mx, my, side, sign, u, Math.max(0.05, nz), d.r * (d.kind === 2 ? 5 : 3.4), 0.75);
        }
        this.drops.splice(i, 1);
        continue;
      }
      if (nz <= 0) {
        if (d.kind === 2 && d.hop > 0) {
          // ошмёток разок подпрыгивает и метит пол дважды
          d.hop--;
          d.z = 0;
          d.vz = -d.vz * 0.36;
          d.vx *= 0.45;
          d.vy *= 0.45;
          st.pool(d.x, d.y, d.r * 4, 0.6);
          continue;
        }
        st.pool(nx, ny, d.r * (d.kind === 2 ? 6 : 3.6), d.kind === 2 ? 0.9 : 0.45);
        this.drops.splice(i, 1);
        continue;
      }
      d.x = nx;
      d.y = ny;
      d.z = nz;
    }
    for (let i = this.gushes.length - 1; i >= 0; i--) {
      this.gushes[i].t += dt;
      if (this.gushes[i].t > GUSH_T) this.gushes.splice(i, 1);
    }
    for (let i = this.lens.length - 1; i >= 0; i--) {
      const l = this.lens[i];
      l.t += dt;
      // клякса сползает вниз, замедляясь: густая кровь
      l.v += dt * 0.012 * (1 - l.t / l.life);
      if (l.t > l.life) this.lens.splice(i, 1);
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.6);
  }

  /**
   * Рисует брызги. Раньше это были заливки прямоугольниками по буферу
   * малого разрешения, и вблизи капля превращалась в алый квадрат.
   * Теперь кровь идёт поверх увеличенного кадра в полном разрешении
   * экрана и своими кадрами: круглое ядро с растушёванным краем,
   * растянутое по направлению полёта. Перекрытие стенами остаётся —
   * глубина берётся из того же буфера, столбец ищется по экранному x.
   */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, rc: Raycaster, cam: Cam, pal: Palette): void {
    const bw = rc.w;
    const bh = rc.h;
    const depth = rc.depth;
    const half = bh >> 1;
    const proj = projOf(bw);
    const kx = w / bw;
    const ky = h / bh;
    const dirX = Math.cos(cam.a);
    const dirY = Math.sin(cam.a);
    const planeX = -dirY * FOV;
    const planeY = dirX * FOV;
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    const fog = pal.fog;
    const dens = pal.density;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    let i2 = 0;
    let was = -1;
    for (const d of this.drops) {
      i2++;
      const sx = d.x - cam.x;
      const sy = d.y - cam.y;
      const ty = invDet * (-planeY * sx + planeX * sy);
      if (ty <= 0.22 || ty > 26) continue;
      const tx = invDet * (dirY * sx - dirX * sy);
      const scr = (bw / 2) * (1 + tx / ty);
      const col = Math.round(scr);
      if (col < 0 || col >= bw || depth[col] <= ty) continue;
      const py = half + (EYE_H * proj) / ty - (d.z * proj) / ty;
      // где капля была мгновение назад — по этому отрезку её и растягивает
      const st = d.kind === 0 ? 0.05 : 0.032;
      const bx = d.x - d.vx * st - cam.x;
      const by = d.y - d.vy * st - cam.y;
      const bty = invDet * (-planeY * bx + planeX * by);
      let tailX = scr;
      let tailY = py;
      if (bty > 0.2) {
        tailX = (bw / 2) * (1 + (invDet * (dirY * bx - dirX * by)) / bty);
        tailY = half + (EYE_H * proj) / bty - ((d.z - d.vz * st) * proj) / bty;
      }
      const size = Math.min(34, Math.max(1.6, ((d.r * 2 * proj) / ty) * kx));
      const dx = (tailX - scr) * kx;
      const dy = (tailY - py) * ky;
      const len = Math.min(size * 6, Math.max(size, Math.hypot(dx, dy) + size * 0.5));
      const band = Math.min(FOGS - 1, Math.round((1 - Math.exp(-ty * dens)) * (FOGS - 1)));
      const dim = d.kind === 0 ? Math.max(0, 1 - d.t / d.life) : 1;
      const al = d.kind === 0 ? 0.16 + dim * 0.44 : Math.min(1, 0.65 + dim * 0.35);
      if (al !== was) {
        ctx.globalAlpha = al;
        was = al;
      }
      // на листе капель шесть клеток: первые четыре — капли, две последние
      // — ошмётки мяса
      const spr = bloodDrop(d.kind === 2 ? 4 + ((d.hop + i2) % 2) : (i2 * 7) % 4, band, FOGS, fog)
        ?? blob(d.kind, band, fog);
      const cx = scr * kx;
      const cy = py * ky;
      if (len < size * 1.3) {
        // почти стоячая капля: разворот холста ради неё не окупается, а
        // на пике их сотни
        ctx.drawImage(spr, cx - size / 2, cy - size / 2, size, size);
      } else {
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.drawImage(spr, -len * 0.62, -size / 2, len, size);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    ctx.restore();

    // вспышки мяса — поверх брызг, с той же обрезкой по глубине
    ctx.save();
    for (const g of this.gushes) {
      const frames = gushFrames(g.sort);
      const k = Math.min(frames.length - 1, Math.floor((g.t / GUSH_T) * frames.length));
      const sx = g.x - cam.x;
      const sy = g.y - cam.y;
      const ty = invDet * (-planeY * sx + planeX * sy);
      if (ty <= 0.16) continue;
      const tx = invDet * (dirY * sx - dirX * sy);
      const scr = (bw / 2) * (1 + tx / ty);
      // в упор выхлоп иначе застилает весь кадр одним размытым пятном
      const sh = Math.min(bh * 0.58, (g.size * proj) / ty);
      // фонтан из головы нарисован стоящим на нижнем краю клетки:
      // его надо ставить на рану, а не вешать на неё серединой
      const top = half + (EYE_H * proj) / ty - (g.z * proj) / ty - sh * (g.sort === 1 ? 1 : 0.5);
      const left = scr - sh / 2;
      const x0 = Math.max(0, Math.floor(left));
      const x1 = Math.min(bw - 1, Math.ceil(left + sh));
      let run = -1;
      ctx.globalAlpha = Math.max(0, 1 - (g.t / GUSH_T) * 0.7);
      for (let x = x0; x <= x1 + 1; x++) {
        const vis = x <= x1 && depth[x] > ty;
        if (vis && run < 0) run = x;
        if ((!vis || x > x1) && run >= 0) {
          const cw = x - run;
          ctx.drawImage(
            frames[k],
            ((run - left) / sh) * frames[k].width,
            0,
            (cw / sh) * frames[k].width,
            frames[k].height,
            run * kx,
            top * ky,
            cw * kx,
            sh * ky,
          );
          run = -1;
        }
      }
    }
    ctx.restore();
  }

  /** кровь на «стекле»: поверх всего, но под показаниями */
  drawLens(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const side = Math.min(w, h);
    for (const l of this.lens) {
      const k = l.t / l.life;
      ctx.save();
      // проступает мгновенно, сходит долго
      ctx.globalAlpha = Math.min(1, l.t * 14) * (1 - k) ** 1.5 * 0.38;
      ctx.translate(l.u * w, l.v * h);
      ctx.rotate(l.rot);
      const s = side * 0.085 * l.s;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(lensFrame(l.art), -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }

  get count(): number {
    return this.drops.length;
  }
}

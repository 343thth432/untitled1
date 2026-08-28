/**
 * Пиксельный холст с формой и освещением.
 *
 * Обычный рисовальщик заливает фигуру плоским цветом, а тень получается
 * фигурой поменьше сверху — отсюда ощущение, что персонаж собран из
 * деталей. Здесь иначе: каждая операция кладёт не цвет, а материал и
 * нормаль поверхности. Рука, нарисованная как цилиндр, получает нормаль,
 * уходящую вбок, голова как шар — расходящуюся из центра.
 *
 * Готовый кадр считается один раз в конце: свет по Ламберту, контровой
 * по кромке, затем цвет квантуется в рампу материала с упорядоченным
 * дизерингом. Рампа из одного базового цвета строится сама, со сдвигом
 * тона — тени в холод, света в тепло. Так работают пиксель-художники, и
 * так спрайт перестаёт выглядеть плоской аппликацией.
 */

/** как операция понимает свою поверхность */
export type Form = 'flat' | 'sphere' | 'cylx' | 'cyly';

/** описание материала: базовый цвет и характер поверхности */
export interface Mat {
  /** базовый цвет; рампа строится из него */
  base: string;
  /** 0 — матовый, 1 — блестящий: сужает блик и поднимает его яркость */
  gloss?: number;
  /** самосвечение: 1 — цвет не гасится тенью (глаза, огонь) */
  glow?: number;
}

const RAMP = 6;
/** упорядоченный дизеринг: перевод между ступенями рампы вразбивку */
const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
].map((v) => (v + 0.5) / 16);

/** направление света: сверху-слева и на зрителя */
const LX = -0.42;
const LY = -0.58;
const LZ = 0.7;
/** доля рассеянного света: ниже неё пиксель не проваливается */
const AMB = 0.34;
/** ниже этой доли ступени пиксель садится на ближайший тон без ряби */
const DITHER = 0.3;

function hex2rgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgb2hex(r: number, g: number, b: number): string {
  const c = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1)}`;
}

function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const mx = Math.max(R, G, B);
  const mn = Math.min(R, G, B);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h: number;
  if (mx === R) h = (G - B) / d + (G < B ? 6 : 0);
  else if (mx === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return [h / 6, s, l];
}

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  if (s <= 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number): number => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** поворот тона к цели по короткой дуге */
function towards(h: number, target: number, k: number): number {
  let d = target - h;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return (h + d * k + 1) % 1;
}

/** холодная и тёплая мишени сдвига тона */
const COOL = 245 / 360;
const WARM = 42 / 360;

/**
 * Рампа из базового цвета: тени темнее, насыщеннее и холоднее, света
 * светлее, бледнее и теплее. Один этот сдвиг тона отличает рисованный
 * пиксель-арт от механически осветлённого.
 */
export function ramp(base: string, gloss = 0): string[] {
  const [r, g, b] = hex2rgb(base);
  const [h0, s0, l0] = rgb2hsl(r, g, b);
  const out: string[] = [];
  for (let i = 0; i < RAMP; i++) {
    const t = i / (RAMP - 1);
    // светлота: от трети базовой в тени до сдержанного блика, без выбеливания
    const l = Math.max(0.04, Math.min(0.88, l0 * (0.38 + 0.82 * t) + t * t * (0.07 + gloss * 0.16)));
    const s = Math.max(0, s0 * (1.3 - 0.55 * t));
    const h = t < 0.5 ? towards(h0, COOL, (0.5 - t) * 0.24) : towards(h0, WARM, (t - 0.5) * 0.2);
    const [rr, gg, bb] = hsl2rgb(h, s, l);
    out.push(rgb2hex(rr, gg, bb));
  }
  return out;
}

export class Paint {
  readonly w: number;
  readonly h: number;
  /** индекс материала, 0 — пусто */
  readonly mat: Uint8Array;
  /** нормаль поверхности */
  private nx: Float32Array;
  private ny: Float32Array;
  private nz: Float32Array;
  /** глубина: больше — ближе к зрителю */
  private z: Int16Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    const n = w * h;
    this.mat = new Uint8Array(n);
    this.nx = new Float32Array(n);
    this.ny = new Float32Array(n);
    this.nz = new Float32Array(n);
    this.z = new Int16Array(n);
  }

  /** кладёт пиксель, если он не закрыт тем, что уже ближе */
  put(x: number, y: number, m: number, nx: number, ny: number, nz: number, z: number): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const i = yi * this.w + xi;
    if (this.mat[i] && this.z[i] > z) return;
    this.mat[i] = m;
    this.nx[i] = nx;
    this.ny[i] = ny;
    this.nz[i] = nz;
    this.z[i] = z;
  }

  private shade(u: number, v: number, form: Form): [number, number, number] {
    switch (form) {
      case 'sphere': {
        const d = Math.min(1, u * u + v * v);
        return [u, v, Math.sqrt(1 - d)];
      }
      case 'cylx': {
        const c = Math.max(-1, Math.min(1, v));
        return [0, c, Math.sqrt(Math.max(0, 1 - c * c))];
      }
      case 'cyly': {
        const c = Math.max(-1, Math.min(1, u));
        return [c, 0, Math.sqrt(Math.max(0, 1 - c * c))];
      }
      default:
        return [0, 0, 1];
    }
  }

  /** эллипс: шар, поперечный или продольный цилиндр */
  ellipse(cx: number, cy: number, rx: number, ry: number, m: number, form: Form = 'sphere', z = 0): void {
    const x0 = Math.floor(cx - rx);
    const x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const u = rx > 0 ? (x - cx) / rx : 0;
        const v = ry > 0 ? (y - cy) / ry : 0;
        if (u * u + v * v > 1) continue;
        const [a, b, c] = this.shade(u, v, form);
        this.put(x, y, m, a, b, c, z);
      }
    }
  }

  /** прямоугольник — плоская деталь: пояс, кант, полоса */
  rect(x: number, y: number, w: number, h: number, m: number, form: Form = 'flat', z = 0): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const u = w > 1 ? ((xx - x) / (w - 1)) * 2 - 1 : 0;
        const v = h > 1 ? ((yy - y) / (h - 1)) * 2 - 1 : 0;
        const [a, b, c] = this.shade(u, v, form);
        this.put(xx, yy, m, a, b, c, z);
      }
    }
  }

  /** трапеция от полуширины сверху к полуширине снизу — торс, юбка */
  taper(y0: number, y1: number, halfTop: number, halfBot: number, cx: number, m: number, form: Form = 'cyly', z = 0): void {
    const a = Math.round(Math.min(y0, y1));
    const b = Math.round(Math.max(y0, y1));
    for (let y = a; y <= b; y++) {
      const t = b === a ? 0 : (y - a) / (b - a);
      const half = halfTop + (halfBot - halfTop) * t;
      if (half < 0.5) continue;
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
        const u = (x - cx) / half;
        if (Math.abs(u) > 1) continue;
        const [nx, ny, nz] = this.shade(u, t * 2 - 1, form);
        this.put(x, y, m, nx, ny, nz, z);
      }
    }
  }

  /** цилиндрическая конечность вдоль отрезка */
  limb(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, m: number, z = 0): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.max(1, Math.round(Math.hypot(dx, dy)));
    // поперечная ось: по ней и считается округлость
    const px = -dy / len;
    const py = dx / len;
    for (let i = 0; i <= len; i++) {
      const t = i / len;
      const cx = x0 + dx * t;
      const cy = y0 + dy * t;
      const half = (w0 + (w1 - w0) * t) / 2;
      if (half < 0.4) continue;
      for (let o = -half; o <= half; o += 0.5) {
        const u = o / half;
        const nz = Math.sqrt(Math.max(0, 1 - u * u));
        this.put(cx + px * o, cy + py * o, m, px * u, py * u, nz, z);
      }
    }
  }

  /** многоугольник — пола одежды, лоскут, наплечник */
  quad(pts: [number, number][], m: number, form: Form = 'flat', z = 0): void {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.floor(Math.min(...xs));
    const x1 = Math.ceil(Math.max(...xs));
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    const inside = (px: number, py: number): boolean => {
      let hit = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    const cx = (x0 + x1) / 2;
    const halfW = Math.max(1, (x1 - x0) / 2);
    const cy = (y0 + y1) / 2;
    const halfH = Math.max(1, (y1 - y0) / 2);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inside(x + 0.5, y + 0.5)) continue;
        const [nx, ny, nz] = this.shade((x - cx) / halfW, (y - cy) / halfH, form);
        this.put(x, y, m, nx, ny, nz, z);
      }
    }
  }

  /** убирает одинокие пиксели: они читаются как сор, а не как деталь */
  despeckle(): void {
    const m = this.mat;
    const w = this.w;
    const copy = m.slice();
    for (let y = 1; y < this.h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!copy[i]) continue;
        let same = 0;
        if (copy[i - 1] === copy[i]) same++;
        if (copy[i + 1] === copy[i]) same++;
        if (copy[i - w] === copy[i]) same++;
        if (copy[i + w] === copy[i]) same++;
        if (same === 0) m[i] = copy[i - w] || copy[i - 1] || copy[i + 1] || copy[i + w];
      }
    }
  }

  /**
   * Считает кадр: свет, контровой, квантование в рампу с дизерингом и
   * выборочная обводка — по тени тёмная, по свету её нет, иначе спрайт
   * выглядит наклейкой.
   */
  render(mats: Mat[], rimTint: string, rimSide: 1 | -1): HTMLCanvasElement {
    const w = this.w;
    const h = this.h;
    const ramps = mats.map((m) => (m ? ramp(m.base, m.gloss ?? 0).map(hex2rgb) : [[0, 0, 0]] as [number, number, number][]));
    const edges = mats.map((m) => {
      if (!m) return [0, 0, 0] as [number, number, number];
      const [r, g, b] = hex2rgb(ramp(m.base)[0]);
      const [hh, ss, ll] = rgb2hsl(r, g, b);
      return hsl2rgb(towards(hh, COOL, 0.3), Math.min(1, ss * 1.15), ll * 0.3) as [number, number, number];
    });
    const rim = hex2rgb(rimTint);

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= w || y >= h ? 0 : this.mat[y * w + x]);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const m = this.mat[i];
        const o = i * 4;
        if (!m) {
          // обводка снаружи силуэта: цветом соседнего материала, а не чернотой
          const n = at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1);
          if (!n) continue;
          const e = edges[n];
          d[o] = e[0];
          d[o + 1] = e[1];
          d[o + 2] = e[2];
          d[o + 3] = 255;
          continue;
        }
        const def = mats[m];
        const nx = this.nx[i];
        const ny = this.ny[i];
        const nz = this.nz[i];
        let v: number;
        if (def.glow) {
          // самосвечение: цвет берётся как есть, без света и дизеринга
          const [gr, gg, gb] = hex2rgb(def.base);
          d[o] = gr;
          d[o + 1] = gg;
          d[o + 2] = gb;
          d[o + 3] = 255;
          continue;
        } else {
          const lam = Math.max(0, nx * LX + ny * LY + nz * LZ);
          const gl = def.gloss ?? 0;
          // блик у блестящих материалов уже и ярче
          const spec = gl > 0 ? Math.pow(lam, 4 + gl * 10) * gl * 0.7 : 0;
          v = AMB + lam * (1 - AMB) * 0.86 + spec;
          // контровой по кромке со стороны, противоположной свету
          const edge = Math.pow(Math.max(0, 1 - nz), 2.4);
          if (nx * rimSide > 0) v += edge * 0.45;
        }
        const rp = ramps[m];
        const f = Math.max(0, Math.min(1, v)) * (rp.length - 1);
        // ближайшая ступень, а дизеринг — только в узкой полосе перехода,
        // иначе рябь идёт по всей фигуре и читается как сор
        let step = Math.round(f);
        const e = f - step;
        if (Math.abs(e) > DITHER) {
          const t = (Math.abs(e) - DITHER) / (0.5 - DITHER);
          if (t > BAYER[(y & 3) * 4 + (x & 3)]) step += e > 0 ? 1 : -1;
        }
        step = Math.max(0, Math.min(rp.length - 1, step));
        let [r, g, b] = rp[step];
        // подмешиваем цвет отсвета на самой кромке — тварь видно во мгле
        if (nx * rimSide > 0) {
          const e = Math.pow(Math.max(0, 1 - nz), 3.2) * 0.5;
          r += (rim[0] - r) * e;
          g += (rim[1] - g) * e;
          b += (rim[2] - b) * e;
        }
        d[o] = r;
        d[o + 1] = g;
        d[o + 2] = b;
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

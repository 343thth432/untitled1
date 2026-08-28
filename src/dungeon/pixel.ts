/**
 * Мелкий холст с индексной палитрой: рисуем в пикселях, а на экран
 * растягиваем без сглаживания. Так спрайты читаются как пиксель-арт,
 * а не как гладкая векторная фигура.
 */
export class PixBuf {
  readonly w: number;
  readonly h: number;
  /** индекс палитры на пиксель, 0 — прозрачно */
  readonly idx: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.idx = new Uint8Array(w * h);
  }

  set(x: number, y: number, c: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.idx[y * this.w + x] = c;
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.idx[y * this.w + x];
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  /** трапеция: ширина линейно меняется от верхней к нижней */
  taper(y0: number, y1: number, halfTop: number, halfBot: number, cx: number, c: number): void {
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0);
      const half = Math.round(halfTop + (halfBot - halfTop) * t);
      for (let x = cx - half; x <= cx + half; x++) this.set(x, y, c);
    }
  }

  /** заливка эллипса — для дульного среза и кистей */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): void {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx || 1) + (y * y) / (ry * ry || 1) <= 1) this.set(cx + x, cy + y, c);
      }
    }
  }

  /** обводит все непрозрачные пиксели цветом c по внешнему краю */
  outline(c: number): void {
    const copy = this.idx.slice();
    const at = (x: number, y: number): number =>
      x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : copy[y * this.w + x];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (at(x, y)) continue;
        if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) this.set(x, y, c);
      }
    }
  }

  /** блик по левой кромке каждой горизонтальной полосы */
  edgeLight(from: number, to: number): void {
    for (let y = 0; y < this.h; y++) {
      let run = false;
      for (let x = 0; x < this.w; x++) {
        const v = this.get(x, y);
        if (v === from && !run) {
          this.set(x, y, to);
          run = true;
        } else if (v === 0) {
          run = false;
        }
      }
    }
  }

  /**
   * Цилиндр: поперёк тела кладётся световая шкала, поэтому ствол читается
   * круглым, а не плоской полосой. ramp — от кромки к кромке через блик.
   */
  cylinder(y0: number, y1: number, halfTop: number, halfBot: number, cx: number, ramp: number[]): void {
    const n = ramp.length;
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0);
      const half = Math.round(halfTop + (halfBot - halfTop) * t);
      if (half < 1) continue;
      for (let x = -half; x <= half; x++) {
        const u = (x + half) / (2 * half);
        // профиль: тёмная кромка, блик ближе к левому краю, тень справа
        const k =
          u < 0.06 ? n - 2 : u < 0.16 ? 1 : u < 0.3 ? 0 : u < 0.56 ? 2 : u < 0.78 ? 3 : u < 0.92 ? n - 2 : n - 1;
        this.set(cx + x, y, ramp[Math.min(n - 1, k)]);
      }
    }
  }

  /** горизонтальный поясок на теле: обруч, накладка, кольцо */
  band(y: number, h: number, halfAt: (yy: number) => number, cx: number, ramp: number[]): void {
    for (let j = 0; j < h; j++) {
      const yy = y + j;
      const half = halfAt(yy) + 2;
      const n = ramp.length;
      for (let x = -half; x <= half; x++) {
        const u = (x + half) / (2 * half);
        const k = j === 0 ? 0 : j === h - 1 ? n - 1 : u < 0.24 ? 1 : u < 0.62 ? 2 : n - 2;
        this.set(cx + x, yy, ramp[Math.min(n - 1, k)]);
      }
    }
  }

  /** шляпка винта с прорезью */
  screw(x: number, y: number, r: number, body: number, slot: number, lit: number): void {
    this.ellipse(x, y, r, r, body);
    this.set(x - r + 1, y - 1, lit);
    this.set(x, y - 1, lit);
    this.rect(x - r + 1, y, r * 2 - 1, 1, slot);
  }

  /** волокно дерева: короткие штрихи вдоль ложа */
  grain(x0: number, y0: number, x1: number, y1: number, c: number, seed: number): void {
    let h = seed | 0;
    const rnd = (): number => {
      h = (Math.imul(h ^ (h >>> 15), 2246822507) ^ 0x9e3779b9) >>> 0;
      return h / 4294967296;
    };
    for (let y = y0; y < y1; y += 2) {
      const len = 3 + Math.floor(rnd() * 7);
      const x = x0 + Math.floor(rnd() * Math.max(1, x1 - x0 - len));
      for (let i = 0; i < len; i++) if (this.get(x + i, y)) this.set(x + i, y, c);
    }
  }

  /**
   * Кисть в перчатке, обхватывающая деталь: ладонь, четыре пальца с
   * костяшками, большой палец и раструб краги. dir = 1 — пальцы уходят
   * вправо, −1 — влево.
   */
  grip(
    x: number,
    y: number,
    w: number,
    h: number,
    dir: 1 | -1,
    dark: number,
    mid: number,
    lit: number,
    line: number,
  ): void {
    const palmW = Math.max(6, Math.round(w * 0.46));
    const px = dir > 0 ? x : x + w - palmW;
    // ладонь
    this.rect(px, y + 2, palmW, h - 4, mid);
    this.rect(px, y + 2, palmW, 2, lit);
    this.rect(px, y + h - 4, palmW, 2, dark);

    // пальцы: четыре валика, каждый со своим бликом и складкой
    const n = 4;
    const fh = Math.max(3, Math.floor((h - 6) / n));
    const fw = w - palmW;
    for (let i = 0; i < n; i++) {
      const fy = y + 3 + i * fh;
      const short = i === 0 || i === n - 1 ? 2 : 0;
      const fx = dir > 0 ? px + palmW : px - fw + short;
      const len = fw - short;
      this.rect(fx, fy, len, fh - 1, mid);
      this.rect(fx, fy, len, 1, lit);
      this.rect(fx, fy + fh - 2, len, 1, dark);
      // костяшка на кончике
      const kx = dir > 0 ? fx + len - 2 : fx;
      this.rect(kx, fy, 2, fh - 1, lit);
      this.set(kx + (dir > 0 ? 1 : 0), fy + fh - 2, dark);
      this.rect(fx, fy + fh - 1, len, 1, line);
    }

    // большой палец поверх детали
    const tx = dir > 0 ? px + palmW - 2 : px - Math.round(w * 0.34) + 2;
    this.rect(tx, y - 3, Math.round(w * 0.34), 6, mid);
    this.rect(tx, y - 3, Math.round(w * 0.34), 1, lit);
    this.rect(tx, y + 2, Math.round(w * 0.34), 1, dark);

    // крага на запястье
    const cy = y + h - 3;
    this.rect(px - 1, cy, palmW + 2, 5, dark);
    this.rect(px - 1, cy, palmW + 2, 1, mid);
  }

  /** толстая линия с сужением: клинок, топорище, ствол под углом */
  thickLine(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, ramp: number[]): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.max(1, Math.round(Math.hypot(dx, dy)));
    const nx = -dy / len;
    const ny = dx / len;
    const n = ramp.length;
    for (let i = 0; i <= len; i++) {
      const t = i / len;
      const cxp = x0 + dx * t;
      const cyp = y0 + dy * t;
      const half = (w0 + (w1 - w0) * t) / 2;
      for (let o = -half; o <= half; o += 0.5) {
        const u = (o + half) / (2 * half || 1);
        const k = u < 0.1 ? n - 2 : u < 0.28 ? 0 : u < 0.55 ? 1 : u < 0.8 ? 2 : n - 2;
        this.set(Math.round(cxp + nx * o), Math.round(cyp + ny * o), ramp[Math.min(n - 1, k)]);
      }
    }
  }

  /** повёрнутый прямоугольник — лопасть топора, приклад под углом */
  quad(pts: [number, number][], c: number): void {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs) | 0;
    const x1 = Math.ceil(Math.max(...xs));
    const y0 = Math.min(...ys) | 0;
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
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x + 0.5, y + 0.5)) this.set(x, y, c);
  }

  toCanvas(palette: string[]): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    const img = ctx.createImageData(this.w, this.h);
    const rgba = palette.map((p) => {
      const s = p.replace('#', '');
      const n = parseInt(s.slice(0, 6), 16);
      const a = s.length > 6 ? parseInt(s.slice(6, 8), 16) : 255;
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
    });
    for (let i = 0; i < this.idx.length; i++) {
      const p = rgba[this.idx[i]] ?? [0, 0, 0, 0];
      img.data[i * 4] = p[0];
      img.data[i * 4 + 1] = p[1];
      img.data[i * 4 + 2] = p[2];
      img.data[i * 4 + 3] = this.idx[i] === 0 ? 0 : p[3];
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

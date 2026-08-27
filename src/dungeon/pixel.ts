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

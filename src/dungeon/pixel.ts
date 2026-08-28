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

  /**
   * Контровой свет по одной кромке силуэта: пиксели, за которыми уже
   * пусто, перекрашиваются в светлый. Без него тёмная фигура сливается
   * с мглой подземелья.
   */
  rim(c: number, dir: 1 | -1): void {
    const copy = this.idx.slice();
    const at = (x: number, y: number): number =>
      x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : copy[y * this.w + x];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!at(x, y)) continue;
        if (!at(x - dir, y)) this.set(x, y, c);
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

  /**
   * Тело с наклонной осью и сильным схождением: ближний конец широкий,
   * дальний узкий. Именно это даёт ощущение, что ствол уходит от глаза,
   * а не стоит вертикально.
   */
  perspTube(
    yTop: number,
    yBot: number,
    halfTop: number,
    halfBot: number,
    cxTop: number,
    cxBot: number,
    ramp: number[],
    /** сдвиг блика: 0.3 — свет сверху-слева */
    litAt = 0.26,
  ): void {
    const n = ramp.length;
    for (let y = Math.round(yTop); y <= Math.round(yBot); y++) {
      const t = (y - yTop) / Math.max(1, yBot - yTop);
      const half = halfTop + (halfBot - halfTop) * t;
      const cx = cxTop + (cxBot - cxTop) * t;
      if (half < 0.5) continue;
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        const u = (x - (cx - half)) / (2 * half);
        const d = Math.abs(u - litAt);
        const k =
          u < 0.04 || u > 0.96
            ? n - 2
            : d < 0.05
              ? 0
              : d < 0.13
                ? 1
                : u < 0.5
                  ? 1
                  : u < 0.7
                    ? 2
                    : u < 0.88
                      ? 3
                      : n - 2;
        this.set(x, y, ramp[Math.min(n - 1, k)]);
      }
    }
  }

  /** верхняя грань: узкая светлая полоса вдоль оси — взгляд сверху */
  topPlane(yTop: number, yBot: number, halfTop: number, halfBot: number, cxTop: number, cxBot: number, c: number): void {
    for (let y = Math.round(yTop); y <= Math.round(yBot); y++) {
      const t = (y - yTop) / Math.max(1, yBot - yTop);
      const half = halfTop + (halfBot - halfTop) * t;
      const cx = cxTop + (cxBot - cxTop) * t;
      const x0 = Math.round(cx - half * 0.5);
      const x1 = Math.round(cx - half * 0.26);
      for (let x = x0; x <= x1; x++) if (this.get(x, y)) this.set(x, y, c);
    }
  }

  /**
   * Предплечье, уходящее за нижнюю кромку кадра: рука растёт из корпуса
   * игрока, а не висит в воздухе.
   */
  forearm(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, ramp: number[], cuff: number): void {
    this.thickLine(x0, y0, x1, y1, w0, w1, ramp);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // раструб краги у запястья
    this.thickLine(x0 + ux * 4, y0 + uy * 4, x0 + ux * 16, y0 + uy * 16, w0 + 7, w0 + 3, [cuff, cuff, cuff, cuff, cuff, cuff]);
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
   * Голая кисть видом с тыльной стороны, как в спрайтах старых шутеров:
   * крупная ладонь лежит на оружии, четыре пальца загибаются за дальнюю
   * кромку, большой палец крупный и идёт вдоль ближней. Запястье срезано
   * краем кадра — предплечья в кадре нет.
   *
   * @param dir 1 — пальцы уходят вправо, −1 — влево
   * @param over насколько кончики выступают за дальнюю кромку
   */
  handBack(
    x: number,
    y: number,
    w: number,
    h: number,
    dir: 1 | -1,
    over: number,
    shade: number,
    half: number,
    body: number,
    lit: number,
    hi: number,
    line: number,
  ): void {
    const far = dir > 0 ? x + w : x;
    const near = dir > 0 ? x : x + w;

    // ладонь: скруглённая масса, свет сверху
    for (let j = 0; j < h; j++) {
      const t = j / Math.max(1, h - 1);
      const round = t < 0.1 ? 3 : t < 0.2 ? 1 : t > 0.9 ? 3 : t > 0.8 ? 1 : 0;
      const c = t < 0.16 ? lit : t < 0.5 ? body : t < 0.78 ? half : shade;
      this.rect(x + round, y + j, w - round * 2, 1, c);
    }
    // свод кисти и тень у запястья
    for (let j = 2; j < Math.floor(h * 0.28); j++) {
      const inset = 5 + Math.floor((j / h) * 6);
      this.rect(dir > 0 ? x + inset : x + inset - 2, y + j, Math.floor(w * 0.5), 1, hi);
    }

    // четыре пальца, загнутые за дальнюю кромку
    const n = 4;
    const fh = Math.max(4, Math.floor((h - 6) / n));
    for (let i = 0; i < n; i++) {
      const fy = y + 3 + i * fh;
      const bulge = i === 0 ? 1 : i === n - 1 ? 0 : 2;
      const len = over + bulge;
      const tipX = dir > 0 ? far - 2 : far - len + 2;
      this.rect(tipX, fy, len, fh - 1, body);
      this.rect(tipX, fy, len, 1, lit);
      this.rect(tipX, fy + fh - 2, len, 1, shade);
      // сустав у основания пальца
      const kx = dir > 0 ? far - 8 : far + 5;
      this.rect(kx, fy + 1, 3, fh - 3, lit);
      this.rect(dir > 0 ? kx + 2 : kx - 1, fy + fh - 2, 3, 1, half);
      // ноготь на кончике
      this.rect(dir > 0 ? tipX + len - 2 : tipX, fy + 1, 2, Math.max(1, fh - 3), half);
    }

    // большой палец: крупный валик вдоль ближней кромки
    const tw = Math.round(w * 0.5);
    const th = Math.round(h * 0.4);
    const tx = dir > 0 ? near - 4 : near - tw + 4;
    const ty = y + Math.round(h * 0.1);
    for (let j = 0; j < th; j++) {
      const t = j / Math.max(1, th - 1);
      const round = t < 0.14 || t > 0.86 ? 2 : 0;
      const c = t < 0.3 ? lit : t < 0.7 ? body : half;
      this.rect(tx + round, ty + j, tw - round * 2, 1, c);
    }
    this.rect(tx + 2, ty + 1, tw - 6, 1, hi);
    this.rect(tx + 1, ty + th - 1, tw - 2, 1, shade);
    // складка между большим пальцем и ладонью
    this.rect(dir > 0 ? tx + tw - 1 : tx, ty + 2, 1, th - 4, shade);

    // срез запястья у нижней кромки
    this.rect(x + 3, y + h - 3, w - 6, 3, shade);
    this.rect(x + 4, y + h - 2, w - 8, 1, line);
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

  /** повёрнутый многоугольник — лопасть топора, приклад под углом */
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

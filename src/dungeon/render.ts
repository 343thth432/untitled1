import { CELL, at, type Floor } from './map';
import { texOf, type Tex, type TexName } from './textures';

/**
 * Рейкастер. Стены, пол и потолок берут цвет из CC0-материалов, а рельеф —
 * из карт нормалей: свет факела считается попиксельно, поэтому кладка
 * действительно выпуклая. Всё пишется в буфер малого разрешения и
 * растягивается на экран — так хватает кадров даже на телефоне.
 */

export interface Cam {
  x: number;
  y: number;
  /** угол взгляда в радианах */
  a: number;
}

/** цвет и сила факела */
export interface Torch {
  r: number;
  g: number;
  b: number;
  power: number;
}

export interface Palette {
  torch: Torch;
  /** рассеянный свет — не даёт теням стать чёрной дырой */
  ambient: [number, number, number];
  /** цвет мглы вдали */
  fog: [number, number, number];
  /** плотность мглы */
  density: number;
}

export const PALETTES: Record<string, Palette> = {
  crypt: {
    torch: { r: 255, g: 182, b: 108, power: 3.1 },
    ambient: [40, 46, 68],
    fog: [10, 12, 22],
    density: 0.26,
  },
  catacomb: {
    torch: { r: 196, g: 218, b: 255, power: 2.8 },
    ambient: [34, 44, 66],
    fog: [8, 12, 24],
    density: 0.3,
  },
  sanctum: {
    torch: { r: 255, g: 210, b: 142, power: 3.4 },
    ambient: [52, 44, 74],
    fog: [16, 12, 26],
    density: 0.2,
  },
};

const TEX_OF_CELL: Record<number, TexName> = {
  [CELL.brick]: 'wallBrick',
  [CELL.rock]: 'wallRock',
  [CELL.moss]: 'wallMoss',
  [CELL.door]: 'doorWood',
};

export interface Sprite {
  x: number;
  y: number;
  /** доля высоты клетки */
  scale: number;
  /** сдвиг по вертикали, 0 — на полу */
  lift: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, dist: number) => void;
}

export const FOV = 0.66;
/** высота свода и высота глаза в клетках — от них зависит, насколько зал просторный */
export const WALL_H = 2.4;
export const EYE_H = 0.78;

/** высота проекции для кадра шириной w — общая для стен и спрайтов */
export function projOf(w: number): number {
  return w / (2 * FOV);
}

export class Raycaster {
  readonly w: number;
  readonly h: number;
  private img: ImageData;
  private px32: Uint32Array;
  /** глубина по столбцам — для спрайтов */
  readonly depth: Float32Array;
  private buf: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.buf = document.createElement('canvas');
    this.buf.width = w;
    this.buf.height = h;
    this.bctx = this.buf.getContext('2d')!;
    this.img = this.bctx.createImageData(w, h);
    this.px32 = new Uint32Array(this.img.data.buffer);
    this.depth = new Float32Array(w);
  }

  get canvas(): HTMLCanvasElement {
    return this.buf;
  }

  render(f: Floor, cam: Cam, pal: Palette, flicker: number): void {
    const { w, h, px32, depth } = this;
    const dirX = Math.cos(cam.a);
    const dirY = Math.sin(cam.a);
    const planeX = -dirY * FOV;
    const planeY = dirX * FOV;
    const half = h >> 1;
    // масштаб проекции берём от ширины: вертикальный экран не должен
    // растягивать стены на весь кадр
    const proj = projOf(w);
    const power = pal.torch.power * flicker;
    const [ar, ag, ab] = pal.ambient;
    const [fr, fg, fb] = pal.fog;
    const dens = pal.density;

    const floorTex = texOf('floorCobble');
    const ceilTex = texOf('ceilRock');
    const rdx0 = dirX - planeX;
    const rdy0 = dirY - planeY;
    const rdx1 = dirX + planeX;
    const rdy1 = dirY + planeY;

    px32.fill(packFog(fr, fg, fb, 1, 0, 0, 0));

    // ── пол ───────────────────────────────────────────────────
    if (floorTex) {
      for (let y = half + 1; y < h; y++) {
        const rowDist = (EYE_H * proj) / (y - half);
        this.plane(floorTex, y, rowDist, rdx0, rdy0, rdx1, rdy1, cam, EYE_H, 1, power, pal, ar, ag, ab, fr, fg, fb, dens);
      }
    }
    // ── потолок ───────────────────────────────────────────────
    if (ceilTex) {
      const up = WALL_H - EYE_H;
      for (let y = half - 1; y >= 0; y--) {
        const rowDist = (up * proj) / (half - y);
        this.plane(ceilTex, y, rowDist, rdx0, rdy0, rdx1, rdy1, cam, -up, -1, power * 0.66, pal, ar, ag, ab, fr, fg, fb, dens);
      }
    }

    // ── стены ─────────────────────────────────────────────────
    for (let x = 0; x < w; x++) {
      const camX = (2 * x) / w - 1;
      const rdx = dirX + planeX * camX;
      const rdy = dirY + planeY * camX;
      let mapX = Math.floor(cam.x);
      let mapY = Math.floor(cam.y);
      const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
      const ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      const stepX = rdx < 0 ? -1 : 1;
      const stepY = rdy < 0 ? -1 : 1;
      let sdx = rdx < 0 ? (cam.x - mapX) * ddx : (mapX + 1 - cam.x) * ddx;
      let sdy = rdy < 0 ? (cam.y - mapY) * ddy : (mapY + 1 - cam.y) * ddy;
      let side = 0;
      let cell = 0;
      for (let guard = 0; guard < 64; guard++) {
        if (sdx < sdy) {
          sdx += ddx;
          mapX += stepX;
          side = 0;
        } else {
          sdy += ddy;
          mapY += stepY;
          side = 1;
        }
        cell = at(f, mapX, mapY);
        if (cell !== CELL.empty) break;
      }
      const dist = Math.max(0.0001, side === 0 ? sdx - ddx : sdy - ddy);
      depth[x] = dist;
      const tex = texOf(TEX_OF_CELL[cell] ?? 'wallBrick');
      if (!tex) continue;

      const scale = proj / dist;
      const yTop = half - (WALL_H - EYE_H) * scale;
      const yBot = half + EYE_H * scale;
      const top = Math.max(0, Math.ceil(yTop));
      const bot = Math.min(h - 1, Math.floor(yBot));
      let wallX = side === 0 ? cam.y + dist * rdy : cam.x + dist * rdx;
      wallX -= Math.floor(wallX);
      let texX = Math.floor(wallX * tex.size);
      if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) texX = tex.size - texX - 1;

      const faceX = side === 0 ? (rdx > 0 ? -1 : 1) : 0;
      const faceY = side === 1 ? (rdy > 0 ? -1 : 1) : 0;
      const hitX = cam.x + dist * rdx;
      const hitY = cam.y + dist * rdy;
      const dxl = cam.x - hitX;
      const dyl = cam.y - hitY;
      const flat = Math.hypot(dxl, dyl) || 1e-4;
      const fogK = 1 - Math.exp(-dist * dens);
      const atten = power / (1 + dist * 0.62 + dist * dist * 0.42);
      const mask = tex.size - 1;

      for (let y = top; y <= bot; y++) {
        // мировая высота точки и координата в текстуре: кладка не тянется,
        // а повторяется по высоте свода
        const zw = EYE_H - ((y - half) * dist) / proj;
        const texY = ((((WALL_H - zw) * tex.size) | 0) & mask) >>> 0;
        const ti = (texY * tex.size + texX) * 3;
        const tnx = tex.nrm[ti] / 127;
        const tny = tex.nrm[ti + 1] / 127;
        const tnz = tex.nrm[ti + 2] / 127;
        let nx: number;
        let ny: number;
        const nz = -tny;
        if (side === 0) {
          nx = faceX * tnz;
          ny = tnx;
        } else {
          nx = tnx;
          ny = faceY * tnz;
        }
        const dz = EYE_H - zw;
        const len = Math.hypot(flat, dz) || 1;
        const lx = dxl / len;
        const ly = dyl / len;
        const lz = dz / len;
        let lam = nx * lx + ny * ly + nz * lz;
        if (lam < 0) lam = 0;
        const l2 = lam * lam;
        const spec = l2 * l2 * l2 * 0.45;
        const k = atten * (lam * 0.92 + 0.08) + spec * atten;
        px32[y * w + x] = shade(tex.col, ti, k, pal.torch, ar, ag, ab, fr, fg, fb, fogK);
      }
    }
  }

  /** строка пола или потолка */
  private plane(
    tex: Tex,
    y: number,
    rowDist: number,
    rdx0: number,
    rdy0: number,
    rdx1: number,
    rdy1: number,
    cam: Cam,
    dz: number,
    up: number,
    power: number,
    pal: Palette,
    ar: number,
    ag: number,
    ab: number,
    fr: number,
    fg: number,
    fb: number,
    dens: number,
  ): void {
    const { w, px32 } = this;
    const stepX = (rowDist * (rdx1 - rdx0)) / w;
    const stepY = (rowDist * (rdy1 - rdy0)) / w;
    let fx = cam.x + rowDist * rdx0;
    let fy = cam.y + rowDist * rdy0;
    const fogK = 1 - Math.exp(-rowDist * dens);
    const atten = power / (1 + rowDist * 0.62 + rowDist * rowDist * 0.42);
    const invLen = 1 / Math.hypot(rowDist, dz);
    const lz = dz * invLen;
    const row = y * w;
    for (let x = 0; x < w; x++, fx += stepX, fy += stepY) {
      const lx = (cam.x - fx) * invLen;
      const ly = (cam.y - fy) * invLen;
      px32[row + x] = shadePlane(tex, fx, fy, lx, ly, lz, up, atten, pal, ar, ag, ab, fr, fg, fb, fogK);
    }
  }

  /** переносит посчитанные пиксели в холст буфера */
  flush(): void {
    this.bctx.putImageData(this.img, 0, 0);
  }

  /** контекст буфера — сюда дорисовываются спрайты до вывода на экран */
  get ctx(): CanvasRenderingContext2D {
    return this.bctx;
  }

  /** выводит буфер на экран с мягким увеличением */
  present(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.buf, 0, 0, w, h);
  }

  blit(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.flush();
    this.present(ctx, w, h);
  }
}

function packFog(fr: number, fg: number, fb: number, k: number, r: number, g: number, b: number): number {
  const rr = r + (fr - r) * k;
  const gg = g + (fg - g) * k;
  const bb = b + (fb - b) * k;
  return 0xff000000 | (bb << 16) | (gg << 8) | rr;
}

function shade(
  col: Uint8Array,
  ti: number,
  k: number,
  t: Torch,
  ar: number,
  ag: number,
  ab: number,
  fr: number,
  fg: number,
  fb: number,
  fogK: number,
): number {
  const cr = col[ti];
  const cg = col[ti + 1];
  const cb = col[ti + 2];
  let r = (cr * (ar + (t.r * k) / 255 * 255)) / 255;
  let g = (cg * (ag + (t.g * k) / 255 * 255)) / 255;
  let b = (cb * (ab + (t.b * k) / 255 * 255)) / 255;
  r = r > 255 ? 255 : r;
  g = g > 255 ? 255 : g;
  b = b > 255 ? 255 : b;
  r += (fr - r) * fogK;
  g += (fg - g) * fogK;
  b += (fb - b) * fogK;
  return 0xff000000 | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
}

function shadePlane(
  tex: Tex,
  fx: number,
  fy: number,
  lx: number,
  ly: number,
  lz: number,
  up: number,
  atten: number,
  pal: Palette,
  ar: number,
  ag: number,
  ab: number,
  fr: number,
  fg: number,
  fb: number,
  fogK: number,
): number {
  const s = tex.size;
  const tx = ((fx - Math.floor(fx)) * s) | 0;
  const ty = ((fy - Math.floor(fy)) * s) | 0;
  const ti = (ty * s + tx) * 3;
  const nx = tex.nrm[ti] / 127;
  const ny = tex.nrm[ti + 1] / 127;
  const nz = (tex.nrm[ti + 2] / 127) * up;
  let lam = nx * lx + ny * ly + nz * lz;
  if (lam < 0) lam = 0;
  return shade(tex.col, ti, atten * (lam * 0.9 + 0.1), pal.torch, ar, ag, ab, fr, fg, fb, fogK);
}

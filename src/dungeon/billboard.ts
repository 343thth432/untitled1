import { EYE_H, FOV, projOf, WALL_H, type Cam, type Raycaster } from './render';

/** объект, который всегда повёрнут к камере */
export interface Board {
  x: number;
  y: number;
  src: CanvasImageSource;
  /** ширина к высоте */
  aspect: number;
  /** высота в клетках */
  scale: number;
  /** 0 — стоит на полу, 1 — висит под сводом */
  hang: number;
  /** доля яркости, не гасимая мглой */
  emissive: number;
  /** второй слой поверх — пламя, свечение */
  over?: CanvasImageSource;
  /** ореол вокруг */
  glow?: string;
  /** прозрачность */
  alpha?: number;
  /** сдвиг вверх в долях своей высоты — подпрыгивание, падение */
  lift?: number;
  /** данные для попадания тапом */
  tag?: unknown;
}

export interface BoardHit {
  tag: unknown;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  dist: number;
}

/**
 * Рисует билборды с перекрытием стенами: столбцы, где стена ближе
 * спрайта, пропускаются. Порядок — от дальних к ближним.
 */
export function drawBoards(rc: Raycaster, cam: Cam, boards: Board[], hits?: BoardHit[]): void {
  const ctx = rc.ctx;
  const { w, h, depth } = rc;
  const half = h >> 1;
  const proj = projOf(w);
  const dirX = Math.cos(cam.a);
  const dirY = Math.sin(cam.a);
  const planeX = -dirY * FOV;
  const planeY = dirX * FOV;
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  if (hits) hits.length = 0;

  const list = boards
    .map((b) => ({ b, d: (b.x - cam.x) ** 2 + (b.y - cam.y) ** 2 }))
    .sort((a, b) => b.d - a.d);

  for (const { b } of list) {
    const sx = b.x - cam.x;
    const sy = b.y - cam.y;
    const tx = invDet * (dirY * sx - dirX * sy);
    const ty = invDet * (-planeY * sx + planeX * sy);
    if (ty <= 0.14) continue;
    const scr = (w / 2) * (1 + tx / ty);
    const sh = (b.scale * proj) / ty;
    const sw = sh * b.aspect;
    // низ спрайта: от пола или от свода
    const floorY = half + (EYE_H * proj) / ty;
    const ceilY = half - ((WALL_H - EYE_H) * proj) / ty;
    const bottom = (b.hang ? ceilY + (b.scale * proj) / ty : floorY) - (b.lift ?? 0) * sh;
    const left = scr - sw / 2;
    if (left > w || left + sw < 0) continue;
    if (hits) hits.push({ tag: b.tag, x0: left / w, x1: (left + sw) / w, y0: (bottom - sh) / h, y1: bottom / h, dist: ty });

    if (b.glow) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(scr, bottom - sh * 0.5, 0, scr, bottom - sh * 0.5, sh * 0.75);
      g.addColorStop(0, b.glow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = Math.max(0, Math.min(1, 2.6 / ty)) * 0.55;
      ctx.fillStyle = g;
      ctx.fillRect(scr - sh, bottom - sh * 1.25, sh * 2, sh * 1.5);
      ctx.restore();
    }

    const fade = Math.max(0.1, Math.min(1, 1 / (1 + ty * 0.15)));
    const alpha = (b.alpha ?? 1) * (b.emissive + (1 - b.emissive) * fade);
    const iw = (b.src as HTMLCanvasElement).width;
    const ih = (b.src as HTMLCanvasElement).height;
    const x0 = Math.max(0, Math.floor(left));
    const x1 = Math.min(w - 1, Math.ceil(left + sw));
    let run = -1;
    for (let x = x0; x <= x1 + 1; x++) {
      const vis = x <= x1 && depth[x] > ty;
      if (vis && run < 0) run = x;
      if ((!vis || x > x1) && run >= 0) {
        const cw = x - run;
        const u0 = ((run - left) / sw) * iw;
        const uw = (cw / sw) * iw;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(b.src, u0, 0, uw, ih, run, bottom - sh, cw, sh);
        if (b.over) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 1;
          ctx.drawImage(b.over, u0, 0, uw, ih, run, bottom - sh, cw, sh);
        }
        ctx.restore();
        run = -1;
      }
    }
  }
}

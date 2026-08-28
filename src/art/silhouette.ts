import type { Portrait } from '../game/types';

/**
 * Силуэт человека для титульного экрана. Если для героини положена
 * картинка в public/art/heroes — берём её, иначе рисуем тень со
 * свечением: движок людей не рисует, и честная тень лучше плохого
 * рисунка. Тварей в подземелье это не касается — их собирает
 * dungeon/foeArt.ts.
 */

function glowBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer: string): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** тёмная фигура в плаще: тело, капюшон, подол */
function figure(ctx: CanvasRenderingContext2D, cx: number, base: number, hgt: number, wide: number, eye: string, rim: string): void {
  const top = base - hgt;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(cx + wide * 0.5, top + hgt * 0.06, cx + wide * 0.42, top + hgt * 0.22, cx + wide * 0.5, top + hgt * 0.34);
  ctx.bezierCurveTo(cx + wide * 0.95, top + hgt * 0.5, cx + wide * 1.05, base - hgt * 0.06, cx + wide * 1.1, base);
  ctx.lineTo(cx - wide * 1.1, base);
  ctx.bezierCurveTo(cx - wide * 1.05, base - hgt * 0.06, cx - wide * 0.95, top + hgt * 0.5, cx - wide * 0.5, top + hgt * 0.34);
  ctx.bezierCurveTo(cx - wide * 0.42, top + hgt * 0.22, cx - wide * 0.5, top + hgt * 0.06, cx, top);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - wide, top, cx + wide, base);
  g.addColorStop(0, '#10121e');
  g.addColorStop(0.5, '#070810');
  g.addColorStop(1, '#04050a');
  ctx.fillStyle = g;
  ctx.fill();

  // контровой по краю — иначе силуэт сливается со мглой
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const r1 = ctx.createLinearGradient(cx - wide * 1.1, 0, cx - wide * 0.55, 0);
  r1.addColorStop(0, rim);
  r1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r1;
  ctx.fillRect(cx - wide * 1.2, top, wide * 0.7, hgt + 10);
  const r2 = ctx.createLinearGradient(cx + wide * 1.1, 0, cx + wide * 0.6, 0);
  r2.addColorStop(0, rim);
  r2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r2;
  ctx.fillRect(cx + wide * 0.5, top, wide * 0.72, hgt + 10);
  ctx.restore();

  // глаза
  ctx.globalCompositeOperation = 'lighter';
  const ey = top + hgt * 0.13;
  for (const s of [-1, 1]) {
    glowBall(ctx, cx + s * wide * 0.2, ey, wide * 0.34, eye, 'rgba(0,0,0,0)');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx + s * wide * 0.2, ey, wide * 0.075, wide * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}


function glowOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  inner: string,
  outer: string,
): void {
  glowBall(ctx, x, y, r, inner, outer);
}

const W = 420;
const H = 620;
const cache = new Map<string, HTMLCanvasElement>();
const imgs = new Map<string, HTMLImageElement | null>();

const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

/**
 * Картинка персонажа по соглашению об именах: положи файл
 * public/art/heroes/<id>.webp (или .png) — и он сам появится в игре
 * вместо силуэта. Ничего править в коде не нужно.
 */
export function charImage(kind: 'heroes', id: string, portrait?: Portrait): HTMLImageElement | null {
  const src = portrait?.img ?? `${base}art/${kind}/${id}.webp`;
  let hit = imgs.get(src);
  if (hit === undefined) {
    const im = new Image();
    im.onerror = () => {
      // .webp нет — пробуем .png, потом сдаёмся и оставляем силуэт
      if (!portrait?.img && im.src.endsWith('.webp')) im.src = src.replace(/\.webp$/, '.png');
      else imgs.set(src, null);
    };
    im.src = src;
    imgs.set(src, im);
    hit = im;
  }
  return hit && hit.complete && hit.naturalWidth > 0 ? hit : null;
}

/** силуэт противника: тело, контровой свет, горящие глаза */
export function foeSilhouette(id: string, portrait: Portrait, count: number, big: boolean): HTMLCanvasElement {
  const key = `${id}|${count}|${big}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (ctx) {
    const base = H - 10;
    const rim = `${portrait.aura}55`;
    const n = Math.max(1, count);
    for (let i = n - 1; i >= 0; i--) {
      const off = i === 0 ? 0 : (i % 2 ? 1 : -1) * (72 + i * 20);
      const k = i === 0 ? 1 : 0.8 - i * 0.05;
      ctx.save();
      ctx.globalAlpha = i === 0 ? 1 : 0.8;
      figure(ctx, W / 2 + off, base - (i === 0 ? 0 : 16), (big ? 560 : 470) * k, (big ? 96 : 74) * k, `${portrait.eyes}f0`, rim);
      ctx.restore();
    }
    if (portrait.horns) {
      ctx.strokeStyle = 'rgba(24,20,30,1)';
      ctx.lineWidth = big ? 18 : 14;
      ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(W / 2 + s * 42, base - (big ? 548 : 460));
        ctx.quadraticCurveTo(W / 2 + s * 124, base - (big ? 596 : 500), W / 2 + s * 98, base - (big ? 678 : 572));
        ctx.stroke();
      }
    }
    glowOrb(ctx, W / 2, base - (big ? 340 : 290), big ? 300 : 250, `${portrait.aura}44`, `${portrait.aura}11`);
  }
  cache.set(key, c);
  return c;
}

export const FOE_ART = { W, H };

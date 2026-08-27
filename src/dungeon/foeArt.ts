import { figure, glowOrb } from './marks';
import type { Portrait } from '../game/types';

/**
 * Противник в дуэли: если для него положена картинка в public/art —
 * берём её, иначе рисуем силуэт со свечением. Движок людей не рисует,
 * поэтому запасной вариант честно остаётся тенью, а не «плохим рисунком».
 */

const W = 420;
const H = 620;
const cache = new Map<string, HTMLCanvasElement>();
const imgs = new Map<string, HTMLImageElement | null>();

export function foeImage(portrait: Portrait): HTMLImageElement | null {
  if (!portrait.img) return null;
  let hit = imgs.get(portrait.img);
  if (hit === undefined) {
    const im = new Image();
    im.src = portrait.img;
    im.onerror = () => imgs.set(portrait.img as string, null);
    imgs.set(portrait.img, im);
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

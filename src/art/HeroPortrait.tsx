import { useEffect, useRef } from 'react';
import type { Element, Portrait } from '../game/types';
import { Sparks, buildBackdrop, stageGlow, tintOf, type Tint } from './scene/backdrop';
import { charImage, foeSilhouette, FOE_ART } from '../dungeon/foeArt';

interface Props {
  id: string;
  portrait: Portrait;
  element: Element;
  className?: string;
}

/**
 * Портрет героини на титульном экране. Пока для неё не положена картинка
 * в public/art, в кадре стоит силуэт со свечением — движок не пытается
 * изображать лицо кодом.
 */
export default function HeroPortrait({ id, portrait, element, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tint: Tint = tintOf(element);
    const art = foeSilhouette(id, portrait, 1, false);
    const sparks = new Sparks(tint, 44, `p${id}`);
    let bd: HTMLCanvasElement | null = null;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = (): void => {
      w = host.clientWidth;
      h = host.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      bd = buildBackdrop(w, h, tint, `hero-${id}`, { focus: 0.5, density: 0.9 });
      sparks.resize(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    let last = performance.now();
    let clock = 0;
    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      if (bd && w && h) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(bd, 0, 0, w, h);
        stageGlow(ctx, w * 0.5, h * 0.97, w * 0.4, w * 0.08, tint.warm, 0.34);

        const img = charImage('heroes', id, portrait);
        const src: CanvasImageSource = img ?? art;
        const aspect = img ? img.naturalWidth / img.naturalHeight : FOE_ART.W / FOE_ART.H;
        const sh = h * 0.94;
        const sw = sh * aspect;
        const bob = Math.sin(clock * 0.9) * h * 0.006;
        ctx.drawImage(src, w / 2 - sw / 2, h - sh + bob, sw, sh);

        sparks.draw(ctx, clock, dt);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [id, portrait, element]);

  return (
    <div ref={hostRef} className={className}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

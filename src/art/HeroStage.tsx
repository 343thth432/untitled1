import { useEffect, useRef } from 'react';
import type { Appearance } from '../game/types';
import { SK, buildRig, drawRig, drawShadow, lookKey, type AnimName } from './rig';
import { light, rgba } from './illustration/paint';

interface Props {
  look: Appearance;
  className?: string;
  /** тап проигрывает эффектную позу */
  interactive?: boolean;
  /** кадрирование: по пояс или в полный рост */
  framing?: 'half' | 'full';
  /** проиграть каст при появлении */
  showcase?: boolean;
}

const DUR: Record<AnimName, number> = { idle: 0, walk: 0, attack: 0.66, cast: 0.95, hurt: 0.46, dead: 1.1, win: 1.6 };
const SHOW: AnimName[] = ['cast', 'attack', 'win'];

/** Живая 2D-героиня: дыхание, покачивание, поза по тапу */
export default function HeroStage({ look, className, interactive = true, framing = 'full', showcase }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rig = buildRig(look, lookKey(look), 1);
    let anim: AnimName = showcase ? 'cast' : 'idle';
    let phase = 0;
    let pick = 0;

    const tap = (): void => {
      if (!interactive || anim !== 'idle') return;
      anim = SHOW[pick % SHOW.length];
      pick++;
      phase = 0;
    };
    host.addEventListener('pointerdown', tap);

    let w = 0;
    let h = 0;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const resize = (): void => {
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
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
      if (!w || !h) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (anim !== 'idle') {
        phase += dt / DUR[anim];
        if (phase >= 1) {
          phase = 0;
          anim = 'idle';
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // мягкое сияние ауры за спиной
      const gx = w * 0.5;
      const gy = framing === 'half' ? h * 0.62 : h * 0.46;
      const glow = ctx.createRadialGradient(gx, gy, 4, gx, gy, Math.max(w, h) * 0.56);
      glow.addColorStop(0, rgba(light(look.aura, 0.4), 0.3));
      glow.addColorStop(0.55, rgba(look.aura, 0.1));
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      const full = framing === 'full';
      const s = full ? (h * 0.94) / SK.ground : (h * 1.85) / SK.ground;
      ctx.save();
      ctx.translate(w * 0.5, full ? h * 0.98 : h * 1.5);
      ctx.scale(s, s);
      if (full) drawShadow(ctx, 1, 0.16);
      drawRig(ctx, rig, { t: clock, anim, phase });
      ctx.restore();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener('pointerdown', tap);
    };
  }, [look, interactive, framing, showcase]);

  return (
    <div ref={hostRef} className={className}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

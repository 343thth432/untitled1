import { useEffect, useRef } from 'react';
import type { Appearance, Element } from '../game/types';
import { SK, buildRig, drawRig, drawShadow, lookKey, type AnimName } from './rig';
import { Stage, tintOf } from './scene/backdrop';

interface Props {
  look: Appearance;
  className?: string;
  /** тап проигрывает эффектную позу */
  interactive?: boolean;
  /** кадрирование: по пояс или в полный рост */
  framing?: 'half' | 'full';
  /** проиграть каст при появлении */
  showcase?: boolean;
  /** стихия задаёт оттенок ночного фона */
  element?: Element | null;
}

const DUR: Record<AnimName, number> = { idle: 0, walk: 0, attack: 0.66, cast: 0.95, hurt: 0.46, dead: 1.1, win: 1.6 };
const SHOW: AnimName[] = ['cast', 'attack', 'win'];

/** Живая 2D-героиня: дыхание, покачивание, поза по тапу */
export default function HeroStage({ look, className, interactive = true, framing = 'full', showcase, element }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rig = buildRig(look, lookKey(look), 1);
    const tint = tintOf(element);
    const floor = framing === 'full' ? 0.98 : 1.5;
    const stage = new Stage(tint, `hero-${element ?? 'n'}`, {
      focus: 0.5,
      density: 0.9,
      sparks: 40,
    });
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
      stage.resize(w, h);
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

      stage.draw(ctx, clock, dt, framing === 'full' ? h * floor : undefined);

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

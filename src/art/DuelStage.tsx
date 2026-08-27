import { useEffect, useRef } from 'react';
import type { Appearance } from '../game/types';
import { BIOMES, Weatherfall, type BiomeId } from './road';
import { Stage, groundBand } from './scene/backdrop';
import { SK, buildRig, drawRig, drawShadow, lookKey, type AnimName } from './rig';
import { setBlurScale } from './illustration/soft';

export interface DuelStageApi {
  play(who: 'hero' | 'foe', anim: AnimName): void;
  setDown(who: 'hero' | 'foe', down: boolean): void;
  /** экранная точка над головой — для полосок */
  head: { hero: [number, number]; foe: [number, number] };
}

interface Props {
  biome: BiomeId;
  hero: Appearance;
  foe: Appearance;
  /** сколько фигур у противника в сцене */
  foeCount?: number;
  apiRef: React.MutableRefObject<DuelStageApi | null>;
  className?: string;
}

const DUR: Record<AnimName, number> = {
  idle: 0,
  walk: 0,
  attack: 0.62,
  cast: 0.9,
  hurt: 0.42,
  dead: 1.1,
  win: 1.5,
};

/** Сцена дуэли: пейзаж отрезка и двое напротив друг друга */
export default function DuelStage({ biome, hero, foe, foeCount = 1, apiRef, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const b = BIOMES[biome];
    const stage = new Stage(b.tint, `duel-${biome}`, { focus: 0.5, floor: 0.92, sparks: 60 });
    let weather: Weatherfall | null = null;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const rigs = {
      hero: buildRig(hero, lookKey(hero), 0.72),
      foe: buildRig(foe, lookKey(foe), 0.72),
    };
    const anim: Record<'hero' | 'foe', { name: AnimName; ph: number; down: boolean }> = {
      hero: { name: 'idle', ph: 0, down: false },
      foe: { name: 'idle', ph: 0, down: false },
    };
    const head = { hero: [0, 0] as [number, number], foe: [0, 0] as [number, number] };

    apiRef.current = {
      play: (who, a) => {
        if (anim[who].down) return;
        anim[who].name = a;
        anim[who].ph = 0;
      },
      setDown: (who, down) => {
        anim[who].down = down;
        anim[who].name = down ? 'dead' : 'idle';
        anim[who].ph = 0;
      },
      head,
    };

    const resize = (): void => {
      w = host.clientWidth;
      h = host.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      stage.resize(w, h);
      weather = new Weatherfall(b, w, h);
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
      if (!weather || !w || !h) {
        raf = requestAnimationFrame(loop);
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const groundY = h * 0.92;
      stage.draw(ctx, clock, dt, groundY);
      groundBand(ctx, w, h, groundY, b.tint, clock * 40);
      const s = (h * 0.62) / SK.ground;
      const foeS = s * 0.94;

      for (const who of ['foe', 'hero'] as const) {
        const a = anim[who];
        if (a.name !== 'idle' && a.name !== 'walk') {
          a.ph += dt / DUR[a.name];
          if (a.ph >= 1) {
            a.ph = a.down ? 1 : 0;
            if (!a.down) a.name = 'idle';
          }
        }
        const x = who === 'hero' ? w * 0.24 : w * 0.75;
        const y = who === 'hero' ? groundY : groundY - h * 0.07;
        const sc = who === 'hero' ? s : foeS;
        const n = who === 'foe' ? Math.max(1, foeCount) : 1;
        // свита рисуется первой, вожак — поверх
        for (let i = n - 1; i >= 0; i--) {
          const back = i > 0;
          const dx = back ? (i % 2 ? 1 : -1) * (0.095 + Math.floor((i - 1) / 2) * 0.055) * w : 0;
          const dy = back ? -h * (0.042 + i * 0.012) : 0;
          const ds = back ? sc * (0.8 - i * 0.045) : sc;
          ctx.save();
          ctx.translate(x + dx, y + dy);
          ctx.scale(ds, ds);
          setBlurScale(1);
          drawShadow(ctx, 1, a.down ? 0.08 : back ? 0.16 : 0.24);
          drawRig(ctx, rigs[who], {
            t: clock + (who === 'foe' ? 2.1 + i * 1.3 : 0),
            anim: back ? (a.down ? 'dead' : 'idle') : a.name,
            phase: back ? (a.down ? a.ph : 0) : a.ph,
            flip: who === 'foe',
            alpha: back ? 0.82 : 1,
          });
          ctx.restore();
        }
        head[who] = [x, y - SK.ground * sc * (a.down ? 0.12 : 0.98)];
      }

      weather.draw(ctx, clock, dt, b.weather === 'rain' ? -1.6 : 0.6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      apiRef.current = null;
    };
  }, [biome, hero, foe, foeCount, apiRef]);

  return (
    <div ref={hostRef} className={className}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

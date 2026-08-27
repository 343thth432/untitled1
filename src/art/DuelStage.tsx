import { useEffect, useRef } from 'react';
import type { Appearance } from '../game/types';
import { BIOMES, buildScene, drawScene, Weatherfall, type BiomeId, type RoadScene } from './road';
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
export default function DuelStage({ biome, hero, foe, apiRef, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const b = BIOMES[biome];
    let scene: RoadScene | null = null;
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
      scene = buildScene(b, w, h, `${biome}-duel-${w}x${h}`);
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
      if (!scene || !weather || !w || !h) {
        raf = requestAnimationFrame(loop);
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, scene, 400, clock);

      const groundY = h * 0.9;
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
        const x = who === 'hero' ? w * 0.24 : w * 0.77;
        const y = who === 'hero' ? groundY : groundY - h * 0.07;
        const sc = who === 'hero' ? s : foeS;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sc, sc);
        setBlurScale(1);
        drawShadow(ctx, 1, a.down ? 0.1 : 0.24);
        drawRig(ctx, rigs[who], {
          t: clock + (who === 'foe' ? 2.1 : 0),
          anim: a.name,
          phase: a.ph,
          flip: who === 'foe',
        });
        ctx.restore();
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
  }, [biome, hero, foe, apiRef]);

  return (
    <div ref={hostRef} className={className}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

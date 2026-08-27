import { useEffect, useRef } from 'react';
import type { Appearance, NodeKind } from '../game/types';
import { BIOMES, buildScene, drawMarker, drawScene, Weatherfall, type BiomeId, type RoadScene } from './road';
import { SK, buildRig, drawRig, drawShadow, lookKey } from './rig';
import { setBlurScale } from './illustration/soft';

interface Props {
  biome: BiomeId;
  look: Appearance;
  /** метки, стоящие впереди на дороге */
  markers: NodeKind[];
  /** какая метка выбрана */
  picked: number;
  /** идём ли к метке; по прибытии зовём onArrive */
  walking: boolean;
  onArrive?: () => void;
  className?: string;
}

const TRAVEL = 1.5;

/** Живая дорога: пейзаж, героиня и то, что ждёт впереди */
export default function RoadStage({ biome, look, markers, picked, walking, onArrive, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ walking, picked, markers, onArrive });
  stateRef.current = { walking, picked, markers, onArrive };

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
    const rig = buildRig(look, lookKey(look), 0.7);

    const resize = (): void => {
      w = host.clientWidth;
      h = host.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      scene = buildScene(b, w, h, `${biome}-${w}x${h}`);
      weather = new Weatherfall(b, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    let last = performance.now();
    let clock = 0;
    let scroll = 0;
    let travel = 0;
    let arrived = false;

    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      const st = stateRef.current;
      if (st.walking) {
        travel = Math.min(1, travel + dt / TRAVEL);
        scroll += dt * 260 * (1 - travel * 0.55);
        if (travel >= 1 && !arrived) {
          arrived = true;
          st.onArrive?.();
        }
      } else {
        travel = 0;
        arrived = false;
        scroll += dt * 8;
      }
      if (!scene || !weather || !w || !h) {
        raf = requestAnimationFrame(loop);
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, scene, scroll, clock);

      // метки впереди: подъезжают справа
      const groundY = h * 0.8;
      const n = st.markers.length;
      st.markers.forEach((kind, i) => {
        const lane = n > 1 ? (i === 0 ? -0.09 : 0.09) : 0;
        const from = 0.76 + i * 0.05;
        const to = 0.56 + lane * 2.4;
        const k = st.walking ? travel : 0;
        const x = w * (from + (to - from) * k);
        const y = groundY + lane * h * 0.05 + (st.walking ? 0 : Math.sin(clock * 1.6 + i) * 2);
        const dim = st.walking && i !== st.picked;
        const s = (0.95 + 0.3 * k) * (n > 1 ? 0.82 : 1);
        ctx.save();
        if (dim) ctx.globalAlpha = 0.35;
        else if (!st.walking && i === st.picked) {
          ctx.save();
          ctx.filter = 'blur(22px)';
          ctx.beginPath();
          ctx.arc(x, y - 40 * s, 60 * s, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,236,190,0.28)';
          ctx.fill();
          ctx.restore();
        }
        drawMarker(ctx, kind as never, b, x, y, s, clock);
        ctx.restore();
      });

      // героиня
      const s = (h * 0.34) / SK.ground;
      ctx.save();
      ctx.translate(w * 0.27, groundY);
      ctx.scale(s, s);
      setBlurScale(1);
      drawShadow(ctx, 1, 0.24);
      drawRig(ctx, rig, { t: clock, anim: st.walking ? 'walk' : 'idle', phase: 0 });
      ctx.restore();

      weather.draw(ctx, clock, dt, b.weather === 'rain' ? -1.6 : 0.6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [biome, look]);

  return (
    <div ref={hostRef} className={className}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

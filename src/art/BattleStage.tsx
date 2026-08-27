import { useEffect, useRef } from 'react';
import type { Appearance } from '../game/types';
import { SK, buildRig, drawRig, drawShadow, lookKey, type AnimName } from './rig';

export interface StageUnit {
  uid: string;
  look: Appearance;
  side: 'ally' | 'foe';
  slot: number;
}

export interface ScreenPos {
  x: number;
  y: number;
  /** масштаб относительно ближнего плана — для размера полосок */
  k: number;
}

export interface StageApi {
  trigger(uid: string, kind: 'attack' | 'cast' | 'hurt'): void;
  setDead(uid: string, dead: boolean): void;
  positions: Record<string, ScreenPos>;
}

interface Props {
  units: StageUnit[];
  accent: string;
  floor: string;
  apiRef: React.MutableRefObject<StageApi | null>;
  className?: string;
}

const DUR: Record<AnimName, number> = {
  idle: 0,
  attack: 0.66,
  cast: 0.95,
  hurt: 0.46,
  dead: 1.1,
  win: 1.6,
};

/**
 * Вертикальная раскладка: враги вверху и мельче, отряд внизу и крупнее.
 * Линия защиты стоит выше (глубже в сцене), тыл — ниже и ближе к зрителю.
 */
function place(side: 'ally' | 'foe', slot: number): { fx: number; fy: number; k: number } {
  const front = slot <= 1;
  const i = front ? slot : slot - 2;
  const fx = front ? [0.355, 0.645][i] ?? 0.5 : [0.2, 0.5, 0.8][i] ?? 0.5;
  const ally = side === 'ally';
  const fy = ally ? (front ? 0.755 : 0.9) : front ? 0.475 : 0.345;
  const k = ally ? (front ? 0.9 : 1) : front ? 0.78 : 0.69;
  return { fx: ally ? fx : 1 - fx, fy, k };
}

interface Live {
  u: StageUnit;
  anim: AnimName;
  phase: number;
  dead: boolean;
  fade: number;
}

export default function BattleStage({ units, accent, floor, apiRef, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const live = new Map<string, Live>();
    for (const u of units) live.set(u.uid, { u, anim: 'idle', phase: 0, dead: false, fade: 0 });
    const rigs = new Map<string, ReturnType<typeof buildRig>>();
    for (const u of units) rigs.set(u.uid, buildRig(u.look, lookKey(u.look), 0.55));

    const positions: Record<string, ScreenPos> = {};
    apiRef.current = {
      trigger: (uid, kind) => {
        const l = live.get(uid);
        if (!l || l.dead) return;
        if (l.anim !== 'idle' && kind === 'hurt' && l.anim !== 'hurt') return;
        l.anim = kind;
        l.phase = 0;
      },
      setDead: (uid, dead) => {
        const l = live.get(uid);
        if (!l || l.dead === dead) return;
        l.dead = dead;
        l.anim = dead ? 'dead' : 'idle';
        l.phase = 0;
      },
      positions,
    };

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

    const motes = Array.from({ length: 22 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1.2 + Math.random() * 2.6,
      sp: 0.012 + Math.random() * 0.03,
      a: 0.1 + Math.random() * 0.16,
    }));

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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // небо главы
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, floor);
      sky.addColorStop(0.5, '#ffffff');
      sky.addColorStop(1, '#ffffff');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      for (const m of motes) {
        m.y -= m.sp * dt * 6;
        if (m.y < -0.05) m.y = 1.05;
        ctx.beginPath();
        ctx.arc(m.x * w, m.y * h * 0.8, m.r, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.globalAlpha = m.a;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // две площадки: сверху вражеская, снизу своя
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.63, w * 0.78, h * 0.34, 0, 0, Math.PI * 2);
      ctx.fillStyle = floor;
      ctx.globalAlpha = 0.4;
      ctx.fill();
      ctx.globalAlpha = 1;
      for (const [cy, ry, col] of [
        [0.415, 0.105, 'rgba(255,111,143,0.28)'],
        [0.83, 0.13, 'rgba(90,209,160,0.3)'],
      ] as const) {
        ctx.beginPath();
        ctx.ellipse(w / 2, h * cy, w * 0.44, h * ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      // фигуры: дальний ряд раньше ближнего
      const order = [...live.values()].sort((a, b) => {
        const pa = place(a.u.side, a.u.slot);
        const pb = place(b.u.side, b.u.slot);
        return pa.fy - pb.fy;
      });

      const baseH = h * 0.28;
      for (const l of order) {
        const p = place(l.u.side, l.u.slot);
        const rig = rigs.get(l.u.uid);
        if (!rig) continue;
        if (l.anim !== 'idle') {
          l.phase += dt / DUR[l.anim];
          if (l.phase >= 1) {
            l.phase = l.anim === 'dead' ? 1 : 0;
            if (l.anim !== 'dead') l.anim = 'idle';
          }
        }
        const s = (baseH * p.k) / SK.ground;
        const x = p.fx * w;
        const y = p.fy * h;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);
        drawShadow(ctx, 1, l.dead ? 0.1 : 0.2);
        drawRig(ctx, rig, {
          t: clock + l.u.slot * 0.9 + (l.u.side === 'foe' ? 1.7 : 0),
          anim: l.anim,
          phase: l.phase,
          flip: l.u.side === 'foe',
        });
        ctx.restore();
        positions[l.u.uid] = {
          x,
          y: l.dead ? y - 18 * s : y - SK.ground * s * 0.96,
          k: p.k * 0.95,
        };
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      apiRef.current = null;
    };
  }, [units, accent, floor, apiRef]);

  return (
    <div ref={hostRef} className={className}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

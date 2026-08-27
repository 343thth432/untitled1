import { useEffect, useRef, type MutableRefObject } from 'react';
import type { FloorId, Portrait } from '../game/types';
import { buildFloor, CELL, type Cell } from './map';
import { foeImage, foeSilhouette, FOE_ART } from './foeArt';
import { EYE_H, PALETTES, Raycaster, projOf, type Cam } from './render';
import { loadAll, type TexName } from './textures';

const TEXES: TexName[] = ['wallBrick', 'wallRock', 'wallMoss', 'floorCobble', 'ceilRock'];

const STONE: Record<FloorId, Cell> = {
  crypt: CELL.brick,
  catacomb: CELL.rock,
  sanctum: CELL.moss,
};

export type DuelAnim = 'idle' | 'attack' | 'hurt' | 'cast' | 'dead';

export interface DuelStageApi {
  play(who: 'hero' | 'foe', anim: DuelAnim): void;
  setDown(who: 'hero' | 'foe', down: boolean): void;
  /** экранные доли для всплывающих чисел */
  head: { hero: [number, number]; foe: [number, number] };
}

interface Props {
  tier: FloorId;
  seed: string;
  foeId: string;
  portrait: Portrait;
  count: number;
  boss: boolean;
  apiRef: MutableRefObject<DuelStageApi | null>;
  className?: string;
}

const DUR: Record<DuelAnim, number> = { idle: 0, attack: 0.6, hurt: 0.45, cast: 0.8, dead: 1.1 };

/** Дуэль идёт там же, где идёт спуск: тот же зал, тот же свет. */
export default function DuelStage({ tier, seed, foeId, portrait, count, boss, apiRef, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pal = PALETTES[tier] ?? PALETTES.crypt;
    const floor = buildFloor(`${seed}-arena`, STONE[tier], []);
    // ищем клетку, откуда вперёд есть хотя бы три свободных
    let cam: Cam = { x: floor.spawn[0], y: floor.spawn[1], a: 0 };
    outer: for (let y = 1; y < floor.h - 1; y++) {
      for (let x = 1; x < floor.w - 1; x++) {
        for (let d = 0; d < 4; d++) {
          const dx = [1, 0, -1, 0][d];
          const dy = [0, 1, 0, -1][d];
          let len = 0;
          while (len < 6 && floor.cells[(y + dy * (len + 1)) * floor.w + (x + dx * (len + 1))] === CELL.empty) len++;
          if (len >= 4) {
            cam = { x: x + 0.5, y: y + 0.5, a: (d * Math.PI) / 2 };
            break outer;
          }
        }
      }
    }

    const art = foeSilhouette(foeId, portrait, count, boss);
    const anim: Record<'hero' | 'foe', { name: DuelAnim; ph: number; down: boolean }> = {
      hero: { name: 'idle', ph: 0, down: false },
      foe: { name: 'idle', ph: 0, down: false },
    };
    const head = { hero: [0.5, 0.82] as [number, number], foe: [0.5, 0.38] as [number, number] };

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

    let rc: Raycaster | null = null;
    let w = 0;
    let h = 0;
    let ready = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = (): void => {
      w = host.clientWidth;
      h = host.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const bw = Math.min(400, Math.round(w * 0.9));
      rc = new Raycaster(bw, Math.round((bw * h) / w));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    void loadAll(TEXES).then(() => {
      ready = true;
    });

    let raf = 0;
    let last = performance.now();
    let clock = 0;

    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      for (const who of ['hero', 'foe'] as const) {
        const a = anim[who];
        if (a.name !== 'idle') {
          a.ph += dt / DUR[a.name];
          if (a.ph >= 1) {
            a.ph = a.down ? 1 : 0;
            if (!a.down) a.name = 'idle';
          }
        }
      }
      if (rc && ready && w && h) {
        const fl = 0.88 + 0.07 * Math.sin(clock * 7.1) + 0.05 * Math.sin(clock * 15.3);
        // тряска кадра, когда бьют нас
        const hurt = anim.hero.name === 'hurt' ? Math.sin(anim.hero.ph * Math.PI) : 0;
        const shake = hurt * 0.05;
        rc.render(
          floor,
          { x: cam.x, y: cam.y, a: cam.a + Math.sin(clock * 24) * shake },
          pal,
          fl * (1 + hurt * 0.5),
        );
        rc.flush();
        drawFoe(rc, anim.foe, clock, art, portrait, boss);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rc.present(ctx, w, h);

        // вспышка удара героини
        const at = anim.hero.name === 'attack' || anim.hero.name === 'cast' ? anim.hero.ph : -1;
        if (at >= 0) slash(ctx, w, h, at, anim.hero.name === 'cast', portrait.aura);
        if (hurt > 0) {
          ctx.fillStyle = `rgba(190,30,50,${hurt * 0.28})`;
          ctx.fillRect(0, 0, w, h);
        }
        const v = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.3, w * 0.5, h * 0.54, Math.max(w, h) * 0.7);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, w, h);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      apiRef.current = null;
    };
  }, [tier, seed, foeId, portrait, count, boss, apiRef]);

  return (
    <div ref={hostRef} className={className}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

function drawFoe(
  rc: Raycaster,
  st: { name: DuelAnim; ph: number; down: boolean },
  t: number,
  art: HTMLCanvasElement,
  portrait: Portrait,
  boss: boolean,
): void {
  const ctx = rc.ctx;
  const { w, h } = rc;
  const half = h >> 1;
  const img = foeImage(portrait);
  const src: CanvasImageSource = img ?? art;
  const aspect = img ? img.naturalWidth / img.naturalHeight : FOE_ART.W / FOE_ART.H;

  // дистанция «в клетках»: при выпаде противник придвигается
  const lunge = st.name === 'attack' ? Math.sin(st.ph * Math.PI) : 0;
  const recoil = st.name === 'hurt' ? Math.sin(st.ph * Math.PI) : 0;
  const dead = st.down ? Math.min(1, st.ph) : 0;
  const dist = 2.5 - lunge * 0.9 + recoil * 0.25;
  const sway = Math.sin(t * 1.1) * 0.012 + recoil * 0.05;

  const proj = projOf(w);
  const sh = ((boss ? 1.9 : 1.6) * proj) / dist;
  const sw = sh * aspect;
  const bottom = half + (EYE_H * proj) / dist + dead * sh * 0.42;
  const cx = w / 2 + w * sway + recoil * w * 0.03 * Math.sin(t * 40);

  ctx.save();
  ctx.globalAlpha = 1 - dead * 0.85;
  ctx.translate(cx, bottom);
  if (dead) ctx.rotate(dead * 0.5);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, -sh * 0.45, 0, 0, -sh * 0.45, sh * 0.6);
  g.addColorStop(0, `${portrait.aura}33`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-sw, -sh * 1.1, sw * 2, sh * 1.3);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(src, -sw / 2, -sh, sw, sh);
  if (recoil > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255,120,120,${recoil * 0.5})`;
    ctx.fillRect(-sw / 2, -sh, sw, sh);
  }
  ctx.restore();
}

/** росчерк удара поперёк кадра */
function slash(ctx: CanvasRenderingContext2D, w: number, h: number, ph: number, magic: boolean, aura: string): void {
  const k = Math.sin(ph * Math.PI);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (magic) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.55, w * 0.7);
    g.addColorStop(0, `${aura}${Math.round(k * 120).toString(16).padStart(2, '0')}`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.strokeStyle = `rgba(255,245,225,${k * 0.75})`;
    ctx.lineWidth = 10 + k * 26;
    ctx.lineCap = 'round';
    const p = ph * 1.35 - 0.18;
    ctx.beginPath();
    ctx.moveTo(w * (1.15 - p * 1.5), h * 0.18);
    ctx.quadraticCurveTo(w * (0.7 - p * 0.8), h * 0.5, w * (0.05 - p * 0.4 + 0.5), h * 0.86);
    ctx.stroke();
  }
  ctx.restore();
}

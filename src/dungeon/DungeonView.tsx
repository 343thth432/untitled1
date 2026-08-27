import { useEffect, useRef } from 'react';
import { at, CELL, solid, type Floor, type Mark } from './map';
import { markArt } from './marks';
import { EYE_H, FOV, PALETTES, Raycaster, projOf, type Cam, type Palette } from './render';
import { loadAll, type TexName } from './textures';
import { Walker } from './walker';

const TEXES: TexName[] = ['wallBrick', 'wallRock', 'wallMoss', 'floorCobble', 'ceilRock', 'doorWood'];

export interface Props {
  floor: Floor;
  palette: keyof typeof PALETTES;
  /** игрок встал на клетку с меткой */
  onEnter: (mark: Mark) => void;
  /** блокировать управление (идёт диалог, бой и т.п.) */
  locked?: boolean;
  className?: string;
}

/** мягкий шум для дрожания факела */
function flick(t: number): number {
  return (
    0.86 +
    0.08 * Math.sin(t * 7.3) +
    0.05 * Math.sin(t * 13.1 + 1.7) +
    0.04 * Math.sin(t * 23.7 + 0.4)
  );
}

export default function DungeonView({ floor, palette, onEnter, locked, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cmdRef = useRef<((c: 'fwd' | 'back' | 'left' | 'right') => void) | null>(null);
  const stateRef = useRef({ onEnter, locked });
  stateRef.current = { onEnter, locked };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pal: Palette = PALETTES[palette] ?? PALETTES.crypt;
    const walker = new Walker(floor);
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
      // внутренний буфер меньше экрана: так хватает кадров, а мягкое
      // увеличение только помогает картинке
      const bw = Math.min(400, Math.round(w * 0.9));
      const bh = Math.round((bw * h) / w);
      rc = new Raycaster(bw, bh);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    void loadAll(TEXES).then(() => {
      ready = true;
    });

    if (import.meta.env.DEV) {
      (window as unknown as { __dbg?: unknown }).__dbg = { floor, walker };
    }

    const tryEnter = (): void => {
      const m = floor.marks.find((k) => !k.taken && k.x === walker.cx && k.y === walker.cy);
      if (m) stateRef.current.onEnter(m);
    };

    cmdRef.current = (c) => {
      if (stateRef.current.locked || walker.busy) return;
      walker.stop();
      if (c === 'left') walker.turn(-1);
      else if (c === 'right') walker.turn(1);
      else if (walker.step(floor, c === 'fwd' ? 1 : -1)) queueMicrotask(() => void 0);
    };

    const key = (e: KeyboardEvent): void => {
      const map: Record<string, 'fwd' | 'back' | 'left' | 'right'> = {
        ArrowUp: 'fwd',
        ArrowDown: 'back',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'fwd',
        s: 'back',
        a: 'left',
        d: 'right',
      };
      const c = map[e.key];
      if (c) {
        e.preventDefault();
        cmdRef.current?.(c);
      }
    };
    window.addEventListener('keydown', key);

    const hits: Hit[] = [];
    let raf = 0;
    let last = performance.now();
    let clock = 0;
    let wasBusy = false;

    // тап по метке — идём к ней сами, чтобы не давить стрелку два десятка раз
    const tap = (e: PointerEvent): void => {
      if (stateRef.current.locked) return;
      const box = canvas.getBoundingClientRect();
      const fx = (e.clientX - box.left) / box.width;
      const fy = (e.clientY - box.top) / box.height;
      if (walker.walking) {
        walker.stop();
        return;
      }
      // тап по плану этажа — идём в ту клетку
      const cssX = e.clientX - box.left;
      const cssY = e.clientY - box.top;
      const mb = mapBox(w);
      if (cssX >= mb.x0 && cssX <= mb.x0 + mb.size && cssY >= mb.y0 && cssY <= mb.y0 + mb.size) {
        const dx = Math.floor((cssX - mb.x0) / MAP.cell) - MAP.r;
        const dy = Math.floor((cssY - mb.y0) / MAP.cell) - MAP.r;
        walker.goTo(floor, walker.cx + dx, walker.cy + dy);
        return;
      }
      const hit = hits.find((k) => fx >= k.x0 && fx <= k.x1 && fy >= k.y0 && fy <= k.y1);
      if (hit) {
        walker.goTo(floor, hit.mark.x, hit.mark.y);
        return;
      }
      // тап по верхней половине кадра — шаг вперёд
      if (fy < 0.62) cmdRef.current?.('fwd');
    };
    canvas.addEventListener('pointerdown', tap);

    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      walker.update(dt, floor);
      if (wasBusy && !walker.busy) tryEnter();
      wasBusy = walker.busy;

      if (rc && ready && w && h) {
        const cam: Cam = walker.cam;
        const fl = flick(clock);
        rc.render(floor, cam, pal, fl);
        rc.flush();
        drawMarks(rc, floor, cam, clock, hits);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rc.present(ctx, w, h);
        overlay(ctx, w, h, pal, fl);
        minimap(ctx, floor, walker, w);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', key);
      canvas.removeEventListener('pointerdown', tap);
      cmdRef.current = null;
    };
  }, [floor, palette]);

  const Btn = ({ c, children }: { c: 'fwd' | 'back' | 'left' | 'right'; children: string }) => (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        cmdRef.current?.(c);
      }}
      className="btn-ghost h-12 w-full text-lg"
    >
      {children}
    </button>
  );

  return (
    <div className={className}>
      <div ref={hostRef} className="relative h-full w-full overflow-hidden">
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-4 gap-1.5 p-2">
          <Btn c="left">↺</Btn>
          <Btn c="fwd">▲</Btn>
          <Btn c="back">▼</Btn>
          <Btn c="right">↻</Btn>
        </div>
      </div>
    </div>
  );
}

/** экранные прямоугольники меток последнего кадра — для попадания тапом */
export interface Hit {
  mark: Mark;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** билборды меток с перекрытием стенами по буферу глубины */
function drawMarks(rc: Raycaster, f: Floor, cam: Cam, t: number, hits: Hit[]): void {
  hits.length = 0;
  const ctx = rc.ctx;
  const { w, h, depth } = rc;
  const half = h >> 1;
  const dirX = Math.cos(cam.a);
  const dirY = Math.sin(cam.a);
  const planeX = -dirY * FOV;
  const planeY = dirX * FOV;
  const proj = projOf(w);
  const invDet = 1 / (planeX * dirY - dirX * planeY);

  const list = f.marks
    .filter((m) => !m.taken)
    .map((m) => ({ m, d: (m.x + 0.5 - cam.x) ** 2 + (m.y + 0.5 - cam.y) ** 2 }))
    .sort((a, b) => b.d - a.d);

  for (const { m } of list) {
    const sx = m.x + 0.5 - cam.x;
    const sy = m.y + 0.5 - cam.y;
    const tx = invDet * (dirY * sx - dirX * sy);
    const ty = invDet * (-planeY * sx + planeX * sy);
    if (ty <= 0.12) continue;
    const art = markArt(m.kind, m.count, `${m.kind}${m.x}${m.y}`);
    const scr = (w / 2) * (1 + tx / ty);
    const bottom = half + (EYE_H * proj) / ty;
    const sh = art.scale * (proj / ty) * 1.9;
    const sw = sh * (256 / 320);
    const left = scr - sw / 2;
    if (left > w || left + sw < 0) continue;
    hits.push({ mark: m, x0: left / w, x1: (left + sw) / w, y0: (bottom - sh) / h, y1: bottom / h });

    // ореол пробивается сквозь мглу
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bob = Math.sin(t * 1.6 + m.x) * sh * 0.012;
    const g = ctx.createRadialGradient(scr, bottom - sh * 0.5 + bob, 0, scr, bottom - sh * 0.5 + bob, sh * 0.7);
    g.addColorStop(0, art.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = Math.max(0, Math.min(1, 2.4 / ty)) * 0.5;
    ctx.fillStyle = g;
    ctx.fillRect(scr - sh, bottom - sh * 1.2 + bob, sh * 2, sh * 1.4);
    ctx.restore();

    // само изображение — полосами, чтобы стены его перекрывали
    const x0 = Math.max(0, Math.floor(left));
    const x1 = Math.min(w - 1, Math.ceil(left + sw));
    const fade = Math.max(0.12, Math.min(1, 1 / (1 + ty * 0.16)));
    let run = -1;
    for (let x = x0; x <= x1 + 1; x++) {
      const vis = x <= x1 && depth[x] > ty;
      if (vis && run < 0) run = x;
      if ((!vis || x > x1) && run >= 0) {
        const cw = x - run;
        ctx.save();
        ctx.globalAlpha = art.emissive + (1 - art.emissive) * fade;
        ctx.drawImage(
          art.canvas,
          ((run - left) / sw) * 256,
          0,
          (cw / sw) * 256,
          320,
          run,
          bottom - sh + bob,
          cw,
          sh,
        );
        ctx.restore();
        run = -1;
      }
    }
  }
}

/** факел в руке, копоть по краям кадра */
function overlay(ctx: CanvasRenderingContext2D, w: number, h: number, pal: Palette, fl: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const t = pal.torch;
  const g = ctx.createRadialGradient(w * 0.5, h * 1.06, 0, w * 0.5, h * 1.06, h * 0.7);
  g.addColorStop(0, `rgba(${t.r},${t.g},${t.b},${0.2 * fl})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const v = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.3, w * 0.5, h * 0.54, Math.max(w, h) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** план этажа в углу — без него в коридорах теряешься */
const MAP = { cell: 6, r: 8, pad: 10 };

function mapBox(w: number): { x0: number; y0: number; size: number } {
  const size = (MAP.r * 2 + 1) * MAP.cell;
  return { x0: w - size - MAP.pad, y0: MAP.pad, size };
}

function minimap(ctx: CanvasRenderingContext2D, f: Floor, wk: Walker, w: number): void {
  const cellPx = MAP.cell;
  const r = MAP.r;
  const { x0, y0, size } = mapBox(w);
  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = 'rgba(6,8,14,0.8)';
  ctx.beginPath();
  ctx.roundRect(x0 - 4, y0 - 4, size + 8, size + 8, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const cx = wk.cx + dx;
      const cy = wk.cy + dy;
      const px = x0 + (dx + r) * cellPx;
      const py = y0 + (dy + r) * cellPx;
      if (at(f, cx, cy) === CELL.empty) {
        ctx.fillStyle = 'rgba(150,170,210,0.35)';
        ctx.fillRect(px, py, cellPx, cellPx);
      } else if (!solid(f, cx + 1, cy) || !solid(f, cx - 1, cy) || !solid(f, cx, cy + 1) || !solid(f, cx, cy - 1)) {
        ctx.fillStyle = 'rgba(90,105,140,0.3)';
        ctx.fillRect(px, py, cellPx, cellPx);
      }
    }
  }
  for (const m of f.marks) {
    if (m.taken) continue;
    const dx = m.x - wk.cx;
    const dy = m.y - wk.cy;
    if (Math.abs(dx) > r || Math.abs(dy) > r) continue;
    ctx.fillStyle =
      m.kind === 'boss' ? '#ff7f52' : m.kind === 'rest' ? '#ffcf8a' : m.kind === 'stairs' ? '#8fd0ff' : '#c9a0ff';
    ctx.fillRect(x0 + (dx + r) * cellPx, y0 + (dy + r) * cellPx, cellPx, cellPx);
  }
  // игрок и направление
  const px = x0 + r * cellPx + cellPx / 2;
  const py = y0 + r * cellPx + cellPx / 2;
  const a = (wk.face * Math.PI) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(px + Math.cos(a) * 6, py + Math.sin(a) * 6);
  ctx.lineTo(px + Math.cos(a + 2.4) * 5, py + Math.sin(a + 2.4) * 5);
  ctx.lineTo(px + Math.cos(a - 2.4) * 5, py + Math.sin(a - 2.4) * 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

import { useEffect, useRef } from 'react';
import { CELL, at, solid, type Floor, type Mark } from './map';
import { lootArt } from './loot';
import { propArt } from './props';
import { Mob, spawnMobs } from './mob';
import { Player } from './player';
import { drawBoards, type Board } from './billboard';
import { PALETTES, Raycaster, type Cam, type Palette } from './render';
import { loadAll, type TexName } from './textures';
import { WEAPONS, weaponArt, WEAPON_ART, type WeaponId } from './weapon';

const TEXES: TexName[] = ['wallBrick', 'wallRock', 'wallMoss', 'floorCobble', 'ceilRock', 'doorWood'];

export interface CrawlState {
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  weapon: WeaponId;
  guns: WeaponId[];
  left: number;
  name: string;
}

interface Props {
  floor: Floor;
  palette: keyof typeof PALETTES;
  floorName: string;
  /** множитель силы противников */
  scale: number;
  start: { hp: number; maxHp: number; ammo: number; weapon: WeaponId; guns: WeaponId[] };
  onState: (s: CrawlState) => void;
  onDescend: (s: CrawlState) => void;
  onDeath: () => void;
  className?: string;
}

interface Stick {
  id: number;
  ox: number;
  oy: number;
  x: number;
  y: number;
}

const MAP = { cell: 5, r: 9, pad: 10 };

export default function Crawl({ floor, palette, floorName, scale, start, onState, onDescend, onDeath, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef({ onState, onDescend, onDeath });
  cbRef.current = { onState, onDescend, onDeath };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pal: Palette = PALETTES[palette] ?? PALETTES.crypt;
    const player = new Player(floor);
    player.hp = start.hp;
    player.maxHp = start.maxHp;
    let ammo = start.ammo;
    let weapon: WeaponId = start.weapon;
    let guns = start.guns.slice();
    const mobs = spawnMobs(floor, scale);
    let cool = 0;
    let flash = 0;
    let over = false;
    let hurtFlash = 0;
    let pickMsg = '';
    let pickT = 0;

    const maxAmmo = 60;
    const state = (): CrawlState => ({
      hp: Math.round(player.hp),
      maxHp: player.maxHp,
      ammo,
      maxAmmo,
      weapon,
      guns,
      left: mobs.filter((m) => m.state !== 'dead').length,
      name: floorName,
    });
    cbRef.current.onState(state());

    // ── управление пальцами ────────────────────────────────
    let stick: Stick | null = null;
    let look: { id: number; x: number; last: number } | null = null;
    let firing = false;
    let fireId = -1;

    const fireZone = (fx: number, fy: number): boolean => fx > 0.66 && fy > 0.72;

    const down = (e: PointerEvent): void => {
      const b = canvas.getBoundingClientRect();
      const fx = (e.clientX - b.left) / b.width;
      const fy = (e.clientY - b.top) / b.height;
      if (fireZone(fx, fy)) {
        firing = true;
        fireId = e.pointerId;
        return;
      }
      if (fx < 0.5 && !stick) {
        stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
        return;
      }
      if (!look) look = { id: e.pointerId, x: e.clientX, last: e.clientX };
    };
    const move = (e: PointerEvent): void => {
      if (stick && stick.id === e.pointerId) {
        const dx = e.clientX - stick.ox;
        const dy = e.clientY - stick.oy;
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / 64) / len;
        stick.x = dx * k;
        stick.y = dy * k;
      }
      if (look && look.id === e.pointerId) look.x = e.clientX;
    };
    const up = (e: PointerEvent): void => {
      if (stick && stick.id === e.pointerId) stick = null;
      if (look && look.id === e.pointerId) look = null;
      if (e.pointerId === fireId) {
        firing = false;
        fireId = -1;
      }
    };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    const keys = new Set<string>();
    const kd = (e: KeyboardEvent): void => {
      keys.add(e.key.toLowerCase());
      if (e.key === ' ') {
        e.preventDefault();
        firing = true;
      }
    };
    const ku = (e: KeyboardEvent): void => {
      keys.delete(e.key.toLowerCase());
      if (e.key === ' ') firing = false;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // ── выстрел ────────────────────────────────────────────
    const shoot = (): void => {
      const def = WEAPONS[weapon];
      if (cool > 0 || ammo < def.cost || over) return;
      ammo -= def.cost;
      cool = def.cool;
      flash = 1;
      player.kick = def.kick;
      for (let i = 0; i < def.pellets; i++) {
        const a = player.a + (Math.random() - 0.5) * def.spread * 2;
        hit(a, def.dmg);
      }
      cbRef.current.onState(state());
    };

    const hit = (a: number, dmg: number): void => {
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const live = mobs
        .filter((m) => m.state !== 'dead')
        .map((m) => ({ m, d: Math.hypot(m.x - player.x, m.y - player.y) }))
        .sort((x, y) => x.d - y.d);
      for (const { m, d } of live) {
        if (d > 22) break;
        const ang = Math.atan2(m.y - player.y, m.x - player.x);
        let diff = ang - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        // помощь прицеливанию: на телефоне пиксельная точность недостижима
        const half = Math.atan2(0.42, Math.max(0.5, d)) + 0.035;
        if (Math.abs(diff) > half) continue;
        // стена между нами?
        let blocked = false;
        const n = Math.ceil(d * 3);
        for (let i = 1; i < n; i++) {
          const t = i / n;
          if (solid(floor, Math.floor(player.x + dx * d * t), Math.floor(player.y + dy * d * t))) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        m.hurtBy(dmg);
        return;
      }
    };

    // ── кадр ───────────────────────────────────────────────
    let rc: Raycaster | null = null;
    let w = 0;
    let h = 0;
    let ready = false;
    // ширина буфера подстраивается под скорость устройства: крупный пиксель
    // здесь часть облика, поэтому просадку лучше гасить разрешением, а не кадрами
    let bufW = 176;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rebuild = (): void => {
      if (!w || !h) return;
      rc = new Raycaster(bufW, Math.max(80, Math.round((bufW * h) / w)));
    };
    const resize = (): void => {
      w = host.clientWidth;
      h = host.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      rebuild();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    void loadAll(TEXES).then(() => {
      ready = true;
    });
    (window as unknown as { __dbg?: unknown }).__dbg = { floor, player, mobs };

    let raf = 0;
    let last = performance.now();
    let clock = 0;
    let avg = 16;
    let settle = 0;
    const boards: Board[] = [];

    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      cool = Math.max(0, cool - dt);
      flash = Math.max(0, flash - dt * 6.5);
      hurtFlash = Math.max(0, hurtFlash - dt * 2.4);
      pickT = Math.max(0, pickT - dt);

      if (!over) {
        // движение
        let fwd = 0;
        let side = 0;
        let turn = 0;
        if (stick) {
          fwd = -stick.y;
          side = stick.x;
        }
        if (keys.has('w') || keys.has('arrowup')) fwd = 1;
        if (keys.has('s') || keys.has('arrowdown')) fwd = -1;
        if (keys.has('q')) side = -1;
        if (keys.has('e')) side = 1;
        if (keys.has('a') || keys.has('arrowleft')) turn = -1;
        if (keys.has('d') || keys.has('arrowright')) turn = 1;
        if (look) {
          const d = look.x - look.last;
          look.last = look.x;
          player.a += d * 0.0055;
        }
        player.move(floor, dt, fwd, side, turn);
        if (firing) shoot();

        // твари
        let taken = 0;
        for (const m of mobs) taken += m.update(dt, floor, player, mobs);
        if (taken > 0) {
          player.hurt(taken);
          hurtFlash = 1;
          cbRef.current.onState(state());
          if (player.dead) {
            over = true;
            cbRef.current.onDeath();
          }
        }

        // подбор
        for (const mk of floor.marks) {
          if (mk.taken) continue;
          if (Math.hypot(mk.x + 0.5 - player.x, mk.y + 0.5 - player.y) > 0.62) continue;
          if (mk.kind === 'stairs') {
            if (mobs.some((m) => m.state !== 'dead' && m.tier === 'boss')) {
              pickMsg = 'Хранитель ещё жив';
              pickT = 1.6;
              continue;
            }
            over = true;
            cbRef.current.onDescend(state());
            break;
          }
          mk.taken = true;
          if (mk.kind === 'heal') {
            player.heal(mk.amount);
            pickMsg = `+${mk.amount} здоровья`;
          } else if (mk.kind === 'ammo') {
            ammo = Math.min(maxAmmo, ammo + mk.amount);
            pickMsg = `+${mk.amount} зарядов`;
          } else if (mk.kind === 'weapon' && mk.give) {
            const g = mk.give as WeaponId;
            if (!guns.includes(g)) guns = [...guns, g];
            weapon = g;
            pickMsg = WEAPONS[g].name;
          } else {
            player.maxHp += 10;
            player.heal(10);
            pickMsg = 'Реликвия: +10 предела';
          }
          pickT = 1.8;
          cbRef.current.onState(state());
        }
      }

      if (rc && ready && w && h) {
        const cam: Cam = { x: player.x, y: player.y, a: player.a };
        const fl = 0.9 + 0.06 * Math.sin(clock * 7.7) + 0.04 * Math.sin(clock * 16.1) + flash * 1.4;
        rc.render(floor, cam, pal, fl);
        rc.flush();

        boards.length = 0;
        for (const th of floor.things) {
          const art = propArt(th.kind, `${th.kind}${th.x}${th.y}`);
          const frame = art.frames?.[Math.floor((clock * 11 + th.ph) % art.frames.length)];
          boards.push({
            x: th.x,
            y: th.y,
            src: art.canvas,
            aspect: 192 / 256,
            scale: art.scale,
            hang: art.hang,
            emissive: art.emissive,
            over: frame,
            glow: art.glow,
          });
        }
        for (const mk of floor.marks) {
          if (mk.taken) continue;
          const art = lootArt(mk.kind, `${mk.kind}${mk.x}${mk.y}`);
          boards.push({
            x: mk.x + 0.5,
            y: mk.y + 0.5,
            src: art.canvas,
            aspect: 1,
            scale: art.scale,
            hang: 0,
            emissive: 0.85,
            glow: art.glow,
            lift: mk.kind === 'stairs' ? 0 : 0.06 + Math.sin(clock * 2 + mk.x) * 0.03,
          });
        }
        for (const m of mobs) {
          if (m.dead) continue;
          boards.push(m.board(clock));
        }
        drawBoards(rc, cam, boards);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rc.present(ctx, w, h);
        drawWeapon(ctx, w, h, weapon, player, cool, flash);
        overlay(ctx, w, h, hurtFlash, flash, pal.torch);
        minimap(ctx, floor, player, mobs, w);
        if (pickT > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, pickT * 1.6);
          ctx.font = '600 15px Manrope, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillText(pickMsg, w / 2 + 1, h * 0.36 + 1);
          ctx.fillStyle = '#ffe6b0';
          ctx.fillText(pickMsg, w / 2, h * 0.36);
          ctx.restore();
        }
        controls(ctx, w, h, stick, cool, WEAPONS[weapon].cool);
      }
      // подстройка разрешения: реагируем не на отдельный кадр, а на среднее
      avg += (dt * 1000 - avg) * 0.08;
      settle += dt;
      if (settle > 1.2) {
        const want = avg > 24 ? bufW - 16 : avg < 13 ? bufW + 12 : bufW;
        const next = Math.max(112, Math.min(224, want));
        if (next !== bufW) {
          bufW = next;
          rebuild();
        }
        settle = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [floor, palette, floorName, scale, start]);

  return (
    <div ref={hostRef} className={className}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />
    </div>
  );
}

/** оружие в руках: покачивание, отдача, вспышка */
function drawWeapon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  id: WeaponId,
  p: Player,
  cool: number,
  flash: number,
): void {
  const art = weaponArt(id);
  // спрайт крупный и подрезан снизу — так рука ощущается ближе к глазу
  const sw = Math.min(w * 1.02, h * 0.66);
  const sh = (sw * WEAPON_ART.H) / WEAPON_ART.W;
  const bobX = p.bob * w * 0.022;
  const bobY = Math.abs(p.bob) * h * 0.02;
  const kick = p.kick * h * 0.055;
  const x = w / 2 - sw / 2 + bobX;
  const y = h - sh * 0.88 + bobY + kick;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art.body, x, y, sw, sh);
  if (flash > 0.05) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, flash * 1.3);
    ctx.drawImage(art.flash, x, y, sw, sh);
  }
  ctx.restore();
  void cool;
}

/** копоть по краям, вспышка выстрела и красная засветка от урона */
function overlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hurt: number,
  flash: number,
  torch: { r: number; g: number; b: number },
): void {
  if (flash > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,230,180,${flash * 0.16})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(w * 0.5, h * 1.02, 0, w * 0.5, h * 1.02, h * 0.6);
  g.addColorStop(0, `rgba(${torch.r},${torch.g},${torch.b},0.14)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const v = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.3, w * 0.5, h * 0.54, Math.max(w, h) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  if (hurt > 0.02) {
    const r = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.1, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    r.addColorStop(0, 'rgba(180,20,40,0)');
    r.addColorStop(1, `rgba(190,20,40,${hurt * 0.55})`);
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, w, h);
  }
}

/** подсказки под пальцами: круг стика и кнопка огня */
function controls(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stick: Stick | null,
  cool: number,
  full: number,
): void {
  ctx.save();
  const fx = w * 0.84;
  const fy = h * 0.86;
  const r = Math.min(w, h) * 0.085;
  ctx.beginPath();
  ctx.arc(fx, fy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (cool > 0) {
    ctx.beginPath();
    ctx.arc(fx, fy, r - 4, -Math.PI / 2, -Math.PI / 2 + (1 - cool / full) * Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,210,140,0.7)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,225,180,0.75)';
  ctx.beginPath();
  ctx.arc(fx, fy, r * 0.3, 0, Math.PI * 2);
  ctx.fill();

  if (stick) {
    const b = ctx.canvas.getBoundingClientRect();
    const ox = stick.ox - b.left;
    const oy = stick.oy - b.top;
    ctx.beginPath();
    ctx.arc(ox, oy, 44, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ox + stick.x * 44, oy + stick.y * 44, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
  }
  ctx.restore();
}

function minimap(ctx: CanvasRenderingContext2D, f: Floor, p: Player, mobs: Mob[], w: number): void {
  const c = MAP.cell;
  const r = MAP.r;
  const size = (r * 2 + 1) * c;
  const x0 = w - size - MAP.pad;
  const y0 = MAP.pad;
  const px = Math.floor(p.x);
  const py = Math.floor(p.y);
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = 'rgba(6,8,14,0.78)';
  ctx.beginPath();
  ctx.roundRect(x0 - 4, y0 - 4, size + 8, size + 8, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (at(f, px + dx, py + dy) !== CELL.empty) continue;
      ctx.fillStyle = 'rgba(150,170,210,0.32)';
      ctx.fillRect(x0 + (dx + r) * c, y0 + (dy + r) * c, c, c);
    }
  }
  for (const mk of f.marks) {
    if (mk.taken) continue;
    const dx = mk.x - px;
    const dy = mk.y - py;
    if (Math.abs(dx) > r || Math.abs(dy) > r) continue;
    ctx.fillStyle = mk.kind === 'stairs' ? '#8fd0ff' : mk.kind === 'heal' ? '#ff6f86' : '#ffcf8a';
    ctx.fillRect(x0 + (dx + r) * c, y0 + (dy + r) * c, c, c);
  }
  for (const m of mobs) {
    if (m.state === 'dead') continue;
    const dx = Math.floor(m.x) - px;
    const dy = Math.floor(m.y) - py;
    if (Math.abs(dx) > r || Math.abs(dy) > r) continue;
    ctx.fillStyle = m.tier === 'boss' ? '#ff5a3c' : '#d06bff';
    ctx.fillRect(x0 + (dx + r) * c, y0 + (dy + r) * c, c, c);
  }
  const cx = x0 + r * c + c / 2;
  const cy = y0 + r * c + c / 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(p.a) * 6, cy + Math.sin(p.a) * 6);
  ctx.lineTo(cx + Math.cos(p.a + 2.4) * 5, cy + Math.sin(p.a + 2.4) * 5);
  ctx.lineTo(cx + Math.cos(p.a - 2.4) * 5, cy + Math.sin(p.a - 2.4) * 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export type { Mark };

import { useEffect, useRef } from 'react';
import { Gore } from './gore';
import { CELL, at, solid, type Floor, type Mark } from './map';
import { lootArt } from './loot';
import { propArt } from './props';
import { Mob, alert, spawnMobs } from './mob';
import type { FoeId } from './foes';
import { Player } from './player';
import { drawBoards, type Board } from './billboard';
import { PALETTES, Raycaster, type Cam, type Palette } from './render';
import { loadAll, type TexName } from './textures';
import { WEAPONS, frameAt, seqFrame, weaponArt, WEAPON_ART, type AmmoId, type WeaponId } from './weapon';
import { loadSheets, weaponSheet } from './sheet';

// ленты кадров тянутся один раз, до первого кадра игры
loadSheets();
import {
  Bolt,
  Rocket,
  blastBoard,
  moteBoards,
  spawnMotes,
  splash,
  splashOn,
  stepMotes,
  type Blast,
  type Mote,
} from './projectile';

const TEXES: TexName[] = ['wallBrick', 'wallRock', 'wallMoss', 'floorCobble', 'ceilRock', 'doorWood'];

export type Ammo = Record<AmmoId, number>;

export interface CrawlState {
  hp: number;
  maxHp: number;
  ammo: Ammo;
  weapon: WeaponId;
  name: string;
}

interface Props {
  floor: Floor;
  palette: keyof typeof PALETTES;
  floorName: string;
  /** множитель силы противников */
  scale: number;
  start: { hp: number; maxHp: number; ammo: Ammo; weapon: WeaponId };
  onState: (s: CrawlState) => void;
  onDescend: (s: CrawlState) => void;
  onDeath: () => void;
  /** выход из вылазки: угловой значок в самой игре */
  onQuit: () => void;
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
/** где под пальцем лежат огонь и рывок, в долях кадра */
const FIRE_AT: [number, number] = [0.84, 0.86];
const DASH_AT: [number, number] = [0.62, 0.75];

const MAX_AMMO: Ammo = { shells: 40, bullets: 200, rockets: 20 };
/** сколько патронов идёт вместе с подобранным стволом */
const START_AMMO: Ammo = { shells: 12, bullets: 90, rockets: 6 };

/**
 * Ярость. Убийства подряд копят жар; на полном он срывается в ярость —
 * несколько секунд, когда бьёшь чаще и сильнее. Жар тает сам, так что
 * держать его можно только напором: остановился — потерял.
 */
const HEAT_PER_KILL = 0.26;
const HEAT_DECAY = 0.11;
const RAGE_T = 5;
const RAGE_COOL = 0.62;
const RAGE_DMG = 1.4;
/** сколько капель роняет тварь и по сколько лечит каждая */
const MOTE_HEAL = 3;

export default function Crawl({ floor, palette, floorName, scale, start, onState, onDescend, onDeath, onQuit, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef({ onState, onDescend, onDeath, onQuit });
  cbRef.current = { onState, onDescend, onDeath, onQuit };

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
    const ammo: Ammo = { ...start.ammo };
    // ствол один: подобранный вытесняет прежний
    let weapon: WeaponId = start.weapon;
    const mobs = spawnMobs(floor, scale);
    const rockets: Rocket[] = [];
    const blasts: Blast[] = [];
    const bolts: Bolt[] = [];
    const motes: Mote[] = [];
    // кровь: брызги, пятна на камне и клякса на «стекле» — всё в одном
    const gore = new Gore(floor.w, floor.h);

    // ── западня ──────────────────────────────────────────────
    // Волна: −1 ещё не начата, 0..n−1 идёт, n выбита и ворота открыты
    const arena = floor.arena;
    let wave = -1;
    let waveGap = 0;
    let arenaDone = false;
    /** твари текущей волны: пока хоть одна жива, ворота закрыты */
    let penned: Mob[] = [];

    const gates = (shut: boolean): void => {
      if (!arena) return;
      for (const [gx, gy] of arena.gates) floor.cells[gy * floor.w + gx] = shut ? CELL.door : CELL.empty;
    };

    /** выпускает волну по свободным клеткам зала, подальше от игрока */
    const release = (n: number): void => {
      if (!arena) return;
      const free: [number, number][] = [];
      for (let y = arena.y; y < arena.y + arena.h; y++) {
        for (let x = arena.x; x < arena.x + arena.w; x++) {
          if (Math.hypot(x + 0.5 - player.x, y + 0.5 - player.y) < 1.6) continue;
          free.push([x, y]);
        }
      }
      penned = [];
      for (const f of arena.waves[n]) {
        const spot = free.length ? free[Math.floor(Math.random() * free.length)] : [arena.x, arena.y];
        const m = new Mob(f.id as FoeId, spot[0] + 0.5, spot[1] + 0.5, scale);
        m.wake();
        mobs.push(m);
        penned.push(m);
      }
    };
    /** жар от убийств 0..1 и оставшееся время ярости */
    let heat = 0;
    let rage = 0;
    // fireT < 0 — оружие в покое, иначе доля цикла выстрела
    let fireT = -1;
    let struck = false;
    let flash = 0;
    let over = false;
    let hurtFlash = 0;
    /** тёплая вспышка, когда ихор влился: подобранная капля видна сразу */
    let healFlash = 0;
    let pickMsg = '';
    let pickT = 0;
    /** метка, на которой стоим после размена стволов */
    let held: Mark | null = null;

    const state = (): CrawlState => ({
      hp: Math.round(player.hp),
      maxHp: player.maxHp,
      ammo: { ...ammo },
      weapon,
      name: floorName,
    });
    cbRef.current.onState(state());

    // ── управление пальцами ────────────────────────────────
    let stick: Stick | null = null;
    let look: { id: number; x: number; last: number } | null = null;
    let firing = false;
    let fireId = -1;

    /** кнопки под правым большим: огонь и рывок над ним */
    const inRound = (fx: number, fy: number, c: [number, number], r: number): boolean =>
      Math.hypot(fx - c[0], (fy - c[1]) * 1.9) < r;
    const fireZone = (fx: number, fy: number): boolean => inRound(fx, fy, FIRE_AT, 0.16);
    const dashZone = (fx: number, fy: number): boolean => inRound(fx, fy, DASH_AT, 0.12);
    /** угол выхода: маленький, чтобы не ловить палец, идущий за стиком */
    const quitZone = (fx: number, fy: number): boolean => fx < 0.12 && fy < 0.06;

    const down = (e: PointerEvent): void => {
      const b = canvas.getBoundingClientRect();
      const fx = (e.clientX - b.left) / b.width;
      const fy = (e.clientY - b.top) / b.height;
      if (quitZone(fx, fy)) {
        cbRef.current.onQuit();
        return;
      }
      if (dashZone(fx, fy)) {
        player.lunge();
        return;
      }
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
      if (e.key === 'Shift') player.lunge();
    };
    const ku = (e: KeyboardEvent): void => {
      keys.delete(e.key.toLowerCase());
      if (e.key === ' ') firing = false;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // ── выстрел ────────────────────────────────────────────
    const begin = (): void => {
      const d = WEAPONS[weapon];
      if (fireT >= 0 || over) return;
      if (d.ammo && ammo[d.ammo] < d.cost) return;
      if (d.ammo) ammo[d.ammo] -= d.cost;
      fireT = 0;
      struck = false;
      cbRef.current.onState(state());
    };

    /** момент, когда выстрел действительно наносит урон */
    const strike = (): void => {
      const d = WEAPONS[weapon];
      flash = 1;
      player.kick = d.kick;
      // выстрел слышно — ближние твари просыпаются, как в оригинале
      alert(mobs, player.x, player.y, 13);
      if (d.kind === 'projectile') {
        rockets.push(
          new Rocket(player.x + Math.cos(player.a) * 0.45, player.y + Math.sin(player.a) * 0.45, player.a),
        );
        return;
      }
      const dmg = Math.round(d.dmg * (rage > 0 ? RAGE_DMG : 1));
      for (let i = 0; i < d.pellets; i++) {
        hit(player.a + (Math.random() - 0.5) * d.spread * 2, dmg);
      }
    };

    const hit = (a: number, dmg: number): void => {
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const live = mobs
        .filter((m) => m.alive)
        .map((m) => ({ m, d: Math.hypot(m.x - player.x, m.y - player.y) }))
        .sort((x, y) => x.d - y.d);
      for (const { m, d } of live) {
        if (d > 22) break;
        let diff = Math.atan2(m.y - player.y, m.x - player.x) - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        // помощь прицеливанию: на телефоне пиксельная точность недостижима
        const half = Math.atan2(0.42, Math.max(0.5, d)) + 0.035;
        if (Math.abs(diff) > half) continue;
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
        // куда пришлось: вверх прицела нет, поэтому зона берётся от того,
        // насколько ровно тварь держалась в середине. Держишь по центру —
        // чаще бьёшь в голову, а это и урон в полтора раза, и фонтан
        const acc = 1 - Math.min(1, Math.abs(diff) / half);
        const roll = Math.random();
        const zone = roll < 0.1 + acc * acc * 0.32 ? 0 : roll < 0.8 ? 1 : 2;
        const dealt = zone === 0 ? Math.round(dmg * 1.6) : dmg;
        m.hurtBy(dealt);
        const up = (m.def.fly ?? 0) * m.scale;
        gore.hit(m.x, m.y, up + m.scale * (zone === 0 ? 0.84 : zone === 1 ? 0.5 : 0.16), a, dealt, zone);
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
    (window as unknown as { __dbg?: unknown }).__dbg = {
      floor,
      player,
      mobs,
      gore,
      motes,
      // отладочная выдача — нужна автотестам
      give: () => {
        ammo.shells = 40;
        ammo.bullets = 200;
        ammo.rockets = 20;
        cbRef.current.onState(state());
      },
      use: (id: WeaponId) => {
        weapon = id;
        cbRef.current.onState(state());
      },
    };

    let raf = 0;
    let last = performance.now();
    let clock = 0;
    let avg = 16;
    let settle = 0;
    const boards: Board[] = [];

    const loop = (now: number): void => {
      // время иногда идёт назад: часы вкладки, возврат из фона
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      clock += dt;
      flash = Math.max(0, flash - dt * 6.5);
      const def = WEAPONS[weapon];
      if (fireT >= 0) {
        fireT += dt / (def.cool * (rage > 0 ? RAGE_COOL : 1));
        if (!struck && fireT >= def.strike) {
          struck = true;
          strike();
        }
        if (fireT >= 1) fireT = -1;
      }
      hurtFlash = Math.max(0, hurtFlash - dt * 2.4);
      healFlash = Math.max(0, healFlash - dt * 2.2);
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
        if (firing) begin();

        // ракеты в полёте
        for (const r of rockets) {
          const at2 = r.update(dt, floor, mobs);
          if (!at2) continue;
          splash(mobs, at2[0], at2[1], WEAPONS.launcher.dmg);
          blasts.push({ x: at2[0], y: at2[1], t: 0 });
          const self = splashOn(player.x, player.y, at2[0], at2[1], WEAPONS.launcher.dmg);
          if (self > 0) {
            player.hurt(self);
            hurtFlash = 1;
          }
          flash = Math.max(flash, 0.8);
          gore.shake = Math.max(gore.shake, 0.55);
        }
        for (let i = rockets.length - 1; i >= 0; i--) if (rockets[i].dead) rockets.splice(i, 1);
        for (const bl of blasts) bl.t += dt;
        for (let i = blasts.length - 1; i >= 0; i--) if (blasts[i].t > 0.4) blasts.splice(i, 1);

        // ── западня: захлопнуть, потом выпускать волну за волной ──
        if (arena && !arenaDone) {
          const inside =
            player.x > arena.x && player.y > arena.y &&
            player.x < arena.x + arena.w && player.y < arena.y + arena.h;
          if (wave < 0 && inside) {
            wave = 0;
            gates(true);
            // из западни за патронами не выйти: кладём россыпь в углу
            // зала, иначе войти с пустым стволом означало бы конец вылазки
            floor.marks.push({
              kind: 'ammo',
              amount: 0,
              x: arena.x + (player.x > arena.x + arena.w / 2 ? 0 : arena.w - 1),
              y: arena.y + (player.y > arena.y + arena.h / 2 ? 0 : arena.h - 1),
              taken: false,
            });
            release(0);
            pickMsg = 'Западня';
            pickT = 1.6;
          } else if (wave >= 0) {
            if (penned.length && penned.every((m) => !m.alive)) {
              penned = [];
              // пауза между волнами: игроку дают собрать капли и вдохнуть
              waveGap = 1.4;
              wave++;
            }
            if (waveGap > 0) {
              waveGap -= dt;
              if (waveGap <= 0) {
                if (wave < arena.waves.length) {
                  release(wave);
                } else {
                  arenaDone = true;
                  gates(false);
                  spawnMotes(motes, player.x, player.y, 8, MOTE_HEAL);
                  const kind = WEAPONS[weapon].ammo;
                  if (kind) ammo[kind] = Math.min(MAX_AMMO[kind], ammo[kind] + Math.round(MAX_AMMO[kind] * 0.3));
                  pickMsg = 'Путь свободен';
                  pickT = 1.8;
                  cbRef.current.onState(state());
                }
              }
            }
          }
        }

        // ярость тает сама: держится только напором
        rage = Math.max(0, rage - dt);
        if (rage <= 0) heat = Math.max(0, heat - HEAT_DECAY * dt);

        // твари
        let taken = 0;
        for (const m of mobs) {
          if (!m.alive && m.t < 1.8 && m.tier !== 'boss') gore.bleed(m.x, m.y, m.scale, dt);
          if (!m.alive && !m.reaped) {
            m.reaped = true;
            // разорвало — ошмётки и широкая лужа, просто свалилась —
            // последний выброс от стрелка и лужа под телом
            const away = Math.atan2(m.y - player.y, m.x - player.x);
            if (m.state === 'gib') gore.gib(m.x, m.y, m.scale);
            else gore.fall(m.x, m.y, m.scale, away);
            // крупная тварь роняет больше: с элиты можно поправиться всерьёз
            const drop = m.tier === 'boss' ? 12 : m.tier === 'elite' ? 6 : 3;
            spawnMotes(motes, m.x, m.y, drop, MOTE_HEAL);
            // в западне выйти за патронами некуда, поэтому запертые твари
            // роняют их сами — иначе волна может застать с пустым стволом
            if (penned.includes(m)) {
              const kind = WEAPONS[weapon].ammo;
              if (kind) ammo[kind] = Math.min(MAX_AMMO[kind], ammo[kind] + Math.max(1, Math.round(MAX_AMMO[kind] * 0.045)));
            }
            heat = Math.min(1, heat + HEAT_PER_KILL);
            if (heat >= 1) {
              heat = 0;
              rage = RAGE_T;
            }
          }
          taken += m.update(dt, floor, player, mobs);
          if (m.fired) {
            const f = m.fired;
            m.fired = null;
            // залп веером, чтобы от нескольких шаров можно было уйти вбок
            for (let i = 0; i < f.n; i++) {
              const off = (i - (f.n - 1) / 2) * 0.16;
              bolts.push(
                new Bolt(f.x + Math.cos(f.a) * 0.4, f.y + Math.sin(f.a) * 0.4, f.a + off, f.speed, f.dmg, m.aura),
              );
            }
          }
        }
        for (let i = bolts.length - 1; i >= 0; i--) {
          taken += bolts[i].update(dt, floor, player.x, player.y);
          if (!bolts[i].alive) bolts.splice(i, 1);
        }
        gore.step(dt, floor, player.x, player.y);
        const drank = stepMotes(motes, dt, player.x, player.y);
        if (drank > 0) {
          player.heal(drank);
          healFlash = Math.min(1, healFlash + 0.5);
          cbRef.current.onState(state());
        }
        if (taken > 0) {
          player.hurt(taken);
          hurtFlash = 1;
          gore.shake = Math.max(gore.shake, 0.3);
          cbRef.current.onState(state());
          if (player.dead) {
            over = true;
            cbRef.current.onDeath();
          }
        }

        // подбор
        for (const mk of floor.marks) {
          if (mk.taken) continue;
          if (Math.hypot(mk.x + 0.5 - player.x, mk.y + 0.5 - player.y) > 0.62) {
            if (mk === held) held = null;
            continue;
          }
          if (mk === held) continue;
          if (mk.kind === 'stairs') {
            if (mobs.some((m) => m.alive && m.tier === 'boss')) {
              pickMsg = 'Хранитель ещё жив';
              pickT = 1.6;
              continue;
            }
            over = true;
            cbRef.current.onDescend(state());
            break;
          }
          mk.taken = mk.kind !== 'weapon';
          if (mk.kind === 'heal') {
            player.heal(mk.amount);
            pickMsg = `+${mk.amount} здоровья`;
          } else if (mk.kind === 'ammo') {
            // ствол один, и россыпь подходит именно к нему. Раньше тип
            // патронов был записан в самой россыпи, и с одним стволом
            // две трети находок оказывались мусором: с ракетницей в
            // руках гильзы уже не пригодятся, а ракет на ярусе мало
            const kind = (WEAPONS[weapon].ammo ?? 'shells') as AmmoId;
            const gain = Math.max(1, Math.round(MAX_AMMO[kind] * (0.18 + Math.random() * 0.12)));
            ammo[kind] = Math.min(MAX_AMMO[kind], ammo[kind] + gain);
            const label = kind === 'shells' ? 'патронов' : kind === 'bullets' ? 'пуль' : 'ракет';
            pickMsg = `+${gain} ${label}`;
          } else if (mk.kind === 'weapon' && mk.give) {
            // размен: новый ствол в руки, старый ложится на его место
            // вместе со своим боезапасом. Значит, за брошенным можно
            // вернуться, и подобранная пустая ракетница уже не приговор
            const g = mk.give as WeaponId;
            const old = weapon;
            const oldKind = WEAPONS[old].ammo;
            const kind = WEAPONS[g].ammo;
            const gain = mk.amount >= 0 ? mk.amount : kind ? START_AMMO[kind] : 0;
            mk.give = old;
            mk.amount = oldKind ? ammo[oldKind] : 0;
            if (oldKind) ammo[oldKind] = 0;
            weapon = g;
            if (kind) ammo[kind] = Math.min(MAX_AMMO[kind], ammo[kind] + gain);
            // метка остаётся лежать, но пока с неё не сойдёшь, размен
            // не повторяется: иначе стволы менялись бы каждый кадр
            held = mk;
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
        rc.render(floor, cam, pal, fl, gore.stains);
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
        for (const m of mobs) boards.push(m.board(player.x, player.y));
        for (const r of rockets) boards.push(r.board());
        for (const bo of bolts) boards.push(bo.board());
        for (const mo of motes) moteBoards(mo, boards);
        for (const bl of blasts) {
          const bb = blastBoard(bl);
          if (bb) boards.push(bb);
        }
        drawBoards(rc, cam, boards);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // тряска: качается только мир, показания стоят на месте
        const sk = gore.shake;
        ctx.save();
        if (sk > 0.01) ctx.translate(Math.sin(clock * 71) * sk * 9, Math.cos(clock * 53) * sk * 7);
        rc.present(ctx, w, h);
        // кровь идёт последней и в полном разрешении экрана: в буфере
        // капля у самого носа вырождалась в алый квадрат
        gore.draw(ctx, w, h, rc, cam, pal);
        ctx.restore();
        drawWeapon(ctx, w, h, weapon, player, fireT, flash);
        overlay(ctx, w, h, hurtFlash, flash, pal.torch, healFlash);
        gore.drawLens(ctx, w, h);
        minimap(ctx, floor, player, mobs, w);
        const kind = WEAPONS[weapon].ammo;
        hud(ctx, w, h, Math.round(player.hp), kind ? ammo[kind] : null, floorName);
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
        controls(ctx, w, h, stick, fireT, player.dashReady, heat, rage);
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

/** оружие в руках: кадр по фазе выстрела, покачивание, отдача, вспышка */
function drawWeapon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  id: WeaponId,
  p: Player,
  fireT: number,
  flash: number,
): void {
  const def = WEAPONS[id];
  const bobX = p.bob * w * 0.022;
  const bobY = Math.abs(p.bob) * h * 0.02;
  const kick = p.kick * h * 0.055;

  const sheet = weaponSheet(id);
  if (sheet) {
    // лента нарисована в координатах экрана 320x200, как в Doom: ставим её
    // от низа кадра и растягиваем целыми пикселями под ширину телефона
    const s = Math.min((w / 320) * 2.3, (h / 200) * 1.6);
    const cell = Math.min(sheet.n - 1, seqFrame(sheet.seq, fireT));
    const dx = w / 2 + (sheet.ox - 160) * s + bobX;
    const dy = h - (200 - sheet.oy) * s + bobY + kick;
    const dw = sheet.cw * s;
    const dh = sheet.ch * s;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet.img, cell * sheet.cw, 0, sheet.cw, sheet.ch, dx, dy, dw, dh);
    if (flash > 0.12 && sheet.flash > 0) {
      const k = sheet.n + Math.min(sheet.flash - 1, Math.floor((1 - flash) * sheet.flash));
      ctx.globalAlpha = Math.min(1, flash * 1.7);
      ctx.drawImage(sheet.img, k * sheet.cw, 0, sheet.cw, sheet.ch, dx, dy, dw, dh);
    }
    ctx.restore();
    return;
  }

  const art = weaponArt(id);
  const frame = art.frames[Math.min(art.frames.length - 1, frameAt(def, fireT))];
  // спрайт крупный и подрезан снизу — так рука ощущается ближе к глазу
  const sw = Math.min(w * 1.06, h * 0.62);
  const sh = (sw * WEAPON_ART.H) / WEAPON_ART.W;
  const x = w / 2 - sw / 2 + bobX;
  const y = h - sh * 0.8 + bobY + kick;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame, x, y, sw, sh);
  if (flash > 0.05 && art.muzzles.length) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, flash * 1.3);
    ctx.drawImage(art.flash, x, y, sw, sh);
  }
  ctx.restore();
}

/** копоть по краям, вспышка выстрела и красная засветка от урона */
function overlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hurt: number,
  flash: number,
  torch: { r: number; g: number; b: number },
  heal: number,
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
  // ихор влился: короткая тёплая вспышка от краёв к середине
  if (heal > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.16, w * 0.5, h * 0.5, Math.max(w, h) * 0.62);
    g.addColorStop(0, 'rgba(255,90,60,0)');
    g.addColorStop(1, `rgba(255,90,60,${heal * 0.22})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/**
 * Всё, что игрок должен знать, нарисовано прямо в кадре и полупрозрачно:
 * крест с числом жизней и счётчик патронов вверху, где их не закрывает
 * ствол в руках, название яруса внизу. Панелей и списков нет — ствол
 * виден и так, а он теперь один.
 */
function hud(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hp: number,
  shots: number | null,
  name: string,
): void {
  ctx.save();
  const pad = Math.round(Math.min(w, h) * 0.05);
  const size = Math.max(15, Math.round(h * 0.026));
  const ink = (a: number): string => `rgba(238,232,222,${a})`;

  /** тень под знаком: иначе он теряется на светлой стене */
  const shadow = (draw: () => void): void => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    draw();
    ctx.restore();
  };

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // ── выход: уголок в самом верху слева ────────────────────
  const qx = Math.round(w * 0.055);
  const qy = Math.round(h * 0.03);
  const q = Math.round(size * 0.42);
  shadow(() => {
    ctx.strokeStyle = ink(0.32);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(qx + q, qy - q);
    ctx.lineTo(qx - q * 0.6, qy);
    ctx.lineTo(qx + q, qy + q);
    ctx.stroke();
  });

  // ── жизни и патроны: верхняя строка, за уголком выхода ───
  const ty = qy + Math.round(size * 0.4);
  const arm = Math.round(size * 0.72);
  const thick = Math.max(3, Math.round(arm * 0.34));
  const hx = qx + Math.round(size * 1.5);
  shadow(() => {
    ctx.fillStyle = `rgba(214,72,72,${hp <= 25 ? 0.9 : 0.6})`;
    ctx.fillRect(Math.round(hx - thick / 2), Math.round(qy - arm / 2), thick, arm);
    ctx.fillRect(Math.round(hx - arm / 2), Math.round(qy - thick / 2), arm, thick);
  });
  ctx.font = `700 ${size}px Manrope, system-ui, sans-serif`;
  shadow(() => {
    ctx.fillStyle = ink(hp <= 25 ? 0.9 : 0.62);
    ctx.fillText(String(hp), hx + arm, ty);
  });

  if (shots !== null) {
    const ax = hx + arm + Math.round(size * 2.7);
    const sh = Math.round(size * 0.86);
    const sw = Math.max(4, Math.round(sh * 0.42));
    shadow(() => {
      ctx.fillStyle = `rgba(226,176,96,${shots > 0 ? 0.55 : 0.9})`;
      ctx.beginPath();
      ctx.roundRect(ax, qy - sh / 2, sw, sh, Math.round(sw * 0.35));
      ctx.fill();
    });
    shadow(() => {
      ctx.fillStyle = ink(shots > 0 ? 0.62 : 0.9);
      ctx.fillText(String(shots), ax + sw + Math.round(size * 0.42), ty);
    });
  }

  // ── ярус: внизу слева, тише остального ───────────────────
  ctx.font = `600 ${Math.round(size * 0.82)}px Manrope, system-ui, sans-serif`;
  shadow(() => {
    ctx.fillStyle = ink(0.38);
    ctx.fillText(name, pad, h - pad - Math.round(Math.min(w, h) * 0.03));
  });
  ctx.restore();
}

/** подсказки под пальцами: стик, огонь, рывок и жар ярости */
function controls(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stick: Stick | null,
  fireT: number,
  dashReady: number,
  heat: number,
  rage: number,
): void {
  ctx.save();
  const fx = w * FIRE_AT[0];
  const fy = h * FIRE_AT[1];
  const r = Math.min(w, h) * 0.085;
  ctx.beginPath();
  ctx.arc(fx, fy, r, 0, Math.PI * 2);
  ctx.fillStyle = rage > 0 ? 'rgba(255,90,60,0.14)' : 'rgba(255,255,255,0.06)';
  ctx.fill();
  ctx.strokeStyle = rage > 0 ? 'rgba(255,140,90,0.5)' : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // жар от убийств копится кольцом вокруг огня, в ярости кольцо полное
  // и горит: другого места под этот показатель не нужно
  const fill = rage > 0 ? 1 : heat;
  if (fill > 0.01) {
    ctx.beginPath();
    ctx.arc(fx, fy, r + 5, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2);
    ctx.strokeStyle = rage > 0 ? `rgba(255,120,70,${0.5 + 0.35 * Math.sin(rage * 9)})` : 'rgba(255,150,90,0.42)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  if (fireT >= 0) {
    ctx.beginPath();
    ctx.arc(fx, fy, r - 4, -Math.PI / 2, -Math.PI / 2 + fireT * Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,210,140,0.7)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,225,180,0.75)';
  ctx.beginPath();
  ctx.arc(fx, fy, r * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // ── рывок: круг поменьше над кнопкой огня ────────────────
  const dx = w * DASH_AT[0];
  const dy = h * DASH_AT[1];
  const dr = Math.min(w, h) * 0.062;
  const ready = dashReady >= 1;
  ctx.beginPath();
  ctx.arc(dx, dy, dr, 0, Math.PI * 2);
  ctx.fillStyle = ready ? 'rgba(150,210,255,0.09)' : 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = ready ? 'rgba(160,215,255,0.4)' : 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (!ready) {
    ctx.beginPath();
    ctx.arc(dx, dy, dr - 3, -Math.PI / 2, -Math.PI / 2 + dashReady * Math.PI * 2);
    ctx.strokeStyle = 'rgba(160,215,255,0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // две стрелки вперёд — знак рывка
  ctx.strokeStyle = ready ? 'rgba(190,230,255,0.75)' : 'rgba(200,220,240,0.3)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (const off of [-dr * 0.3, dr * 0.14]) {
    ctx.beginPath();
    ctx.moveTo(dx + off - dr * 0.16, dy - dr * 0.34);
    ctx.lineTo(dx + off + dr * 0.2, dy);
    ctx.lineTo(dx + off - dr * 0.16, dy + dr * 0.34);
    ctx.stroke();
  }

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
    if (!m.alive) continue;
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

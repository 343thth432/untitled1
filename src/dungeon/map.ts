import { rng, type Rng } from '../game/engine/rng';
import type { PropKind } from './props';

/**
 * Этаж подземелья: сетка клеток. 0 — проход, остальное — стены разного камня.
 * Карта маленькая и читаемая: несколько залов, связанных коридорами.
 */

export const CELL = {
  empty: 0,
  brick: 1,
  rock: 2,
  moss: 3,
  door: 4,
} as const;

export type Cell = (typeof CELL)[keyof typeof CELL];

export type MarkKind = 'heal' | 'ammo' | 'weapon' | 'relic' | 'stairs';

export interface Mark {
  kind: MarkKind;
  x: number;
  y: number;
  /** что именно даёт: id оружия или величина */
  give?: string;
  /** у оружия — боезапас, что лежит вместе с ним; -1 у нетронутого */
  amount: number;
  taken: boolean;
}

/** точка появления противника */
export interface Spawn {
  x: number;
  y: number;
  tier: 'foe' | 'elite' | 'boss';
  id: string;
}

/** предмет обстановки: билборд в мире */
export interface Thing {
  kind: PropKind;
  x: number;
  y: number;
  /** фаза анимации пламени, чтобы огни не мигали в такт */
  ph: number;
}

/** точечный источник света */
export interface Light {
  x: number;
  y: number;
  /** высота над полом в клетках */
  z: number;
  r: number;
  g: number;
  b: number;
  power: number;
  /** мерцает ли (огонь) */
  live: boolean;
}

/**
 * Западня: зал, который захлопывается за спиной. Пока волны не выбиты,
 * проходы закрыты воротами, а на месте убитых встают новые. Даёт бою
 * ритм: до этого ярус проходился в своём темпе, тварь за тварью.
 */
export interface Arena {
  x: number;
  y: number;
  w: number;
  h: number;
  /** клетки проходов, которые закрываются воротами */
  gates: [number, number][];
  /** кого выпускать волна за волной */
  waves: { id: string; tier: 'foe' | 'elite' | 'boss' }[][];
}

export interface Floor {
  w: number;
  h: number;
  cells: Uint8Array;
  /** зал-западня, если он нашёлся на этом ярусе */
  arena: Arena | null;
  marks: Mark[];
  spawns: Spawn[];
  things: Thing[];
  lights: Light[];
  spawn: [number, number];
  /** стартовое направление в четвертях: 0 — восток, 1 — юг, 2 — запад, 3 — север */
  facing: number;
  /** основной камень этажа */
  stone: Cell;
}

export function at(f: Floor, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= f.w || y >= f.h) return CELL.brick;
  return f.cells[y * f.w + x];
}

export function solid(f: Floor, x: number, y: number): boolean {
  return at(f, x, y) !== CELL.empty;
}

/** кратчайший путь по клеткам; пустой массив — пути нет */
export function pathTo(f: Floor, from: [number, number], to: [number, number]): [number, number][] {
  const key = (x: number, y: number): number => y * f.w + x;
  const start = key(from[0], from[1]);
  const goal = key(to[0], to[1]);
  if (start === goal) return [];
  const prev = new Map<number, number>();
  const seen = new Uint8Array(f.w * f.h);
  seen[start] = 1;
  let frontier = [from];
  while (frontier.length) {
    const next: [number, number][] = [];
    for (const [x, y] of frontier) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h) continue;
        const k = key(nx, ny);
        if (seen[k] || solid(f, nx, ny)) continue;
        seen[k] = 1;
        prev.set(k, key(x, y));
        if (k === goal) {
          const out: [number, number][] = [];
          let cur = k;
          while (cur !== start) {
            out.push([cur % f.w, Math.floor(cur / f.w)]);
            cur = prev.get(cur) as number;
          }
          return out.reverse();
        }
        next.push([nx, ny]);
      }
    }
    frontier = next;
  }
  return [];
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

function centre(r: Room): [number, number] {
  return [r.x + (r.w >> 1), r.y + (r.h >> 1)];
}

export interface FloorPlan {
  /** подбираемое добро */
  loot: { kind: MarkKind; give?: string; amount: number }[];
  /** кого выпускать: id противника и его ранг */
  foes: { id: string; tier: 'foe' | 'elite' | 'boss' }[];
  /** волны для зала-западни; пусто — западни на ярусе не будет */
  waves: { id: string; tier: 'foe' | 'elite' | 'boss' }[][];
}

/** прямоугольные залы, соединённые Г-образными коридорами */
export function buildFloor(seed: string, stone: Cell, plan: FloorPlan): Floor {
  const r: Rng = rng(seed);
  const w = 19;
  const h = 19;
  const cells = new Uint8Array(w * h).fill(stone);
  const rooms: Room[] = [];

  const fits = (a: Room): boolean =>
    rooms.every((b) => a.x > b.x + b.w + 1 || b.x > a.x + a.w + 1 || a.y > b.y + b.h + 1 || b.y > a.y + a.h + 1);

  for (let tries = 0; tries < 300 && rooms.length < 9; tries++) {
    const rw = 3 + Math.floor(r() * 3);
    const rh = 3 + Math.floor(r() * 3);
    const room: Room = {
      x: 1 + Math.floor(r() * (w - rw - 2)),
      y: 1 + Math.floor(r() * (h - rh - 2)),
      w: rw,
      h: rh,
    };
    if (!fits(room)) continue;
    rooms.push(room);
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) cells[y * w + x] = CELL.empty;
    }
  }

  const carveH = (x0: number, x1: number, y: number): void => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) cells[y * w + x] = CELL.empty;
  };
  const carveV = (y0: number, y1: number, x: number): void => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) cells[y * w + x] = CELL.empty;
  };

  for (let i = 1; i < rooms.length; i++) {
    const [ax, ay] = centre(rooms[i - 1]);
    const [bx, by] = centre(rooms[i]);
    if (r() < 0.5) {
      carveH(ax, bx, ay);
      carveV(ay, by, bx);
    } else {
      carveV(ay, by, ax);
      carveH(ax, bx, by);
    }
  }

  // редкие вкрапления другого камня — стены не должны быть одинаковыми
  const alt = stone === CELL.brick ? CELL.rock : CELL.brick;
  for (let i = 0; i < w * h; i++) {
    if (cells[i] !== stone) continue;
    if (r() < 0.07) cells[i] = alt;
    else if (r() < 0.03) cells[i] = CELL.moss;
  }

  // рамка по краю — из основного камня, чтобы силуэт был ровным
  for (let x = 0; x < w; x++) {
    cells[x] = stone;
    cells[(h - 1) * w + x] = stone;
  }
  for (let y = 0; y < h; y++) {
    cells[y * w] = stone;
    cells[y * w + w - 1] = stone;
  }

  const spawnRoom = rooms[0];
  const [sx, sy] = centre(spawnRoom);

  // свободные клетки в залах, кроме стартового
  const cellsFree: [number, number][] = [];
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) cellsFree.push([x, y]);
    }
  }
  for (let i = cellsFree.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [cellsFree[i], cellsFree[j]] = [cellsFree[j], cellsFree[i]];
  }
  let ci = 0;
  const nextCell = (): [number, number] => cellsFree[ci++ % Math.max(1, cellsFree.length)] ?? [sx, sy];

  const placed: Mark[] = plan.loot.map((l) => {
    const [x, y] = nextCell();
    return { kind: l.kind, give: l.give, amount: l.amount, x, y, taken: false };
  });
  // спуск ставим в самом дальнем зале
  const far = rooms.slice(1).sort((a, b) => {
    const [ax, ay] = centre(a);
    const [bx, by] = centre(b);
    return (bx - sx) ** 2 + (by - sy) ** 2 - ((ax - sx) ** 2 + (ay - sy) ** 2);
  })[0];
  const [fx2, fy2] = far ? centre(far) : [sx, sy];
  placed.push({ kind: 'stairs', amount: 0, x: fx2, y: fy2, taken: false });

  /** видно ли клетку со входа: между ней и точкой спуска нет стен */
  const seesEntry = (x: number, y: number): boolean => {
    const dx = sx - x;
    const dy = sy - y;
    const n = Math.ceil(Math.hypot(dx, dy) * 3);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const cx = Math.floor(x + 0.5 + dx * t);
      const cy = Math.floor(y + 0.5 + dy * t);
      if (cells[cy * w + cx] !== CELL.empty) return false;
    }
    return true;
  };

  const spawns: Spawn[] = plan.foes.map((f) => {
    // тварь, которой видно вход, открывает огонь раньше, чем игрок
    // успеет что-то сделать: залпа хозяйки хватает, чтобы убить на
    // пороге. Поэтому такие клетки пропускаем, пока есть из чего выбрать
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 24; tries++) {
      [x, y] = nextCell();
      if (!seesEntry(x, y)) break;
    }
    return { x: x + 0.5, y: y + 0.5, tier: f.tier, id: f.id };
  });

  const { things, lights } = dressFloor(r, w, h, cells, rooms);

  // ── западня ──────────────────────────────────────────────
  // Берём просторный зал, но не тот, где вход, и не тот, где лестница:
  // захлопывать выход из вылазки или запирать спуск нечестно
  let arena: Arena | null = null;
  if (plan.waves.length) {
    const gatesOf = (room: Room): [number, number][] => {
      const out: [number, number][] = [];
      for (let x = room.x - 1; x <= room.x + room.w; x++) {
        for (const y of [room.y - 1, room.y + room.h]) {
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          if (cells[y * w + x] === CELL.empty) out.push([x, y]);
        }
      }
      for (let y = room.y; y < room.y + room.h; y++) {
        for (const x of [room.x - 1, room.x + room.w]) {
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          if (cells[y * w + x] === CELL.empty) out.push([x, y]);
        }
      }
      return out;
    };
    const inRoom = (room: Room, x: number, y: number): boolean =>
      x >= room.x && y >= room.y && x < room.x + room.w && y < room.y + room.h;
    const picks = rooms
      .slice(1)
      .filter((room) => !inRoom(room, sx, sy) && !inRoom(room, fx2, fy2))
      .map((room) => ({ room, gates: gatesOf(room) }))
      .filter((c) => c.gates.length > 0 && c.room.w * c.room.h >= 9)
      .sort((a, b) => b.room.w * b.room.h - a.room.w * a.room.h);
    if (picks.length) {
      const { room, gates } = picks[0];
      arena = { x: room.x, y: room.y, w: room.w, h: room.h, gates, waves: plan.waves };
    }
  }

  return {
    w,
    h,
    cells,
    arena,
    marks: placed,
    spawns,
    things,
    lights,
    spawn: [sx + 0.5, sy + 0.5],
    facing: 0,
    stone,
  };
}

/**
 * Обстановка: факелы по стенам вдоль проходов, жаровни и кристаллы в залах,
 * бочки, кости и саркофаги вдоль стен. Огни — настоящие источники света,
 * а не просто картинки.
 */
function dressFloor(
  r: Rng,
  w: number,
  h: number,
  cells: Uint8Array,
  rooms: Room[],
): { things: Thing[]; lights: Light[] } {
  const things: Thing[] = [];
  const lights: Light[] = [];
  const free = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < w && y < h && cells[y * w + x] === CELL.empty;
  const busy = new Set<string>();
  const take = (x: number, y: number): boolean => {
    const k = `${Math.floor(x)},${Math.floor(y)}`;
    if (busy.has(k)) return false;
    busy.add(k);
    return true;
  };

  // факелы на стенах: только там, где стена смотрит ровно в один проход
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (cells[y * w + x] === CELL.empty) continue;
      const open: [number, number][] = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (free(x + dx, y + dy)) open.push([dx, dy]);
      }
      if (open.length !== 1 || r() > 0.11) continue;
      const [dx, dy] = open[0];
      const tx = x + 0.5 + dx * 0.44;
      const ty = y + 0.5 + dy * 0.44;
      things.push({ kind: 'torch', x: tx, y: ty, ph: r() * 6.28 });
      lights.push({ x: tx, y: ty, z: 1.5, r: 255, g: 170, b: 92, power: 1.2, live: true });
    }
  }

  // крупная обстановка по залам
  const FILL: PropKind[] = ['brazier', 'barrel', 'bones', 'sarcophagus', 'rubble', 'skull', 'crystal', 'cage', 'banner'];
  for (const room of rooms) {
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const kind = FILL[Math.floor(r() * FILL.length)];
      const x = room.x + Math.floor(r() * room.w);
      const y = room.y + Math.floor(r() * room.h);
      if (!free(x, y) || !take(x, y)) continue;
      const px = x + 0.5 + (r() - 0.5) * 0.4;
      const py = y + 0.5 + (r() - 0.5) * 0.4;
      things.push({ kind, x: px, y: py, ph: r() * 6.28 });
      if (kind === 'brazier') {
        lights.push({ x: px, y: py, z: 1.2, r: 255, g: 176, b: 96, power: 1.55, live: true });
      } else if (kind === 'crystal') {
        lights.push({ x: px, y: py, z: 0.7, r: 120, g: 190, b: 255, power: 1.15, live: false });
      }
    }
  }
  return { things, lights };
}

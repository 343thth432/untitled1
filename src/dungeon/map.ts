import { rng, type Rng } from '../game/engine/rng';

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

export type MarkKind = 'foe' | 'elite' | 'boss' | 'rest' | 'find' | 'trade' | 'omen' | 'stairs';

export interface Mark {
  kind: MarkKind;
  x: number;
  y: number;
  /** сколько фигур стоит у метки */
  count: number;
  taken: boolean;
}

export interface Floor {
  w: number;
  h: number;
  cells: Uint8Array;
  marks: Mark[];
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

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

function centre(r: Room): [number, number] {
  return [r.x + (r.w >> 1), r.y + (r.h >> 1)];
}

/** прямоугольные залы, соединённые Г-образными коридорами */
export function buildFloor(seed: string, stone: Cell, marks: MarkKind[]): Floor {
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

  const spots: [number, number][] = [];
  for (let i = 1; i < rooms.length; i++) {
    const [cx, cy] = centre(rooms[i]);
    spots.push([cx, cy]);
  }
  const placed: Mark[] = marks.slice(0, spots.length).map((kind, i) => ({
    kind,
    x: spots[i][0],
    y: spots[i][1],
    count: kind === 'foe' ? 1 + (r() < 0.35 ? 1 : 0) : kind === 'elite' ? 2 : 1,
    taken: false,
  }));

  return { w, h, cells, marks: placed, spawn: [sx + 0.5, sy + 0.5], facing: 0, stone };
}

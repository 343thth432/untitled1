import { solid, type Floor } from './map';
import type { Cam } from './render';

const STEP_T = 0.28;
const TURN_T = 0.22;

const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Пошаговое перемещение по сетке: шаг и поворот проигрываются плавно,
 * но состояние всегда остаётся на клетке — так игрок не теряется,
 * а бой всегда начинается из понятной позиции.
 */
export class Walker {
  /** клетка и четверть направления */
  cx: number;
  cy: number;
  face: number;
  private fromX: number;
  private fromY: number;
  private fromA: number;
  private toA: number;
  private t = 1;
  private dur = STEP_T;
  /** покачивание при шаге */
  bob = 0;
  /** упор в стену — лёгкий толчок назад */
  private bump = 0;

  constructor(f: Floor) {
    this.cx = Math.floor(f.spawn[0]);
    this.cy = Math.floor(f.spawn[1]);
    this.face = f.facing;
    this.fromX = this.cx;
    this.fromY = this.cy;
    this.fromA = (this.face * Math.PI) / 2;
    this.toA = this.fromA;
  }

  get busy(): boolean {
    return this.t < 1;
  }

  get cam(): Cam {
    const k = ease(Math.min(1, this.t));
    const x = this.fromX + (this.cx - this.fromX) * k + 0.5;
    const y = this.fromY + (this.cy - this.fromY) * k + 0.5;
    const a = this.fromA + (this.toA - this.fromA) * k;
    const push = Math.sin(Math.min(1, this.t) * Math.PI) * this.bump;
    return { x: x + Math.cos(a) * push, y: y + Math.sin(a) * push, a };
  }

  private dir(): [number, number] {
    return [[1, 0], [0, 1], [-1, 0], [0, -1]][((this.face % 4) + 4) % 4] as [number, number];
  }

  turn(d: 1 | -1): void {
    if (this.busy) return;
    this.fromX = this.cx;
    this.fromY = this.cy;
    this.fromA = this.toA;
    this.face = ((this.face + d) % 4 + 4) % 4;
    // идём кратчайшей дугой, а не через полный круг
    let target = (this.face * Math.PI) / 2;
    while (target - this.fromA > Math.PI) target -= Math.PI * 2;
    while (this.fromA - target > Math.PI) target += Math.PI * 2;
    this.toA = target;
    this.bump = 0;
    this.dur = TURN_T;
    this.t = 0;
  }

  /** шаг вперёд (1) или назад (−1); false — упёрлись в стену */
  step(f: Floor, d: 1 | -1): boolean {
    if (this.busy) return false;
    const [dx, dy] = this.dir();
    const nx = this.cx + dx * d;
    const ny = this.cy + dy * d;
    this.fromX = this.cx;
    this.fromY = this.cy;
    this.fromA = this.toA;
    this.dur = STEP_T;
    this.t = 0;
    if (solid(f, nx, ny)) {
      this.bump = 0.12 * d;
      return false;
    }
    this.bump = 0;
    this.cx = nx;
    this.cy = ny;
    return true;
  }

  update(dt: number): void {
    if (this.t >= 1) return;
    this.t = Math.min(1, this.t + dt / this.dur);
    this.bob = Math.sin(Math.min(1, this.t) * Math.PI * 2) * (this.bump ? 0.2 : 1);
  }
}

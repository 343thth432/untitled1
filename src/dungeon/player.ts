import { solid, type Floor } from './map';

const RADIUS = 0.28;
const SPEED = 3.4;
const STRAFE = 2.9;
const TURN = 2.6;
/** рывок: во сколько раз быстрее, как долго и через сколько снова */
const DASH_K = 3.4;
const DASH_T = 0.17;
const DASH_CD = 1.15;

/**
 * Свободное перемещение по залам с проверкой стен по кругу.
 * Скольжение вдоль стены считается по осям раздельно — так игрок
 * не залипает в углах, как это бывает при отмене всего шага целиком.
 */
export class Player {
  x: number;
  y: number;
  a: number;
  hp = 100;
  maxHp = 100;
  /** покачивание при ходьбе — доля −1..1 */
  bob = 0;
  private bobT = 0;
  /** отдача камеры после выстрела */
  kick = 0;
  /** сколько ещё длится рывок */
  dash = 0;
  /** откат до следующего рывка */
  dashCd = 0;

  constructor(f: Floor) {
    this.x = f.spawn[0];
    this.y = f.spawn[1];
    this.a = (f.facing * Math.PI) / 2;
  }

  private free(f: Floor, x: number, y: number): boolean {
    const r = RADIUS;
    for (const [dx, dy] of [
      [0, 0],
      [r, 0],
      [-r, 0],
      [0, r],
      [0, -r],
      [r * 0.7, r * 0.7],
      [-r * 0.7, r * 0.7],
      [r * 0.7, -r * 0.7],
      [-r * 0.7, -r * 0.7],
    ] as const) {
      if (solid(f, Math.floor(x + dx), Math.floor(y + dy))) return false;
    }
    return true;
  }

  /**
   * @param fwd −1..1 вперёд-назад
   * @param side −1..1 боком
   * @param turn −1..1 поворот
   */
  /**
   * Рывок. Уходит туда, куда игрок уже держит; если не держит никуда —
   * вперёд. Неуязвимости не даёт: это способ разорвать дистанцию и уйти
   * с линии залпа, а не отменить попадание.
   *
   * @returns удалось ли: на откате рывка не будет
   */
  lunge(): boolean {
    if (this.dash > 0 || this.dashCd > 0) return false;
    this.dash = DASH_T;
    this.dashCd = DASH_CD;
    return true;
  }

  /** доля отката рывка: 1 — готов, 0 — только что потрачен */
  get dashReady(): number {
    return this.dashCd <= 0 ? 1 : 1 - this.dashCd / DASH_CD;
  }

  move(f: Floor, dt: number, fwd: number, side: number, turn: number): void {
    this.dash = Math.max(0, this.dash - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.a += turn * TURN * dt;
    const c = Math.cos(this.a);
    const s = Math.sin(this.a);
    // в рывке разгон общий, а направление — то, что уже задано; стоящий
    // на месте рвётся вперёд
    const k = this.dash > 0 ? DASH_K : 1;
    if (this.dash > 0 && !fwd && !side) fwd = 1;
    const vx = (c * fwd * SPEED - s * side * STRAFE) * k * dt;
    const vy = (s * fwd * SPEED + c * side * STRAFE) * k * dt;
    if (vx && this.free(f, this.x + vx, this.y)) this.x += vx;
    if (vy && this.free(f, this.x, this.y + vy)) this.y += vy;

    const speed = Math.hypot(vx, vy) / Math.max(1e-4, dt);
    this.bobT += dt * (2.2 + speed * 1.9);
    const want = Math.min(1, speed / SPEED);
    this.bob += (Math.sin(this.bobT * 3.1) * want - this.bob) * Math.min(1, dt * 12);
    this.kick = Math.max(0, this.kick - dt * 5.5);
  }

  hurt(v: number): void {
    this.hp = Math.max(0, this.hp - v);
  }

  heal(v: number): void {
    this.hp = Math.min(this.maxHp, this.hp + v);
  }

  get dead(): boolean {
    return this.hp <= 0;
  }
}

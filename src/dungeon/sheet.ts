import type { WeaponId } from './weapon';

/**
 * Готовые пиксельные ленты кадров из public/art/weapons.
 *
 * Файлы собирает tools/fetch-weapons.mjs из спрайтов Freedoom (BSD 3-clause).
 * Манифест хранит размер клетки и её угол в координатах экрана 320x200 —
 * того самого, в котором Doom рисует оружие. Игра ставит клетку от низа
 * экрана, поэтому кадры не «плавают» между собой.
 *
 * Своя графика подставляется без правки кода: положить <id>.png рядом и
 * дописать запись в weapons.json. Пока лента не загрузилась (или её нет),
 * рисуется процедурный спрайт из weapon.ts.
 */

export interface Sheet {
  img: HTMLImageElement;
  /** размер клетки в пикселях исходника */
  cw: number;
  ch: number;
  /** угол клетки на виртуальном экране 320x200 */
  ox: number;
  oy: number;
  /** сколько клеток занимает сам ствол */
  n: number;
  /** сколько клеток после них — вспышка */
  flash: number;
  /** ключевые кадры выстрела: [доля цикла, индекс клетки] */
  seq: [number, number][];
}

type Entry = Omit<Sheet, 'img'> & { seq: [number, number][] };

const ready = new Map<string, Sheet>();
let started = false;

/** запускает фоновую загрузку лент; повторные вызовы безвредны */
export function loadSheets(): void {
  if (started) return;
  started = true;
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const root = `${base}art/weapons/`;
  fetch(`${root}weapons.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((man: Record<string, Entry>) => {
      for (const [id, e] of Object.entries(man)) {
        const img = new Image();
        img.onload = () => ready.set(id, { ...e, img });
        img.src = `${root}${id}.png`;
      }
    })
    .catch(() => {
      /* лент нет — остаёмся на процедурных спрайтах */
    });
}

export function weaponSheet(id: WeaponId): Sheet | null {
  return ready.get(id) ?? null;
}

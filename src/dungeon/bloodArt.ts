/**
 * Нарисованные листы крови из public/art/blood.
 *
 * Движок берёт на себя физику — куда полетело, во что ударилось, что
 * осталось на камне, — а формы приходят нарисованными. Пока листов нет
 * (или они не загрузились), слой крови рисует свои запасные кадры, и
 * игра выглядит хуже, но работает.
 *
 * Задание на генерацию и сетку листов см. tools/prompts/blood.md,
 * подготовка листа — tools/split-blood.mjs.
 */

export type BloodKind = 'burst-body' | 'burst-head' | 'burst-gib' | 'drop' | 'pool' | 'wall' | 'lens';

interface Entry {
  cols: number;
  rows: number;
  cw: number;
  ch: number;
  n: number;
  mask: boolean;
}

/** маска густоты: квадрат стороной s, значение — сколько крови легло */
export interface Mask {
  s: number;
  a: Uint8Array;
}

/** во сколько точек разбирается маска: мельче сетки пятен и хватит */
const MS = 56;

const frames = new Map<string, HTMLCanvasElement[]>();
const masks = new Map<string, Mask[]>();
const tinted = new Map<string, HTMLCanvasElement>();
let started = false;

function cut(img: HTMLImageElement, e: Entry): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < e.n; i++) {
    const cv = document.createElement('canvas');
    cv.width = e.cw;
    cv.height = e.ch;
    const c = cv.getContext('2d')!;
    c.drawImage(img, (i % e.cols) * e.cw, ((i / e.cols) | 0) * e.ch, e.cw, e.ch, 0, 0, e.cw, e.ch);
    out.push(cv);
  }
  return out;
}

/**
 * Разбирает клетки листа в маски густоты. Лужи заводятся в четырёх
 * поворотах, потёки — только зеркалятся: тяжесть на стене всегда вниз.
 */
function grind(img: HTMLImageElement, e: Entry, turns: number[]): Mask[] {
  const out: Mask[] = [];
  const cv = document.createElement('canvas');
  cv.width = MS;
  cv.height = MS;
  const c = cv.getContext('2d')!;
  for (let i = 0; i < e.n; i++) {
    for (const t of turns) {
      c.clearRect(0, 0, MS, MS);
      c.save();
      c.translate(MS / 2, MS / 2);
      if (t < 0) c.scale(-1, 1);
      else c.rotate((t * Math.PI) / 2);
      c.drawImage(img, (i % e.cols) * e.cw, ((i / e.cols) | 0) * e.ch, e.cw, e.ch, -MS / 2, -MS / 2, MS, MS);
      c.restore();
      const d = c.getImageData(0, 0, MS, MS).data;
      const a = new Uint8Array(MS * MS);
      for (let p = 0; p < a.length; p++) a[p] = d[p * 4 + 3];
      out.push({ s: MS, a });
    }
  }
  return out;
}

/** запускает фоновую загрузку листов; повторные вызовы безвредны */
export function loadBlood(): void {
  if (started) return;
  started = true;
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const root = `${base}art/blood/`;
  fetch(`${root}blood.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((man: Record<string, Entry>) => {
      for (const [kind, e] of Object.entries(man)) {
        const img = new Image();
        img.onload = () => {
          if (e.mask) masks.set(kind, grind(img, e, kind === 'wall' ? [0, -1] : [0, 1, 2, 3]));
          else frames.set(kind, cut(img, e));
        };
        img.src = `${root}${kind}.png`;
      }
    })
    .catch(() => {
      /* листов нет — слой крови остаётся на своих кадрах */
    });
}

export function bloodFrames(kind: BloodKind): HTMLCanvasElement[] | null {
  return frames.get(kind) ?? null;
}

export function bloodMasks(kind: 'pool' | 'wall'): Mask[] | null {
  return masks.get(kind) ?? null;
}

/**
 * Кадр капли, притушенный под мглу. Нарисованную каплю нельзя
 * перекрасить на лету, поэтому каждая ступень дальности готовится один
 * раз и лежит готовой.
 */
export function bloodDrop(cell: number, band: number, bands: number, fog: [number, number, number]): HTMLCanvasElement | null {
  const all = frames.get('drop');
  if (!all || !all.length) return null;
  const i = cell % all.length;
  const key = `${i}|${band}|${fog[0]},${fog[1]},${fog[2]}`;
  const had = tinted.get(key);
  if (had) return had;
  const src = all[i];
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const c = cv.getContext('2d')!;
  c.drawImage(src, 0, 0);
  const f = band / Math.max(1, bands - 1);
  if (f > 0.01) {
    c.globalCompositeOperation = 'source-atop';
    c.globalAlpha = f;
    c.fillStyle = `rgb(${fog[0]},${fog[1]},${fog[2]})`;
    c.fillRect(0, 0, cv.width, cv.height);
  }
  tinted.set(key, cv);
  return cv;
}

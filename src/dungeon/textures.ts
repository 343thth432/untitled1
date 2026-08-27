/**
 * Загрузка материалов подземелья. Каждый материал — цвет и карта нормалей;
 * рейкастер по ним считает свет факела, поэтому кирпич даёт настоящий рельеф,
 * а не плоскую заливку.
 */

export interface Tex {
  size: number;
  /** RGB, по 3 байта на тексель */
  col: Uint8Array;
  /** нормаль в касательном пространстве, −127..127 */
  nrm: Int8Array;
}

export type TexName =
  | 'wallBrick'
  | 'wallRock'
  | 'wallMoss'
  | 'floorCobble'
  | 'ceilRock'
  | 'doorWood';

const cache = new Map<TexName, Tex>();
const pending = new Map<TexName, Promise<Tex>>();

function readImage(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('нет 2d-контекста'));
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, c.width, c.height));
    };
    img.onerror = () => reject(new Error(`не загрузилось: ${src}`));
    img.src = src;
  });
}

const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

async function build(name: TexName): Promise<Tex> {
  const [c, n] = await Promise.all([
    readImage(`${base}tex/${name}_c.webp`),
    readImage(`${base}tex/${name}_n.webp`),
  ]);
  const size = c.width;
  const col = new Uint8Array(size * size * 3);
  const nrm = new Int8Array(size * size * 3);
  for (let i = 0, p = 0, q = 0; i < size * size; i++, p += 4, q += 3) {
    col[q] = c.data[p];
    col[q + 1] = c.data[p + 1];
    col[q + 2] = c.data[p + 2];
    // карта нормалей: 0..255 → −1..1, z всегда наружу
    nrm[q] = Math.max(-127, Math.min(127, (n.data[p] - 128) | 0));
    nrm[q + 1] = Math.max(-127, Math.min(127, (n.data[p + 1] - 128) | 0));
    nrm[q + 2] = Math.max(0, Math.min(127, (n.data[p + 2] - 128) | 0));
  }
  const tex: Tex = { size, col, nrm };
  cache.set(name, tex);
  return tex;
}

export function texOf(name: TexName): Tex | null {
  return cache.get(name) ?? null;
}

export function loadTex(name: TexName): Promise<Tex> {
  const hit = cache.get(name);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(name);
  if (!p) {
    p = build(name);
    pending.set(name, p);
  }
  return p;
}

export function loadAll(names: TexName[]): Promise<Tex[]> {
  return Promise.all(names.map(loadTex));
}

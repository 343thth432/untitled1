#!/usr/bin/env node
/**
 * Готовит лист крови к игре.
 *
 * Лист приходит сеткой одинаковых клеток (см. tools/prompts/blood.md).
 * Скрипт срезает фон, если он пришёл плашкой вместо прозрачности,
 * приводит лист к ровной сетке и дописывает запись в манифест
 * public/art/blood/blood.json. Резать на отдельные файлы незачем: движок
 * берёт клетки из листа сам.
 *
 *   node tools/split-blood.mjs лист.png --kind burst-body
 *   node tools/split-blood.mjs лужи.png --kind pool --cols 3 --rows 2
 *
 * Ключ --mask (сам включается для pool и wall) выбрасывает цвет и
 * оставляет одну прозрачность: густоту крови. Цвет им даёт движок,
 * потому что лужа освещается тем же факелом, что и плита под ней.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/** что за лист: сетка по умолчанию и нужна ли из него маска */
const KINDS = {
  'burst-body': { cols: 4, rows: 2, mask: false },
  'burst-head': { cols: 4, rows: 2, mask: false },
  'burst-gib': { cols: 4, rows: 2, mask: false },
  drop: { cols: 4, rows: 2, mask: false },
  pool: { cols: 3, rows: 2, mask: true },
  wall: { cols: 3, rows: 2, mask: true },
  lens: { cols: 3, rows: 2, mask: false },
};

const args = process.argv.slice(2);
const src = args[0];
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i > 0 ? args[i + 1] : d;
};
const kind = flag('kind', '');
if (!src || !KINDS[kind]) {
  console.error(`нужен лист и вид: node tools/split-blood.mjs лист.png --kind ${Object.keys(KINDS).join('|')}`);
  process.exit(1);
}
const def = KINDS[kind];
const cols = Number(flag('cols', def.cols));
const rows = Number(flag('rows', def.rows));
const mask = args.includes('--mask') || def.mask;
const out = flag('out', 'public/art/blood');

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const px = Buffer.from(data);

/**
 * Срезает фон заливкой от края. По цвету срезать нельзя: тёмное нутро
 * брызги слишком близко к чёрному фону, и её бы выело изнутри.
 */
function key() {
  const seen = new Uint8Array(w * h);
  const stack = [];
  const near = (i, r, g, b) => {
    const dr = px[i] - r;
    const dg = px[i + 1] - g;
    const db = px[i + 2] - b;
    return dr * dr + dg * dg + db * db < 42 * 42;
  };
  // фон берём по углу листа: там его больше всего
  const r0 = px[0];
  const g0 = px[1];
  const b0 = px[2];
  if (px[3] < 8) return 0;
  for (let x = 0; x < w; x++) {
    stack.push(x, x + (h - 1) * w);
  }
  for (let y = 0; y < h; y++) {
    stack.push(y * w, y * w + w - 1);
  }
  let n = 0;
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    const i = p * 4;
    if (!near(i, r0, g0, b0)) continue;
    seen[p] = 1;
    px[i + 3] = 0;
    n++;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  return n;
}

const cut = key();

if (mask) {
  // маска: цвет выбрасывается, густота остаётся в прозрачности. Если лист
  // пришёл белым по прозрачному, прозрачность уже верна; если чёрным по
  // белому — берём яркость
  let lum = 0;
  let alpha = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] > 8) alpha++;
    lum += (px[i] + px[i + 1] + px[i + 2]) / 3;
  }
  const byLum = alpha > w * h * 0.94;
  for (let i = 0; i < px.length; i += 4) {
    const v = byLum ? 255 - (px[i] + px[i + 1] + px[i + 2]) / 3 : px[i + 3];
    px[i] = 255;
    px[i + 1] = 255;
    px[i + 2] = 255;
    px[i + 3] = Math.max(0, Math.min(255, Math.round(v)));
  }
}

// лист режется ровной сеткой, поэтому его сторона должна делиться нацело
const cw = Math.floor(w / cols);
const ch = Math.floor(h / rows);
const dst = path.join(out, `${kind}.png`);
await fs.mkdir(out, { recursive: true });
await sharp(px, { raw: { width: w, height: h, channels: 4 } })
  .extract({ left: 0, top: 0, width: cw * cols, height: ch * rows })
  .png()
  .toFile(dst);

const manPath = path.join(out, 'blood.json');
let man = {};
try {
  man = JSON.parse(await fs.readFile(manPath, 'utf8'));
} catch {
  /* манифеста ещё нет */
}
man[kind] = { cols, rows, cw, ch, n: cols * rows, mask };
await fs.writeFile(manPath, `${JSON.stringify(man, null, 2)}\n`);

console.log(
  `${kind}: ${w}x${h} → ${cw * cols}x${ch * rows}, клетка ${cw}x${ch}, кадров ${cols * rows}` +
    (cut ? `, фон срезан (${cut} точек)` : '') +
    (mask ? ', маска' : ''),
);

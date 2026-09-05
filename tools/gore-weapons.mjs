#!/usr/bin/env node
/**
 * Обвешивает ленты кадров оружия кровью, костями и черепами.
 *
 * Исходные кадры — из Freedoom (BSD 3-clause), они лежат нетронутыми в
 * tools/weapons-raw и в игру не попадают. Скрипт кладёт поверх них свой
 * слой и пишет результат в public/art/weapons. Запускать можно сколько
 * угодно раз: рисуется всегда от чистого исходника, а не поверх
 * прошлого прохода.
 *
 * Всё, что рисуется, прижато к альфе исходника: ни один пиксель не
 * выходит за силуэт ствола. Иначе украшение отвалилось бы от оружия на
 * тех кадрах, где оно откинуто или отъехало.
 *
 * Кадры вспышки не трогаем — кровь на дульном пламени выглядит грязью.
 *
 *   node tools/gore-weapons.mjs          # обвешать
 *   node tools/gore-weapons.mjs --reset  # вернуть чистые кадры
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = 'public/art/weapons';
const RAW = 'tools/weapons-raw';

/** одинаковый узор от запуска к запуску */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── трафареты ────────────────────────────────────────────────
// B светлая кость, b тень кости, d глазница, m мясо, . пусто

const SKULL = [
  '...BBBBBBB...',
  '..BBBBBBBBB..',
  '.BBBBBBBBBBB.',
  'BBBBBBBBBBBBB',
  'BBdddBBBdddBB',
  'BBdddBBBdddBB',
  'BBdddBBBdddBB',
  'BBBBBBdBBBBBB',
  '.BBBBBdBBBBB.',
  '.BBBBBBBBBBB.',
  '..BBBBBBBBB..',
  '..BdBdBdBdB..',
  '..BBBBBBBBB..',
  '...bbbbbbb...',
  '....bbbbb....',
];

const BONE = [
  'BB.BB',
  'BBBBB',
  '.BBB.',
  '..B..',
  '..B..',
  '..B..',
  '..B..',
  '..B..',
  '.BBB.',
  'BBBBB',
  'BB.BB',
];

const CHUNK = [
  '..rrr..',
  '.rmmmr.',
  'rmmmmmr',
  '.rmmmr.',
  '..rr...',
];

const INK = {
  B: [222, 210, 180],
  b: [150, 138, 112],
  d: [42, 34, 30],
  m: [154, 50, 44],
  r: [56, 14, 14],
};

/**
 * Где что висит на каждом стволе. Отсчёт от середины низа силуэта кадра:
 * низ у всех кадров на месте, а вершина уезжает, когда ствол переломлен
 * или откинут. Поэтому якорь снизу, а не по рамке.
 */
const RIG = {
  ssg: {
    seed: 7412,
    blood: 0.42,
    skull: [-4, -21],
    bones: [[-22, -28], [20, -30]],
    chunks: [[-17, -5], [14, -7], [-6, -38]],
  },
  chaingun: {
    seed: 22801,
    blood: 0.38,
    skull: [0, -20],
    bones: [[-23, -11], [23, -11]],
    chunks: [[-13, -4], [13, -5], [0, -37]],
  },
  launcher: {
    seed: 5533,
    blood: 0.4,
    skull: [-3, -21],
    bones: [[-25, -12], [25, -14]],
    chunks: [[-13, -4], [14, -6], [-1, -40]],
  },
};

/** мягкий шум по решётке: пятна крови, а не сыпь по пикселю */
function blotch(seed, w, h, cell) {
  const r = rng(seed);
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const fx = x / cell + 1;
    const fy = y / cell + 1;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const s = (a) => a * a * (3 - 2 * a);
    const u = s(tx);
    const v = s(ty);
    const at = (i, j) => g[Math.min(gh - 1, j) * gw + Math.min(gw - 1, i)];
    const a = at(x0, y0) * (1 - u) + at(x0 + 1, y0) * u;
    const b = at(x0, y0 + 1) * (1 - u) + at(x0 + 1, y0 + 1) * u;
    return a * (1 - v) + b * v;
  };
}

async function gore(id, entry) {
  const src = path.join(RAW, `${id}.png`);
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = Buffer.from(data);
  const cw = entry.cw;
  const rig = RIG[id];
  const r = rng(rig.seed);
  const noise = blotch(rig.seed, W, H, 9);
  const fine = blotch(rig.seed ^ 0x5f5f, W, H, 3);

  const at = (x, y) => (y * W + x) * 4;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && px[at(x, y) + 3] > 128;

  let stamped = 0;

  // кадры ствола идут первыми, за ними кадры вспышки — их не трогаем
  for (let c = 0; c < entry.n; c++) {
    const x0 = c * cw;
    const x1 = Math.min(W, x0 + cw);

    // силуэт кадра: по нему и якорь, и обрезка
    let bx0 = x1;
    let bx1 = x0;
    let by1 = 0;
    let sum = 0;
    let cx = 0;
    for (let y = 0; y < H; y++) {
      for (let x = x0; x < x1; x++) {
        if (!solid(x, y)) continue;
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y > by1) by1 = y;
        cx += x;
        sum++;
      }
    }
    if (!sum) continue;
    // якорь: середина массы по горизонтали, низ силуэта по вертикали
    const ax = Math.round(cx / sum);
    const ay = by1;

    // ── кровь ────────────────────────────────────────────────
    for (let y = 0; y < H; y++) {
      for (let x = x0; x < x1; x++) {
        const i = at(x, y);
        if (px[i + 3] <= 128) continue;
        const n = noise(x - x0, y) * 0.75 + fine(x - x0, y) * 0.25;
        if (n < 1 - rig.blood) continue;
        // густота растёт к середине пятна, поэтому край не режется линией
        const k = Math.min(1, (n - (1 - rig.blood)) / (rig.blood * 0.7)) * 0.86;
        // кровь темнит металл, а не закрашивает: рельеф под ней виден
        const lum = (px[i] * 0.4 + px[i + 1] * 0.4 + px[i + 2] * 0.2) / 255;
        const rr = 58 + lum * 116;
        const gg = 10 + lum * 26;
        const bb = 12 + lum * 22;
        px[i] = Math.round(px[i] * (1 - k) + rr * k);
        px[i + 1] = Math.round(px[i + 1] * (1 - k) + gg * k);
        px[i + 2] = Math.round(px[i + 2] * (1 - k) + bb * k);
      }
    }

    // ── подтёки вниз ─────────────────────────────────────────
    const drips = 5 + Math.floor(r() * 4);
    for (let d = 0; d < drips; d++) {
      const dx = bx0 + Math.floor(r() * Math.max(1, bx1 - bx0));
      let dy = Math.floor(r() * H);
      while (dy > 0 && !solid(dx, dy)) dy--;
      const len = 5 + Math.floor(r() * 14);
      for (let k = 0; k < len; k++) {
        const y = dy + k;
        if (!solid(dx, y)) break;
        const i = at(dx, y);
        const f = 0.8 * (1 - k / len);
        px[i] = Math.round(px[i] * (1 - f) + 118 * f);
        px[i + 1] = Math.round(px[i + 1] * (1 - f) + 20 * f);
        px[i + 2] = Math.round(px[i + 2] * (1 - f) + 20 * f);
        if (r() < 0.35 && solid(dx + 1, y)) {
          const j = at(dx + 1, y);
          px[j] = Math.round(px[j] * (1 - f * 0.5) + 118 * f * 0.5);
          px[j + 1] = Math.round(px[j + 1] * (1 - f * 0.5) + 20 * f * 0.5);
          px[j + 2] = Math.round(px[j + 2] * (1 - f * 0.5) + 20 * f * 0.5);
        }
      }
    }

    // ── трафареты ────────────────────────────────────────────
    const stamp = (mask, ox, oy, shade) => {
      const mw = mask[0].length;
      const mh = mask.length;
      const sx = ax + ox - (mw >> 1);
      const sy = ay + oy - (mh >> 1);
      let put = 0;
      for (let j = 0; j < mh; j++) {
        for (let i2 = 0; i2 < mw; i2++) {
          const ch = mask[j][i2];
          if (ch === '.') continue;
          const x = sx + i2;
          const y = sy + j;
          if (x < x0 || x >= x1) continue;
          // только по металлу: иначе кость повисает в воздухе
          if (!solid(x, y)) continue;
          const col = INK[ch];
          // кость темнеет книзу и вправо — иначе трафарет выглядит наклейкой
          const f = shade * (1 - 0.3 * (j / mh) - 0.08 * (i2 / mw));
          const k = at(x, y);
          px[k] = Math.round(col[0] * f);
          px[k + 1] = Math.round(col[1] * f);
          px[k + 2] = Math.round(col[2] * f);
          put++;
        }
      }
      return put;
    };

    stamped += stamp(SKULL, rig.skull[0], rig.skull[1], 1);
    for (const [ox, oy] of rig.bones) stamped += stamp(BONE, ox, oy, 0.92);
    for (const [ox, oy] of rig.chunks) stamped += stamp(CHUNK, ox, oy, 1);

    // ── царапины ─────────────────────────────────────────────
    const cuts = 3 + Math.floor(r() * 3);
    for (let s = 0; s < cuts; s++) {
      let x = bx0 + Math.floor(r() * Math.max(1, bx1 - bx0));
      let y = Math.floor(r() * H);
      const len = 4 + Math.floor(r() * 9);
      const sx = r() < 0.5 ? -1 : 1;
      for (let k = 0; k < len; k++, x += sx, y += 1) {
        if (!solid(x, y)) continue;
        const i = at(x, y);
        px[i] = Math.min(255, px[i] + 46);
        px[i + 1] = Math.min(255, px[i + 1] + 34);
        px[i + 2] = Math.min(255, px[i + 2] + 30);
      }
    }
  }

  await sharp(px, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, `${id}.png`));
  console.log(`${id}: ${entry.n} кадров, трафаретов ${stamped} пикселей`);
}

const man = JSON.parse(await fs.readFile(path.join(OUT, 'weapons.json'), 'utf8'));
const reset = process.argv.includes('--reset');

// чистые кадры прячем один раз: дальше рисуем всегда от них
await fs.mkdir(RAW, { recursive: true });
for (const id of Object.keys(man)) {
  const raw = path.join(RAW, `${id}.png`);
  try {
    await fs.access(raw);
  } catch {
    await fs.copyFile(path.join(OUT, `${id}.png`), raw);
    console.log(`сохранён чистый кадр: ${raw}`);
  }
}

for (const [id, entry] of Object.entries(man)) {
  if (!RIG[id]) {
    console.warn(`${id}: нет разметки, пропускаю`);
    continue;
  }
  if (reset) {
    await fs.copyFile(path.join(RAW, `${id}.png`), path.join(OUT, `${id}.png`));
    console.log(`${id}: возвращены чистые кадры`);
    continue;
  }
  await gore(id, entry);
}

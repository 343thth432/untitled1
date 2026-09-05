#!/usr/bin/env node
/**
 * Заливает ленты кадров оружия кровью.
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
 *   node tools/gore-weapons.mjs          # залить кровью
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
// m мясо, r тёмный край, . пусто

const CHUNK = [
  '..rrr..',
  '.rmmmr.',
  'rmmmmmr',
  '.rmmmr.',
  '..rr...',
];

const INK = {
  m: [176, 40, 34],
  r: [74, 12, 12],
};

/**
 * Сколько крови на каждом стволе и где налипли куски. Отсчёт от середины
 * низа силуэта кадра: низ у всех кадров на месте, а вершина уезжает,
 * когда ствол переломлен или откинут. Поэтому якорь снизу, а не по рамке.
 */
const RIG = {
  ssg: { seed: 7412, blood: 0.54, chunks: [[-17, -5], [14, -7], [-6, -38]] },
  chaingun: { seed: 22801, blood: 0.54, chunks: [[-13, -4], [13, -5], [0, -37]] },
  launcher: { seed: 5533, blood: 0.54, chunks: [[-13, -4], [14, -6], [-1, -40]] },
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
  // рельеф читаем по чистому кадру: к моменту потёков пятна уже лежат,
  // и по ним форму металла не разобрать. Светлое — выпуклость и блик,
  // тёмное — желоб, шов, край ствола
  const clean = Buffer.from(data);
  const lumAt = (x, y) => {
    if (!solid(x, y)) return -1;
    const i = at(x, y);
    return (clean[i] * 0.4 + clean[i + 1] * 0.4 + clean[i + 2] * 0.2) / 255;
  };

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
        const spot = Math.min(1, (n - (1 - rig.blood)) / (rig.blood * 0.7)) * 0.94;
        const lum = lumAt(x, y);
        // в желобах и швах кровь стоит, с выпуклостей её сгоняет: густота
        // тем выше, чем темнее металл под ней. Но в самой густой тени
        // крови кладём меньше: там она всё равно не читается, а рельеф
        // от неё превращается в грязь
        const k = Math.min(1, spot * (0.62 + 0.72 * (1 - lum)) * Math.min(1, lum * 3.6));
        // кровь темнит металл, а не закрашивает: рельеф под ней виден
        // подсохшая кровь: тёмная, по ней потом побегут свежие струйки
        const rr = 70 + lum * 120;
        const gg = 11 + lum * 26;
        const bb = 13 + lum * 22;
        px[i] = Math.round(px[i] * (1 - k) + rr * k);
        px[i + 1] = Math.round(px[i + 1] * (1 - k) + gg * k);
        px[i + 2] = Math.round(px[i + 2] * (1 - k) + bb * k);
      }
    }

    // ── подтёки вниз ─────────────────────────────────────────
    // струйка не падает по отвесу, а течёт по металлу: на каждом шаге
    // выбирает из трёх клеток снизу самую тёмную. Тёмное — это желоб,
    // шов или заворот ствола, туда кровь и уходит. На ровном месте
    // разницы нет, и струйка идёт прямо
    const drips = 14 + Math.floor(r() * 8);
    for (let d = 0; d < drips; d++) {
      let dx = bx0 + Math.floor(r() * Math.max(1, bx1 - bx0));
      let dy = Math.floor(r() * H);
      while (dy > 0 && !solid(dx, dy)) dy--;
      const len = 10 + Math.floor(r() * 26);
      const wide = r() < 0.4;
      // сколько всего увело вбок: кровь течёт вниз, а не вдоль шва, и
      // без этого предела струйка уползает по горизонтальному стыку и
      // становится похожа на дорожку платы
      let drift = 0;
      const DRIFT_MAX = 7;
      for (let k = 0; k < len; k++) {
        const y = dy + k;
        if (!solid(dx, y)) break;
        const tail = k / len;
        const bead = k > len - 3 ? 1.25 : 1;
        const f = Math.min(1, (0.55 + tail * 0.45) * bead);
        const lum = lumAt(dx, y);
        // струйка свежая и заметно светлее подсохшего пятна, иначе её
        // не видно на общем красном
        const rr = 168 + lum * 74;
        const paint = (x, w) => {
          if (!solid(x, y)) return;
          const i = at(x, y);
          px[i] = Math.round(px[i] * (1 - f * w) + rr * f * w);
          px[i + 1] = Math.round(px[i + 1] * (1 - f * w) + 24 * f * w);
          px[i + 2] = Math.round(px[i + 2] * (1 - f * w) + 22 * f * w);
        };
        paint(dx, 1);
        if (wide) paint(dx + 1, 0.7);
        if (k > len - 3) {
          paint(dx - 1, 0.6);
          paint(dx + 1, 0.6);
        }

        // куда течь дальше. Правило одно: вниз, пока вниз идёт под уклон.
        // Светлее снизу — там выпуклость, на неё кровь не полезет и
        // скатится вбок. Темнее снизу — это желоб или шов, туда она и
        // течёт прямо. Раньше струйка сворачивала на любое затемнение и
        // уползала вдоль горизонтальных стыков, как дорожка платы
        const cur = lumAt(dx, y);
        const lc = lumAt(dx, y + 1);
        if (lc < 0) break;
        const BUMP = 0.06;
        let step = 0;
        if (lc > cur + BUMP) {
          const ll = lumAt(dx - 1, y + 1);
          const lr = lumAt(dx + 1, y + 1);
          if (ll >= 0 && ll < lc && (lr < 0 || ll <= lr)) step = -1;
          else if (lr >= 0 && lr < lc) step = 1;
        }
        if (Math.abs(drift + step) > DRIFT_MAX) step = 0;
        if (step !== 0) {
          // на повороте струйка задерживается и расплывается вширь
          paint(dx + step, 0.75);
        }
        drift += step;
        dx += step;
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
          // кусок темнеет книзу — иначе трафарет выглядит наклейкой
          const f = shade * (1 - 0.26 * (j / mh) - 0.06 * (i2 / mw));
          const k = at(x, y);
          px[k] = Math.round(col[0] * f);
          px[k + 1] = Math.round(col[1] * f);
          px[k + 2] = Math.round(col[2] * f);
          put++;
        }
      }
      return put;
    };

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

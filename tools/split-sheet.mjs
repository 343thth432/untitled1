#!/usr/bin/env node
/**
 * Режет лист поз на отдельные кадры.
 *
 * Генератор охотнее рисует все позы одной картинкой — так персонаж
 * получается одинаковым во всех кадрах. Скрипт находит на листе связные
 * области непрозрачного, раскладывает их в порядке чтения (сверху вниз,
 * слева направо) и раскладывает по именам, которые ему передали.
 *
 * Ключ --match приводит все кадры к росту эталона: на листе фигуры мельче,
 * чем на отдельной картинке, а конвейер берёт масштаб один на всю тварь.
 * Множитель считается по самой высокой фигуре листа и применяется ко всем
 * кадрам сразу — иначе присевшая раздуется во весь рост.
 *
 *   node tools/split-sheet.mjs лист.png --out public/art/foes/alley \
 *        --match 1440 --names alley-2,alley-3,alley-4,alley-0-atk
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const src = args[0];
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i > 0 ? args[i + 1] : d;
};
const out = flag('out', '.');
const match = Number(flag('match', 0));
const names = (flag('names', '') || '').split(',').filter(Boolean);
/** области мельче этой доли самой крупной — мусор, а не кадр */
const MIN = 0.04;

if (!src) {
  console.error('нужен лист: node tools/split-sheet.mjs лист.png --out каталог --names a,b,c');
  process.exit(1);
}

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const on = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) on[i] = data[i * 4 + 3] > 100 ? 1 : 0;

// связные области по восьми соседям
const seen = new Int32Array(w * h).fill(-1);
const parts = [];
for (let p = 0; p < w * h; p++) {
  if (!on[p] || seen[p] >= 0) continue;
  const id = parts.length;
  const st = [p];
  seen[p] = id;
  let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
  while (st.length) {
    const q = st.pop();
    const x = q % w;
    const y = (q / w) | 0;
    n++;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const r = ny * w + nx;
        if (on[r] && seen[r] < 0) {
          seen[r] = id;
          st.push(r);
        }
      }
    }
  }
  parts.push({ id, x0, y0, x1, y1, n });
}

const biggest = Math.max(...parts.map((p) => p.n));
let keep = parts.filter((p) => p.n >= biggest * MIN);

/** пересчитывает границы области по её метке */
function tighten(p) {
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = p.y0; y <= p.y1; y++) {
    for (let x = p.x0; x <= p.x1; x++) {
      if (seen[y * w + x] !== p.id) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { ...p, x0, x1, y0, y1 };
}

/**
 * Соседние фигуры на листе иногда соприкасаются — носком ботинка, кончиком
 * хвоста — и слипаются в одну область вдвое выше остальных. Разрез строкой
 * тут не помогает: место касания принадлежит обеим сразу.
 *
 * Поэтому маска размывается внутрь, пока перемычка не порвётся и не
 * останется два ядра, а потом каждый пиксель исходной области отдаётся
 * ближайшему ядру. Перемычка тонкая, ядра толстые — расходятся за
 * несколько шагов.
 */
function unstick(p) {
  const cw = p.x1 - p.x0 + 1;
  const ch = p.y1 - p.y0 + 1;
  let mask = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (seen[(p.y0 + y) * w + (p.x0 + x)] === p.id) mask[y * cw + x] = 1;
    }
  }
  const blobs = (m) => {
    const lab = new Int32Array(cw * ch).fill(-1);
    const size = [];
    for (let q = 0; q < cw * ch; q++) {
      if (!m[q] || lab[q] >= 0) continue;
      const id = size.length;
      const st = [q];
      lab[q] = id;
      let n = 0;
      while (st.length) {
        const r = st.pop();
        const x = r % cw;
        const y = (r / cw) | 0;
        n++;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
            const t = ny * cw + nx;
            if (m[t] && lab[t] < 0) {
              lab[t] = id;
              st.push(t);
            }
          }
        }
      }
      size.push(n);
    }
    return { lab, size };
  };

  let cur = mask;
  let got = null;
  for (let step = 0; step < 14; step++) {
    const next = new Uint8Array(cw * ch);
    for (let y = 1; y < ch - 1; y++) {
      for (let x = 1; x < cw - 1; x++) {
        const q = y * cw + x;
        if (cur[q] && cur[q - 1] && cur[q + 1] && cur[q - cw] && cur[q + cw]) next[q] = 1;
      }
    }
    cur = next;
    const b = blobs(cur);
    const big = b.size.map((n, i) => ({ n, i })).filter((x) => x.n > cw * ch * 0.02);
    if (big.length >= 2) {
      got = { ...b, big: big.sort((x, y2) => y2.n - x.n).slice(0, 2) };
      console.log(`область ${cw}x${ch} разошлась на две после ${step + 1} шагов размытия`);
      break;
    }
  }
  if (!got) return [p];

  // каждый пиксель — ближайшему ядру: волна одновременно из обоих
  const owner = new Int32Array(cw * ch).fill(-1);
  let front = [];
  got.big.forEach((b, k) => {
    for (let q = 0; q < cw * ch; q++) {
      if (got.lab[q] === b.i) {
        owner[q] = k;
        front.push(q);
      }
    }
  });
  while (front.length) {
    const next = [];
    for (const q of front) {
      const x = q % cw;
      const y = (q / cw) | 0;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
        const t = ny * cw + nx;
        if (mask[t] && owner[t] < 0) {
          owner[t] = owner[q];
          next.push(t);
        }
      }
    }
    front = next;
  }

  // вторая половина получает новую метку, дальше всё идёт как обычно
  const fresh = parts.length;
  parts.push(null);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (owner[y * cw + x] === 1) seen[(p.y0 + y) * w + (p.x0 + x)] = fresh;
    }
  }
  return [tighten(p), tighten({ ...p, id: fresh })];
}

{
  const hs = keep.map((p) => p.y1 - p.y0 + 1).sort((a, b) => a - b);
  const med = hs[hs.length >> 1];
  keep = keep.flatMap((p) => ((p.y1 - p.y0 + 1) > med * 1.6 ? unstick(p) : [p]));
}

// порядок чтения: строками сверху вниз, внутри строки слева направо
const heights = keep.map((p) => p.y1 - p.y0 + 1).sort((a, b) => a - b);
const tol = heights[heights.length >> 1] * 0.35;
keep.sort((a, b) => a.y0 - b.y0);
const rows = [];
for (const p of keep) {
  const row = rows[rows.length - 1];
  if (row && p.y0 <= row.top + tol) row.items.push(p);
  else rows.push({ top: p.y0, items: [p] });
}
const order = rows.flatMap((r) => r.items.sort((a, b) => a.x0 - b.x0));

const tallest = Math.max(...order.map((p) => p.y1 - p.y0 + 1));
const k = match ? match / tallest : 1;
console.log(`фигур: ${order.length}, строк: ${rows.length}, самая высокая ${tallest}px, множитель ${k.toFixed(3)}`);

await fs.mkdir(out, { recursive: true });
for (let i = 0; i < order.length; i++) {
  const p = order[i];
  const cw = p.x1 - p.x0 + 1;
  const ch = p.y1 - p.y0 + 1;
  const name = names[i] ?? `part-${i}`;
  const file = path.join(out, `${name}.png`);

  // в рамку попадают куски соседних фигур — хвост, занесённая рука;
  // оставляем только пиксели своей области
  const mask = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (seen[(p.y0 + y) * w + (p.x0 + x)] === p.id) mask[y * cw + x] = 1;
    }
  }
  // после разреза слипшихся фигур в кадре остаётся чужой огрызок —
  // ботинок или кончик хвоста. Держим только самую крупную часть.
  {
    const lab = new Int32Array(cw * ch).fill(-1);
    const size = [];
    for (let q = 0; q < cw * ch; q++) {
      if (!mask[q] || lab[q] >= 0) continue;
      const id = size.length;
      const st = [q];
      lab[q] = id;
      let n = 0;
      while (st.length) {
        const r = st.pop();
        const x = r % cw;
        const y = (r / cw) | 0;
        n++;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
            const t = ny * cw + nx;
            if (mask[t] && lab[t] < 0) {
              lab[t] = id;
              st.push(t);
            }
          }
        }
      }
      size.push(n);
    }
    if (size.length > 1) {
      const main = size.indexOf(Math.max(...size));
      let dropped = 0;
      for (let q = 0; q < cw * ch; q++) {
        if (mask[q] && lab[q] !== main) {
          mask[q] = 0;
          dropped++;
        }
      }
      console.log(`  ${name}: отброшено ${dropped} пикселей чужих обрезков`);
    }
  }
  const cut = Buffer.alloc(cw * ch * 4, 0);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (!mask[y * cw + x]) continue;
      const si = (p.y0 + y) * w + (p.x0 + x);
      cut.set(data.subarray(si * 4, si * 4 + 4), (y * cw + x) * 4);
    }
  }
  let img = sharp(cut, { raw: { width: cw, height: ch, channels: 4 } });
  if (k !== 1) img = img.resize(Math.round(cw * k), Math.round(ch * k), { kernel: 'lanczos3' });
  await img.png({ compressionLevel: 9 }).toFile(file);
  console.log(`  ${name}.png  ${Math.round(cw * k)}x${Math.round(ch * k)}  (с листа ${cw}x${ch} @ ${p.x0},${p.y0})`);
}

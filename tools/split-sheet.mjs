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
const keep = parts.filter((p) => p.n >= biggest * MIN);
if (!keep.length) {
  console.error('на листе не нашлось фигур');
  process.exit(1);
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
  const cut = Buffer.alloc(cw * ch * 4, 0);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = (p.y0 + y) * w + (p.x0 + x);
      if (seen[si] !== p.id) continue;
      cut.set(data.subarray(si * 4, si * 4 + 4), (y * cw + x) * 4);
    }
  }
  let img = sharp(cut, { raw: { width: cw, height: ch, channels: 4 } });
  if (k !== 1) img = img.resize(Math.round(cw * k), Math.round(ch * k), { kernel: 'lanczos3' });
  await img.png({ compressionLevel: 9 }).toFile(file);
  console.log(`  ${name}.png  ${Math.round(cw * k)}x${Math.round(ch * k)}  (с листа ${cw}x${ch} @ ${p.x0},${p.y0})`);
}

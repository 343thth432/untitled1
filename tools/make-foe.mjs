#!/usr/bin/env node
/**
 * Превращает нарисованный кадр твари в игровой пиксельный спрайт.
 *
 * Вход — картинка целиком, как её отдал генератор: фигура в полный рост
 * на прозрачном или однотонном фоне. Выход — спрайт в разрешении движка,
 * с жёсткой альфой, ограниченной палитрой и тёмным кантом.
 *
 * Порядок работы:
 *   1. фон срезается по альфе, а если он непрозрачный — заливкой от углов,
 *      чтобы светлые места внутри фигуры не пропали заодно с фоном;
 *   2. кадр обрезается по содержимому;
 *   3. масштаб берётся один на всю тварь — по кадру анфас в спокойной
 *      позе. Иначе присевшая или упавшая раздувается во весь рост, и
 *      тварь скачет в размере между кадрами. Ставится подошвами на пол,
 *      а по горизонтали центруется по стопам, а не по рамке: хвост и
 *      отведённая рука иначе уводят фигуру вбок;
 *   4. цвета сводятся в палитру медианным сечением — иначе после
 *      уменьшения остаётся мыло из тысяч оттенков, а не пиксель-арт;
 *   5. по кромке кладётся кант цветом соседнего пикселя, притемнённым:
 *      сплошная чернота превращает спрайт в наклейку.
 *
 * Имена входных файлов: <id>-<ракурс>[-<поза>].png, ракурс 0..4 (анфас,
 * три четверти, профиль, три четверти со спины, спина). Без позы — кадр
 * покоя. <id>-0.png обязателен: он задаёт масштаб.
 *
 *   node tools/make-foe.mjs alley
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/** высота буфера спрайта — та же, что у рисованных (foeArt.ts) */
const ART_W = 120;
const ART_H = 208;
/** какую долю буфера занимает фигура от макушки до подошв */
const FILL = 0.86;
/** сколько цветов оставить */
const COLORS = 30;

/** непрозрачно ли */
const solid = (px, i) => px[i + 3] > 128;

/** срезает однотонный фон заливкой от углов */
function keyBackground(px, w, h) {
  const seen = new Uint8Array(w * h);
  const near = (i, j) =>
    Math.abs(px[i] - px[j]) + Math.abs(px[i + 1] - px[j + 1]) + Math.abs(px[i + 2] - px[j + 2]) < 42;
  const stack = [0, w - 1, (h - 1) * w, h * w - 1];
  const ref = stack[0] * 4;
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!near(i, ref)) continue;
    px[i + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
}

/** рамка непрозрачного */
function bounds(px, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(px, (y * w + x) * 4)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** середина стоп: нижняя десятая часть силуэта */
function feetCenter(px, w, h, b) {
  const from = b.y1 - Math.max(2, Math.round((b.y1 - b.y0) * 0.08));
  let sum = 0;
  let n = 0;
  for (let y = from; y <= b.y1; y++) {
    for (let x = b.x0; x <= b.x1; x++) {
      if (!solid(px, (y * w + x) * 4)) continue;
      sum += x;
      n++;
    }
  }
  return n ? sum / n : (b.x0 + b.x1) / 2;
}

/** медианное сечение: палитра, в которой цвета распределены по плотности */
function medianCut(pixels, want) {
  let boxes = [pixels];
  while (boxes.length < want) {
    // режем самую разбросанную коробку по её самой длинной оси
    let bi = -1;
    let best = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const s = spread(boxes[i]);
      if (s.range > best) {
        best = s.range;
        bi = i;
      }
    }
    if (bi < 0) break;
    const box = boxes[bi];
    const ax = spread(box).axis;
    box.sort((a, b) => a[ax] - b[ax]);
    const mid = box.length >> 1;
    boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
  }
  return boxes.filter((b) => b.length).map((b) => {
    const s = [0, 0, 0];
    for (const p of b) {
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
    }
    return s.map((v) => Math.round(v / b.length));
  });
}

function spread(box) {
  const lo = [255, 255, 255];
  const hi = [0, 0, 0];
  for (const p of box) {
    for (let c = 0; c < 3; c++) {
      if (p[c] < lo[c]) lo[c] = p[c];
      if (p[c] > hi[c]) hi[c] = p[c];
    }
  }
  // зелёный весит больше: глаз к нему чувствительнее
  const w = [0.9, 1.2, 0.7];
  let axis = 0;
  let range = -1;
  for (let c = 0; c < 3; c++) {
    const r = (hi[c] - lo[c]) * w[c];
    if (r > range) {
      range = r;
      axis = c;
    }
  }
  return { axis, range };
}

function nearest(pal, r, g, b) {
  let bi = 0;
  let bd = Infinity;
  for (let i = 0; i < pal.length; i++) {
    const p = pal[i];
    const d = (p[0] - r) ** 2 * 0.9 + (p[1] - g) ** 2 * 1.2 + (p[2] - b) ** 2 * 0.7;
    if (d < bd) {
      bd = d;
      bi = i;
    }
  }
  return pal[bi];
}

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('нужен id твари: node tools/make-foe.mjs alley');
    process.exit(1);
  }
  const dir = path.resolve('public/art/foes', id);
  const re = new RegExp(`^${id}-(\\d)(?:-([a-z0-9]+))?\\.png$`);
  const files = (await fs.readdir(dir)).filter((f) => re.test(f)).sort();
  if (!files.includes(`${id}-0.png`)) {
    console.error(`в ${dir} нет ${id}-0.png — по нему считается масштаб`);
    process.exit(1);
  }

  const views = [];
  let unit = 0;
  // кадр анфас в покое идёт первым: он задаёт масштаб для остальных
  for (const f of [`${id}-0.png`, ...files.filter((x) => x !== `${id}-0.png`)]) {
    const src = path.join(dir, f);
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    // фон: если углы непрозрачны, значит он залит цветом — срезаем заливкой
    if (data[3] > 128) keyBackground(data, w, h);
    const b = bounds(data, w, h);
    if (!b) {
      console.error(`${f}: пустой кадр`);
      continue;
    }
    const fx = feetCenter(data, w, h, b);

    // масштаб общий на тварь: считается по кадру покоя и переиспользуется
    const figH = b.y1 - b.y0 + 1;
    if (!unit) unit = (ART_H * FILL) / figH;
    const scale = unit;
    const cropW = b.x1 - b.x0 + 1;
    const smallW = Math.max(1, Math.round(cropW * scale));
    const smallH = Math.max(1, Math.round(figH * scale));
    const cut = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } })
      .extract({ left: b.x0, top: b.y0, width: cropW, height: figH })
      .resize(smallW, smallH, { kernel: 'mitchell', fit: 'fill' })
      .raw()
      .toBuffer();

    const m = re.exec(f);
    views.push({
      name: f,
      view: Number(m[1]),
      pose: m[2] ?? 'idle',
      px: cut,
      w: smallW,
      h: smallH,
      // куда лёг центр стоп в уменьшенном кадре
      foot: (fx - b.x0) * scale,
    });
  }

  // палитра общая на все ракурсы, иначе они разойдутся по цвету
  const sample = [];
  for (const v of views) {
    for (let i = 0; i < v.px.length; i += 4) {
      if (v.px[i + 3] > 128) sample.push([v.px[i], v.px[i + 1], v.px[i + 2]]);
    }
  }
  const pal = medianCut(sample, COLORS);
  console.log(`палитра: ${pal.length} цветов из ${sample.length} пикселей`);

  const out = [];
  for (const v of views) {
    const buf = Buffer.alloc(ART_W * ART_H * 4, 0);
    const ox = Math.round(ART_W / 2 - v.foot);
    const oy = ART_H - v.h;
    for (let y = 0; y < v.h; y++) {
      for (let x = 0; x < v.w; x++) {
        const s = (y * v.w + x) * 4;
        if (v.px[s + 3] <= 128) continue;
        const dx = x + ox;
        const dy = y + oy;
        if (dx < 0 || dy < 0 || dx >= ART_W || dy >= ART_H) continue;
        const c = nearest(pal, v.px[s], v.px[s + 1], v.px[s + 2]);
        const d = (dy * ART_W + dx) * 4;
        buf[d] = c[0];
        buf[d + 1] = c[1];
        buf[d + 2] = c[2];
        buf[d + 3] = 255;
      }
    }
    // кант: цветом соседа, притемнённым — не сплошная чернота
    const copy = Buffer.from(buf);
    const at = (x, y) => (x < 0 || y < 0 || x >= ART_W || y >= ART_H ? null : (y * ART_W + x) * 4);
    for (let y = 0; y < ART_H; y++) {
      for (let x = 0; x < ART_W; x++) {
        const i = (y * ART_W + x) * 4;
        if (copy[i + 3]) continue;
        let n = null;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const j = at(x + dx, y + dy);
          if (j !== null && copy[j + 3]) {
            n = j;
            break;
          }
        }
        if (n === null) continue;
        buf[i] = copy[n] * 0.32;
        buf[i + 1] = copy[n + 1] * 0.3;
        buf[i + 2] = copy[n + 2] * 0.38;
        buf[i + 3] = 255;
      }
    }
    const file = v.name.replace(/\.png$/, '.sprite.png');
    await sharp(buf, { raw: { width: ART_W, height: ART_H, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(path.join(dir, file));
    out.push({ file, view: v.view, pose: v.pose });
    console.log(`${v.name} -> ${file}  ракурс ${v.view}, поза ${v.pose}, ${v.w}x${v.h}`);
  }

  await fs.writeFile(
    path.join(dir, 'sprite.json'),
    JSON.stringify({ w: ART_W, h: ART_H, frames: out }, null, 2) + '\n',
  );
  console.log('готово:', dir);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

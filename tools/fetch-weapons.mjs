#!/usr/bin/env node
/**
 * Собирает листы кадров оружия из спрайтов Freedoom (BSD 3-clause).
 *
 * Freedoom — свободный набор данных для движка Doom: сами id Software
 * открыли только исходники движка (GPL), а графика из WAD'ов осталась
 * коммерческой. Спрайты Freedoom нарисованы с нуля и разрешены к
 * распространению, поэтому берём их.
 *
 * Кадр кладётся на виртуальный экран 320x200 ровно туда, куда его ставит
 * ванильный Doom: x = 1 - leftoffset, y = 32 - topoffset (смещения лежат
 * в buildcfg.txt репозитория). Затем все кадры одного ствола обрезаются
 * общим прямоугольником, чтобы анимация не «плавала», и склеиваются в
 * ленту. Манифест хранит угол этого прямоугольника в координатах 320x200 —
 * игре остаётся поставить ленту от низа экрана.
 *
 *   node tools/fetch-weapons.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const RAW = 'https://raw.githubusercontent.com/freedoom/freedoom/master';
const OUT = path.resolve('public/art/weapons');

/** ствол -> кадры Freedoom: основные, вспышка, и раскадровка выстрела */
const SET = {
  ssg: {
    base: ['SHT2A0', 'SHT2B0', 'SHT2C0', 'SHT2D0', 'SHT2E0', 'SHT2F0', 'SHT2G0', 'SHT2H0'],
    flash: ['SHT2I0', 'SHT2J0'],
    seq: [[0, 1], [0.14, 2], [0.3, 3], [0.44, 4], [0.58, 5], [0.72, 6], [0.87, 7], [1, 0]],
  },
  chaingun: {
    base: ['CHGGA0', 'CHGGB0'],
    flash: ['CHGFA0', 'CHGFB0'],
    seq: [[0, 1], [0.5, 0], [1, 0]],
  },
  launcher: {
    base: ['MISGA0', 'MISGB0'],
    flash: ['MISFA0', 'MISFB0', 'MISFC0', 'MISFD0'],
    seq: [[0, 1], [0.55, 0], [1, 0]],
  },
};

async function grab(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((ok) => setTimeout(ok, 2000 * 2 ** i));
    }
  }
}

/** смещения спрайтов из buildcfg.txt: ИМЯ  left  top (оба отрицательные) */
function parseOffsets(txt) {
  const map = new Map();
  for (const line of txt.split('\n')) {
    const m = /^([A-Z0-9^\[\]\\_]+)\s+(-?\d+)\s+(-?\d+)/.exec(line.split(';')[0]);
    if (m) map.set(m[1], [Number(m[2]), Number(m[3])]);
  }
  return map;
}

/** плотная рамка непрозрачных пикселей */
function tight(px, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

async function loadFrame(lump, offs) {
  const off = offs.get(lump);
  if (!off) throw new Error(`нет смещений для ${lump}`);
  const buf = await grab(`${RAW}/sprites/${lump.toLowerCase()}.png`);
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const t = tight(data, info.width, info.height);
  if (!t) throw new Error(`пустой кадр ${lump}`);
  // положение на экране 320x200 по правилам ванильного R_DrawPSprite
  return {
    lump,
    px: 1 - off[0] + t.x0,
    py: 32 - off[1] + t.y0,
    w: t.x1 - t.x0 + 1,
    h: t.y1 - t.y0 + 1,
    src: data,
    sw: info.width,
    sx: t.x0,
    sy: t.y0,
  };
}

/** склеивает кадры в горизонтальную ленту с общей рамкой */
function sheet(frames) {
  const bx = Math.min(...frames.map((f) => f.px));
  const by = Math.min(...frames.map((f) => f.py));
  const cw = Math.max(...frames.map((f) => f.px + f.w)) - bx;
  const ch = Math.max(...frames.map((f) => f.py + f.h)) - by;
  const out = Buffer.alloc(cw * frames.length * ch * 4, 0);
  const stride = cw * frames.length;
  frames.forEach((f, i) => {
    const ox = i * cw + (f.px - bx);
    const oy = f.py - by;
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const s = ((f.sy + y) * f.sw + f.sx + x) * 4;
        if (f.src[s + 3] === 0) continue;
        const d = ((oy + y) * stride + ox + x) * 4;
        out[d] = f.src[s];
        out[d + 1] = f.src[s + 1];
        out[d + 2] = f.src[s + 2];
        out[d + 3] = f.src[s + 3];
      }
    }
  });
  return { raw: out, w: stride, h: ch, cw, ch, ox: bx, oy: by };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const offs = parseOffsets((await grab(`${RAW}/buildcfg.txt`)).toString('utf8'));
  const manifest = {};
  for (const [id, spec] of Object.entries(SET)) {
    const names = [...spec.base, ...spec.flash];
    const frames = [];
    for (const n of names) frames.push(await loadFrame(n, offs));
    const s = sheet(frames);
    await sharp(s.raw, { raw: { width: s.w, height: s.h, channels: 4 } })
      .png({ palette: true, compressionLevel: 9 })
      .toFile(path.join(OUT, `${id}.png`));
    manifest[id] = {
      cw: s.cw,
      ch: s.ch,
      ox: s.ox,
      oy: s.oy,
      n: spec.base.length,
      flash: spec.flash.length,
      seq: spec.seq,
    };
    console.log(`${id}: ${spec.base.length}+${spec.flash.length} кадров, клетка ${s.cw}x${s.ch}, угол ${s.ox},${s.oy}`);
  }
  await fs.writeFile(path.join(OUT, 'weapons.json'), JSON.stringify(manifest, null, 2) + '\n');

  const lic = (await grab(`${RAW}/COPYING.adoc`)).toString('utf8');
  await fs.writeFile(
    path.join(OUT, 'CREDITS.txt'),
    [
      'Спрайты оружия взяты из проекта Freedoom (https://freedoom.github.io/),',
      'лицензия BSD 3-clause. Кадры не перерисовывались: скрипт только ставит',
      'их по смещениям из buildcfg.txt и склеивает в ленту.',
      'Собрано скриптом tools/fetch-weapons.mjs.',
      '',
      'Ниже — файл COPYING.adoc из репозитория Freedoom целиком.',
      '',
      '----------------------------------------------------------------------',
      '',
      lic,
    ].join('\n'),
  );
  console.log('готово:', OUT);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

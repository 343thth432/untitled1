/**
 * Тянет CC0-материалы с ambientCG и раскладывает их в public/tex.
 * Берём только цвет и карту нормалей — остального рейкастеру не нужно.
 * Запуск: node tools/fetch-tex.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const OUT = 'public/tex';
const TMP = '/tmp/acg';
const SIZE = 512;

/** имя в игре → assetId на ambientCG */
const MATS = {
  wallBrick: 'Bricks096',
  wallRock: 'Rock030',
  wallMoss: 'Bricks094',
  floorCobble: 'PavingStones141',
  ceilRock: 'Rock022',
  doorWood: 'Planks023A',
};

mkdirSync(OUT, { recursive: true });
const have = new Set(readdirSync(OUT));
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const credits = [];

for (const [name, id] of Object.entries(MATS)) {
  if (have.has(`${name}_c.webp`) && have.has(`${name}_n.webp`)) {
    credits.push(`${name}: ambientCG «${id}» — CC0, https://ambientcg.com/view?id=${id}`);
    console.log(`${name} уже есть`);
    continue;
  }
  const zip = join(TMP, `${id}.zip`);
  const dir = join(TMP, id);
  const url = `https://ambientcg.com/get?file=${id}_1K-JPG.zip`;
  process.stdout.write(`${name} <- ${id} `);
  let ok = false;
  for (let a = 0; a < 5 && !ok; a++) {
    try {
      execFileSync('curl', ['-sSL', '-m', '180', '--retry', '3', '--retry-all-errors', '-o', zip, url]);
      ok = true;
    } catch {
      execFileSync('sleep', [String(2 ** a)]);
    }
  }
  if (!ok) throw new Error(`${id}: не скачался`);
  mkdirSync(dir, { recursive: true });
  execFileSync('unzip', ['-qo', zip, '-d', dir]);
  const files = readdirSync(dir);
  const pick = (suffix) => files.find((f) => f.endsWith(suffix));
  const color = pick('_Color.jpg');
  const normal = pick('_NormalGL.jpg') ?? pick('_NormalDX.jpg');
  if (!color || !normal) throw new Error(`${id}: нет нужных карт (${files.join(', ')})`);

  await sharp(join(dir, color)).resize(SIZE, SIZE).webp({ quality: 82 }).toFile(join(OUT, `${name}_c.webp`));
  await sharp(join(dir, normal)).resize(SIZE, SIZE).webp({ quality: 86 }).toFile(join(OUT, `${name}_n.webp`));
  credits.push(`${name}: ambientCG «${id}» — CC0, https://ambientcg.com/view?id=${id}`);
  console.log('ok');
}

writeFileSync(
  join(OUT, 'CREDITS.txt'),
  ['Текстуры подземелья — ambientCG (ambientcg.com), лицензия CC0 1.0.', '', ...credits, ''].join('\n'),
);
rmSync(TMP, { recursive: true, force: true });
console.log('готово:', readdirSync(OUT).length, 'файлов');

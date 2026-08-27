import type { Appearance, WeaponId } from '../../game/types';
import { dark, ink, light, linear, mix, rgba, shape, shapeInk, taper, type P } from './paint';

/**
 * Оружие рисуется в локальной системе: рукоять в (0,0),
 * клинок уходит вверх по -Y. Масштаб — пиксели пространства фигуры.
 */
export interface WeaponArt {
  canvas: HTMLCanvasElement;
  /** точка хвата внутри канваса */
  grip: P;
  /** размер в единицах фигуры */
  w: number;
  h: number;
}

interface Box {
  x0: number;
  y0: number;
  w: number;
  h: number;
}

const BOX: Record<WeaponId, Box> = {
  katana: { x0: -46, y0: -300, w: 110, h: 380 },
  greatsword: { x0: -70, y0: -350, w: 150, h: 430 },
  bow: { x0: -130, y0: -290, w: 240, h: 580 },
  staff: { x0: -60, y0: -330, w: 130, h: 470 },
  scythe: { x0: -170, y0: -330, w: 260, h: 460 },
  daggers: { x0: -50, y0: -150, w: 110, h: 220 },
  hammer: { x0: -80, y0: -320, w: 170, h: 430 },
  spear: { x0: -46, y0: -360, w: 100, h: 520 },
  grimoire: { x0: -80, y0: -80, w: 170, h: 160 },
  chakram: { x0: -80, y0: -80, w: 170, h: 170 },
  crossbow: { x0: -120, y0: -190, w: 300, h: 380 },
  glaive: { x0: -80, y0: -350, w: 170, h: 500 },
  wand: { x0: -46, y0: -220, w: 100, h: 290 },
  claws: { x0: -70, y0: -120, w: 150, h: 180 },
};

/** вороная сталь: тёмная масса и узкие блики, а не белая пластина */
function steel(ctx: CanvasRenderingContext2D, a: P, b: P, c: string): CanvasGradient {
  return linear(ctx, a[0], a[1], b[0], b[1], [
    [0, dark(c, 0.46)],
    [0.14, light(c, 0.62)],
    [0.26, c],
    [0.5, dark(c, 0.4)],
    [0.72, dark(c, 0.56)],
    [0.88, light(c, 0.44)],
    [1, dark(c, 0.5)],
  ]);
}

function wood(ctx: CanvasRenderingContext2D, c: string, len: number): CanvasGradient {
  return linear(ctx, -12, 0, 14, len, [
    [0, light(c, 0.34)],
    [0.45, c],
    [1, dark(c, 0.38)],
  ]);
}

function shaft(ctx: CanvasRenderingContext2D, top: number, bot: number, c: string, w = 9): void {
  const pts: P[] = [
    [-w, top],
    [w, top],
    [w * 0.86, bot],
    [-w * 0.86, bot],
  ];
  shape(ctx, pts, 6);
  ctx.fillStyle = wood(ctx, c, bot - top);
  ctx.fill();
  shapeInk(ctx, pts, ink(c, 0.5), 1.2, 2.8);
  taper(ctx, [[-w * 0.4, top + 10], [-w * 0.34, bot - 10]], [2.4, 1.6], rgba('#ffffff', 0.28), 4);
}

function wrap(ctx: CanvasRenderingContext2D, top: number, bot: number, c: string, w = 10): void {
  const n = Math.max(3, Math.round((bot - top) / 14));
  for (let i = 0; i < n; i++) {
    const y = top + ((bot - top) * (i + 0.5)) / n;
    taper(ctx, [[-w, y - 4], [w, y + 4]], [6, 6], i % 2 ? dark(c, 0.2) : c, 3);
  }
}

function gem(ctx: CanvasRenderingContext2D, at: P, r: number, c: string): void {
  const pts: P[] = [
    [at[0], at[1] - r],
    [at[0] + r * 0.8, at[1]],
    [at[0], at[1] + r],
    [at[0] - r * 0.8, at[1]],
  ];
  shape(ctx, pts, 4);
  ctx.fillStyle = linear(ctx, at[0] - r, at[1] - r, at[0] + r, at[1] + r, [
    [0, light(c, 0.7)],
    [0.5, c],
    [1, dark(c, 0.3)],
  ]);
  ctx.fill();
  shapeInk(ctx, pts, ink(c, 0.5), 1, 2.2);
  taper(ctx, [[at[0] - r * 0.3, at[1] - r * 0.4], [at[0] + r * 0.1, at[1] - r * 0.05]], [3, 1], rgba('#ffffff', 0.75), 4);
}

function blade(ctx: CanvasRenderingContext2D, pts: P[], c: string, edge = true): void {
  shape(ctx, pts, 8);
  const ys = pts.map((p) => p[1]);
  ctx.fillStyle = steel(ctx, [-24, Math.min(...ys)], [24, Math.max(...ys)], c);
  ctx.fill();
  shapeInk(ctx, pts, ink(c, 0.55), 1.2, 3);
  if (edge) {
    // долы / заточка
    const half = Math.floor(pts.length / 2);
    const line = pts.slice(0, half).map(([x, y]) => [x * 0.42, y] as P);
    if (line.length > 1) taper(ctx, line, [2, 3.4, 1.6], rgba('#ffffff', 0.42), 8);
  }
}

function paint(ctx: CanvasRenderingContext2D, id: WeaponId, look: Appearance): void {
  // клинок — сталь с лёгким оттенком отделки, чтобы не спорил с костюмом
  const metal = mix('#8d99b4', look.outfitTrim, 0.2);
  const acc = look.aura;
  const hilt = dark(look.outfit, 0.24);

  switch (id) {
    case 'katana': {
      blade(ctx, [[-9, -282], [4, -292], [13, -246], [15, -60], [-6, -56], [-8, -240]], metal);
      // цуба
      shape(ctx, [[-20, -58], [20, -58], [22, -44], [-22, -44]], 4);
      ctx.fillStyle = dark(acc, 0.1);
      ctx.fill();
      shapeInk(ctx, [[-20, -58], [20, -58], [22, -44], [-22, -44]], ink(acc, 0.5), 1, 2.4);
      shaft(ctx, -44, 46, hilt, 9);
      wrap(ctx, -38, 40, acc, 9);
      gem(ctx, [0, 52], 9, acc);
      break;
    }
    case 'greatsword': {
      blade(ctx, [[-30, -330], [0, -348], [30, -330], [34, -110], [0, -96], [-34, -110]], metal);
      shape(ctx, [[-52, -104], [52, -104], [44, -82], [-44, -82]], 4);
      ctx.fillStyle = steel(ctx, [-52, -104], [52, -80], acc);
      ctx.fill();
      shapeInk(ctx, [[-52, -104], [52, -104], [44, -82], [-44, -82]], ink(acc, 0.5), 1.2, 3);
      shaft(ctx, -84, 56, hilt, 11);
      wrap(ctx, -76, 48, acc, 11);
      gem(ctx, [0, 64], 12, acc);
      break;
    }
    case 'bow': {
      // цельный лук: рукоять и два плеча в одной плоскости
      const limb = (dir: 1 | -1): void => {
        const arc: P[] = [
          [6, dir * 12],
          [34, dir * 108],
          [52, dir * 206],
          [30, dir * 274],
        ];
        taper(ctx, arc, [16, 13, 9, 4], metal, 12);
        taper(
          ctx,
          arc.map(([x, y]) => [x - 4, y] as P),
          [4, 3.4, 2.4, 1],
          rgba('#ffffff', 0.45),
          12,
        );
        taper(ctx, arc, [3, 2.4, 1.8, 0.8], ink(metal, 0.45), 12);
      };
      limb(-1);
      limb(1);
      taper(ctx, [[30, -274], [8, 0], [30, 274]], [2.6, 2.6, 2.6], 'rgba(60,50,70,0.85)', 10);
      shaft(ctx, -34, 34, hilt, 12);
      wrap(ctx, -26, 26, acc, 12);
      gem(ctx, [0, 0], 11, acc);
      break;
    }
    case 'staff': {
      shaft(ctx, -240, 128, hilt, 8);
      wrap(ctx, -30, 30, acc, 8);
      // навершие-кольцо
      ctx.beginPath();
      ctx.arc(0, -278, 34, 0, Math.PI * 2);
      ctx.lineWidth = 11;
      ctx.strokeStyle = steel(ctx, [-34, -312], [34, -244], metal);
      ctx.stroke();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = ink(metal, 0.5);
      ctx.stroke();
      gem(ctx, [0, -278], 17, acc);
      for (let i = 0; i < 3; i++) {
        const a = -0.6 + i * 0.6;
        taper(
          ctx,
          [[Math.cos(a) * 40, -278 + Math.sin(a) * 40], [Math.cos(a) * 56, -278 + Math.sin(a) * 56]],
          [4, 0],
          rgba(acc, 0.8),
          4,
        );
      }
      break;
    }
    case 'scythe': {
      shaft(ctx, -280, 150, hilt, 9);
      wrap(ctx, 20, 90, acc, 9);
      blade(
        ctx,
        [
          [-4, -286],
          [-70, -300],
          [-140, -262],
          [-158, -206],
          [-132, -232],
          [-78, -252],
          [-16, -252],
        ],
        metal,
      );
      gem(ctx, [-8, -262], 10, acc);
      break;
    }
    case 'daggers': {
      blade(ctx, [[-8, -140], [2, -148], [12, -120], [12, -40], [-8, -38]], metal);
      shape(ctx, [[-18, -40], [18, -40], [16, -26], [-16, -26]], 4);
      ctx.fillStyle = dark(acc, 0.1);
      ctx.fill();
      shaft(ctx, -26, 34, hilt, 8);
      gem(ctx, [0, 40], 8, acc);
      break;
    }
    case 'hammer': {
      shaft(ctx, -250, 148, hilt, 11);
      wrap(ctx, 10, 100, acc, 11);
      const head: P[] = [
        [-46, -290],
        [44, -290],
        [54, -256],
        [44, -212],
        [-46, -212],
        [-56, -254],
      ];
      shape(ctx, head, 6);
      ctx.fillStyle = steel(ctx, [-56, -290], [54, -212], metal);
      ctx.fill();
      shapeInk(ctx, head, ink(metal, 0.55), 1.4, 3.6);
      taper(ctx, [[-38, -276], [-38, -226]], [4, 4], rgba('#ffffff', 0.35), 4);
      gem(ctx, [0, -252], 12, acc);
      break;
    }
    case 'spear': {
      shaft(ctx, -300, 190, hilt, 8);
      wrap(ctx, -20, 60, acc, 8);
      blade(ctx, [[-16, -300], [0, -344], [16, -300], [10, -252], [0, -244], [-10, -252]], metal);
      shape(ctx, [[-20, -250], [20, -250], [16, -232], [-16, -232]], 4);
      ctx.fillStyle = dark(acc, 0.08);
      ctx.fill();
      break;
    }
    case 'grimoire': {
      const cover: P[] = [[-44, -54], [42, -47], [46, 48], [-40, 55]];
      shape(ctx, cover, 6);
      ctx.fillStyle = linear(ctx, -60, -70, 60, 70, [
        [0, light(look.outfit, 0.3)],
        [0.5, look.outfit],
        [1, dark(look.outfit, 0.4)],
      ]);
      ctx.fill();
      shapeInk(ctx, cover, ink(look.outfit, 0.55), 1.4, 3.6);
      // страницы
      shape(ctx, [[-37, -44], [36, -37], [39, 40], [-33, 46]], 6);
      ctx.fillStyle = '#f6efe2';
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        taper(ctx, [[-29, -27 + i * 16], [31, -22 + i * 16]], [2, 2], 'rgba(90,80,70,0.35)', 4);
      }
      taper(ctx, [[-44, -54], [-40, 55]], [7, 7], look.outfitTrim, 4);
      gem(ctx, [0, 0], 11, acc);
      break;
    }
    case 'chakram': {
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, Math.PI * 2);
      ctx.lineWidth = 15;
      ctx.strokeStyle = steel(ctx, [-58, -58], [58, 58], metal);
      ctx.stroke();
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = ink(metal, 0.55);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        taper(
          ctx,
          [[Math.cos(a) * 58, Math.sin(a) * 58], [Math.cos(a) * 82, Math.sin(a) * 82]],
          [16, 0],
          steel(ctx, [-58, -58], [58, 58], metal) as unknown as string,
          6,
        );
      }
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = rgba(acc, 0.5);
      ctx.fill();
      gem(ctx, [0, 0], 13, acc);
      break;
    }
    case 'crossbow': {
      const body: P[] = [[-22, -26], [104, -38], [122, -8], [32, 24], [-22, 28]];
      shape(ctx, body, 6);
      ctx.fillStyle = wood(ctx, hilt, 90);
      ctx.fill();
      shapeInk(ctx, body, ink(hilt, 0.5), 1.3, 3.2);
      for (const s of [-1, 1] as const) {
        taper(ctx, [[40, 0], [62, s * 76], [46, s * 150]], [16, 12, 6], metal, 10);
      }
      taper(ctx, [[46, -150], [10, 0], [46, 150]], [2.6, 2.6, 2.6], 'rgba(60,50,70,0.85)', 8);
      shaft(ctx, -8, 68, hilt, 11);
      gem(ctx, [66, -6], 11, acc);
      break;
    }
    case 'glaive': {
      shaft(ctx, -250, 200, hilt, 9);
      wrap(ctx, 40, 120, acc, 9);
      blade(ctx, [[-10, -256], [26, -320], [44, -262], [30, -196], [-4, -186]], metal);
      taper(ctx, [[-10, -250], [-40, -224], [-30, -200]], [7, 5, 0], metal, 8);
      gem(ctx, [4, -206], 9, acc);
      break;
    }
    case 'wand': {
      shaft(ctx, -150, 96, hilt, 6);
      wrap(ctx, 20, 70, acc, 6);
      const star: P[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 11 : 26;
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        star.push([Math.cos(a) * r, -168 + Math.sin(a) * r]);
      }
      shape(ctx, star, 3);
      ctx.fillStyle = linear(ctx, -26, -194, 26, -142, [
        [0, light(acc, 0.7)],
        [0.5, acc],
        [1, dark(acc, 0.3)],
      ]);
      ctx.fill();
      shapeInk(ctx, star, ink(acc, 0.5), 1.1, 2.6);
      gem(ctx, [0, -168], 8, light(acc, 0.5));
      break;
    }
    case 'claws': {
      for (let i = 0; i < 3; i++) {
        const dx = -26 + i * 26;
        blade(ctx, [[dx - 9, -30], [dx, -104], [dx + 11, -28], [dx + 6, -8], [dx - 6, -8]], metal, false);
      }
      const cuff: P[] = [[-42, -14], [42, -14], [36, 40], [-36, 40]];
      shape(ctx, cuff, 6);
      ctx.fillStyle = linear(ctx, -42, -14, 42, 40, [
        [0, light(look.outfit, 0.3)],
        [1, dark(look.outfit, 0.36)],
      ]);
      ctx.fill();
      shapeInk(ctx, cuff, ink(look.outfit, 0.5), 1.3, 3.2);
      gem(ctx, [0, 12], 11, acc);
      break;
    }
  }
}

const cache = new Map<string, WeaponArt>();

export function weaponArt(look: Appearance, quality = 1): WeaponArt {
  const id = look.weapon;
  const key = `${id}|${look.outfitTrim}|${look.aura}|${look.outfit}|${quality}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const b = BOX[id];
  const c = document.createElement('canvas');
  c.width = Math.round(b.w * quality);
  c.height = Math.round(b.h * quality);
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.scale(quality, quality);
    ctx.translate(-b.x0, -b.y0);
    paint(ctx, id, look);
  }
  const art: WeaponArt = { canvas: c, grip: [-b.x0, -b.y0], w: b.w, h: b.h };
  cache.set(key, art);
  return art;
}

/** оружие двуручное — рисуется перед корпусом и обе руки к нему */
export function twoHanded(id: WeaponId): boolean {
  return id === 'greatsword' || id === 'hammer' || id === 'scythe' || id === 'spear' || id === 'glaive' || id === 'staff';
}

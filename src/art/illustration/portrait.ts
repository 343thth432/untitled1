import type { Appearance } from '../../game/types';
import {
  dark,
  grain,
  hatch,
  hex,
  ink,
  light,
  linear,
  mix,
  radial,
  rgba,
  seeded,
  shape,
  shapeInk,
  spline,
  stroke,
  taper,
  type P,
} from './paint';

export const DW = 480;
export const DH = 640;

/** Лёгкий разворот в три четверти: черты сдвигаются, дальний глаз уже */
export const TURN = 9;
const TILT = -0.045;

export const HEAD = {
  cx: 240,
  top: 130,
  chin: 374,
  eyeY: 296,
  eyeDX: 45,
  eyeRX: 37,
  eyeRY: 35,
  browY: 234,
  mouthY: 348,
  neckTop: 358,
};

function faceOutline(): P[] {
  const { cx, top, chin } = HEAD;
  const t = TURN;
  return [
    [cx + t * 0.3, top],
    [cx + 58 + t * 0.5, top + 14],
    [cx + 84 + t * 0.6, top + 82],
    [cx + 86 + t * 0.5, 256],
    [cx + 68 + t * 0.4, 322],
    [cx + 30 + t * 0.4, 358],
    [cx + t * 0.6, chin],
    [cx - 32 + t * 0.5, 356],
    [cx - 68 + t * 0.2, 318],
    [cx - 84 + t * 0.1, 254],
    [cx - 82, top + 80],
    [cx - 56, top + 14],
  ];
}

const TORSO: P[] = [
  [10, DH + 60],
  [30, 574],
  [56, 512],
  [116, 486],
  [186, 472],
  [240, 468],
  [296, 472],
  [364, 486],
  [424, 512],
  [450, 574],
  [470, DH + 60],
];

export interface PortraitStyle {
  sultry?: number;
}

export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  look: Appearance,
  id: string,
  W: number,
  H: number,
  style: PortraitStyle = {},
): void {
  const rnd = seeded(id);
  ctx.save();
  ctx.scale(W / DW, H / DH);
  ctx.clearRect(0, 0, DW, DH);

  const sultry = style.sultry ?? Math.max(0.45, 1 - look.mood);

  drawBackground(ctx, look, rnd);

  ctx.save();
  ctx.translate(0, 10);
  ctx.scale(1.08, 1.08);
  ctx.translate(0, -40);

  drawBackHair(ctx, look, rnd);
  drawBody(ctx, look);
  drawOutfit(ctx, look, rnd);

  ctx.save();
  ctx.translate(HEAD.cx, HEAD.chin);
  ctx.rotate(TILT);
  ctx.translate(-HEAD.cx, -HEAD.chin);
  drawHead(ctx, look);
  drawFace(ctx, look, sultry);
  drawFrontHair(ctx, look, rnd);
  drawAccessory(ctx, look);
  ctx.restore();

  drawRimLight(ctx, look);
  ctx.restore();

  drawFinish(ctx, rnd);
  grain(ctx, DW, DH, 0.05);
  ctx.restore();
}

// ── фон ──────────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  ctx.fillStyle = linear(ctx, 0, 0, 0, DH, [
    [0, light(look.aura, 0.56)],
    [0.5, light(look.aura, 0.88)],
    [1, light(look.aura, 0.68)],
  ]);
  ctx.fillRect(0, 0, DW, DH);

  ctx.fillStyle = radial(ctx, 240, 250, 20, 285, [
    [0, rgba(light(look.aura, 0.62), 0.95)],
    [0.55, rgba(light(look.aura, 0.22), 0.3)],
    [1, rgba(look.aura, 0)],
  ]);
  ctx.fillRect(0, 0, DW, DH);

  ctx.save();
  ctx.translate(240, 252);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + rnd() * 0.3;
    const r0 = 132 + rnd() * 60;
    const r1 = r0 + 90 + rnd() * 160;
    const w = 0.005 + rnd() * 0.016;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.95);
    ctx.lineTo(Math.cos(a + w) * r1, Math.sin(a + w) * r1 * 0.95);
    ctx.lineTo(Math.cos(a - w) * r1, Math.sin(a - w) * r1 * 0.95);
    ctx.closePath();
    ctx.fillStyle = rgba(look.aura, 0.06 + rnd() * 0.06);
    ctx.fill();
  }
  ctx.restore();

  const h = hatch(ctx, look.aura, 0.1, 9, 2);
  if (h) {
    ctx.save();
    ctx.fillStyle = h;
    ctx.fillRect(0, DH - 200, DW, 200);
    ctx.restore();
  }

  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * DW, rnd() * DH, 1.6 + rnd() * 4.5, 0, Math.PI * 2);
    ctx.fillStyle = rgba(light(look.aura, 0.5), 0.3 + rnd() * 0.3);
    ctx.fill();
  }
}

// ── палитра кожи ─────────────────────────────────────────────
export interface SkinTones {
  base: string;
  cel: string;
  deep: string;
  bounce: string;
  line: string;
  lineSoft: string;
}

export function skinTones(look: Appearance): SkinTones {
  const s = look.skin;
  return {
    base: s,
    cel: mix(s, '#e08a86', 0.36),
    deep: mix(s, '#b25f77', 0.44),
    bounce: light(mix(s, look.aura, 0.18), 0.24),
    line: mix(dark(s, 0.52), '#5b2740', 0.4),
    lineSoft: rgba(mix(dark(s, 0.44), '#5b2740', 0.4), 0.45),
  };
}

// ── тело ─────────────────────────────────────────────────────
function drawBody(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const t = skinTones(look);

  // торс
  shape(ctx, TORSO);
  ctx.fillStyle = linear(ctx, 100, 466, 400, DH, [
    [0, light(t.base, 0.12)],
    [0.45, t.base],
    [1, t.cel],
  ]);
  ctx.fill();

  ctx.save();
  shape(ctx, TORSO);
  ctx.clip();
  // тень справа
  shape(ctx, [
    [312, 466],
    [388, 494],
    [456, 552],
    [478, DH + 60],
    [326, DH + 60],
    [338, 542],
  ]);
  ctx.fillStyle = t.cel;
  ctx.fill();
  // глубокая тень под подбородком
  shape(ctx, [
    [174, 472],
    [240, 494],
    [306, 472],
    [292, 528],
    [240, 556],
    [188, 528],
  ]);
  ctx.fillStyle = t.deep;
  ctx.fill();
  const hp = hatch(ctx, t.line, 0.14, 8, 1.6);
  if (hp) {
    shape(ctx, [
      [178, 476],
      [240, 500],
      [302, 476],
      [286, 536],
      [240, 566],
      [194, 536],
    ]);
    ctx.fillStyle = hp;
    ctx.fill();
  }
  // отражённый свет по нижнему краю плеча
  shape(ctx, [
    [26, DH + 20],
    [46, 566],
    [86, 512],
    [110, 522],
    [70, 574],
    [54, DH + 20],
  ]);
  ctx.fillStyle = rgba(t.bounce, 0.6);
  ctx.fill();
  ctx.restore();

  shapeInk(ctx, TORSO, t.line, 1.8, 4.6);

  // грудь
  for (const s of [-1, 1]) {
    const pts: P[] = [
      [240 + s * 48, 546],
      [240 + s * 126, 596],
      [240 + s * 132, 700],
      [240 + s * 24, 720],
      [240 + s * 8, 620],
    ];
    shape(ctx, pts);
    ctx.fillStyle = linear(ctx, 240 + s * 48 - 80, 540, 240 + s * 48 + 70, 720, [
      [0, light(t.base, 0.14)],
      [0.5, t.base],
      [1, t.cel],
    ]);
    ctx.fill();
    ctx.save();
    shape(ctx, pts);
    ctx.clip();
    shape(ctx, [
      [240 + s * 96, 566],
      [240 + s * 140, 620],
      [240 + s * 138, 720],
      [240 + s * 62, 726],
    ]);
    ctx.fillStyle = t.cel;
    ctx.fill();
    ctx.restore();
    shapeInk(ctx, pts, t.line, 1.6, 4.2);
  }

  // ключицы и ложбинка живой линией
  taper(ctx, [[136, 500], [176, 522], [214, 528], [236, 520]], [0, 3.4, 3, 0], t.lineSoft);
  taper(ctx, [[344, 500], [304, 522], [266, 528], [244, 520]], [0, 3.4, 3, 0], t.lineSoft);
  taper(ctx, [[240, 566], [234, 600], [237, DH]], [0, 5, 3.4], rgba(t.line, 0.75));
  taper(ctx, [[246, 578], [242, 606]], [0, 2.2], rgba('#ffffff', 0.35));

  // шея
  const neck: P[] = [
    [212, HEAD.neckTop - 12],
    [270, HEAD.neckTop - 12],
    [278, 428],
    [240, 470],
    [204, 428],
  ];
  shape(ctx, neck);
  ctx.fillStyle = mix(t.base, '#c98fa8', 0.06);
  ctx.fill();
  ctx.save();
  shape(ctx, neck);
  ctx.clip();
  shape(ctx, [
    [206, HEAD.neckTop - 16],
    [274, HEAD.neckTop - 16],
    [276, 404],
    [240, 428],
    [206, 404],
  ]);
  ctx.fillStyle = t.deep;
  ctx.fill();
  shape(ctx, [
    [262, 360],
    [280, 380],
    [278, 432],
    [252, 452],
  ]);
  ctx.fillStyle = rgba(t.cel, 0.8);
  ctx.fill();
  ctx.restore();
  shapeInk(ctx, neck, t.line, 1.4, 3.4);
  // мышца шеи
  taper(ctx, [[222, 372], [228, 404], [238, 438]], [0, 2.6, 0], t.lineSoft);
}

// ── голова ───────────────────────────────────────────────────
export function drawHead(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const t = skinTones(look);
  const face = faceOutline();

  shape(ctx, face);
  ctx.fillStyle = linear(ctx, 150, 140, 350, 370, [
    [0, light(t.base, 0.13)],
    [0.55, t.base],
    [1, mix(t.base, t.cel, 0.55)],
  ]);
  ctx.fill();

  ctx.save();
  shape(ctx, face);
  ctx.clip();

  // тень от чёлки — рваная кромка
  ctx.beginPath();
  ctx.moveTo(144, 140);
  ctx.lineTo(340, 140);
  const edge: P[] = [
    [340, 232],
    [318, 262],
    [300, 240],
    [280, 268],
    [258, 246],
    [240, 262],
    [220, 240],
    [198, 266],
    [176, 242],
    [156, 264],
    [144, 236],
  ];
  const es = spline(edge, 8);
  for (const p of es) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.fillStyle = t.cel;
  ctx.fill();

  // вторая, более глубокая тень у самой линии волос
  ctx.beginPath();
  ctx.moveTo(144, 140);
  ctx.lineTo(340, 140);
  for (const p of spline(edge.map(([x, y]) => [x, y - 34] as P), 8)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.fillStyle = rgba(t.deep, 0.55);
  ctx.fill();

  // боковая тень справа
  shape(ctx, [
    [296, 150],
    [330, 200],
    [326, 300],
    [286, 356],
    [340, 380],
    [346, 140],
  ]);
  ctx.fillStyle = rgba(t.cel, 0.85);
  ctx.fill();

  // тень под скулой
  shape(ctx, [
    [278, 316],
    [300, 322],
    [286, 352],
    [258, 364],
  ]);
  ctx.fillStyle = rgba(t.cel, 0.7);
  ctx.fill();

  // отражённый свет по левому краю
  shape(ctx, [
    [152, 220],
    [166, 200],
    [176, 300],
    [190, 344],
    [172, 336],
    [158, 292],
  ]);
  ctx.fillStyle = rgba(t.bounce, 0.75);
  ctx.fill();

  // блик на скуле
  ctx.beginPath();
  ctx.ellipse(196, 316, 22, 9, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = rgba('#ffffff', 0.2);
  ctx.fill();
  ctx.restore();

  shapeInk(ctx, face, t.line, 1.6, 4.4);

  // уши
  for (const s of [-1, 1]) {
    const ear: P[] = [
      [240 + s * 82 + TURN * 0.3, 272],
      [240 + s * 100 + TURN * 0.3, 286],
      [240 + s * 92 + TURN * 0.3, 316],
      [240 + s * 78 + TURN * 0.3, 308],
    ];
    shape(ctx, ear);
    ctx.fillStyle = mix(t.base, '#d09090', 0.12);
    ctx.fill();
    shapeInk(ctx, ear, t.line, 1.2, 2.6);
    taper(
      ctx,
      [
        [240 + s * 88 + TURN * 0.3, 282],
        [240 + s * 92 + TURN * 0.3, 298],
      ],
      [0, 2],
      t.lineSoft,
    );
  }
}

// ── лицо ─────────────────────────────────────────────────────
export function drawFace(ctx: CanvasRenderingContext2D, look: Appearance, sultry: number): void {
  const { eyeY, eyeDX, eyeRX, eyeRY, browY, mouthY } = HEAD;
  const cx = HEAD.cx + TURN;
  const t = skinTones(look);
  const lash = mix(dark(look.hairColor, 0.62), '#1e1230', 0.5);
  const lid = sultry * 0.18;

  // румянец
  for (const s of [-1, 1]) {
    const bx = cx + s * 62;
    ctx.fillStyle = radial(ctx, bx, eyeY + 44, 4, 50, [
      [0, 'rgba(255,112,142,0.42)'],
      [1, 'rgba(255,112,142,0)'],
    ]);
    ctx.fillRect(bx - 54, eyeY - 6, 108, 96);
    for (let i = 0; i < 3; i++) {
      taper(
        ctx,
        [
          [bx - 15 + i * 12, eyeY + 36 + i * 2],
          [bx - 7 + i * 12, eyeY + 52 + i * 2],
        ],
        [0, 2.6],
        'rgba(222,80,110,0.4)',
      );
    }
  }

  for (const s of [-1, 1]) {
    // дальний глаз чуть у́же
    const near = s > 0 ? 1 : 0.9;
    ctx.save();
    ctx.translate(cx + s * eyeDX * (s > 0 ? 1 : 1.02), eyeY);
    ctx.scale(s * near, 1);

    const w = eyeRX;
    const h = eyeRY;
    const eye = () => {
      ctx.beginPath();
      ctx.moveTo(-w, h * 0.16);
      ctx.bezierCurveTo(-w * 0.6, -h * (1.05 - lid), w * 0.35, -h * (1.12 - lid), w, -h * 0.34);
      ctx.bezierCurveTo(w * 0.55, h * 0.72, -w * 0.35, h * 1.02, -w, h * 0.16);
      ctx.closePath();
    };

    eye();
    ctx.save();
    ctx.clip();

    ctx.fillStyle = '#fdfbff';
    ctx.fillRect(-w * 1.4, -h * 1.6, w * 2.8, h * 3.2);
    ctx.fillStyle = linear(ctx, 0, -h, 0, -h * 0.15, [
      [0, rgba(mix(look.eyeColor, '#3a2450', 0.62), 0.42)],
      [1, rgba(mix(look.eyeColor, '#3a2450', 0.62), 0)],
    ]);
    ctx.fillRect(-w * 1.4, -h * 1.6, w * 2.8, h * 3.2);

    const irx = w * 0.68;
    const iry = h * 0.96;
    const iy = h * 0.05;

    ctx.beginPath();
    ctx.ellipse(-w * 0.04, iy, irx, iry, 0, 0, Math.PI * 2);
    ctx.fillStyle = linear(ctx, 0, iy - iry, 0, iy + iry, [
      [0, dark(look.eyeColor, 0.5)],
      [0.3, dark(look.eyeColor, 0.1)],
      [0.66, light(look.eyeColor, 0.18)],
      [1, light(look.eyeColor, 0.8)],
    ]);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-w * 0.04, iy + iry * 0.44, irx * 0.8, iry * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(light(look.eyeColor, 0.78), 0.8);
    ctx.fill();

    // волокна радужки живой линией
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      taper(
        ctx,
        [
          [-w * 0.04 + Math.cos(a) * irx * 0.34, iy + Math.sin(a) * iry * 0.36],
          [-w * 0.04 + Math.cos(a) * irx * 0.94, iy + Math.sin(a) * iry * 0.96],
        ],
        [2.6, 0],
        rgba(dark(look.eyeColor, 0.55), 0.34),
        4,
      );
    }

    ctx.beginPath();
    ctx.ellipse(-w * 0.04, iy, irx * 0.4, iry * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#140b21';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-w * 0.04, iy, irx, iry, 0, 0, Math.PI * 2);
    stroke(ctx, rgba(dark(look.eyeColor, 0.6), 0.5), 2.4);

    // блики
    ctx.beginPath();
    ctx.ellipse(-irx * 0.42, iy - iry * 0.46, irx * 0.5, iry * 0.38, -0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(irx * 0.54, iy + iry * 0.38, irx * 0.24, iry * 0.19, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(irx * 0.06, iy - iry * 0.06, irx * 0.13, iry * 0.1, 0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.restore();

    // веко: живая линия, толще у внешнего угла
    taper(
      ctx,
      [
        [-w * 1.02, h * 0.14],
        [-w * 0.5, -h * (0.9 - lid)],
        [w * 0.16, -h * (1.12 - lid)],
        [w * 0.78, -h * (0.72 - lid)],
        [w * 1.14, -h * (0.36 - lid)],
      ],
      [2, 9, 13, 12, 3],
      lash,
      10,
    );
    // пучки ресниц
    taper(ctx, [[w * 0.86, -h * 0.4], [w * 1.3, -h * 0.95], [w * 1.66, -h * 1.34]], [9, 5, 0], lash, 8);
    taper(ctx, [[w * 0.42, -h * 1.0], [w * 0.74, -h * 1.32], [w * 1.0, -h * 1.5]], [5.5, 3, 0], lash, 8);
    taper(ctx, [[-w * 0.06, -h * 1.1], [w * 0.14, -h * 1.36], [w * 0.3, -h * 1.5]], [4.5, 2.4, 0], lash, 8);
    // складка века
    taper(
      ctx,
      [
        [-w * 0.72, -h * (1.2 - lid)],
        [w * 0.1, -h * (1.42 - lid)],
        [w * 0.86, -h * (1.02 - lid)],
      ],
      [0, 2.6, 0],
      rgba(lash, 0.45),
      8,
    );
    // нижнее веко
    taper(
      ctx,
      [
        [-w * 0.74, h * 0.78],
        [0, h * 1.14],
        [w * 0.92, h * 0.56],
        [w * 1.2, h * 0.28],
      ],
      [0, 3.4, 3, 0],
      rgba(lash, 0.6),
      8,
    );
    ctx.restore();
  }

  // брови
  for (const s of [-1, 1]) {
    const tilt = (sultry - 0.5) * 9;
    ctx.save();
    ctx.translate(cx + s * eyeDX, browY - tilt * 0.3);
    ctx.scale(s, 1);
    taper(
      ctx,
      [
        [-eyeRX * 0.92, 10 + tilt * 0.5],
        [-eyeRX * 0.3, -4 - tilt * 0.4],
        [eyeRX * 0.36, -8 - tilt * 0.2],
        [eyeRX * 0.98, 3 + tilt],
      ],
      [0, 8, 7, 0],
      ink(look.hairColor, 0.4),
      8,
    );
    ctx.restore();
  }

  // нос
  taper(ctx, [[cx + 9, 314], [cx + 15, 326], [cx + 6, 334]], [0, 3.2, 0], rgba(t.line, 0.55));
  ctx.beginPath();
  ctx.ellipse(cx + 8, 322, 5, 3, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = rgba('#ffffff', 0.4);
  ctx.fill();

  // рот
  const lipInk = mix(look.skin, '#9b1c42', 0.78);
  if (sultry > 0.5) {
    taper(ctx, [[cx - 21, mouthY + 2], [cx - 2, mouthY + 11], [cx + 26, mouthY - 8]], [0, 5.4, 0], lipInk);
    ctx.beginPath();
    ctx.moveTo(cx - 12, mouthY + 5);
    ctx.quadraticCurveTo(cx + 4, mouthY + 16, cx + 20, mouthY + 1);
    ctx.quadraticCurveTo(cx + 4, mouthY + 6, cx - 12, mouthY + 5);
    ctx.fillStyle = rgba(lipInk, 0.45);
    ctx.fill();
  } else {
    taper(ctx, [[cx - 19, mouthY], [cx, mouthY + 14], [cx + 19, mouthY]], [0, 5.4, 0], lipInk);
  }
  ctx.beginPath();
  ctx.ellipse(cx + 3, mouthY + 14, 8, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
}

// ── причёска ─────────────────────────────────────────────────
export interface HairPack {
  base: CanvasGradient;
  mid: string;
  cel: string;
  deep: string;
  line: string;
  tip: string;
  shine: string;
}

export function hairPack(ctx: CanvasRenderingContext2D, look: Appearance): HairPack {
  const c = hex(look.hairColor);
  const lum = (c.r * 0.299 + c.g * 0.587 + c.b * 0.114) / 255;
  return {
    base: linear(ctx, 120, 96, 390, 560, [
      [0, light(look.hairColor, 0.28)],
      [0.4, look.hairColor],
      [1, dark(look.hairColor, 0.34)],
    ]),
    mid: look.hairColor,
    cel: dark(mix(look.hairColor, '#4a2d6a', 0.24), 0.22),
    deep: dark(mix(look.hairColor, '#2c1a44', 0.32), 0.38),
    line: ink(look.hairColor, 0.42 + lum * 0.3),
    tip: look.hairColor2,
    shine: light(look.hairColor2, 0.32),
  };
}

/** Прядь: острый верх, широкая середина, острый кончик */
export function strandPts(x: number, w: number, yTop: number, yTip: number, bow: number): P[] {
  const mid = yTop + (yTip - yTop) * 0.4;
  return [
    [x, yTop],
    [x - w * 0.46 + bow * 0.3, mid - (mid - yTop) * 0.3],
    [x - w * 0.5 + bow * 0.6, mid + (yTip - mid) * 0.4],
    [x + bow, yTip],
    [x + w * 0.5 + bow * 0.6, mid + (yTip - mid) * 0.35],
    [x + w * 0.46 + bow * 0.3, mid - (mid - yTop) * 0.3],
  ];
}

export function drawStrand(
  ctx: CanvasRenderingContext2D,
  f: HairPack,
  pts: P[],
  fill: string | CanvasGradient,
  shineAt?: [number, number, number, number],
): void {
  shape(ctx, pts);
  ctx.fillStyle = fill;
  ctx.fill();
  shapeInk(ctx, pts, f.line, 1.2, 3.6);
  if (shineAt) {
    ctx.save();
    shape(ctx, pts);
    ctx.clip();
    taper(
      ctx,
      [
        [shineAt[0], shineAt[1]],
        [(shineAt[0] + shineAt[2]) / 2 + 4, (shineAt[1] + shineAt[3]) / 2],
        [shineAt[2], shineAt[3]],
      ],
      [0, 9, 0],
      rgba(f.shine, 0.62),
    );
    ctx.restore();
  }
}

export function drawBackHair(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const f = hairPack(ctx, look);
  const H = look.hair;

  const mass = (pts: P[], fill: string | CanvasGradient = f.base) => {
    shape(ctx, pts);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.save();
    shape(ctx, pts);
    ctx.clip();
    shape(ctx, [
      [300, 120],
      [420, 200],
      [430, 640],
      [250, 660],
      [286, 380],
    ]);
    ctx.fillStyle = rgba(f.cel, 0.9);
    ctx.fill();
    ctx.restore();
    shapeInk(ctx, pts, f.line, 1.6, 4.4);
  };

  if (H === 'short') {
    mass([[240, 108], [344, 172], [354, 300], [326, 356], [240, 372], [152, 356], [126, 300], [136, 172]]);
  } else if (H === 'bob') {
    mass([[240, 100], [350, 168], [366, 330], [348, 420], [298, 440], [240, 424], [182, 440], [130, 420], [114, 330], [130, 168]]);
  } else if (H === 'buns') {
    mass([[240, 104], [346, 172], [358, 320], [334, 396], [240, 410], [146, 396], [122, 320], [134, 172]]);
    for (const s of [-1, 1]) {
      const bx = 240 + s * 128;
      const bun: P[] = [
        [bx, 92], [bx + 56, 122], [bx + 50, 186], [bx, 208], [bx - 52, 184], [bx - 58, 122],
      ];
      shape(ctx, bun);
      ctx.fillStyle = f.base;
      ctx.fill();
      ctx.save();
      shape(ctx, bun);
      ctx.clip();
      // витки пучка
      for (let i = 0; i < 3; i++) {
        taper(
          ctx,
          [
            [bx - 50 + i * 8, 150 + i * 14],
            [bx, 176 + i * 12],
            [bx + 50 - i * 8, 148 + i * 14],
          ],
          [0, 5, 0],
          rgba(f.cel, 0.8),
        );
      }
      taper(ctx, [[bx - 34, 120], [bx - 4, 108], [bx + 28, 124]], [0, 10, 0], rgba(f.shine, 0.6));
      ctx.restore();
      shapeInk(ctx, bun, f.line, 1.4, 4);
    }
  } else if (H === 'twin') {
    mass([[240, 102], [346, 170], [358, 318], [328, 380], [240, 396], [152, 380], [122, 318], [134, 170]]);
    for (const s of [-1, 1]) {
      const bx = 240 + s * 152;
      for (let k = 0; k < 3; k++) {
        const off = (k - 1) * 22 * s;
        drawStrand(
          ctx,
          f,
          strandPts(bx + off, 76 - k * 14, 196 + k * 16, 560 + k * 34, s * (36 - k * 10)),
          k === 1 ? f.base : k === 0 ? f.mid : f.cel,
          k === 1 ? [bx + off - 10, 250, bx + off + s * 14, 470] : undefined,
        );
      }
      const band: P[] = [[bx - 46, 190], [bx + 46, 198], [bx + 40, 224], [bx - 44, 216]];
      shape(ctx, band);
      ctx.fillStyle = look.outfitTrim;
      ctx.fill();
      shapeInk(ctx, band, ink(look.outfitTrim, 0.5), 1.2, 3);
    }
  } else if (H === 'ponytail') {
    mass([[240, 102], [342, 170], [354, 310], [324, 370], [240, 386], [156, 370], [126, 310], [138, 170]]);
    for (let k = 0; k < 3; k++) {
      drawStrand(
        ctx,
        f,
        strandPts(360 + k * 26, 92 - k * 18, 200 + k * 14, 570 + k * 26, 46 - k * 12),
        k === 0 ? f.base : k === 1 ? f.mid : f.cel,
        k === 0 ? [352, 260, 400, 470] : undefined,
      );
    }
    const band: P[] = [[318, 190], [376, 206], [366, 234], [310, 218]];
    shape(ctx, band);
    ctx.fillStyle = look.outfitTrim;
    ctx.fill();
    shapeInk(ctx, band, ink(look.outfitTrim, 0.5), 1.2, 3);
  } else if (H === 'braid') {
    mass([[240, 102], [344, 170], [356, 320], [328, 392], [240, 408], [152, 392], [124, 320], [136, 170]]);
    let bx = 322;
    let by = 396;
    for (let i = 0; i < 7; i++) {
      const rr = 32 - i * 2.6;
      const seg: P[] = [
        [bx - rr, by],
        [bx, by - rr * 0.75],
        [bx + rr, by],
        [bx, by + rr * 0.8],
      ];
      shape(ctx, seg);
      ctx.fillStyle = i % 2 ? f.base : light(look.hairColor, 0.16);
      ctx.fill();
      shapeInk(ctx, seg, f.line, 1.1, 3);
      bx += 7;
      by += 38;
    }
    drawStrand(ctx, f, strandPts(bx, 34, by - 30, by + 46, 4), f.tip);
  } else if (H === 'wavy') {
    mass([
      [240, 98], [352, 166], [380, 300], [352, 380], [386, 462], [350, 542], [378, 632],
      [240, 636], [102, 632], [130, 542], [94, 462], [128, 380], [100, 300], [128, 166],
    ]);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        drawStrand(
          ctx,
          f,
          strandPts(240 + s * (128 + k * 32), 54 - k * 14, 238 + k * 28, 604 + k * 18, s * (16 + k * 12)),
          k === 0 ? f.mid : f.cel,
          k === 0 ? [240 + s * (120 + k * 30), 300, 240 + s * (134 + k * 30), 520] : undefined,
        );
      }
    }
  } else {
    mass([[240, 98], [352, 164], [378, 300], [386, 442], [372, 632], [240, 636], [108, 632], [94, 442], [102, 300], [128, 164]]);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        drawStrand(
          ctx,
          f,
          strandPts(240 + s * (122 + k * 38), 56 - k * 16, 218 + k * 32, 596 + k * 28, s * (12 + k * 10)),
          k === 0 ? f.mid : f.cel,
          k === 0 ? [240 + s * 114, 290, 240 + s * 130, 520] : undefined,
        );
      }
    }
  }

  // внутренние прядевые линии
  for (let i = 0; i < 7; i++) {
    const x = 126 + i * 38 + rnd() * 8;
    taper(
      ctx,
      [
        [x, 214],
        [x + (x - 240) * 0.1, 380],
        [x + (x - 240) * 0.22, 560],
      ],
      [0, 3.2, 0],
      rgba(f.line, 0.26),
    );
  }
}

function bangsPts(): P[] {
  return [
    [136, 252],
    [140, 168],
    [190, 110],
    [240, 100],
    [292, 110],
    [342, 168],
    [346, 252],
    [318, 236],
    [300, 266],
    [272, 244],
    [240, 258],
    [208, 244],
    [180, 266],
    [162, 236],
  ];
}

export function drawFrontHair(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const f = hairPack(ctx, look);

  // основная масса чёлки
  shape(ctx, bangsPts());
  ctx.fillStyle = f.base;
  ctx.fill();
  ctx.save();
  shape(ctx, bangsPts());
  ctx.clip();
  shape(ctx, [[288, 100], [352, 156], [352, 262], [286, 264], [300, 180]]);
  ctx.fillStyle = rgba(f.cel, 0.85);
  ctx.fill();
  ctx.restore();
  shapeInk(ctx, bangsPts(), f.line, 1.6, 4.4);

  // пряди чёлки: девять штук разной длины
  const tips: [number, number, number, number, number][] = [
    [150, 52, 180, 330, -24],
    [184, 44, 166, 258, -15],
    [214, 54, 156, 276, -6],
    [246, 46, 152, 244, 6],
    [276, 54, 156, 284, 15],
    [308, 44, 168, 252, 22],
    [336, 50, 184, 318, 28],
  ];
  tips.forEach((t, i) => {
    const jitter = (rnd() - 0.5) * 10;
    drawStrand(
      ctx,
      f,
      strandPts(t[0], t[1], t[2], t[3] + jitter, t[4]),
      i % 3 === 0 ? light(look.hairColor, 0.12) : i % 3 === 1 ? f.base : f.mid,
      i === 2 || i === 5 ? [t[0] - 10, t[2] + 40, t[0] + t[4] * 0.5, t[3] * 0.72] : undefined,
    );
  });

  // блик-лента поверх чёлки
  ctx.save();
  shape(ctx, bangsPts());
  ctx.clip();
  const zig: P[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = 148 + (i / 10) * 184;
    zig.push([x, 186 - Math.sin((i / 10) * Math.PI) * 24 + (i % 2 ? 11 : -3)]);
  }
  taper(ctx, zig, [0, 12, 15, 13, 0], rgba(f.shine, 0.72), 6);
  ctx.restore();

  // боковые пряди у лица
  for (const s of [-1, 1]) {
    const x = 240 + s * 94;
    for (let k = 0; k < 3; k++) {
      drawStrand(
        ctx,
        f,
        strandPts(x + s * k * 11, 22 - k * 5, 166 + k * 20, 512 + k * 46, s * (6 + k * 6)),
        k === 0 ? f.base : k === 1 ? f.mid : f.cel,
        k === 0 ? [x - s * 4, 236, x + s * 8, 420] : undefined,
      );
    }
    drawStrand(ctx, f, strandPts(x + s * 14, 14, 470, 588, s * 5), f.tip);
  }
}

// ── костюм ───────────────────────────────────────────────────
type Neck = 'plunge' | 'underbust' | 'band' | 'keyhole' | 'wrap';

const NECK_OF: Record<string, Neck> = {
  leotard: 'plunge',
  plate: 'underbust',
  harness: 'underbust',
  coat: 'plunge',
  slit: 'plunge',
  robe: 'underbust',
  sarashi: 'band',
  qipao: 'keyhole',
};

function garmentPts(neck: Neck): P[] {
  const base: P[] = [[14, DH + 40], [28, 588], [64, 528], [126, 504]];
  const tail: P[] = [[354, 504], [416, 528], [448, 584], [464, DH + 40]];
  let mid: P[] = [];
  switch (neck) {
    case 'plunge':
      mid = [[172, 500], [200, 566], [220, 622], [240, 648], [260, 622], [280, 566], [308, 500]];
      break;
    case 'underbust':
      mid = [[168, 552], [196, 610], [240, 634], [284, 610], [312, 552]];
      break;
    case 'band':
      mid = [[180, 540], [240, 560], [300, 540]];
      break;
    case 'wrap':
      mid = [[184, 494], [216, 566], [240, 606], [300, 542], [330, 490]];
      break;
    default:
      mid = [[200, 470], [240, 508], [280, 470]];
      break;
  }
  return [...base, ...mid, ...tail];
}

function necklinePts(neck: Neck): P[] {
  const g = garmentPts(neck);
  return g.slice(3, g.length - 3);
}

function drawOutfit(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const c = look.outfit;
  const tr = look.outfitTrim;
  const st = look.outfitStyle;
  const neck = NECK_OF[st] ?? 'plunge';
  const cline = ink(c, 0.46);
  const tline = ink(tr, 0.46);
  const cel = dark(mix(c, '#3d2456', 0.26), 0.2);
  const deep = dark(mix(c, '#251440', 0.34), 0.36);
  const base = linear(ctx, 100, 490, 400, DH, [
    [0, light(c, 0.28)],
    [0.45, c],
    [1, dark(c, 0.3)],
  ]);
  const metal = linear(ctx, 100, 490, 400, DH, [
    [0, light(tr, 0.7)],
    [0.32, light(tr, 0.1)],
    [0.6, dark(tr, 0.16)],
    [1, light(tr, 0.32)],
  ]);

  // плащ
  if (st === 'coat' || st === 'robe' || st === 'slit') {
    for (const s of [-1, 1]) {
      const cape: P[] = [
        [240 + s * 136, 480],
        [240 + s * 244, 552],
        [240 + s * 258, DH + 20],
        [240 + s * 116, DH + 20],
        [240 + s * 102, 566],
      ];
      shape(ctx, cape);
      ctx.fillStyle = st === 'robe' ? rgba(tr, 0.42) : linear(ctx, 120, 476, 400, DH, [[0, light(c, 0.04)], [1, dark(c, 0.5)]]);
      ctx.fill();
      shapeInk(ctx, cape, cline, 1.4, 3.8);
      for (let i = 0; i < 3; i++) {
        taper(
          ctx,
          [
            [240 + s * (150 + i * 30), 520 + i * 14],
            [240 + s * (176 + i * 30), 580 + i * 10],
            [240 + s * (186 + i * 30), DH],
          ],
          [0, 3.4, 2],
          rgba(cline, 0.35),
        );
      }
    }
  }

  if (st === 'sarashi') {
    for (let i = 0; i < 3; i++) {
      const y = 552 + i * 27;
      const wrap: P[] = [
        [104, y - 36],
        [240, y + 6],
        [376, y - 36],
        [376, y - 8],
        [240, y + 34],
        [104, y - 8],
      ];
      shape(ctx, wrap);
      ctx.fillStyle = i % 2 ? light(c, 0.22) : c;
      ctx.fill();
      shapeInk(ctx, wrap, cline, 1.1, 3);
    }
    taper(ctx, [[240, 540], [238, 600], [240, DH]], [0, 5, 4], rgba(tline, 0.65));
  } else {
    const g = garmentPts(neck);
    shape(ctx, g);
    ctx.fillStyle = st === 'plate' ? metal : base;
    ctx.fill();
    ctx.save();
    shape(ctx, g);
    ctx.clip();
    shape(ctx, [[310, 480], [400, 512], [462, 566], [478, DH + 40], [322, DH + 40], [334, 556]]);
    ctx.fillStyle = cel;
    ctx.fill();
    // складки
    for (const x of [88, 132, 348, 396]) {
      taper(
        ctx,
        [
          [x, 512],
          [x + (x - 240) * 0.08, 570],
          [x + (x - 240) * 0.18, DH],
        ],
        [0, 4, 2.4],
        rgba(deep, 0.5),
      );
    }
    ctx.restore();
    shapeInk(ctx, g, cline, 1.8, 4.6);

    // кант выреза
    const nl = spline(necklinePts(neck), 10);
    const drawNeck = (color: string, w: number) => {
      ctx.beginPath();
      ctx.moveTo(nl[0][0], nl[0][1]);
      for (let i = 1; i < nl.length; i++) ctx.lineTo(nl[i][0], nl[i][1]);
      stroke(ctx, color, w);
    };
    drawNeck(tr, 10);
    drawNeck(rgba('#ffffff', 0.4), 3.2);
    drawNeck(rgba(tline, 0.45), 1.4);
  }

  if (st === 'plate') {
    for (const s of [-1, 1]) {
      const pl: P[] = [
        [240 + s * 168, 556],
        [240 + s * 252, 590],
        [240 + s * 256, DH + 20],
        [240 + s * 166, DH + 20],
      ];
      shape(ctx, pl);
      ctx.fillStyle = metal;
      ctx.fill();
      shapeInk(ctx, pl, tline, 1.4, 4);
      taper(
        ctx,
        [
          [240 + s * 182, 574],
          [240 + s * 236, 606],
        ],
        [0, 5],
        rgba('#ffffff', 0.5),
      );
    }
    const gem: P[] = [[240, 604], [258, 622], [240, 642], [222, 622]];
    shape(ctx, gem);
    ctx.fillStyle = light(look.aura, 0.1);
    ctx.fill();
    shapeInk(ctx, gem, tline, 1.2, 3);
  }

  if (st === 'harness') {
    for (const s of [-1, 1]) {
      const strap: P[] = [
        [240 + s * 2, 492],
        [240 + s * 36, 490],
        [240 + s * 176, DH],
        [240 + s * 132, DH],
      ];
      shape(ctx, strap);
      ctx.fillStyle = dark(tr, 0.06);
      ctx.fill();
      shapeInk(ctx, strap, tline, 1.2, 3.4);
      taper(ctx, [[240 + s * 74, 526], [240 + s * 118, DH]], [7, 8], tr);
    }
    const ring: P[] = [[240, 504], [258, 522], [240, 540], [222, 522]];
    shape(ctx, ring);
    ctx.fillStyle = dark(tr, 0.12);
    ctx.fill();
    shapeInk(ctx, ring, tline, 1.2, 3);
  }

  if (st === 'leotard' || st === 'slit') {
    for (const s of [-1, 1]) {
      const band: P[] = [
        [240 + s * 48, 516],
        [240 + s * 128, 496],
        [240 + s * 182, 596],
        [240 + s * 162, 618],
        [240 + s * 116, 522],
        [240 + s * 44, 540],
      ];
      shape(ctx, band);
      ctx.fillStyle = c;
      ctx.fill();
      shapeInk(ctx, band, cline, 1.1, 3);
    }
  }

  if (st === 'qipao') {
    const collar: P[] = [[204, 410], [276, 410], [278, 440], [240, 466], [202, 440]];
    shape(ctx, collar);
    ctx.fillStyle = c;
    ctx.fill();
    shapeInk(ctx, collar, cline, 1.2, 3.4);
    const key: P[] = [[240, 512], [280, 552], [272, 608], [240, 626], [208, 608], [200, 552]];
    shape(ctx, key);
    ctx.fillStyle = look.skin;
    ctx.fill();
    shapeInk(ctx, key, cline, 1.4, 3.8);
    for (let i = 0; i < 3; i++) {
      const b: P[] = [[302 + i * 10, 534 + i * 28], [314 + i * 10, 546 + i * 28], [302 + i * 10, 558 + i * 28], [290 + i * 10, 546 + i * 28]];
      shape(ctx, b);
      ctx.fillStyle = tr;
      ctx.fill();
      shapeInk(ctx, b, tline, 1, 2.4);
    }
  }

  // чокер
  if (st !== 'qipao') {
    const ch: P[] = [[210, 416], [270, 416], [272, 436], [240, 456], [208, 436]];
    shape(ctx, ch);
    ctx.fillStyle = dark(tr, 0.14);
    ctx.fill();
    shapeInk(ctx, ch, tline, 1.2, 3.4);
    const pend: P[] = [[240, 452], [251, 466], [240, 482], [229, 466]];
    shape(ctx, pend);
    ctx.fillStyle = light(look.aura, 0.16);
    ctx.fill();
    shapeInk(ctx, pend, tline, 1, 2.6);
    taper(ctx, [[240, 482], [240, 508]], [2.2, 1.2], rgba(tline, 0.7));
  }

  void rnd;
}

// ── аксессуары ───────────────────────────────────────────────
export function drawAccessory(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const tr = look.outfitTrim;
  const tline = ink(tr, 0.46);
  const f = hairPack(ctx, look);

  const piece = (pts: P[], fill: string | CanvasGradient, line = tline) => {
    shape(ctx, pts);
    ctx.fillStyle = fill;
    ctx.fill();
    shapeInk(ctx, pts, line, 1.3, 3.8);
  };

  switch (look.accessory) {
    case 'horns':
      for (const s of [-1, 1]) {
        piece(
          [
            [240 + s * 64, 156],
            [240 + s * 100, 108],
            [240 + s * 128, 62],
            [240 + s * 142, 92],
            [240 + s * 116, 138],
            [240 + s * 96, 180],
          ],
          linear(ctx, 200, 60, 300, 190, [[0, light(tr, 0.55)], [0.5, tr], [1, dark(tr, 0.4)]]),
        );
      }
      break;
    case 'halo':
      ctx.beginPath();
      ctx.ellipse(240, 72, 112, 28, 0, 0, Math.PI * 2);
      stroke(ctx, rgba(look.aura, 0.9), 13);
      ctx.beginPath();
      ctx.ellipse(240, 72, 112, 28, 0, 0, Math.PI * 2);
      stroke(ctx, 'rgba(255,255,255,0.9)', 4.5);
      break;
    case 'ears':
      for (const s of [-1, 1]) {
        piece([[240 + s * 50, 148], [240 + s * 70, 76], [240 + s * 86, 40], [240 + s * 134, 128], [240 + s * 96, 142]], f.base, f.line);
        piece([[240 + s * 68, 134], [240 + s * 86, 78], [240 + s * 114, 124]], '#ffa8cf', ink('#ffa8cf', 0.4));
      }
      break;
    case 'crown':
      piece(
        [[146, 154], [168, 82], [202, 128], [240, 58], [278, 128], [312, 82], [334, 154], [240, 168]],
        linear(ctx, 150, 60, 330, 160, [[0, light(tr, 0.65)], [0.45, tr], [1, dark(tr, 0.36)]]),
      );
      piece([[240, 98], [258, 116], [240, 138], [222, 116]], light(look.aura, 0.12));
      break;
    case 'visor':
      piece([[132, 240], [240, 190], [348, 240], [348, 258], [240, 212], [132, 258]], dark(tr, 0.12));
      piece([[318, 216], [346, 226], [340, 252], [312, 242]], light(look.aura, 0.2));
      break;
    case 'hairpin': {
      const px = 322;
      const py = 194;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - 0.6;
        piece(
          [
            [px + Math.cos(a) * 12, py + Math.sin(a) * 12],
            [px + Math.cos(a - 0.5) * 30, py + Math.sin(a - 0.5) * 30],
            [px + Math.cos(a) * 42, py + Math.sin(a) * 42],
            [px + Math.cos(a + 0.5) * 30, py + Math.sin(a + 0.5) * 30],
          ],
          i % 2 ? light(tr, 0.3) : tr,
        );
      }
      piece([[px, py - 13], [px + 13, py], [px, py + 13], [px - 13, py]], light(look.aura, 0.12));
      break;
    }
    case 'veil':
      piece([[122, 242], [180, 158], [240, 130], [300, 158], [358, 242], [300, 190], [240, 174], [180, 190]], rgba(tr, 0.5), rgba(tline, 0.55));
      break;
    default:
      break;
  }
}

// ── контровой свет ───────────────────────────────────────────
function drawRimLight(ctx: CanvasRenderingContext2D, look: Appearance): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const c = rgba(light(look.aura, 0.5), 0.85);
  taper(ctx, [[150, 190], [136, 250], [152, 320]], [0, 5, 0], c);
  taper(ctx, [[118, 490], [66, 520], [34, 580]], [0, 6, 3], c);
  taper(ctx, [[128, 210], [116, 300], [124, 420]], [0, 4, 0], rgba(light(look.aura, 0.5), 0.55));
  ctx.restore();
}

// ── финальные штрихи ─────────────────────────────────────────
function drawFinish(ctx: CanvasRenderingContext2D, rnd: () => number): void {
  ctx.fillStyle = radial(ctx, 240, 300, 190, 440, [
    [0, 'rgba(40,24,64,0)'],
    [1, 'rgba(40,24,64,0.3)'],
  ]);
  ctx.fillRect(0, 0, DW, DH);

  for (let i = 0; i < 8; i++) {
    const x = rnd() * DW;
    const y = 50 + rnd() * 470;
    const r = 2.5 + rnd() * 5.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(r * 0.5, r * 0.5, 0, r * 3.4);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.5, 0, 0);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fill();
    ctx.restore();
  }
}

import type { Appearance } from '../../game/types';
import {
  blob,
  dark,
  grain,
  hatch,
  hex,
  ink,
  inked,
  light,
  linear,
  mix,
  poly,
  radial,
  rgba,
  seeded,
  shadowOf,
  stroke,
  type P,
} from './paint';

/** Проектное пространство рисунка — всё считается в нём, потом масштабируется */
export const DW = 480;
export const DH = 640;

const HEAD = {
  cx: 240,
  top: 132,
  chin: 372,
  eyeY: 294,
  eyeDX: 44,
  eyeRX: 37,
  eyeRY: 35,
  browY: 232,
  mouthY: 345,
  neckTop: 356,
};

function faceOutline(): P[] {
  const { cx, top, chin } = HEAD;
  return [
    [cx, top],
    [cx + 56, top + 12],
    [cx + 82, top + 74],
    [cx + 84, 258],
    [cx + 64, 322],
    [cx + 28, 356],
    [cx, chin],
    [cx - 28, 356],
    [cx - 64, 322],
    [cx - 84, 258],
    [cx - 82, top + 74],
    [cx - 56, top + 12],
  ];
}

const TORSO: P[] = [
  [16, DH + 60],
  [34, 572],
  [58, 514],
  [118, 488],
  [186, 474],
  [240, 470],
  [294, 474],
  [362, 488],
  [422, 514],
  [446, 572],
  [464, DH + 60],
];

export interface PortraitStyle {
  sultry?: number;
}

/**
 * Рисованный аниме-портрет: заливка, жёсткая cel-тень, штриховка в глубоких тенях,
 * контур переменной толщины и зерно поверх кадра. Все черты берутся из Appearance,
 * поэтому лист референсов всегда синхронен с данными игры.
 */
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

  drawBackHair(ctx, look);
  drawBody(ctx, look);
  drawOutfit(ctx, look);
  drawHead(ctx, look);
  drawFace(ctx, look, sultry);
  drawFrontHair(ctx, look);
  drawAccessory(ctx, look);
  drawRimLight(ctx, look);
  ctx.restore();

  drawFinish(ctx, rnd);
  grain(ctx, DW, DH, 0.055);
  ctx.restore();
}

// ── фон ──────────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  ctx.fillStyle = linear(ctx, 0, 0, 0, DH, [
    [0, light(look.aura, 0.58)],
    [0.5, light(look.aura, 0.88)],
    [1, light(look.aura, 0.7)],
  ]);
  ctx.fillRect(0, 0, DW, DH);

  ctx.fillStyle = radial(ctx, 240, 250, 20, 280, [
    [0, rgba(light(look.aura, 0.6), 0.95)],
    [0.55, rgba(light(look.aura, 0.2), 0.3)],
    [1, rgba(look.aura, 0)],
  ]);
  ctx.fillRect(0, 0, DW, DH);

  // «скоростные» полосы за спиной
  ctx.save();
  ctx.translate(240, 250);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rnd() * 0.3;
    const r0 = 130 + rnd() * 60;
    const r1 = r0 + 90 + rnd() * 150;
    const wdt = 0.006 + rnd() * 0.016;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.95);
    ctx.lineTo(Math.cos(a + wdt) * r1, Math.sin(a + wdt) * r1 * 0.95);
    ctx.lineTo(Math.cos(a - wdt) * r1, Math.sin(a - wdt) * r1 * 0.95);
    ctx.closePath();
    ctx.fillStyle = rgba(look.aura, 0.07 + rnd() * 0.06);
    ctx.fill();
  }
  ctx.restore();

  const h = hatch(ctx, look.aura, 0.1, 9, 2);
  if (h) {
    ctx.save();
    ctx.fillStyle = h;
    ctx.fillRect(0, DH - 190, DW, 190);
    ctx.restore();
  }

  for (let i = 0; i < 20; i++) {
    const x = rnd() * DW;
    const y = rnd() * DH;
    const r = 1.6 + rnd() * 4.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(light(look.aura, 0.5), 0.35 + rnd() * 0.3);
    ctx.fill();
  }
}

// ── тело ─────────────────────────────────────────────────────
function drawBody(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const skin = look.skin;
  const line = ink(skin, 0.6);
  const cel = shadowOf(skin, 0.3);
  const deep = shadowOf(dark(skin, 0.12), 0.34);
  const hp = hatch(ctx, ink(skin, 0.4), 0.16, 8, 1.7);

  // грудь под вырезом
  ctx.save();
  for (const s of [-1, 1]) {
    const bust = () => {
      ctx.beginPath();
      ctx.ellipse(240 + s * 47, 650, 78, 106, s * 0.1, 0, Math.PI * 2);
    };
    inked(ctx, bust, skin, line, 3, {
      path: () => {
        ctx.beginPath();
        ctx.ellipse(240 + s * 47 + 26, 664, 74, 100, s * 0.1, 0, Math.PI * 2);
      },
      style: cel,
    });
  }
  ctx.restore();

  // торс
  const torso = () => blob(ctx, TORSO);
  inked(ctx, torso, skin, line, 3.6, {
    path: () => {
      blob(ctx, [
        [300, 470],
        [372, 486],
        [430, 516],
        [452, 572],
        [470, DH + 60],
        [318, DH + 60],
        [330, 540],
      ]);
    },
    style: cel,
  });

  // тень от подбородка и шеи
  ctx.save();
  torso();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(178, 476);
  ctx.quadraticCurveTo(240, 552, 306, 476);
  ctx.quadraticCurveTo(240, 512, 178, 476);
  ctx.closePath();
  ctx.fillStyle = deep;
  ctx.fill();
  if (hp) {
    ctx.fillStyle = hp;
    ctx.beginPath();
    ctx.moveTo(178, 476);
    ctx.quadraticCurveTo(240, 556, 306, 476);
    ctx.quadraticCurveTo(240, 516, 178, 476);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // ключицы
  ctx.beginPath();
  ctx.moveTo(140, 506);
  ctx.quadraticCurveTo(184, 528, 230, 518);
  stroke(ctx, rgba(line, 0.5), 3.4);
  ctx.beginPath();
  ctx.moveTo(340, 506);
  ctx.quadraticCurveTo(296, 528, 250, 518);
  stroke(ctx, rgba(line, 0.5), 3.4);

  // ложбинка
  ctx.beginPath();
  ctx.moveTo(240, 572);
  ctx.quadraticCurveTo(233, 608, 240, DH);
  stroke(ctx, rgba(line, 0.7), 4.5);

  // шея
  const neck = () => {
    blob(ctx, [
      [212, HEAD.neckTop - 10],
      [268, HEAD.neckTop - 10],
      [274, 430],
      [240, 470],
      [206, 430],
    ]);
  };
  inked(ctx, neck, mix(skin, '#c98fa8', 0.08), line, 3.2, {
    path: () => {
      blob(ctx, [
        [210, HEAD.neckTop - 12],
        [270, HEAD.neckTop - 12],
        [272, 404],
        [240, 424],
        [208, 404],
      ]);
    },
    style: deep,
  });
}

// ── голова ───────────────────────────────────────────────────
function drawHead(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const skin = look.skin;
  const line = ink(skin, 0.6);
  const cel = shadowOf(skin, 0.28);

  const face = () => blob(ctx, faceOutline());
  inked(ctx, face, skin, line, 3.6, {
    path: () => {
      // жёсткая тень от чёлки: волнистая кромка над бровями
      ctx.beginPath();
      ctx.moveTo(150, 150);
      ctx.lineTo(334, 150);
      ctx.bezierCurveTo(330, 236, 314, 258, 298, 250);
      ctx.bezierCurveTo(282, 242, 268, 264, 254, 254);
      ctx.bezierCurveTo(246, 249, 242, 246, 240, 246);
      ctx.bezierCurveTo(236, 246, 232, 250, 224, 256);
      ctx.bezierCurveTo(208, 266, 196, 242, 180, 250);
      ctx.bezierCurveTo(164, 258, 152, 232, 150, 150);
      ctx.closePath();
    },
    style: cel,
  });

  // боковая тень справа
  ctx.save();
  face();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(292, 150);
  ctx.quadraticCurveTo(306, 260, 282, 340);
  ctx.lineTo(340, 372);
  ctx.lineTo(340, 140);
  ctx.closePath();
  ctx.fillStyle = rgba(cel, 0.75);
  ctx.fill();
  ctx.restore();

  // уши
  for (const s of [-1, 1]) {
    const ear = () => {
      ctx.beginPath();
      ctx.ellipse(240 + s * 88, 290, 14, 27, s * 0.16, 0, Math.PI * 2);
    };
    inked(ctx, ear, mix(skin, '#d09090', 0.14), line, 2.6);
  }
}

// ── лицо ─────────────────────────────────────────────────────
function eyePath(ctx: CanvasRenderingContext2D, w: number, h: number, lid: number): void {
  ctx.beginPath();
  ctx.moveTo(-w, h * 0.16);
  ctx.bezierCurveTo(-w * 0.6, -h * (1.05 - lid), w * 0.35, -h * (1.12 - lid), w, -h * 0.34);
  ctx.bezierCurveTo(w * 0.55, h * 0.72, -w * 0.35, h * 1.02, -w, h * 0.16);
  ctx.closePath();
}

function drawFace(ctx: CanvasRenderingContext2D, look: Appearance, sultry: number): void {
  const { cx, eyeY, eyeDX, eyeRX, eyeRY, browY, mouthY } = HEAD;
  const lash = ink(look.hairColor, 0.72);
  const lid = sultry * 0.2;

  // румянец: мягкое пятно + три штриха
  for (const s of [-1, 1]) {
    const bx = cx + s * 62;
    ctx.fillStyle = radial(ctx, bx, eyeY + 46, 4, 48, [
      [0, 'rgba(255,116,146,0.45)'],
      [1, 'rgba(255,116,146,0)'],
    ]);
    ctx.fillRect(bx - 52, eyeY, 104, 90);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(bx - 14 + i * 12, eyeY + 38 + i * 2);
      ctx.lineTo(bx - 7 + i * 12, eyeY + 51 + i * 2);
      stroke(ctx, 'rgba(226,86,116,0.32)', 2.6);
    }
  }

  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + s * eyeDX, eyeY);
    ctx.scale(s, 1);

    eyePath(ctx, eyeRX, eyeRY, lid);
    ctx.save();
    ctx.clip();

    ctx.fillStyle = '#fdfbff';
    ctx.fillRect(-eyeRX * 1.4, -eyeRY * 1.6, eyeRX * 2.8, eyeRY * 3.2);
    // тень от ресниц на белке
    ctx.fillStyle = linear(ctx, 0, -eyeRY, 0, -eyeRY * 0.2, [
      [0, rgba(mix(look.eyeColor, '#3a2450', 0.6), 0.35)],
      [1, rgba(mix(look.eyeColor, '#3a2450', 0.6), 0)],
    ]);
    ctx.fillRect(-eyeRX * 1.4, -eyeRY * 1.6, eyeRX * 2.8, eyeRY * 3.2);

    const irx = eyeRX * 0.68;
    const iry = eyeRY * 0.95;
    const iy = eyeRY * 0.06;

    // радужка
    ctx.beginPath();
    ctx.ellipse(-eyeRX * 0.04, iy, irx, iry, 0, 0, Math.PI * 2);
    ctx.fillStyle = linear(ctx, 0, iy - iry, 0, iy + iry, [
      [0, dark(look.eyeColor, 0.46)],
      [0.32, dark(look.eyeColor, 0.08)],
      [0.68, light(look.eyeColor, 0.16)],
      [1, light(look.eyeColor, 0.78)],
    ]);
    ctx.fill();
    // отражённый свет снизу
    ctx.beginPath();
    ctx.ellipse(-eyeRX * 0.04, iy + iry * 0.42, irx * 0.78, iry * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(light(look.eyeColor, 0.75), 0.75);
    ctx.fill();
    // вертикальные волокна
    ctx.strokeStyle = rgba(dark(look.eyeColor, 0.5), 0.3);
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(-eyeRX * 0.04 + Math.cos(a) * irx * 0.36, iy + Math.sin(a) * iry * 0.4);
      ctx.lineTo(-eyeRX * 0.04 + Math.cos(a) * irx * 0.92, iy + Math.sin(a) * iry * 0.95);
      ctx.stroke();
    }
    // зрачок
    ctx.beginPath();
    ctx.ellipse(-eyeRX * 0.04, iy, irx * 0.4, iry * 0.54, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#150c22';
    ctx.fill();
    // ободок радужки
    ctx.beginPath();
    ctx.ellipse(-eyeRX * 0.04, iy, irx, iry, 0, 0, Math.PI * 2);
    stroke(ctx, rgba(dark(look.eyeColor, 0.55), 0.55), 2.6);

    // блики
    ctx.beginPath();
    ctx.ellipse(-irx * 0.42, iy - iry * 0.46, irx * 0.5, iry * 0.38, -0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(irx * 0.52, iy + iry * 0.4, irx * 0.22, iry * 0.17, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(irx * 0.1, iy - iry * 0.1, irx * 0.12, iry * 0.09, 0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    ctx.restore();

    // верхнее веко: клин с утолщением у внешнего угла
    ctx.beginPath();
    ctx.moveTo(-eyeRX - 1, eyeRY * 0.16);
    ctx.bezierCurveTo(-eyeRX * 0.6, -eyeRY * (1.05 - lid), eyeRX * 0.35, -eyeRY * (1.12 - lid), eyeRX + 2, -eyeRY * 0.32);
    ctx.bezierCurveTo(eyeRX * 0.3, -eyeRY * (0.88 - lid), -eyeRX * 0.55, -eyeRY * (0.8 - lid), -eyeRX - 1, eyeRY * 0.16);
    ctx.closePath();
    ctx.fillStyle = lash;
    ctx.fill();

    // пучки ресниц
    for (const [x0, y0, x1, y1, w] of [
      [eyeRX * 0.86, -eyeRY * 0.32, eyeRX * 1.62, -eyeRY * 1.3, 8],
      [eyeRX * 0.46, -eyeRY * 0.98, eyeRX * 0.98, -eyeRY * 1.46, 5],
      [eyeRX * 0.02, -eyeRY * 1.1, eyeRX * 0.26, -eyeRY * 1.48, 4],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2 + 6, (y0 + y1) / 2, x1, y1);
      stroke(ctx, lash, w);
    }

    // нижнее веко
    ctx.beginPath();
    ctx.moveTo(-eyeRX * 0.7, eyeRY * 0.8);
    ctx.quadraticCurveTo(0, eyeRY * 1.14, eyeRX * 0.9, eyeRY * 0.58);
    stroke(ctx, rgba(lash, 0.6), 3.6);
    ctx.beginPath();
    ctx.moveTo(eyeRX * 0.9, eyeRY * 0.58);
    ctx.lineTo(eyeRX * 1.2, eyeRY * 0.3);
    stroke(ctx, rgba(lash, 0.45), 3);

    ctx.restore();
  }

  // брови
  for (const s of [-1, 1]) {
    const tilt = (sultry - 0.5) * 9;
    ctx.save();
    ctx.translate(cx + s * eyeDX, browY - tilt * 0.3);
    ctx.scale(s, 1);
    ctx.beginPath();
    ctx.moveTo(-eyeRX * 0.9, 9 + tilt * 0.5);
    ctx.quadraticCurveTo(-eyeRX * 0.1, -10 - tilt * 0.3, eyeRX * 0.95, 2 + tilt);
    ctx.quadraticCurveTo(-eyeRX * 0.1, -3 - tilt * 0.3, -eyeRX * 0.9, 9 + tilt * 0.5);
    ctx.closePath();
    ctx.fillStyle = ink(look.hairColor, 0.42);
    ctx.fill();
    ctx.restore();
  }

  // нос
  ctx.beginPath();
  ctx.moveTo(cx + 8, 318);
  ctx.quadraticCurveTo(cx + 15, 328, cx + 5, 332);
  stroke(ctx, rgba(ink(look.skin, 0.5), 0.55), 3.2);

  // рот
  const lipInk = mix(look.skin, '#a01f45', 0.75);
  if (sultry > 0.5) {
    ctx.beginPath();
    ctx.moveTo(cx - 20, mouthY + 2);
    ctx.quadraticCurveTo(cx + 1, mouthY + 12, cx + 25, mouthY - 7);
    stroke(ctx, lipInk, 4.8);
    ctx.beginPath();
    ctx.moveTo(cx - 11, mouthY + 5);
    ctx.quadraticCurveTo(cx + 4, mouthY + 15, cx + 19, mouthY + 1);
    ctx.quadraticCurveTo(cx + 4, mouthY + 6, cx - 11, mouthY + 5);
    ctx.fillStyle = rgba(lipInk, 0.5);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 18, mouthY);
    ctx.quadraticCurveTo(cx, mouthY + 15, cx + 18, mouthY);
    stroke(ctx, lipInk, 4.8);
  }
  // блик на нижней губе
  ctx.beginPath();
  ctx.ellipse(cx + 3, mouthY + 13, 8, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
}

// ── причёска ─────────────────────────────────────────────────
function hairPack(ctx: CanvasRenderingContext2D, look: Appearance) {
  const c = hex(look.hairColor);
  const lum = (c.r * 0.299 + c.g * 0.587 + c.b * 0.114) / 255;
  return {
    base: linear(ctx, 130, 100, 380, 540, [
      [0, light(look.hairColor, 0.24)],
      [0.45, look.hairColor],
      [1, dark(look.hairColor, 0.3)],
    ]),
    cel: dark(mix(look.hairColor, '#4a2d6a', 0.22), 0.24),
    line: ink(look.hairColor, 0.45 + lum * 0.28),
    tip: look.hairColor2,
    shine: light(look.hairColor2, 0.3),
  };
}

function drawBackHair(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const f = hairPack(ctx, look);
  const H = look.hair;

  const mass = (pts: P[], fillStyle: string | CanvasGradient = f.base) => {
    inked(ctx, () => blob(ctx, pts), fillStyle, f.line, 4);
  };

  if (H === 'short') {
    mass([[240, 106], [346, 168], [356, 300], [330, 356], [240, 372], [150, 356], [124, 300], [134, 168]]);
  } else if (H === 'bob') {
    mass([[240, 100], [352, 166], [368, 330], [352, 418], [300, 438], [240, 424], [180, 438], [128, 418], [112, 330], [128, 166]]);
  } else if (H === 'buns') {
    mass([[240, 104], [348, 170], [360, 320], [336, 396], [240, 410], [144, 396], [120, 320], [132, 170]]);
    for (const s of [-1, 1]) {
      const bx = 240 + s * 128;
      inked(ctx, () => { ctx.beginPath(); ctx.arc(bx, 148, 58, 0, Math.PI * 2); }, f.base, f.line, 4, {
        path: () => { ctx.beginPath(); ctx.arc(bx + s * 22, 168, 52, 0, Math.PI * 2); },
        style: f.cel,
      });
      ctx.beginPath();
      ctx.arc(bx - s * 16, 130, 26, -1.2, 1.1);
      stroke(ctx, rgba(f.shine, 0.65), 8);
      inked(ctx, () => { ctx.beginPath(); ctx.ellipse(bx, 198, 46, 17, 0, 0, Math.PI * 2); }, look.outfitTrim, ink(look.outfitTrim, 0.5), 3);
    }
  } else if (H === 'twin') {
    mass([[240, 102], [348, 168], [360, 318], [330, 380], [240, 396], [150, 380], [120, 318], [132, 168]]);
    for (const s of [-1, 1]) {
      const bx = 240 + s * 150;
      mass([
        [bx, 190], [bx + s * 62, 262], [bx + s * 54, 404], [bx + s * 24, 546],
        [bx - s * 10, 606], [bx - s * 48, 522], [bx - s * 40, 342], [bx - s * 32, 236],
      ]);
      inked(ctx, () => poly(ctx, [[bx - s * 8, 566], [bx + s * 22, 532], [bx + s * 2, 630]]), f.tip, f.line, 3);
      inked(ctx, () => { ctx.beginPath(); ctx.ellipse(bx + s * 6, 202, 48, 21, s * 0.3, 0, Math.PI * 2); }, look.outfitTrim, ink(look.outfitTrim, 0.5), 3);
    }
  } else if (H === 'ponytail') {
    mass([[240, 102], [344, 168], [356, 310], [326, 370], [240, 386], [154, 370], [124, 310], [136, 168]]);
    mass([[330, 190], [422, 240], [454, 362], [440, 492], [402, 590], [356, 548], [374, 420], [352, 300]]);
    inked(ctx, () => poly(ctx, [[372, 542], [414, 514], [398, 630]]), f.tip, f.line, 3);
    inked(ctx, () => { ctx.beginPath(); ctx.ellipse(346, 206, 42, 21, 0.5, 0, Math.PI * 2); }, look.outfitTrim, ink(look.outfitTrim, 0.5), 3);
  } else if (H === 'braid') {
    mass([[240, 102], [346, 168], [358, 320], [330, 392], [240, 408], [150, 392], [122, 320], [134, 168]]);
    let bx = 324;
    let by = 398;
    for (let i = 0; i < 6; i++) {
      const rr = 31 - i * 2.6;
      const rr2 = 25 - i * 1.8;
      inked(ctx, () => { ctx.beginPath(); ctx.ellipse(bx, by, rr, rr2, 0.5 + i * 0.06, 0, Math.PI * 2); },
        i % 2 ? f.base : light(look.hairColor, 0.14), f.line, 3);
      bx += 8;
      by += 40;
    }
    inked(ctx, () => poly(ctx, [[bx - 14, by - 26], [bx + 12, by - 30], [bx - 2, by + 36]]), f.tip, f.line, 3);
  } else if (H === 'wavy') {
    mass([
      [240, 98], [356, 164], [382, 300], [356, 380], [386, 460], [352, 540], [378, 630],
      [240, 630], [102, 630], [128, 540], [94, 460], [124, 380], [98, 300], [124, 164],
    ]);
    inked(ctx, () => blob(ctx, [[240, 566], [356, 560], [378, 630], [102, 630], [124, 560]]), rgba(f.tip, 0.65), f.line, 0);
  } else {
    mass([[240, 98], [354, 162], [378, 300], [386, 440], [372, 630], [240, 630], [108, 630], [94, 440], [102, 300], [126, 162]]);
    inked(ctx, () => blob(ctx, [[240, 556], [376, 544], [372, 630], [108, 630], [104, 544]]), rgba(f.tip, 0.6), f.line, 0);
  }

  // прядевые линии внутри массы
  ctx.save();
  ctx.strokeStyle = rgba(f.line, 0.3);
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const x = 130 + i * 44;
    ctx.beginPath();
    ctx.moveTo(x, 210);
    ctx.quadraticCurveTo(x + (x - 240) * 0.12, 400, x + (x - 240) * 0.24, 590);
    ctx.stroke();
  }
  ctx.restore();
}

/** Прядь-«лист»: острый верх, широкая середина, острый кончик */
function tip(ctx: CanvasRenderingContext2D, x: number, w: number, yTop: number, yTip: number, bow: number): void {
  const mid = yTop + (yTip - yTop) * 0.36;
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  ctx.bezierCurveTo(x - w * 0.42, yTop + (mid - yTop) * 0.7, x - w * 0.5 + bow * 0.4, mid, x - w * 0.34 + bow * 0.7, mid + (yTip - mid) * 0.55);
  ctx.quadraticCurveTo(x - w * 0.16 + bow, yTip - 8, x + bow, yTip);
  ctx.quadraticCurveTo(x + w * 0.22 + bow, yTip - 10, x + w * 0.38 + bow * 0.7, mid + (yTip - mid) * 0.5);
  ctx.bezierCurveTo(x + w * 0.52 + bow * 0.4, mid, x + w * 0.44, yTop + (mid - yTop) * 0.7, x, yTop);
  ctx.closePath();
}

function bangsPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(136, 250);
  ctx.bezierCurveTo(132, 158, 180, 104, 240, 102);
  ctx.bezierCurveTo(300, 104, 348, 158, 344, 250);
  ctx.bezierCurveTo(334, 242, 320, 276, 302, 266);
  ctx.bezierCurveTo(286, 258, 272, 284, 256, 272);
  ctx.bezierCurveTo(248, 266, 246, 262, 240, 262);
  ctx.bezierCurveTo(234, 262, 232, 266, 224, 272);
  ctx.bezierCurveTo(208, 284, 194, 258, 178, 266);
  ctx.bezierCurveTo(160, 276, 146, 242, 136, 250);
  ctx.closePath();
}

function drawFrontHair(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const f = hairPack(ctx, look);

  inked(ctx, () => bangsPath(ctx), f.base, f.line, 4, {
    path: () => {
      ctx.beginPath();
      ctx.moveTo(286, 104);
      ctx.bezierCurveTo(336, 140, 348, 190, 344, 250);
      ctx.bezierCurveTo(334, 242, 320, 276, 302, 266);
      ctx.bezierCurveTo(292, 262, 286, 268, 278, 268);
      ctx.bezierCurveTo(296, 200, 296, 150, 286, 104);
      ctx.closePath();
    },
    style: f.cel,
  });

  const tips: [number, number, number, number, number][] = [
    [156, 48, 196, 336, -16],
    [198, 46, 182, 306, -8],
    [240, 54, 176, 296, 0],
    [282, 46, 182, 308, 8],
    [324, 48, 196, 340, 16],
  ];
  tips.forEach((t, i) => {
    inked(ctx, () => tip(ctx, t[0], t[1], t[2], t[3], t[4]), i % 2 ? f.base : light(look.hairColor, 0.1), f.line, 3);
  });

  // жёсткий блик-лента с зубчатой кромкой
  ctx.save();
  bangsPath(ctx);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(150, 200);
  for (let i = 0; i <= 8; i++) {
    const x = 150 + (i / 8) * 180;
    const y = 178 - Math.sin((i / 8) * Math.PI) * 22 + (i % 2 ? 9 : 0);
    ctx.lineTo(x, y);
  }
  for (let i = 8; i >= 0; i--) {
    const x = 150 + (i / 8) * 180;
    const y = 206 - Math.sin((i / 8) * Math.PI) * 20 - (i % 2 ? 8 : 0);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(f.shine, 0.75);
  ctx.fill();
  ctx.restore();

  // боковые пряди
  for (const s of [-1, 1]) {
    const x = 240 + s * 92;
    inked(
      ctx,
      () =>
        blob(ctx, [
          [x - s * 24, 162], [x + s * 28, 240], [x + s * 32, 388],
          [x + s * 18, 506], [x - s * 14, 456], [x - s * 8, 314], [x - s * 30, 220],
        ]),
      f.base,
      f.line,
      3.4,
      s > 0 ? { path: () => blob(ctx, [[x + 6, 200], [x + 32, 300], [x + 20, 500], [x + 2, 470], [x + 12, 320]]), style: f.cel } : undefined,
    );
    inked(ctx, () => poly(ctx, [[x + s * 10, 466], [x + s * 32, 432], [x + s * 18, 534]]), f.tip, f.line, 3);
  }
}

// ── костюм ───────────────────────────────────────────────────
type Neck = 'plunge' | 'underbust' | 'band' | 'keyhole' | 'wrap';

function garmentPath(ctx: CanvasRenderingContext2D, neck: Neck): void {
  ctx.beginPath();
  ctx.moveTo(20, DH);
  ctx.lineTo(32, 592);
  ctx.quadraticCurveTo(64, 528, 126, 506);
  switch (neck) {
    case 'plunge':
      ctx.quadraticCurveTo(178, 494, 196, 574);
      ctx.quadraticCurveTo(240, DH + 10, 284, 574);
      ctx.quadraticCurveTo(302, 494, 354, 506);
      break;
    case 'underbust':
      ctx.quadraticCurveTo(176, 574, 200, 616);
      ctx.quadraticCurveTo(240, 640, 280, 616);
      ctx.quadraticCurveTo(304, 574, 354, 506);
      break;
    case 'band':
      ctx.quadraticCurveTo(240, 556, 354, 506);
      break;
    case 'wrap':
      ctx.quadraticCurveTo(190, 496, 232, 604);
      ctx.quadraticCurveTo(304, 528, 354, 486);
      break;
    default:
      ctx.quadraticCurveTo(206, 470, 240, 512);
      ctx.quadraticCurveTo(274, 470, 354, 506);
      break;
  }
  ctx.quadraticCurveTo(416, 528, 444, 586);
  ctx.lineTo(460, DH);
  ctx.closePath();
}

function necklineEdge(ctx: CanvasRenderingContext2D, neck: Neck): void {
  ctx.beginPath();
  ctx.moveTo(126, 506);
  switch (neck) {
    case 'plunge':
      ctx.quadraticCurveTo(178, 494, 196, 574);
      ctx.quadraticCurveTo(240, DH + 10, 284, 574);
      ctx.quadraticCurveTo(302, 494, 354, 506);
      break;
    case 'underbust':
      ctx.quadraticCurveTo(176, 574, 200, 616);
      ctx.quadraticCurveTo(240, 640, 280, 616);
      ctx.quadraticCurveTo(304, 574, 354, 506);
      break;
    case 'band':
      ctx.quadraticCurveTo(240, 556, 354, 506);
      break;
    case 'wrap':
      ctx.quadraticCurveTo(190, 496, 232, 604);
      ctx.quadraticCurveTo(304, 528, 354, 486);
      break;
    default:
      ctx.quadraticCurveTo(206, 470, 240, 512);
      ctx.quadraticCurveTo(274, 470, 354, 506);
      break;
  }
}

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

function drawOutfit(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const c = look.outfit;
  const t = look.outfitTrim;
  const st = look.outfitStyle;
  const neck = NECK_OF[st] ?? 'plunge';
  const cline = ink(c, 0.5);
  const tline = ink(t, 0.5);
  const base = linear(ctx, 110, 500, 400, DH, [
    [0, light(c, 0.26)],
    [0.5, c],
    [1, dark(c, 0.3)],
  ]);
  const metal = linear(ctx, 110, 500, 400, DH, [
    [0, light(t, 0.6)],
    [0.4, t],
    [1, dark(t, 0.32)],
  ]);
  const cel = dark(mix(c, '#3d2456', 0.24), 0.2);

  const choker = () => {
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(206, 436);
        ctx.quadraticCurveTo(240, 470, 274, 436);
        ctx.lineTo(276, 410);
        ctx.quadraticCurveTo(240, 444, 204, 410);
        ctx.closePath();
      },
      dark(t, 0.15),
      tline,
      3,
    );
    inked(ctx, () => { ctx.beginPath(); ctx.arc(240, 462, 13, 0, Math.PI * 2); }, light(look.aura, 0.2), tline, 2.6);
    // цепочка-подвеска
    ctx.beginPath();
    ctx.moveTo(240, 474);
    ctx.lineTo(240, 512);
    stroke(ctx, rgba(tline, 0.7), 2.6);
  };

  // плащ / накидка позади
  if (st === 'coat' || st === 'robe' || st === 'slit') {
    for (const s of [-1, 1]) {
      inked(
        ctx,
        () =>
          blob(ctx, [
            [240 + s * 134, 484], [240 + s * 240, 556], [240 + s * 254, DH + 20],
            [240 + s * 118, DH + 20], [240 + s * 104, 566],
          ]),
        st === 'robe' ? rgba(t, 0.42) : linear(ctx, 120, 480, 400, DH, [[0, light(c, 0.05)], [1, dark(c, 0.5)]]),
        cline,
        3.4,
      );
    }
  }

  if (st === 'sarashi') {
    for (let i = 0; i < 3; i++) {
      const y = 556 + i * 28;
      inked(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(112, y - 34);
          ctx.quadraticCurveTo(240, y + 6, 368, y - 34);
          ctx.lineTo(368, y - 8);
          ctx.quadraticCurveTo(240, y + 32, 112, y - 8);
          ctx.closePath();
        },
        i % 2 ? light(c, 0.2) : c,
        cline,
        2.8,
      );
    }
    ctx.beginPath();
    ctx.moveTo(240, 540);
    ctx.lineTo(240, DH);
    stroke(ctx, rgba(tline, 0.6), 4);
  } else {
    inked(ctx, () => garmentPath(ctx, neck), st === 'plate' ? metal : base, cline, 4, {
      path: () => blob(ctx, [[300, 470], [380, 500], [452, 560], [470, DH + 40], [320, DH + 40], [336, 560]]),
      style: cel,
    });
    // кант выреза
    necklineEdge(ctx, neck);
    stroke(ctx, t, 9);
    necklineEdge(ctx, neck);
    stroke(ctx, rgba('#ffffff', 0.4), 3);
    necklineEdge(ctx, neck);
    stroke(ctx, rgba(tline, 0.5), 1.6);
  }

  // складки ткани
  if (st !== 'plate' && st !== 'sarashi') {
    ctx.save();
    garmentPath(ctx, neck);
    ctx.clip();
    ctx.strokeStyle = rgba(cline, 0.32);
    ctx.lineWidth = 3;
    for (const x of [96, 140, 344, 392]) {
      ctx.beginPath();
      ctx.moveTo(x, 520);
      ctx.quadraticCurveTo(x + (x - 240) * 0.1, 580, x + (x - 240) * 0.2, DH);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (st === 'plate') {
    for (const s of [-1, 1]) {
      inked(
        ctx,
        () => blob(ctx, [[240 + s * 154, 490], [240 + s * 232, 534], [240 + s * 236, 616], [240 + s * 152, 574]]),
        metal,
        tline,
        3.6,
      );
    }
    inked(ctx, () => { ctx.beginPath(); ctx.arc(240, 604, 17, 0, Math.PI * 2); }, light(look.aura, 0.1), tline, 3);
  }

  if (st === 'harness') {
    for (const s of [-1, 1]) {
      inked(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(240 + s * 4, 496);
          ctx.lineTo(240 + s * 34, 492);
          ctx.lineTo(240 + s * 168, DH);
          ctx.lineTo(240 + s * 128, DH);
          ctx.closePath();
        },
        dark(t, 0.05),
        tline,
        3,
      );
      ctx.beginPath();
      ctx.moveTo(240 + s * 70, 528);
      ctx.lineTo(240 + s * 112, DH);
      stroke(ctx, t, 8);
    }
    inked(ctx, () => { ctx.beginPath(); ctx.arc(240, 522, 16, 0, Math.PI * 2); }, dark(t, 0.1), tline, 3);
  }

  if (st === 'leotard' || st === 'slit') {
    for (const s of [-1, 1]) {
      inked(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(240 + s * 52, 520);
          ctx.quadraticCurveTo(240 + s * 126, 500, 240 + s * 178, 598);
          ctx.lineTo(240 + s * 164, 616);
          ctx.quadraticCurveTo(240 + s * 118, 524, 240 + s * 46, 542);
          ctx.closePath();
        },
        c,
        cline,
        2.6,
      );
    }
  }

  if (st === 'qipao') {
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(198, 444);
        ctx.quadraticCurveTo(240, 478, 282, 444);
        ctx.lineTo(284, 406);
        ctx.quadraticCurveTo(240, 442, 196, 406);
        ctx.closePath();
      },
      c,
      cline,
      3,
    );
    // вырез-капля на груди
    inked(
      ctx,
      () => {
        ctx.beginPath();
        ctx.ellipse(240, 566, 38, 50, 0, 0, Math.PI * 2);
      },
      look.skin,
      cline,
      3,
    );
    for (let i = 0; i < 3; i++) {
      inked(ctx, () => { ctx.beginPath(); ctx.arc(300 + i * 10, 542 + i * 28, 8, 0, Math.PI * 2); }, t, tline, 2.2);
    }
  }

  if (st !== 'qipao') choker();
}

// ── аксессуары ───────────────────────────────────────────────
function drawAccessory(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const t = look.outfitTrim;
  const tline = ink(t, 0.5);
  const f = hairPack(ctx, look);

  switch (look.accessory) {
    case 'horns':
      for (const s of [-1, 1]) {
        inked(
          ctx,
          () => poly(ctx, [[240 + s * 66, 152], [240 + s * 124, 66], [240 + s * 142, 96], [240 + s * 98, 176]]),
          linear(ctx, 200, 60, 300, 180, [[0, light(t, 0.5)], [1, dark(t, 0.38)]]),
          tline,
          3.4,
        );
      }
      break;
    case 'halo':
      ctx.beginPath();
      ctx.ellipse(240, 74, 110, 27, 0, 0, Math.PI * 2);
      stroke(ctx, rgba(look.aura, 0.95), 12);
      ctx.beginPath();
      ctx.ellipse(240, 74, 110, 27, 0, 0, Math.PI * 2);
      stroke(ctx, 'rgba(255,255,255,0.85)', 4);
      break;
    case 'ears':
      for (const s of [-1, 1]) {
        inked(ctx, () => poly(ctx, [[240 + s * 52, 142], [240 + s * 78, 44], [240 + s * 130, 128]]), f.base, f.line, 4);
        inked(ctx, () => poly(ctx, [[240 + s * 68, 132], [240 + s * 84, 76], [240 + s * 114, 124]]), '#ffa8cf', ink('#ffa8cf', 0.4), 2.4);
      }
      break;
    case 'crown':
      inked(
        ctx,
        () => poly(ctx, [[148, 150], [172, 84], [204, 126], [240, 62], [276, 126], [308, 84], [332, 150]]),
        linear(ctx, 150, 70, 330, 150, [[0, light(t, 0.6)], [0.5, t], [1, dark(t, 0.32)]]),
        tline,
        3.4,
      );
      inked(ctx, () => { ctx.beginPath(); ctx.arc(240, 114, 14, 0, Math.PI * 2); }, light(look.aura, 0.12), tline, 2.6);
      break;
    case 'visor':
      ctx.beginPath();
      ctx.moveTo(138, 234);
      ctx.quadraticCurveTo(240, 192, 342, 234);
      stroke(ctx, dark(t, 0.12), 16);
      ctx.beginPath();
      ctx.moveTo(138, 234);
      ctx.quadraticCurveTo(240, 192, 342, 234);
      stroke(ctx, rgba('#ffffff', 0.35), 5);
      inked(ctx, () => { ctx.beginPath(); ctx.arc(332, 228, 16, 0, Math.PI * 2); }, light(look.aura, 0.2), tline, 2.6);
      break;
    case 'hairpin': {
      const px = 322;
      const py = 196;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        inked(
          ctx,
          () => { ctx.beginPath(); ctx.ellipse(px + Math.cos(a) * 25, py + Math.sin(a) * 25, 18, 13, a, 0, Math.PI * 2); },
          i % 2 ? light(t, 0.28) : t,
          tline,
          2.4,
        );
      }
      inked(ctx, () => { ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); }, light(look.aura, 0.1), tline, 2.4);
      break;
    }
    case 'veil':
      inked(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(124, 238);
          ctx.quadraticCurveTo(240, 126, 356, 238);
          ctx.quadraticCurveTo(240, 166, 124, 238);
          ctx.closePath();
        },
        rgba(t, 0.5),
        rgba(tline, 0.6),
        2.6,
      );
      break;
    default:
      break;
  }
}

// ── контровой свет ───────────────────────────────────────────
function drawRimLight(ctx: CanvasRenderingContext2D, look: Appearance): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = rgba(light(look.aura, 0.45), 0.75);
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  // по левому краю лица и плеча
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(122, 492);
  ctx.quadraticCurveTo(62, 520, 36, 578);
  ctx.stroke();
  ctx.restore();
}

// ── финальные штрихи ─────────────────────────────────────────
function drawFinish(ctx: CanvasRenderingContext2D, rnd: () => number): void {
  ctx.fillStyle = radial(ctx, 240, 300, 190, 440, [
    [0, 'rgba(40,24,64,0)'],
    [1, 'rgba(40,24,64,0.28)'],
  ]);
  ctx.fillRect(0, 0, DW, DH);

  for (let i = 0; i < 9; i++) {
    const x = rnd() * DW;
    const y = 50 + rnd() * 470;
    const r = 2.5 + rnd() * 5.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(r * 0.55, r * 0.55, 0, r * 3.2);
      ctx.quadraticCurveTo(-r * 0.55, r * 0.55, 0, 0);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
    ctx.restore();
  }
}

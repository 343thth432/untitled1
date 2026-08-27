import type { Appearance } from '../../game/types';
import { dark, light, mix, rgba, seeded, spline, type P } from './paint';
import {
  bloom,
  blurOff,
  blurOn,
  cloth,
  contour,
  edge,
  gloss,
  path,
  skin,
  skinFill,
  smudge,
  stroke,
} from './soft';

/** Пространство головы: 440×640, подбородок на 486 */
export const HEAD = {
  w: 440,
  h: 640,
  cx: 220,
  top: 66,
  chin: 486,
  browY: 252,
  eyeY: 284,
  noseY: 366,
  mouthY: 408,
  jawY: 410,
  neckY: 470,
  /** лёгкий разворот в три четверти */
  turn: 7,
};

const { cx, chin, browY, eyeY, noseY, mouthY, turn } = HEAD;

export interface HairTone {
  deep: string;
  cel: string;
  mid: string;
  lit: string;
  shine: string;
  tip: string;
}

export function hairTone(look: Appearance): HairTone {
  return {
    deep: dark(mix(look.hairColor, '#150d28', 0.5), 0.42),
    cel: dark(mix(look.hairColor, '#2a1c46', 0.3), 0.24),
    mid: look.hairColor,
    lit: light(look.hairColor, 0.2),
    shine: mix(light(look.hairColor, 0.6), '#fff8ee', 0.35),
    tip: look.hairColor2,
  };
}

function faceShape(): P[] {
  const t = turn;
  return [
    [cx + t * 0.3, HEAD.top],
    [cx + 74 + t * 0.5, HEAD.top + 20],
    [cx + 122 + t * 0.6, HEAD.top + 96],
    [cx + 142 + t * 0.6, 238],
    [cx + 144 + t * 0.5, 300],
    [cx + 130 + t * 0.4, 362],
    [cx + 104 + t * 0.4, 414],
    [cx + 58 + t * 0.5, 460],
    [cx + t * 0.6, chin],
    [cx - 58 + t * 0.5, 458],
    [cx - 104 + t * 0.3, 412],
    [cx - 130 + t * 0.2, 360],
    [cx - 144, 298],
    [cx - 142, 236],
    [cx - 122, HEAD.top + 94],
    [cx - 74, HEAD.top + 18],
  ];
}

// ── шея и плечи ──────────────────────────────────────────────
export function drawNeck(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const t = skin(look);
  const neck: P[] = [
    [cx - 54, 430],
    [cx + 54, 430],
    [cx + 64, 536],
    [cx + 132, 576],
    [cx + 196, 626],
    [cx + 214, 640],
    [cx - 214, 640],
    [cx - 196, 626],
    [cx - 132, 576],
    [cx - 64, 536],
  ];
  path(ctx, neck, 10);
  ctx.fillStyle = skinFill(ctx, t, cx - 120, 420, cx + 130, 640);
  ctx.fill();

  ctx.save();
  path(ctx, neck, 10);
  ctx.clip();
  // тень от подбородка
  smudge(
    ctx,
    [[cx - 66, 424], [cx, 448], [cx + 66, 424], [cx + 58, 494], [cx, 512], [cx - 58, 492]],
    t.deep,
    0.5,
    14,
  );
  smudge(ctx, [[cx - 40, 430], [cx + 40, 430], [cx + 34, 476], [cx - 34, 476]], t.sss, 0.18, 16);
  // грудино-ключично-сосцевидные
  stroke(ctx, [[cx - 44, 452], [cx - 34, 506], [cx - 14, 546]], t.shade, 9, 0.3, 5);
  stroke(ctx, [[cx + 44, 452], [cx + 36, 506], [cx + 18, 546]], t.shade, 9, 0.26, 5);
  // ключицы
  stroke(ctx, [[cx - 148, 592], [cx - 70, 606], [cx - 16, 596]], t.shade, 7, 0.34, 5);
  stroke(ctx, [[cx + 148, 592], [cx + 70, 606], [cx + 16, 596]], t.shade, 7, 0.3, 5);
  stroke(ctx, [[cx - 140, 586], [cx - 70, 600], [cx - 16, 590]], t.spec, 4, 0.3, 5);
  stroke(ctx, [[cx + 140, 586], [cx + 70, 600], [cx + 16, 590]], t.spec, 4, 0.26, 5);
  // ямка
  smudge(ctx, [[cx - 13, 598], [cx, 594], [cx + 13, 598], [cx + 8, 614], [cx - 8, 614]], t.deep, 0.26, 7);
  ctx.restore();
  edge(ctx, neck, t.line, 7, 0.24, 6, 10);
}

// ── голова ───────────────────────────────────────────────────
export function drawFaceBase(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const t = skin(look);
  const face = faceShape();

  path(ctx, face, 16);
  ctx.fillStyle = skinFill(ctx, t, cx - 150, 90, cx + 150, chin);
  ctx.fill();

  ctx.save();
  path(ctx, face, 16);
  ctx.clip();

  // общая светотень черепа
  smudge(
    ctx,
    [[cx + 40, 70], [cx + 150, 150], [cx + 152, 330], [cx + 96, 430], [cx + 30, 484], [cx + 70, 300]],
    t.shade,
    0.55,
    26,
  );
  smudge(
    ctx,
    [[cx - 150, 180], [cx - 108, 150], [cx - 116, 330], [cx - 60, 452], [cx - 96, 456], [cx - 148, 320]],
    t.warm,
    0.35,
    24,
  );
  // впадины глазниц
  for (const s of [-1, 1] as const) {
    smudge(
      ctx,
      [
        [cx + s * 24 + turn, eyeY - 34],
        [cx + s * 100 + turn, eyeY - 30],
        [cx + s * 104 + turn, eyeY + 18],
        [cx + s * 30 + turn, eyeY + 14],
      ],
      t.shade,
      0.34,
      16,
    );
  }
  // виски
  smudge(ctx, [[cx - 152, 200], [cx - 118, 214], [cx - 124, 290], [cx - 154, 280]], t.shade, 0.3, 18);
  smudge(ctx, [[cx + 152, 202], [cx + 120, 216], [cx + 126, 292], [cx + 154, 282]], t.shade, 0.34, 18);
  // скулы: свет сверху, тень под ними
  gloss(ctx, [cx - 96, 306], 46, 24, -0.24, t.spec, 0.24, 20);
  gloss(ctx, [cx + 92 + turn, 308], 42, 22, 0.22, t.spec, 0.18, 20);
  smudge(ctx, [[cx - 128, 336], [cx - 62, 352], [cx - 74, 396], [cx - 126, 372]], t.shade, 0.3, 18);
  smudge(ctx, [[cx + 128, 338], [cx + 62, 354], [cx + 74, 398], [cx + 126, 374]], t.shade, 0.34, 18);
  // подбородок и челюсть
  gloss(ctx, [cx + turn, 452], 26, 15, 0, t.spec, 0.26, 14);
  smudge(ctx, [[cx - 44, 470], [cx + 44, 470], [cx + 30, 492], [cx - 30, 492]], t.shade, 0.3, 14);
  // лоб
  gloss(ctx, [cx - 34 + turn, 176], 66, 34, -0.1, t.spec, 0.2, 26);
  // румянец
  bloom(ctx, [cx - 92 + turn, eyeY + 52], 66, '#e2637a', 0.3);
  bloom(ctx, [cx + 92 + turn, eyeY + 52], 62, '#e2637a', 0.26);
  bloom(ctx, [cx + turn, noseY + 4], 34, '#d9614f', 0.16);
  ctx.restore();

  // мягкий край силуэта вместо контура
  edge(ctx, face, t.line, 11, 0.3, 8, 16);
  contour(ctx, face, rgba(t.line, 0.32), 1.6, 1, 16);
}

export function drawEars(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const t = skin(look);
  for (const s of [-1, 1] as const) {
    const ex = cx + s * 140 + turn * 0.3;
    const ear: P[] = [
      [ex - s * 6, 254],
      [ex + s * 22, 268],
      [ex + s * 26, 316],
      [ex + s * 10, 346],
      [ex - s * 8, 332],
    ];
    path(ctx, ear, 12);
    ctx.fillStyle = mix(t.mid, '#d98a90', 0.16);
    ctx.fill();
    ctx.save();
    path(ctx, ear, 12);
    ctx.clip();
    smudge(ctx, [[ex + s * 4, 268], [ex + s * 18, 282], [ex + s * 10, 322], [ex - s * 2, 306]], t.deep, 0.35, 7);
    gloss(ctx, [ex + s * 18, 288], 8, 16, 0, t.spec, 0.3, 8);
    ctx.restore();
    edge(ctx, ear, t.line, 5, 0.3, 4, 12);
  }
}

// ── глаза ────────────────────────────────────────────────────
const EYE = { w: 66, up: 22, down: 18, dx: 63, iris: 19 };

function eyePath(s: -1 | 1, lid: number): P[] {
  const x = cx + s * EYE.dx + turn;
  const up = EYE.up * (1 - lid);
  return [
    [x - s * 32, eyeY + 5],
    [x - s * 8, eyeY - up * 0.92],
    [x + s * 18, eyeY - up],
    [x + s * 30, eyeY - up * 0.42],
    [x + s * 31, eyeY + 4],
    [x + s * 14, eyeY + EYE.down * 0.86],
    [x - s * 14, eyeY + EYE.down * 0.72],
  ];
}

export function drawEyes(ctx: CanvasRenderingContext2D, look: Appearance, lid: number): void {
  const t = skin(look);
  const lash = dark(mix(look.hairColor, '#1b1128', 0.62), 0.4);
  const iris = look.eyeColor;

  for (const s of [-1, 1] as const) {
    const x = cx + s * EYE.dx + turn;
    const eye = eyePath(s, lid);

    // тень глазницы над веком
    smudge(
      ctx,
      [
        [x - s * 34, eyeY - 6],
        [x, eyeY - EYE.up - 14],
        [x + s * 34, eyeY - 4],
        [x + s * 30, eyeY + 4],
        [x - s * 30, eyeY + 6],
      ],
      t.shade,
      0.2,
      12,
    );

    ctx.save();
    path(ctx, eye, 14);
    ctx.clip();

    // склера — не белая, а холодная и затенённая сверху
    ctx.fillStyle = mix('#f8f5f6', look.skin, 0.08);
    ctx.fillRect(x - 60, eyeY - 60, 120, 120);
    smudge(ctx, [[x - 46, eyeY - 42], [x + 46, eyeY - 42], [x + 46, eyeY - 6], [x - 46, eyeY - 8]], '#a99cb2', 0.36, 10);
    smudge(ctx, [[x - 46, eyeY + 22], [x + 46, eyeY + 22], [x + 46, eyeY + 6], [x - 46, eyeY + 6]], '#cfc3d0', 0.26, 8);

    // радужка
    const iy = eyeY + 3 - EYE.up * 0.06;
    const g = ctx.createRadialGradient(x - 4, iy - 5, 2, x, iy, EYE.iris);
    g.addColorStop(0, light(iris, 0.4));
    g.addColorStop(0.5, iris);
    g.addColorStop(0.86, dark(iris, 0.3));
    g.addColorStop(1, dark(mix(iris, '#180f28', 0.45), 0.3));
    ctx.beginPath();
    ctx.arc(x, iy, EYE.iris, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // волокна радужки
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, iy, EYE.iris, 0, Math.PI * 2);
    ctx.clip();
    const rnd = seeded(`${look.eyeColor}${s}`);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rnd() * 0.2;
      const r0 = EYE.iris * (0.3 + rnd() * 0.12);
      const r1 = EYE.iris * (0.78 + rnd() * 0.22);
      stroke(
        ctx,
        [
          [x + Math.cos(a) * r0, iy + Math.sin(a) * r0],
          [x + Math.cos(a) * r1, iy + Math.sin(a) * r1],
        ],
        i % 3 ? light(iris, 0.45) : dark(iris, 0.32),
        1.5,
        0.5,
        0.6,
      );
    }
    // отражённый свет снизу радужки
    gloss(ctx, [x + 2, iy + EYE.iris * 0.52], EYE.iris * 0.62, EYE.iris * 0.36, 0, light(iris, 0.7), 0.5, 5);
    ctx.restore();

    // зрачок
    ctx.beginPath();
    ctx.arc(x + 0.5, iy, EYE.iris * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#180f22';
    ctx.fill();
    // лимб
    ctx.beginPath();
    ctx.arc(x, iy, EYE.iris - 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(dark(mix(iris, '#150d20', 0.6), 0.3), 0.75);
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // тень верхнего века на глазном яблоке
    smudge(
      ctx,
      [[x - 48, eyeY - 40], [x + 48, eyeY - 40], [x + 46, eyeY - EYE.up * 0.1], [x - 46, eyeY - EYE.up * 0.06]],
      '#3a2b46',
      0.32,
      8,
    );

    // блики
    gloss(ctx, [x - EYE.iris * 0.42, iy - EYE.iris * 0.44], 6.4, 5.2, -0.4, '#ffffff', 0.95, 1.2);
    gloss(ctx, [x + EYE.iris * 0.5, iy + EYE.iris * 0.24], 3, 2.4, 0, '#ffffff', 0.55, 1.4);
    ctx.restore();

    // слёзный бугорок
    smudge(
      ctx,
      [[x - s * 34, eyeY + 3], [x - s * 25, eyeY - 4], [x - s * 24, eyeY + 9]],
      mix(look.skin, '#d2657a', 0.5),
      0.7,
      3,
      8,
    );

    // линия ресниц: толстая сверху, к внешнему углу шире
    const upper = spline(
      [
        [x - s * 34, eyeY + 4],
        [x - s * 10, eyeY - EYE.up * (1 - lid) - 4],
        [x + s * 18, eyeY - EYE.up * (1 - lid) - 3],
        [x + s * 32, eyeY - EYE.up * 0.34],
      ],
      12,
    );
    ctx.save();
    for (let i = 1; i < upper.length; i++) {
      const k = i / (upper.length - 1);
      ctx.beginPath();
      ctx.moveTo(upper[i - 1][0], upper[i - 1][1]);
      ctx.lineTo(upper[i][0], upper[i][1]);
      ctx.strokeStyle = lash;
      ctx.lineWidth = 2 + Math.sin(k * Math.PI) * 2 + k * 1.8;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
    // ресницы
    for (let i = 0; i < 5; i++) {
      const k = 0.42 + i * 0.14;
      const p = upper[Math.min(upper.length - 1, Math.round(k * (upper.length - 1)))];
      stroke(
        ctx,
        [p, [p[0] + s * (5 + i * 2.4), p[1] - 7 - i * 1.8], [p[0] + s * (10 + i * 4), p[1] - 11 - i * 2.6]],
        lash,
        1.9 - i * 0.18,
        0.75,
        0.5,
      );
    }
    // складка века
    stroke(
      ctx,
      [
        [x - s * 26, eyeY - 12],
        [x, eyeY - EYE.up - 12],
        [x + s * 30, eyeY - EYE.up * 0.5 - 6],
      ],
      rgba(t.line, 0.5),
      2.6,
      0.5,
      2,
    );
    // нижнее веко: влажная линия и тень под ней
    stroke(
      ctx,
      [[x - s * 26, eyeY + 12], [x + s * 4, eyeY + EYE.down * 0.9], [x + s * 28, eyeY + 6]],
      rgba(lash, 0.65),
      2,
      0.7,
      0.8,
    );
    stroke(
      ctx,
      [[x - s * 24, eyeY + 18], [x + s * 4, eyeY + EYE.down + 4], [x + s * 28, eyeY + 12]],
      t.shade,
      4,
      0.34,
      4,
    );
  }
}

export function drawBrows(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const c = dark(mix(look.hairColor, '#241934', 0.32), 0.1);
  for (const s of [-1, 1] as const) {
    const x = cx + s * EYE.dx + turn;
    const ctrl: P[] = [
      [x - s * 36, browY + 14],
      [x - s * 8, browY - 5],
      [x + s * 22, browY - 6],
      [x + s * 42, browY + 10],
    ];
    // мягкая основа брови
    stroke(ctx, ctrl, rgba(c, 0.3), 11, 0.55, 7);
    const guide = spline(ctrl, 16);
    for (let i = 0; i < guide.length; i += 2) {
      const k = i / (guide.length - 1);
      const p = guide[i];
      const th = 7 * Math.sin(Math.min(1, k * 1.5) * Math.PI * 0.8) + 1;
      const dir = k < 0.4 ? -1.4 : 1.1;
      stroke(
        ctx,
        [
          [p[0] - s * 2, p[1] + th * 0.55],
          [p[0] + s * 5 * dir, p[1] - th * 0.7],
        ],
        rgba(c, 0.4 - k * 0.16),
        1.6,
        1,
        1.1,
      );
    }
  }
}

export function drawNose(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const t = skin(look);
  const nx = cx + turn;
  // тень вдоль спинки с дальней стороны
  stroke(ctx, [[nx + 13, browY + 14], [nx + 15, 310], [nx + 17, noseY - 12]], t.shade, 11, 0.3, 8);
  // блик по спинке
  stroke(ctx, [[nx - 5, browY + 22], [nx - 6, 312], [nx - 3, noseY - 16]], t.spec, 7, 0.3, 7);
  // кончик
  gloss(ctx, [nx - 1, noseY - 8], 12, 8, 0, t.spec, 0.42, 6);
  smudge(
    ctx,
    [[nx - 20, noseY - 2], [nx, noseY - 10], [nx + 21, noseY - 2], [nx + 17, noseY + 10], [nx, noseY + 13], [nx - 17, noseY + 10]],
    t.shade,
    0.34,
    9,
  );
  // ноздри
  for (const s of [-1, 1] as const) {
    smudge(
      ctx,
      [[nx + s * 9, noseY + 1], [nx + s * 17, noseY + 3], [nx + s * 15, noseY + 9], [nx + s * 8, noseY + 7]],
      t.deep,
      0.62,
      3,
      8,
    );
    // крылья
    stroke(ctx, [[nx + s * 19, noseY - 4], [nx + s * 21, noseY + 6], [nx + s * 12, noseY + 11]], t.shade, 4, 0.36, 3);
  }
  // тень под носом
  smudge(ctx, [[nx - 22, noseY + 8], [nx + 22, noseY + 8], [nx + 16, noseY + 20], [nx - 16, noseY + 20]], t.shade, 0.26, 10);
}

export function drawMouth(ctx: CanvasRenderingContext2D, look: Appearance, smile: number): void {
  const t = skin(look);
  const mx = cx + turn;
  const lipC = mix(look.skin, '#c2455c', 0.6);
  const w = 40;
  const my = mouthY + smile * 2;

  // фильтрум
  stroke(ctx, [[mx - 6, noseY + 12], [mx - 7, my - 16]], t.spec, 3.4, 0.26, 3);
  stroke(ctx, [[mx + 6, noseY + 12], [mx + 7, my - 16]], t.spec, 3.4, 0.22, 3);

  const upper: P[] = [
    [mx - w, my - 2],
    [mx - 18, my - 11],
    [mx - 6, my - 6],
    [mx, my - 9],
    [mx + 6, my - 6],
    [mx + 18, my - 11],
    [mx + w, my - 2],
    [mx + 20, my + 3],
    [mx, my + 5],
    [mx - 20, my + 3],
  ];
  const lower: P[] = [
    [mx - w + 3, my + 1],
    [mx, my + 4],
    [mx + w - 3, my + 1],
    [mx + 21, my + 17 + smile * 2],
    [mx, my + 21 + smile * 2],
    [mx - 21, my + 17 + smile * 2],
  ];

  path(ctx, lower, 12);
  ctx.fillStyle = light(lipC, 0.16);
  ctx.fill();
  ctx.save();
  path(ctx, lower, 12);
  ctx.clip();
  smudge(ctx, [[mx - w, my + 1], [mx + w, my + 1], [mx + w, my + 9], [mx - w, my + 9]], dark(lipC, 0.3), 0.5, 6);
  gloss(ctx, [mx - 9, my + 12], 15, 6, -0.06, '#ffffff', 0.5, 4);
  gloss(ctx, [mx + 14, my + 11], 7, 4, 0.1, '#ffffff', 0.3, 4);
  ctx.restore();

  path(ctx, upper, 12);
  ctx.fillStyle = dark(lipC, 0.16);
  ctx.fill();
  ctx.save();
  path(ctx, upper, 12);
  ctx.clip();
  gloss(ctx, [mx - 16, my - 6], 12, 3.4, -0.16, '#ffffff', 0.24, 3);
  ctx.restore();

  // линия рта
  stroke(
    ctx,
    [[mx - w, my - 1], [mx - 16, my + 2], [mx, my + 3], [mx + 16, my + 2], [mx + w, my - 1]],
    dark(mix(lipC, '#3a1220', 0.4), 0.2),
    2.6,
    0.8,
    1,
  );
  // уголки
  for (const s of [-1, 1] as const) {
    smudge(
      ctx,
      [[mx + s * (w - 4), my - 4], [mx + s * (w + 3), my + 1], [mx + s * (w - 5), my + 5]],
      t.deep,
      0.5,
      3,
      8,
    );
  }
  // тень под нижней губой
  smudge(
    ctx,
    [[mx - 22, my + 22 + smile * 2], [mx, my + 26 + smile * 2], [mx + 22, my + 22 + smile * 2], [mx, my + 34]],
    t.shade,
    0.34,
    9,
  );
}

// ── волосы ───────────────────────────────────────────────────
/** заливка массы волос с мягким объёмом */
function hairMass(ctx: CanvasRenderingContext2D, pts: P[], h: HairTone, lightAt: P): void {
  path(ctx, pts, 14);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const g = ctx.createLinearGradient(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
  g.addColorStop(0, h.lit);
  g.addColorStop(0.38, h.mid);
  g.addColorStop(0.78, h.cel);
  g.addColorStop(1, h.deep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path(ctx, pts, 14);
  ctx.clip();
  gloss(ctx, lightAt, 70, 26, -0.2, h.shine, 0.28, 24);
  ctx.restore();
  edge(ctx, pts, h.deep, 14, 0.4, 10, 14);
}

/**
 * Прядь-веретено: острая у корня и у кончика, самая широкая в первой трети.
 * Кубические Безье, а не сплайн — сплайн скругляет кончик в «сосиску».
 */
function lockPath(ctx: CanvasRenderingContext2D, root: P, tip: P, w: number, bow: number): void {
  const dx = tip[0] - root[0];
  const dy = tip[1] - root[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const at = (t: number, o: number): P => [
    root[0] + ux * len * t + nx * (o + bow * Math.sin(Math.PI * t)),
    root[1] + uy * len * t + ny * (o + bow * Math.sin(Math.PI * t)),
  ];
  ctx.beginPath();
  ctx.moveTo(root[0], root[1]);
  const a1 = at(0.26, w * 1.5);
  const a2 = at(0.72, w * 1.05);
  ctx.bezierCurveTo(a1[0], a1[1], a2[0], a2[1], tip[0], tip[1]);
  const b1 = at(0.72, -w * 1.05);
  const b2 = at(0.26, -w * 1.5);
  ctx.bezierCurveTo(b1[0], b1[1], b2[0], b2[1], root[0], root[1]);
  ctx.closePath();
}

function lock(
  ctx: CanvasRenderingContext2D,
  h: HairTone,
  rnd: () => number,
  root: P,
  tip: P,
  w: number,
  bow: number,
): void {
  lockPath(ctx, root, tip, w, bow);
  const g = ctx.createLinearGradient(root[0] - w * 2, root[1], tip[0] + w * 2, tip[1]);
  g.addColorStop(0, h.lit);
  g.addColorStop(0.38, h.mid);
  g.addColorStop(0.8, h.cel);
  g.addColorStop(1, h.deep);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  lockPath(ctx, root, tip, w, bow);
  ctx.clip();
  const mid: P = [(root[0] + tip[0]) / 2, (root[1] + tip[1]) / 2];
  stroke(
    ctx,
    [[root[0] - w * 0.2, root[1] + 10], [mid[0] - w * 0.5, mid[1]], [tip[0] - w * 0.2, tip[1] - 12]],
    h.shine,
    w * 0.5,
    0.34,
    5,
  );
  stroke(
    ctx,
    [[root[0] + w * 0.5, root[1] + 8], [mid[0] + w * 0.8, mid[1]], [tip[0] + w * 0.3, tip[1] - 16]],
    h.deep,
    w * 0.6,
    0.3,
    5,
  );
  for (let j = 0; j < 3; j++) {
    const u = (j + 0.5) / 3 - 0.5;
    stroke(
      ctx,
      [
        [root[0] + u * w * 0.6, root[1] + 8],
        [mid[0] + u * w * 1.7, mid[1]],
        [tip[0] + u * w * 0.8, tip[1] - 8 - rnd() * 26],
      ],
      rnd() < 0.35 ? h.shine : h.deep,
      1.3,
      0.32,
      0.7,
    );
  }
  blurOn(ctx, 5);
  ctx.globalAlpha = 0.3;
  lockPath(ctx, root, tip, w, bow);
  ctx.strokeStyle = h.deep;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();
}

/** пучок тонких прядей вдоль направляющей */
function strands(
  ctx: CanvasRenderingContext2D,
  h: HairTone,
  rnd: () => number,
  guide: (k: number) => { a: P; b: P; c: P },
  count: number,
  width: number,
  alpha = 0.5,
): void {
  for (let i = 0; i < count; i++) {
    const k = (i + 0.5) / count;
    const { a, b, c } = guide(k);
    const tone = rnd() < 0.22 ? h.shine : rnd() < 0.5 ? h.lit : h.deep;
    stroke(
      ctx,
      [a, [b[0] + (rnd() - 0.5) * 6, b[1]], c],
      tone,
      width * (0.5 + rnd()),
      alpha * (0.4 + rnd() * 0.8),
      0.8,
    );
  }
}

export function drawHairBack(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const h = hairTone(look);
  const H = look.hair;
  const long = H === 'long' || H === 'wavy' || H === 'twin' || H === 'ponytail' || H === 'braid';
  const bottom = long ? 640 : H === 'bob' ? 470 : 400;
  const wide = H === 'short' ? 168 : 190;

  hairMass(
    ctx,
    [
      [cx, 40],
      [cx + 104, 76],
      [cx + wide, 250],
      [cx + wide - 10, bottom - 60],
      [cx + wide - 40, bottom],
      [cx, bottom + 10],
      [cx - wide + 40, bottom],
      [cx - wide + 10, bottom - 60],
      [cx - wide, 248],
      [cx - 104, 74],
    ],
    h,
    [cx - 96, 190],
  );
  strands(
    ctx,
    h,
    rnd,
    (k) => {
      const s = k < 0.5 ? -1 : 1;
      const u = k < 0.5 ? k * 2 : (k - 0.5) * 2;
      const x = cx + s * (26 + u * u * (wide - 34));
      const drop = bottom - 30 - u * 70 - rnd() * 60;
      return {
        a: [cx + s * (8 + u * 86), 64 + u * 44],
        b: [x + s * 10, 220 + u * 60],
        c: [x - s * (4 + u * 14), drop],
      };
    },
    72,
    2.6,
    0.5,
  );
}

export function drawHairFront(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const h = hairTone(look);
  const part = (rnd() - 0.5) * 60;

  // шапка волос: гладкий низ, локоны навешиваются отдельно
  const cap: P[] = [
    [cx - 158, 226],
    [cx - 152, 128],
    [cx - 92, 56],
    [cx + 8, 40],
    [cx + 106, 62],
    [cx + 154, 134],
    [cx + 162, 230],
    [cx + 118, 190],
    [cx + 40, 172],
    [cx - 44, 174],
    [cx - 116, 194],
  ];
  hairMass(ctx, cap, h, [cx - 64, 112]);

  // тень от чёлки на лоб
  ctx.save();
  path(ctx, faceShape(), 16);
  ctx.clip();
  smudge(
    ctx,
    [
      [cx - 156, 118],
      [cx + 158, 122],
      [cx + 146, 244],
      [cx + 60, 262],
      [cx - 40, 264],
      [cx - 140, 246],
    ],
    skin(look).deep,
    0.4,
    20,
  );
  ctx.restore();

  // пряди чёлки расходятся от пробора
  const px = cx + part;
  const n = 15;
  for (let i = 0; i < n; i++) {
    const k = (i + 0.35 + rnd() * 0.3) / n;
    const x = cx - 152 + k * 304;
    const dir = Math.sign(x - px) || 1;
    const w = 9 + rnd() * 9;
    const len = 200 + rnd() * 78 - Math.abs(x - px) * 0.1;
    const sweep = dir * (12 + rnd() * 26) + (x - px) * 0.05;
    lock(
      ctx,
      h,
      rnd,
      [px + (x - px) * 0.22, 52 + rnd() * 14],
      [x + sweep, len],
      w,
      dir * (6 + rnd() * 10),
    );
  }

  // широкий блик поперёк чёлки
  gloss(ctx, [cx - 46, 152], 96, 15, -0.06, h.shine, 0.3, 16);

  // боковые пряди у лица
  for (const s2 of [-1, 1] as const) {
    const lock: P[] = [
      [cx + s2 * 128, 140],
      [cx + s2 * 180, 246],
      [cx + s2 * 172, 396],
      [cx + s2 * 138, 476],
      [cx + s2 * 112, 424],
      [cx + s2 * 122, 258],
    ];
    hairMass(ctx, lock, h, [cx + s2 * 152, 236]);
    strands(
      ctx,
      h,
      rnd,
      (k) => ({
        a: [cx + s2 * (124 + k * 48), 150],
        b: [cx + s2 * (140 + k * 40), 300],
        c: [cx + s2 * (126 + k * 26), 440 + k * 30],
      }),
      16,
      2.2,
      0.45,
    );
  }
}

export function drawAccessory(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const a = look.accessory;
  if (a === 'none') return;
  const acc = look.outfitTrim;
  const m = cloth(acc, 0.6);
  const t = skin(look);

  if (a === 'horns') {
    for (const s of [-1, 1] as const) {
      const horn: P[] = [
        [cx + s * 96, 130],
        [cx + s * 128, 40],
        [cx + s * 150, -34],
        [cx + s * 128, -28],
        [cx + s * 106, 44],
        [cx + s * 70, 120],
      ];
      path(ctx, horn, 12);
      const g = ctx.createLinearGradient(cx + s * 70, 130, cx + s * 150, -34);
      g.addColorStop(0, m.shade);
      g.addColorStop(0.4, m.mid);
      g.addColorStop(1, m.spec);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      path(ctx, horn, 12);
      ctx.clip();
      for (let i = 0; i < 5; i++) {
        stroke(
          ctx,
          [[cx + s * (90 - i * 4), 116 - i * 30], [cx + s * (116 - i * 2), 100 - i * 30]],
          m.deep,
          3,
          0.4,
          2,
        );
      }
      ctx.restore();
      edge(ctx, horn, m.line, 7, 0.4, 5, 12);
    }
  } else if (a === 'halo') {
    ctx.save();
    blurOn(ctx, 10);
    ctx.beginPath();
    ctx.ellipse(cx, 26, 118, 26, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(light(acc, 0.5), 0.5);
    ctx.lineWidth = 20;
    ctx.stroke();
    blurOff(ctx);
    ctx.beginPath();
    ctx.ellipse(cx, 26, 118, 26, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(mix(light(acc, 0.7), '#fffbe8', 0.5), 0.95);
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  } else if (a === 'ears') {
    for (const s of [-1, 1] as const) {
      const ear: P[] = [
        [cx + s * 74, 108],
        [cx + s * 118, -6],
        [cx + s * 152, 96],
        [cx + s * 120, 132],
      ];
      path(ctx, ear, 12);
      ctx.fillStyle = hairTone(look).mid;
      ctx.fill();
      ctx.save();
      path(ctx, ear, 12);
      ctx.clip();
      smudge(ctx, [[cx + s * 96, 100], [cx + s * 118, 26], [cx + s * 138, 92], [cx + s * 116, 116]], mix(t.mid, '#e08b98', 0.5), 0.85, 8);
      ctx.restore();
      edge(ctx, ear, hairTone(look).deep, 8, 0.45, 6, 12);
      strands(
        ctx,
        hairTone(look),
        seeded(`${look.hairColor}ear${s}`),
        (k) => ({
          a: [cx + s * (80 + k * 60), 116],
          b: [cx + s * (100 + k * 40), 60],
          c: [cx + s * (112 + k * 24), 10],
        }),
        10,
        2,
        0.5,
      );
    }
  } else if (a === 'crown' || a === 'visor') {
    const band: P[] = [
      [cx - 152, 148],
      [cx - 92, 106],
      [cx, 92],
      [cx + 92, 108],
      [cx + 152, 150],
      [cx + 140, 176],
      [cx, 124],
      [cx - 140, 174],
    ];
    path(ctx, band, 12);
    const g = ctx.createLinearGradient(cx - 150, 92, cx + 150, 176);
    g.addColorStop(0, m.lit);
    g.addColorStop(0.4, m.mid);
    g.addColorStop(0.7, m.shade);
    g.addColorStop(1, m.spec);
    ctx.fillStyle = g;
    ctx.fill();
    edge(ctx, band, m.line, 6, 0.4, 4, 12);
    if (a === 'crown') {
      for (let i = -1; i <= 1; i++) {
        const px = cx + i * 54;
        const spike: P[] = [[px - 18, 118], [px, 52], [px + 18, 118]];
        path(ctx, spike, 6);
        ctx.fillStyle = g;
        ctx.fill();
        edge(ctx, spike, m.line, 5, 0.4, 3, 6);
      }
    }
    gloss(ctx, [cx, 108], 96, 8, 0, '#ffffff', 0.4, 6);
  } else if (a === 'hairpin') {
    for (let i = 0; i < 4; i++) {
      const px = cx + 96 + i * 6;
      const py = 132 + i * 30;
      const petal: P[] = [[px - 16, py], [px, py - 17], [px + 16, py], [px, py + 17]];
      path(ctx, petal, 10);
      ctx.fillStyle = i % 2 ? light(acc, 0.3) : acc;
      ctx.fill();
      gloss(ctx, [px - 4, py - 5], 6, 4, 0, '#ffffff', 0.5, 3);
      edge(ctx, petal, m.line, 4, 0.35, 3, 10);
    }
  } else if (a === 'veil') {
    const veil: P[] = [
      [cx - 168, 150],
      [cx, 96],
      [cx + 168, 150],
      [cx + 176, 470],
      [cx, 430],
      [cx - 176, 470],
    ];
    ctx.save();
    ctx.globalAlpha = 0.4;
    path(ctx, veil, 14);
    ctx.fillStyle = light(acc, 0.5);
    ctx.fill();
    ctx.restore();
    edge(ctx, veil, m.line, 8, 0.24, 6, 14);
  }
}

/** Полный портрет головы в пространстве HEAD */
export function drawHead(ctx: CanvasRenderingContext2D, look: Appearance, id: string, withNeck = true): void {
  const sultry = Math.max(0.4, 1 - look.mood);
  drawHairBack(ctx, look, seeded(`${id}hb`));
  if (withNeck) drawNeck(ctx, look);
  drawFaceBase(ctx, look);
  drawEars(ctx, look);
  drawEyes(ctx, look, sultry * 0.24);
  drawBrows(ctx, look);
  drawNose(ctx, look);
  drawMouth(ctx, look, look.mood);
  drawHairFront(ctx, look, seeded(`${id}hf`));
  drawAccessory(ctx, look);
}

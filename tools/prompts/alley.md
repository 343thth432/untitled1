# Подворотня (`alley`) — задание на генерацию

Цвета и крой взяты из `src/dungeon/foes.ts`, запись `alley`. Если правишь
их там — поправь и здесь, иначе сгенерированная тварь разойдётся с той,
что рисует движок.

Стиль просим **не пиксельный**, а чистый аниме-целшейд. Пикселизацию,
квантование палитры и обводку делает конвейер: так пиксельная сетка,
палитра и кант остаются под контролем, а модель не изобретает свой
кривой «псевдопиксель».

## Промт

```
flat cel-shaded anime character illustration, full body, single character,
character reference sheet, ORTHOGRAPHIC FRONT VIEW,

a young catgirl monster girl, slim athletic build, small frame,
short messy ginger-orange bob haircut, burnt orange hair #b25a1c,
large triangular cat ears with dusty pink inner fur #d08a8a,
big glowing mint-green eyes #8affc4, tan skin #ab7a5f,
long fluffy ginger cat tail curling out to her side,

wearing a japanese sailor school uniform:
off-white short-sleeve blouse #c2c2ca with puffed sleeves,
dark green sailor collar #2f5a41, gold neckerchief #c9b070,
narrow strip of bare midriff, short dark green pleated skirt #2f5a41,
dark green over-the-knee thigh-high socks #4a5c50,
scuffed dark brown ankle boots #40382f,

standing neutral idle A-pose, weight on both feet, feet flat on the ground
shoulder width apart, arms hanging slightly away from the torso, hands open,
facing the viewer straight on, head level, symmetrical,
FULL BODY VISIBLE from the tips of the ears to the soles of the boots,

flat even frontal lighting, hard-edged cel shading with two shadow steps,
thick clean dark outline, limited flat colour palette,
no gradients, no texture, no rendering noise,

isolated on a plain flat magenta #ff00ff background,
no ground, no floor, no cast shadow
```

## Отрицательный промт

```
background scenery, environment, floor, ground plane, cast shadow, drop shadow,
gradient background, vignette, glow, bloom,
cropped, cut off feet, cut off ears, out of frame, close-up, portrait crop, zoomed in,
multiple characters, duplicate, extra limbs, extra arms, extra tails,
bad hands, malformed hands, extra fingers,
perspective distortion, foreshortening, dutch angle, tilted camera,
dynamic pose, action pose, leaning, walking,
photorealistic, 3d render, soft shading, airbrush, painterly, depth of field, blur,
watermark, signature, text, logo, border, frame, grid, jpeg artifacts, sketch lines
```

## Настройки

- размер вертикальный, 832×1216 или крупнее — есть запас на уменьшение;
- CFG 5–7, шагов 28–35;
- **сид зафиксировать и записать** — по нему собираются остальные ракурсы;
- фон именно маджента: ни одна деталь наряда в неё не попадает, поэтому
  вырезается начисто.

## Пять ракурсов

Сначала сгенерируй 3–4 варианта анфаса, выбери один. Дальше меняй в промте
**только строку ракурса**, сид и всё остальное держи прежними:

| файл | строка ракурса |
|---|---|
| `alley-0.png` | `ORTHOGRAPHIC FRONT VIEW` + `facing the viewer straight on` |
| `alley-1.png` | `THREE-QUARTER FRONT VIEW, turned 45 degrees to her left` |
| `alley-2.png` | `FULL SIDE PROFILE VIEW, facing to the right` |
| `alley-3.png` | `THREE-QUARTER BACK VIEW, turned 135 degrees, face barely visible` |
| `alley-4.png` | `BACK VIEW, seen from directly behind, face not visible` |

Если персонаж поплывёт между ракурсами — сгенерируй остальные четыре из
анфаса через img2img или character reference с силой 0.5–0.65.

## Куда класть

`public/art/foes/alley/alley-0.png` … `alley-4.png`

PNG как есть, без апскейла и постобработки. Разное кадрирование не страшно:
конвейер сам обрежет по содержимому и поставит на общую базовую линию —
лишь бы фигура целиком помещалась в кадр.

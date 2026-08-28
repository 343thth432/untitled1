# Подворотня (`alley`) — задание на генерацию

Цвета и крой сверены с записью `alley` в `src/dungeon/foes.ts`.

## Главное правило

Первый кадр (`alley-0.png`) уже есть и он **эталон**. Все остальные
генерируй **правкой картинки, а не с нуля**: прикладывай `alley-0.png`
как исходник и проси тот же персонаж в другом ракурсе или позе. Заново
по тексту персонаж каждый раз выходит другой — сид тут не спасает.

Три вещи, которые ломают конвейер, если их не удержать:

- **расстояние до камеры.** Не зумить, не подходить ближе. Масштаб на
  всю тварь берётся с эталона, и если на другом кадре она крупнее, она
  будет скакать в размере между кадрами.
- **фигура целиком в кадре** — от кончиков ушей до подошв. Обрезанная
  нога означает, что тварь провалится в пол.
- **никакой тени на пол и никакого фона.** Тень попадёт в вырезанный
  силуэт и потащится за тварью чёрным пятном.

## Хвост, общий для всех кадров

Дописывай его к каждому запросу:

```
Same character, same outfit, same colours, same flat cel-shaded anime style,
same camera distance and framing, do not zoom in.
Full body visible from the tips of the ears to the soles of the boots.
Flat even lighting, no cast shadow, no ground, no floor.
Transparent background, or plain flat magenta if transparency is unavailable.
```

## Ракурсы

Поза во всех четырёх — та же спокойная, руки отведены от корпуса.
Именно поэтому кадр потом чисто режется на части.

| файл | что просить |
|---|---|
| `alley-1.png` | `Now turned 45 degrees to her left, three-quarter front view. Both eyes still visible, tail curling behind her.` |
| `alley-2.png` | `Now in full side profile, facing to the right. One eye visible, ears in profile, tail behind her and not crossing the body.` |
| `alley-3.png` | `Now turned 135 degrees, three-quarter view from behind. Face barely visible over the shoulder, back of the skirt and tail visible.` |
| `alley-4.png` | `Now seen from directly behind. Face not visible, back of the head and ears, back of the sailor collar, back of the skirt, tail hanging.` |

## Позы

Все анфас — ракурсов у поз не нужно, движок берёт анфас и для остальных
сторон, как это делал и оригинальный Doom для смерти.

| файл | что просить |
|---|---|
| `alley-0-atk.png` | `Same character, attacking: leaning forward, both arms raised up and forward, fingers spread with claws out, mouth open in a snarl, eyes narrowed. Feet still on the ground, weight on the front foot.` |
| `alley-0-pain.png` | `Same character, recoiling from a hit: head thrown back, eyes shut, mouth open, both arms flung upward and outward, knees slightly bent, still standing.` |
| `alley-0-die1.png` | `Same character, collapsing: dropped to her knees, body slumped forward, head down, arms hanging limp at her sides.` |
| `alley-0-die2.png` | `Same character, dead on the floor: lying flat on her side, seen from standing eye level, head to the left, limbs slack, a low wide silhouette.` |

## Шаг генерировать не надо

Четыре кадра шага я доиграю сам: разрежу эталон на части — голова, уши,
торс, плечо, предплечье, бедро, голень, хвост — и привяжу к скелету,
который уже считает движок. Небольшие повороты конечностей от спокойной
позы оснастка изображает честно. А вот замах и падение оснастке не даются:
там руки уходят на сто с лишним градусов и меняется ракурс — их лучше
нарисовать.

## Порядок по важности

Если делать не всё сразу, то в этом порядке:

1. `alley-4.png` — спина. Сейчас тварь разворачивается к тебе лицом даже
   когда убегает, это видно сразу.
2. `alley-2.png` — профиль.
3. `alley-0-atk.png` — замах.
4. `alley-1.png` и `alley-3.png` — три четверти.
5. `alley-0-die2.png` — лежит.
6. `alley-0-die1.png` и `alley-0-pain.png` — эти две оснастка изобразит
   сносно, так что они последние.

## Куда класть и что запускать

Файлы — в `public/art/foes/alley/`, PNG как есть, без апскейла и
постобработки. Дальше:

```
node tools/make-foe.mjs alley
```

Скрипт сам срежет фон, обрежет по содержимому, приведёт все кадры к
масштабу эталона, поставит подошвами на пол, сведёт цвета в общую
палитру, положит кант и обновит `sprite.json`. Игра подхватит.

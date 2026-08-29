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

## Шаг: четыре фазы

Здесь я ошибся раньше, когда написал, что шаг доиграю оснасткой. Оснастка
режет фигуру на части и крутит их вокруг суставов — но у Подворотни хвост
проходит поверх руки, и рамкой их не разделить: нужна ручная маска на
каждую тварь, а результат всё равно читается бумажной куклой. Дешевле и
честнее нарисовать четыре фазы.

Отдельным листом из четырёх фигур, анфас, всё тот же хвост промта:

| файл | что просить |
|---|---|
| `alley-0-walk0.png` | `Same character, walking towards the viewer, left foot planted forward, right leg trailing back, right arm swung forward and left arm back, weight on the front foot.` |
| `alley-0-walk1.png` | `Same character, mid-stride passing position: legs close together, right leg swinging forward past the left, both arms close to the body, body at the highest point of the step.` |
| `alley-0-walk2.png` | `Same character, walking towards the viewer, right foot planted forward, left leg trailing back, left arm swung forward and right arm back, weight on the front foot.` |
| `alley-0-walk3.png` | `Same character, mid-stride passing position: legs close together, left leg swinging forward past the right, both arms close to the body, body at the highest point of the step.` |

Фазы 0 и 2 — зеркальные по ногам, но отражать картинку нельзя: перекинется
хвост и пробор в волосах. Рисуй все четыре.

Этих четырёх хватит на все стороны: движок берёт анфас и для остальных
ракурсов. Захочешь честнее — тот же лист в профиль и со спины, но это уже
не обязательно.

## Что ещё сгладит анимацию

- `alley-0-atk1.png` — замах перед ударом, когти занесены, вес на задней
  ноге. Сейчас удар показывается одним кадром.
- `alley-0-die0.png` — оседает, ноги подгибаются, между болью и коленями.

## Что уже сделано

Два листа разрезаны и заведены в игру. Всего одиннадцать кадров:

- ракурсы: анфас, профиль, три четверти со спины, спина;
- шаг: четыре фазы;
- бой: замах и удар;
- боль;
- смерть: оседает, на коленях, лежит.

Осталось одно — **три четверти анфас** (`alley-1.png`). Сейчас движок
подставляет вместо него анфас.

Лист удобнее отдельных картинок: персонаж выходит одинаковым во всех
кадрах, и спрайт с него даже резче — при уменьшении в восемь раз линии
замыливаются, а в четыре держатся.

Отдельный кадр тоже годится, но приходит в своём масштабе: генератор
вписывает фигуру в кадр, а не держит расстояние до камеры. Поправка
кладётся в `scale.json`. Множитель снимается сравнением голов при равной
высоте рамки — голова от позы не зависит. Сверять надо с кадром той же
осанки: стойка с широко расставленными ногами ниже обычной на восемь
процентов, и по ней масштаб выходит завышенным.

## Порядок по важности

1. Четыре фазы шага — сейчас тварь плывёт по полу одной картинкой, это
   заметнее всего.
2. `alley-1.png` — три четверти анфас, единственный недостающий ракурс.
3. `alley-0-atk1.png` — замах перед ударом.
4. `alley-0-die0.png` — промежуточный кадр падения.

## Куда класть и что запускать

Файлы — в `public/art/foes/alley/`, PNG как есть, без апскейла и
постобработки. Дальше:

```
node tools/make-foe.mjs alley
```

Скрипт сам срежет фон, обрежет по содержимому, приведёт все кадры к
масштабу эталона, поставит подошвами на пол, сведёт цвета в общую
палитру, положит кант и обновит `sprite.json`. Игра подхватит.

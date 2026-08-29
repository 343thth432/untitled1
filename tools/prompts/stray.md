# Драная (`stray`) — задание на генерацию

Общие правила — в `README.md` рядом. Здесь только то, что своё.

Цвета сверены с записью `stray` в `src/dungeon/foes.ts`.

## Кто она

Одичавшая. Слабее всех, но быстрая и лезет первой. От боли вздрагивает
почти от каждого попадания — самая дёрганая тварь на этаже.

Главное, чем она обязана отличаться от Подворотни: **осанка и удар**.
Подворотня стоит прямо и бьёт с места взмахом. Драная **сгорблена** —
голова низко между поднятыми плечами, колени согнуты, руки висят почти
до земли, — и **бьёт прыжком**, отрываясь от пола обеими ногами.

Повадка: взвинченная, не стоит на месте. Дышит часто, плечи дёргаются,
глаза бегают. Не грозная, а нервная — этим и страшна.

## Описание персонажа

Дописывай к каждому запросу вместе с общим хвостом из `README.md`:

```
a feral catgirl scavenger, wiry and underfed, hunched forward with her head
low between raised shoulders, knees bent, arms hanging loose almost to the
ground, ready to spring,

matted uneven dark slate-grey hair #474753, longer and tangled at the back,
one strand hanging over her left eye,
large ragged cat ears with dusty pink inner fur #c47b84, one ear notched and
torn at the tip,
wide feral yellow eyes #ffe27a with narrow slit pupils, tan weathered skin
#a67c66 with dirt smudges, long thin scruffy tail,

wearing filthy rags: a torn sleeveless tunic of dirty beige cloth #b8a686,
frayed hem hanging in strips, left shoulder completely bare, bare midriff,
a knotted rope belt #8d6b3f, ragged brown loincloth strips #5b4838 over
her hips instead of a skirt,
dirty grey bandage wraps #5e5060 wound from ankle to knee on both legs,
bare feet, no boots,
long dirty claws #c6cad4 on both hands
```

Чего у неё быть не должно, чтобы не съехать в Подворотню: юбки в складку,
матросского воротника, платка, чулок, ботинок, аккуратной причёски.

## Готово

Пришла одним листом на четырнадцать фигур — все пять ракурсов, четыре
фазы шага, подбор перед прыжком, прыжок, боль, падение вперёд и лежачая.
Кадр `die1` ей не нужен: она падает лицом вперёд, без стояния на коленях,
движок подставляет соседний.

Что вылезло на ней и починено в конвейере:

- **сгорбленная тварь с хвостом вбок не влезала в общий холст.** Шесть
  кадров из четырнадцати. Теперь ширина холста подбирается под самый
  широкий кадр твари и пишется в `sprite.json`, а билборд берёт пропорцию
  оттуда — иначе спрайт растянуло бы.
- **у припавшей и лежачей «стопы» теряют смысл**: низ силуэта тянется во
  всю длину тела, и якорь уезжал вбок. Кадры ниже эталонного вешаются на
  середину массы.
- **размер пришлось убавить.** Конвейер вписывает фигуру в кадр по
  высоте, а у сгорбленной высота меньше настоящего роста — она выходила
  крупнее Подворотни, хотя должна быть мельче. Поправлено полем `scale` в
  `foes.ts`: 1.05 → 0.82.

Ниже — то, по чему её рисовали.

## Лист 1 — ракурсы (5 фигур)

Осанка во всех пяти одна: сгорбленная стойка, руки висят низко.

| файл | что просить |
|---|---|
| `stray-0.png` | `standing hunched, facing the viewer straight on` |
| `stray-1.png` | `turned 45 degrees to her left, three-quarter front view` |
| `stray-2.png` | `full side profile, facing to the right, hunch clearly visible` |
| `stray-3.png` | `turned 135 degrees, three-quarter view from behind` |
| `stray-4.png` | `seen from directly behind, matted hair and notched ears visible` |

## Лист 2 — шаг (5 фигур)

Первой фигурой — та же стойка анфас, что на листе 1: по ней сведу
масштаб. Дальше четыре фазы. Идёт она не как человек: крадётся,
переваливаясь, руки болтаются низко.

| файл | что просить |
|---|---|
| (эталон) | `standing hunched, facing the viewer straight on` |
| `stray-0-walk0.png` | `prowling towards the viewer, left foot planted forward, right leg trailing, still hunched, arms swinging low and loose` |
| `stray-0-walk1.png` | `mid-stride passing position, legs close together, shoulders twisted, head jerked to one side` |
| `stray-0-walk2.png` | `prowling towards the viewer, right foot planted forward, left leg trailing, arms swinging low` |
| `stray-0-walk3.png` | `mid-stride passing position, legs close together, shoulders twisted the other way, head low` |

## Лист 3 — бой и смерть (6 фигур)

Первой снова эталонная стойка.

| файл | что просить |
|---|---|
| (эталон) | `standing hunched, facing the viewer straight on` |
| `stray-0-atk.png` | `coiled to pounce: crouched down low, both hands on the ground, haunches gathered, head up, eyes locked on the viewer, mouth open` |
| `stray-0-atk1.png` | `leaping at the viewer: BOTH FEET OFF THE GROUND, body stretched forward through the air, both arms thrown forward with claws spread, mouth wide open, tail streaming behind` |
| `stray-0-pain.png` | `flinching hard from a hit: whole body jerked sideways, one shoulder thrown up, head turned away, eyes screwed shut, arms tucked in` |
| `stray-0-die0.png` | `stumbling forward, knees buckling, arms flailing out to catch herself` |
| `stray-0-die2.png` | `dead face down on the floor, sprawled flat on her belly, arms out to the sides, seen from standing eye level` |

Прыжок — самое важное на этом листе. Обе ноги в воздухе, тело вытянуто:
именно этим она читается издали и не путается с остальными.

Кадр `die1` не нужен: она падает лицом вперёд, без промежуточного стояния
на коленях. Движок подставит соседний.

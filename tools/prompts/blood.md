# Задание на генерацию крови

Кровь рисуется листами спрайтов, как и твари. Движок берёт на себя
физику — куда полетело, во что ударилось, что осталось на камне, — но
все формы должны прийти нарисованными. Процедурная кровь остаётся
только запасным вариантом на случай, если листы не подгрузились.

Ориентир — Boltgun: густой, непрозрачный багрянец, тёмное нутро,
светлый алый край, рваный силуэт, который читается за двадцать метров в
темноте. Не фотореализм, не мягкий аэрографный туман.

## Семь листов, все одной сетки

| файл | что на нём |
|---|---|
| `burst-body.png` | попадание в корпус |
| `burst-head.png` | попадание в голову, фонтан вверх |
| `burst-gib.png` | разрыв в клочья |
| `drop.png` | капли и ошмётки в полёте, по одной в клетке |
| `pool.png` | лужи, вид сверху — **маска** |
| `wall.png` | потёки по стене — **маска** |
| `lens.png` | кровь на «стекле», вплотную к глазу |

**Лист — 1536×1024, сетка три на два, клетка 512×512.** Одна на все семь,
и это не прихоть: генератор рисует в своих размерах, и 1536×1024 —
единственный, который делится на ровные квадраты. Сетка четыре на два
дала бы клетки 384×512, а движок ставит выхлоп квадратом, и кадр бы
сплющило.

Кадры читаются слева направо, потом вторым рядом. Первый кадр — начало
броска, шестой — то, что от него осталось.

Класть в `public/art/blood/`. Резать и собирать:

```
node tools/split-blood.mjs <лист>.png --kind burst-body
```

## Четыре вещи, которые ломают конвейер

- **разный масштаб между кадрами.** Резчик режет лист ровной сеткой и
  ничего не подгоняет. Если на третьем кадре брызга нарисована крупнее
  «для выразительности», в игре она дёрнется.
- **сдвинутый центр.** Точка попадания обязана стоять ровно в середине
  клетки во всех кадрах: движок ставит клетку центром на рану. Кадр,
  съехавший вниз, повесит кровь под ногами.
- **фон, рамки, номера кадров, сетка.** Всё это попадёт в спрайт. Фон
  либо прозрачный, либо плоский чистый magenta без градиента.
- **свечение и тени.** Никакого ореола вокруг брызги и никакой тени на
  пол: движок сам решает, как кровь освещена, а нарисованный ореол
  останется светлым пятном в полной темноте.

## Цвет

Одна и та же кровь во всех листах:

| роль | цвет |
|---|---|
| нутро, самое тёмное | `#3a050b` |
| основная масса | `#8e1119` |
| край, свежая брызга | `#d42a22` |
| блик на мокром, редкими точками | `#ff6b4a` |

Маски (`pool.png`, `wall.png`) — **без цвета**: белый силуэт на
прозрачном, где непрозрачность и есть густота крови. Цвет им даёт
движок, потому что лужа на полу освещается тем же факелом, что и плита,
и в темноте обязана быть тёмной.

## Хвост, общий для всех листов

```
2D game VFX sprite sheet of thick red liquid, on a fully transparent background.
One image, a strict grid of 3 columns and 2 rows of equal square cells, read left
to right then top to bottom, no gaps between cells, no borders, no grid lines,
no frame numbers, no labels, no text.
Identical scale in every cell, do not zoom, the origin of the splash stays at
the exact centre of its cell.
Hand-painted retro video game look: thick opaque paint, near-black dark red core,
bright scarlet rim, torn asymmetric silhouette, slightly crunchy pixel edge.
Deep red palette only: #3a050b, #8e1119, #d42a22, sparse #ff6b4a highlights.
Liquid only: no characters, no creatures, no objects, no floor, no walls, no
background scenery.
No cast shadow, no outer glow, no lens flare, no smoke, no fire, no photorealism,
no smooth airbrush haze.
```

## Листы

### `burst-body.png` — попадание в корпус

```
Six animation frames of a single splash of thick red liquid struck head on,
3 by 2 grid, 512 px cells.
Frame 1: a tight dense round blob at the exact centre of the cell.
Frames 2 and 3: it bursts outward into a radial splash, thick uneven arms of
liquid of clearly different lengths, some stubby and some long, ragged torn
edges, fat droplets breaking off the tips.
Frames 4 to 6: the arms thin and separate, the centre hollows out, the splash
sags slightly downward and falls apart into loose droplets.
Wide, chaotic, asymmetric, never a neat symmetrical star.
```

### `burst-head.png` — фонтан вверх

```
Six animation frames of an upward jet of thick red liquid, 3 by 2 grid,
512 px cells.
The liquid is thrown upward and slightly back in a narrow fan.
Frame 1: a compact dense burst at the bottom centre of the cell.
Frames 2 and 3: a tall jet rises, its top arcs over sideways, heavy droplets
lead the jet, the base stays thick and dense.
Frames 4 to 6: the jet breaks into a falling curtain of separate droplets, the
base slumps into a hanging drip.
The jet must stay attached to the bottom centre of the cell in every frame.
```

### `burst-gib.png` — разрыв в клочья

```
Six animation frames of a large violent burst of thick red liquid, 3 by 2 grid,
512 px cells. Much wider and heavier than an ordinary splash.
Frame 1: a compact dark wet mass.
Frames 2 and 3: a big round cloud of liquid expands in every direction, heavy
irregular globs of the same liquid fly outward trailing thin ribbons behind
them, the edge of the cloud is torn and lumpy.
Frames 4 to 6: the cloud tears open, the globs scatter towards the corners of
the cell, long strings of droplets stretch outward, the centre thins to a dark
ring.
```

### `drop.png` — капли в полёте

```
Six separate objects made of thick red liquid, 3 by 2 grid, 512 px cells, one
object per cell, centred, nothing else in the cell.
Cell 1 and 2: round droplets, wet, a single small highlight, the second larger.
Cell 3 and 4: elongated teardrops with a thin tail, as if flung.
Cell 5: a small irregular glob with a torn edge and a wet highlight.
Cell 6: a larger irregular glob with a torn edge.
The first four cells are the droplets and the last two are the globs, in that
order — the engine picks the cell by what is flying.
No motion blur streaks, no trails, no glow — the engine stretches and rotates
these itself.
```

### `pool.png` — лужи на полу, маска

```
Six top down silhouettes of spilled liquid puddles, 3 by 2 grid, 512 px cells.
Pure white shapes on a fully transparent background, no colour at all, the
opacity of the white is the depth of the puddle: dense white in the middle,
thinning towards the edges.
Irregular ragged organic outlines, never circles. Small satellite spots and
flecks scattered around each main body. Two of the six stretched and streaked
as if the liquid ran across the ground.
No outline, no highlight, no reflection, no ground texture.
```

### `wall.png` — потёки по стене, маска

```
Six silhouettes of liquid splashed onto a vertical surface and running down,
3 by 2 grid, 512 px cells.
Pure white on a fully transparent background, opacity is the thickness of the
liquid.
Each: an irregular splash in the upper part of the cell with narrow rivulets
running straight down from it, of different lengths, each rivulet ending in a
fat rounded bead. Some fine spatter dots around the point of impact.
Gravity is straight down in every cell. No outline, no colour, no highlight.
```

### `lens.png` — брызги на «стекле»

```
Six patches of thick red liquid splashed onto a pane of glass directly in front
of the camera, seen from extremely close, 3 by 2 grid, 512 px cells, on a fully
transparent background.
Each cell: two or three thick opaque blobs of different sizes, a scatter of
small specks around them, and one blob with a short heavy drip running down
from it.
Rich dark red, almost opaque in the middle, thinning at the rim.
Reads as liquid sitting on glass: no depth, no perspective, nothing visible
behind it.
```

## Почему в заданиях ни слова про кровь

Задания нарочно описывают то, что рисуется, а не то, чем оно станет в
игре: густая красная жидкость, брызга, потёк, сгусток. Рисовалка иначе
отказывается — фильтр смотрит на слова, и «кровь», «мясо», «рана»,
«выстрел в голову» его цепляют, хотя картинка выходит ровно та же.
Формы от этого не страдают: спрайт и правда всего лишь брызга красной
жидкости, а смыслом её наделяет то, где движок её рисует.

Не возвращай прямые слова в промт, «чтобы вышло убедительнее», —
получишь отказ вместо листа. Если откажет и на этих: убери слово `red`
и проси `dark crimson paint`, а сцену назови splatter study. Если
упрётся совсем — те же формы лежат в готовых наборах под CC0 (paint и
splatter packs), их можно взять и прогнать тем же резчиком, как взяты
камень и кадры Freedoom.

## Что движок делает сам

Чтобы не рисовать лишнего:

- **поворот и растяжку** капель по направлению полёта;
- **тонировку по дальности** — ближняя кровь яркая, дальняя тонет в мгле;
- **освещение луж и потёков** факелом и по рельефу камня: кровь затекает
  в швы кладки и сходит с выпуклостей;
- **выбор кадра** по времени, **выбор листа** по месту попадания;
- **сползание** кляксы на «стекле» и её высыхание.

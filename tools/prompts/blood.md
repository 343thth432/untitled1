# Задание на генерацию крови

Кровь рисуется листами спрайтов, как и твари. Движок берёт на себя
физику — куда полетело, во что ударилось, что осталось на камне, — но
все формы должны прийти нарисованными. Процедурная кровь остаётся
только запасным вариантом на случай, если листы не подгрузились.

Ориентир — Boltgun: густой, непрозрачный багрянец, тёмное нутро,
светлый алый край, рваный силуэт, который читается за двадцать метров в
темноте. Не фотореализм, не мягкий аэрографный туман.

## Семь листов

| файл | сетка | клетка | что на нём |
|---|---|---|---|
| `burst-body.png` | 4×2 = 8 | 192 | попадание в корпус |
| `burst-head.png` | 4×2 = 8 | 192 | попадание в голову, фонтан вверх |
| `burst-gib.png` | 4×2 = 8 | 256 | разрыв в клочья |
| `drop.png` | 4×2 = 8 | 64 | капли и ошмётки в полёте, по одной в клетке |
| `pool.png` | 3×2 = 6 | 192 | лужи, вид сверху — **маска** |
| `wall.png` | 3×2 = 6 | 192 | потёки по стене — **маска** |
| `lens.png` | 3×2 = 6 | 256 | кровь на «стекле», вплотную к глазу |

Кадры читаются слева направо, потом вторым рядом. Первый кадр — начало
броска, последний — то, что от него осталось.

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
2D game VFX sprite sheet, blood only, on a fully transparent background.
One image, a strict grid of equal square cells, read left to right then top
to bottom, no gaps between cells, no borders, no grid lines, no frame
numbers, no labels, no text.
Identical scale in every cell, do not zoom, the origin of the splash stays at
the exact centre of its cell.
Hand-painted retro shooter look: thick opaque crimson, near-black maroon core,
bright scarlet rim, torn asymmetric silhouette, slightly crunchy pixel edge.
Deep red palette only: #3a050b, #8e1119, #d42a22, sparse #ff6b4a highlights.
No characters, no bodies, no weapons, no floor, no walls, no props.
No cast shadow, no outer glow, no lens flare, no smoke, no fire, no
photorealistic gore, no smooth airbrush haze.
```

## Листы

### `burst-body.png` — попадание в корпус

```
Blood impact burst, seen head on, 8 frames in a 4 by 2 grid, 192 px cells.
Frame 1: a single tight dense wet blot the size of a fist.
Frames 2 to 4: it erupts into a radial spray, thick uneven fingers of blood of
clearly different lengths, some stubby and some long, ragged torn edges, fat
droplets breaking off the tips.
Frames 5 to 8: the fingers thin and separate, the core hollows out, the whole
spray sags slightly downward and falls apart into loose droplets.
Wide, chaotic, asymmetric, never a neat symmetrical star.
```

### `burst-head.png` — попадание в голову

```
Blood geyser from a head shot, 8 frames in a 4 by 2 grid, 192 px cells.
The blood is thrown upward and slightly back in a narrow fan.
Frame 1: a compact dense burst at the bottom centre of the cell.
Frames 2 to 4: a tall jet rises, its top arcs over sideways, heavy drops lead
the jet, the base stays thick and dense.
Frames 5 to 8: the jet breaks into a falling curtain of separate drops, the
base slumps into a hanging drip.
The jet must stay attached to the bottom centre of the cell in every frame.
```

### `burst-gib.png` — разрыв в клочья

```
A body bursting apart, blood only plus torn meat, 8 frames in a 4 by 2 grid,
256 px cells.
Frame 1: a compact dark wet mass.
Frames 2 to 4: a huge round cloud of blood expands in every direction, heavy
irregular chunks of meat fly outward trailing thin ribbons of blood behind
them, the cloud edge is torn and lumpy.
Frames 5 to 8: the cloud tears open, chunks scatter towards the corners of the
cell, long strings of droplets stretch outward, the centre thins to a dark
ring.
Much heavier and wider than the ordinary impact burst.
```

### `drop.png` — капли в полёте

```
Eight separate blood droplets and torn meat chunks, 4 by 2 grid, 64 px cells,
one object per cell, centred, nothing else in the cell.
Cell 1 to 3: round droplets of growing size, wet, a single small highlight.
Cell 4 and 5: elongated teardrops with a thin tail, as if flung.
Cell 6: a small ragged chunk of flesh, darker, with a wet highlight.
Cell 7: a larger ragged chunk with a torn edge.
Cell 8: a thin curved ribbon of blood.
No motion blur streaks, no trails, no glow — the engine stretches and rotates
these itself.
```

### `pool.png` — лужи на полу, маска

```
Six top down blood puddle silhouettes, 3 by 2 grid, 192 px cells.
Pure white shapes on a fully transparent background, no colour at all, the
opacity of the white is the depth of the blood: dense white in the middle,
thinning towards the edges.
Irregular ragged organic outlines, never circles. Small satellite spots and
flecks scattered around each main body. Two of the six stretched and streaked
as if the blood ran across the floor.
No outline, no highlight, no reflection, no texture of the floor.
```

### `wall.png` — потёки по стене, маска

```
Six blood splatter and run silhouettes for a vertical wall, 3 by 2 grid,
192 px cells.
Pure white on a fully transparent background, opacity is the density of blood.
Each: an irregular splat in the upper part of the cell with narrow rivulets
running straight down from it, of different lengths, each rivulet ending in a
fat rounded bead. Some fine spatter dots around the impact.
Gravity is straight down in every cell. No outline, no colour, no highlight.
```

### `lens.png` — кровь на «стекле»

```
Six blood splatters on the viewer's own visor, seen from extremely close,
3 by 2 grid, 256 px cells, on a fully transparent background.
Each cell: two or three thick opaque blobs of different sizes, a scatter of
small specks around them, and one blob with a short heavy drip running down
from it.
Rich dark crimson, almost opaque in the middle, thinning at the rim.
Read as blood sitting on glass in front of the camera: no depth, no
perspective, no background showing through as texture.
```

## Что движок делает сам

Чтобы не рисовать лишнего:

- **поворот и растяжку** капель по направлению полёта;
- **тонировку по дальности** — ближняя кровь яркая, дальняя тонет в мгле;
- **освещение луж и потёков** факелом и по рельефу камня: кровь затекает
  в швы кладки и сходит с выпуклостей;
- **выбор кадра** по времени, **выбор листа** по месту попадания;
- **сползание** кляксы на «стекле» и её высыхание.

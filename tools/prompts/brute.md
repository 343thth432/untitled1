# Тяжёлая (`brute`) — задание на генерацию

> **Задание отработано, тварь в игре.** Лист пришёл свой, не по этому
> тексту: Тяжёлая получилась приземистой и очень широкой, в сбруе и
> коротких шортах, синей масти, и бьёт не сверху вниз, а рывком на
> четырёх лапах с ударом в упор. Что реально стоит в игре — смотри
> `public/art/foes/brute/` и запись `brute` в `src/dungeon/foes.ts`.
> Текст ниже оставлен как образец разбивки листа на кадры; цвета и
> повадки в нём устарели.

Общие правила — в `README.md` рядом. Здесь только то, что своё.

Цвета сверены с записью `brute` в `src/dungeon/foes.ts`.

## Кто она

Самая крупная на этаже после хозяйки: ростом заметно выше остальных,
широкая в плечах, держит удар и бьёт тяжело. Медленная, от боли почти не
вздрагивает — прёт вперёд, пока не свалят.

**Волчица, а не кошка.** Морда вытянутая, уши стоячие и крупнее кошачьих,
хвост толстый и пушистый. Это хорошо расходится с остальными: издали её
видно по силуэту, ещё не разглядев цвет.

Чем она обязана отличаться от уже готовых:

| | Подворотня | Драная | **Тяжёлая** |
|---|---|---|---|
| осанка | прямая, лёгкая | сгорбленная | **вразвалку, плечи широко, грудь вперёд** |
| ход | вприпрыжку | крадётся | **тяжело переваливается с ноги на ногу** |
| удар | взмах с места | прыжок | **замах над головой и удар сверху вниз всем весом** |

## Описание персонажа

Дописывай к каждому запросу вместе с общим хвостом из `README.md`:

```
a tall powerfully built wolf-girl warrior, head and shoulders taller than a
normal person, broad shoulders, thick arms, heavy muscular build, standing
with feet planted wide and chest out,

shaggy grey-brown fur #8a6a62 with a paler tan underside #bb8c6e, upright
pointed wolf ears with dusky pink inner fur #cf8288, a long thick bushy tail,
a scarred muzzle, burning orange eyes #ff6a52, heavy blunt claws #b9c2ce,

wearing worn battle gear that covers her: a dark leather chest piece #463442
laced across the front with a broad strap over one shoulder, a single steel
pauldron #8e97a6 on her right shoulder with a brass rim #e0b048, steel
bracers on both forearms, a wide leather belt with a heavy brass buckle,
a short wrapped skirt of dark red cloth #8e2a24 over her hips, thick
dark-red knee wraps #5e2e2c, heavy scuffed boots #4a2422
```

Она воин, а не добыча: доспех закрывает торс и держится на ремнях, а не
на бретельках. Никаких ошейников, кружев, чулок в полоску и открытой
груди — этого в игре не будет, кадр просто не попадёт в конвейер.

## Один лист, шестнадцать фигур

Порядок чтения — строками сверху вниз, слева направо. Резчик разложит
сам, имена я подставлю в этом порядке.

**Строка 1 — ракурсы (5).** Осанка одна: стоит вразвалку, ноги широко.

| | что просить |
|---|---|
| `brute-0` | `standing heavy and wide, facing the viewer straight on` |
| `brute-1` | `turned 45 degrees to her left, three-quarter front view` |
| `brute-2` | `full side profile, facing to the right` |
| `brute-3` | `turned 135 degrees, three-quarter view from behind` |
| `brute-4` | `seen from directly behind, broad back and tail visible` |

**Строка 2 — шаг (4).** Идёт тяжело, корпус качается из стороны в сторону.

| | что просить |
|---|---|
| `brute-0-walk0` | `heavy stride towards the viewer, left foot planted forward, weight dropped onto it, right arm swung forward` |
| `brute-0-walk1` | `mid-stride, legs passing, body at the top of the sway, shoulders rolled` |
| `brute-0-walk2` | `heavy stride towards the viewer, right foot planted forward, weight dropped onto it, left arm swung forward` |
| `brute-0-walk3` | `mid-stride, legs passing, body swaying the other way` |

**Строка 3 — бой и смерть (6).**

| | что просить |
|---|---|
| `brute-0-atk` | `winding up: both arms raised high above her head, fists clenched together, weight back on her heels, head up` |
| `brute-0-atk1` | `smashing down: both arms driven straight down with full weight, knees bent, shoulders forward, mouth open in a roar` |
| `brute-0-pain` | `staggered by a hit: one shoulder driven back, head turned, one arm thrown out for balance, but still on her feet` |
| `brute-0-die0` | `dropping to one knee, one hand on the ground, head sagging` |
| `brute-0-die1` | `slumped forward on both knees, arms hanging, head down` |
| `brute-0-die2` | `dead on the floor, sprawled on her back, arms out, seen from standing eye level` |

Замах над головой — главное, по чему её узнают. Обе руки высоко, потом
вниз всем весом. Ни у кого другого такого нет.

## Подписи на листе не нужны

Если подписать кадры прямо на картинке, резчик примет надписи за фигуры.
Порядок чтения он и так знает — просто держи его.

## Размер в игре

Не подбирай в промте: он задаётся полем `scale` в `foes.ts` (сейчас 1.4
против 0.98 у Подворотни). Рисуй её крупной относительно кадра, как
остальных, а разницу в росте движок сделает сам.

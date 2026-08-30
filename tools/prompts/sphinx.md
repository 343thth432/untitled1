# Девятихвостая (`sphinx`) — задание на генерацию босса

Общие правила — в `README.md` рядом. Здесь только то, что своё.

Ставится на место Хозяйки склепа: это последняя тварь, которую ещё
рисует движок, и она же босс. Она стоит на лестнице каждого яруса —
пока жива, вниз не пустят.

## Почему именно так, а не просто крупнее

Все шестеро нарисованных — человекоподобные фигуры на двух ногах или
кошка размером с собаку. Босс, который отличается только ростом, будет
читаться как седьмая тварь, которую раздули. Ему надо ломать силуэт, а
не растягивать его.

Ломаем двумя вещами сразу:

1. **У неё нет ног.** Тело — огромная кошка, а от лопаток поднимается
   девичий торс. Ни у кого в бестиарии такого нет: Ловчая стоит на
   четырёх, но она целиком человек в кошачьей позе, а тут два существа
   в одном.
2. **Девять хвостов веером.** Они держатся поднятыми и разложенными
   за спиной, вдвое шире тела. Даже в темноте, когда ничего не
   разобрать, видно этот веер — и сразу ясно, кто пришёл.

И третье, помельче, но работает: **она единственная светлая.** Весь
бестиарий тёмный — рыжий, синий, чёрный, бурый, розовый. Она костяная,
белая с золотом. Белое пятно в чёрном склепе видно раньше, чем форму.

Чем она обязана отличаться от уже готовых:

| | Тяжёлая | Ловчая | **Девятихвостая** |
|---|---|---|---|
| силуэт | приземистая, широкая | мелкая, низкая | **длинное тело, торс выше человеческого роста, веер хвостов** |
| масть | синяя, тёмная | чёрная | **костяная белая с золотом** |
| ход | переваливается | стелется | **ступает медленно, как большая кошка, торс почти неподвижен** |
| бой | рывок в упор | прыжок | **залп с хвостов издали, лапой вблизи** |

## Описание персонажа

Дописывай к каждому запросу вместе с общим хвостом из `README.md`:

```
a huge sphinx-like cat-girl, the long powerful body of a great cat on four
heavy paws, and a girl's upper body rising from its shoulders where the
neck would be, the join covered by a thick mane, twice as long as a person
is tall and half again as tall at the head,

nine long tails held up and spread in a wide fan behind her, each tail
tipped with a small cold green flame #7dffc0,

short bone-white fur #efe6d2 shading to warm ash #b9b0a0 along the back and
paws, pale skin #f2ddc8 on the human half, upright cat ears with dusky rose
inner fur #d09a94, long straight white hair #e8e0cf, calm burning green
eyes #7dffc0, heavy blunt claws #cfc4ae,

wearing a broad gold collar #e8b44c around the throat with dark iron chain
links #3a3a44 hanging from it, gold rings on the upper arms, a fitted dark
cloth wrap #2b2630 across the chest and shoulders, gold bands where the
human waist meets the cat body

no Egyptian headdress, no pharaoh trappings, no hieroglyphs
```

Она страж, а не украшение: грудь закрыта тканью, золото — сбруя, а не
повод раздевать. Открытой груди на листе быть не должно, такой кадр в
конвейер не пойдёт.

## Один лист, шестнадцать фигур

Порядок чтения — строками сверху вниз, слева направо. Резчик разложит
сам, имена я подставлю в этом порядке.

**Строка 1 — ракурсы (5).** Стойка одна и та же: стоит на четырёх
лапах, торс прямой, хвосты веером. Эта фигура задаёт масштаб всему
листу, поэтому она обязана повториться пять раз без изменений.

| | что просить |
|---|---|
| `sphinx-0` | `standing on all four paws, human torso upright, facing the viewer straight on, nine tails fanned out behind` |
| `sphinx-1` | `turned 45 degrees to her left, three-quarter front view, body angled, torso still facing forward` |
| `sphinx-2` | `full side profile facing to the right, the whole length of the body visible, tails fanned behind` |
| `sphinx-3` | `turned 135 degrees, three-quarter view from behind` |
| `sphinx-4` | `seen from directly behind, the fan of nine tails filling the frame, torso seen from the back` |

**Строка 2 — ход (4).** Ступает медленно и ровно, как большая кошка.
Торс почти не качается — качаются плечи тела и веер хвостов.

| | что просить |
|---|---|
| `sphinx-0-walk0` | `pacing towards the viewer, front left paw reaching forward, rear right paw pushing off, torso steady` |
| `sphinx-0-walk1` | `mid-stride, paws passing under the body, tails swaying to one side` |
| `sphinx-0-walk2` | `pacing towards the viewer, front right paw reaching forward, rear left paw pushing off, torso steady` |
| `sphinx-0-walk3` | `mid-stride the other way, tails swaying back` |

**Строка 3 — бой, боль и смерть (7).**

| | что просить |
|---|---|
| `sphinx-0-cast` | `the nine tails flared wide and high, every tail-flame swollen bright, both arms spread, head tilted back — the volley about to leave` |
| `sphinx-0-atk` | `rearing: front paws lifted off the ground, chest high, one paw drawn back to strike, torso twisted` |
| `sphinx-0-atk1` | `striking: one huge front paw swept forward and down, claws out, shoulders driven after it` |
| `sphinx-0-pain` | `hit and recoiling: torso thrown back, head turned away, one paw slipping, the tail fan collapsing inward` |
| `sphinx-0-die0` | `front legs buckling, chest dropping, torso sagging forward, tails falling` |
| `sphinx-0-die1` | `collapsed on her side, torso down, tails spread limp across the ground` |
| `sphinx-0-die2` | `dead, the whole length of the body flat on the floor, tail flames gone out, seen from standing eye level` |

Кадр `cast` — главный. Она стрелок: залп сходит с хвостов, и по этому
кадру игрок должен успеть понять, что пора уходить с линии. Хвосты
должны быть разложены шире, чем в любом другом кадре, а огоньки —
ярче.

Гаснущие огоньки на `die2` — мелочь, но её видно: тварь лежит, и по
ним понятно, что всё.

## Что важно не потерять в кадрах

- **Веер хвостов — во всех кадрах.** Он и есть её примета. В боли он
  складывается, в смерти опадает, но он всегда есть.
- **Место стыка закрыто гривой.** Там, где девичий пояс переходит в
  кошачью грудь, нужна густая грива — иначе шов выглядит увечьем, а не
  породой.
- **Ход не должен приседать глубже стойки.** Общее правило из
  `README.md`: высота фигуры в кадрах шага держится в пределах десятой
  доли от стойки. У четвероногой это выходит само.
- **Подписи на листе не нужны** — резчик примет надписи за фигуры.

## Что она делает в игре

Ничего нового в движке под неё не понадобится, всё уже есть:

- **залп издали.** Поле `bolts` — у нынешней хозяйки их три веером.
  Оставлю три или подниму до пяти, по числу хвостов, которые реально
  видно на кадре.
- **лапа вблизи.** Стрелок, которого достали вплотную, бьёт лапой:
  это добавлено под Крылатую и работает для всех. Под это и нужны
  `atk` с `atk1`.
- **почти не вздрагивает.** `pain` у босса 0.12 — очередью её не
  застопорить, придётся отходить.
- **стоит на лестнице.** Пока жива, спуск закрыт. Это уже так и
  работает, менять нечего.

Когда лист придёт, из кода поменяется ровно две вещи: запись в
`foes.ts` и `bossFor`, который сейчас возвращает `matron`.

## Размер в игре

Не подбирай в промте: он задаётся полем `scale` в `foes.ts`. Рисуй её
крупной относительно кадра, как остальных, а разницу в росте движок
сделает сам.

Но учти две вещи, которые уже стоили правок другим тварям:

- **веер хвостов торчит вверх и съест высоту у самой фигуры.** Масштаб
  снимается с рамки кадра покоя, так что `scale` придётся поднимать
  сильнее обычного. Это нормально, я подберу.
- **холст под неё будет широкий.** У Тяжёлой 249 пикселей против 152 у
  обычных, у Девятихвостой выйдет больше. Конвейер расширяет холст сам
  и предупреждает, если кадр не влез, — но чем шире, тем дороже кадр,
  поэтому не надо разводить хвосты на весь экран.

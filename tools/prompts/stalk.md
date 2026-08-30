# Ловчая (`stalk`) — задание на генерацию

> **Отработано, тварь в игре.** Лист пришёл на семнадцать фигур: пять
> ракурсов, три кадра ползка вместо четырёх, прыжок в три кадра, боль и
> четыре кадра падения. Четвёртый кадр ползка собран отыгрышем назад —
> цикл идёт 0-1-2-1. Из четырёх лежачих взяты три, два последних почти
> одинаковы. Поставлена на место Копейщицы. Что стоит в игре — смотри
> `public/art/foes/stalk/` и запись `stalk` в `src/dungeon/foes.ts`.

Общие правила — в `README.md` рядом. Здесь только то, что своё.

Ставлю её на место Копейщицы: это последняя элита, которую ещё рисует
движок, и по повадке она ближе к охотнице, чем к строевой с копьём. Если
хочешь оставить Копейщицу и добавить Ловчую восьмой — скажи, поменяю
только запись в `foes.ts`, задание от этого не изменится.

## Кто она

Худая, гибкая, тихая. Ходит на четырёх и с четырёх же бросается — ни у
кого в бестиарии такого силуэта нет. Не берёт ни числом, как Подворотня,
ни весом, как Тяжёлая: она подбирается низко, ждёт и прыгает.

**Всё время на четырёх.** Не приседающая на секунду, а именно так и
живущая: ладони на полу во всех кадрах, кроме боли и смерти. Это её
главная примета — низкая длинная тень поперёк коридора вместо стоящей
фигуры.

Чем она обязана отличаться от уже готовых:

| | Драная | Матёрая | **Ловчая** |
|---|---|---|---|
| осанка | сгорбленная, на двух | крадётся, но на двух | **на четырёх, спина низко, зад выше плеч** |
| ход | дёргано, вприскочку | длинный шаг | **стелется, лапа за лапой, почти без качания** |
| удар | прыжок с места | взмах когтями стоя | **сжимается и прыгает на всю длину** |
| наряд | лохмотья | сбруя в ремнях | **чёрное кружево, нарукавники, ошейник** |

## Описание персонажа

Дописывай к каждому запросу вместе с общим хвостом из `README.md`:

```
a slender agile cat-girl stalker, lean and light, small frame, long limbs,
moving on all fours with both palms flat on the ground, back held low,
hips higher than the shoulders,

very long straight dark-brown hair #2e2226 falling past her shoulders and
hanging down around her face, blunt fringe, pointed cat ears with dusky
pink inner fur #c98f92, a long thin tail held high with a curl at the tip,
pale warm skin #e8c4b4, calm pale-green eyes #8fbfa8, short black claws #16131a,

wearing a black off-shoulder lace top #1c181b with a ruffled hem that leaves
the shoulders bare, long black fingerless arm warmers #241f22 pulled up over
the elbows, a black leather choker with a small silver ring #b9bcc4 at the
throat and a thin chain, a black leather strap buckled around one thigh,
dark sheer leggings, black nails
```

Она охотница, а не жертва: наряд закрытый, кружево и нарукавники —
приметы кроя, а не повод раздевать. Открытой груди и белья на листе быть
не должно, такой кадр в конвейер не пойдёт.

## Два изъяна референса, которые надо убрать

На присланной картинке есть ровно то, что ломает резчик:

- **серый фон.** Нужен прозрачный, а если генератор не умеет — плоская
  маджента. Серый съедается заливкой от края, но кружево и тёмные волосы
  на сером теряют кромку.
- **тень на полу.** Она попадёт в вырезанный силуэт и потащится за
  тварью чёрным пятном. В запросе — `no cast shadow, no ground`.

Всё остальное с картинки берём как есть: поза на четырёх, длина волос,
кружево, нарукавники, ошейник с кольцом, ремень на бедре.

## Один лист, шестнадцать фигур

Порядок чтения — строками сверху вниз, слева направо. Резчик разложит
сам, имена я подставлю в этом порядке.

**Строка 1 — ракурсы (5).** Стойка одна и та же: на четырёх, ладони на
полу, голова поднята, взгляд вперёд. Именно эта фигура задаёт масштаб
всему листу, поэтому она обязана повториться пять раз без изменений.

| | что просить |
|---|---|
| `stalk-0` | `crouched on all fours, facing the viewer straight on, head raised, looking at the viewer` |
| `stalk-1` | `on all fours, turned 45 degrees to her left, three-quarter front view` |
| `stalk-2` | `on all fours, full side profile facing to the right, back and tail in line` |
| `stalk-3` | `on all fours, turned 135 degrees, three-quarter view from behind` |
| `stalk-4` | `on all fours seen from directly behind, arched back and raised tail` |

**Строка 2 — ход (4).** Стелется вперёд, лапа за лапой. Корпус почти не
качается: она подкрадывается, а не бежит.

| | что просить |
|---|---|
| `stalk-0-walk0` | `creeping towards the viewer on all fours, left hand and right knee forward, body low` |
| `stalk-0-walk1` | `mid-creep, limbs passing under the body, shoulders level` |
| `stalk-0-walk2` | `creeping towards the viewer on all fours, right hand and left knee forward, body low` |
| `stalk-0-walk3` | `mid-creep the other way, limbs passing, head steady` |

**Строка 3 — прыжок, боль и смерть (7).**

| | что просить |
|---|---|
| `stalk-0-atk` | `coiled to spring: haunches gathered under her, elbows bent, shoulders dropped low, eyes fixed forward, tail lashing` |
| `stalk-0-atk1` | `launching forward off the ground, body stretched out flat, both arms reaching ahead, claws spread` |
| `stalk-0-atk2` | `landing on the viewer at full stretch, arms thrown wide, claws forward and close to camera, mouth open` |
| `stalk-0-pain` | `hit and recoiling: shoulders driven back, one hand off the ground, head turned away, still on three limbs` |
| `stalk-0-die0` | `collapsing forward, elbows buckling, chest dropping to the ground` |
| `stalk-0-die1` | `sprawled flat on her front, limbs splayed, head turned to one side` |
| `stalk-0-die2` | `dead on the floor, lying on her side, limbs limp, seen from standing eye level` |

Прыжок в три кадра — это не лишнее: движок умеет разгонять тварь во
время замаха, и три кадра ложатся на разгон ровно (сжалась, полетела,
достала). Так же сделана Тяжёлая, только у неё это медленный накат
всем весом, а у Ловчей — резкий рывок.

## Ход не должен приседать глубже стойки

Это правило вылезло на Матёрой и стоило ей заметного изъяна. Конвейер
ставит каждый кадр подошвами на пол и берёт высоту по рамке. Если в
кадрах шага фигура приседает намного ниже, чем в стойке, тварь скачет в
росте, когда поворачивается: анфас у неё есть шаг, а сбоку — только
стойка.

**Держи высоту фигуры в кадрах шага в пределах десятой доли от стойки.**
У Ловчей это выходит само: она и стоит, и ходит на четырёх, разница
только в переставленных лапах. Но если генератор вдруг подожмёт её к
полу в шаге — переспроси кадр.

Для сверки: у Подворотни шаг составляет 0.98 стойки, у Драной 1.05, у
Крылатой 0.84, у Матёрой 0.77 — и вот последняя уже видна.

## Подписи на листе не нужны

Если подписать кадры прямо на картинке, резчик примет надписи за фигуры.
Порядок чтения он и так знает — просто держи его.

## Размер в игре

Не подбирай в промте: он задаётся полем `scale` в `foes.ts`. Рисуй её
крупной относительно кадра, как остальных, а разницу в росте движок
сделает сам. Ловчая задумана некрупной и быстрой — примерно как
Подворотня по росту, но вдвое длиннее по силуэту, потому что стоит на
четырёх.

# Публикация сводок · py.motomov.ru

## Два склада (не путать)

| Файл | Раздел сайта | kind | id |
|---|---|---|---|
| `data/novosti.json` + `data/novosti/items/<id>.json` | Новости / Архив | всегда `"ai"` | `YYYY-MM-DD-utro`, `YYYY-MM-DD-vecher` или `YYYY-MM-DD-ai` |
| `data/briefs.json` | python | `"utro"` / `"vecher"` | тот же шаблон даты, но **другой** контент (наставник Python) |

Одинаковый `id` в двух файлах — норма. Различает параметр `kind` в ссылке: `brief.html?id=…&kind=ai` vs `kind=utro|vecher`.

Словарь (`kb.json`, карточки с `source`) ссылается на **ИИ-сводки** → `brief.html?id=<source>&kind=ai`. Полный текст этой сводки обязан лежать в `data/novosti/items/<id>.json`. Карточка с тем же `id` — в `data/novosti.json`.

## Почему два файла

`data/novosti.json` — лента карточек, без `body`. Её читают «Новости» и «Архив», и её же дописывает публикация. Полный текст выпуска живёт отдельно: `data/novosti/items/<id>.json`. Так архив не раздувает файл, который нужно прочитать, чтобы добавить одну сводку.

## Железные правила

1. Новый выпуск = новый файл `data/novosti/items/<id>.json` (объект целиком, с `body`) **и** карточка в начале `data/novosti.json`.
2. В карточке только `id`, `kind`, `date`, `dateLabel`, `topic`, `title`, `summary`. Поле `body` в ленту не класть.
3. **НИКОГДА** не заменять `novosti.json` одной записью и не удалять старые карточки. Архив UI только фильтрует.
4. Если `id` уже есть — обновить карточку на месте и перезаписать `items/<id>.json`. Длину ленты не уменьшать.
5. Чужой выпуск не переписывать. Чтобы добавить сводку, достаточно прочитать ленту карточек.
6. Проверка: `python -c "import json; d=json.load(open('data/novosti.json')); print(len(d), d[0]['id'], 'body' in d[0])"` — длина не падает, у карточки нет `body`.

## `data/kb.json`

- Upsert glossary-карточек по термину (что/зачем/не путать + `source` + `updated`).
- Карточки курса без `source` **не удалять**.
- `source` = id сводки ИИ, не выдумывать чужой id.

## `data/briefs.json` (python)

- Тоже только prepend. Курс и новости ИИ туда не класть.

## UI

- `novosti.html` — последние 14 карточек.
- `archive.html` — все карточки + фильтр по месяцу.
- `brief.html?kind=ai` догружает `data/novosti/items/<id>.json`.
- Менять UX можно; **не выкидывать файлы выпусков**.

## Чеклист одного выпуска ИИ

1. Собрать body/title/summary/topic.
2. `id = YYYY-MM-DD-utro` (утро), `…-vecher` (вечер) или `…-ai`; `kind = "ai"`.
3. Записать `data/novosti/items/<id>.json`.
4. Prepend карточки без `body` в `data/novosti.json` (длина +1 или update той же id).
5. Upsert термины в `kb.json` — по желанию.
6. Commit + push `main`.

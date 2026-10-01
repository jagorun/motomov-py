# Публикация сводок · py.motomov.ru

## Два склада (не путать)

| Файл | Раздел сайта | kind | id |
|---|---|---|---|
| `data/novosti.json` | Новости / Архив | всегда `"ai"` | `YYYY-MM-DD-utro` или `YYYY-MM-DD-vecher` (утро/вечер техсводки ИИ) |
| `data/briefs.json` | python | `"utro"` / `"vecher"` | тот же шаблон даты, но **другой** контент (наставник Python) |

Одинаковый `id` в двух файлах — норма. Различает параметр `kind` в ссылке: `brief.html?id=…&kind=ai` vs `kind=utro|vecher`.

Словарь (`kb.json`, карточки с `source`) ссылается на **ИИ-сводки** → `brief.html?id=<source>&kind=ai`. Поэтому запись с этим `id` обязана жить в `novosti.json`.

## Железные правила для `data/novosti.json`

1. **ВСЕГДА prepend** новой записи в начало массива.
2. **НИКОГДА** не делать replace / truncate / `[]` / перезапись одной записью.
3. **Не удалять** старые entries. Архив UI только фильтрует, данные не трогает.
4. Перед записью: прочитать текущий JSON → если `id` уже есть, обновить эту запись на месте (или skip), иначе `items = [new, ...items]`.
5. Проверка: `python -c "import json; d=json.load(open('data/novosti.json')); print(len(d), d[0]['id'])"` — длина не должна падать.

## `data/kb.json`

- Upsert glossary-карточек по термину (что/зачем/не путать + `source` + `updated`).
- Карточки курса без `source` **не удалять**.
- `source` = id сводки ИИ (`YYYY-MM-DD-utro|vecher`), не выдумывать `-ai`.

## `data/briefs.json` (python)

- Тоже только prepend. Курс и новости ИИ туда не класть.

## UI

- `novosti.html` — последние 14 выпусков.
- `archive.html` — весь массив + фильтр по месяцу.
- Менять UX можно; **не truncate JSON**.

## Чеклист одного выпуска ИИ

1. Собрать body/title/summary/topic.
2. `id = YYYY-MM-DD-utro` (утро) или `…-vecher` (вечер); `kind = "ai"`.
3. Prepend в `novosti.json` (длина +1 или update той же id).
4. Upsert термины в `kb.json`.
5. Drive-копия в папку «Техсводки Ai» — ок, но сайт читает только JSON в репо.
6. Commit + push `main`.

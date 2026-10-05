# Публикация YouTube-выжимок · py.motomov.ru

## Склад

| Файл | Раздел | kind | id |
|---|---|---|---|
| `data/youtube.json` | YouTube (`youtube.html`) | всегда `"youtube"` | `yt-<videoId>` |

Детальная страница: `brief.html?id=yt-…&kind=youtube`. Логика `loadBrief` в `js/app.js` подгружает `youtube.json`, когда `kind=youtube` или `id` начинается с `yt-`.

## Железные правила

1. **ВСЕГДА prepend** новой записи в начало массива.
2. **НИКОГДА** не truncate / replace всего файла одной записью.
3. Не трогать `briefs.json`, `novosti.json`, `kb.json` и прочие склады других агентов.
4. Перед записью: прочитать JSON → если `id` уже есть, обновить на месте, иначе `[new, ...items]`.
5. Проверка: `python -c "import json; d=json.load(open('data/youtube.json')); print(len(d), d[0]['id'])"`.

## Поля записи

`id`, `kind`, `date`, `dateLabel`, `channel`, `channelHandle`, `videoId`, `url`, `topic`, `title`, `summary`, `body` (массив строк/блоков как у briefs).

## Чеклист одного обзора

1. Взять свежий ролик канала (`yt-dlp --playlist-end 1`).
2. Опереться на субтитры или title+description; не выдумывать фактов.
3. Собрать русскую выжимку: о чём / 5–8 тезисов / для кого / ссылка.
4. Prepend в `data/youtube.json`.
5. Commit + push `main`.

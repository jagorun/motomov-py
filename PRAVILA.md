# Правила правок py.motomov.ru

## Урок 05 — живой чертёж сайта

Файл: `data/lessons/05-site.json` (каталог карточек ещё в `data/lessons.json`).
Живая страница: https://py.motomov.ru/lesson.html?id=05-site

При любом изменении сайта в том же коммите дописать этот урок (вкладка «Карта» или та, которую затронули).

## Вкладки урока

У урока массив `tabs`: `id` в адресе (`?tab=`), `title` — кнопка, `body` — блоки как у `body`.
Рендер: `lessonTabList` + `paintLesson` в `js/app.js`.
Сборка частей: `js/lesson-tabs-data.js` читает `data/lessons/<id>.json`.
Стили: `.lesson-tabs`, `.lesson-tab`.
Уроки 00–04: Зачем / Синтаксис / Механика / Практика.
Урок 05: Карта / HTML / JavaScript / JSON / Git / Практика.

## YouTube — выжимки каналов

Склад: `data/youtube.json`. Страница: `youtube.html` → https://py.motomov.ru/youtube  
Детали: `brief.html?id=yt-…&kind=youtube`.
Архив: `data/youtube-archive.json` (тот же формат). Все сводки сохраняем; при росте ленты **>~40** — перенос старых в архив, на ленте остаются свежие.

Каналы (6): `@nullzcode`, `@setkaproject`, `@vladilenminin`, `@neuropros`, `@prodadvice`, `@edvardgrishin` — таблица в `docs/YOUTUBE_PUBLISH.md`.

Новую запись **всегда prepend** в начало массива. Не truncate / replace файла одной записью. Чужие склады (`briefs.json`, `novosti.json`, `kb.json`) не трогать.

В каждом `body` обязателен блок **`## Оценка Motomov`** (польза / хайп / слабые места / можно ли опираться).

Правила публикации: `docs/YOUTUBE_PUBLISH.md`.

## Новости ИИ — карточка и файл выпуска

Лента: `data/novosti.json` — только карточки, без `body`. Страницы «Новости» и «Архив» читают её.
Текст: `data/novosti/items/<id>.json` — выпуск целиком. `brief.html?kind=ai` догружает этот файл.
Новую сводку писать двумя файлами: свой `items/<id>.json` и карточка в начало ленты. Ленту не заменять одной записью и не чистить. Чужие склады не трогать.

Правила: `docs/DIGEST_PUBLISH.md`.


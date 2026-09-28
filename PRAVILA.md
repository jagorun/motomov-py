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

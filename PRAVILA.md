# Правила правок py.motomov.ru

## Урок 05 — живой чертёж сайта

Файл: `data/lessons.json`, объект с `"id": "05-site"`.
Живая страница: https://py.motomov.ru/lesson.html?id=05-site

При любом изменении сайта в том же коммите дописать этот урок (вкладка «Карта» или та, которую затронули).

## Вкладки урока

В `data/lessons.json` у урока может быть массив `tabs`: `id` в адресе (`?tab=`), `title` — кнопка, `body` — блоки как у `body`.
Рендер: `lessonTabList` + `paintLesson` в `js/app.js`. Стили: `.lesson-tab`.

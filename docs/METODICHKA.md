# Методичка Python → сайт (metodichka.html)

Источник: Google Drive, папка с .md-файлами «Методички Python для оркестратора» (пишет бот «Методичка Python», 07:30 и 20:30 МСК).

- Папка Drive: `1gb64q1Zbzivz0R_bOj7OzUAFg5tjckZy`
- Файлы (одна глава = один файл `NN-*.md`):

| Файл | Drive file id |
|---|---|
| 00-vvedenie-i-shest-umeniy.md | 1_Rp-a4bl_WdAjE4TmDGTPdxt1f91XrW8 |
| 01-osnovy-python-stupen-1.md | 1ucGK6RsXg3LJrYJ3ZzlI66euL4dXF6MJ |
| 02-sredniy-uroven-proverka.md | 1k5LBphlPQFv6QKtQawGt907vLH2AgtAh |
| 03-vyzov-modeli-i-otkaz.md | 1IZMG8evpbd65ruHqXqxnnZx4iDWfsmY8 |
| 04-schema-a-ne-chat.md | 1QrvjjLOtSoxI_iuAQjaa97PqGPMu6aV6 |
| 05-nadezhnost-potolok-stoimost.md | 19sYRUoH8h4X6VHPVXkGxbVEqMco-iZMF |
| 06-prakticheskiy-skelet-i-cheklisty.md | 16cym4hnxcoZf6R93AoEh2Vr9sjdk4C0l |

Google Doc «01 Основы Python — Ступень 1 (для чтения)» в той же папке — копия для чтения, не публикуется.

## Рутина (07:50 и 20:50 МСК)

1. Перечислить папку (`list_folder` по id выше): появились новые `NN-*.md` — тоже скачать.
2. Скачать все `NN-*.md` в `/workspace/metodichka-src/` (DownloadFile, connection `user-Google-drive`).
3. `python3 scripts/build_metodichka.py /workspace/metodichka-src` → перезаписывает `metodichka.html`.
4. Если `git diff --quiet metodichka.html` — изменений нет, не коммитить.
5. Коммит только `metodichka.html`: `metodichka: обновление ДД.ММ утро|вечер`, push в main.

Не трогать: data/novosti.json, kb.json, briefs.json, youtube.json, put-*.html.
Шапка берётся из novosti.html; на put-*.html пункт «Методичка» добавляет js/app.js.

## Навигация на странице (с 22.10.2026)

Бот добавляет в .md навигационную разметку; сборщик её понимает, главы без неё собираются как раньше:

- `<a id="s1-2"></a>` → якорь; `[текст](#s1-2)` и `[текст](03-….md#s3-2)` → ссылки внутри страницы (все главы на одной странице);
- `<!-- nav:toc:start/end -->` → блок «Оглавление файла» / «Состав раздела» (длинный сворачивается до 10 пунктов);
- `<!-- nav:index:start/end -->` → «Указатель терминов»: из него сборщик берёт термины (JSON `#m-terms`) и делает тихие ссылки
  на первое упоминание термина в `коде` в каждом разделе (кроме раздела, где термин объясняется; неоднозначные имена не связываются);
- `<details><summary>Решение</summary> … </details>` → сворачиваемое «Решение».

`js/metodichka-nav.js`: поиск (кнопка «🔍», клавиши `/` и Ctrl+K; ищет и в свёрнутых «Решениях», плюс Словарь сайта `data/kb.json`),
карточка термина (наведение на ПК, нажатие на телефоне), переход по ссылке с запоминанием места:
кнопка «← Вернуться к чтению» и кнопка «Назад» браузера возвращают ровно туда, откуда перешли (место хранится в history.state).
Текст глав сборщик не меняет — только ссылки, якоря и обёртки.

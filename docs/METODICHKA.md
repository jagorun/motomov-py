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

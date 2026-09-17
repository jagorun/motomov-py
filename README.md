# py.motomov.ru

Учебный сайт motomov: Python с нуля и путь к своей RAG-системе.

Это **отдельный** проект от визитки.

| Сайт | Репозиторий | Задача |
|---|---|---|
| [motomov.ru](https://www.motomov.ru/) | `jagorun/roy-business-card` | визитка, афоризмы, стихи |
| [py.motomov.ru](https://py.motomov.ru/) | `jagorun/motomov-py` | курс, база, лента сводок |

Стиль общий (тёмный фон, неон `#39ff14`, сетка). Структура независимая.

## Разделы

- **Новое** (`news.html`, `data/briefs.json`) — утро/вечер наставника.
- **Курс** (`course.html`, `lesson.html`, `data/lessons.json`) — шесть уроков.
- **База** (`kb.html`, `data/kb.json`) — карточки с поиском.

Сводки пишет автоматизация Grok: читает `data/briefs.json`, ставит выпуск в начало, пушит в `main`. Курс туда не кладёт.

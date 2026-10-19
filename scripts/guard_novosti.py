#!/usr/bin/env python3
"""Сторож ленты data/novosti.json.

Лента только растёт: легальные писатели (prepend_novosti.py) лишь добавляют
карточки в начало или обновляют карточку с тем же id. Внешний писатель
(автор EXTERNAL_EMAILS, коммиты «news: YYYY-MM-DD ai …») иногда затирает файл
заготовкой или срезает старые карточки и добавляет id вида YYYY-MM-DD-ai.

Алгоритм:
1. Проходим историю файла от старых коммитов к новым и копим «эталон»:
   версии внешнего автора и битые версии пропускаем, из остальных берём
   объединение карточек (ни одна однажды принятая карточка не теряется).
2. Текущий файл: если HEAD от внешнего автора — из него берём только новые
   валидные карточки YYYY-MM-DD-utro|vecher (в начало), существующие не меняем.
   Иначе текущий файл и есть последняя легальная версия (уже в эталоне).
3. Из итога выкидываем мусор: новые id «-ai» (дата позже LEGACY_AI_CUTOFF)
   и карточки-заготовки.
4. Если итог отличается от файла — пишем файл (exit 0, печатаем RESTORED N).

  python3 scripts/guard_novosti.py            # проверить и при нужде починить
  python3 scripts/guard_novosti.py --check    # только проверить (exit 1 если нужна починка)
  python3 scripts/guard_novosti.py --file X --head-author EMAIL   # для тестов
"""
from __future__ import annotations
import argparse, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REL = "data/novosti.json"
EXTERNAL_EMAILS = {"juniorskillapp@gmail.com"}
# Старые карточки «-ai» (до 12.10 включительно) — настоящие выпуски, их храним.
LEGACY_AI_CUTOFF = "2026-10-12"
NEW_ID = re.compile(r"^\d{4}-\d{2}-\d{2}-(utro|vecher)$")
JUNK_MARKERS = ("placeholder", "see_local_file", "lorem ipsum")


def parse(text: str | None):
    if text is None:
        return None
    try:
        data = json.loads(text)
    except Exception:
        return None
    if not isinstance(data, list) or not data:
        return None
    if not all(isinstance(c, dict) and isinstance(c.get("id"), str) and c["id"] for c in data):
        return None
    return data


def is_junk(card: dict) -> bool:
    cid = card.get("id", "")
    if cid.endswith("-ai") and cid[:10] > LEGACY_AI_CUTOFF:
        return True
    blob = json.dumps(card, ensure_ascii=False).lower()
    return any(m in blob for m in JUNK_MARKERS)


def is_valid_new(card: dict) -> bool:
    return (bool(NEW_ID.match(card.get("id", "")))
            and isinstance(card.get("title"), str) and card["title"].strip()
            and isinstance(card.get("summary"), str) and len(card["summary"].strip()) >= 20
            and not is_junk(card))


def git(*args: str) -> str | None:
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def merge(base: list[dict], newer: list[dict]) -> list[dict]:
    """newer — легальная версия: её карточки (в её порядке) + потерянные из base на своих местах."""
    newer = [c for c in newer if not is_junk(c)]
    have = {c["id"] for c in newer}
    out = list(newer)
    for i, c in enumerate(base):
        if c["id"] in have:
            continue
        # вставить после ближайшего предшественника из base, который уже есть в out
        pos = 0
        for prev in reversed(base[:i]):
            idx = next((k for k, x in enumerate(out) if x["id"] == prev["id"]), None)
            if idx is not None:
                pos = idx + 1
                break
        out.insert(pos, c)
        have.add(c["id"])
    return out


def baseline(skip_head: bool) -> tuple[list[dict], int]:
    log = git("log", "--reverse", "--format=%H%x09%ae", "--", REL) or ""
    rows = [l.split("\t") for l in log.splitlines() if "\t" in l]
    if skip_head and rows:
        head = (git("rev-parse", "HEAD") or "").strip()
        rows = [r for r in rows if r[0] != head]
    base: list[dict] = []
    used = 0
    for sha, email in rows:
        if email.lower() in EXTERNAL_EMAILS:
            continue
        data = parse(git("show", f"{sha}:{REL}"))
        if data is None:
            continue
        base = merge(base, data)
        used += 1
    return [c for c in base if not is_junk(c)], used


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default=str(ROOT / REL))
    ap.add_argument("--head-author", help="email автора текущей версии (по умолчанию автор HEAD)")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()

    path = Path(a.file)
    raw = path.read_text(encoding="utf-8") if path.exists() else None
    cur = parse(raw)
    head_author = (a.head_author or (git("log", "-1", "--format=%ae") or "")).strip().lower()
    external = head_author in EXTERNAL_EMAILS
    # Если текущий файл совпадает с HEAD и автор легальный — HEAD входит в эталон.
    # Если передан посторонний файл (--file) или HEAD внешний — HEAD в эталон не берём.
    custom_file = a.file != str(ROOT / REL)
    base, used = baseline(skip_head=external or custom_file)
    if not base:
        print("guard: нет ни одной хорошей версии в истории — ничего не делаю", file=sys.stderr)
        return 0 if cur is not None else 2

    if cur is None:
        result, why = base, "файл битый или не список"
    elif external:
        known = {c["id"] for c in base}
        fresh = [c for c in cur if c["id"] not in known and is_valid_new(c)]
        result, why = fresh + base, "версия внешнего автора"
    else:
        result, why = merge(base, cur), "легальная версия"

    cur_ids = [c["id"] for c in cur] if cur else []
    if cur is not None and result == cur:
        print(f"guard: OK, {len(cur)} карточек, первая {cur_ids[0]}")
        return 0
    lost = [c["id"] for c in result if c["id"] not in set(cur_ids)]
    dropped = [i for i in cur_ids if i not in {c["id"] for c in result}]
    print(f"guard: нужна починка ({why}); было {len(cur_ids)}, станет {len(result)}; "
          f"вернуть {len(lost)}: {lost[:5]}{'…' if len(lost) > 5 else ''}; убрать: {dropped}; "
          f"эталон из {used} версий")
    if a.check:
        return 1
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"RESTORED {len(result)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

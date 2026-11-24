#!/usr/bin/env python3
"""Переносит полный текст выпусков из ленты data/novosti.json в data/novosti/items/<id>.json.

Правило 2 из docs/DIGEST_PUBLISH.md: в ленте только карточки без body, текст — в items/<id>.json.
Если рутина записала выпуск прямо в ленту (с body), этот скрипт:
  1) пишет items/<id>.json = карточка целиком (с body), как scripts/prepend_novosti.py;
     если файл уже есть и в нём другой текст — побеждает лента (это более свежая запись, правило 4);
  2) убирает из карточки только поле body, остальные поля и порядок карточек не меняет;
  3) проверяет: длина ленты та же, id те же, текст в items побайтно равен тому, что был в ленте.

  python3 scripts/normalize_novosti.py           # перенести
  python3 scripts/normalize_novosti.py --check   # только показать (exit 1, если есть что переносить)
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "data" / "novosti.json"
ITEMS = ROOT / "data" / "novosti" / "items"


def dump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    raw = INDEX.read_text(encoding="utf-8")
    cards = json.loads(raw)
    if not isinstance(cards, list) or not cards:
        print("normalize: лента не список — ничего не делаю", file=sys.stderr)
        return 2
    inline = [c for c in cards if isinstance(c, dict) and isinstance(c.get("body"), list)]
    if not inline:
        print(f"normalize: OK, {len(cards)} карточек, текстов в ленте нет")
        return 0
    print("normalize: тексты в ленте:", ", ".join(c["id"] for c in inline))
    if a.check:
        return 1
    ITEMS.mkdir(parents=True, exist_ok=True)
    for c in inline:
        iid = c.get("id", "")
        if not iid or any(ch in iid for ch in "/\\") or ".." in iid:
            print(f"normalize: небезопасный id {iid!r}", file=sys.stderr)
            return 2
        path = ITEMS / f"{iid}.json"
        if path.exists():
            old = json.loads(path.read_text(encoding="utf-8"))
            if old == c:
                continue
            print(f"normalize: {iid}: items-файл отличается — пишу версию из ленты")
        path.write_text(dump(c) + "\n", encoding="utf-8")
        back = json.loads(path.read_text(encoding="utf-8"))
        if back != c:
            print(f"normalize: {iid}: проверка записи не прошла", file=sys.stderr)
            return 1
    out = [{k: v for k, v in c.items() if k != "body"} if isinstance(c, dict) else c for c in cards]
    if [c.get("id") for c in out] != [c.get("id") for c in cards] or len(out) != len(cards):
        print("normalize: изменился состав ленты — отмена", file=sys.stderr)
        return 1
    tail = "\n" if raw.endswith("\n") else ""
    INDEX.write_text(dump(out) + tail, encoding="utf-8")
    print(f"normalize: перенесено {len(inline)}, в ленте {len(out)} карточек")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

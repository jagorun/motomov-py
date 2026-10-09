#!/usr/bin/env python3
"""Upsert one AI digest: full text in data/novosti/items/<id>.json, card in data/novosti.json."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "data" / "novosti.json"
ITEMS = ROOT / "data" / "novosti" / "items"
CARD_KEYS = ("id", "kind", "date", "dateLabel", "topic", "title", "summary")

def card_of(entry: dict) -> dict:
    return {k: entry.get(k, "") for k in CARD_KEYS}

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("entry_json", help="path to JSON object for one digest")
    args = ap.parse_args()
    entry = json.loads(Path(args.entry_json).read_text(encoding="utf-8"))
    if not isinstance(entry, dict) or not entry.get("id"):
        print("entry must be object with id", file=sys.stderr)
        return 2
    entry.setdefault("kind", "ai")
    iid = entry["id"]
    if "/" in iid or ".." in iid or not iid.endswith(".json") and any(c in iid for c in "\\"):
        pass
    if any(c in iid for c in "/\\"):
        print("unsafe id", file=sys.stderr)
        return 2
    ITEMS.mkdir(parents=True, exist_ok=True)
    (ITEMS / f"{iid}.json").write_text(json.dumps(entry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    items = json.loads(INDEX.read_text(encoding="utf-8"))
    if not isinstance(items, list):
        print("novosti.json must be a list of cards", file=sys.stderr)
        return 2
    before = len(items)
    card = card_of(entry)
    for i, old in enumerate(items):
        if old.get("id") == iid:
            items[i] = card
            action = "updated"
            break
    else:
        items = [card] + items
        action = "prepended"
    INDEX.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{action} {iid}: {before} → {len(items)}")
    if action == "prepended" and len(items) != before + 1:
        print("ERROR: length did not grow by 1", file=sys.stderr)
        return 1
    if action == "updated" and len(items) != before:
        print("ERROR: update changed length", file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

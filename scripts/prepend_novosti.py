#!/usr/bin/env python3
"""Safely prepend (or upsert) one AI digest into data/novosti.json. Never truncates."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data" / "novosti.json"

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("entry_json", help="path to JSON object for one digest")
    args = ap.parse_args()
    entry = json.loads(Path(args.entry_json).read_text(encoding="utf-8"))
    if not isinstance(entry, dict) or not entry.get("id"):
        print("entry must be object with id", file=sys.stderr)
        return 2
    entry.setdefault("kind", "ai")
    items = json.loads(PATH.read_text(encoding="utf-8"))
    if not isinstance(items, list):
        print("novosti.json must be a list", file=sys.stderr)
        return 2
    before = len(items)
    iid = entry["id"]
    for i, old in enumerate(items):
        if old.get("id") == iid:
            items[i] = entry
            action = "updated"
            break
    else:
        items = [entry] + items
        action = "prepended"
    PATH.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
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

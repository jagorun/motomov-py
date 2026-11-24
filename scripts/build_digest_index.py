#!/usr/bin/env python3
"""Собирает лёгкий указатель ленты data/novosti/digest/ (meta.json + YYYY-MM.json) для страниц «Новости» и «Архив».

Только ЧИТАЕТ data/novosti.json и data/novosti/items/<id>.json (или body прямо в карточке,
если рутина записала выпуск в ленту) и ПИШЕТ производные файлы в data/novosti/digest/. Исходные данные не меняет.
Файл детерминированный (без времени сборки): если ничего не изменилось, git не видит разницы.

Для каждого выпуска: метки тем, число новостей и терминов словаря, объём (слов) и список
главных новостей — заголовок без номера, дата, метки и первое предложение (обрезанное по слову).
Сайт сверяет запись с карточкой по подписи s = «длина title:длина summary»; при расхождении
или отсутствии записи догружает сам выпуск, так что устаревший указатель ничего не ломает.

  python3 scripts/build_digest_index.py           # записать, если изменилось
  python3 scripts/build_digest_index.py --check   # exit 1, если файлы устарели
"""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "data" / "novosti.json"
ITEMS = ROOT / "data" / "novosti" / "items"
OUT_DIR = ROOT / "data" / "novosti" / "digest"
TAG_ALIAS = {"агенты": "агент", "модели": "модель", "чипы": "чип", "роботы": "робот", "инфраструктура": "инфра",
             "регулирование": "регуляторика", "инструмент": "инструменты", "research": "исследование"}
SRC = re.compile(r"^\s*[-*]?\s*Источник", re.I)
GIST_MAX = 120


def section_kind(title: str) -> str:
    t = title.lower()
    if re.search(r"заголовок дня", t): return "dek"
    if re.search(r"коротко|главное|итог дня|суть", t): return "lead"
    if re.search(r"словар", t): return "glossary"
    if re.search(r"подписк|акци|триал", t): return "promo"
    return "normal"


def tag_norm(t: str) -> str:
    k = t.strip(); low = k.lower()
    return TAG_ALIAS.get(low) or (k if re.fullmatch(r"[A-Z]{2,}", k) else low)


def title_parts(title: str):
    tags: list[str] = []
    def grab(m):
        tags.append(m.group(1)); return ""
    t = re.sub(r"\s*\[([^\]]+)\]", grab, title).strip()
    t = re.sub(r"^\d{1,2}[.)]\s+", "", t)
    date = ""
    m = re.match(r"^(\d{1,2}(?:[–-]\d{1,2})?\.\d{1,2}(?:[–-]\d{1,2}\.\d{1,2})?)\s+·\s+", t)
    if m:
        date = m.group(1); t = t[m.end():]
    return t, date, tags


def gist(lines: list[str]) -> str:
    for ln in lines:
        s = ln.strip()
        if not s or SRC.match(s) or s.startswith("```"):
            continue
        s = re.sub(r"^[-*]\s+", "", s).replace("**", "")
        m = re.match(r"^(.+?[.!?…])(?=\s+[«\"(A-ZА-ЯЁ0-9]|$)", s)
        first = m.group(1) if m and len(m.group(1)) >= 25 else s
        if len(first) <= GIST_MAX:
            return first
        cut = first[:GIST_MAX]
        cut = cut[: cut.rfind(" ")] if " " in cut[40:] else cut
        return cut.rstrip(" ,;:—–-") + "…"
    return ""


def digest(body: list) -> dict:
    tags: list[str] = []; news = []; words = 0; terms = 0
    kind = "normal"; cur = None
    for raw in body:
        ln = str(raw)
        words += len(ln.split())
        if ln.startswith("## "):
            kind = section_kind(ln[3:]); cur = None; continue
        if ln.startswith("### "):
            if kind == "glossary":
                terms += 1; cur = None
            elif kind == "normal":
                h, d, tg = title_parts(ln[4:].strip())
                norm = []
                for x in tg:
                    n = tag_norm(x)
                    if n and n not in norm: norm.append(n)
                    if n and n not in tags: tags.append(n)
                cur = {"h": h, "d": d, "t": norm, "lines": []}
                news.append(cur)
            else:
                cur = None
            continue
        if cur is not None:
            cur["lines"].append(ln)
    out_news = []
    for i, n in enumerate(news, 1):
        e = {"a": f"n{i}", "h": n["h"]}
        if n["d"]: e["d"] = n["d"]
        if n["t"]: e["t"] = n["t"]
        g = gist(n["lines"])
        if g: e["g"] = g
        out_news.append(e)
    return {"t": tags, "w": words, "n": len(news), "g": terms, "news": out_news}


def build() -> dict[str, str]:
    """Возвращает {имя файла: текст}: meta.json (метки и счётчики всех выпусков) и YYYY-MM.json (главные новости)."""
    cards = json.loads(INDEX.read_text(encoding="utf-8"))
    meta: dict = {}
    months: dict[str, dict] = {}
    for c in cards:
        if not isinstance(c, dict) or not c.get("id"):
            continue
        iid = c["id"]
        body = c.get("body") if isinstance(c.get("body"), list) else None
        if body is None and "/" not in iid and "\\" not in iid:
            p = ITEMS / f"{iid}.json"
            if p.exists():
                try:
                    full = json.loads(p.read_text(encoding="utf-8"))
                    body = full.get("body") if isinstance(full.get("body"), list) else None
                except Exception:
                    body = None
        if not body:
            continue
        d = digest(body)
        sig = f"{len(str(c.get('title') or ''))}:{len(str(c.get('summary') or ''))}"
        meta[iid] = {"s": sig, "t": d["t"], "w": d["w"], "n": d["n"], "g": d["g"]}
        month = str(c.get("date") or iid)[:7]
        if re.fullmatch(r"\d{4}-\d{2}", month):
            months.setdefault(month, {})[iid] = {"s": sig, "news": d["news"]}
    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":")) + "\n"
    files = {"meta.json": dump({"v": 1, "count": len(meta), "months": sorted(months, reverse=True), "items": meta})}
    for m, v in months.items():
        files[f"{m}.json"] = dump({"v": 1, "items": v})
    return files


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    try:
        files = build()
    except Exception as e:  # никогда не роняем публикацию из-за указателя
        print(f"digest-index: не собрал ({e}) — файлы не трогаю", file=sys.stderr)
        return 0
    changed = [n for n, t in files.items() if not (OUT_DIR / n).exists() or (OUT_DIR / n).read_text(encoding="utf-8") != t]
    if not changed:
        print("digest-index: без изменений")
        return 0
    if a.check:
        print("digest-index: устарели", ", ".join(changed))
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for n in changed:
        (OUT_DIR / n).write_text(files[n], encoding="utf-8")
    print("digest-index: обновлены", ", ".join(changed))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

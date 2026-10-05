#!/usr/bin/env python3
"""Verify example outputs for python-deep courses and c1-* briefs.

Usage:
  python3 scripts/check_examples.py
  python3 scripts/check_examples.py --course 1
  python3 scripts/check_examples.py --course 2
  python3 scripts/check_examples.py --all

Exit code 0 only when every checked example matches byte-for-byte.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run_code(code: str, stdin: str | None = None) -> tuple[int, str, str]:
    r = subprocess.run(
        ["python3", "-c", code],
        input=stdin,
        capture_output=True,
        text=True,
    )
    return r.returncode, r.stdout, r.stderr


def check_deep(course_num: int = 1) -> list[str]:
    data = json.loads((ROOT / "data" / "python-deep.json").read_text())
    courses = data.get("courses") or []
    if course_num < 1 or course_num > len(courses):
        return [f"course {course_num} missing"]
    course = courses[course_num - 1]
    errors: list[str] = []
    checked = 0
    for mod in course.get("modules") or []:
        for tab in mod.get("tabs") or []:
            examples = tab.get("examples")
            if not examples:
                # legacy single code without output: skip match, but warn if course 1
                if course_num in (1, 2) and tab.get("id") == "examples" and tab.get("code") and "output" not in tab:
                    errors.append(f"deep m{mod.get('num')} examples: legacy code without examples[]/output")
                continue
            for i, ex in enumerate(examples):
                code = ex.get("code")
                if code is None or "output" not in ex:
                    errors.append(f"deep m{mod.get('num')} ex[{i}]: missing code/output")
                    continue
                expect = ex.get("output")
                stdin = ex.get("stdin")
                expect_error = bool(ex.get("expect_error"))
                rc, out, err = run_code(code, stdin=stdin)
                checked += 1
                if expect_error:
                    last = ((err.strip().splitlines() or [""])[-1] + "\n") if err.strip() else ""
                    # stored output may be last stderr line with newline
                    if rc == 0:
                        errors.append(f"deep m{mod.get('num')} ex[{i}]: expected error, got ok out={out!r}")
                    elif last != expect:
                        errors.append(
                            f"deep m{mod.get('num')} ex[{i}]: error mismatch\n"
                            f"  expect={expect!r}\n  actual={last!r}"
                        )
                else:
                    if rc != 0:
                        errors.append(f"deep m{mod.get('num')} ex[{i}]: run failed: {err.strip().splitlines()[-1:]}")
                    elif out != expect:
                        errors.append(
                            f"deep m{mod.get('num')} ex[{i}]: stdout mismatch\n"
                            f"  expect={expect!r}\n  actual={out!r}"
                        )
    print(f"deep course {course_num}: checked {checked} examples, errors {len(errors)}")
    return errors


def extract_fence(block: str, lang: str) -> str | None:
    prefix = f"```{lang}"
    if not block.startswith(prefix):
        return None
    body = block[len(prefix):]
    if body.startswith("\n"):
        body = body[1:]
    if body.endswith("```"):
        body = body[:-3]
    return body


def check_c1_briefs() -> list[str]:
    items = json.loads((ROOT / "data" / "briefs.json").read_text())
    errors: list[str] = []
    checked = 0
    for brief in items:
        bid = str(brief.get("id") or "")
        if not bid.startswith("c1-"):
            continue
        body = brief.get("body") or []
        i = 0
        while i < len(body):
            part = body[i]
            if isinstance(part, str) and part.startswith("```python"):
                code = extract_fence(part, "python")
                if code is None:
                    errors.append(f"{bid}[{i}]: bad python fence")
                    i += 1
                    continue
                # require following Вывод: + ```text
                if i + 2 >= len(body) or body[i + 1].strip() != "Вывод:" or not str(body[i + 2]).startswith("```text"):
                    errors.append(f"{bid}[{i}]: python block without Вывод:/```text pair")
                    i += 1
                    continue
                expect = extract_fence(body[i + 2], "text")
                if expect is None:
                    errors.append(f"{bid}[{i+2}]: bad text fence")
                    i += 3
                    continue
                rc, out, err = run_code(code if code.endswith("\n") else code + "\n")
                checked += 1
                if rc != 0:
                    errors.append(f"{bid}[{i}]: run failed: {(err.strip().splitlines() or [''])[-1]}")
                elif out != expect:
                    errors.append(
                        f"{bid}[{i}]: stdout mismatch\n  expect={expect!r}\n  actual={out!r}"
                    )
                i += 3
                continue
            i += 1
    print(f"c1 briefs: checked {checked} python/text pairs, errors {len(errors)}")
    return errors


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--course", type=int, default=None, help="1 or 2; default 1 unless --all")
    ap.add_argument("--all", action="store_true", help="check courses 1 and 2 plus c1 briefs")
    ap.add_argument("--skip-briefs", action="store_true")
    args = ap.parse_args()
    errs: list[str] = []
    if args.all:
        courses = [1, 2]
    elif args.course is None:
        courses = [1]
    else:
        courses = [args.course]
    for num in courses:
        errs.extend(check_deep(num))
        if num == 1 and not args.skip_briefs:
            errs.extend(check_c1_briefs())
    for e in errs:
        print("ERROR:", e)
    if errs:
        print(f"FAIL ({len(errs)} problems)")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())

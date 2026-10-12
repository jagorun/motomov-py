#!/usr/bin/env python3
"""Собирает metodichka.html из .md-файлов методички (Google Drive -> сайт).

Запуск:  python3 scripts/build_metodichka.py [ПАПКА_С_MD]   (по умолчанию /workspace/metodichka-src)
Каждый файл NN-*.md = глава; заголовок «# ...» = название главы, «## ...» = пункты оглавления.
Только stdlib. Шапка берётся из novosti.html, чтобы совпадать с остальным сайтом.
"""
import html, re, sys, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/workspace/metodichka-src")
OUT = ROOT / "metodichka.html"

def esc(s): return html.escape(s, quote=True)

def inline(t):
    codes = []
    def keep(m):
        codes.append("<code>" + esc(m.group(1)) + "</code>"); return f"\x00{len(codes)-1}\x00"
    t = re.sub(r"`([^`]+)`", keep, t)
    t = esc(t)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", t)
    t = re.sub(r"\x00(\d+)\x00", lambda m: codes[int(m.group(1))], t)
    return t

def slug(s, used):
    b = re.sub(r"[^\wа-яё]+", "-", s.lower()).strip("-")[:60] or "s"
    s2, i = b, 2
    while s2 in used: s2, i = f"{b}-{i}", i + 1
    used.add(s2); return s2

def md_to_html(lines, prefix, used):
    out, toc, i, title = [], [], 0, None
    para = []
    def flush():
        if para: out.append("<p>" + "<br>".join(inline(x.rstrip()) for x in para) + "</p>"); para.clear()
    while i < len(lines):
        ln = lines[i].rstrip("\n")
        s = ln.strip()
        if s.startswith("```"):
            flush(); lang = s[3:].strip(); buf = []; i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                buf.append(lines[i].rstrip("\n")); i += 1
            i += 1
            cls = f' class="lang-{esc(lang)}"' if lang else ""
            out.append(f"<pre><code{cls}>{esc(chr(10).join(buf))}</code></pre>"); continue
        m = re.match(r"^(#{1,6})\s+(.*)", ln)
        if m:
            flush(); lvl, txt = len(m.group(1)), m.group(2).strip()
            if lvl == 1 and title is None: title = txt; i += 1; continue
            lvl = max(lvl, 2) + 1  # внутри главы: ## -> h3
            sid = slug(prefix + "-" + txt, used)
            if lvl == 3: toc.append((sid, txt))
            out.append(f'<h{min(lvl,6)} id="{sid}">{inline(txt)}</h{min(lvl,6)}>'); i += 1; continue
        if re.match(r"^(-{3,}|\*{3,})$", s): flush(); out.append("<hr>"); i += 1; continue
        if s.startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|?\s*:?-{2,}", lines[i+1]):
            flush(); cells = lambda r: [c.strip() for c in r.strip().strip("|").split("|")]
            head = cells(ln); i += 2; rows = []
            while i < len(lines) and lines[i].strip().startswith("|"): rows.append(cells(lines[i])); i += 1
            t = "<div class=\"md-table\"><table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
            t += "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows)
            out.append(t + "</tbody></table></div>"); continue
        if s.startswith(">"):
            flush(); buf = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                buf.append(lines[i].strip()[1:].strip()); i += 1
            out.append("<blockquote><p>" + "<br>".join(inline(b) for b in buf if b) + "</p></blockquote>"); continue
        if re.match(r"^\s*([-*+]|\d+[.)])\s+", ln):
            flush(); stack = []  # (indent, tag)
            while i < len(lines) and (re.match(r"^\s*([-*+]|\d+[.)])\s+", lines[i]) or (lines[i].startswith("  ") and lines[i].strip() and stack)):
                cur = lines[i].rstrip("\n"); mm = re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.*)", cur)
                if not mm:
                    out[-1] = out[-1][:-5] + "<br>" + inline(cur.strip()) + "</li>"; i += 1; continue
                ind, tag = len(mm.group(1).expandtabs(4)), ("ol" if mm.group(2)[0].isdigit() else "ul")
                while stack and ind < stack[-1][0]: out.append(f"</{stack.pop()[1]}>")
                if not stack or ind > stack[-1][0]:
                    if stack and out[-1].endswith("</li>"): out[-1] = out[-1][:-5]; stack[-1] = (stack[-1][0], stack[-1][1], True)
                    out.append(f"<{tag}>"); stack.append((ind, tag))
                out.append(f"<li>{inline(mm.group(3))}</li>"); i += 1
            while stack:
                e = stack.pop(); out.append(f"</{e[1]}>")
                if len(e) > 2: out.append("</li>")
            continue
        if not s: flush(); i += 1; continue
        para.append(s); i += 1
    flush()
    # закрыть li, у которых внутри вложенный список
    return title, "\n".join(out), toc

def header():
    src = (ROOT / "novosti.html").read_text(encoding="utf-8")
    h = re.search(r"<header class=\"site-header\">.*?</header>", src, re.S).group(0)
    h = h.replace(' class="active" aria-current="page"', "")
    if "metodichka.html" not in h:
        h = h.replace('<a href="archive.html">Архив</a>', '<a href="archive.html">Архив</a><a href="metodichka.html">Методичка</a>')
    return h.replace('<a href="metodichka.html">', '<a class="active" aria-current="page" href="metodichka.html">')

def main():
    files = sorted(p for p in SRC.glob("*.md") if re.match(r"^\d\d-", p.name))
    if not files: sys.exit(f"нет файлов NN-*.md в {SRC}")
    used, chapters = set(), []
    for n, p in enumerate(files):
        lines = p.read_text(encoding="utf-8").replace("\r\n", "\n").split("\n")
        cid = "ch-" + p.name[:2]
        title, body, toc = md_to_html(lines, cid, used)
        chapters.append((cid, title or p.stem, body, toc))
    ver = css_ver() + "-code2"
    stamp = datetime.datetime.now().strftime("%d.%m.%Y %H:%M")
    toc_html = "".join(
        f'<li><a href="#{c}" data-ch="{c}">{inline(t)}</a>' + (f'<ol>{"".join(f"<li><a href=\"#{a}\" data-ch=\"{c}\">{inline(x)}</a></li>" for a, x in toc)}</ol>' if toc else "") + "</li>"
        for c, t, _, toc in chapters)
    chs = "\n".join(
        f'<details class="m-chapter" id="{c}"{" open" if k == 0 else ""}><summary><h2>{inline(t)}</h2></summary><div class="m-body">{b}<p class="m-up"><a href="#m-toc">↑ К оглавлению</a></p></div></details>'
        for k, (c, t, b, _) in enumerate(chapters))
    page = f'''<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Методичка Python для оркестратора · py.motomov.ru</title>
  <meta name="description" content="Методичка Python для оркестратора AI-систем: главы, примеры кода, чек-листы.">
  <meta name="theme-color" content="#f3efe6">
  <link rel="icon" href="https://www.motomov.ru/favicon.png" type="image/png">
  <link rel="canonical" href="https://py.motomov.ru/metodichka">
  <link rel="stylesheet" href="styles.css?v={ver}">
  <style>
  .m-toc{{background:#fffcf6;border:1px solid var(--line);border-radius:1rem;padding:.9rem 1.1rem;margin:0 0 1.2rem}}
  .m-toc summary{{cursor:pointer;font-weight:600}}
  .m-toc ol{{margin:.5rem 0 0;padding-left:1.2rem;line-height:1.5}} .m-toc ol ol{{font-size:.9rem;margin:.2rem 0 .5rem;color:var(--muted)}}
  .m-toc a{{color:var(--text);text-decoration:none}} .m-toc a:hover{{text-decoration:underline}}
  .m-tools{{display:flex;gap:.5rem;margin:.6rem 0 1rem;flex-wrap:wrap}} .m-tools button{{font:inherit;font-size:.88rem;padding:.4rem .8rem;border-radius:999px;border:1px solid var(--line);background:#fffcf6;cursor:pointer}}
  .m-chapter{{border:1px solid var(--line);border-radius:1rem;background:#fffcf6;margin:0 0 .8rem;scroll-margin-top:7rem}}
  .m-chapter>summary{{list-style:none;cursor:pointer;padding:.9rem 1.1rem;display:flex;align-items:center;gap:.6rem}}
  .m-chapter>summary::-webkit-details-marker{{display:none}}
  .m-chapter>summary::after{{content:"▾";margin-left:auto;color:var(--muted);transition:transform .2s}} .m-chapter[open]>summary::after{{transform:rotate(180deg)}}
  .m-chapter h2{{margin:0;font-size:1.12rem;line-height:1.3}}
  .m-body{{padding:0 1.1rem 1rem;font-size:1.04rem;line-height:1.7;max-width:46rem;overflow-wrap:anywhere}}
  .m-body h3{{font-size:1.1rem;margin:1.6rem 0 .5rem;scroll-margin-top:7rem}} .m-body h4,.m-body h5{{font-size:1rem;margin:1.2rem 0 .4rem;scroll-margin-top:7rem}}
  .m-body blockquote{{margin:1rem 0;padding:.4rem 1rem;border-left:3px solid var(--accent);background:var(--accent-soft);border-radius:0 .6rem .6rem 0}}
  .md-table{{overflow-x:auto}} .m-body table{{border-collapse:collapse;font-size:.92rem;margin:.8rem 0}} .m-body th,.m-body td{{border:1px solid var(--line);padding:.35rem .55rem;text-align:left;vertical-align:top}}
  .m-up{{font-size:.88rem;text-align:right}} .m-up a{{color:var(--muted)}}
  @media (max-width:600px){{.m-body{{padding:0 .8rem .8rem;font-size:1rem}} .m-chapter>summary{{padding:.8rem}}}}
  </style>
</head>
<body>
  <div class="bg-grid" aria-hidden="true"></div>
  <div class="wrap">
    {header()}
    <section class="page-intro">
      <h1>Методичка Python для оркестратора</h1>
      <p class="bio">{len(chapters)} глав: от основ Python до каркаса агента и чек-листов. Обновляется утром и вечером. Последняя сборка: {stamp} (МСК).</p>
    </section>
    <details class="m-toc" id="m-toc" open><summary>Оглавление</summary><ol>{toc_html}</ol></details>
    <div class="m-tools"><button type="button" id="m-open">Развернуть все главы</button><button type="button" id="m-close">Свернуть все</button></div>
    {chs}
    <footer class="site"><a href="https://www.motomov.ru/">motomov.ru</a> · <a href="https://github.com/jagorun/motomov-py">репозиторий</a></footer>
  </div>
  <script src="js/app.js?v={ver}" defer></script>
  <script>
  (function(){{
    var all=function(){{return document.querySelectorAll('.m-chapter');}};
    function reveal(){{var h=decodeURIComponent(location.hash.slice(1));if(!h)return;var el=document.getElementById(h);if(!el)return;var d=el.closest('.m-chapter');if(d&&!d.open){{d.open=true;el.scrollIntoView();}}}}
    window.addEventListener('hashchange',reveal);document.addEventListener('DOMContentLoaded',reveal);reveal();
    document.getElementById('m-open').onclick=function(){{all().forEach(function(d){{d.open=true;}});}};
    document.getElementById('m-close').onclick=function(){{all().forEach(function(d){{d.open=false;}});}};
    document.querySelectorAll('.m-toc a').forEach(function(a){{a.addEventListener('click',function(){{var d=document.getElementById(a.dataset.ch);if(d)d.open=true;}});}});
  }})();
  </script>
</body>
</html>
'''
    OUT.write_text(page, encoding="utf-8")
    print(f"OK: {OUT} · глав: {len(chapters)} · из {SRC}")

def css_ver():
    m = re.search(r'styles\.css\?v=([\w.-]+)', (ROOT / "novosti.html").read_text(encoding="utf-8"))
    return m.group(1) if m else "1"

if __name__ == "__main__":
    main()

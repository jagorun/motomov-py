(function () {
  const params = new URLSearchParams(location.search);
  if (document.getElementById("lesson-root")) loadLesson(params.get("id"), params.get("tab"));
  if (document.getElementById("course-list")) loadCourse();
  if (document.getElementById("kb-list")) loadKb();
  if (document.getElementById("slovar-list")) loadSlovar();
  if (document.getElementById("py-slovar-list")) loadPySlovar();
  if (document.getElementById("news-list")) loadNews();
  if (document.getElementById("youtube-list")) loadYoutube();
  if (document.getElementById("python-deep-list")) loadPythonDeep();
  if (document.getElementById("novosti-list")) loadNovosti();
  if (document.getElementById("archive-list")) loadArchive(params.get("month"));
  if (document.getElementById("brief-root")) loadBrief(params.get("id"), params.get("kind"));
})();
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}
function kindLabel(kind) {
  if (kind === "utro") return "утро";
  if (kind === "vecher") return "вечер";
  if (kind === "ai") return "новости";
  if (kind === "youtube") return "youtube";
  return "заметка";
}
function briefHref(it) {
  return `brief.html?id=${encodeURIComponent(it.id)}&kind=${encodeURIComponent(it.kind)}`;
}
function renderBody(parts) {
  return parts.map((block) => {
    if (block.startsWith("```")) {
      const inner = block.replace(/^```[a-zA-Z0-9_-]*\n?/, "").replace(/\n?```$/, "");
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = inner;
      pre.appendChild(code);
      return pre.outerHTML;
    }
    if (block.startsWith("### ")) {
      return "<h3>" + escapeHtml(block.slice(4)) + "</h3>";
    }
    if (block.startsWith("## ")) {
      return "<h2>" + escapeHtml(block.slice(3)) + "</h2>";
    }
    if (block.startsWith("# ")) {
      return "<h2>" + escapeHtml(block.slice(2)) + "</h2>";
    }
    const p = document.createElement("p");
    p.textContent = block;
    return p.outerHTML;
  }).join("");
}
function cardHtml(it) {
  return `<a class="lesson-card" href="${briefHref(it)}"><span class="badge">${kindLabel(it.kind)} \u00b7 ${escapeHtml(it.dateLabel)}</span><h3>${escapeHtml(it.title)}</h3><p>${escapeHtml(it.summary)}</p><div class="meta">${escapeHtml(it.topic || "")}</div></a>`;
}
function courseBriefHref(id, kind) {
  return `brief.html?id=${encodeURIComponent(id)}&kind=${encodeURIComponent(kind)}`;
}
function courseLessonHtml(lesson) {
  const title = escapeHtml(lesson.title);
  let name = `<span class="lesson-name">${title}</span>`;
  if (lesson.utro) name = `<a href="${courseBriefHref(lesson.utro, "utro")}">${title}</a>`;
  else if (lesson.vecher) name = `<a href="${courseBriefHref(lesson.vecher, "vecher")}">${title}</a>`;
  else if (lesson.brief) name = `<a href="${courseBriefHref(lesson.brief, "note")}">${title}</a>`;
  const evening = lesson.utro && lesson.vecher
    ? `<a href="${courseBriefHref(lesson.vecher, "vecher")}">вечер</a>`
    : "";
  const pending = lesson.pending ? `<span class="pending">ещё не написано</span>` : "";
  const note = lesson.note ? `<p class="lesson-note">${escapeHtml(lesson.note)}</p>` : "";
  return `<div class="lesson-row">${name}${evening}${pending}</div>${note}`;
}
function glossarySectionFor(course, block, glossary) {
  if (!glossary || glossary.courseId !== course.id || !glossary.blocks) return null;
  if (block.kind === "module") return glossary.blocks[String(block.num)] || null;
  if (block.kind === "extra") return glossary.blocks.prelude || null;
  return null;
}
function glossaryHtml(section) {
  if (!section || !Array.isArray(section.terms) || !section.terms.length) return "";
  const cards = section.terms.map((term) => {
    const title = escapeHtml(term.title || "");
    const id = escapeHtml(term.id || "");
    if (term.see) {
      const href = "#" + String(term.see).replace(/[^a-z0-9-]/gi, "");
      const link = escapeHtml(term.link || "первая карточка");
      return `<p class="glossary-remind" id="${id}"><strong>${title}.</strong> ${escapeHtml(term.reminder || "")} <a href="${href}">${link}</a></p>`;
    }
    return `<article class="glossary-card" id="${id}"><h5>${title}</h5><p><strong>Что это.</strong> ${escapeHtml(term.what || "")}</p><p><strong>Зачем.</strong> ${escapeHtml(term.why || "")}</p><p><strong>Не путать.</strong> ${escapeHtml(term.notConfuse || "")}</p></article>`;
  }).join("");
  const anchor = escapeHtml(section.anchor || "");
  const heading = escapeHtml(section.title || "Словарь блока");
  return `<div class="block-glossary" id="${anchor}"><h4>${heading}</h4>${cards}</div>`;
}
function courseBlockHtml(block, section) {
  if (block.kind === "note") return `<p class="course-aside">${escapeHtml(block.text)}</p>`;
  const head = block.kind === "module"
    ? `<h3>Модуль ${escapeHtml(String(block.num))}. ${escapeHtml(block.title)}</h3>`
    : `<h3>${escapeHtml(block.title)}</h3>`;
  const summary = block.summary ? `<p class="lesson-note">${escapeHtml(block.summary)}</p>` : "";
  const note = block.note ? `<p class="lesson-note">${escapeHtml(block.note)}</p>` : "";
  const rows = (block.lessons || []).map(courseLessonHtml).join("");
  return `<div class="module">${head}${summary}${note}${rows}${glossaryHtml(section)}</div>`;
}
function courseHtml(course, glossary) {
  const open = course.open ? " open" : "";
  const later = course.later ? " later" : "";
  const blocks = (course.blocks || []).map((block) => courseBlockHtml(block, glossarySectionFor(course, block, glossary))).join("");
  const blurb = course.blurb ? `<p class="course-aside">${escapeHtml(course.blurb)}</p>` : "";
  const foot = course.footnote ? `<p class="course-aside">${escapeHtml(course.footnote)}</p>` : "";
  return `<details class="course-block${later}"${open}><summary><span class="badge">${escapeHtml(course.badge || "")}</span><h2>${escapeHtml(course.title)}</h2><p>${escapeHtml(course.meta || "")}</p></summary><div class="course-body">${blurb}${blocks}${foot}</div></details>`;
}
async function loadCourse() {
  const box = document.getElementById("course-list");
  try {
    const [data, glossary] = await Promise.all([
      fetch("data/course-path.json", { cache: "no-store" }).then((r) => r.json()),
      fetch("data/course-glossary.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    ]);
    const courses = Array.isArray(data) ? data : (data.courses || []);
    if (!courses.length || !courses[0].blocks) throw new Error("empty");
    box.innerHTML = courses.map((course) => courseHtml(course, glossary)).join("");
  } catch (e) {
    box.innerHTML = '<div class="empty">Не удалось загрузить программу.</div>';
  }
}
function lessonTabList(lesson) {
  if (Array.isArray(lesson.tabs) && lesson.tabs.length) return lesson.tabs;
  return [{ id: "text", title: "Урок", body: lesson.body || [] }];
}
function paintLesson(root, lesson, lessons, index, tabId) {
  const tabs = lessonTabList(lesson);
  const current = tabs.find((t) => t.id === tabId) || tabs[0];
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const showTabs = tabs.length > 1;
  if (showTabs) {
    const url = new URL(location.href);
    url.searchParams.set("id", lesson.id);
    url.searchParams.set("tab", current.id);
    history.replaceState({}, "", url);
  }
  const tabBar = showTabs
    ? `<div class="lesson-tabs" role="tablist">${tabs.map((t) => `<button type="button" class="lesson-tab${t.id === current.id ? " active" : ""}" data-tab="${escapeHtml(t.id)}" role="tab" aria-selected="${t.id === current.id ? "true" : "false"}">${escapeHtml(t.title)}</button>`).join("")}</div>`
    : "";
  root.innerHTML = `<span class="badge">урок ${escapeHtml(String(lesson.num))} \u00b7 ${escapeHtml(lesson.level)} \u00b7 ${escapeHtml(lesson.time)}</span><h1>${escapeHtml(lesson.title)}</h1><p class="bio" style="margin:0.6rem 0 1.1rem">${escapeHtml(lesson.summary)}</p>${tabBar}<article class="article">${renderBody(current.body || [])}</article><div class="pager">${prev ? `<a class="ghost-btn" href="lesson.html?id=${encodeURIComponent(prev.id)}">← ${escapeHtml(prev.title)}</a>` : `<a class="ghost-btn" href="course.html">К программе</a>`}${next ? `<a class="ghost-btn" href="lesson.html?id=${encodeURIComponent(next.id)}">${escapeHtml(next.title)} →</a>` : `<a class="ghost-btn" href="kb.html">К базе →</a>`}</div>`;
  if (showTabs) {
    root.querySelector(".lesson-tabs").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tab]");
      if (!btn) return;
      paintLesson(root, lesson, lessons, index, btn.getAttribute("data-tab"));
    });
  }
}
async function loadLesson(id, tabId) {
  const root = document.getElementById("lesson-root");
  const lessons = await fetch("data/lessons.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
  const i = Math.max(0, lessons.findIndex((l) => l.id === id));
  const lesson = lessons[i] || lessons[0];
  if (!lesson) { root.innerHTML = '<div class="empty">Урок не найден.</div>'; return; }
  document.title = lesson.title + " \u00b7 py.motomov.ru";
  paintLesson(root, lesson, lessons, i, tabId);
}
function kbHaystack(it) {
  return [it.title, it.text, it.tag, it.what, it.why, it.notConfuse, it.source]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
function kbCardHtml(it) {
  const badge = escapeHtml(it.tag || "заметка");
  const title = escapeHtml(it.title || "");
  let body = "";
  if (it.what || it.why || it.notConfuse) {
    if (it.what) body += `<p><strong>Что это:</strong> ${escapeHtml(it.what)}</p>`;
    if (it.why) body += `<p><strong>Зачем:</strong> ${escapeHtml(it.why)}</p>`;
    if (it.notConfuse) body += `<p><strong>Не путать с:</strong> ${escapeHtml(it.notConfuse)}</p>`;
  } else {
    body = `<p>${escapeHtml(it.text || "")}</p>`;
  }
  let meta = "";
  if (it.source) {
    const href = `brief.html?id=${encodeURIComponent(it.source)}&kind=ai`;
    meta = `<div class="meta"><a href="${href}">из сводки ${escapeHtml(it.source)}</a>${it.updated ? " \u00b7 " + escapeHtml(it.updated) : ""}</div>`;
  }
  return `<article class="kb-card"><span class="badge">${badge}</span><h3>${title}</h3>${body}${meta}</article>`;
}
function slovarRowHtml(it) {
  const badge = escapeHtml(it.tag || "термин");
  const title = escapeHtml(it.title || "");
  let body = "";
  if (it.what || it.why || it.notConfuse) {
    if (it.what) body += `<p><strong>Что это:</strong> ${escapeHtml(it.what)}</p>`;
    if (it.why) body += `<p><strong>Зачем:</strong> ${escapeHtml(it.why)}</p>`;
    if (it.notConfuse) body += `<p><strong>Не путать с:</strong> ${escapeHtml(it.notConfuse)}</p>`;
  } else {
    body = `<p>${escapeHtml(it.text || "")}</p>`;
  }
  let meta = "";
  if (it.source) {
    const href = `brief.html?id=${encodeURIComponent(it.source)}&kind=ai`;
    meta = `<div class="meta"><a href="${href}">из сводки ${escapeHtml(it.source)}</a>${it.updated ? " \u00b7 " + escapeHtml(it.updated) : ""}</div>`;
  }
  return `<details class="fold-item"><summary><span class="fold-arrow" aria-hidden="true"></span><span class="fold-title">${title}</span><span class="badge">${badge}</span></summary><div class="fold-body">${body}${meta}</div></details>`;
}
const RU_MONTHS_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const RU_WEEKDAYS = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
function newsSlot(it) {
  const id = String(it.id || "");
  const label = String(it.dateLabel || "") + " " + String(it.title || "");
  if (/-ai$/.test(id)) return { key: "extra", label: "выпуск" };
  if (/-utro$/.test(id) || /утр/i.test(label.slice(0, 60))) return { key: "utro", label: "утро" };
  if (/-vecher$/.test(id) || /вечер/i.test(label.slice(0, 60))) return { key: "vecher", label: "вечер" };
  return { key: "extra", label: "выпуск" };
}
function newsHeadline(it) {
  const t = String(it.title || "");
  const parts = t.split(" \u00b7 ");
  if (parts.length >= 3 && /\d{2}\.\d{2}\.\d{4}/.test(parts[1])) return parts.slice(2).join(" \u00b7 ");
  return t;
}
function dayLabel(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!m) return String(date || "");
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  const base = Number(m[3]) + " " + RU_MONTHS_GEN[Number(m[2]) - 1];
  if (diff === 0) return "Сегодня, " + base;
  if (diff === 1) return "Вчера, " + base;
  return base + ", " + RU_WEEKDAYS[d.getDay()];
}
function novostiRowHtml(it) {
  const slot = newsSlot(it);
  const gist = it.topic || it.summary || "";
  return `<a class="news-card" href="${briefHref(it)}"><span class="news-slot slot-${slot.key}">${slot.label}</span><span class="news-text"><span class="news-head">${escapeHtml(newsHeadline(it))}</span><span class="news-gist">${escapeHtml(gist)}</span></span><span class="news-go" aria-hidden="true">\u203a</span></a>`;
}
function renderNewsDays(list, items) {
  list.innerHTML = "";
  list.classList.remove("fold-list");
  list.classList.add("news-days");
  let cur = null, box = null;
  const days = [];
  items.forEach((it) => {
    const d = it.date || String(it.id || "").slice(0, 10);
    if (d !== cur) {
      cur = d;
      const dayId = "day-" + d;
      const day = el(`<section class="news-day" id="${escapeHtml(dayId)}"><h3 class="news-day-title">${escapeHtml(dayLabel(d))}</h3><div class="news-day-list"></div></section>`);
      list.appendChild(day);
      box = day.querySelector(".news-day-list");
      days.push({ id: dayId, label: dayLabel(d) });
    }
    box.appendChild(el(novostiRowHtml(it)));
  });
  const nav = document.getElementById("novosti-day-nav");
  if (nav) {
    if (days.length > 1) {
      nav.style.display = "";
      nav.innerHTML = days.map((dy) => {
        const short = dy.label.replace(/, .*/, "");
        return `<a href="#${escapeHtml(dy.id)}">${escapeHtml(short)}</a>`;
      }).join("");
    } else {
      nav.style.display = "none";
    }
  }
}
// ---- one AI issue: sections, numbered items, collapsible glossary ----
function linkifyText(text) {
  const re = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?»"'])/g;
  let out = "", last = 0, m;
  while ((m = re.exec(text))) {
    out += escapeHtml(text.slice(last, m.index));
    let host = m[1];
    try { host = new URL(m[1]).hostname.replace(/^www\./, ""); } catch (e) {}
    out += `<a class="src-link" href="${escapeHtml(m[1])}" target="_blank" rel="noopener">${escapeHtml(host)}</a>`;
    last = m.index + m[1].length;
  }
  out += escapeHtml(text.slice(last));
  return out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^(Что это|Зачем сегодня|Зачем|Не путать с|Источник):/, "<strong>$1:</strong>");
}
function paraHtml(line) {
  const t = line.replace(/Источник:\s*/g, "Источник: ");
  if (/^[-*]\s+/.test(t)) return null;
  return `<p>${linkifyText(t)}</p>`;
}
function linesHtml(lines) {
  let html = "", ul = [];
  const flush = () => { if (ul.length) { html += "<ul>" + ul.map((x) => `<li>${linkifyText(x)}</li>`).join("") + "</ul>"; ul = []; } };
  lines.forEach((ln) => {
    if (!ln.trim()) return;
    if (ln.startsWith("```")) { flush(); html += renderBody([ln]); return; }
    if (/^[-*]\s+/.test(ln)) { ul.push(ln.replace(/^[-*]\s+/, "")); return; }
    flush();
    html += paraHtml(ln);
  });
  flush();
  return html;
}
function splitSections(body) {
  const secs = [];
  let cur = { title: "", lines: [] };
  body.forEach((raw) => {
    const ln = String(raw);
    if (/^# /.test(ln)) return;
    if (/^## /.test(ln)) { secs.push(cur); cur = { title: ln.slice(3).trim(), lines: [] }; return; }
    cur.lines.push(ln);
  });
  secs.push(cur);
  return secs.filter((s) => s.title || s.lines.some((l) => l.trim()));
}
function splitItems(lines) {
  const items = []; let pre = []; let cur = null;
  lines.forEach((ln) => {
    if (/^### /.test(ln)) { cur = { title: ln.slice(4).trim(), lines: [] }; items.push(cur); return; }
    (cur ? cur.lines : pre).push(ln);
  });
  return { pre, items };
}
function itemTitleHtml(title) {
  const tags = [];
  const clean = title.replace(/\s*\[([^\]]+)\]/g, (_, t) => { tags.push(t); return ""; }).trim();
  return { title: escapeHtml(clean), tags: tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("") };
}
function sectionKind(title) {
  const t = title.toLowerCase();
  if (/коротко|главное|итог дня|суть/.test(t)) return "lead";
  if (/словар/.test(t)) return "glossary";
  if (/подписк|акци|триал/.test(t)) return "promo";
  return "normal";
}
function renderAiIssue(brief) {
  const secs = splitSections(brief.body || []);
  if (!secs.length) return null;
  let toc = [], html = "", n = 0;
  secs.forEach((sec, si) => {
    const kind = sectionKind(sec.title);
    const anchor = "s" + (si + 1);
    const { pre, items } = splitItems(sec.lines);
    if (kind === "lead") {
      html += `<section class="issue-lead" id="${anchor}"><h2>${escapeHtml(sec.title || "Коротко")}</h2>${linesHtml(sec.lines)}</section>`;
      return;
    }
    if (kind === "glossary") {
      const cards = items.map((it) => `<details class="gl-item"><summary>${escapeHtml(it.title)}</summary><div class="gl-body">${linesHtml(it.lines)}</div></details>`).join("");
      toc.push([anchor, "Словарь"]);
      html += `<section class="issue-sec issue-glossary" id="${anchor}"><h2>${escapeHtml(sec.title)} <span class="count">${items.length}</span></h2>${linesHtml(pre)}<div class="gl-list">${cards}</div></section>`;
      return;
    }
    if (kind === "promo") {
      const text = sec.lines.filter((l) => l.trim());
      const short = text.length <= 1 && items.length === 0;
      html += `<section class="issue-sec${short ? " issue-note" : ""}" id="${anchor}"><h2>${escapeHtml(sec.title)}</h2>${linesHtml(sec.lines.filter((l) => !/^### /.test(l)))}${items.map((it) => `<h3>${escapeHtml(it.title)}</h3>${linesHtml(it.lines)}`).join("")}</section>`;
      return;
    }
    if (sec.title) toc.push([anchor, sec.title.replace(/ к вечеру| за ночь/i, "")]);
    let inner = linesHtml(pre);
    if (items.length) {
      inner += `<ol class="issue-items">` + items.map((it) => {
        n += 1;
        const t = itemTitleHtml(it.title);
        return `<li class="issue-item" id="n${n}"><span class="num">${n}</span><div class="issue-item-body"><h3>${t.title}</h3>${t.tags ? `<div class="tags">${t.tags}</div>` : ""}${linesHtml(it.lines)}</div></li>`;
      }).join("") + `</ol>`;
    }
    html += `<section class="issue-sec" id="${anchor}">${sec.title ? `<h2>${escapeHtml(sec.title)}</h2>` : ""}${inner}</section>`;
  });
  const tocHtml = toc.length > 1 ? `<nav class="issue-toc" aria-label="Разделы выпуска">${toc.map(([a, t]) => `<a href="#${a}">${escapeHtml(t)}</a>`).join("")}</nav>` : "";
  return { tocHtml, html };
}
async function loadKb() {
  const list = document.getElementById("kb-list");
  const input = document.getElementById("kb-search");
  const filters = document.getElementById("kb-filters");
  const items = await fetch("data/kb.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
  let activeTag = "";
  const tags = Array.from(new Set(items.map((it) => it.tag).filter(Boolean)));
  if (filters) {
    filters.innerHTML = "";
    const allBtn = el(`<button type="button" class="ghost-btn active" data-tag="">Все</button>`);
    filters.appendChild(allBtn);
    tags.forEach((tag) => {
      filters.appendChild(el(`<button type="button" class="ghost-btn" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`));
    });
    filters.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tag]");
      if (!btn) return;
      activeTag = btn.getAttribute("data-tag") || "";
      Array.from(filters.querySelectorAll("button")).forEach((b) => b.classList.toggle("active", b === btn));
      draw(input ? input.value : "");
    });
  }
  function draw(q) {
    const needle = (q || "").trim().toLowerCase();
    const shown = items.filter((it) => {
      if (activeTag && it.tag !== activeTag) return false;
      return !needle || kbHaystack(it).includes(needle);
    });
    list.innerHTML = "";
    if (!shown.length) { list.innerHTML = '<div class="empty">В базе этого нет.</div>'; return; }
    shown.forEach((it) => list.appendChild(el(kbCardHtml(it))));
  }
  draw("");
  if (input) input.addEventListener("input", () => draw(input.value));
}
function slovarNameKey(it) {
  return String(it.title || "").trim();
}
function slovarTagKey(it) {
  return String(it.tag || "").trim();
}
function slovarFreshKey(it) {
  return String(it.updated || it.source || "");
}
function compareSlovar(a, b, mode) {
  const byName = (x, y) => slovarNameKey(x).localeCompare(slovarNameKey(y), "ru", { sensitivity: "base" });
  if (mode === "name") return byName(a, b);
  if (mode === "tag") {
    const tagCmp = slovarTagKey(a).localeCompare(slovarTagKey(b), "ru", { sensitivity: "base" });
    return tagCmp || byName(a, b);
  }
  const freshCmp = slovarFreshKey(b).localeCompare(slovarFreshKey(a));
  return freshCmp || byName(a, b);
}
async function loadSlovar() {
  const list = document.getElementById("slovar-list");
  const input = document.getElementById("slovar-search");
  const filters = document.getElementById("slovar-filters");
  const sortBox = document.getElementById("slovar-sort");
  const items = await fetch("data/kb.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
  let activeTag = "";
  let sortMode = "fresh";
  const tags = Array.from(new Set(items.map((it) => it.tag).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base" }));
  if (filters) {
    filters.innerHTML = "";
    filters.appendChild(el(`<button type="button" class="ghost-btn active" data-tag="">Все</button>`));
    tags.forEach((tag) => {
      filters.appendChild(el(`<button type="button" class="ghost-btn" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`));
    });
    filters.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tag]");
      if (!btn) return;
      activeTag = btn.getAttribute("data-tag") || "";
      Array.from(filters.querySelectorAll("button")).forEach((b) => b.classList.toggle("active", b === btn));
      draw(input ? input.value : "");
    });
  }
  if (sortBox) {
    sortBox.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-sort]");
      if (!btn) return;
      sortMode = btn.getAttribute("data-sort") || "fresh";
      Array.from(sortBox.querySelectorAll("button[data-sort]")).forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      draw(input ? input.value : "");
    });
  }
  function draw(q) {
    const needle = (q || "").trim().toLowerCase();
    const shown = items.filter((it) => {
      if (activeTag && it.tag !== activeTag) return false;
      return !needle || kbHaystack(it).includes(needle);
    }).sort((a, b) => compareSlovar(a, b, sortMode));
    list.innerHTML = "";
    if (!shown.length) { list.innerHTML = '<div class="empty">Ничего не найдено.</div>'; return; }
    shown.forEach((it) => list.appendChild(el(slovarRowHtml(it))));
  }
  draw("");
  if (input) input.addEventListener("input", () => draw(input.value));
}
const NOVOSTI_RECENT_LIMIT = 14;
async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  return r.json();
}
async function loadNovosti() {
  const list = document.getElementById("novosti-list");
  const items = await fetchJson("data/novosti.json");
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = '<div class="empty">Новостей пока нет. Утренняя сводка придёт в 07:00 по Москве.</div>';
    return;
  }
  renderNewsDays(list, items.slice(0, NOVOSTI_RECENT_LIMIT));
}
function monthKey(it) {
  const d = it.date || String(it.id || "").slice(0, 10);
  return d.slice(0, 7);
}
function monthLabel(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return key;
  return RU_MONTHS_GEN[Number(m[2]) - 1] + " " + m[1];
}
async function loadArchive(monthParam) {
  const list = document.getElementById("archive-list");
  const filters = document.getElementById("archive-filters");
  const items = await fetchJson("data/novosti.json");
  if (!items.length) {
    list.innerHTML = '<div class="empty">Архив пока пуст.</div>';
    return;
  }
  const months = Array.from(new Set(items.map(monthKey).filter(Boolean)));
  let active = monthParam && months.includes(monthParam) ? monthParam : "";
  function draw() {
    const shown = active ? items.filter((it) => monthKey(it) === active) : items;
    list.innerHTML = "";
    if (!shown.length) {
      list.innerHTML = '<div class="empty">За этот месяц записей нет.</div>';
      return;
    }
    renderNewsDays(list, shown);
    const url = new URL(location.href);
    if (active) url.searchParams.set("month", active);
    else url.searchParams.delete("month");
    history.replaceState({}, "", url);
  }
  if (filters) {
    filters.innerHTML = "";
    filters.appendChild(el(`<button type="button" class="ghost-btn${active ? "" : " active"}" data-month="">Все</button>`));
    months.forEach((m) => {
      filters.appendChild(el(`<button type="button" class="ghost-btn${active === m ? " active" : ""}" data-month="${escapeHtml(m)}">${escapeHtml(monthLabel(m))}</button>`));
    });
    filters.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-month]");
      if (!btn) return;
      active = btn.getAttribute("data-month") || "";
      Array.from(filters.querySelectorAll("button")).forEach((b) => b.classList.toggle("active", b === btn));
      draw();
    });
  }
  draw();
}
async function loadBrief(id, kind) {
  const root = document.getElementById("brief-root");
  const wantYoutube = kind === "youtube" || (id && String(id).startsWith("yt-"));
  const fetches = [
    fetchJson("data/briefs.json"),
    fetchJson("data/novosti.json")
  ];
  if (wantYoutube || !kind) fetches.push(fetchJson("data/youtube.json"));
  const results = await Promise.all(fetches);
  const python = results[0];
  const ai = results[1];
  const youtube = results[2] || [];
  let pool;
  if (kind === "ai") {
    pool = ai;
  } else if (kind === "youtube") {
    pool = youtube;
  } else if (kind) {
    pool = python.filter((it) => it.kind === kind);
    if (!pool.some((it) => it.id === id)) pool = python;
  } else {
    const inYt = youtube.find((it) => it.id === id);
    if (inYt) {
      pool = youtube;
    } else {
      const inPy = python.find((it) => it.id === id);
      pool = inPy ? python : ai.concat(python);
    }
  }
  const i = id ? pool.findIndex((it) => it.id === id) : -1;
  let brief = i >= 0 ? pool[i] : null;
  if (brief && brief.kind === "ai" && !Array.isArray(brief.body)) {
    const full = await loadAiItem(brief.id);
    if (full) brief = full;
  }
  if (!brief) { root.innerHTML = `<div class="empty">Сводка не найдена${id ? " («" + escapeHtml(id) + "»)" : ""}. <a href="archive.html">К архиву</a> · <a href="news.html">К python</a> · <a href="youtube.html">К YouTube</a></div>`; return; }
  document.title = brief.title + " \u00b7 py.motomov.ru";
  const same = pool.filter((it) => it.kind === brief.kind);
  const si = same.findIndex((it) => it.id === brief.id);
  const prev = same[si - 1];
  const next = same[si + 1];
  let backHref = "news.html";
  let backLabel = "К ленте python";
  if (brief.kind === "ai") { backHref = "archive.html"; backLabel = "К архиву"; }
  if (brief.kind === "youtube") { backHref = "youtube.html"; backLabel = "К YouTube"; }
  if (brief.kind === "ai") {
    const issue = renderAiIssue(brief);
    const newer = same[si - 1];
    const older = same[si + 1];
    const slot = newsSlot(brief);
    const navBtn = (it, dir) => it
      ? `<a class="issue-nav-btn ${dir}" href="${briefHref(it)}"><small>${dir === "older" ? "← раньше" : "позже →"}</small><span>${escapeHtml(dayLabel(it.date).replace(/^(Сегодня|Вчера), /, "$1, ") + " \u00b7 " + newsSlot(it).label)}</span></a>`
      : `<span class="issue-nav-btn ${dir} disabled"><small>${dir === "older" ? "← раньше" : "позже →"}</small><span>нет</span></span>`;
    const pager = `<div class="issue-nav">${navBtn(older, "older")}${navBtn(newer, "newer")}</div>`;
    root.innerHTML = `<a class="back-link" href="novosti.html">← Все новости</a><header class="issue-head"><div class="issue-meta"><span class="news-slot slot-${slot.key}">${slot.label}</span> ${escapeHtml(dayLabel(brief.date))}</div><h1>${escapeHtml(newsHeadline(brief))}</h1>${issue ? "" : `<p class="issue-summary">${escapeHtml(brief.summary || "")}</p>`}</header>${issue ? issue.tocHtml + `<article class="issue">${issue.html}</article>` : `<article class="article">${renderBody(brief.body || [])}</article>`}${pager}`;
    if (issue) {
      const tocLinks = root.querySelectorAll(".issue-toc a");
      if (tocLinks.length) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              const id = en.target.id;
              tocLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
            }
          });
        }, { rootMargin: "-15% 0px -55% 0px", threshold: 0.1 });
        root.querySelectorAll(".issue-sec, .issue-lead, .issue-glossary").forEach((sec) => {
          if (sec.id) observer.observe(sec);
        });
      }
    }
    return;
  }
  root.innerHTML = `<span class="badge">${kindLabel(brief.kind)} \u00b7 ${escapeHtml(brief.dateLabel)} \u00b7 ${escapeHtml(brief.topic || "")}</span><h1>${escapeHtml(brief.title)}</h1><p class="bio" style="margin:0.6rem 0 1.1rem">${escapeHtml(brief.summary)}</p><article class="article">${renderBody(brief.body || [])}</article><div class="pager">${prev ? `<a class="ghost-btn" href="${briefHref(prev)}">← ${escapeHtml(prev.title)}</a>` : `<a class="ghost-btn" href="${backHref}">${backLabel}</a>`}${next ? `<a class="ghost-btn" href="${briefHref(next)}">${escapeHtml(next.title)} →</a>` : `<a class="ghost-btn" href="${backHref}">${backLabel} →</a>`}</div>`;
}
function pySlovarHaystack(it) {
  return [it.title, it.tag, it.module, it.what, it.why, it.notConfuse, it.aliases, it.stepik, it.id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
function pySlovarRowHtml(it) {
  const badge = escapeHtml(it.tag || "термин");
  const title = escapeHtml(it.title || "");
  let body = "";
  if (it.what || it.why || it.notConfuse) {
    if (it.what) body += `<p><strong>Что это:</strong> ${escapeHtml(it.what)}</p>`;
    if (it.why) body += `<p><strong>Зачем:</strong> ${escapeHtml(it.why)}</p>`;
    if (it.notConfuse) body += `<p><strong>Не путать с:</strong> ${escapeHtml(it.notConfuse)}</p>`;
  } else {
    body = `<p>${escapeHtml(it.text || "")}</p>`;
  }
  const place = `Stepik ${it.stepik || ""} \u00b7 модуль «${it.module || ""}»`;
  const meta = `<div class="meta">${escapeHtml(place)}</div>`;
  const id = escapeHtml(it.id || "");
  return `<details class="fold-item" id="${id}"><summary><span class="fold-arrow" aria-hidden="true"></span><span class="fold-title">${title}</span><span class="badge">${badge}</span></summary><div class="fold-body">${body}${meta}</div></details>`;
}
function comparePySlovar(a, b, mode) {
  const byName = (x, y) => String(x.title || "").localeCompare(String(y.title || ""), "ru", { sensitivity: "base" });
  const byOrder = (Number(a.order) || 0) - (Number(b.order) || 0);
  if (mode === "name") return byName(a, b);
  if (mode === "tag") {
    const tagCmp = String(a.tag || "").localeCompare(String(b.tag || ""), "ru", { sensitivity: "base" });
    return tagCmp || byOrder || byName(a, b);
  }
  return byOrder || byName(a, b);
}
async function loadPySlovar() {
  const list = document.getElementById("py-slovar-list");
  const input = document.getElementById("py-slovar-search");
  const filters = document.getElementById("py-slovar-filters");
  const sortBox = document.getElementById("py-slovar-sort");
  const items = await fetch("data/python-glossary.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
  let activeTag = "";
  let sortMode = "course";
  const tags = Array.from(new Set(items.map((it) => it.tag).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base" }));
  if (filters) {
    filters.innerHTML = "";
    filters.appendChild(el(`<button type="button" class="ghost-btn active" data-tag="">Все</button>`));
    tags.forEach((tag) => {
      filters.appendChild(el(`<button type="button" class="ghost-btn" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`));
    });
    filters.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tag]");
      if (!btn) return;
      activeTag = btn.getAttribute("data-tag") || "";
      Array.from(filters.querySelectorAll("button")).forEach((b) => b.classList.toggle("active", b === btn));
      draw(input ? input.value : "");
    });
  }
  if (sortBox) {
    sortBox.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-sort]");
      if (!btn) return;
      sortMode = btn.getAttribute("data-sort") || "course";
      Array.from(sortBox.querySelectorAll("button[data-sort]")).forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      draw(input ? input.value : "");
    });
  }
  function draw(q) {
    const needle = (q || "").trim().toLowerCase();
    const shown = items.filter((it) => {
      if (activeTag && it.tag !== activeTag) return false;
      return !needle || pySlovarHaystack(it).includes(needle);
    }).sort((a, b) => comparePySlovar(a, b, sortMode));
    list.innerHTML = "";
    if (!shown.length) { list.innerHTML = '<div class="empty">Ничего не найдено.</div>'; return; }
    shown.forEach((it) => list.appendChild(el(pySlovarRowHtml(it))));
  }
  draw("");
  if (input) input.addEventListener("input", () => draw(input.value));
}
function deepExampleHtml(ex, index) {
  if (!ex) return "";
  const num = `<p class="example-num">Пример ${index + 1}</p>`;
  if (ex.missing) return num + `<div class="example-missing">${escapeHtml(ex.missing)}</div>`;
  let h = num;
  if (ex.intro) h += `<p class="example-intro">${escapeHtml(ex.intro)}</p>`;
  if (ex.code) {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = ex.code;
    pre.appendChild(code);
    h += pre.outerHTML;
  }
  if (ex.output) {
    h += `<span class="example-output-label">Вывод</span><pre class="output"><code>${escapeHtml(ex.output)}</code></pre>`;
  }
  if (ex.explain) h += `<span class="example-explain-label">Пояснение</span><p class="example-explain">${escapeHtml(ex.explain)}</p>`;
  return h;
}
function deepParasHtml(paras) {
  return (paras || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}
function deepChapterAlways(title, bodyHtml) {
  return `<div class="chapter"><h4 class="chapter-h">${escapeHtml(title)}</h4><div class="chapter-body">${bodyHtml}</div></div>`;
}
function deepChapterFold(title, bodyHtml, open) {
  const o = open ? " open" : "";
  return `<details class="fold-item chapter-fold"${o}><summary><span class="fold-arrow" aria-hidden="true"></span><span class="fold-title">${escapeHtml(title)}</span></summary><div class="fold-body chapter-body">${bodyHtml}</div></details>`;
}
function deepTabById(module, id) {
  return (module.tabs || []).find((t) => t.id === id) || null;
}
function deepExamplesBody(tab) {
  if (!tab || !Array.isArray(tab.examples) || !tab.examples.length) return "";
  return tab.examples.map((ex, i) => deepExampleHtml(ex, i)).join("");
}
function deepTabHtml(tab) {
  if (!tab) return "";
  let h = "";
  if (tab.intro) h += `<p>${escapeHtml(tab.intro)}</p>`;
  h += deepExamplesBody(tab);
  if (tab.note) h += `<p class="lesson-note">${escapeHtml(tab.note)}</p>`;
  return h;
}
function deepLessonLinks(pathCourse, num) {
  if (!pathCourse || !Array.isArray(pathCourse.blocks)) return "";
  const block = pathCourse.blocks.find((b) => b.kind === "module" && Number(b.num) === Number(num));
  if (!block || !Array.isArray(block.lessons) || !block.lessons.length) return "";
  return block.lessons.map(courseLessonHtml).join("");
}
function deepModuleSectionsHtml(module, pathCourse) {
  const what = deepTabById(module, "what");
  const examples = deepTabById(module, "examples");
  const analogy = deepTabById(module, "analogy");
  const confuse = deepTabById(module, "confuse");
  const whatBody = what ? deepParasHtml(what.paras) : "";
  const examplesBody = deepTabHtml(examples);
  const analogyBody = analogy ? deepParasHtml(analogy.paras) : "";
  const confuseBody = confuse ? deepParasHtml(confuse.paras) : "";
  const links = deepLessonLinks(pathCourse, module.num);
  const linksBody = links ? `<div class="chapter-links">${links}</div>` : "";
  let h = "";
  if (whatBody) h += deepChapterAlways("Что изучаем", whatBody);
  if (examplesBody) h += deepChapterAlways("Разбор", examplesBody);
  if (analogyBody) h += deepChapterFold("Аналогия", analogyBody, false);
  if (confuseBody) h += deepChapterFold("С чем не путать", confuseBody, false);
  if (linksBody) h += deepChapterFold("Заметки к урокам", linksBody, false);
  return h;
}
function deepCourseHtml(course, pathCourse) {
  const later = course.later ? " later" : "";
  const open = course.open ? " open" : "";
  const modules = (course.modules || []).map((m) => {
    const head = `<h3>Модуль ${escapeHtml(String(m.num))}. ${escapeHtml(m.title)}</h3>`;
    const summary = m.summary ? `<p class="lesson-note">${escapeHtml(m.summary)}</p>` : "";
    const sections = deepModuleSectionsHtml(m, pathCourse);
    return `<div class="module" id="deep-${escapeHtml(course.id)}-m${escapeHtml(String(m.num))}">${head}${summary}${sections}</div>`;
  }).join("");
  const blurb = course.blurb ? `<p class="course-aside">${escapeHtml(course.blurb)}</p>` : "";
  return `<details class="course-block${later}"${open} id="deep-${escapeHtml(course.id)}"><summary><span class="badge">${escapeHtml(course.badge || "")}</span><h2>${escapeHtml(course.title)}</h2><p>${escapeHtml(course.meta || "")}</p></summary><div class="course-body">${blurb}${modules}</div></details>`;
}
async function loadPythonDeep() {
  const box = document.getElementById("python-deep-list");
  const nav = document.getElementById("python-deep-nav");
  if (!box) return;
  try {
    const [deep, path] = await Promise.all([
      fetch("data/python-deep.json", { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("deep");
        return r.json();
      }),
      fetch("data/course-path.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { courses: [] })).catch(() => ({ courses: [] }))
    ]);
    const courses = deep.courses || [];
    const pathCourses = path.courses || [];
    if (!courses.length) throw new Error("empty");
    if (nav) {
      nav.innerHTML = courses.map((c) => `<a class="ghost-btn" href="#deep-${escapeHtml(c.id)}">${escapeHtml(c.nav || c.title)}</a>`).join("");
    }
    box.innerHTML = courses.map((c) => deepCourseHtml(c, pathCourses.find((item) => item.id === c.id))).join("");
  } catch (e) {
    box.innerHTML = '<div class="empty">Не удалось загрузить разбор.</div>';
  }
}
async function loadNews() {
  const list = document.getElementById("news-list");
  const items = await fetchJson("data/briefs.json");
  list.innerHTML = "";
  if (!items.length) { list.innerHTML = '<div class="empty">Сводок пока нет.</div>'; return; }
  items.slice(0, 40).forEach((it) => list.appendChild(el(cardHtml(it))));
}
async function loadYoutube() {
  const list = document.getElementById("youtube-list");
  const items = await fetchJson("data/youtube.json");
  list.innerHTML = "";
  if (!items.length) { list.innerHTML = '<div class="empty">Пока нет выпусков.</div>'; return; }
  items.forEach((it) => list.appendChild(el(cardHtml(it))));
}
async function loadAiItem(id) {
  const r = await fetch("data/novosti/items/" + encodeURIComponent(id) + ".json", { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}
(function () {
  const nav = document.querySelector(".site-header .nav");
  if (!nav || nav.querySelector('a[href="metodichka.html"]')) return;
  const a = document.createElement("a");
  a.href = "metodichka.html"; a.textContent = "Методичка";
  const news = nav.querySelector('a[href="novosti.html"]');
  news ? news.after(a) : nav.prepend(a);
})();
(function () {
  const act = document.querySelector(".site-header .nav a.active");
  if (act && act.parentElement.scrollWidth > act.parentElement.clientWidth) act.parentElement.scrollLeft = act.getBoundingClientRect().left - act.parentElement.getBoundingClientRect().left - 16;
})();
(function () {
  const KW = new Set("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case".split(" "));
  const BI = new Set("print len range int str float bool list dict set tuple open isinstance enumerate zip sorted min max sum any all type super self Exception ValueError KeyError TypeError".split(" "));
  const esc = (t) => t.replace(/&/g, "\u0026amp;").replace(/</g, "\u0026lt;").replace(/>/g, "\u0026gt;");
  const re = /(#[^\n]*)|([rbfu]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'))|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)(\s*\()?/g;
  const run = (root) => (root || document).querySelectorAll("pre > code").forEach((el) => {
    if (el.dataset.hl || el.children.length) return;
    const src = el.textContent, cls = el.className || "";
    if (/lang-(?!py|python)\w/.test(cls)) return;
    if (!/lang-py/.test(cls) && !/\b(def|import|print|return|for|if)\b|=/.test(src)) return;
    let out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index)); last = re.lastIndex;
      if (m[1]) out += `<span class="hl-com">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="hl-str">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="hl-num">${m[3]}</span>`;
      else {
        const w = m[4], k = KW.has(w) ? "kw" : BI.has(w) ? "bi" : m[5] ? "fn" : "";
        out += (k ? `<span class="hl-${k}">${w}</span>` : w) + (m[5] || "");
      }
    }
    el.innerHTML = out + esc(src.slice(last)); el.dataset.hl = "1";
  });
  window.motoHighlight = run; run();
})();
(function () {
  const list = document.querySelector(".site-header .nav-more-list");
  if (!list || list.querySelector('a[href="spravochnik.html"]')) return;
  const a = document.createElement("a"); a.href = "spravochnik.html"; a.textContent = "Справочник Python";
  list.prepend(a);
})();/* ===== UX 2026-10-19: анимации, удобство чтения, работа с материалом (только localStorage) ===== */
(function () {
  const root = document.documentElement;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const raw = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const setRaw = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const getJ = (k, d) => { try { return JSON.parse(raw(k, "")) || d; } catch (e) { return d; } };
  const setJ = (k, v) => setRaw(k, JSON.stringify(v));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const txt = (n) => (n ? n.textContent.replace(/\s+/g, " ").trim() : "");
  const mk = (h) => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstChild; };

  /* --- настройки: шрифт, тема, удобная строка --- */
  function applyPrefs() {
    const fs = raw("moto-fs", "1"); if (fs === "1") delete root.dataset.fs; else root.dataset.fs = fs;
    const th = raw("moto-theme", ""); if (th === "dark") root.dataset.theme = "dark"; else delete root.dataset.theme;
    if (raw("moto-comfy", "") === "1") root.dataset.comfy = "1"; else delete root.dataset.comfy;
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = th === "dark" ? "#191d1a" : "#f3efe6";
    syncButtons();
  }
  function syncButtons() {
    const dark = raw("moto-theme", "") === "dark", comfy = raw("moto-comfy", "") === "1", fs = +raw("moto-fs", "1");
    document.querySelectorAll('[data-ux="theme"]').forEach((b) => { b.textContent = dark ? "☀ Светлая" : "☾ Тёмная"; b.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему"); });
    document.querySelectorAll('[data-ux="comfy"]').forEach((b) => b.setAttribute("aria-pressed", comfy));
    document.querySelectorAll('[data-ux="fs-"]').forEach((b) => (b.disabled = fs <= 0));
    document.querySelectorAll('[data-ux="fs+"]').forEach((b) => (b.disabled = fs >= 3));
    const n = getJ("moto-bm", []).length;
    document.querySelectorAll('[data-ux="bm"]').forEach((b) => (b.textContent = "☆ Закладки" + (n ? " (" + n + ")" : "")));
  }
  const prefBtns = '<span class="ux-grp"><button type="button" class="ux-btn" data-ux="fs-" aria-label="Уменьшить шрифт">A−</button><button type="button" class="ux-btn" data-ux="fs+" aria-label="Увеличить шрифт">A+</button></span><button type="button" class="ux-btn" data-ux="theme"></button>';

  /* --- прочитано и закладки --- */
  const isRead = (k) => !!getJ("moto-read", {})[k];
  function setRead(k, on) { const r = getJ("moto-read", {}); if (on) r[k] = Date.now(); else delete r[k]; setJ("moto-read", r); markLists(); syncMarks(); }
  const isBm = (k) => getJ("moto-bm", []).some((b) => b.key === k);
  function toggleBm(item) {
    let l = getJ("moto-bm", []);
    if (l.some((b) => b.key === item.key)) l = l.filter((b) => b.key !== item.key); else l.unshift(Object.assign({ t: Date.now() }, item));
    setJ("moto-bm", l); syncMarks(); syncButtons(); if (panel && !panel.hidden) drawPanel();
  }
  function syncMarks() {
    document.querySelectorAll("[data-bm-key]").forEach((b) => {
      const on = isBm(b.dataset.bmKey); b.setAttribute("aria-pressed", on);
      if (b.classList.contains("ux-mini")) { b.textContent = on ? "★" : "☆"; b.setAttribute("aria-label", on ? "Убрать из закладок" : "В закладки"); }
      else b.textContent = on ? "★ В закладках" : "☆ В закладки";
    });
    document.querySelectorAll("[data-read-key]").forEach((b) => {
      const on = isRead(b.dataset.readKey); b.setAttribute("aria-pressed", on);
      b.textContent = on ? "✓ Прочитано" : (b.dataset.readLabel || "Отметить прочитанным");
    });
  }
  const bmData = new WeakMap();
  function starBtn(item, mini) {
    const b = mk(`<button type="button" class="${mini ? "ux-mini" : "ux-btn ux-star"}" data-bm-key="${esc(item.key)}"></button>`);
    bmData.set(b, item); return b;
  }
  const readBtn = (key, label) => mk(`<button type="button" class="ux-btn" data-read-key="${esc(key)}"${label ? ` data-read-label="${esc(label)}"` : ""}></button>`);

  /* --- панель закладок --- */
  let panel = null, panelReturn = null;
  const GROUPS = [["brief", "Сводки"], ["ch", "Главы методички"], ["put", "Дорожки"], ["term", "Термины"], ["sp", "Справочник Python"]];
  function drawPanel() {
    const l = getJ("moto-bm", []);
    const body = GROUPS.map(([t, name]) => {
      const g = l.filter((b) => b.type === t); if (!g.length) return "";
      return `<h4>${name}</h4><ul>${g.map((b) => `<li><a href="${esc(b.href)}">${esc(b.title)}</a><button type="button" data-ux-del="${esc(b.key)}" aria-label="Убрать «${esc(b.title)}» из закладок">✕</button></li>`).join("")}</ul>`;
    }).join("");
    panel.querySelector(".ux-bm-body").innerHTML = body || '<div class="empty">Закладок пока нет. Нажмите ☆ у сводки, главы, дорожки или термина.</div>';
  }
  function openPanel() {
    if (!panel) {
      panel = mk('<div class="ux-bm" role="dialog" aria-modal="false" aria-label="Закладки" hidden><div class="ux-bm-head"><b>☆ Закладки</b><button type="button" data-ux="bm-close" aria-label="Закрыть">✕</button></div><div class="ux-bm-body"></div></div>');
      document.body.appendChild(panel);
    }
    panelReturn = document.activeElement; drawPanel(); panel.hidden = false;
    const more = document.querySelector(".site-header .nav-more"); if (more) more.open = false;
    const f = panel.querySelector("a,button"); if (f) f.focus();
  }
  function closePanel() { if (!panel || panel.hidden) return; panel.hidden = true; if (panelReturn && panelReturn.focus) panelReturn.focus(); }

  /* --- общие клики --- */
  document.addEventListener("click", (e) => {
    const u = e.target.closest("[data-ux]");
    if (u) {
      const a = u.dataset.ux;
      if (a === "fs-" || a === "fs+") setRaw("moto-fs", String(Math.max(0, Math.min(3, +raw("moto-fs", "1") + (a === "fs+" ? 1 : -1)))));
      else if (a === "theme") setRaw("moto-theme", raw("moto-theme", "") === "dark" ? "light" : "dark");
      else if (a === "comfy") setRaw("moto-comfy", raw("moto-comfy", "") === "1" ? null : "1");
      else if (a === "bm") { openPanel(); return; }
      else if (a === "bm-close") { closePanel(); return; }
      applyPrefs(); return;
    }
    const s = e.target.closest("[data-bm-key]");
    if (s) { e.preventDefault(); e.stopPropagation(); const it = bmData.get(s); if (it) toggleBm(it); return; }
    const r = e.target.closest("[data-read-key]");
    if (r) { e.preventDefault(); e.stopPropagation(); setRead(r.dataset.readKey, !isRead(r.dataset.readKey)); return; }
    const d = e.target.closest("[data-ux-del]");
    if (d) { const l = getJ("moto-bm", []).filter((b) => b.key !== d.dataset.uxDel); setJ("moto-bm", l); drawPanel(); syncMarks(); syncButtons(); return; }
    if (panel && !panel.hidden && !panel.contains(e.target)) closePanel();
  }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

  /* --- плавное раскрытие описаний --- */
  const ANIM = "details.fold-item, details.gl-item, details.sp-item";
  document.addEventListener("click", (e) => {
    if (reduce || e.defaultPrevented) return;
    const s = e.target.closest("summary"); if (!s || e.target.closest("a,button")) return;
    const d = s.parentElement; if (!d || !d.matches(ANIM) || !d.animate) return;
    const body = Array.from(d.children).find((c) => c !== s); if (!body) return;
    e.preventDefault();
    if (d._uxA) d._uxA.cancel();
    body.classList.add("ux-anim-body");
    const done = () => { body.classList.remove("ux-anim-body"); d._uxA = null; };
    if (!d.open) {
      d.open = true; const h = body.scrollHeight;
      d._uxA = body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 220, easing: "ease-out" });
      d._uxA.onfinish = done; d._uxA.oncancel = done;
    } else {
      const h = body.offsetHeight;
      d._uxA = body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 170, easing: "ease-in" });
      d._uxA.onfinish = () => { d.open = false; done(); }; d._uxA.oncancel = done;
    }
  });

  /* --- появление карточек при прокрутке --- */
  const REVEAL = ".news-card,.fold-item,.issue-item,.issue-lead,.m-chapter,.put-road,.card,.kb-card,.lesson-card,.gl-item,.sp-item,.course-block,.issue-nav,.more-link";
  const io = !reduce && "IntersectionObserver" in window ? new IntersectionObserver((ens) => ens.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("ux-in"); io.unobserve(en.target); }
  }), { rootMargin: "0px 0px -4% 0px" }) : null;

  /* --- копирование кода --- */
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (x) {} ta.remove(); return ok;
    }
  }
  function addCopy(pre) {
    if (pre.dataset.ux || pre.closest(".ux-code")) return; pre.dataset.ux = "1";
    const w = document.createElement("div"); w.className = "ux-code"; pre.before(w); w.appendChild(pre);
    const b = mk('<button type="button" class="ux-copy" aria-label="Копировать код">Копировать</button>');
    b.addEventListener("click", async () => {
      const ok = await copyText(pre.innerText.replace(/\n$/, ""));
      b.textContent = ok ? "Скопировано ✓" : "Не вышло"; b.classList.toggle("ok", ok);
      clearTimeout(b._t); b._t = setTimeout(() => { b.textContent = "Копировать"; b.classList.remove("ok"); }, 1600);
    });
    w.appendChild(b);
  }

  /* --- обработка нового содержимого (в т.ч. отрисованного скриптами) --- */
  const page = location.pathname.split("/").pop().replace(/\.html$/, "") || "index";
  const params = new URLSearchParams(location.search);
  const qa = (scope, sel) => { const r = Array.from(scope.querySelectorAll(sel)); if (scope.matches && scope.matches(sel)) r.unshift(scope); return r; };
  function enhance(scope) {
    qa(scope, "pre").forEach(addCopy);
    if (io) qa(scope, REVEAL).forEach((n) => { if (!n.classList.contains("ux-rv")) { n.classList.add("ux-rv"); io.observe(n); } });
    qa(scope, "#slovar-list .fold-item > summary, .gl-item > summary").forEach((s) => {
      if (s.querySelector(".ux-mini")) return;
      const name = txt(s.querySelector(".fold-title")) || txt(s).replace(/^[+−]\s*/, "");
      if (name) s.appendChild(starBtn({ key: "term:" + name.toLowerCase(), type: "term", title: name, href: "slovar.html#t=" + encodeURIComponent(name) }, true));
    });
    qa(scope, ".sp-item > summary").forEach((s) => {
      if (s.querySelector(".ux-mini")) return; const d = s.parentElement;
      s.appendChild(starBtn({ key: "sp:" + d.id, type: "sp", title: txt(s.querySelector(".sp-name")), href: "spravochnik.html#" + d.id }, true));
    });
    if (qa(scope, ".news-card,.put-road").length) markLists();
    syncMarks();
  }
  function markLists() {
    document.querySelectorAll("a.news-card").forEach((a) => {
      let id = ""; try { id = new URL(a.href).searchParams.get("id") || ""; } catch (e) {}
      const on = id && isRead("brief:" + id); a.classList.toggle("ux-read", !!on);
      const head = a.querySelector(".news-head"), bd = a.querySelector(".ux-read-badge");
      if (on && !bd && head) head.appendChild(mk('<span class="ux-read-badge">✓ прочитано</span>')); else if (!on && bd) bd.remove();
    });
    document.querySelectorAll("a.put-road").forEach((a) => {
      const slug = (a.getAttribute("href") || "").replace(/^\//, "").replace(/\.html$/, "");
      const on = isRead("put:" + slug); a.classList.toggle("ux-read", on);
      const lab = a.querySelector(".put-road-label"), bd = a.querySelector(".ux-read-badge");
      if (on && !bd && lab) lab.appendChild(mk('<span class="ux-read-badge">✓ прочитано</span>')); else if (!on && bd) bd.remove();
    });
    document.querySelectorAll(".m-toc > ol > li > a[data-ch], .m-panel > ol > li > a[data-ch]").forEach((a) => a.classList.toggle("ux-read", isRead("ch:" + a.dataset.ch)));
  }

  /* --- длинные страницы: полоса прогресса, время чтения, панель --- */
  const words = (n) => txt(n).split(" ").length;
  const minutes = (n) => Math.max(1, Math.round((typeof n === "number" ? n : words(n)) / 170));
  const dur = (n) => { const m = minutes(n); return m < 90 ? m + " мин" : Math.floor(m / 60) + " ч " + (m % 60) + " мин"; };
  function readingBar(after, content, extra) {
    if (!after || document.querySelector(".ux-bar")) return;
    const bar = mk(`<div class="ux-bar" role="group" aria-label="Чтение"><span class="ux-time">${content == null ? "" : "≈ " + dur(content) + " чтения"}</span>${prefBtns}</div>`);
    (extra || []).forEach((n) => bar.appendChild(n));
    after.after(bar); syncButtons(); syncMarks(); progress();
  }
  let prog = null;
  function progress() {
    if (prog) return; const h = document.querySelector(".site-header"); if (!h) return;
    prog = mk('<div class="ux-progress" aria-hidden="true"><i></i></div>'); h.appendChild(prog);
    const bar = prog.firstChild; let q = false;
    const upd = () => { q = false; const max = document.documentElement.scrollHeight - innerHeight; bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, scrollY / max) : 0) + ")"; };
    addEventListener("scroll", () => { if (!q) { q = true; requestAnimationFrame(upd); } }, { passive: true }); addEventListener("resize", upd); upd();
  }
  function setupBrief(br) {
    const head = br.querySelector(".issue-head"); if (!head || br.querySelector(".ux-bar")) return;
    const id = params.get("id") || ""; if (!id) return;
    const m = /^(\d{4})-(\d\d)-(\d\d)(?:-(\w+))?/.exec(id), slot = m ? ({ utro: "утро", vecher: "вечер" }[m[4]] || "") : "";
    const title = (m ? `${m[3]}.${m[2]}${slot ? " " + slot : ""}: ` : "") + txt(head.querySelector("h1"));
    const item = { key: "brief:" + id, type: "brief", title, href: "brief.html?id=" + encodeURIComponent(id) + "&kind=" + encodeURIComponent(params.get("kind") || "ai") };
    readingBar(head, br.querySelector(".issue, .article") || br, [starBtn(item), readBtn(item.key)]);
    const pager = br.querySelector(".issue-nav"); const end = mk('<div class="ux-endmark"></div>'); end.appendChild(readBtn(item.key, "✓ Отметить сводку прочитанной"));
    pager ? pager.before(end) : br.appendChild(end); syncMarks();
  }
  function setupPut() {
    const hero = document.querySelector("header.hero"), list = document.querySelector("section .fold-list"); if (!hero || !list) return;
    const item = { key: "put:" + page, type: "put", title: "Дорожка: " + txt(hero.querySelector("h1")), href: page + ".html" };
    readingBar(hero, list, [starBtn(item), readBtn(item.key)]);
    const end = mk('<div class="ux-endmark"></div>'); end.appendChild(readBtn(item.key, "✓ Отметить дорожку прочитанной")); list.after(end); syncMarks();
  }
  function setupMetod() {
    const chs = document.querySelectorAll(".m-chapter"); if (!chs.length) return;
    const intro = document.querySelector(".page-intro") || document.querySelector(".m-tools");
    readingBar(intro, Array.from(chs).reduce((a, d) => a + words(d.querySelector(".m-body")), 0), []);
    chs.forEach((d) => {
      const s = d.querySelector(":scope > summary"), body = d.querySelector(".m-body"); if (!s || !body || s.querySelector(".ux-mini")) return;
      s.appendChild(mk(`<span class="ux-chtime">≈ ${minutes(body)} мин</span>`));
      s.appendChild(starBtn({ key: "ch:" + d.id, type: "ch", title: txt(s.querySelector("h2")), href: "metodichka.html#" + d.id }, true));
      const end = mk('<div class="ux-endmark"></div>'); end.appendChild(readBtn("ch:" + d.id, "✓ Глава прочитана"));
      const pn = body.querySelector(":scope > .m-pn"); pn ? pn.before(end) : body.appendChild(end);
    });
    markLists(); syncMarks();
  }
  function setupSprav() { const intro = document.querySelector(".page-intro"), r = document.getElementById("sp-root"); if (intro && r) readingBar(intro, null, []); }

  /* --- меню «Ещё»: блок «Чтение» и закладки --- */
  function setupMenu() {
    const list = document.querySelector(".site-header .nav-more-list"); if (!list || list.querySelector(".ux-menu")) return;
    list.appendChild(mk(`<div class="ux-menu" role="group" aria-label="Настройки чтения"><b>Чтение</b><div class="ux-row">${prefBtns}<button type="button" class="ux-btn" data-ux="comfy" aria-pressed="false">Удобная строка</button></div><button type="button" class="ux-btn" data-ux="bm"></button></div>`));
  }
  /* --- кнопка «наверх» (где нет своих плавающих кнопок методички/справочника) --- */
  function setupTop() {
    if (document.getElementById("m-fab")) return;
    const b = mk('<button type="button" class="ux-top" aria-label="Наверх" tabindex="-1">↑</button>'); document.body.appendChild(b);
    b.addEventListener("click", () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));
    const upd = () => { const on = scrollY > 900; b.classList.toggle("on", on); b.tabIndex = on ? 0 : -1; };
    addEventListener("scroll", upd, { passive: true }); upd();
  }
  /* --- словарь: переход по закладке slovar.html#t=термин --- */
  let slovarHashDone = false;
  function slovarHash() {
    if (slovarHashDone || !location.hash.startsWith("#t=")) return;
    const list = document.getElementById("slovar-list"), input = document.getElementById("slovar-search");
    if (!list || !input || !list.querySelector(".fold-item")) return; slovarHashDone = true;
    const term = decodeURIComponent(location.hash.slice(3)); input.value = term; input.dispatchEvent(new Event("input"));
    const hit = Array.from(list.querySelectorAll(".fold-item")).find((d) => txt(d.querySelector(".fold-title")).toLowerCase() === term.toLowerCase()) || list.querySelector(".fold-item");
    if (hit) { hit.open = true; hit.scrollIntoView({ block: "center" }); }
  }

  function init() {
    applyPrefs(); setupMenu(); setupTop(); enhance(document); markLists();
    if (document.querySelector(".m-chapter")) setupMetod();
    else if (/^put-/.test(page)) setupPut();
    if (document.getElementById("sp-root")) setupSprav();
    const br = document.getElementById("brief-root"); if (br) setupBrief(br);
    syncButtons();
    let pend = new Set(), sched = false;
    new MutationObserver((ms) => {
      ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1 && !n.closest(".ux-code,.ux-bar,.ux-bm,.ux-endmark")) pend.add(n); }));
      if (sched || !pend.size) return; sched = true;
      requestAnimationFrame(() => {
        sched = false; const nodes = Array.from(pend); pend = new Set();
        nodes.forEach((n) => { if (n.isConnected) enhance(n); });
        if (br) setupBrief(br);
        slovarHash();
      });
    }).observe(document.body, { childList: true, subtree: true });
    slovarHash();
    addEventListener("hashchange", () => { slovarHashDone = false; closePanel(); slovarHash(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.addEventListener("storage", (e) => { if (/^moto-/.test(e.key || "")) { applyPrefs(); markLists(); syncMarks(); } });
})();
// ---- высота шапки -> CSS-переменная --hdr (липкие панели и якоря встают ровно под шапку) ----
(function () {
  const h = document.querySelector(".site-header");
  if (!h) return;
  const set = () => document.documentElement.style.setProperty("--hdr", Math.round(h.getBoundingClientRect().height) + "px");
  set();
  if (window.ResizeObserver) new ResizeObserver(set).observe(h);
  else addEventListener("resize", set);
})();

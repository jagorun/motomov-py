(function () {
  const params = new URLSearchParams(location.search);
  if (document.getElementById("lesson-root")) loadLesson(params.get("id"), params.get("tab"));
  if (document.getElementById("course-list")) loadCourse();
  if (document.getElementById("kb-list")) loadKb();
  if (document.getElementById("slovar-list")) loadSlovar();
  if (document.getElementById("news-list")) loadNews();
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
function courseBlockHtml(block) {
  if (block.kind === "note") return `<p class="course-aside">${escapeHtml(block.text)}</p>`;
  const head = block.kind === "module"
    ? `<h3>Модуль ${escapeHtml(String(block.num))}. ${escapeHtml(block.title)}</h3>`
    : `<h3>${escapeHtml(block.title)}</h3>`;
  const summary = block.summary ? `<p class="lesson-note">${escapeHtml(block.summary)}</p>` : "";
  const note = block.note ? `<p class="lesson-note">${escapeHtml(block.note)}</p>` : "";
  const rows = (block.lessons || []).map(courseLessonHtml).join("");
  return `<div class="module">${head}${summary}${note}${rows}</div>`;
}
function courseHtml(course) {
  const open = course.open ? " open" : "";
  const later = course.later ? " later" : "";
  const blocks = (course.blocks || []).map(courseBlockHtml).join("");
  const blurb = course.blurb ? `<p class="course-aside">${escapeHtml(course.blurb)}</p>` : "";
  const foot = course.footnote ? `<p class="course-aside">${escapeHtml(course.footnote)}</p>` : "";
  return `<details class="course-block${later}"${open}><summary><span class="badge">${escapeHtml(course.badge || "")}</span><h2>${escapeHtml(course.title)}</h2><p>${escapeHtml(course.meta || "")}</p></summary><div class="course-body">${blurb}${blocks}${foot}</div></details>`;
}
async function loadCourse() {
  const box = document.getElementById("course-list");
  try {
    const data = await fetch("data/course-path.json", { cache: "no-store" }).then((r) => r.json());
    const courses = Array.isArray(data) ? data : (data.courses || []);
    if (!courses.length || !courses[0].blocks) throw new Error("empty");
    box.innerHTML = courses.map(courseHtml).join("");
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
function novostiRowHtml(it) {
  const date = escapeHtml(it.dateLabel || "");
  const title = escapeHtml(it.title || "");
  const summary = escapeHtml(it.summary || "");
  const href = briefHref(it);
  const topic = it.topic ? `<div class="meta">${escapeHtml(it.topic)}</div>` : "";
  return `<details class="fold-item"><summary><span class="fold-arrow" aria-hidden="true"></span><span class="fold-date">${date}</span><span class="fold-title">${title}</span></summary><div class="fold-body"><p>${summary}</p>${topic}<div class="meta"><a href="${href}">читать целиком →</a></div></div></details>`;
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
  const all = await fetch("data/kb.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
  const items = all.filter((it) => it.source || it.what);
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
    Array.from(sortBox.querySelectorAll("button[data-sort]")).forEach((b) => {
      const on = b.getAttribute("data-sort") === sortMode;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
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
    });
    shown.sort((a, b) => compareSlovar(a, b, sortMode));
    list.innerHTML = "";
    if (!shown.length) {
      list.innerHTML = '<div class="empty">В словаре пока пусто. Термины появятся после следующих сводок.</div>';
      return;
    }
    list.classList.add("fold-list");
    shown.forEach((it) => list.appendChild(el(slovarRowHtml(it))));
  }
  draw("");
  if (input) input.addEventListener("input", () => draw(input.value));
}
async function fetchJson(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}
async function loadNews() {
  const list = document.getElementById("news-list");
  const items = (await fetchJson("data/briefs.json")).filter((it) => it.kind !== "ai");
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = '<div class="empty">Лента пока пустая. Утренний выпуск придёт в 07:00 по Москве.</div>';
    return;
  }
  items.forEach((it) => list.appendChild(el(cardHtml(it))));
}
const NOVOSTI_RECENT_LIMIT = 14;
function monthKey(it) {
  const d = String(it.date || it.id || "").slice(0, 7);
  return /^\d{4}-\d{2}$/.test(d) ? d : "";
}
function monthLabel(key) {
  const months = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  const parts = String(key).split("-");
  if (parts.length !== 2) return key;
  const m = Number(parts[1]);
  return (months[m - 1] || parts[1]) + " " + parts[0];
}
async function loadNovosti() {
  const list = document.getElementById("novosti-list");
  const items = await fetchJson("data/novosti.json");
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = '<div class="empty">Новостей пока нет. Утренняя сводка придёт в 07:00 по Москве.</div>';
    return;
  }
  list.classList.add("fold-list");
  items.slice(0, NOVOSTI_RECENT_LIMIT).forEach((it) => list.appendChild(el(novostiRowHtml(it))));
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
    list.classList.add("fold-list");
    shown.forEach((it) => list.appendChild(el(novostiRowHtml(it))));
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
  const [python, ai] = await Promise.all([
    fetchJson("data/briefs.json"),
    fetchJson("data/novosti.json")
  ]);
  let pool;
  if (kind === "ai") {
    pool = ai;
  } else if (kind) {
    pool = python.filter((it) => it.kind === kind);
    if (!pool.some((it) => it.id === id)) pool = python;
  } else {
    const inPy = python.find((it) => it.id === id);
    pool = inPy ? python : ai.concat(python);
  }
  const i = id ? pool.findIndex((it) => it.id === id) : -1;
  const brief = i >= 0 ? pool[i] : null;
  if (!brief) { root.innerHTML = `<div class="empty">Сводка не найдена${id ? " («" + escapeHtml(id) + "»)" : ""}. <a href="archive.html">К архиву</a> · <a href="news.html">К python</a></div>`; return; }
  document.title = brief.title + " \u00b7 py.motomov.ru";
  const same = pool.filter((it) => it.kind === brief.kind);
  const si = same.findIndex((it) => it.id === brief.id);
  const prev = same[si - 1];
  const next = same[si + 1];
  const backHref = brief.kind === "ai" ? "archive.html" : "news.html";
  const backLabel = brief.kind === "ai" ? "К архиву" : "К ленте python";
  root.innerHTML = `<span class="badge">${kindLabel(brief.kind)} \u00b7 ${escapeHtml(brief.dateLabel)} \u00b7 ${escapeHtml(brief.topic || "")}</span><h1>${escapeHtml(brief.title)}</h1><p class="bio" style="margin:0.6rem 0 1.1rem">${escapeHtml(brief.summary)}</p><article class="article">${renderBody(brief.body || [])}</article><div class="pager">${prev ? `<a class="ghost-btn" href="${briefHref(prev)}">← ${escapeHtml(prev.title)}</a>` : `<a class="ghost-btn" href="${backHref}">${backLabel}</a>`}${next ? `<a class="ghost-btn" href="${briefHref(next)}">${escapeHtml(next.title)} →</a>` : `<a class="ghost-btn" href="${backHref}">${backLabel} →</a>`}</div>`;
}

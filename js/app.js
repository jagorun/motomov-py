(function () {
  const params = new URLSearchParams(location.search);
  if (document.getElementById("lesson-root")) loadLesson(params.get("id"));
  if (document.getElementById("course-list")) loadCourse();
  if (document.getElementById("kb-list")) loadKb();
  if (document.getElementById("slovar-list")) loadSlovar();
  if (document.getElementById("news-list")) loadNews();
  if (document.getElementById("novosti-list")) loadNovosti();
  if (document.getElementById("brief-root")) loadBrief(params.get("id"), params.get("kind"));
})();
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  return `<a class="lesson-card" href="${briefHref(it)}"><span class="badge">${kindLabel(it.kind)} · ${escapeHtml(it.dateLabel)}</span><h3>${escapeHtml(it.title)}</h3><p>${escapeHtml(it.summary)}</p><div class="meta">${escapeHtml(it.topic || "")}</div></a>`;
}
async function loadCourse() {
  const box = document.getElementById("course-list");
  try {
    const lessons = await fetch("data/lessons.json", { cache: "no-store" }).then((r) => r.json());
    box.innerHTML = "";
    lessons.forEach((l) => {
      box.appendChild(el(`<a class="lesson-card" href="lesson.html?id=${encodeURIComponent(l.id)}"><span class="badge">урок ${l.num} · ${l.level}</span><h3>${l.title}</h3><p>${l.summary}</p><div class="meta">${l.time}</div></a>`));
    });
  } catch (e) {
    box.innerHTML = '<div class="empty">Не удалось загрузить программу.</div>';
  }
}
async function loadLesson(id) {
  const root = document.getElementById("lesson-root");
  const lessons = await fetch("data/lessons.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
  const i = Math.max(0, lessons.findIndex((l) => l.id === id));
  const lesson = lessons[i] || lessons[0];
  if (!lesson) { root.innerHTML = '<div class="empty">Урок не найден.</div>'; return; }
  document.title = lesson.title + " · py.motomov.ru";
  const prev = lessons[i - 1];
  const next = lessons[i + 1];
  root.innerHTML = `<span class="badge">урок ${lesson.num} · ${lesson.level} · ${lesson.time}</span><h1>${lesson.title}</h1><p class="bio" style="margin:0.6rem 0 1.1rem">${lesson.summary}</p><article class="article">${renderBody(lesson.body)}</article><div class="pager">${prev ? `<a class="ghost-btn" href="lesson.html?id=${prev.id}">← ${prev.title}</a>` : `<a class="ghost-btn" href="course.html">К программе</a>`}${next ? `<a class="ghost-btn" href="lesson.html?id=${next.id}">${next.title} →</a>` : `<a class="ghost-btn" href="kb.html">К базе →</a>`}</div>`;
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
    meta = `<div class="meta"><a href="${href}">из сводки ${escapeHtml(it.source)}</a>${it.updated ? " · " + escapeHtml(it.updated) : ""}</div>`;
  }
  return `<article class="kb-card"><span class="badge">${badge}</span><h3>${title}</h3>${body}${meta}</article>`;
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

async function loadSlovar() {
  const list = document.getElementById("slovar-list");
  const input = document.getElementById("slovar-search");
  const filters = document.getElementById("slovar-filters");
  const all = await fetch("data/kb.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
  const items = all.filter((it) => it.source || it.what);
  let activeTag = "";
  const tags = Array.from(new Set(items.map((it) => it.tag).filter(Boolean))).sort();
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
  function draw(q) {
    const needle = (q || "").trim().toLowerCase();
    const shown = items.filter((it) => {
      if (activeTag && it.tag !== activeTag) return false;
      return !needle || kbHaystack(it).includes(needle);
    });
    // newest first by updated/source
    shown.sort((a, b) => String(b.updated || b.source || "").localeCompare(String(a.updated || a.source || "")));
    list.innerHTML = "";
    if (!shown.length) {
      list.innerHTML = '<div class="empty">В словаре пока пусто. Термины появятся после следующих сводок.</div>';
      return;
    }
    shown.forEach((it) => list.appendChild(el(kbCardHtml(it))));
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
async function loadNovosti() {
  const list = document.getElementById("novosti-list");
  const items = await fetchJson("data/novosti.json");
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = '<div class="empty">Новостей пока нет. Утренняя сводка придёт в 07:00 по Москве.</div>';
    return;
  }
  items.forEach((it) => list.appendChild(el(cardHtml(it))));
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
  if (!brief) { root.innerHTML = '<div class="empty">Сводка не найдена.</div>'; return; }
  document.title = brief.title + " · py.motomov.ru";
  const same = pool.filter((it) => it.kind === brief.kind);
  const si = same.findIndex((it) => it.id === brief.id);
  const prev = same[si - 1];
  const next = same[si + 1];
  const backHref = brief.kind === "ai" ? "novosti.html" : "news.html";
  const backLabel = brief.kind === "ai" ? "К новостям" : "К ленте python";
  root.innerHTML = `<span class="badge">${kindLabel(brief.kind)} · ${escapeHtml(brief.dateLabel)} · ${escapeHtml(brief.topic || "")}</span><h1>${escapeHtml(brief.title)}</h1><p class="bio" style="margin:0.6rem 0 1.1rem">${escapeHtml(brief.summary)}</p><article class="article">${renderBody(brief.body || [])}</article><div class="pager">${prev ? `<a class="ghost-btn" href="${briefHref(prev)}">← ${escapeHtml(prev.title)}</a>` : `<a class="ghost-btn" href="${backHref}">${backLabel}</a>`}${next ? `<a class="ghost-btn" href="${briefHref(next)}">${escapeHtml(next.title)} →</a>` : `<a class="ghost-btn" href="${backHref}">${backLabel} →</a>`}</div>`;
}

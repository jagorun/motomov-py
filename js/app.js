(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(glow);
    let x = 0, y = 0, tx = 0, ty = 0;
    window.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      glow.style.transform = "translate(" + (x - 120) + "px," + (y - 120) + "px)";
      requestAnimationFrame(loop);
    })();
  }
  const params = new URLSearchParams(location.search);
  if (document.getElementById("lesson-root")) loadLesson(params.get("id"));
  if (document.getElementById("course-list")) loadCourse();
  if (document.getElementById("kb-list")) loadKb();
  if (document.getElementById("news-list")) loadNews();
  if (document.getElementById("brief-root")) loadBrief(params.get("id"));
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
  return "заметка";
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
async function loadKb() {
  const list = document.getElementById("kb-list");
  const input = document.getElementById("kb-search");
  const items = await fetch("data/kb.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
  function draw(q) {
    const needle = (q || "").trim().toLowerCase();
    const shown = items.filter((it) => !needle || (it.title + " " + it.text + " " + it.tag).toLowerCase().includes(needle));
    list.innerHTML = "";
    if (!shown.length) { list.innerHTML = '<div class="empty">В базе этого нет.</div>'; return; }
    shown.forEach((it) => {
      list.appendChild(el(`<article class="kb-card"><span class="badge">${it.tag}</span><h3>${it.title}</h3><p>${it.text}</p></article>`));
    });
  }
  draw("");
  if (input) input.addEventListener("input", () => draw(input.value));
}
async function loadNews() {
  const list = document.getElementById("news-list");
  const items = await fetch("data/briefs.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = '<div class="empty">Лента пока пустая. Утренний выпуск придёт в 07:00 по Москве.</div>';
    return;
  }
  items.forEach((it) => {
    list.appendChild(el(`<a class="lesson-card" href="brief.html?id=${encodeURIComponent(it.id)}"><span class="badge">${kindLabel(it.kind)} · ${it.dateLabel}</span><h3>${escapeHtml(it.title)}</h3><p>${escapeHtml(it.summary)}</p><div class="meta">${escapeHtml(it.topic || "")}</div></a>`));
  });
}
async function loadBrief(id) {
  const root = document.getElementById("brief-root");
  const items = await fetch("data/briefs.json", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
  const i = items.findIndex((it) => it.id === id);
  const brief = i >= 0 ? items[i] : items[0];
  if (!brief) { root.innerHTML = '<div class="empty">Сводка не найдена.</div>'; return; }
  document.title = brief.title + " · py.motomov.ru";
  const prev = items[i - 1];
  const next = items[i + 1];
  root.innerHTML = `<span class="badge">${kindLabel(brief.kind)} · ${escapeHtml(brief.dateLabel)} · ${escapeHtml(brief.topic || "")}</span><h1>${escapeHtml(brief.title)}</h1><p class="bio" style="margin:0.6rem 0 1.1rem">${escapeHtml(brief.summary)}</p><article class="article">${renderBody(brief.body || [])}</article><div class="pager">${prev ? `<a class="ghost-btn" href="brief.html?id=${encodeURIComponent(prev.id)}">← ${escapeHtml(prev.title)}</a>` : `<a class="ghost-btn" href="news.html">К ленте</a>`}${next ? `<a class="ghost-btn" href="brief.html?id=${encodeURIComponent(next.id)}">${escapeHtml(next.title)} →</a>` : `<a class="ghost-btn" href="news.html">К ленте →</a>`}</div>`;
}

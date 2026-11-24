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
  // лента и выпуск стартуют после разбора всего файла (их помощники объявлены ниже как const)
  if (document.getElementById("novosti-list")) Promise.resolve().then(() => loadNovosti());
  if (document.getElementById("archive-list")) Promise.resolve().then(() => loadArchive(params.get("month")));
  if (document.getElementById("brief-root")) Promise.resolve().then(() => loadBrief(params.get("id"), params.get("kind")));
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
// на py.motomov.ru сразу чистый адрес /brief (без перенаправления 308 с brief.html — минус один запрос на переход)
function briefHref(it) {
  const path = /(^|\.)motomov\.ru$/.test(location.hostname) ? "brief" : "brief.html";
  return `${path}?id=${encodeURIComponent(it.id)}&kind=${encodeURIComponent(it.kind)}`;
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
      fetch("data/course-path.json", { cache: "no-cache" }).then((r) => r.json()),
      fetch("data/course-glossary.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
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
  const lessons = await fetch("data/lessons.json", { cache: "no-cache" }).then((r) => r.json()).catch(() => []);
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
// ===== Лента новостей (2026-11-24): карточки, метки, поиск, фильтры, порции =====
const FEED_PAGE = 16;
const FEED_TAG_ALIAS = { "агенты": "агент", "модели": "модель", "чипы": "чип", "роботы": "робот", "инфраструктура": "инфра", "регулирование": "регуляторика", "инструмент": "инструменты", "research": "исследование" };
const FEED_TAGS = ["агент", "модель", "чип", "инфра", "продукт", "исследование", "регуляторика", "безопасность", "робот", "энергия", "био", "космос", "RAG"];
const FEED_HUE = { "агент": 265, "модель": 212, "чип": 28, "инфра": 190, "продукт": 160, "исследование": 238, "регуляторика": 352, "безопасность": 8, "робот": 40, "энергия": 50, "био": 118, "космос": 285, "RAG": 310 };
function feedTag(t) {
  const k = String(t || "").trim();
  const l = k.toLowerCase();
  return FEED_TAG_ALIAS[l] || (/^[A-Z]{2,}$/.test(k) ? k : l);
}
function feedHue(t) {
  const k = feedTag(t);
  if (FEED_HUE[k] != null) return FEED_HUE[k];
  let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 360;
  return h;
}
function tagChipHtml(t) {
  return `<span class="tag" style="--h:${feedHue(t)}">${escapeHtml(t)}</span>`;
}
function feedNorm(s) { return String(s || "").toLowerCase().replace(/ё/g, "е"); }
function feedWords(q) { return feedNorm(q).split(/\s+/).filter((w) => w.length > 0); }
function feedMark(text, words) {
  const s = String(text || "");
  if (!words || !words.length) return escapeHtml(s);
  const re = new RegExp("(" + words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/е/g, "[её]")).join("|") + ")", "giu");
  let out = "", last = 0, m;
  while ((m = re.exec(s))) {
    if (!m[0]) { re.lastIndex++; continue; }
    out += escapeHtml(s.slice(last, m.index)) + "<mark>" + escapeHtml(m[0]) + "</mark>";
    last = m.index + m[0].length;
  }
  return out + escapeHtml(s.slice(last));
}
function ruPlural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
// метки, объём, число новостей и «главное в выпуске»:
// 1) готовый указатель data/novosti/digest/ (meta.json + YYYY-MM.json, собирает scripts/build_digest_index.py);
// 2) если записи нет или подпись не совпала — сам выпуск (items/<id>.json или body в карточке), разбор здесь же.
const FEED_META_KEY = "mpy-feed-meta-v1";
const feedMeta = (() => { try { return JSON.parse(localStorage.getItem(FEED_META_KEY) || "{}") || {}; } catch (e) { return {}; } })();
const feedBodies = new Map();
const feedNewsMem = new Map();
const FEED_DIGEST = { meta: {}, metaP: null, months: new Map(), monthData: new Map() };
function feedSig(it) { return String(it.title || "").length + ":" + String(it.summary || "").length; }
function feedDigestMeta() {
  if (!FEED_DIGEST.metaP) {
    FEED_DIGEST.metaP = fetch("data/novosti/digest/meta.json").then((r) => (r.ok ? r.json() : null)).catch(() => null)
      .then((d) => { FEED_DIGEST.meta = (d && d.items) || {}; FEED_DIGEST.monthList = (d && d.months) || []; return FEED_DIGEST.meta; });
  }
  return FEED_DIGEST.metaP;
}
function feedMonthOf(it) { return String(it.date || it.id || "").slice(0, 7); }
function feedDigestMonth(m) {
  if (!/^\d{4}-\d{2}$/.test(m)) return Promise.resolve({});
  if (!FEED_DIGEST.months.has(m)) {
    FEED_DIGEST.months.set(m, fetch("data/novosti/digest/" + m + ".json").then((r) => (r.ok ? r.json() : null)).catch(() => null)
      .then((d) => { const v = (d && d.items) || {}; FEED_DIGEST.monthData.set(m, v); return v; }));
  }
  return FEED_DIGEST.months.get(m);
}
function feedMetaOf(it) {
  const d = FEED_DIGEST.meta[it.id]; if (d && d.s === feedSig(it)) return d;
  const m = feedMeta[it.id]; return m && m.s === feedSig(it) ? m : null;
}
function feedNewsOf(it) {
  if (feedNewsMem.has(it.id)) return feedNewsMem.get(it.id);
  const md = FEED_DIGEST.monthData.get(feedMonthOf(it)); const e = md && md[it.id];
  return e && e.s === feedSig(it) ? e.news : null;
}
function feedSaveMeta() {
  clearTimeout(feedSaveMeta._t);
  feedSaveMeta._t = setTimeout(() => { try { localStorage.setItem(FEED_META_KEY, JSON.stringify(feedMeta)); } catch (e) {} }, 400);
}
function feedGist(lines) {
  for (const raw of lines) {
    let s = String(raw).trim();
    if (!s || /^\s*[-*]?\s*Источник/i.test(s) || s.startsWith("```")) continue;
    s = s.replace(/^[-*]\s+/, "").replace(/\*\*/g, "");
    const m = /^(.+?[.!?…])(?=\s+[«"(A-ZА-ЯЁ0-9]|$)/.exec(s);
    const first = m && m[1].length >= 25 ? m[1] : s;
    if (first.length <= 120) return first;
    let cut = first.slice(0, 120);
    if (cut.slice(40).includes(" ")) cut = cut.slice(0, cut.lastIndexOf(" "));
    return cut.replace(/[\s,;:—–-]+$/, "") + "…";
  }
  return "";
}
function feedMetaFromBody(body) {
  const tags = []; const news = []; let words = 0, g = 0, kind = "normal", cur = null;
  body.forEach((raw) => {
    const ln = String(raw);
    words += ln.split(/\s+/).filter(Boolean).length;
    if (/^## /.test(ln)) { kind = sectionKind(ln.slice(3)); cur = null; return; }
    if (/^### /.test(ln)) {
      cur = null;
      if (kind === "glossary") g += 1;
      else if (kind === "normal") {
        const p = itemTitleParts(ln.slice(4).trim());
        const t = [];
        p.tags.forEach((x) => { const k = feedTag(x); if (k && !t.includes(k)) t.push(k); if (k && !tags.includes(k)) tags.push(k); });
        cur = { a: "n" + (news.length + 1), h: p.title, d: p.date, t, lines: [] };
        news.push(cur);
      }
      return;
    }
    if (cur) cur.lines.push(ln);
  });
  const out = news.map((x) => { const e = { a: x.a, h: x.h }; if (x.d) e.d = x.d; if (x.t.length) e.t = x.t; const gi = feedGist(x.lines); if (gi) e.g = gi; return e; });
  return { meta: { t: tags, w: words, n: news.length, g }, news: out };
}
async function feedLoadOne(it) {
  if (feedBodies.has(it.id)) return;
  let body = Array.isArray(it.body) ? it.body : null;
  if (!body) {
    try { const full = await loadAiItem(it.id); body = full && Array.isArray(full.body) ? full.body : []; } catch (e) { body = []; }
  }
  feedBodies.set(it.id, feedNorm(body.join("\n")));
  if (body.length) {
    const r = feedMetaFromBody(body);
    feedNewsMem.set(it.id, r.news);
    feedMeta[it.id] = Object.assign({ s: feedSig(it) }, r.meta); feedSaveMeta();
  }
}
async function feedLoadMany(items, onProgress) {
  const queue = items.filter((it) => !feedBodies.has(it.id));
  const total = items.length; let done = total - queue.length;
  const worker = async () => { while (queue.length) { const it = queue.shift(); await feedLoadOne(it); done += 1; if (onProgress) onProgress(done, total); } };
  await Promise.all(Array.from({ length: 6 }, worker));
}
function feedMetaHtml(m) {
  if (!m) return "";
  const mins = Math.max(1, Math.round(m.w / 170));
  return `<span class="feed-rt">${m.n ? m.n + " " + ruPlural(m.n, "новость", "новости", "новостей") + " · " : ""}${mins} мин</span>`;
}
const FEED_NEWS_TOP = 5;
function feedNewsHtml(it, news, words) {
  if (!news || !news.length) return "";
  const href = briefHref(it);
  const li = (x, i) => `<li${i >= FEED_NEWS_TOP ? ' class="more" hidden' : ""}><a class="fn-link" href="${href}#${escapeHtml(x.a)}"><span class="fn-h">${feedMark(x.h, words)}</span>${(x.t || []).length ? ` <span class="fn-tags">${x.t.map(tagChipHtml).join("")}</span>` : ""}</a>${x.g ? `<span class="fn-g">${feedMark(x.g, words)}</span>` : ""}</li>`;
  const rest = news.length - FEED_NEWS_TOP;
  return `<div class="fn-title">Главное в выпуске</div><ol class="fn-list">${news.map(li).join("")}</ol>${rest > 0 ? `<button type="button" class="fn-more" aria-expanded="false" data-more="${rest}">ещё ${rest} ${ruPlural(rest, "новость", "новости", "новостей")}</button>` : ""}`;
}
function novostiRowHtml(it, words) {
  const slot = newsSlot(it);
  const m = feedMetaOf(it);
  const news = feedNewsOf(it);
  const topic = it.topic && it.topic.length <= 60 ? `<span class="feed-topic">${escapeHtml(it.topic)}</span>` : "";
  const sum = it.summary || (it.topic && !topic ? it.topic : "");
  const href = briefHref(it);
  return `<article class="feed-card news-card${news && news.length ? " has-news" : ""}" data-id="${escapeHtml(it.id)}" data-href="${href}"><div class="feed-meta"><span class="news-slot slot-${slot.key}">${slot.label}</span>${topic}<span class="feed-rt-box">${feedMetaHtml(m)}</span></div><h3 class="news-head"><a class="feed-link" href="${href}">${feedMark(newsHeadline(it), words)}</a></h3>${sum ? `<p class="feed-sum">${feedMark(sum, words)}</p>` : ""}<div class="feed-tags">${m && !(news && news.length) ? m.t.map(tagChipHtml).join("") : ""}</div><div class="feed-news">${feedNewsHtml(it, news, words)}</div></article>`;
}
// дни с липкими заголовками; append=true дописывает порцию к уже отрисованному
function renderNewsDays(list, items, opts) {
  const o = opts || {};
  if (!o.append) { list.innerHTML = ""; list._curDay = null; list._box = null; }
  list.classList.remove("fold-list");
  list.classList.add("news-days");
  items.forEach((it) => {
    const d = it.date || String(it.id || "").slice(0, 10);
    if (d !== list._curDay || !list._box) {
      list._curDay = d;
      const day = el(`<section class="news-day" id="${escapeHtml("day-" + d)}" aria-label="${escapeHtml(dayLabel(d))}"><h2 class="news-day-title"><time datetime="${escapeHtml(d)}">${escapeHtml(dayLabel(d))}</time></h2><div class="news-day-list"></div></section>`);
      list.appendChild(day);
      list._box = day.querySelector(".news-day-list");
    }
    list._box.appendChild(el(novostiRowHtml(it, o.words)));
  });
  const nav = document.getElementById("novosti-day-nav");
  if (nav) nav.style.display = "none";
}
// ---- one AI issue: sections, numbered items, collapsible glossary ----
function linkifyText(text) {
  const re = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?»"'])/g;
  let out = "", last = 0, m;
  while ((m = re.exec(text))) {
    out += escapeHtml(text.slice(last, m.index));
    let host = m[1];
    try { host = new URL(m[1]).hostname.replace(/^www\./, ""); } catch (e) {}
    out += `<a class="src-link" href="${escapeHtml(m[1])}" target="_blank" rel="noopener" title="${escapeHtml(m[1])}">${escapeHtml(host)}</a>`;
    last = m.index + m[1].length;
  }
  out += escapeHtml(text.slice(last));
  return out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^(Что это|Зачем сегодня|Зачем[^:<]{0,40}|Не путать с|Источник):/, "<strong>$1:</strong>");
}
const SRC_LINE = /^\s*(Источник[а-яё]*(?:\s*\([^)]{0,40}\))?)\s*:\s*/i;
function srcLineHtml(t) {
  const m = SRC_LINE.exec(t);
  return `<p class="src-line"><span class="src-label">${escapeHtml(m[1])}</span> ${linkifyText(t.slice(m[0].length))}</p>`;
}
function paraHtml(line) {
  const t = line.replace(/Источник:\s*/g, "Источник: ");
  if (/^[-*]\s+/.test(t)) return null;
  if (SRC_LINE.test(t) && /https?:\/\//.test(t)) return srcLineHtml(t);
  return `<p>${linkifyText(t)}</p>`;
}
function linesHtml(lines) {
  let html = "", ul = [];
  const li = (x) => SRC_LINE.test(x) && /https?:\/\//.test(x) ? `<li class="src-li">${srcLineHtml(x)}</li>` : `<li>${linkifyText(x)}</li>`;
  const flush = () => { if (ul.length) { html += "<ul>" + ul.map(li).join("") + "</ul>"; ul = []; } };
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
// заголовок новости: «1. 23.11 · Z.ai: … [модель] [агент]» -> номер, дата, заголовок, метки (текст не меняется, только раскладка)
function itemTitleParts(title) {
  const tags = [];
  let t = title.replace(/\s*\[([^\]]+)\]/g, (_, x) => { tags.push(x); return ""; }).trim();
  let num = "";
  const nm = /^(\d{1,2})[.)]\s+/.exec(t); if (nm) { num = nm[1]; t = t.slice(nm[0].length); }
  let date = "";
  const dm = /^(\d{1,2}(?:[–-]\d{1,2})?\.\d{1,2}(?:[–-]\d{1,2}\.\d{1,2})?)\s+·\s+/.exec(t); if (dm) { date = dm[1]; t = t.slice(dm[0].length); }
  return { num, date, title: t, tags };
}
function itemTitleHtml(title) {
  const p = itemTitleParts(title);
  return { title: escapeHtml(p.title), tags: p.tags.map(tagChipHtml).join("") };
}
function sectionKind(title) {
  const t = String(title || "").toLowerCase();
  if (/заголовок дня/.test(t)) return "dek";
  if (/коротко|главное|итог дня|суть/.test(t)) return "lead";
  if (/словар/.test(t)) return "glossary";
  if (/подписк|акци|триал/.test(t)) return "promo";
  return "normal";
}
function tocLabel(title) { return String(title || "").replace(/^\d{1,2}[.)]\s+/, "").replace(/ к вечеру| за ночь/i, ""); }
function glossaryTermHtml(title) {
  const m = /^(.*?)\s*(\([^()]*\))\s*$/.exec(title);
  return m && m[1] ? `<span class="gl-term">${escapeHtml(m[1])}</span> <span class="gl-alt">${escapeHtml(m[2])}</span>` : `<span class="gl-term">${escapeHtml(title)}</span>`;
}
function renderAiIssue(brief) {
  const secs = splitSections(brief.body || []);
  if (!secs.length) return null;
  const toc = []; let html = "", n = 0, terms = 0;
  secs.forEach((sec, si) => {
    const kind = sectionKind(sec.title);
    const anchor = "s" + (si + 1);
    const { pre, items } = splitItems(sec.lines);
    if (kind === "dek") {
      html += `<section class="issue-dek" id="${anchor}"><h2 class="issue-kicker">${escapeHtml(sec.title)}</h2>${linesHtml(sec.lines)}</section>`;
      return;
    }
    if (kind === "lead") {
      toc.push({ a: anchor, t: tocLabel(sec.title || "Коротко"), sub: [] });
      html += `<section class="issue-lead" id="${anchor}"><h2>${escapeHtml(sec.title || "Коротко")}</h2>${linesHtml(sec.lines)}</section>`;
      return;
    }
    if (kind === "glossary") {
      terms += items.length;
      const cards = items.map((it) => `<details class="gl-item"><summary>${glossaryTermHtml(it.title)}</summary><div class="gl-body">${linesHtml(it.lines)}</div></details>`).join("");
      toc.push({ a: anchor, t: "Словарь", sub: [] });
      const tools = items.length > 1 ? `<button type="button" class="gl-toggle" aria-expanded="false">Раскрыть все</button>` : "";
      html += `<section class="issue-sec issue-glossary" id="${anchor}"><div class="gl-head"><h2>${escapeHtml(sec.title)} <span class="count">${items.length}</span></h2>${tools}</div>${pre.some((l) => l.trim()) ? `<div class="gl-intro">${linesHtml(pre)}</div>` : ""}<div class="gl-list">${cards}</div></section>`;
      return;
    }
    if (kind === "promo") {
      const text = sec.lines.filter((l) => l.trim());
      const short = text.length <= 1 && items.length === 0;
      if (!short) toc.push({ a: anchor, t: tocLabel(sec.title), sub: [] });
      html += `<section class="issue-sec issue-promo${short ? " issue-note" : ""}" id="${anchor}"><h2>${escapeHtml(sec.title)}</h2>${linesHtml(sec.lines.filter((l) => !/^### /.test(l)))}${items.map((it) => `<h3>${escapeHtml(it.title)}</h3>${linesHtml(it.lines)}`).join("")}</section>`;
      return;
    }
    const entry = { a: anchor, t: tocLabel(sec.title), sub: [] };
    if (sec.title) toc.push(entry);
    let inner = linesHtml(pre);
    if (items.length) {
      inner += `<ol class="issue-items">` + items.map((it) => {
        n += 1;
        const p = itemTitleParts(it.title);
        entry.sub.push({ a: "n" + n, t: p.title });
        const date = p.date ? `<span class="issue-item-date">${escapeHtml(p.date)}</span>` : "";
        const tags = p.tags.length ? `<span class="tags">${p.tags.map(tagChipHtml).join("")}</span>` : "";
        return `<li class="issue-item" id="n${n}"><span class="num" aria-hidden="true">${escapeHtml(p.num || String(n))}</span><div class="issue-item-body">${date || tags ? `<div class="issue-item-meta">${date}${tags}</div>` : ""}<h3>${escapeHtml(p.title)}</h3>${linesHtml(it.lines)}</div></li>`;
      }).join("") + `</ol>`;
    }
    html += `<section class="issue-sec" id="${anchor}">${sec.title ? `<h2>${escapeHtml(sec.title)}</h2>` : ""}${inner}</section>`;
  });
  const tocHtml = toc.length > 1
    ? `<nav class="issue-toc" aria-label="Содержание выпуска"><p class="toc-title">Содержание</p><ol>${toc.map((e) => `<li><a href="#${e.a}">${escapeHtml(e.t)}</a>${e.sub.length ? `<ol class="toc-sub">${e.sub.map((s) => `<li><a href="#${s.a}">${escapeHtml(s.t)}</a></li>`).join("")}</ol>` : ""}</li>`).join("")}</ol></nav>`
    : "";
  return { tocHtml, html, items: n, terms };
}
function setupIssueToc(root) {
  const toc = root.querySelector(".issue-toc"); if (!toc) return;
  const links = Array.from(toc.querySelectorAll("a"));
  const targets = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  let q = false, cur = null;
  const keepVisible = (a, topA) => {
    // держим активный пункт в видимой части оглавления, не прокручивая страницу
    if (toc.scrollHeight > toc.clientHeight + 4) { const r = a.getBoundingClientRect(), b = toc.getBoundingClientRect(); if (r.top < b.top + 30 || r.bottom > b.bottom - 30) toc.scrollTop += r.top - b.top - b.height / 3; }
    if (topA && toc.scrollWidth > toc.clientWidth + 2) { const r = topA.getBoundingClientRect(), b = toc.getBoundingClientRect(); if (r.left < b.left || r.right > b.right) toc.scrollLeft += r.left - b.left - 16; }
  };
  const upd = () => {
    q = false;
    const line = Math.min(innerHeight * 0.3, 260);
    let active = null;
    for (const t of targets) { if (t.getBoundingClientRect().top - line <= 0) active = t; else break; }
    if (active === cur) return; cur = active;
    links.forEach((a) => { const on = !!active && a.getAttribute("href") === "#" + active.id; a.classList.toggle("active", on); if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    toc.querySelectorAll(":scope > ol > li").forEach((li) => li.classList.toggle("in", !!li.querySelector("a.active")));
    const a = toc.querySelector("a.active"); if (a) keepVisible(a, toc.querySelector(":scope > ol > li.in > a"));
  };
  addEventListener("scroll", () => { if (!q) { q = true; requestAnimationFrame(upd); } }, { passive: true });
  addEventListener("resize", upd);
  upd();
}
// ---- общие помощники списков: синонимы тегов, порционная отрисовка, задержка поиска ----
const TAG_ALIAS = { "агент": "агенты", "инфраструктура": "инфра", "регулирование": "регуляторика", "инструмент": "инструменты", "бенчмарк": "бенчмарки" };
function tagNorm(t) { const k = String(t || "").trim(); return TAG_ALIAS[k] || k; }
function renderChunked(list, arr, rowHtml, emptyHtml) {
  const tok = (list._drawTok = (list._drawTok || 0) + 1);
  list.innerHTML = "";
  if (!arr.length) { list.innerHTML = emptyHtml; return; }
  let i = 0;
  const step = () => {
    if (list._drawTok !== tok) return;
    const frag = document.createDocumentFragment();
    const end = Math.min(arr.length, i + (i ? 160 : 60));
    for (; i < end; i++) frag.appendChild(el(rowHtml(arr[i])));
    list.appendChild(frag);
    if (i < arr.length) setTimeout(step, 16);
  };
  step();
}
function onSearchInput(input, draw) {
  let t = 0;
  input.addEventListener("input", (e) => {
    clearTimeout(t);
    if (!e.isTrusted) { draw(input.value); return; }
    t = setTimeout(() => draw(input.value), 140);
  });
}
async function loadKb() {
  const list = document.getElementById("kb-list");
  const input = document.getElementById("kb-search");
  const filters = document.getElementById("kb-filters");
  const items = await fetch("data/kb.json", { cache: "no-cache" }).then((r) => r.json()).catch(() => []);
  let activeTag = "";
  const tags = Array.from(new Set(items.map((it) => tagNorm(it.tag)).filter(Boolean)));
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
      if (activeTag && tagNorm(it.tag) !== activeTag) return false;
      return !needle || kbHaystack(it).includes(needle);
    });
    renderChunked(list, shown, kbCardHtml, '<div class="empty">В базе этого нет.</div>');
  }
  draw("");
  if (input) onSearchInput(input, draw);
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
  const items = await fetch("data/kb.json", { cache: "no-cache" }).then((r) => r.json()).catch(() => []);
  let activeTag = "";
  let sortMode = "fresh";
  const tags = Array.from(new Set(items.map((it) => tagNorm(it.tag)).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base" }));
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
      if (activeTag && tagNorm(it.tag) !== activeTag) return false;
      return !needle || kbHaystack(it).includes(needle);
    }).sort((a, b) => compareSlovar(a, b, sortMode));
    renderChunked(list, shown, slovarRowHtml, '<div class="empty">Ничего не найдено.</div>');
  }
  draw("");
  if (input) onSearchInput(input, draw);
}
async function fetchJson(url) {
  // обычный режим кэша: Vercel отдаёт ленту с must-revalidate (свежесть та же), а <link rel="preload"> срабатывает без второй загрузки
  const r = await fetch(url);
  if (!r.ok) return [];
  return r.json();
}
function monthKey(it) {
  const d = it.date || String(it.id || "").slice(0, 10);
  return d.slice(0, 7);
}
function monthLabel(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return key;
  return ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"][Number(m[2]) - 1] + " " + m[1];
}
async function loadNovosti() {
  return loadFeed(document.getElementById("novosti-list"), { months: false, empty: '<div class="empty">Новостей пока нет.</div>' });
}
async function loadArchive() {
  return loadFeed(document.getElementById("archive-list"), { months: true, empty: '<div class="empty">Архив пока пуст.</div>' });
}
async function loadFeed(list, opts) {
  let items = [];
  try { [items] = await Promise.all([fetchJson("data/novosti.json"), feedDigestMeta()]); } catch (e) { items = []; }
  if (!Array.isArray(items) || !items.length) { list.innerHTML = opts.empty; return; }
  try { vzFeedHero(items, opts); } catch (e) {}
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const url0 = new URL(location.href);
  const months = Array.from(new Set(items.map(monthKey).filter(Boolean)));
  const st = {
    q: url0.searchParams.get("q") || "",
    slot: ["utro", "vecher"].includes(url0.searchParams.get("slot")) ? url0.searchParams.get("slot") : "",
    tag: url0.searchParams.get("tag") || "",
    month: opts.months && months.includes(url0.searchParams.get("month")) ? url0.searchParams.get("month") : "",
    deep: url0.searchParams.get("deep") === "1",
    shown: FEED_PAGE
  };
  // панель поиска и фильтров
  let tools = document.getElementById("feed-tools");
  if (!tools) { tools = document.createElement("div"); tools.id = "feed-tools"; list.before(tools); }
  tools.className = "feed-tools";
  const tagBtns = ['<button type="button" class="chip" data-tag="">Все темы</button>'].concat(FEED_TAGS.map((t) => `<button type="button" class="chip" data-tag="${escapeHtml(t)}" style="--h:${feedHue(t)}">${escapeHtml(t)}</button>`)).join("");
  const monthBtns = opts.months ? `<div class="chips feed-months" role="group" aria-label="Месяц"><button type="button" class="chip" data-month="">Все месяцы</button>${months.map((m) => `<button type="button" class="chip" data-month="${escapeHtml(m)}">${escapeHtml(monthLabel(m))}</button>`).join("")}</div>` : "";
  tools.innerHTML = `<div class="feed-search" role="search"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="search" id="feed-q" placeholder="Поиск по выпускам" aria-label="Поиск по заголовкам и кратким описаниям выпусков" autocomplete="off" enterkeyhint="search"><kbd aria-hidden="true">/</kbd></div><div class="feed-row"><div class="seg" role="group" aria-label="Время выпуска"><button type="button" data-slot="">Все</button><button type="button" data-slot="utro">Утро</button><button type="button" data-slot="vecher">Вечер</button></div><label class="feed-deep"><input type="checkbox" id="feed-deep"> искать и в тексте выпусков</label></div><div class="chips feed-tagrow" role="group" aria-label="Темы">${tagBtns}</div>${monthBtns}<p class="feed-status" id="feed-status" aria-live="polite"></p>`;
  const old = document.getElementById("archive-filters"); if (old) old.remove();
  const input = tools.querySelector("#feed-q"), deep = tools.querySelector("#feed-deep"), status = tools.querySelector("#feed-status");
  input.value = st.q; deep.checked = st.deep;
  let more = list.parentNode.querySelector(".feed-more");
  if (!more) { more = el('<button type="button" class="feed-more"></button>'); list.after(more); }
  const sync = () => {
    tools.querySelectorAll("[data-slot]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.slot === st.slot)));
    tools.querySelectorAll("[data-tag]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tag === st.tag)));
    tools.querySelectorAll("[data-month]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.month === st.month)));
    const u = new URL(location.href);
    [["q", st.q.trim()], ["slot", st.slot], ["tag", st.tag], ["month", st.month], ["deep", st.deep && st.q.trim() ? "1" : ""]].forEach(([k, v]) => { if (v) u.searchParams.set(k, v); else u.searchParams.delete(k); });
    history.replaceState(history.state, "", u);
  };
  const base = () => items.filter((it) => (!st.slot || newsSlot(it).key === st.slot) && (!st.month || monthKey(it) === st.month));
  let filtered = [], drawTok = 0;
  function matches(it, words) {
    if (st.tag) { const m = feedMetaOf(it); if (!m || !m.t.includes(st.tag)) return false; }
    if (words.length) {
      const news = feedNewsOf(it) || [];
      const hay = feedNorm([it.title, it.summary, it.topic, it.dateLabel].concat(news.map((x) => x.h + " " + (x.g || ""))).join(" ")) + (st.deep ? "\n" + (feedBodies.get(it.id) || "") : "");
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  function paintMore() {
    const left = filtered.length - st.shown;
    more.hidden = left <= 0;
    if (left > 0) { const k = Math.min(FEED_PAGE, left); more.textContent = `Показать ещё ${k} ${ruPlural(k, "выпуск", "выпуска", "выпусков")} · осталось ${left}`; }
  }
  async function draw(keepShown) {
    const tok = ++drawTok;
    sync();
    const words = feedWords(st.q);
    const scope = base();
    const needAll = st.tag ? scope.filter((it) => !feedMetaOf(it)) : [];
    const needText = st.deep && words.length ? scope.filter((it) => !feedBodies.has(it.id)) : [];
    const need = Array.from(new Set(needAll.concat(needText)));
    if (need.length) {
      status.textContent = `Загружаю выпуски для ${st.tag ? "фильтра по теме" : "поиска по тексту"}: 0 из ${need.length}…`;
      await feedLoadMany(need, (d, t) => { if (tok === drawTok) status.textContent = `Загружаю выпуски для ${st.tag ? "фильтра по теме" : "поиска по тексту"}: ${d} из ${t}…`; });
      if (tok !== drawTok) return;
    }
    // поиск идёт и по заголовкам новостей внутри выпусков: для него догружаем все месяцы указателя (немного, gzip)
    if (words.length) { await Promise.all((FEED_DIGEST.monthList || []).map(feedDigestMonth)); if (tok !== drawTok) return; }
    filtered = scope.filter((it) => matches(it, words));
    if (!keepShown) st.shown = FEED_PAGE;
    // главное в выпусках первой порции — до отрисовки, чтобы карточки не прыгали (не дольше 1,2 с)
    await Promise.race([feedEnsureMonths(filtered.slice(0, st.shown)), new Promise((r) => setTimeout(r, 1200))]);
    if (tok !== drawTok) return;
    const apply = () => {
      if (!filtered.length) {
        list.innerHTML = `<div class="empty feed-empty">Ничего не нашлось. <button type="button" class="link-btn" data-reset>Сбросить фильтры</button></div>`;
      } else {
        renderNewsDays(list, filtered.slice(0, st.shown), { words });
      }
      paintMore();
      observeCards();
    };
    if (document.startViewTransition && !reduce && list.querySelector(".news-card")) document.startViewTransition(apply); else apply();
    const filteredNote = st.q.trim() || st.tag || st.slot || st.month;
    status.textContent = filteredNote
      ? `Найдено: ${filtered.length} ${ruPlural(filtered.length, "выпуск", "выпуска", "выпусков")} из ${items.length}`
      : `Всего ${items.length} ${ruPlural(items.length, "выпуск", "выпуска", "выпусков")}`;
  }
  function feedEnsureMonths(arr) { return Promise.all(Array.from(new Set(arr.map(feedMonthOf))).map(feedDigestMonth)); }
  // чего нет в указателе (свежий выпуск до пересборки и т.п.) — догружаем сам выпуск, только для карточек на экране
  const pending = new Set(); let running = 0;
  const byId = new Map(items.map((x) => [x.id, x]));
  const pump = () => {
    while (running < 3 && pending.size) {
      const card = pending.values().next().value; pending.delete(card);
      const it = byId.get(card.dataset.id); if (!it) continue;
      running += 1;
      feedDigestMonth(feedMonthOf(it))
        .then(() => (feedMetaOf(it) && feedNewsOf(it) ? null : feedLoadOne(it)))
        .then(() => { running -= 1; paintCard(card, it); pump(); }, () => { running -= 1; pump(); });
    }
  };
  function paintCard(card, it) {
    if (!card.isConnected) return;
    const m = feedMetaOf(it), news = feedNewsOf(it), words = feedWords(st.q);
    const rt = card.querySelector(".feed-rt-box"); if (m && rt && !rt.childElementCount) rt.innerHTML = feedMetaHtml(m);
    const fn = card.querySelector(".feed-news");
    if (news && news.length && fn && !fn.childElementCount) { fn.innerHTML = feedNewsHtml(it, news, words); card.classList.add("has-news", "fn-fresh"); }
    const tg = card.querySelector(".feed-tags"); if (m && tg && !tg.childElementCount && !(news && news.length)) tg.innerHTML = m.t.map(tagChipHtml).join("");
  }
  const io = "IntersectionObserver" in window ? new IntersectionObserver((ens) => ens.forEach((en) => {
    if (!en.isIntersecting) return; io.unobserve(en.target); pending.add(en.target); pump();
  }), { rootMargin: "300px 0px" }) : null;
  function observeCards() {
    list.querySelectorAll(".feed-card").forEach((c) => {
      const it = byId.get(c.dataset.id); if (!it) return;
      if (feedMetaOf(it) && feedNewsOf(it)) return;
      if (io) io.observe(c); else { pending.add(c); pump(); }
    });
  }
  more.addEventListener("click", async () => {
    const from = st.shown; st.shown += FEED_PAGE;
    const part = filtered.slice(from, st.shown);
    more.disabled = true;
    await Promise.race([feedEnsureMonths(part), new Promise((r) => setTimeout(r, 1200))]);
    more.disabled = false;
    renderNewsDays(list, part, { append: true, words: feedWords(st.q) });
    paintMore(); observeCards();
    const first = list.querySelectorAll(".feed-card .feed-link")[from]; if (first) first.focus({ preventScroll: true });
  });
  // раскрыть остальные новости выпуска
  list.addEventListener("click", (e) => {
    const b = e.target.closest(".fn-more"); if (!b) return;
    e.preventDefault();
    const open = b.getAttribute("aria-expanded") !== "true";
    b.closest(".feed-news").querySelectorAll("li.more").forEach((li) => { li.hidden = !open; });
    b.setAttribute("aria-expanded", String(open));
    const k = Number(b.dataset.more) || 0;
    b.textContent = open ? "свернуть" : `ещё ${k} ${ruPlural(k, "новость", "новости", "новостей")}`;
  });
  // заранее подтягиваем выпуск, на который наводят или нажимают: переход открывается почти мгновенно
  const warmed = new Set();
  const warm = (e) => {
    const card = e.target.closest && e.target.closest(".feed-card"); if (!card) return;
    const id = card.dataset.id; if (!id || warmed.has(id)) return; warmed.add(id);
    const it = byId.get(id); if (it && !Array.isArray(it.body)) loadAiItem(id).catch(() => {});
  };
  list.addEventListener("pointerover", warm, { passive: true });
  list.addEventListener("touchstart", warm, { passive: true });
  list.addEventListener("focusin", warm);
  // общий заголовок карточки и выпуска для плавного перехода (View Transitions между страницами)
  list.addEventListener("click", (e) => {
    const a = e.target.closest("a.feed-link, a.fn-link"); if (!a) return;
    list.querySelectorAll(".news-head[style]").forEach((h) => h.style.removeProperty("view-transition-name"));
    const h = a.closest(".feed-card").querySelector(".news-head"); if (h) h.style.setProperty("view-transition-name", "issue-title");
  });
  addEventListener("pageshow", () => list.querySelectorAll(".news-head[style]").forEach((h) => h.style.removeProperty("view-transition-name")));
  tools.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-slot")) st.slot = b.dataset.slot;
    else if (b.hasAttribute("data-tag")) st.tag = st.tag === b.dataset.tag ? "" : b.dataset.tag;
    else if (b.hasAttribute("data-month")) st.month = b.dataset.month;
    else return;
    draw();
  });
  list.addEventListener("click", (e) => {
    if (!e.target.closest("[data-reset]")) return;
    st.q = ""; st.slot = ""; st.tag = ""; st.month = ""; input.value = ""; draw(); input.focus();
  });
  let qt = 0;
  input.addEventListener("input", () => { clearTimeout(qt); qt = setTimeout(() => { st.q = input.value; draw(); }, 160); });
  input.addEventListener("keydown", (e) => { if (e.key === "Escape" && input.value) { input.value = ""; st.q = ""; draw(); } });
  deep.addEventListener("change", () => { st.deep = deep.checked; if (st.q.trim()) draw(); else sync(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault(); input.focus(); input.select();
  });
  await draw();
}
async function loadBrief(id, kind) {
  const root = document.getElementById("brief-root");
  const wantYoutube = kind === "youtube" || (id && String(id).startsWith("yt-"));
  // выпуск ИИ или YouTube — большой briefs.json (python) не нужен
  const needPython = kind !== "ai" && kind !== "youtube";
  // выпуск ИИ: файл текста тянем сразу, параллельно с лентой (раньше — после неё)
  const itemEarly = kind === "ai" && id ? loadAiItem(id).catch(() => null) : null;
  const fetches = [
    needPython ? fetchJson("data/briefs.json") : Promise.resolve([]),
    kind === "youtube" ? Promise.resolve([]) : fetchJson("data/novosti.json")
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
    const full = await (itemEarly && brief.id === id ? itemEarly : loadAiItem(brief.id));
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
    const navBtn = (it, dir) => {
      const label = dir === "older" ? "← Предыдущий выпуск" : "Следующий выпуск →";
      return it
        ? `<a class="issue-nav-btn ${dir}" href="${briefHref(it)}" rel="${dir === "older" ? "prev" : "next"}"><small>${label}</small><span class="nav-when">${escapeHtml(dayLabel(it.date) + " \u00b7 " + newsSlot(it).label)}</span><span class="nav-title">${escapeHtml(newsHeadline(it))}</span></a>`
        : `<span class="issue-nav-btn ${dir} disabled"><small>${label}</small><span class="nav-when">${dir === "older" ? "это самый ранний" : "это самый свежий"}</span></span>`;
    };
    const pager = `<nav class="issue-nav" aria-label="Соседние выпуски">${navBtn(older, "older")}${navBtn(newer, "newer")}</nav>`;
    const topic = brief.topic && brief.topic.length <= 60 ? `<span class="issue-topic">${escapeHtml(brief.topic)}</span>` : "";
    const stats = issue && (issue.items || issue.terms)
      ? `<span class="issue-stats">${issue.items ? issue.items + " " + ruPlural(issue.items, "новость", "новости", "новостей") : ""}${issue.items && issue.terms ? " · " : ""}${issue.terms ? issue.terms + " " + ruPlural(issue.terms, "термин", "термина", "терминов") + " в словаре" : ""}</span>`
      : "";
    const share = `<button type="button" class="share-btn" data-share>Поделиться</button>`;
    const head = `<a class="back-link" href="novosti.html">← Все новости</a><header class="issue-head"><div class="issue-meta"><span class="news-slot slot-${slot.key}">${slot.label}</span><time datetime="${escapeHtml(brief.date || "")}">${escapeHtml(dayLabel(brief.date))}</time>${topic}</div><h1>${escapeHtml(newsHeadline(brief))}</h1>${issue ? "" : `<p class="issue-summary">${escapeHtml(brief.summary || "")}</p>`}<div class="issue-sub">${stats}${share}</div></header>`;
    const article = issue ? `<article class="issue">${issue.html}</article>` : `<article class="article">${renderBody(brief.body || [])}</article>`;
    root.innerHTML = `<div class="brief-layout${issue && issue.tocHtml ? " has-toc" : ""}">${issue && issue.tocHtml ? `<aside class="brief-side">${issue.tocHtml}</aside>` : ""}<div class="brief-main">${head}${article}${pager}</div></div>`;
    if (issue) setupIssueToc(root);
    // переход по ссылке «главное в выпуске» (#n3): после отрисовки докручиваем к новости
    if (location.hash.length > 1) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) requestAnimationFrame(() => { target.scrollIntoView({ block: "start" }); target.classList.add("hash-hit"); });
    }
    root.addEventListener("click", async (e) => {
      const g = e.target.closest(".gl-toggle");
      if (g) {
        const open = g.getAttribute("aria-expanded") !== "true";
        g.closest(".issue-glossary").querySelectorAll("details.gl-item").forEach((d) => { d.open = open; });
        g.setAttribute("aria-expanded", String(open)); g.textContent = open ? "Свернуть все" : "Раскрыть все";
        return;
      }
      const s = e.target.closest("[data-share]");
      if (s) {
        const url = location.origin + location.pathname.replace(/\.html$/, "") + "?id=" + encodeURIComponent(brief.id) + "&kind=ai";
        try {
          if (navigator.share) { await navigator.share({ title: document.title, url }); return; }
          await navigator.clipboard.writeText(url); s.textContent = "Ссылка скопирована ✓";
        } catch (err) { if (err && err.name === "AbortError") return; s.textContent = "Не вышло"; }
        setTimeout(() => { s.textContent = "Поделиться"; }, 1800);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "[" && older) location.href = briefHref(older);
      if (e.key === "]" && newer) location.href = briefHref(newer);
    });
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
  const items = await fetch("data/python-glossary.json", { cache: "no-cache" }).then((r) => r.json()).catch(() => []);
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
    renderChunked(list, shown, pySlovarRowHtml, '<div class="empty">Ничего не найдено.</div>');
  }
  draw("");
  if (input) onSearchInput(input, draw);
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
      fetch("data/python-deep.json", { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error("deep");
        return r.json();
      }),
      fetch("data/course-path.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : { courses: [] })).catch(() => ({ courses: [] }))
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
// файл выпуска: один запрос на страницу (повторные вызовы ждут тот же ответ); свежесть — по Cache-Control из vercel.json
const AI_ITEM_CACHE = new Map();
function loadAiItem(id) {
  if (!AI_ITEM_CACHE.has(id)) {
    const p = fetch("data/novosti/items/" + encodeURIComponent(id) + ".json").then((r) => (r.ok ? r.json() : null));
    p.catch(() => AI_ITEM_CACHE.delete(id));
    AI_ITEM_CACHE.set(id, p);
  }
  return AI_ITEM_CACHE.get(id);
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
  // тема: явный выбор (moto-theme = dark/light) важнее системной; без выбора — как в системе
  const sysDark = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  // системную тему берут только страницы, где ранний скрипт в <head> её уже учёл (data-sys="1"), иначе тяжёлая страница мигнула бы светлой
  const followSys = root.dataset.sys === "1";
  const isDark = () => { const t = raw("moto-theme", ""); return t === "dark" || (followSys && t !== "light" && !!(sysDark && sysDark.matches)); };
  if (sysDark && sysDark.addEventListener) sysDark.addEventListener("change", () => applyPrefs());
  function applyPrefs() {
    const fs = raw("moto-fs", "1"); if (fs === "1") delete root.dataset.fs; else root.dataset.fs = fs;
    const th = isDark() ? "dark" : ""; if (th === "dark") root.dataset.theme = "dark"; else delete root.dataset.theme;
    if (raw("moto-comfy", "") === "1") root.dataset.comfy = "1"; else delete root.dataset.comfy;
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = th === "dark" ? "#191d1a" : "#f3efe6";
    syncButtons();
  }
  function syncButtons() {
    const dark = isDark(), comfy = raw("moto-comfy", "") === "1", fs = +raw("moto-fs", "1");
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
    const bmKeys = new Set(getJ("moto-bm", []).map((b) => b.key)), readMap = getJ("moto-read", {});
    document.querySelectorAll("[data-bm-key]").forEach((b) => {
      const on = bmKeys.has(b.dataset.bmKey); b.setAttribute("aria-pressed", on);
      if (b.classList.contains("ux-mini")) { b.textContent = on ? "★" : "☆"; b.setAttribute("aria-label", on ? "Убрать из закладок" : "В закладки"); }
      else b.textContent = on ? "★ В закладках" : "☆ В закладки";
    });
    document.querySelectorAll("[data-read-key]").forEach((b) => {
      const on = !!readMap[b.dataset.readKey]; b.setAttribute("aria-pressed", on);
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
      else if (a === "theme") setRaw("moto-theme", isDark() ? "light" : "dark");
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
  const REVEAL = ".news-card,.feed-card,.fold-item,.issue-item,.issue-lead,.m-chapter,.put-road,.card,.kb-card,.lesson-card,.gl-item,.sp-item,.course-block,.issue-nav,.more-link";
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
  function enhance(scope, batch) {
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
    if (qa(scope, ".news-card,.put-road").length) { if (batch) batch.lists = true; else markLists(); }
    if (!batch) syncMarks();
  }
  function markLists() {
    const readMap = getJ("moto-read", {}), isRead = (k) => !!readMap[k];
    document.querySelectorAll("a.news-card, article.feed-card[data-id]").forEach((a) => {
      let id = a.dataset.id || ""; if (!id) try { id = new URL(a.href).searchParams.get("id") || ""; } catch (e) {}
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
        const batch = { lists: false };
        nodes.forEach((n) => { if (n.isConnected) enhance(n, batch); });
        if (batch.lists) markLists();
        syncMarks();
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
// ---- прокручиваемые ряды (меню, разделы выпуска, теги): помечаем, с какой стороны есть ещё ----
(function () {
  const SEL = ".site-header .nav, .issue-toc, .chips, #kb-filters, #slovar-filters, #py-slovar-filters";
  const mark = (e) => {
    const max = e.scrollWidth - e.clientWidth;
    if (max <= 2) { e.removeAttribute("data-fade"); return; }
    const l = e.scrollLeft > 2, r = e.scrollLeft < max - 2;
    const v = l && r ? "lr" : l ? "l" : r ? "r" : "";
    if (v) e.setAttribute("data-fade", v); else e.removeAttribute("data-fade");
  };
  const seen = new WeakSet();
  const scan = () => document.querySelectorAll(SEL).forEach((e) => {
    if (!seen.has(e)) { seen.add(e); e.addEventListener("scroll", () => mark(e), { passive: true }); if (window.ResizeObserver) new ResizeObserver(() => mark(e)).observe(e); }
    mark(e);
  });
  scan();
  let t = 0;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 120); }).observe(document.body, { childList: true, subtree: true });
  addEventListener("resize", scan);
})();
// ---- «Старт»: адрес / уводит на Новости (и /index.html туда же), поэтому карта контура открывается по /start ----
(function () {
  if (!/(^|\.)motomov\.ru$/.test(location.hostname)) return;
  document.querySelectorAll('a[href="index.html"]').forEach((a) => { a.setAttribute("href", "start"); });
})();

// ---- Скрытые разделы: давно не обновлялись, из меню убраны (страницы и данные на месте, открываются по прямой ссылке).
// Вернуть раздел — удалить его из списка. ----
const HIDDEN_SECTIONS = ["news", "course", "slovar-python", "youtube"];
(function () {
  const re = new RegExp("^(?:\\./|/)?(?:" + HIDDEN_SECTIONS.map((x) => x.replace(/-/g, "\\-")).join("|") + ")(?:\\.html)?(?:[?#].*)?$");
  document.querySelectorAll(".site-header .nav a, .nav-more-list a").forEach((a) => {
    if (!a.classList.contains("active") && re.test(a.getAttribute("href") || "")) a.remove();
  });
})();
// ---- Стиль визитки motomov.ru: сетка, светящиеся пятна, курсор-свечение и карусель «Главное» как у афоризмов ----
const VZ_REDUCE = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
(function () {
  const b = document.body; if (!b || !b.classList.contains("vz")) return;
  ["a", "b"].forEach((k) => { if (!b.querySelector(".bg-orb." + k)) { const o = document.createElement("div"); o.className = "bg-orb " + k; o.setAttribute("aria-hidden", "true"); b.prepend(o); } });
  if (!b.querySelector(".bg-grid")) { const g = document.createElement("div"); g.className = "bg-grid"; g.setAttribute("aria-hidden", "true"); b.prepend(g); }
  if (VZ_REDUCE || !window.matchMedia || !matchMedia("(pointer: fine)").matches) return;
  const glow = document.createElement("div"); glow.className = "cursor-glow"; glow.setAttribute("aria-hidden", "true"); b.appendChild(glow);
  let x = -999, y = -999, tx = -999, ty = -999, raf = 0;
  const loop = () => {
    x += (tx - x) * 0.12; y += (ty - y) * 0.12;
    glow.style.transform = "translate(" + (x - 120) + "px," + (y - 120) + "px)";
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; if (x < -900) { x = tx; y = ty; } if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
})();
function vzCarousel(root, opts) {
  const INTERVAL = 9000;
  root.classList.add("carousel"); root.setAttribute("aria-roledescription", "карусель");
  root.innerHTML = '<div class="progress" aria-hidden="true"></div><div class="spark-layer" aria-hidden="true"></div><div class="carousel-track" aria-live="polite"></div><div class="carousel-controls"><button type="button" class="carousel-btn" data-prev aria-label="Предыдущая новость">‹</button><div class="dots"></div><button type="button" class="carousel-btn" data-next aria-label="Следующая новость">›</button></div>';
  const track = root.querySelector(".carousel-track"), dots = root.querySelector(".dots"), progress = root.querySelector(".progress"), layer = root.querySelector(".spark-layer");
  let slides = [], index = 0, timer = 0, praf = 0, startedAt = 0, paused = false;
  function burst() {
    if (VZ_REDUCE) return;
    for (let i = 0; i < 8; i++) {
      const s = document.createElement("span"); s.className = "spark";
      s.style.left = (20 + Math.random() * 60) + "%"; s.style.top = (20 + Math.random() * 50) + "%";
      s.style.setProperty("--dx", (Math.random() * 40 - 20) + "px"); s.style.setProperty("--dy", (-20 - Math.random() * 40) + "px");
      layer.appendChild(s); setTimeout(() => s.remove(), 900);
    }
  }
  function paintDots() {
    dots.innerHTML = slides.map((_, i) => `<button type="button" class="dot" aria-label="Новость ${i + 1} из ${slides.length}"${i === index ? ' aria-current="true"' : ""}></button>`).join("");
  }
  function resetProgress() {
    if (praf) cancelAnimationFrame(praf); praf = 0;
    progress.style.transform = "scaleX(0)";
    if (VZ_REDUCE || paused || slides.length < 2) return;
    startedAt = performance.now();
    const tick = (now) => { const p = Math.min(1, (now - startedAt) / INTERVAL); progress.style.transform = "scaleX(" + p + ")"; if (p < 1) praf = requestAnimationFrame(tick); };
    praf = requestAnimationFrame(tick);
  }
  function stop() { clearInterval(timer); timer = 0; if (praf) cancelAnimationFrame(praf); praf = 0; }
  function restart() { stop(); resetProgress(); if (!VZ_REDUCE && !paused && slides.length > 1) timer = setInterval(() => go(index + 1, false), INTERVAL); }
  function go(next, user) {
    if (!slides.length) return;
    const nodes = track.children, prev = index;
    index = (next + slides.length) % slides.length;
    Array.from(nodes).forEach((n, i) => {
      n.classList.remove("is-active", "is-leaving");
      if (i === index) n.classList.add("is-active");
      else if (i === prev && !VZ_REDUCE && prev !== index) n.classList.add("is-leaving");
      n.setAttribute("aria-hidden", String(i !== index)); n.querySelectorAll("a").forEach((a) => { a.tabIndex = i === index ? 0 : -1; });
    });
    paintDots();
    root.classList.remove("flash"); void root.offsetWidth; root.classList.add("flash");
    burst();
    if (user) restart(); else resetProgress();
  }
  function set(list, pop) {
    slides = list; index = 0;
    track.innerHTML = list.map((x, i) => `<div class="carousel-item${i === 0 ? " is-active" : ""}"${i ? ' aria-hidden="true"' : ""}>${x}</div>`).join("");
    track.querySelectorAll(".carousel-item:not(.is-active) a").forEach((a) => { a.tabIndex = -1; });
    root.querySelector(".carousel-controls").hidden = list.length < 2;
    paintDots();
    if (pop && !VZ_REDUCE) { root.classList.add("reshuffled"); setTimeout(() => root.classList.remove("reshuffled"), 700); burst(); }
    restart();
  }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || !root.contains(b)) return;
    if (b.hasAttribute("data-prev")) go(index - 1, true);
    else if (b.hasAttribute("data-next")) go(index + 1, true);
    else if (b.classList.contains("dot")) go(Array.from(dots.children).indexOf(b), true);
  });
  root.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(index - 1, true); else if (e.key === "ArrowRight") go(index + 1, true); });
  const hold = (v) => { paused = v; if (v) stop(); else restart(); };
  root.addEventListener("mouseenter", () => hold(true)); root.addEventListener("mouseleave", () => hold(false));
  root.addEventListener("focusin", () => hold(true)); root.addEventListener("focusout", (e) => { if (!root.contains(e.relatedTarget)) hold(false); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else if (!paused) restart(); });
  // свайп на телефоне
  let sx = null;
  root.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  root.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1), true); }, { passive: true });
  return { set };
}
function vzSlideHtml(it, n) {
  const tags = (n.t || []).slice(0, 3).map((t) => tagChipHtml(feedTag(t))).join("");
  const href = briefHref(it) + "#" + encodeURIComponent(n.a || "");
  return `<blockquote><p class="vz-kicker">${escapeHtml(it.dateLabel || it.date || "")}${tags ? ` <span class="vz-tags">${tags}</span>` : ""}</p><p class="vz-head"><a href="${escapeHtml(href)}">${escapeHtml(n.h)}</a></p>${n.g ? `<p class="vz-gist">${escapeHtml(n.g)}</p>` : ""}</blockquote>`;
}
async function vzNewsFor(it) {
  await feedDigestMonth(feedMonthOf(it));
  let news = feedMetaOf(it) ? feedNewsOf(it) : null;
  if (!news || !news.length) { try { await feedLoadOne(it); } catch (e) {} news = feedNewsOf(it); }
  return news || [];
}
async function vzFeedHero(items, opts) {
  const host = document.getElementById("vz-hero"); if (!host) return;
  const box = host.querySelector("[data-vz-carousel]"), btn = host.querySelector("[data-vz-more]");
  const car = vzCarousel(box);
  const ai = items.filter((x) => x.kind === "ai");
  let pos = 0;
  const pickIndex = () => (opts.months ? Math.floor(Math.random() * ai.length) : pos);
  async function show(pop) {
    for (let tries = 0; tries < 4; tries++) {
      const i = pickIndex(), it = ai[i]; if (!it) return;
      const news = await vzNewsFor(it);
      if (news.length) {
        car.set(news.slice(0, 7).map((n) => vzSlideHtml(it, n)), pop);
        const lab = host.querySelector("[data-vz-label]"); if (lab) lab.textContent = it.dateLabel || "";
        return;
      }
      pos = (pos + 1) % ai.length;
    }
    host.hidden = true;
  }
  if (btn) btn.addEventListener("click", () => { pos = (pos + 1) % ai.length; show(true); });
  await show(false);
}

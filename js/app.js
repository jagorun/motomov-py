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
})();
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function renderBody(parts) {
  return parts.map((block) => {
    if (block.startsWith("```")) {
      const inner = block.replace(/^```\n?/, "").replace(/\n?```$/, "");
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = inner;
      pre.appendChild(code);
      return pre.outerHTML;
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

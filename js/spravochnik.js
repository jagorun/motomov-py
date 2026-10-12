(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const inl = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>");
  const slug = (s) => s.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  fetch("data/spravochnik.json?v=" + Date.now().toString().slice(0, 7)).then((r) => r.json()).then(render)
    .catch(() => { $("sp-root").innerHTML = '<div class="empty">Не удалось загрузить справочник.</div>'; });

  function render(data) {
    const byG = {};
    data.entries.forEach((e) => (byG[e.group] = byG[e.group] || []).push(e));
    const groups = data.groups.filter((g) => byG[g.id]);
    $("sp-root").innerHTML = groups.map((g) => `<section class="sp-group" id="g-${g.id}"><h2>${esc(g.title)}</h2><p class="sp-hint">${inl(g.hint)}</p>${
      byG[g.id].map((e) => {
        const id = "e-" + slug(e.name);
        const hay = (e.name + " " + e.sig + " " + e.text + " " + e.note + " " + g.title).toLowerCase();
        return `<details class="sp-item" id="${id}" data-hay="${esc(hay)}"><summary><code class="sp-name">${esc(e.name)}</code><span class="sp-short">${esc(e.text.split(/(?<=[.!?])\s/)[0])}</span></summary><div class="sp-body">
<pre class="sp-sig"><code class="lang-text">${esc(e.sig)}</code></pre>
<p>${inl(e.text)}</p>
<div class="sp-label">Пример</div><pre><code class="lang-python">${esc(e.code)}</code></pre>
${e.out ? `<div class="sp-label">Вывод</div><pre class="sp-out"><code class="lang-text">${esc(e.out)}</code></pre>` : ""}
${e.note ? `<p class="sp-note"><b>Не путать:</b> ${inl(e.note)}</p>` : ""}
<p class="sp-doc"><a href="${esc(e.url)}" target="_blank" rel="noopener">Официальная документация ↗</a></p></div></details>`;
      }).join("")}</section>`).join("");
    const toc = groups.map((g) => `<li><a href="#g-${g.id}">${esc(g.title)}</a> <small>${byG[g.id].length}</small></li>`).join("");
    $("sp-toc").innerHTML = toc; $("sp-panel").innerHTML = toc;
    if (window.motoHighlight) window.motoHighlight($("sp-root"));
    $("sp-count").textContent = data.entries.length + " статей";
    setupSearch(data.entries.length); setupNav(groups);
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) { if (t.tagName === "DETAILS") t.open = true; t.scrollIntoView(); } }
  }

  function setupSearch(total) {
    const q = $("sp-q"), items = [...document.querySelectorAll(".sp-item")], secs = [...document.querySelectorAll(".sp-group")];
    q.addEventListener("input", () => {
      const words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      let n = 0;
      items.forEach((it) => { const ok = words.every((w) => it.dataset.hay.includes(w)); it.hidden = !ok; if (ok) n++; it.open = ok && words.length > 0 && n <= 3; });
      secs.forEach((s) => (s.hidden = !s.querySelector(".sp-item:not([hidden])")));
      $("sp-count").textContent = words.length ? `найдено: ${n}` : total + " статей";
    });
  }

  function setupNav(groups) {
    const fab = $("m-fab"), panel = $("m-panel"), sec = $("m-sec");
    const setPanel = (o) => { panel.hidden = !o; sec.setAttribute("aria-expanded", o); };
    sec.onclick = () => setPanel(panel.hidden); $("m-pclose").onclick = () => setPanel(false);
    $("m-top").onclick = () => { setPanel(false); const t = $("m-toc"); t.open = true; t.scrollIntoView({ behavior: "smooth" }); };
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setPanel(false); });
    panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setPanel(false)));
    const heads = groups.map((g) => $("g-" + g.id));
    const onScroll = () => {
      fab.hidden = scrollY < 600; let cur = null;
      for (const h of heads) { if (h.hidden) continue; if (h.getBoundingClientRect().top < 140) cur = h.id; else break; }
      panel.querySelectorAll("a").forEach((a) => a.classList.toggle("cur", a.getAttribute("href") === "#" + cur));
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }
})();

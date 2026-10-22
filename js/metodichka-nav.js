/* Методичка: поиск, ссылки на термины, возврат к месту чтения.
   Работает поверх metodichka.html (scripts/build_metodichka.py). Тексты не меняет. */
(function () {
  "use strict";
  if (!document.querySelector(".m-chapter")) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var TERMS = {}; try { TERMS = JSON.parse(($("#m-terms") || {}).textContent || "{}"); } catch (e) {}
  var coarse = matchMedia("(hover: none), (pointer: coarse)").matches;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BLOCK = "p,li,td,th,pre,h3,h4,h5,h6,summary,blockquote,.m-anchor";
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, "е"); }
  function mk(h) { var d = document.createElement("div"); d.innerHTML = h.trim(); return d.firstChild; }

  /* ---------- раскрыть главу и «Решение», где лежит элемент ---------- */
  function openTo(el) { for (var p = el; p; p = p.parentElement) if (p.tagName === "DETAILS" && !p.open) p.open = true; }
  function flash(el) {
    if (!el) return; if (el.classList.contains("m-anchor")) el = el.nextElementSibling || el.parentElement;
    el.classList.remove("m-flash"); void el.offsetWidth; el.classList.add("m-flash");
    setTimeout(function () { el.classList.remove("m-flash"); }, 1800);
  }
  /* ---------- раздел, к которому относится элемент (для подписи «вернуться к …») ---------- */
  var HEADS = null;
  function heads() { return HEADS || (HEADS = $$(".m-chapter > summary h2, .m-body h3, .m-body h4, .m-body h5")); }
  function sectionOf(el) {
    var best = null, hs = heads();
    for (var i = 0; i < hs.length; i++) {
      var pos = hs[i].compareDocumentPosition(el);
      if (hs[i] === el || (pos & Node.DOCUMENT_POSITION_FOLLOWING) || (pos & Node.DOCUMENT_POSITION_CONTAINED_BY)) best = hs[i]; else break;
    }
    return best ? best.textContent.replace(/\s+/g, " ").trim() : "";
  }
  function short(s, n) { s = s || ""; return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  /* ---------- блоки: по номеру находим место чтения даже после перезагрузки ---------- */
  var BLOCKS = null;
  function blocks() { return BLOCKS || (BLOCKS = $$(".m-chapter > summary, .m-body :is(" + BLOCK + ")")); }
  function blockOf(el) { var b = el && el.closest && el.closest(BLOCK); return b && b.closest(".m-chapter") ? b : (el && el.closest && el.closest(".m-chapter > summary")); }
  function visibleBlock() {
    var x = Math.min(innerWidth - 24, Math.max(24, ($(".m-chapter") || document.body).getBoundingClientRect().left + 40));
    var hdr = $(".site-header"), top = hdr ? hdr.getBoundingClientRect().bottom + 12 : 80;
    for (var y = top; y < innerHeight * 0.6; y += 24) {
      var el = document.elementFromPoint(x, y), b = el && blockOf(el);
      if (b) return b;
    }
    return null;
  }
  function savePlace(fromEl) {
    var b = (fromEl && blockOf(fromEl)) || visibleBlock();
    var st = Object.assign({}, history.state || {});
    st.mb = b ? blocks().indexOf(b) : -1; st.mt = b ? Math.round(b.getBoundingClientRect().top) : 0;
    st.my = Math.round(scrollY); st.ml = b ? short(sectionOf(b), 60) : "";
    history.replaceState(st, "", location.href);
  }
  function jump(y) { try { scrollTo({ top: y, behavior: "instant" }); } catch (e) { scrollTo(0, y); } }
  function restorePlace(st) {
    var b = st.mb >= 0 ? blocks()[st.mb] : null;
    if (b) { openTo(b); jump(b.getBoundingClientRect().top + scrollY - st.mt); flash(b); }
    else if (typeof st.my === "number") jump(st.my);
  }

  /* ---------- переход по внутренней ссылке с запоминанием места ---------- */
  function go(target, opts) {
    opts = opts || {};
    var el = typeof target === "string" ? document.getElementById(target) : target;
    if (!el) return false;
    hideCard();
    savePlace(opts.from);
    var depth = ((history.state && history.state.md) || 0) + 1;
    var hid = el.id || "";
    history.pushState({ md: depth }, "", hid ? "#" + encodeURIComponent(hid) : location.href);
    openTo(el);
    if (opts.words) markWords(el.classList.contains("m-anchor") ? el.parentElement : el, opts.words);
    requestAnimationFrame(function () {
      el.scrollIntoView({ block: opts.center ? "center" : "start", behavior: "instant" });
      flash(el); showBack();
    });
    return true;
  }
  addEventListener("popstate", function (e) {
    var st = e.state || {};
    hideCard();
    if (typeof st.mb === "number" || typeof st.my === "number") { restorePlace(st); requestAnimationFrame(function () { restorePlace(st); }); }
    else { var h = decodeURIComponent(location.hash.slice(1)), el = h && document.getElementById(h); if (el) { openTo(el); el.scrollIntoView({ behavior: "instant" }); } }
    showBack();
  });

  /* ---------- кнопка «← Вернуться к чтению» ---------- */
  var back = mk('<button type="button" class="m-back" id="m-back" hidden><span class="m-back-a">← Вернуться к чтению</span><small></small></button>');
  document.body.appendChild(back);
  function showBack() {
    var st = history.state || {}, d = st.md || 0;
    if (!d) { back.hidden = true; return; }
    var prev = st.mfrom || "";
    back.querySelector("small").textContent = prev ? "к «" + prev + "»" + (d > 1 ? " · ещё " + (d - 1) : "") : (d > 1 ? "шагов назад: " + d : "");
    back.hidden = false;
  }
  back.addEventListener("click", function () { history.back(); });
  /* подпись: откуда пришли — запоминаем в новой записи истории */
  var _push = go;
  go = function (target, opts) {
    var b = (opts && opts.from && blockOf(opts.from)) || visibleBlock();
    var label = b ? short(sectionOf(b), 48) : "";
    var ok = _push(target, opts);
    if (ok) { var st = Object.assign({}, history.state || {}); st.mfrom = label; history.replaceState(st, "", location.href); showBack(); }
    return ok;
  };

  /* ---------- клики по внутренним ссылкам методички ---------- */
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || !a.closest(".m-chapter, .m-toc, .m-panel, .m-card")) return;
    var id = decodeURIComponent(a.getAttribute("href").slice(1)); if (!id) return;
    var el = document.getElementById(id); if (!el) return;
    if (a.classList.contains("m-term") && coarse && !a.closest(".m-card")) { e.preventDefault(); showCard(a, true); return; }
    e.preventDefault();
    var inText = a.closest(".m-body");
    go(el, { from: inText ? a : null });
  });

  /* ---------- карточка термина: наведение (ПК) или нажатие (телефон) ---------- */
  var card = mk('<div class="m-card" id="m-card" role="dialog" aria-label="Термин" hidden></div>');
  document.body.appendChild(card);
  var cardFor = null, showT = 0, hideT = 0;
  function showCard(a, sheet) {
    var t = TERMS[a.dataset.t]; if (!t) return;
    cardFor = a;
    card.innerHTML = '<button type="button" class="m-card-x" aria-label="Закрыть">✕</button>' +
      '<div class="m-card-h"><code>' + esc(t.n) + '</code></div>' +
      (t.s ? '<div class="m-card-st">' + esc(t.s) + (t.l ? " · " + esc(t.l) : "") + "</div>" : "") +
      '<div class="m-card-d">' + t.d + "</div>" +
      '<div class="m-card-b"><button type="button" class="m-card-go" data-a="open">Открыть объяснение →</button></div>';
    card.hidden = false;
    if (sheet || innerWidth < 700) { card.classList.add("sheet"); card.style.left = card.style.top = ""; }
    else {
      card.classList.remove("sheet");
      var r = a.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight;
      var left = Math.min(innerWidth - w - 12, Math.max(12, r.left)), top = r.bottom + 8;
      if (top + h > innerHeight - 12) top = r.top - h - 8;
      card.style.left = left + scrollX + "px"; card.style.top = top + scrollY + "px";
    }
  }
  function hideCard() { card.hidden = true; cardFor = null; }
  card.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.classList.contains("m-card-x")) { hideCard(); return; }
    var a = cardFor, t = a && TERMS[a.dataset.t];
    if (b.dataset.a === "open" && t && t.m) go(t.m, { from: a });
  });
  if (!coarse) {
    document.addEventListener("mouseover", function (e) {
      var a = e.target.closest && e.target.closest("a.m-term"); if (!a) return;
      clearTimeout(hideT); clearTimeout(showT); showT = setTimeout(function () { showCard(a, false); }, 260);
    });
    document.addEventListener("mouseout", function (e) {
      var a = e.target.closest && e.target.closest("a.m-term"); if (!a) return;
      clearTimeout(showT); hideT = setTimeout(hideCard, 380);
    });
    card.addEventListener("mouseenter", function () { clearTimeout(hideT); });
    card.addEventListener("mouseleave", function () { hideT = setTimeout(hideCard, 300); });
  }
  document.addEventListener("click", function (e) { if (!card.hidden && !card.contains(e.target) && !e.target.closest("a.m-term")) hideCard(); }, true);

  /* ---------- длинные «Состав раздела»: свернуть до 8 пунктов ---------- */
  $$(".m-navbox").forEach(function (box) {
    var n = $$("li", box).length; if (n <= 10) return;
    box.classList.add("m-navbox-cut");
    var b = mk('<button type="button" class="m-navbox-more">Показать весь состав (' + n + ")</button>");
    b.addEventListener("click", function () { var cut = box.classList.toggle("m-navbox-cut"); b.textContent = cut ? "Показать весь состав (" + n + ")" : "Свернуть состав"; });
    box.appendChild(b);
  });

  /* ---------- поиск ---------- */
  var ov = mk('<div class="m-search" id="m-search" role="dialog" aria-modal="true" aria-label="Поиск по методичке" hidden>' +
    '<div class="m-search-box"><div class="m-search-head"><input type="search" id="m-q" placeholder="Слово, метод, термин: monotonic, срез, дедлайн…" autocomplete="off" enterkeyhint="search" aria-label="Что найти">' +
    '<button type="button" class="m-search-x" aria-label="Закрыть поиск">✕</button></div>' +
    '<div class="m-search-hint">Ищу по всем главам, включая свёрнутые «Решения». Enter — первый результат, Esc — закрыть.</div>' +
    '<div class="m-res" id="m-res"></div></div></div>');
  document.body.appendChild(ov);
  var q = $("#m-q", ov), res = $("#m-res", ov), IDX = null, KB = null, items = [], sel = -1, opener = null;
  function buildIdx() {
    if (IDX) return IDX; IDX = [];
    $$(".m-body :is(p,li,td,th,pre,summary,blockquote,h3,h4,h5,h6)").forEach(function (el) {
      if (el.closest(".m-navbox,.m-index")) return;
      if (el.tagName === "LI" && el.querySelector("li,p")) return;
      if (el.tagName === "P" && el.closest("li,blockquote,td")) return;
      if (el.tagName === "BLOCKQUOTE" && el.querySelector("p")) return;
      var raw = (el.tagName === "PRE" ? el.textContent : el.textContent).replace(/\s+/g, " ").trim();
      if (raw.length < 2) return;
      IDX.push({ el: el, raw: raw, t: norm(raw), h: /^H\d$/.test(el.tagName) });
    });
    return IDX;
  }
  function loadKb() {
    if (KB) return; KB = [];
    fetch("data/kb.json").then(function (r) { return r.json(); }).then(function (d) { KB = (d || []).map(function (x) { return { n: x.title || "", d: x.what || "", t: norm((x.title || "") + " " + (x.what || "")) }; }); if (!ov.hidden && q.value.trim()) search(q.value); }).catch(function () {});
  }
  function words(s) { return norm(s).split(/[\s,;]+/).filter(function (w) { return w.length > 1 || /\d/.test(w); }).slice(0, 6); }
  function hlStr(s, ws) {
    var low = norm(s), marks = [];
    ws.forEach(function (w) { var i = 0; while ((i = low.indexOf(w, i)) >= 0) { marks.push([i, i + w.length]); i += w.length; } });
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var out = "", pos = 0;
    marks.forEach(function (m) { if (m[0] < pos) return; out += esc(s.slice(pos, m[0])) + "<mark>" + esc(s.slice(m[0], m[1])) + "</mark>"; pos = m[1]; });
    return out + esc(s.slice(pos));
  }
  function snip(raw, t, ws) {
    var first = Infinity; ws.forEach(function (w) { var i = t.indexOf(w); if (i >= 0 && i < first) first = i; });
    var a = Math.max(0, first - 60), b = Math.min(raw.length, first + 140);
    return hlStr((a > 0 ? "…" : "") + raw.slice(a, b) + (b < raw.length ? "…" : ""), ws);
  }
  function search(s) {
    var ws = words(s); items = []; sel = -1;
    if (!ws.length) { res.innerHTML = ""; return; }
    buildIdx();
    var all = function (t) { for (var i = 0; i < ws.length; i++) if (t.indexOf(ws[i]) < 0) return false; return true; };
    var html = "";
    var add = function (target, inner, wantWords, href) {
      items.push({ target: target, words: wantWords, href: href });
      html += '<a class="m-r" href="' + (href || "#") + '"' + (href ? ' target="_blank" rel="noopener"' : "") + ' data-i="' + (items.length - 1) + '">' + inner + "</a>";
    };
    var th = [];
    for (var k in TERMS) { var t = TERMS[k]; if (all(norm(t.n))) th.push(t); }
    if (th.length < 3) for (var k2 in TERMS) { var t2 = TERMS[k2]; if (th.indexOf(t2) < 0 && all(norm(t2.n + " " + t2.d.replace(/<[^>]+>/g, "")))) th.push(t2); }
    if (th.length) {
      html += '<div class="m-grp">Термины</div>';
      th.slice(0, 8).forEach(function (t) { add(t.m, '<b>' + hlStr(t.n, ws) + "</b> — " + esc(t.d.replace(/<[^>]+>/g, "")) + (t.l ? '<span class="m-w">' + esc(t.l) + "</span>" : ""), null); });
    }
    var hh = [], ph = [];
    IDX.forEach(function (it) {
      if (!all(it.t)) return;
      if (it.h) { hh.push(it); return; }
      var sc = 0; ws.forEach(function (w) { var i = -1, c = 0; while ((i = it.t.indexOf(w, i + 1)) >= 0 && c < 5) c++; sc += c; });
      if (it.el.tagName === "PRE") sc -= 2; if (it.raw.length > 1500) sc -= 1;
      ph.push([sc, it]);
    });
    if (hh.length) { html += '<div class="m-grp">Разделы</div>'; hh.slice(0, 10).forEach(function (it) { add(it.el, hlStr(it.raw, ws), ws); }); }
    ph.sort(function (a, b) { return b[0] - a[0]; });
    html += '<div class="m-grp">В тексте' + (ph.length ? " · " + ph.length + (ph.length > 50 ? ", показаны 50" : "") : "") + "</div>";
    if (!ph.length) html += '<div class="m-none">В тексте не нашлось. Попробуйте начало слова или другое слово.</div>';
    ph.slice(0, 50).forEach(function (p) { var it = p[1]; add(it.el, '<span class="m-w">' + esc(short(sectionOf(it.el), 70)) + "</span>" + snip(it.raw, it.t, ws), ws); });
    if (KB && KB.length) {
      var kh = KB.filter(function (x) { return all(x.t); }).slice(0, 5);
      if (kh.length) { html += '<div class="m-grp">В Словаре сайта</div>'; kh.forEach(function (x) { add(null, "<b>" + hlStr(x.n, ws) + "</b> — " + esc(short(x.d, 140)) + '<span class="m-w">откроется в новой вкладке</span>', null, "slovar.html#t=" + encodeURIComponent(x.n)); }); }
    }
    res.innerHTML = html;
  }
  function openSearch() {
    opener = document.activeElement; hideCard();
    ov.hidden = false; document.documentElement.classList.add("m-search-on");
    loadKb(); setTimeout(function () { q.focus(); q.select(); }, 30);
    if (q.value.trim()) search(q.value);
  }
  function closeSearch() { if (ov.hidden) return; ov.hidden = true; document.documentElement.classList.remove("m-search-on"); if (opener && opener.focus) opener.focus(); }
  var qT = 0;
  q.addEventListener("input", function () { clearTimeout(qT); qT = setTimeout(function () { search(q.value); }, 150); });
  q.addEventListener("keydown", function (e) {
    var rs = $$(".m-r", res);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, Math.min(rs.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))); rs.forEach(function (r, i) { r.classList.toggle("sel", i === sel); }); if (rs[sel]) rs[sel].scrollIntoView({ block: "nearest" }); }
    if (e.key === "Enter") { e.preventDefault(); clearTimeout(qT); search(q.value); var r = $$(".m-r", res)[Math.max(0, sel)]; if (r) r.click(); }
  });
  res.addEventListener("click", function (e) {
    var r = e.target.closest(".m-r"); if (!r) return;
    var it = items[+r.dataset.i]; if (!it || it.href) return;
    e.preventDefault(); closeSearch();
    go(it.target, { words: it.words, center: typeof it.target !== "string" });
  });
  $(".m-search-x", ov).addEventListener("click", closeSearch);
  ov.addEventListener("click", function (e) { if (e.target === ov) closeSearch(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { hideCard(); closeSearch(); return; }
    var typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "");
    if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && (e.key || "").toLowerCase() === "k")) { e.preventDefault(); openSearch(); }
  });
  ["m-sbtn", "m-sfab"].forEach(function (id) { var b = document.getElementById(id); if (b) b.addEventListener("click", openSearch); });

  /* ---------- подсветка найденных слов в тексте ---------- */
  var marked = [];
  function clearMarks() { marked.forEach(function (m) { var p = m.parentNode; if (p) { p.replaceChild(document.createTextNode(m.textContent), m); p.normalize(); } }); marked = []; }
  function markWords(el, ws) {
    clearMarks(); if (!el || !ws || !ws.length) return;
    var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (tw.nextNode()) if (!tw.currentNode.parentNode.closest(".ux-copy,button")) nodes.push(tw.currentNode);
    nodes.forEach(function (n) {
      var s = n.textContent, low = norm(s), ms = [];
      ws.forEach(function (w) { var i = 0; while ((i = low.indexOf(w, i)) >= 0) { ms.push([i, i + w.length]); i += w.length; } });
      if (!ms.length) return; ms.sort(function (a, b) { return a[0] - b[0]; });
      var f = document.createDocumentFragment(), pos = 0;
      ms.forEach(function (m) { if (m[0] < pos) return; f.appendChild(document.createTextNode(s.slice(pos, m[0]))); var k = document.createElement("mark"); k.className = "m-hit"; k.textContent = s.slice(m[0], m[1]); f.appendChild(k); marked.push(k); pos = m[1]; });
      f.appendChild(document.createTextNode(s.slice(pos))); n.parentNode.replaceChild(f, n);
    });
  }

  /* ---------- старт ---------- */
  showBack();
  window.__mnav = { go: go, search: search, openSearch: openSearch };
})();

(async function () {
  const lessonRoot = document.getElementById("lesson-root");
  if (!lessonRoot || typeof paintLesson !== "function") return;
  const files = [
    "data/lessons/00-setup.json",
    "data/lessons/01-basics.json",
    "data/lessons/02-functions-files.json",
    "data/lessons/03-json-search.json",
    "data/lessons/04-rag.json",
    "data/lessons/05-site.json"
  ];
  const parts = await Promise.all(files.map(async (url) => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }));
  const lessons = parts.flat().filter((l) => l && l.id);
  if (!lessons.length) return;
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const i = Math.max(0, lessons.findIndex((l) => l.id === id));
  const lesson = lessons[i] || lessons[0];
  document.title = lesson.title + " · py.motomov.ru";
  paintLesson(lessonRoot, lesson, lessons, i, params.get("tab"));
})();

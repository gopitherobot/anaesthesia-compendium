(async function () {
  document.getElementById("hdr").innerHTML = AC.header("library", null);
  document.getElementById("warn").innerHTML = AC.mediaWarning();
  document.getElementById("yr").textContent = new Date().getFullYear();

  let topics = [];
  try { topics = await AC.loadIndex(); }
  catch (e) { document.getElementById("grid").innerHTML =
    `<div class="empty">Could not load library (${AC.esc(e.message)}).</div>`; return; }

  document.getElementById("st-count").textContent = topics.length;
  document.getElementById("st-q").textContent =
    topics.reduce((a, t) => a + (t.questionCount || 0), 0);

  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  let sec = "all", term = "";

  const row = (t) => {
    return `<div class="trow" data-title="${AC.esc(t.title.toLowerCase())}" data-sec="${t.section}">
      <span class="tnum">${t.id}</span>
      <span class="tmain">
        <span class="ttitle"><a href="listen.html?id=${t.id}">${AC.esc(t.title)}</a></span>
        <span class="tmeta"><span class="tsec">${t.section}</span>${t.durationText || ""} · ${t.questionCount} questions</span>
      </span>
      <span class="tmodes">
        <a href="listen.html?id=${t.id}">Listen</a>
        <a href="watch.html?id=${t.id}">Watch</a>
        <a href="read.html?id=${t.id}">Read</a>
      </span>
    </div>`;
  };

  grid.innerHTML = topics.map(row).join("");

  const apply = () => {
    let shown = 0;
    grid.querySelectorAll(".trow").forEach(el => {
      const okSec = sec === "all" || el.dataset.sec === sec;
      const okTerm = !term || el.dataset.title.includes(term);
      const vis = okSec && okTerm;
      el.classList.toggle("hide", !vis);
      if (vis) shown++;
    });
    empty.classList.toggle("hide", shown !== 0);
  };

  document.getElementById("q").addEventListener("input", e => {
    term = e.target.value.trim().toLowerCase(); apply();
  });
  document.querySelectorAll(".chip").forEach(c =>
    c.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(x => x.classList.remove("is-active"));
      c.classList.add("is-active"); sec = c.dataset.sec; apply();
    }));
})();

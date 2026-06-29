(async function () {
  document.getElementById("hdr").innerHTML = AC.header("library", null);
  const yr = document.getElementById("yr"); if (yr) yr.textContent = new Date().getFullYear();

  let topics = [];
  try { topics = await AC.loadIndex(); }
  catch (e) {
    document.getElementById("grid").innerHTML =
      `<div class="empty">Could not load library (${AC.esc(e.message)}).</div>`; return;
  }

  const cnt = document.getElementById("libcount"); if (cnt) cnt.textContent = topics.length;

  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const row = (t) => `<div class="trow" data-title="${AC.esc(t.title.toLowerCase())}" data-sec="${t.section}">
      <span class="tnum">${t.id}</span>
      <span class="tmain">
        <span class="ttitle"><a href="read.html?id=${t.id}">${AC.esc(t.title)}</a></span>
        <span class="tmeta"><span class="tsec">${t.section}</span>${t.durationText || ""} · ${t.questionCount} questions</span>
      </span>
      <span class="tmodes">
        <a href="read.html?id=${t.id}">Read</a>
        <a href="listen.html?id=${t.id}">Listen</a>
        <a href="watch.html?id=${t.id}">Watch</a>
      </span>
    </div>`;
  grid.innerHTML = topics.map(row).join("");

  // search + section filter
  let sec = "all", term = "";
  const apply = () => {
    let shown = 0;
    grid.querySelectorAll(".trow").forEach(el => {
      const ok = (sec === "all" || el.dataset.sec === sec) && (!term || el.dataset.title.includes(term));
      el.classList.toggle("hide", !ok); if (ok) shown++;
    });
    empty.classList.toggle("hide", shown !== 0);
  };
  document.getElementById("q").addEventListener("input", e => { term = e.target.value.trim().toLowerCase(); apply(); });
  document.querySelectorAll(".chip").forEach(c =>
    c.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(x => x.classList.remove("is-active"));
      c.classList.add("is-active"); sec = c.dataset.sec; apply();
    }));
})();

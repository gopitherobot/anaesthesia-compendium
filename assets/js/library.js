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

  const card = (t) => {
    const cover = t.cover
      ? `<img loading="lazy" src="${t.cover}" alt="">`
      : `<div style="display:grid;place-items:center;height:100%;color:var(--faint)">${t.id}</div>`;
    return `<article class="card" data-title="${AC.esc(t.title.toLowerCase())}" data-sec="${t.section}">
      <a class="thumb" href="listen.html?id=${t.id}">
        ${cover}
        <span class="num">#${t.id}</span>
        <span class="sect">${t.section}</span>
      </a>
      <div class="body">
        <h3><a href="listen.html?id=${t.id}">${AC.esc(t.title)}</a></h3>
        <div class="meta"><span>▶ ${t.durationText || ""}</span><span>${t.questionCount} questions</span></div>
      </div>
      <div class="acts">
        <a href="listen.html?id=${t.id}">Listen</a>
        <a href="watch.html?id=${t.id}">Watch</a>
        <a href="read.html?id=${t.id}">Read</a>
      </div>
    </article>`;
  };

  grid.innerHTML = topics.map(card).join("");

  const apply = () => {
    let shown = 0;
    grid.querySelectorAll(".card").forEach(el => {
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

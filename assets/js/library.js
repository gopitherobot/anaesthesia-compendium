(async function () {
  document.getElementById("hdr").innerHTML = AC.header("library", null);
  const yr = document.getElementById("yr"); if (yr) yr.textContent = new Date().getFullYear();

  // ---- subscribe buttons ----
  const sub = window.SITE.subscribeURL();
  document.querySelectorAll(".subscribe-btn").forEach(b => {
    if (sub) { b.href = sub; b.target = "_blank"; b.rel = "noopener"; }
  });

  let topics = [];
  try { topics = await AC.loadIndex(); }
  catch (e) {
    document.getElementById("grid").innerHTML =
      `<div class="empty">Could not load library (${AC.esc(e.message)}).</div>`; return;
  }

  // ---- real stat values ----
  const totalMin = topics.reduce((a, t) => {
    const p = (t.durationText || "0:0").split(":").map(Number);
    return a + (p[0] || 0) + (p[1] || 0) / 60;
  }, 0);
  const setCount = (sel, val) => { const el = document.querySelector(sel); if (el) el.dataset.count = val; };
  setCount('[data-count="87"]', topics.length);
  setCount('[data-count="2660"]', topics.reduce((a, t) => a + (t.questionCount || 0), 0));
  const hoursEl = document.getElementById("hours"); if (hoursEl) hoursEl.dataset.count = Math.round(totalMin / 60);

  // ---- library rows (Read · Listen · Watch) ----
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

  // ---- search + section filter ----
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

  // ---- count-up animation ----
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const fmt = n => n.toLocaleString("en-US");
  function countUp(el) {
    const target = +el.dataset.count || 0, dur = 1300, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(Math.round(easeOut(p) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // guarantee the final value even if rAF is paused (e.g. background tab)
    setTimeout(() => { el.textContent = fmt(target); }, dur + 250);
  }

  // numbers animate on load (stats sit in the hero, always seen first)
  document.querySelectorAll("#stats [data-count]").forEach(countUp);

  // ---- scroll reveal (with safety so content never stays hidden) ----
  document.body.classList.add("reveal-armed");
  const reveals = [...document.querySelectorAll(".reveal")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(el => io.observe(el));
    // fallback: anything still hidden shortly after load gets revealed anyway
    setTimeout(() => reveals.forEach(el => el.classList.add("in")), 800);
  } else {
    reveals.forEach(el => el.classList.add("in"));
  }
})();

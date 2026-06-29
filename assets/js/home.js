(async function () {
  document.getElementById("hdr").innerHTML = AC.header("home", null);
  const yr = document.getElementById("yr"); if (yr) yr.textContent = new Date().getFullYear();

  // subscribe buttons
  const sub = window.SITE.subscribeURL();
  document.querySelectorAll(".subscribe-btn").forEach(b => {
    if (sub) { b.href = sub; b.target = "_blank"; b.rel = "noopener"; }
  });

  // real stat values from the index
  let topics = [];
  try { topics = await AC.loadIndex(); } catch (e) { /* leave defaults */ }
  if (topics.length) {
    const totalMin = topics.reduce((a, t) => {
      const p = (t.durationText || "0:0").split(":").map(Number);
      return a + (p[0] || 0) + (p[1] || 0) / 60;
    }, 0);
    const set = (sel, v) => { const el = document.querySelector(sel); if (el) el.dataset.count = v; };
    set('[data-count="87"]', topics.length);
    set('[data-count="2660"]', topics.reduce((a, t) => a + (t.questionCount || 0), 0));
    const h = document.getElementById("hours"); if (h) h.dataset.count = Math.round(totalMin / 60);
  }

  // count-up
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
    setTimeout(() => { el.textContent = fmt(target); }, dur + 250);
  }
  document.querySelectorAll("#stats [data-count]").forEach(countUp);

  // scroll reveal (with safety so content never stays hidden)
  document.body.classList.add("reveal-armed");
  const reveals = [...document.querySelectorAll(".reveal")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(el => io.observe(el));
    setTimeout(() => reveals.forEach(el => el.classList.add("in")), 800);
  } else {
    reveals.forEach(el => el.classList.add("in"));
  }

  // ---- parallax: image scrolls + brightens as each panel reaches focus ----
  const panels = [...document.querySelectorAll(".parallax")];
  if (panels.length) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      for (const s of panels) {
        const r = s.getBoundingClientRect();
        const prog = (r.top + r.height / 2 - vh / 2) / vh; // 0 when centred
        const bg = s.querySelector(".px-bg");
        if (bg) bg.style.transform = `translateY(${(prog * 9).toFixed(2)}%)`;
        s.classList.toggle("active", Math.abs(prog) < 0.36);
      }
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }
})();

(async function () {
  const id = (AC.qs("id") || "001").padStart(3, "0");
  document.getElementById("hdr").innerHTML = AC.header("listen", id);
  document.getElementById("warn").innerHTML = AC.mediaWarning();
  document.getElementById("yr").textContent = new Date().getFullYear();

  let t, index;
  try { [t, index] = await Promise.all([AC.loadTopic(id), AC.loadIndex()]); }
  catch (e) { document.getElementById("title").textContent = "Topic not found"; return; }

  document.getElementById("cb").textContent = t.title;
  document.getElementById("title").textContent = t.title;
  document.getElementById("sub").textContent =
    `${t.section} · #${t.id} · ${t.questionCount} questions · ${t.durationText}`;
  document.title = `${t.title} — Listen`;
  if (t.cover) document.getElementById("cover").src = t.cover;

  const audio = document.getElementById("audio");
  audio.src = window.SITE.audioURL(t);

  // ---- transcript ----
  const box = document.getElementById("transcript");
  const cues = t.cues || [];
  box.innerHTML = cues.map((c, i) => {
    const who = c.r === "E" ? "Examiner" : (c.r === "C" ? "Candidate" : "");
    return `<span class="cue ${c.r || ""}" data-i="${i}" data-s="${c.s}">
      ${who ? `<span class="who">${who}</span>` : ""}${AC.esc(c.t)}</span>`;
  }).join("");

  const nodes = [...box.querySelectorAll(".cue")];
  box.addEventListener("click", e => {
    const el = e.target.closest(".cue"); if (!el) return;
    audio.currentTime = parseFloat(el.dataset.s) + 0.01;
    if (audio.paused) audio.play();
  });

  // ---- sync highlight ----
  let cur = -1, autoscroll = true;
  function highlight(i) {
    if (i === cur || i < 0) return;
    if (nodes[cur]) nodes[cur].classList.remove("active");
    cur = i;
    const el = nodes[cur];
    if (!el) return;
    el.classList.add("active");
    if (autoscroll) {
      const top = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
      box.scrollTo({ top, behavior: "smooth" });
    }
  }
  audio.addEventListener("timeupdate", () => {
    if (!cues.length) return;
    const from = (cur >= 0 && audio.currentTime >= cues[cur].s) ? cur : 0;
    highlight(AC.activeCue(cues, audio.currentTime, from));
    document.getElementById("clock").textContent = AC.fmt(audio.currentTime);
  });
  audio.addEventListener("loadedmetadata", () =>
    document.getElementById("dur").textContent = AC.fmt(audio.duration));

  // ---- controls ----
  const pp = document.getElementById("playpause");
  pp.addEventListener("click", () => audio.paused ? audio.play() : audio.pause());
  audio.addEventListener("play", () => pp.textContent = "❚❚ Pause");
  audio.addEventListener("pause", () => pp.textContent = "► Play");
  document.querySelectorAll("[data-skip]").forEach(b =>
    b.addEventListener("click", () => audio.currentTime += parseFloat(b.dataset.skip)));
  const speeds = [1, 1.25, 1.5, 1.75, 2, 0.75]; let si = 0;
  document.getElementById("speed").addEventListener("click", e => {
    si = (si + 1) % speeds.length; audio.playbackRate = speeds[si];
    e.target.textContent = speeds[si] + "×";
  });
  const as = document.getElementById("autoscroll");
  as.addEventListener("click", () => {
    autoscroll = !autoscroll; as.textContent = "Auto-scroll: " + (autoscroll ? "On" : "Off");
  });
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT") return;
    if (e.code === "Space") { e.preventDefault(); audio.paused ? audio.play() : audio.pause(); }
    if (e.code === "ArrowLeft") audio.currentTime -= 5;
    if (e.code === "ArrowRight") audio.currentTime += 5;
  });

  // ---- side list ----
  document.getElementById("sidelist").innerHTML = index.map(x =>
    `<a class="side-item ${x.id === id ? "is-active" : ""}" href="listen.html?id=${x.id}">
      <span class="n">${x.id}</span><span>${AC.esc(x.title)}</span></a>`).join("");
  const act = document.querySelector(".side-item.is-active");
  if (act) act.scrollIntoView({ block: "center" });
})();

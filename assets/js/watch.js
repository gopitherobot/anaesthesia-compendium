(async function () {
  const id = (AC.qs("id") || "001").padStart(3, "0");
  document.getElementById("hdr").innerHTML = AC.header("watch", id);
  document.getElementById("warn").innerHTML = AC.mediaWarning();
  document.getElementById("yr").textContent = new Date().getFullYear();

  let t, index;
  try { [t, index] = await Promise.all([AC.loadTopic(id), AC.loadIndex()]); }
  catch (e) { document.getElementById("title").textContent = "Topic not found"; return; }

  document.getElementById("cb").textContent = t.title;
  document.getElementById("title").textContent = t.title;
  document.getElementById("sub").textContent =
    `${t.section} · #${t.id} · ${t.questionCount} questions · ${t.durationText}`;
  document.title = `${t.title} — Watch`;

  // ---- video + native subtitle track ----
  const video = document.getElementById("video");
  video.src = window.SITE.videoURL(t);
  if (t.cover) video.poster = t.cover;
  const track = document.createElement("track");
  track.kind = "subtitles"; track.label = "English"; track.srclang = "en";
  track.src = t.vtt; track.default = true;
  video.appendChild(track);
  video.addEventListener("loadedmetadata", () => {
    if (video.textTracks[0]) video.textTracks[0].mode = "showing";
  });

  // ---- clickable transcript synced to video ----
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
    video.currentTime = parseFloat(el.dataset.s) + 0.01;
    if (video.paused) video.play();
  });

  let cur = -1, autoscroll = true;
  function highlight(i) {
    if (i === cur || i < 0) return;
    if (nodes[cur]) nodes[cur].classList.remove("active");
    cur = i; const el = nodes[cur]; if (!el) return;
    el.classList.add("active");
    if (autoscroll) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }
  video.addEventListener("timeupdate", () => {
    if (!cues.length) return;
    const from = (cur >= 0 && video.currentTime >= cues[cur].s) ? cur : 0;
    highlight(AC.activeCue(cues, video.currentTime, from));
  });

  // ---- controls ----
  const speeds = [1, 1.25, 1.5, 1.75, 2, 0.75]; let si = 0;
  document.getElementById("speed").addEventListener("click", e => {
    si = (si + 1) % speeds.length; video.playbackRate = speeds[si]; e.target.textContent = speeds[si] + "×";
  });
  document.getElementById("cc").addEventListener("click", e => {
    const tt = video.textTracks[0]; if (!tt) return;
    const on = tt.mode === "showing";
    tt.mode = on ? "hidden" : "showing";
    e.target.textContent = "Subtitles: " + (on ? "Off" : "On");
  });
  const as = document.getElementById("autoscroll");
  as.addEventListener("click", () => { autoscroll = !autoscroll; as.textContent = "Auto-scroll: " + (autoscroll ? "On" : "Off"); });

  document.getElementById("sidelist").innerHTML = index.map(x =>
    `<a class="side-item ${x.id === id ? "is-active" : ""}" href="watch.html?id=${x.id}">
      <span class="n">${x.id}</span><span>${AC.esc(x.title)}</span></a>`).join("");
  const act = document.querySelector(".side-item.is-active");
  if (act) act.scrollIntoView({ block: "center" });
})();

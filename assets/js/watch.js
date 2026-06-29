(async function () {
  const raw = AC.qs("id");
  document.getElementById("yr").textContent = new Date().getFullYear();

  // ---- no topic chosen → mode hub ----
  if (!raw) {
    document.getElementById("hdr").innerHTML = AC.header("watch", null);
    await AC.renderHub("watch");
    return;
  }

  // ---- topic view ----
  const id = raw.padStart(3, "0");
  document.getElementById("hdr").innerHTML = AC.header("watch", id);
  document.getElementById("topic").classList.remove("hide");
  document.getElementById("warn").innerHTML = AC.mediaWarning();

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

  // ---- clickable transcript synced to video (paragraphs, one label per turn) ----
  const box = document.getElementById("transcript");
  const cues = t.cues || [];
  const nodes = AC.renderTranscript(box, cues);
  box.addEventListener("click", e => {
    const el = e.target.closest(".seg"); if (!el) return;
    video.currentTime = parseFloat(el.dataset.s) + 0.01;
    if (video.paused) video.play();
  });

  let cur = -1, autoscroll = true;
  function highlight(i) {
    if (i === cur || i < 0) return;
    if (nodes[cur]) nodes[cur].classList.remove("active");
    cur = i; const el = nodes[cur]; if (!el) return;
    el.classList.add("active");
    if (autoscroll) AC.scrollToCenter(box, el);
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

  AC.renderSidePanel(document.getElementById("sidelist"), "watch", id, index);
})();

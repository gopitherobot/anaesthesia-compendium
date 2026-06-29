/* Shared helpers for all pages */
const AC = {
  qs: (k) => new URLSearchParams(location.search).get(k),

  async loadIndex() {
    const r = await fetch("data/topics.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("topics.json " + r.status);
    return (await r.json()).topics;
  },

  async loadTopic(id) {
    const r = await fetch(`data/topics/${id}.json`, { cache: "no-cache" });
    if (!r.ok) throw new Error("topic " + id + " " + r.status);
    return await r.json();
  },

  fmt(sec) {
    if (sec == null || isNaN(sec)) return "0:00";
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
             : `${m}:${String(s).padStart(2, "0")}`;
  },

  esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },

  // active cue index for a given time (linear scan is fine for ~600 cues)
  activeCue(cues, t, from = 0) {
    for (let i = Math.max(0, from); i < cues.length; i++) {
      if (t < cues[i].e) {
        if (t >= cues[i].s) return i;
        if (i === 0) return 0;
        return t >= cues[i - 1].e ? i : i - 1; // in a gap -> stay on next
      }
    }
    return cues.length - 1;
  },

  // build the top navigation / mode switcher
  header(activeMode, id) {
    const modes = id ? [
      ["listen.html?id=" + id, "Listen", "listen"],
      ["watch.html?id=" + id, "Watch", "watch"],
      ["read.html?id=" + id, "Read", "read"],
    ] : [];
    return `
    <header class="topbar">
      <a class="brand" href="index.html">
        <img class="brand-logo" src="assets/logo-mark.png" alt="" width="40" height="40">
        <span class="brand-name">Anaesthesia Compendium</span>
      </a>
      <nav class="modes">
        ${modes.map(([h, l, m]) =>
          `<a href="${h}" class="mode ${m === activeMode ? "is-active" : ""}" data-m="${m}">${l}</a>`
        ).join("")}
        <a href="index.html" class="mode lib ${activeMode === "library" ? "is-active" : ""}">Library</a>
      </nav>
    </header>`;
  },

  // Render the transcript as flowing paragraphs grouped by speaker turn.
  // The Examiner/Candidate label shows ONCE per turn; each cue becomes an
  // inline .seg that highlights in sync. Returns the ordered .seg nodes
  // (index === cue index) for the player to drive.
  renderTranscript(box, cues) {
    const groups = [];
    for (const c of cues) {
      const last = groups[groups.length - 1];
      if (!last || last.r !== c.r) groups.push({ r: c.r, items: [] });
      groups[groups.length - 1].items.push(c);
    }
    let idx = 0;
    box.innerHTML = groups.map(g => {
      const who = g.r === "E" ? "Examiner" : (g.r === "C" ? "Candidate" : "");
      const segs = g.items.map(c =>
        `<span class="seg" data-i="${idx++}" data-s="${c.s}">${AC.esc(c.t)}</span>`
      ).join(" ");
      return `<div class="turn ${g.r || ""}">${who ? `<span class="who">${who}</span>` : ""}<p class="turn-text">${segs}</p></div>`;
    }).join("");
    return [...box.querySelectorAll(".seg")];
  },

  // Smoothly centre an element within its scroll container.
  scrollToCenter(box, el) {
    const br = el.getBoundingClientRect(), cr = box.getBoundingClientRect();
    box.scrollTo({ top: box.scrollTop + (br.top - cr.top) - box.clientHeight / 2 + br.height / 2, behavior: "smooth" });
  },

  mediaWarning() {
    if (window.SITE.mediaReady()) return "";
    return `<div class="media-warn">Media host not configured yet — audio/video will play once the Cloudflare R2 bucket URL is set in <code>config.js</code>.</div>`;
  },
};

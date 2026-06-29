/* Shared helpers for all pages */

/* Always open a page at the top (web + mobile). Disable the browser's scroll
   restoration and reset scroll on load — but respect in-page #anchors. */
(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const top = () => { if (!location.hash) window.scrollTo(0, 0); };
  top();
  window.addEventListener("load", top);
  window.addEventListener("pageshow", top); // bfcache (back/forward) restores
})();

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

  MODES: {
    read:   { label: "Read",   verb: "Read",   blurb: "The full examiner-and-candidate viva as clean, searchable Q&A text." },
    listen: { label: "Listen", verb: "Listen", blurb: "Audio with a live synced transcript — every sentence highlights as it's spoken." },
    watch:  { label: "Watch",  verb: "Watch",  blurb: "The full station as video with subtitles and a clickable, synced transcript." },
  },

  modeIcon(mode) {
    if (mode === "read") return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 4h11l3 3v13H5z"/><path d="M15 4v4h4"/><path d="M8 12h8M8 15.5h8M8 8.5h3"/></svg>`;
    if (mode === "listen") return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="13" width="4" height="7" rx="1.5"/><rect x="17" y="13" width="4" height="7" rx="1.5"/></svg>`;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.5" y="4.5" width="19" height="13" rx="2"/><path d="M10 8.5l5 3-5 3z" fill="currentColor" stroke="none"/><path d="M8 21h8"/></svg>`;
  },

  // build the top navigation. With an id → per-topic mode switcher.
  // Without id but a real mode → links to the three mode hubs.
  header(activeMode, id) {
    const modes = id ? [
      ["read.html?id=" + id, "Read", "read"],
      ["listen.html?id=" + id, "Listen", "listen"],
      ["watch.html?id=" + id, "Watch", "watch"],
    ] : [
      ["read.html", "Read", "read"],
      ["listen.html", "Listen", "listen"],
      ["watch.html", "Watch", "watch"],
    ];
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
        <a href="library.html" class="mode lib ${activeMode === "library" ? "is-active" : ""}">Library</a>
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

  // Render a mode hub (topic list) into #hub. Rows open <mode>.html?id=NNN.
  async renderHub(mode) {
    const m = this.MODES[mode];
    const hub = document.getElementById("hub");
    document.getElementById("topic")?.classList.add("hide");
    hub.classList.remove("hide");
    document.title = `${m.label} — Anaesthesia Compendium`;

    let topics;
    try { topics = await this.loadIndex(); }
    catch (e) { hub.innerHTML = `<div class="wrap empty">Could not load library (${this.esc(e.message)}).</div>`; return; }

    const searchSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5e7280" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
    const rows = topics.map(t => `
      <a class="trow" href="${mode}.html?id=${t.id}" data-title="${this.esc(t.title.toLowerCase())}" data-sec="${t.section}">
        <span class="tnum">${t.id}</span>
        <span class="tmain">
          <span class="ttitle">${this.esc(t.title)}</span>
          <span class="tmeta"><span class="tsec">${t.section}</span>${t.durationText || ""} · ${t.questionCount} questions</span>
        </span>
        <span class="tmodes"><span class="open-pill ${mode}">${m.verb} →</span></span>
      </a>`).join("");

    hub.innerHTML = `
      <section class="hub-hero ${mode}">
        <div class="wrap">
          <span class="hub-ico">${this.modeIcon(mode)}</span>
          <h1>${m.label} every viva station</h1>
          <p>${m.blurb}</p>
          <div class="hub-count">${topics.length} topics · choose one to begin</div>
        </div>
      </section>
      <section class="wrap hub-body">
        <div class="toolbar">
          <label class="search">${searchSvg}<input id="q" type="search" placeholder="Search ${topics.length} topics…" autocomplete="off"></label>
          <button class="chip is-active" data-sec="all">All</button>
          <button class="chip" data-sec="Pharmacology">Pharmacology</button>
          <button class="chip" data-sec="Physiology">Physiology</button>
        </div>
        <div class="tlist" id="hublist">${rows}</div>
        <div class="empty hide" id="hubempty">No topics match your search.</div>
      </section>`;

    let sec = "all", term = "";
    const apply = () => {
      let shown = 0;
      hub.querySelectorAll(".trow").forEach(el => {
        const ok = (sec === "all" || el.dataset.sec === sec) && (!term || el.dataset.title.includes(term));
        el.classList.toggle("hide", !ok); if (ok) shown++;
      });
      hub.querySelector("#hubempty").classList.toggle("hide", shown !== 0);
    };
    hub.querySelector("#q").addEventListener("input", e => { term = e.target.value.trim().toLowerCase(); apply(); });
    hub.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => {
      hub.querySelectorAll(".chip").forEach(x => x.classList.remove("is-active"));
      c.classList.add("is-active"); sec = c.dataset.sec; apply();
    }));
  },

  // Collapsible, section-grouped side panel for navigating between topics.
  renderSidePanel(container, mode, currentId, index) {
    const groups = [];
    for (const t of index) {
      const last = groups[groups.length - 1];
      if (!last || last.sec !== t.section) groups.push({ sec: t.section, items: [] });
      groups[groups.length - 1].items.push(t);
    }
    container.innerHTML = groups.map(g => {
      const open = g.items.some(t => t.id === currentId);
      return `<div class="nav-group ${open ? "open" : ""}">
        <button class="nav-head" type="button">
          <span class="nav-chev">▸</span>${g.sec}<span class="nav-count">${g.items.length}</span>
        </button>
        <div class="nav-items">
          ${g.items.map(t => `<a class="nav-item ${t.id === currentId ? "is-active" : ""}" href="${mode}.html?id=${t.id}">
            <span class="n">${t.id}</span><span class="nav-t">${this.esc(t.title)}</span></a>`).join("")}
        </div>
      </div>`;
    }).join("");
    container.querySelectorAll(".nav-head").forEach(h =>
      h.addEventListener("click", () => h.parentElement.classList.toggle("open")));
    // centre the active item inside the panel only (never scroll the window)
    const act = container.querySelector(".nav-item.is-active");
    if (act) {
      const cr = container.getBoundingClientRect(), ar = act.getBoundingClientRect();
      container.scrollTop += (ar.top - cr.top) - container.clientHeight / 2 + ar.height / 2;
    }
  },

  mediaWarning() {
    if (window.SITE.mediaReady()) return "";
    return `<div class="media-warn">Media host not configured yet — audio/video will play once the Cloudflare R2 bucket URL is set in <code>config.js</code>.</div>`;
  },
};

(async function () {
  const id = (AC.qs("id") || "001").padStart(3, "0");
  document.getElementById("hdr").innerHTML = AC.header("read", id);
  document.getElementById("yr").textContent = new Date().getFullYear();

  let t, index;
  try { [t, index] = await Promise.all([AC.loadTopic(id), AC.loadIndex()]); }
  catch (e) { document.getElementById("title").textContent = "Topic not found"; return; }

  document.getElementById("cb").textContent = t.title;
  document.getElementById("title").textContent = t.title;
  document.getElementById("sub").textContent =
    `${t.section} · #${t.id} · ${t.questionCount} questions`;
  document.title = `${t.title} — Read`;

  const wrap = document.getElementById("qa");
  wrap.innerHTML = (t.qa || []).map(b => {
    if (!b.q) { // intro / outro examiner-only line
      return `<div class="qa"><p class="intro">${AC.esc(b.a || "")}</p></div>`;
    }
    const paras = b.a.split(/\n\n+/).map(p => `<p>${AC.esc(p)}</p>`).join("");
    return `<div class="qa">
      <div class="q"><span class="lbl">Examiner</span>${AC.esc(b.q)}</div>
      ${b.a ? `<div class="a"><span class="lbl">Candidate</span>${paras}</div>` : ""}
    </div>`;
  }).join("");

  // prev / next
  const pos = index.findIndex(x => x.id === id);
  const prev = document.getElementById("prev"), next = document.getElementById("next");
  if (pos > 0) prev.href = `read.html?id=${index[pos - 1].id}`; else prev.classList.add("hide");
  if (pos < index.length - 1) next.href = `read.html?id=${index[pos + 1].id}`; else next.classList.add("hide");

  // find-within highlighting
  const find = document.getElementById("find");
  const blocks = [...wrap.querySelectorAll(".qa")];
  find.addEventListener("input", () => {
    const term = find.value.trim().toLowerCase();
    blocks.forEach(b => {
      const hit = !term || b.textContent.toLowerCase().includes(term);
      b.classList.toggle("hide", !hit);
    });
  });
})();

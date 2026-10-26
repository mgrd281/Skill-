// «حزمة التثبيت» (src/components/KitDialog.astro): يجمع أوامر الأدوات المختارة في نص واحد للطرفية.
// السطور من فهرس البحث (kl: سطور الطرفية، ka: ما يُكتب داخل Claude Code بعدها، kw: سبب عدم الدخول).
// السطر المكرر يُكتب مرة واحدة (إضافتان من السوق نفسه تحتاجان marketplace add واحدًا).
import { L, fmt } from "../i18n/client.js";
import { loadIndex, HOME } from "./search-data.js";

const dlg = document.getElementById("kit");

if (dlg) {
  const $ = (id) => document.getElementById(id);
  const code = $("kit-code"), lead = $("kit-lead"), cmd = $("kit-cmd"), note = $("kit-note");
  const after = $("kit-after"), afterList = $("kit-after-list"), skip = $("kit-skip"), skipList = $("kit-skip-list");
  let back = null;

  function item(x, text) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = HOME + "tools/" + x.s;
    a.textContent = x.n;
    a.dir = "auto";
    li.append(a);
    if (text) {
      const s = document.createElement("span");
      s.textContent = text;
      li.append(s);
    }
    return li;
  }
  function slashCmd(x, c) {
    const li = document.createElement("li");
    const k = document.createElement("code");
    k.textContent = c;
    const s = document.createElement("span");
    s.textContent = x.n;
    s.dir = "auto";
    li.append(k, s);
    return li;
  }

  async function open(slugs, title) {
    back = document.activeElement;
    $("kit-h").textContent = title || L.kitFavs;
    lead.textContent = L.kitLoading;
    cmd.hidden = true; note.hidden = true; after.hidden = true; skip.hidden = true;
    if (!dlg.open) dlg.showModal();
    let ix;
    try { ix = await loadIndex(); } catch (e) { lead.textContent = L.kitError; return; }
    const by = new Map(ix.tools.map((x) => [x.s, x]));
    const tools = slugs.map((s) => by.get(s)).filter(Boolean);
    const lines = [], seen = new Set();
    afterList.textContent = "";
    skipList.textContent = "";
    let n = 0;
    for (const x of tools) {
      if (!x.kl) { skipList.append(item(x, L.kitWhy[x.kw] || "")); continue; }
      n++;
      for (const l of x.kl) if (!seen.has(l)) { seen.add(l); lines.push(l); }
      (x.ka || []).forEach((c) => afterList.append(slashCmd(x, c)));
    }
    code.textContent = lines.join("\n");
    lead.textContent = n ? fmt(L.kitLead, { n }) : L.kitNone;
    cmd.hidden = note.hidden = n === 0;
    after.hidden = !afterList.children.length;
    skip.hidden = !skipList.children.length;
    if (n) cmd.querySelector("pre").scrollLeft = 0;
  }

  document.addEventListener("click", (e) => {
    const b = e.target instanceof Element && e.target.closest("[data-kit]");
    if (!b) return;
    const slugs = (b.dataset.kit || "").split(" ").filter(Boolean);
    if (slugs.length) open(slugs, b.dataset.kitTitle);
  });
  $("kit-x").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", () => { if (back && document.contains(back)) back.focus({ preventScroll: true }); });
}

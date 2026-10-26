// المقارنة (src/views/Compare.astro): حتى ثلاث أدوات من ?t=a,b,c، ومنتقٍ بالبحث (combobox)، والرابط يتبع الاختيار.
// بيانات الجدول من /compare.json (src/lib/compare-index.ts)، والبحث في المنتقي من فهرس البحث المشترك.
import { L, fmt } from "../i18n/client.js";
import { terms, score } from "../lib/search.js";
import { loadIndex, docOf, HOME } from "./search-data.js";

const MAX = 3;
const $ = (id) => document.getElementById(id);
const chips = $("cmp-chips"), input = $("cmp-q"), list = $("cmp-list"), wrap = $("cmp-wrap"), head = $("cmp-head"), body = $("cmp-body");
const empty = $("cmp-empty"), status = $("cmp-status"), share = $("cmp-share");
const rowsTpl = $("cmp-rows").content, icons = $("cmp-icons").content;
const S = JSON.parse($("cmp-i18n").textContent);
let by = null, picked = [], ix = null, docs = null, opts = [], active = -1;

const initials = (name) => {
  const words = name.split(/[\s\-_/.]+/).filter((w) => /[A-Za-z0-9]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = (words[0] || name).replace(/[^A-Za-z0-9]/g, "");
  return (w[0] || "?").toUpperCase() + (w[1] || "").toLowerCase();
};
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const icon = (i) => icons.children[i].cloneNode(true); // 0 نسخ، 1 تم، 2 إزالة، 3 تحذير

picked = [...new Set((new URLSearchParams(location.search).get("t") || "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, MAX);

function syncUrl() {
  const next = location.pathname + (picked.length ? "?t=" + picked.join(",") : "");
  try { history.replaceState(history.state, "", next); } catch (e) {}
}

// خلية الجدول لكل صف
function cell(row, x) {
  const td = el("td");
  const dash = () => td.append(el("span", "cmp-na", "—"));
  const tone = (v, t) => { const s = el("span", t === "warn" || t === "bad" ? "cmp-warn" : "", v); s.dir = "auto"; if (t === "warn" || t === "bad") s.prepend(icon(3)); td.append(s); };
  if (row === "cat") { const a = el("a", null, x.cn); a.href = HOME + "category/" + x.c; td.append(a); }
  else if (row === "stars") { if (x.st) { const s = el("span", "stars"); s.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-star-fill"></use></svg>'; s.append(x.st); td.append(s); } else dash(); }
  else if (row === "desc") td.append(el("p", "cmp-desc", x.d));
  else if (row === "pub" || row === "run" || row === "src") { if (x[row]) tone(x[row][0], x[row][1]); else dash(); }
  else if (row === "lic") { if (x.lic) tone(x.lic, x.lw); else td.append(el("span", "cmp-na", L.cmpUnknown)); }
  else if (row === "up") { if (x.arch) tone(L.cmpArchived, "bad"); else if (x.up) tone(x.up, x.old ? "warn" : ""); else td.append(el("span", "cmp-na", L.cmpUnknown)); }
  else if (row === "ad") td.append(el("span", null, x.ad));
  else if (row === "way") { const s = el("span", null, x.way); s.dir = "auto"; td.append(s); }
  else if (row === "cmd") {
    if (!x.m) { dash(); return td; }
    const box = el("div", "cmd");
    box.dataset.slug = x.s; // يُعدّ نسخه (src/scripts/copy.js)
    const pre = el("pre");
    pre.tabIndex = 0;
    pre.setAttribute("aria-label", S.cmdAria + ": " + x.n);
    pre.append(el("code", null, x.m));
    const b = el("button", "copy");
    b.type = "button";
    b.setAttribute("aria-label", S.copyAria + ": " + x.n);
    b.append(icon(0), icon(1), el("span", "copy-t", S.copy));
    box.append(pre, b);
    td.append(box);
  } else if (row === "use") {
    if (!x.use.length) { dash(); return td; }
    const u = el("span", "cmp-uses");
    x.use.forEach((name) => u.append(el("span", "usechip", name)));
    td.append(u);
  }
  return td;
}

function render() {
  if (!by) return;
  syncUrl();
  const tools = picked.map((s) => by.get(s));
  // الأدوات المختارة كشرائح بزر إزالة
  chips.textContent = "";
  tools.forEach((x) => {
    const li = el("li", "cmp-chip");
    const n = el("bdi", null, x.n);
    const b = el("button", "cmp-x");
    b.type = "button";
    b.dataset.s = x.s;
    b.setAttribute("aria-label", fmt(L.cmpRemove, { name: x.n }));
    b.append(icon(2));
    li.append(n, b);
    chips.append(li);
  });
  // عند الحد يصير الحقل للقراءة فقط (لا معطّلًا): يبقى التركيز فيه بعد إضافة الأداة الثالثة، ويقول النص المؤقت السبب
  const full = picked.length >= MAX;
  input.readOnly = full;
  input.placeholder = full ? L.cmpMax : picked.length ? L.cmpAddMore : input.dataset.ph || input.placeholder;
  share.hidden = picked.length < 2;
  // حزمة التثبيت للأدوات المقارنة (src/scripts/kit.js)
  const kit = $("cmp-kit");
  kit.hidden = picked.length === 0;
  kit.dataset.kit = picked.join(" ");
  status.textContent = fmt(L.cmpN, { n: picked.length }) + (full ? " · " + L.cmpMax : "");
  empty.hidden = picked.length > 0;
  wrap.hidden = picked.length === 0;
  wrap.style.setProperty("--n", picked.length);
  // رأس الجدول: الأدوات
  head.querySelectorAll("th").forEach((th) => th.remove());
  tools.forEach((x) => {
    const th = el("th");
    th.scope = "col";
    const a = el("a", "cmp-tool");
    a.href = HOME + "tools/" + x.s;
    const m = el("span", "mono sm", initials(x.n));
    m.setAttribute("aria-hidden", "true");
    const tt = el("span", "cmp-tt");
    const b = el("b", null, x.n);
    b.dir = "auto";
    tt.append(b, el("small", null, x.k));
    a.append(m, tt);
    th.append(a);
    head.append(th);
  });
  // الصفوف
  body.textContent = "";
  [...rowsTpl.children].forEach((tpl) => {
    const tr = tpl.cloneNode(true);
    tools.forEach((x) => tr.append(cell(tr.dataset.row, x)));
    body.append(tr);
  });
}

// ---- المنتقي ----
function setActive(i) {
  if (opts[active]) opts[active].setAttribute("aria-selected", "false");
  active = opts.length ? (i + opts.length) % opts.length : -1;
  if (active >= 0) { opts[active].setAttribute("aria-selected", "true"); input.setAttribute("aria-activedescendant", opts[active].id); opts[active].scrollIntoView({ block: "nearest" }); }
  else input.removeAttribute("aria-activedescendant");
}
function showList(on) {
  list.hidden = !on;
  input.setAttribute("aria-expanded", on ? "true" : "false");
  if (!on) { opts = []; active = -1; input.removeAttribute("aria-activedescendant"); }
}
function results() {
  const q = input.value.trim();
  list.textContent = "";
  opts = [];
  if (!q || !ix || !by || input.readOnly) { showList(false); return; }
  const ts = terms(q);
  const hits = ix.tools.map((x, i) => [x, score(docs[i], ts)]).filter(([x, s]) => s > 0 && !picked.includes(x.s) && by.has(x.s))
    .sort((a, b) => b[1] - a[1] || b[0].sn - a[0].sn).slice(0, 6);
  if (!hits.length) {
    const li = el("li", "cmp-none", L.cmpNone);
    li.setAttribute("role", "presentation");
    list.append(li);
  }
  hits.forEach(([x]) => {
    const t = by.get(x.s);
    const li = el("li", "cmp-o");
    li.id = "cmp-o-" + opts.length;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", "false");
    li.dataset.s = x.s;
    const b = el("b", null, t.n);
    b.dir = "auto";
    li.append(b, el("small", null, t.cn + " · " + t.k));
    list.append(li);
    opts.push(li);
  });
  showList(true);
  setActive(0);
}
function add(slug) {
  if (!by || !slug || picked.includes(slug) || picked.length >= MAX) return;
  picked.push(slug);
  input.value = "";
  showList(false);
  render();
  input.focus();
}
function needIndex() {
  if (ix) return;
  loadIndex().then((data) => { ix = data; docs = ix.tools.map(docOf); if (document.activeElement === input) results(); }, () => {});
}

input.dataset.ph = input.placeholder;
input.addEventListener("focus", needIndex);
input.addEventListener("input", () => { needIndex(); results(); });
input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); if (list.hidden) results(); else setActive(active + 1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
  else if (e.key === "Enter") { e.preventDefault(); if (opts[active]) add(opts[active].dataset.s); }
  else if (e.key === "Escape" && !list.hidden) { e.preventDefault(); showList(false); }
});
input.addEventListener("blur", () => setTimeout(() => showList(false), 150));
list.addEventListener("pointerdown", (e) => e.preventDefault()); // يبقى التركيز في الحقل
list.addEventListener("click", (e) => { const li = e.target.closest(".cmp-o"); if (li) add(li.dataset.s); });
list.addEventListener("pointermove", (e) => { const li = e.target.closest(".cmp-o"); if (li && opts.indexOf(li) !== active) setActive(opts.indexOf(li)); });
chips.addEventListener("click", (e) => {
  const b = e.target.closest(".cmp-x");
  if (!b) return;
  picked = picked.filter((s) => s !== b.dataset.s);
  render();
  input.focus();
});

fetch(HOME + "compare.json").then((r) => r.json()).then((data) => {
  by = new Map(data.tools.map((x) => [x.s, x]));
  picked = picked.filter((s) => by.has(s));
  render();
  // ما كُتب في الحقل قبل وصول الجدول
  if (document.activeElement === input && input.value.trim()) results();
}, () => { status.textContent = L.cmpError; });

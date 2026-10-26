// الفلترة والبحث والترتيب في الصفحة الرئيسية. الفلترة والعدّ والترتيب من بيانات كل الأدوات في app-data،
// والبطاقات نفسها: أول القائمة مرسوم في الصفحة، والباقي يُنشأ عند أول ظهور من /cards/ (src/scripts/cards.js).
// حالة العرض (البحث والقسم والمشروع والترتيب) في رابط الصفحة أيضًا (?q=&cat=&p=&sort=&new=1&skills=1)، فيُشارَك كما هو.
import { relative } from "./dates.js";
import { L, fmt } from "../i18n/client.js";
import { terms, score, suggest } from "../lib/search.js";
import { loadIndex, docOf, rawText, vocabOf } from "./search-data.js";
import { loadCards, cardsLoaded, makeCard } from "./cards.js";
import { noteMiss, clearMiss } from "./misses.js";
const KEY = "toolkit-filter-v3";
const data = JSON.parse(document.getElementById("app-data").textContent);
const projectById = (id) => data.projects.find((p) => p.id === id) || null;
// حرفان لكل أداة، بنفس طريقة initials في src/lib/data.ts
function initials(name) {
  const words = name.split(/[\s\-_/.]+/).filter((w) => /[A-Za-z0-9]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = (words[0] || name).replace(/[^A-Za-z0-9]/g, "");
  return (w[0] || "?").toUpperCase() + (w[1] || "").toLowerCase();
}

// القائمة لا تعرض كل الأدوات دفعة واحدة: 12 أولًا ثم "عرض المزيد"، و6 لكل قسم في عرض الأقسام
const PAGE = 12, SECTION_CAP = 6;
const state = { project: null, cat: "all", q: "", onlyNew: false, onlySkills: false, sort: "stars", limit: PAGE };
// الرابط أولًا: من فتح رابطًا مشاركًا يرى ما رآه صاحبه، لا آخر ما اختاره هو في هذا المتصفح
const URL_KEYS = ["q", "p", "cat", "sort", "new", "skills"];
const params = new URLSearchParams(location.search);
const fromUrl = URL_KEYS.some((k) => params.has(k));
if (fromUrl) {
  state.q = (params.get("q") || "").trim().slice(0, 100);
  if (projectById(params.get("p"))) state.project = params.get("p");
  if (data.cats.includes(params.get("cat"))) state.cat = params.get("cat");
  state.onlyNew = params.get("new") === "1";
  state.onlySkills = params.get("skills") === "1";
  const so = params.get("sort");
  state.sort = ["stars", "cat", "new"].includes(so) ? so : state.q ? "match" : "stars";
} else try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
  if (saved && typeof saved === "object") {
    if (projectById(saved.project)) state.project = saved.project;
    if (saved.cat === "all" || data.cats.includes(saved.cat)) state.cat = saved.cat;
    state.onlyNew = !!saved.onlyNew;
    state.onlySkills = !!saved.onlySkills;
    if (["stars", "cat", "new"].includes(saved.sort)) state.sort = saved.sort;
  }
} catch (e) {}
// الأدوات التي أخفاها الزائر من عرضه (محليًا في متصفحه فقط)
const HKEY = "toolkit-hidden-v1";
const hidden = new Set();
try {
  const h = JSON.parse(localStorage.getItem(HKEY) || "[]");
  if (Array.isArray(h)) h.forEach((s) => typeof s === "string" && hidden.add(s));
} catch (e) {}
function saveHidden() {
  try { localStorage.setItem(HKEY, JSON.stringify([...hidden])); } catch (e) {}
}

// رابط قديم بالمشروع في # (من شرائح المشاريع في صفحات الأدوات): /#shop. ترميز خاطئ (/#%) يُعامل كأن لا شيء
const fromHash = (h) => { try { return decodeURIComponent(h.replace("#", "")); } catch (e) { return ""; } };
const hashId = fromHash(location.hash || "");
if (projectById(hashId)) state.project = hashId;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      project: state.project, cat: state.cat, onlyNew: state.onlyNew, onlySkills: state.onlySkills, sort: state.sort === "match" ? "stars" : state.sort,
    }));
  } catch (e) {}
  syncUrl();
}

// يكتب الحالة في الرابط دون إضافة خطوة في سجل التصفح. أثناء الكتابة في البحث ينتظر توقفها قليلًا
// (Safari يرفض أكثر من 100 تغيير في 30 ثانية)
let urlTimer = 0;
function urlNow() {
  const u = new URLSearchParams();
  if (state.q) u.set("q", state.q);
  if (state.project) u.set("p", state.project);
  if (state.cat !== "all") u.set("cat", state.cat);
  if (state.onlyNew) u.set("new", "1");
  if (state.onlySkills) u.set("skills", "1");
  if (state.sort !== (state.q ? "match" : "stars")) u.set("sort", state.sort === "match" ? "stars" : state.sort);
  const qs = u.toString().replace(/\+/g, "%20");
  const hash = location.hash && !projectById(fromHash(location.hash)) ? location.hash : "";
  return location.pathname + (qs ? "?" + qs : "") + hash;
}
function syncUrl(later) {
  clearTimeout(urlTimer);
  const go = () => {
    const next = urlNow();
    if (next !== location.pathname + location.search + location.hash) {
      try { history.replaceState(history.state, "", next); } catch (e) {}
    }
  };
  if (later) urlTimer = setTimeout(go, 400);
  else go();
}

const $ = (id) => document.getElementById(id);
const projectsEl = $("projects"), chipsEl = $("chips"), statusEl = $("status"), qEl = $("q"), sortEl = $("sort");
const emptyEl = $("empty"), starsSection = $("by-stars"), starsGrid = $("stars-grid");
const adviceEls = [...document.querySelectorAll("[data-advice]")];
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// كل الأدوات بترتيب النجوم (src/views/Home.astro). el البطاقة حين تُنشأ، وdoc وtext للبحث حين يصل الفهرس
const cards = data.tools.map((x) => ({
  slug: x.s, cat: x.c, isSkill: x.k === 1, isNew: x.n === 1, starsN: x.st, order: x.o, added: x.a, use: x.u ? x.u.split(" ") : [],
  el: null, rankEl: null, pickBadge: null, useChips: [], doc: null, text: "",
}));
const bySlug = new Map(cards.map((c) => [c.slug, c]));
function attach(c, el) {
  c.el = el;
  c.rankEl = el.querySelector(".rank");
  c.pickBadge = el.querySelector(".badge-pick");
  c.useChips = [...el.querySelectorAll(".usechip")];
  decorate(c);
}
document.querySelectorAll("#stars-grid .card").forEach((el) => { const c = bySlug.get(el.dataset.slug); if (c) attach(c, el); });
// بطاقة الأداة، تُنشأ عند أول حاجة إليها. null إن لم تصل البطاقات بعد
function cardEl(c) {
  if (!c.el) { const el = makeCard(c.slug); if (el) attach(c, el); }
  return c.el;
}
// تُطلب البطاقات حين تقترب القائمة من الشاشة، أو عند أول عرض يحتاج ما لم يُرسم (ويُعاد الرسم عند وصولها)
let waiting = false;
function needCards() {
  if (waiting || cardsLoaded()) return;
  waiting = true;
  $("list").setAttribute("aria-busy", "true");
  const done = () => { waiting = false; $("list").removeAttribute("aria-busy"); };
  loadCards().then(() => { done(); renderList(); }, done);
}
// يضع البطاقات بالترتيب في أول الشبكة، ولا يحرّك ما هو في مكانه أصلًا (التحريك يُضيع التركيز ويعيد التخطيط)
function place(grid, els) {
  let ref = grid.firstElementChild;
  for (const el of els) {
    if (el === ref) { ref = ref.nextElementSibling; continue; }
    grid.insertBefore(el, ref);
  }
}
const sections = [...document.querySelectorAll("[data-cat-section]")].map((s) => ({
  el: s, id: s.dataset.catSection, grid: s.querySelector(".grid"), n: s.querySelector("h2 .n"), more: s.querySelector(".sec-more"),
}));
const moreBtn = $("more"), moreN = $("more-n");

// ---- البحث ----
// لكل أداة وثيقة بحث (src/lib/search.js) ونص بشكله المكتوب لمفردات «هل تقصد»، من فهرس البحث باللغات الثلاث.
// الفهرس يُطلب حين يقترب الزائر من البحث، وحتى يصل تقول القائمة «جارٍ التحميل» بدل «لا نتيجة».
let indexed = false, indexFailed = false, vocab = null, qTerms = [];
const scoreOf = new Map();
const searching = () => !!state.q && !indexed;
function computeScores() {
  scoreOf.clear();
  if (!state.q || !indexed) return;
  qTerms = terms(state.q);
  cards.forEach((c) => scoreOf.set(c, c.doc ? score(c.doc, qTerms) : 0));
}
function wantIndex() {
  needCards();
  if (indexed) return;
  indexFailed = false;
  loadIndex().then((ix) => {
    if (indexed) return;
    indexed = true;
    const by = new Map(ix.tools.map((x) => [x.s, x]));
    cards.forEach((c) => { const x = by.get(c.slug); if (x) { c.doc = docOf(x); c.text = rawText(x); } });
    vocab = null;
    if (state.q) {
      // إعادة الترتيب تنقل البطاقات في الصفحة، فيضيع التركيز إن كان على زر داخل إحداها: يعود إليه بعدها
      const f = document.activeElement;
      computeScores(); syncChips(); renderList();
      if (f && f !== document.activeElement && f.isConnected) f.focus({ preventScroll: true });
    }
  }, () => { indexFailed = true; if (state.q) renderList(); });
}
// وضع الترتيب "الأقرب لبحثك" لا يظهر في القائمة إلا أثناء البحث
const matchOpt = document.createElement("option");
matchOpt.value = "match";
matchOpt.textContent = L.sortMatch;
function setQuery(v) {
  const had = !!state.q;
  state.q = v.trim().slice(0, 100);
  if (state.q && !had && state.sort === "stars") state.sort = "match";
  if (!state.q && state.sort === "match") state.sort = "stars";
  computeScores();
}

function inProject(c, pid) {
  const p = projectById(pid);
  return c.use.includes(pid) || !!(p && p.cats.includes(c.cat));
}
function matches(c, ignoreCat) {
  if (hidden.has(c.slug)) return false;
  if (state.project && !inProject(c, state.project)) return false;
  if (!ignoreCat && state.cat !== "all" && c.cat !== state.cat) return false;
  if (state.onlyNew && !c.isNew) return false;
  if (state.onlySkills && !c.isSkill) return false;
  return !state.q || scoreOf.get(c) > 0;
}
function countWith(flag) {
  const keep = state[flag];
  state[flag] = true;
  const n = cards.filter((c) => matches(c, false)).length;
  state[flag] = keep;
  return n;
}

function syncChips() {
  const base = cards.filter((c) => matches(c, true));
  chipsEl.querySelectorAll(".chip").forEach((b) => {
    const id = b.dataset.id;
    let n;
    if (id === "all") n = base.length;
    else if (id === "new") n = countWith("onlyNew");
    else if (id === "skill") n = countWith("onlySkills");
    else n = base.filter((c) => c.cat === id).length;
    b.querySelector(".n").textContent = n;
    b.classList.toggle("zero", n === 0);
    const on = id === "new" ? state.onlyNew : id === "skill" ? state.onlySkills : id === state.cat;
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  // زر "الأقسام": اسم القسم المختار وعدد خيارات التصفية الإضافية
  $("cat-label").textContent = state.cat === "all" ? L.catBtnAll : catLabel(state.cat);
  const extra = (state.onlyNew ? 1 : 0) + (state.onlySkills ? 1 : 0);
  $("cat-badge").hidden = extra === 0;
  $("cat-badge").textContent = extra;
  $("cat-btn").classList.toggle("on", state.cat !== "all" || extra > 0);
}

function syncProject() {
  projectsEl.querySelectorAll(".ptile").forEach((b) => {
    b.setAttribute("aria-pressed", b.dataset.p === state.project ? "true" : "false");
  });
  adviceEls.forEach((a) => { a.hidden = a.dataset.advice !== state.project; });
  cards.forEach((c) => { if (c.el) decorate(c); });
}
// شارة «اختيارنا» ومشروع البطاقة المختار، لكل بطاقة موجودة ولكل بطاقة تُنشأ لاحقًا
function decorate(c) {
  const p = projectById(state.project);
  const isPick = !!(p && p.pickSlugs.includes(c.slug));
  c.pickBadge.hidden = !isPick;
  c.el.classList.toggle("is-pick", isPick);
  c.useChips.forEach((u) => u.classList.toggle("on", u.dataset.p === state.project));
}

// ترتيب العرض المسطح (النجوم أو الأحدث أو الأقرب للبحث)
function sortFlat(list) {
  const byNew = state.sort === "new", byMatch = state.sort === "match";
  return list.sort(byNew
    ? (a, b) => b.added.localeCompare(a.added) || b.order - a.order
    : byMatch
      ? (a, b) => scoreOf.get(b) - scoreOf.get(a) || b.starsN - a.starsN || a.order - b.order
      : (a, b) => b.starsN - a.starsN || a.order - b.order);
}
// الأدوات المطابقة لعرض «حسب القسم» في قسم واحد: «اختيارنا» للمشروع أولًا، ثم الأعلى نجومًا
function sortCat(list) {
  const p = projectById(state.project);
  return list.sort((a, b) => {
    if (p) {
      let pa = p.pickSlugs.indexOf(a.slug), pb = p.pickSlugs.indexOf(b.slug);
      pa = pa === -1 ? 99 : pa; pb = pb === -1 ? 99 : pb;
      if (pa !== pb) return pa - pb;
    }
    return b.starsN - a.starsN || a.order - b.order;
  });
}

function renderList() {
  const busy = searching();
  const visible = busy ? [] : cards.filter((c) => matches(c, false));
  const p = projectById(state.project);
  const on = new Set();
  let missing = false;
  const show = (c) => { const el = cardEl(c); if (el) on.add(el); else missing = true; return el; };

  if (state.sort !== "cat") {
    const sorted = sortFlat(visible);
    $("flat-title").textContent = state.sort === "new" ? L.byNew : state.sort === "match" ? L.byMatch : L.byStars;
    place(starsGrid, sorted.slice(0, state.limit).map(show).filter(Boolean));
    // رقم التصنيف للأدوات التي لها نجوم فقط (في ترتيب النجوم)، والباقي في النهاية بلا رقم
    let rank = 0;
    sorted.forEach((c) => {
      const ranked = state.sort === "stars" && c.starsN >= 0;
      if (ranked) rank++;
      if (!c.el || !on.has(c.el)) return;
      if (ranked) { c.rankEl.textContent = "#" + rank; c.rankEl.dataset.top = rank <= 3 ? String(rank) : ""; c.rankEl.hidden = false; }
      else c.rankEl.hidden = true;
    });
    starsSection.hidden = sorted.length === 0;
    sections.forEach((s) => { s.el.hidden = true; });
    const left = sorted.length - state.limit;
    moreBtn.hidden = left <= 0;
    moreN.textContent = left > 0 ? fmt(L.more, { n: left }) : "";
  } else {
    $("flat-title").textContent = L.byCat;
    starsSection.hidden = true;
    moreBtn.hidden = true;
    const vis = new Set(visible);
    sections.forEach((s) => {
      const mine = sortCat(cards.filter((c) => c.cat === s.id && vis.has(c)));
      const n = mine.length;
      // في عرض كل الأقسام يظهر أول 6 من كل قسم، و"عرض الكل" يفتح القسم كاملًا
      const cap = state.cat === "all" ? SECTION_CAP : Infinity;
      place(s.grid, mine.slice(0, cap).map(show).filter(Boolean));
      s.more.hidden = n <= cap;
      s.more.querySelector(".sm-n").textContent = n;
      s.n.textContent = n;
      s.el.hidden = n === 0;
    });
    cards.forEach((c) => { if (c.el && on.has(c.el)) c.rankEl.hidden = true; });
  }
  // كل بطاقة موجودة ولا تظهر في هذا العرض تُخفى
  cards.forEach((c) => { if (c.el) c.el.hidden = !on.has(c.el); });
  $("flat-n").textContent = visible.length;
  emptyEl.hidden = busy || visible.length !== 0;
  if (!busy && visible.length === 0) syncEmpty();
  // بحث بلا أي نتيجة حتى مع إلغاء الفلاتر يُسجَّل بلا هوية (src/scripts/misses.js)
  if (!busy && state.q && !cards.some((c) => scoreOf.get(c) > 0)) noteMiss(state.q);
  else clearMiss();
  statusEl.textContent = busy ? (indexFailed ? L.qsError : L.qsLoading) : fmt(L.status, { n: visible.length, total: data.total }) + (p ? " · " + p.name : "");
  $("hiddenbar").hidden = hidden.size === 0;
  $("hidden-n").textContent = fmt(L.hiddenN, { n: hidden.size });
  if (missing) needCards();
}

// لا نتيجة: «هل تقصد» بكلمة قريبة من مفردات الدليل، وزر يعرض نتائج البحث نفسه بلا الفلاتر الأخرى
const sugEl = $("empty-sug"), sugBtn = $("sug-btn"), wideBtn = $("empty-wide");
function syncEmpty() {
  sugEl.hidden = true;
  wideBtn.hidden = true;
  $("empty-suggest-row").hidden = true;
  if (!state.q || !indexed) return;
  const sug = suggest(state.q, vocab || (vocab = vocabOf(cards.map((c) => c.text))));
  if (sug) {
    const ts = terms(sug);
    if (cards.some((c) => !hidden.has(c.slug) && c.doc && score(c.doc, ts) > 0)) {
      sugBtn.textContent = sug;
      sugEl.hidden = false;
    }
  }
  const filtered = state.project || state.cat !== "all" || state.onlyNew || state.onlySkills;
  const n = filtered ? cards.filter((c) => !hidden.has(c.slug) && scoreOf.get(c) > 0).length : 0;
  // لا شيء في الدليل كله: «اقترح أداة» باسم ما بحث عنه الزائر (src/scripts/suggest.js)
  const none = !cards.some((c) => scoreOf.get(c) > 0);
  $("empty-suggest-row").hidden = !none;
  $("empty-suggest").dataset.suggestTool = none ? state.q : "";
  if (n) {
    wideBtn.textContent = fmt(L.searchAll, { n });
    wideBtn.hidden = false;
  }
}
sugBtn.addEventListener("click", () => {
  qEl.value = sugBtn.textContent;
  qEl.dispatchEvent(new Event("input", { bubbles: true }));
  qEl.focus({ preventScroll: true });
});
wideBtn.addEventListener("click", () => {
  state.project = null; state.cat = "all"; state.onlyNew = false; state.onlySkills = false;
  state.limit = PAGE;
  save();
  smooth(render);
});

const activeBar = $("activebar"), activeChips = $("active-chips");
function catLabel(id) {
  const b = chipsEl.querySelector('.chip[data-id="' + id + '"]');
  if (!b) return id;
  const c = b.cloneNode(true);
  c.querySelectorAll(".n").forEach((n) => n.remove());
  return c.textContent.trim();
}
function syncActive() {
  const items = [];
  const p = projectById(state.project);
  if (p) items.push(["project", L.fProject + p.name]);
  if (state.cat !== "all") items.push(["cat", L.fCat + catLabel(state.cat)]);
  if (state.onlyNew) items.push(["onlyNew", L.fNew]);
  if (state.onlySkills) items.push(["onlySkills", L.fSkills]);
  if (state.q) items.push(["q", L.fSearch + state.q]);
  activeChips.textContent = "";
  items.forEach(([key, text]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "afchip"; b.dataset.key = key;
    b.setAttribute("aria-label", L.fRemove + text);
    b.append(text + " ×");
    activeChips.append(b);
  });
  activeBar.hidden = items.length === 0;
}
function clearFilter(key) {
  if (key === "project") state.project = null;
  else if (key === "cat") state.cat = "all";
  else if (key === "onlyNew") state.onlyNew = false;
  else if (key === "onlySkills") state.onlySkills = false;
  else if (key === "q") { setQuery(""); qEl.value = ""; }
  else if (key === "all") { state.project = null; state.cat = "all"; state.onlyNew = false; state.onlySkills = false; setQuery(""); qEl.value = ""; }
  state.limit = PAGE;
  save();
  smooth(render);
}
activeBar.addEventListener("click", (e) => {
  // زر المشاركة (ui.js) يشارك رابط الصفحة: نكتب الحالة فيه أولًا إن كانت كتابة البحث لم تستقر بعد
  if (e.target.closest("[data-share]")) { syncUrl(); return; }
  const b = e.target.closest(".afchip");
  if (b) clearFilter(b.dataset.key);
});
$("clear-all").addEventListener("click", () => clearFilter("all"));
$("empty-reset").addEventListener("click", () => clearFilter("all"));

function syncSort() {
  if (state.q && !matchOpt.parentNode) sortEl.prepend(matchOpt);
  if (!state.q && matchOpt.parentNode) matchOpt.remove();
  sortEl.value = state.sort;
}
function render() {
  syncProject();
  syncActive();
  syncChips();
  syncSort();
  renderList();
}

// انتقال ناعم بين حالات الفلترة إن دعمه المتصفح (ويُتجاوز مع تقليل الحركة)
function smooth(fn) {
  if (reduceMotion || !document.startViewTransition) return fn();
  document.startViewTransition(fn);
}

function setProject(id) {
  state.project = state.project === id ? null : id;
  state.limit = PAGE;
  save();
  smooth(render);
}

async function goTo(slug) {
  const c = bySlug.get(slug);
  if (!c) return;
  try { await loadCards(); } catch (e) { return; }
  if (hidden.delete(slug)) { saveHidden(); render(); }
  if (!matches(c, false)) {
    state.cat = "all"; state.onlyNew = false; state.onlySkills = false; setQuery(""); qEl.value = "";
    if (state.project && !inProject(c, state.project)) state.project = null;
    save(); render();
  }
  // البطاقة قد تكون بعد حد العرض: وسّع القائمة حتى تظهر
  if (!c.el || c.el.hidden) {
    if (state.sort === "cat") { state.cat = c.cat; save(); render(); }
    else {
      const i = sortFlat(cards.filter((x) => matches(x, false))).indexOf(c);
      state.limit = Math.ceil((i + 1) / PAGE) * PAGE;
      renderList();
    }
  }
  if (!c.el) return;
  c.el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  c.el.classList.remove("flash");
  void c.el.offsetWidth;
  c.el.classList.add("flash");
}

// «جرّب:» تحت حقل الواجهة: يملأ البحث وينزل إلى النتائج بلا تحميل الصفحة من جديد
document.querySelector(".tries")?.addEventListener("click", (e) => {
  const a = e.target.closest("[data-q]");
  if (!a) return;
  e.preventDefault();
  qEl.value = a.dataset.q;
  qEl.dispatchEvent(new Event("input", { bubbles: true }));
  $("q-clear").hidden = false;
  $("list").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
});

projectsEl.addEventListener("click", (e) => {
  const b = e.target.closest(".ptile");
  if (b) setProject(b.dataset.p);
});
document.querySelector(".build").addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) { goTo(go.dataset.go); return; }
  if (e.target.closest("[data-clear]")) { state.project = null; save(); render(); }
});
chipsEl.addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  const id = b.dataset.id;
  if (id === "new") state.onlyNew = !state.onlyNew;
  else if (id === "skill") state.onlySkills = !state.onlySkills;
  else { state.cat = id; toggleCats(false); }
  state.limit = PAGE;
  save();
  smooth(render);
});
qEl.addEventListener("input", () => {
  wantIndex();
  setQuery(qEl.value);
  state.limit = PAGE;
  syncChips();
  syncActive();
  syncSort();
  renderList();
  syncUrl(true);
});
// الفهرس يُطلب حين يقترب الزائر من البحث، فيصل غالبًا قبل أول حرف
qEl.addEventListener("focus", wantIndex);
document.querySelector(".search").addEventListener("pointerenter", wantIndex, { once: true });
sortEl.addEventListener("change", () => {
  state.sort = ["cat", "new"].includes(sortEl.value) || (sortEl.value === "match" && state.q) ? sortEl.value : "stars";
  state.limit = PAGE;
  save();
  smooth(renderList);
});
$("list").addEventListener("click", (e) => {
  const sm = e.target.closest(".sec-more");
  if (sm) {
    state.cat = sm.dataset.cat;
    save();
    smooth(render);
    document.getElementById("cat-" + sm.dataset.cat).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    return;
  }
  const hb = e.target.closest(".hide");
  if (hb) {
    hidden.add(hb.dataset.hide);
    saveHidden();
    render();
    refreshBell();
    return;
  }
  const u = e.target.closest(".usechip");
  if (!u) return;
  setProject(u.dataset.p);
  $("build-h").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
});

$("unhide").addEventListener("click", () => {
  hidden.clear();
  saveHidden();
  render();
  refreshBell();
});

// "عرض المزيد": 24 أداة إضافية، والتركيز ينتقل إلى أول بطاقة جديدة
moreBtn.addEventListener("click", async () => {
  const first = state.limit;
  state.limit += PAGE * 2;
  try { await loadCards(); } catch (e) {}
  renderList();
  const next = starsGrid.children[first];
  if (next && !next.hidden) next.querySelector(".name")?.focus({ preventScroll: true });
});

// ---- لوحة الأقسام: قائمة منسدلة على الشاشات الكبيرة، وورقة من الأسفل على الجوال ----
const catBtn = $("cat-btn"), catPanel = $("catpanel"), catBack = $("cat-backdrop");
const sheetMq = window.matchMedia("(max-width: 700px)");
function toggleCats(open) {
  if (open === !catPanel.hidden) return;
  catPanel.hidden = !open;
  catBack.hidden = !open;
  catBtn.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    const bar = document.querySelector(".bar");
    let r = bar.getBoundingClientRect();
    // على الشاشات الكبيرة تنزل اللوحة تحت الشريط: إن كان الشريط في أسفل الشاشة فلن تجد مكانًا،
    // فننقل الشريط إلى أعلى الشاشة أولًا (ويلتصق هناك). على الجوال اللوحة ورقة من الأسفل فلا حاجة.
    if (r.bottom > window.innerHeight * 0.55 && !sheetMq.matches) {
      window.scrollTo({ top: window.scrollY + r.top, behavior: "instant" });
      r = bar.getBoundingClientRect();
    }
    catPanel.style.setProperty("--top", Math.max(8, r.bottom + 8) + "px");
    (catPanel.querySelector('.chip[aria-pressed="true"]') || catPanel.querySelector(".chip")).focus({ preventScroll: true });
  } else if (catPanel.contains(document.activeElement) || document.activeElement === document.body) {
    catBtn.focus({ preventScroll: true });
  }
}
catBtn.addEventListener("click", () => toggleCats(catPanel.hidden));
catBack.addEventListener("click", () => toggleCats(false));
$("cat-done").addEventListener("click", () => toggleCats(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !catPanel.hidden) toggleCats(false);
});
window.addEventListener("resize", () => {
  if (!catPanel.hidden) catPanel.style.setProperty("--top", Math.max(8, document.querySelector(".bar").getBoundingClientRect().bottom + 8) + "px");
});

// ---- جرس الإشعارات: الأدوات المضافة منذ آخر مرة قرأت فيها الإشعارات ----
const SKEY = "toolkit-seen-v1";
const bell = $("bell"), bellN = $("bell-n"), panel = $("notif"), listEl = $("notif-list"), emptyN = $("notif-empty");
const newest = data.recent.length ? data.recent[0].added : "";
let seen = null;
try { seen = localStorage.getItem(SKEY); } catch (e) {}
if (seen === null) {
  // أول زيارة: لا نغمرك بكل الأدوات الحالية، نبدأ العدّ من الآن
  seen = newest;
  try { localStorage.setItem(SKEY, newest); } catch (e) {}
}

function unreadList() {
  return data.recent.filter((r) => r.added > seen && !hidden.has(r.slug));
}
function refreshBell() {
  const list = unreadList();
  bellN.hidden = list.length === 0;
  bellN.textContent = list.length > 9 ? "9+" : String(list.length);
  bell.setAttribute("aria-label", list.length ? fmt(L.bellN, { n: list.length }) : L.bell);
  $("notif-read").hidden = list.length === 0;
  if (!panel.hidden) fillBell(list);
}
// القائمة تُبنى حين تُفتح اللوحة: تعرض دائمًا آخر الأدوات المضافة، وما لم تقرأه بعد يحمل نقطة زرقاء
function fillBell(list = unreadList()) {
  const unreadSet = new Set(list.map((r) => r.slug));
  const latest = data.recent.filter((r) => !hidden.has(r.slug)).slice(0, 8);
  listEl.textContent = "";
  latest.forEach((r) => {
    const unread = unreadSet.has(r.slug);
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = data.base + r.slug;
    a.className = "nf-item" + (unread ? " unread" : "");
    const mono = document.createElement("span"); mono.className = "mono sm"; mono.setAttribute("aria-hidden", "true"); mono.textContent = initials(r.name);
    const t = document.createElement("span"); t.className = "nf-t";
    const b = document.createElement("b"); b.textContent = r.name;
    const sm = document.createElement("small");
    let when = r.added.slice(0, 10);
    try { when = relative(r.added); } catch (e) {}
    sm.textContent = r.cat + " · " + when;
    t.append(b, sm);
    a.append(mono, t);
    if (unread) {
      const dot = document.createElement("span"); dot.className = "nf-dot";
      const sr = document.createElement("span"); sr.className = "sr"; sr.textContent = L.unread;
      a.append(dot, sr);
    }
    li.append(a);
    listEl.append(li);
  });
  emptyN.hidden = latest.length !== 0;
}
function togglePanel(open) {
  if (open) fillBell();
  panel.hidden = !open;
  bell.setAttribute("aria-expanded", open ? "true" : "false");
}
bell.addEventListener("click", () => togglePanel(panel.hidden));
document.addEventListener("click", (e) => {
  if (!panel.hidden && !e.target.closest(".notif-wrap")) togglePanel(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !panel.hidden) { togglePanel(false); bell.focus(); }
});
$("notif-read").addEventListener("click", () => {
  seen = newest;
  try { localStorage.setItem(SKEY, newest); } catch (e) {}
  refreshBell();
  togglePanel(false);
});
refreshBell();
if (unreadList().length && !reduceMotion) bell.classList.add("ring");

// بحث من الرابط: يظهر في الحقل مع زر المسح
if (state.q) {
  qEl.value = state.q;
  $("q-clear").hidden = false;
  computeScores();
  wantIndex();
}
render();
syncUrl();
// باقي البطاقات تُجلب (بلا قراءتها) حين تقترب القائمة من الشاشة، فيكون «عرض المزيد» والفلترة فوريين
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); needCards(); } }, { rootMargin: "600px 0px" });
  io.observe($("list"));
} else needCards();

// الفلترة والبحث والترتيب في الصفحة الرئيسية. الصفحة كاملة تُرسم وقت البناء،
// وهذا السكربت يخفي ويُظهر ويعيد ترتيب البطاقات فقط.
const KEY = "toolkit-filter-v3";
const data = JSON.parse(document.getElementById("app-data").textContent);
const projectById = (id) => data.projects.find((p) => p.id === id) || null;

const state = { project: null, cat: "all", q: "", onlyNew: false, onlySkills: false, sort: "stars" };
try {
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

const hashId = (location.hash || "").replace("#", "");
if (projectById(hashId)) state.project = hashId;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      project: state.project, cat: state.cat, onlyNew: state.onlyNew, onlySkills: state.onlySkills, sort: state.sort,
    }));
  } catch (e) {}
}

const $ = (id) => document.getElementById(id);
const projectsEl = $("projects"), chipsEl = $("chips"), statusEl = $("status"), qEl = $("q"), sortEl = $("sort");
const emptyEl = $("empty"), starsSection = $("by-stars"), starsGrid = $("stars-grid");
const adviceEls = [...document.querySelectorAll("[data-advice]")];
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const cards = [...document.querySelectorAll(".card")].map((el) => ({
  el,
  slug: el.dataset.slug,
  rankEl: el.querySelector(".rank"),
  cat: el.dataset.cat,
  isNew: el.dataset.new === "1",
  isSkill: el.dataset.kind === "Skill",
  use: el.dataset.use.split(" "),
  search: el.dataset.search,
  starsN: Number(el.dataset.stars),
  order: Number(el.dataset.order),
  added: el.dataset.added || "",
  pickBadge: el.querySelector(".badge-pick"),
  useChips: [...el.querySelectorAll(".usechip")],
  grid: el.parentNode,
}));
const sections = [...document.querySelectorAll("[data-cat-section]")].map((s) => ({
  el: s, id: s.dataset.catSection, grid: s.querySelector(".grid"), n: s.querySelector("h2 .n"),
}));

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
  if (!state.q) return true;
  return state.q.split(/\s+/).every((w) => c.search.includes(w));
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
}

function syncProject() {
  projectsEl.querySelectorAll(".ptile").forEach((b) => {
    b.setAttribute("aria-pressed", b.dataset.p === state.project ? "true" : "false");
  });
  adviceEls.forEach((a) => { a.hidden = a.dataset.advice !== state.project; });
  const p = projectById(state.project);
  cards.forEach((c) => {
    const isPick = !!(p && p.pickSlugs.includes(c.slug));
    c.pickBadge.hidden = !isPick;
    c.el.classList.toggle("is-pick", isPick);
    c.useChips.forEach((u) => u.classList.toggle("on", u.dataset.p === state.project));
  });
}

function renderList() {
  const visible = new Set(cards.filter((c) => matches(c, false)));
  cards.forEach((c) => { c.el.hidden = !visible.has(c); });
  const p = projectById(state.project);

  if (state.sort === "stars" || state.sort === "new") {
    const byNew = state.sort === "new";
    const sorted = [...visible].sort(byNew
      ? (a, b) => b.added.localeCompare(a.added) || b.order - a.order
      : (a, b) => b.starsN - a.starsN || a.order - b.order);
    $("flat-title").textContent = byNew ? "الأحدث إضافةً إلى الدليل" : "مرتبة حسب نجوم GitHub";
    let rank = 0;
    sorted.forEach((c) => {
      starsGrid.appendChild(c.el);
      // رقم التصنيف للأدوات التي لها نجوم فقط، والباقي في النهاية بلا رقم
      if (!byNew && c.starsN >= 0) { rank++; c.rankEl.textContent = "#" + rank; c.rankEl.dataset.top = rank <= 3 ? String(rank) : ""; c.rankEl.hidden = false; }
      else c.rankEl.hidden = true;
    });
    starsSection.hidden = sorted.length === 0;
    starsSection.querySelector("h2 .n").textContent = sorted.length;
    sections.forEach((s) => { s.el.hidden = true; });
  } else {
    starsSection.hidden = true;
    cards.forEach((c) => { c.rankEl.hidden = true; });
    sections.forEach((s) => {
      const mine = cards.filter((c) => c.cat === s.id).sort((a, b) => {
        if (p) {
          let pa = p.pickSlugs.indexOf(a.slug), pb = p.pickSlugs.indexOf(b.slug);
          pa = pa === -1 ? 99 : pa; pb = pb === -1 ? 99 : pb;
          if (pa !== pb) return pa - pb;
        }
        // داخل كل قسم: الأعلى نجومًا أولًا، والتي بلا نجوم في النهاية
        return b.starsN - a.starsN || a.order - b.order;
      });
      mine.forEach((c) => s.grid.appendChild(c.el));
      const n = mine.filter((c) => visible.has(c)).length;
      s.n.textContent = n;
      s.el.hidden = n === 0;
    });
  }
  emptyEl.hidden = visible.size !== 0;
  statusEl.textContent = "يظهر " + visible.size + " من " + data.total + (p ? " · " + p.name : "");
  $("hiddenbar").hidden = hidden.size === 0;
  $("hidden-n").textContent = "مخفية من عرضك: " + hidden.size;
}

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
  if (p) items.push(["project", "المشروع: " + p.name]);
  if (state.cat !== "all") items.push(["cat", "القسم: " + catLabel(state.cat)]);
  if (state.onlyNew) items.push(["onlyNew", "الجديد فقط"]);
  if (state.onlySkills) items.push(["onlySkills", "المهارات فقط"]);
  if (state.q) items.push(["q", "بحث: " + state.q]);
  activeChips.textContent = "";
  items.forEach(([key, text]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "afchip"; b.dataset.key = key;
    b.setAttribute("aria-label", "إزالة الفلتر: " + text);
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
  else if (key === "q") { state.q = ""; qEl.value = ""; }
  else if (key === "all") { state.project = null; state.cat = "all"; state.onlyNew = false; state.onlySkills = false; state.q = ""; qEl.value = ""; }
  save();
  smooth(render);
}
activeBar.addEventListener("click", (e) => {
  const b = e.target.closest(".afchip");
  if (b) clearFilter(b.dataset.key);
});
$("clear-all").addEventListener("click", () => clearFilter("all"));
$("empty-reset").addEventListener("click", () => clearFilter("all"));

function render() {
  syncProject();
  syncActive();
  syncChips();
  renderList();
  sortEl.value = state.sort;
}

// انتقال ناعم بين حالات الفلترة إن دعمه المتصفح (ويُتجاوز مع تقليل الحركة)
function smooth(fn) {
  if (reduceMotion || !document.startViewTransition) return fn();
  document.startViewTransition(fn);
}

function setProject(id) {
  state.project = state.project === id ? null : id;
  save();
  smooth(render);
}

function goTo(slug) {
  const c = cards.find((x) => x.slug === slug);
  if (!c) return;
  if (hidden.delete(slug)) { saveHidden(); render(); }
  if (!matches(c, false)) {
    state.cat = "all"; state.onlyNew = false; state.onlySkills = false; state.q = ""; qEl.value = "";
    if (state.project && !inProject(c, state.project)) state.project = null;
    save(); render();
  }
  c.el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  c.el.classList.remove("flash");
  void c.el.offsetWidth;
  c.el.classList.add("flash");
}

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
  else state.cat = id;
  save();
  smooth(render);
});
qEl.addEventListener("input", () => {
  state.q = qEl.value.trim().toLowerCase();
  syncChips();
  syncActive();
  renderList();
});
sortEl.addEventListener("change", () => {
  state.sort = ["cat", "new"].includes(sortEl.value) ? sortEl.value : "stars";
  save();
  smooth(renderList);
});
$("list").addEventListener("click", (e) => {
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
  bell.setAttribute("aria-label", list.length ? "آخر الأدوات المضافة: " + list.length + " جديدة" : "آخر الأدوات المضافة");
  // القائمة تعرض دائمًا آخر الأدوات المضافة، وما لم تقرأه بعد يحمل علامة "جديد"
  const unreadSet = new Set(list.map((r) => r.slug));
  const latest = data.recent.filter((r) => !hidden.has(r.slug)).slice(0, 8);
  listEl.textContent = "";
  latest.forEach((r) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = data.base + r.slug;
    const b = document.createElement("b"); b.textContent = r.name;
    if (unreadSet.has(r.slug)) {
      const nb = document.createElement("span"); nb.className = "badge-new"; nb.textContent = "جديد";
      b.append(" ", nb);
    }
    const s = document.createElement("small"); const d = document.createElement("bdi"); d.textContent = r.added.slice(0, 10); s.append(r.cat + " · ", d);
    a.append(b, s);
    li.append(a);
    listEl.append(li);
  });
  emptyN.hidden = latest.length !== 0;
  $("notif-read").hidden = list.length === 0;
}
function togglePanel(open) {
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

render();

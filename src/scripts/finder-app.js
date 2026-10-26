// «ساعدني أختار» (src/views/FinderFragment.astro): الأسئلة الثلاثة والنتائج. يحمّله src/scripts/finder.js عند الحاجة
// مع النافذة نفسها، والبيانات من /finder.json (src/lib/finder.ts) عند فتحها.
// الترتيب: ماذا تبني شرط (إلا «أستكشف فقط»)، ثم ما يطابق الاهتمام والشكل معًا، ثم الاهتمام وحده، ثم الشكل وحده،
// وداخل كل درجة الجودة q و«ابدأ بهذه» للمشروع المختار. الإجابات تُحفظ في toolkit-finder-v1 فيعود الزائر إلى نتيجته،
// وتُعدّ بلا هوية حين يصل إلى النتائج (api/feedback بنوع finder، ويلخّصها npm run inbox).
import { L, LANG, fmt, homePath } from "../i18n/client.js";
import { addFavs, getFavs } from "./fav.js";

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
const HOME = homePath(BASE);
const KEY = "toolkit-finder-v1";
const ORDER = ["need", "project", "kind"];
const FIRST = 6, MAX = 12;
const NS = "http://www.w3.org/2000/svg";
// اتجاه «التالي» على الشاشة: لليسار في العربية
const FWD = LANG === "ar" ? -1 : 1;
const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const $ = (id) => document.getElementById(id);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function icon(id, cls) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("class", cls ? "i " + cls : "i");
  s.setAttribute("aria-hidden", "true");
  const u = document.createElementNS(NS, "use");
  u.setAttribute("href", "#" + id);
  s.append(u);
  return s;
}

let dlg, card, S;
let dataP = null;
function loadData() {
  if (!dataP) {
    dataP = fetch(HOME + "finder.json")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .catch((e) => { dataP = null; throw e; });
  }
  return dataP;
}

// الإجابات: null لم يُجب بعد، و"any" لا تفضيل
const A = { need: null, project: null, kind: null };
let step = null, editing = false, back = null, timer = null, res = null, shown = FIRST, drawing = 0;
// fresh: إجابات جديدة لم تُعدّ بعد (لا تُعدّ النتيجة المحفوظة حين يعيد الزائر فتحها)، وfrom: من أين فُتحت
let fresh = false, from = "page";
const counted = new Set();

const optsOf = (s) => [...dlg.querySelectorAll(`.fd-q[data-step="${s}"] .fd-o`)];
const optOf = (s, v) => optsOf(s).find((o) => o.dataset.v === v) || null;
const valid = (a) => !!a && ORDER.every((s) => typeof a[s] === "string" && optOf(s, a[s]));

// تُدخل النافذة في الصفحة: رسوم أيقوناتها في رسم الصفحة (ما لم يكن فيه)، والنافذة الكاملة مكان نافذة التحميل إن كانت مفتوحة
export function mount(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const c = tpl.content;
  let sprite = document.querySelector("svg.sprite");
  if (!sprite) {
    sprite = document.createElementNS(NS, "svg");
    sprite.setAttribute("class", "sprite");
    sprite.setAttribute("aria-hidden", "true");
    document.body.append(sprite);
  }
  for (const s of c.querySelectorAll("svg.sprite symbol")) if (!document.getElementById(s.id)) sprite.append(s);
  S = JSON.parse(c.getElementById("fd-l").textContent);
  card = c.getElementById("fn");
  document.body.append(card);
  const src = c.getElementById("finder");
  dlg = $("finder");
  if (dlg) {
    dlg.replaceChildren(...src.childNodes);
    for (const a of [...src.attributes]) dlg.setAttribute(a.name, a.value);
  } else {
    dlg = src;
    document.body.append(dlg);
  }
  wire();
  return { open, nudge: showNudge };
}

function wire() {
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) { dlg.close(); return; }
    if (!(e.target instanceof Element)) return;
    const o = e.target.closest(".fd-o");
    if (o) { choose(o); return; }
    // شريحة من «إجاباتك»: تعود إلى سؤالها، وبعد الإجابة مباشرة إلى النتائج
    const a = e.target.closest("[data-edit]");
    if (a) { editing = true; go(a.dataset.edit, -1); }
  });
  dlg.addEventListener("keydown", arrows);
  dlg.addEventListener("close", closed);
  $("fd-back").addEventListener("click", () => {
    editing = false;
    const i = step === "res" ? ORDER.length : ORDER.indexOf(step);
    if (i > 0) go(ORDER[i - 1], -1);
  });
  $("fd-x").addEventListener("click", () => dlg.close());
  $("fd-restart").addEventListener("click", () => {
    reset();
    write(KEY, { state: "done", at: Date.now() });
    go("need", -1);
  });
  $("fd-more").addEventListener("click", more);
  $("fd-save").addEventListener("click", save);
  $("fd-share").addEventListener("click", share);
  // النافذة الصغيرة: البلاطة تفتح النافذة الكاملة على السؤال الثاني
  card.addEventListener("click", (e) => {
    const c = e.target instanceof Element ? e.target.closest("[data-v]") : null;
    if (c) open({ need: c.dataset.v });
  });
  const later = () => { hideNudge(); write(KEY, { state: "dismissed", at: Date.now() }); };
  $("fn-x").addEventListener("click", later);
  card.addEventListener("keydown", (e) => { if (e.key === "Escape") later(); });
}

// opts: opener الزر الذي فتحها (يعود إليه التركيز)، answers إجابات من رابط مشاركة، need إجابة السؤال الأول من النافذة الصغيرة
function open(opts = {}) {
  back = opts.opener || null;
  from = opts.need ? "nudge" : opts.answers ? "link" : "page";
  hideNudge();
  loadData().catch(() => {});
  let to = "need";
  const saved = read(KEY);
  if (valid(opts.answers)) { set(opts.answers); to = "res"; fresh = true; }
  else if (opts.need && optOf("need", opts.need)) { reset(); A.need = opts.need; press("need"); to = "project"; }
  else if (valid(A)) to = "res";
  else if (saved && valid(saved.a)) { set(saved.a); to = "res"; }
  else reset();
  editing = false;
  if (!dlg.open) dlg.showModal();
  go(to, 1, true);
}

function set(a) {
  for (const s of ORDER) { A[s] = a[s]; press(s); }
}
function reset() {
  for (const s of ORDER) { A[s] = null; press(s); }
}
// الإجابة الحالية في كل سؤال: aria-pressed، وهي (أو أول خيار) ما يصل إليه Tab داخل المجموعة
function press(s) {
  const all = optsOf(s);
  let cur = null;
  for (const o of all) {
    const on = o.dataset.v === A[s];
    o.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) cur = o;
  }
  rove(all, cur || all[0]);
}
function rove(all, target) {
  for (const o of all) o.tabIndex = o === target ? 0 : -1;
}

function choose(o) {
  const s = o.closest(".fd-q").dataset.step;
  A[s] = o.dataset.v;
  press(s);
  o.focus({ preventScroll: true });
  const next = editing || s === ORDER[ORDER.length - 1] ? "res" : ORDER[ORDER.indexOf(s) + 1];
  if (next === "res") { editing = false; fresh = true; }
  clearTimeout(timer);
  // لحظة قصيرة ليرى الزائر اختياره قبل الانتقال
  timer = setTimeout(() => go(next, 1), reduce ? 0 : 300);
}

// الأسهم تتنقل بين الخيارات بحسب ترتيبها على الشاشة (يمين ويسار حسب اتجاه اللغة، وأعلى وأسفل بعدد الأعمدة)
function arrows(e) {
  const o = e.target instanceof Element ? e.target.closest(".fd-o") : null;
  if (!o) return;
  const all = [...o.parentElement.querySelectorAll(".fd-o")];
  const i = all.indexOf(o);
  const kids = [...o.parentElement.children];
  const cols = kids.filter((k) => k.offsetTop === kids[0].offsetTop).length || 1;
  let j;
  if (e.key === "ArrowRight") j = i + FWD;
  else if (e.key === "ArrowLeft") j = i - FWD;
  else if (e.key === "ArrowDown") j = i + cols;
  else if (e.key === "ArrowUp") j = i - cols;
  else if (e.key === "Home") j = 0;
  else if (e.key === "End") j = all.length - 1;
  else return;
  e.preventDefault();
  const t = all[Math.max(0, Math.min(all.length - 1, j))];
  rove(all, t);
  t.focus();
}

// الانتقال إلى سؤال أو إلى النتائج: الحالي ينزلق ويتلاشى، والتالي يدخل من جهة «التالي» (أو من الجهة الأخرى عند الرجوع)
async function go(next, dir = 1, first = false) {
  clearTimeout(timer);
  const from = step ? dlg.querySelector(`.fd-q[data-step="${step}"]`) : null;
  const to = dlg.querySelector(`.fd-q[data-step="${next}"]`);
  step = next;
  if (from && from !== to && !from.hidden && !reduce && !first) {
    from.inert = true;
    const an = from.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-FWD * dir * 18}px)` }],
      { duration: 140, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" },
    );
    try { await an.finished; } catch (e) {}
    from.hidden = true;
    from.inert = false;
    an.cancel();
    if (step !== next) return;
  }
  for (const s of dlg.querySelectorAll(".fd-q")) s.hidden = s !== to;
  to.classList.remove("enter", "back");
  void to.offsetWidth;
  to.classList.add("enter");
  to.classList.toggle("back", dir < 0);
  $("fd-body").scrollTop = 0;
  const i = ORDER.indexOf(next);
  const done = i < 0 ? ORDER.length : i + 1;
  $("fd-prog").querySelectorAll("li").forEach((li, k) => li.classList.toggle("on", k < done));
  // البوصلة في السؤال الأول، وزر الرجوع مكانها في غيره
  $("fd-back").hidden = i === 0;
  $("fd-mark").hidden = i !== 0;
  dlg.setAttribute("aria-labelledby", `fd-${next}-h`);
  // أزرار النتائج تظهر مع النتائج نفسها (results)
  $("fd-foot").hidden = true;
  if (next === "res") {
    $("fd-res-h").focus({ preventScroll: true });
    results();
  } else {
    (to.querySelector('.fd-o[tabindex="0"]') || to.querySelector(".fd-o")).focus({ preventScroll: true });
  }
}

function rank(d) {
  const need = A.need === "any" ? null : A.need;
  const proj = A.project === "any" ? null : A.project;
  const kind = A.kind === "any" ? null : A.kind;
  const picks = (proj && d.picks[proj]) || [];
  const all = [];
  for (const x of d.tools) {
    if (proj && !x.p.includes(proj)) continue;
    const N = !need || x.e === need, K = !kind || x.k === kind, pick = picks.includes(x.s);
    // الدرجة: الاهتمام 6 والشكل 3، والجودة أقل من 3 دائمًا فلا تتخطى درجة
    all.push({ x, N, K, pick, score: (N ? 6 : 0) + (K ? 3 : 0) + x.q + (pick ? 0.6 : 0) });
  }
  all.sort((a, b) => b.score - a.score || b.x.sn - a.x.sn);
  return { list: all.slice(0, MAX), strict: all.filter((r) => r.N && r.K).length, need, kind };
}

// شرائح «إجاباتك»: الاسم القصير وأيقونة كل إجابة من خيارها نفسه
function answers() {
  const box = $("fd-ans");
  box.textContent = "";
  for (const s of ORDER) {
    const o = optOf(s, A[s]);
    if (!o) continue;
    const b = el("button", "fd-a");
    b.type = "button";
    b.dataset.edit = s;
    b.setAttribute("aria-label", fmt(S.edit, { a: o.dataset.c }));
    const use = o.querySelector(".fd-oi use");
    if (use) b.append(icon(use.getAttribute("href").slice(1)));
    b.append(el("bdi", "", o.dataset.c));
    box.append(b);
  }
}

async function results() {
  // ذهاب وإياب سريع قبل وصول البيانات: يُرسم آخر طلب فقط
  const id = ++drawing;
  const list = $("fd-list"), sum = $("fd-sum");
  list.textContent = "";
  $("fd-more").hidden = true;
  $("fd-kit").hidden = true;
  answers();
  sum.textContent = L.loading;
  let d;
  try { d = await loadData(); } catch (e) { if (id === drawing && step === "res") sum.textContent = L.loadError; return; }
  if (id !== drawing || step !== "res") return;
  res = rank(d);
  shown = Math.min(FIRST, res.list.length);
  sum.textContent = !res.list.length ? S.none : res.strict >= res.list.length ? S.sumAll : res.strict ? fmt(S.sumSome, { n: res.strict }) : S.sumNone;
  $("fd-foot").hidden = !res.list.length;
  draw(0);
  write(KEY, { state: "done", at: Date.now(), a: { ...A } });
  if (fresh) { fresh = false; count(); }
}

// عدّ الإجابات بلا هوية: الإجابات الثلاث ومن أين فُتحت ولغة الصفحة وعنوانها فقط، مرة لكل مجموعة إجابات في الصفحة
function count() {
  const key = ORDER.map((s) => A[s]).join(".");
  if (counted.has(key) || !navigator.sendBeacon) return;
  counted.add(key);
  const body = JSON.stringify({ kind: "finder", need: A.need, project: A.project, type: A.kind, from, lang: LANG, path: location.pathname });
  try { navigator.sendBeacon(BASE + "api/feedback", new Blob([body], { type: "application/json" })); } catch (e) {}
}

function row(r, i, k) {
  const x = r.x, id = "fdr-" + x.s;
  const li = el("li");
  li.style.setProperty("--i", k);
  const a = el("a", "fd-r");
  a.href = HOME + "tools/" + x.s;
  const mono = el("span", "mono", x.m);
  mono.setAttribute("aria-hidden", "true");
  const t = el("span", "fd-rt");
  const n = el("span", "fd-rn");
  const label = [];
  if (i === 0) {
    const top = el("span", "badge-pick", S.top);
    top.id = id + "-top";
    n.append(top);
    label.push(top.id);
  }
  const name = el("b", "", x.n);
  name.id = id + "-n";
  name.dir = "auto";
  label.push(name.id);
  const kind = el("span", "kind");
  kind.append(icon("i-" + x.ki), el("bdi", "", x.kl));
  n.append(name, kind);
  const d = el("span", "fd-rd");
  d.id = id + "-d";
  d.innerHTML = x.d; // نص مُهرَّب وقت البناء (txt في src/lib/data.ts)
  // لماذا رُشّحت: ما تطابقه من إجاباتك، و«ابدأ بهذه» للمشروع، والناشر الرسمي
  const why = el("span", "fd-why");
  why.id = id + "-w";
  const chip = (ic, text) => { const c = el("span", "fd-w"); c.append(icon(ic), text); why.append(c); };
  if (res.need && r.N) chip("i-check-bold", S.needs[res.need]);
  if (res.kind && r.K) chip("i-check-bold", S.kinds[res.kind]);
  if (r.pick) chip("i-check-bold", S.pick);
  if (x.o) chip("i-seal-check", fmt(S.official, { o: x.o }));
  if (x.st) {
    const st = el("span", "stars");
    st.append(icon("i-star-fill"), x.st);
    n.append(st);
  }
  t.append(n, d, why);
  a.append(mono, t, icon(FWD < 0 ? "i-caret-left" : "i-caret-right", "chev"));
  a.setAttribute("aria-labelledby", label.join(" "));
  a.setAttribute("aria-describedby", d.id + (why.childElementCount ? " " + why.id : ""));
  li.append(a);
  return li;
}

function draw(from) {
  const list = $("fd-list");
  for (let i = from; i < shown; i++) list.append(row(res.list[i], i, i - from));
  const left = res.list.length - shown;
  const more = $("fd-more");
  more.hidden = left <= 0;
  more.textContent = fmt(S.more, { n: Math.min(left, FIRST) });
  const top = res.list.slice(0, shown);
  const kit = $("fd-kit");
  kit.dataset.kit = top.map((r) => r.x.s).join(" ");
  // «حزمة التثبيت» (src/scripts/kit.js) حين تدخلها أداتان على الأقل
  kit.hidden = !$("kit") || top.filter((r) => r.x.i).length < 2;
  syncSave();
}

function more() {
  const from = shown;
  shown = Math.min(res.list.length, shown + FIRST);
  draw(from);
  $("fd-list").children[from]?.querySelector("a")?.focus();
}

// «احفظها في المفضلة» تصير «افتح المفضلة» حين تكون الأدوات المعروضة كلها فيها
function syncSave() {
  const favs = getFavs();
  const all = res.list.slice(0, shown).every((r) => favs.includes(r.x.s));
  $("fd-save").hidden = all;
  $("fd-favs").hidden = !all;
}
function save() {
  const n = addFavs(res.list.slice(0, shown).map((r) => r.x.s));
  say(fmt(S.saved, { n }));
  syncSave();
  $("fd-favs").focus();
}

let shareT = null;
async function share() {
  const url = location.origin + HOME + "#finder=" + ORDER.map((s) => A[s]).join(".");
  if (navigator.share) {
    try { await navigator.share({ url }); } catch (e) {}
    return;
  }
  try { await navigator.clipboard.writeText(url); } catch (e) { return; }
  const t = $("fd-share").querySelector(".fd-st");
  t.dataset.label = t.dataset.label || t.textContent;
  t.textContent = S.shareCopied;
  say(S.shareCopied);
  clearTimeout(shareT);
  shareT = setTimeout(() => { t.textContent = t.dataset.label; }, 2200);
}

// إعلان قصير لقارئات الشاشة (الحفظ والنسخ)
function say(msg) {
  const live = $("fd-live");
  live.textContent = "";
  setTimeout(() => { live.textContent = msg; }, 50);
}

function closed() {
  clearTimeout(timer);
  // أُغلقت قبل النتائج ولم تُستخدم من قبل: لا تظهر النافذة الصغيرة قبل 30 يومًا
  if (step !== "res" && !read(KEY)) write(KEY, { state: "dismissed", at: Date.now() });
  if (back && document.contains(back)) back.focus({ preventScroll: true });
  back = null;
}

function showNudge() {
  if (!card.hidden || dlg.open) return;
  card.hidden = false;
  document.body.classList.add("fn-open");
}
function hideNudge() {
  if (card.hidden) return;
  const done = () => { card.hidden = true; card.classList.remove("leaving"); document.body.classList.remove("fn-open"); };
  if (reduce) done();
  else { card.classList.add("leaving"); setTimeout(done, 260); }
}

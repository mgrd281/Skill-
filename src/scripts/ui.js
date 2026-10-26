// تفاصيل الواجهة المشتركة بين كل الصفحات: إشعار قصير، زر العودة للأعلى، اختصار البحث،
// توسيع مشاريع البطاقة، وظل الشريط اللاصق عند التمرير، وأكورديون أعمدة التذييل على الجوال.
import { L, homePath } from "../i18n/client.js";
const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

let toastEl, toastTimer;
export function toast(msg) {
  toastEl = toastEl || document.getElementById("toast");
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove("show");
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// زر العودة للأعلى: يظهر بعد تمرير طويل، وحلقته تمتلئ بنسبة ما نزلت من الصفحة. عند الضغط تصعد الصفحة بحركة واحدة سلسة
// (تسارع ثم تباطؤ) مع تمويه خفيف في منتصفها فقط، ويوقفها أي لمس أو عجلة أو مفتاح. مع «تقليل الحركة» تقفز مباشرة.
const totop = document.getElementById("totop");
if (totop) {
  let ticking = false, going = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    totop.classList.toggle("show", window.scrollY > 900);
    totop.style.setProperty("--p", max > 0 ? Math.min(100, (window.scrollY / max) * 100).toFixed(1) : "0");
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();

  let veil = null, cancel = null;
  const ease = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
  const stop = () => { if (cancel) cancel(); };
  totop.addEventListener("click", () => {
    const from = window.scrollY;
    if (reduce || from < 2) { window.scrollTo({ top: 0, behavior: "auto" }); return; }
    if (going) return;
    going = true;
    totop.classList.add("going");
    document.documentElement.style.scrollBehavior = "auto";
    if (!veil) { veil = document.createElement("div"); veil.className = "scroll-veil"; veil.setAttribute("aria-hidden", "true"); document.body.append(veil); }
    const dur = Math.min(1500, Math.max(650, from * 0.32)), peak = Math.min(1, from / 3500) * 5; // أقصى تمويه 5px للصفحة الطويلة
    const t0 = performance.now();
    let raf = 0;
    const end = () => {
      cancelAnimationFrame(raf);
      removeEventListener("wheel", stop); removeEventListener("touchstart", stop); removeEventListener("keydown", stop);
      veil.style.setProperty("--vb", "0px");
      document.documentElement.style.scrollBehavior = "";
      totop.classList.remove("going");
      going = false; cancel = null;
    };
    cancel = end;
    addEventListener("wheel", stop, { passive: true, once: true }); addEventListener("touchstart", stop, { passive: true, once: true }); addEventListener("keydown", stop, { once: true });
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, Math.round(from * (1 - ease(k))));
      veil.style.setProperty("--vb", (Math.sin(Math.PI * k) * peak).toFixed(2) + "px");
      if (k < 1) raf = requestAnimationFrame(step); else end();
    };
    raf = requestAnimationFrame(step);
  });
}

// "/" أو Ctrl/⌘+K ينقل التركيز إلى البحث، وزر × يمسحه
const q = document.getElementById("q");
const qClear = document.getElementById("q-clear");
function focusSearch() {
  if (!q) return;
  q.focus({ preventScroll: true });
  q.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
}
if (q) {
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") || document.activeElement?.isContentEditable;
    if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      focusSearch();
    }
  });
  const syncClear = () => { if (qClear) qClear.hidden = q.value === ""; };
  q.addEventListener("input", syncClear);
  syncClear();
  qClear?.addEventListener("click", () => {
    q.value = "";
    q.dispatchEvent(new Event("input", { bubbles: true }));
    q.focus();
  });
}

document.addEventListener("click", (e) => {
  if (!(e.target instanceof Element)) return;
  // زر المشاركة: قائمة المشاركة في الجوال، ونسخ الرابط على الحاسوب
  const sh = e.target.closest("[data-share]");
  if (sh) {
    const data = { title: sh.dataset.title || document.title, url: location.href.split("#")[0] };
    if (navigator.share) navigator.share(data).catch(() => {});
    else navigator.clipboard?.writeText(data.url).then(() => toast(L.shareCopied), () => {});
    return;
  }
  if (e.target.closest("[data-focus-search]")) { e.preventDefault(); focusSearch(); return; }
  const more = e.target.closest(".usemore");
  if (more) {
    more.dataset.label = more.dataset.label || more.textContent;
    const open = more.closest(".uses").classList.toggle("open");
    more.setAttribute("aria-expanded", open ? "true" : "false");
    more.textContent = open ? L.less : more.dataset.label;
    return;
  }
  // خارج الصفحة الرئيسية: شريحة المشروع تفتح الرئيسية مفلترةً بذلك المشروع
  const chip = e.target.closest("button.usechip");
  if (chip && !document.getElementById("list")) window.location.href = homePath(BASE) + "#" + chip.dataset.p;
});

// قائمة اللغة (<details> في الشريط العلوي): تُغلق بالنقر خارجها وبـ Escape، ويعود التركيز إلى زرها
const langMenu = document.getElementById("langmenu");
if (langMenu) {
  document.addEventListener("click", (e) => {
    if (langMenu.open && e.target instanceof Node && !langMenu.contains(e.target)) langMenu.open = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && langMenu.open) { langMenu.open = false; langMenu.querySelector("summary").focus(); }
  });
}

// ظل خفيف للشريط اللاصق حين يلتصق بأعلى الشاشة
const bar = document.querySelector(".bar");
if (bar && "IntersectionObserver" in window) {
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.height = "1px";
  bar.before(sentinel);
  new IntersectionObserver(([en]) => bar.classList.toggle("stuck", !en.isIntersecting)).observe(sentinel);
}

// أعمدة التذييل (<details>): مفتوحة دائمًا على الشاشات الواسعة، وأكورديون مغلق على الجوال (الحد نفسه في global.css)
const footCols = document.querySelectorAll(".foot-col");
if (footCols.length) {
  const narrow = window.matchMedia("(max-width: 560px)");
  const sync = () => footCols.forEach((d) => (d.open = !narrow.matches));
  narrow.addEventListener("change", sync);
  sync();
  footCols[0].parentElement.addEventListener("click", (e) => {
    if (!narrow.matches && e.target.closest(".foot-col > summary")) e.preventDefault();
  });
}

// الإعلان (src/components/Sponsor.astro) ينتهي بنهاية يوم until: يُخفى للزائر حتى لو لم يُبنَ الموقع من جديد بعد
for (const el of document.querySelectorAll("[data-until]")) {
  if (Date.now() > new Date(el.dataset.until + "T23:59:59").getTime()) el.hidden = true;
}

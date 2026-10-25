// تفاصيل الواجهة المشتركة بين كل الصفحات: إشعار قصير، زر العودة للأعلى، اختصار البحث،
// توسيع مشاريع البطاقة، وظل الشريط اللاصق عند التمرير.
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

// زر العودة للأعلى يظهر بعد تمرير طويل
const totop = document.getElementById("totop");
if (totop) {
  const onScroll = () => totop.classList.toggle("show", window.scrollY > 900);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  totop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));
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

// ظل خفيف للشريط اللاصق حين يلتصق بأعلى الشاشة
const bar = document.querySelector(".bar");
if (bar && "IntersectionObserver" in window) {
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.height = "1px";
  bar.before(sentinel);
  new IntersectionObserver(([en]) => bar.classList.toggle("stuck", !en.isIntersecting)).observe(sentinel);
}

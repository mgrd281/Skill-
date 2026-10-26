// شخصية الدليل (src/components/Mascot.astro): العينان تتابعان مؤشر الفأرة، وتقفز عند لمسها أو الضغط عليها.
// لا شيء مع تقليل الحركة: تبقى واقفة تنظر إلى الأمام.
const m = document.querySelector("[data-mascot]");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (m && !reduce) {
  // الرسم معكوس في العربية (يمشي بجهة القراءة)، فيُعكس اتجاه النظر الأفقي أيضًا
  const flip = document.documentElement.dir === "rtl" ? -1 : 1;
  let shown = true, frame = 0, x = 0, y = 0;
  if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { shown = e.isIntersecting; }).observe(m);

  function look() {
    frame = 0;
    const r = m.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height * 0.42);
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 260); // قريبًا من الوجه لا تتحرك العينان إلى آخرهما
    m.style.setProperty("--px", ((dx / d) * 3.4 * k * flip).toFixed(2) + "px");
    m.style.setProperty("--py", ((dy / d) * 2.8 * k).toFixed(2) + "px");
  }
  window.addEventListener("pointermove", (e) => {
    if (!shown || e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    if (!frame) frame = requestAnimationFrame(look);
  }, { passive: true });
  // المؤشر خارج النافذة: تعود لتنظر إلى الأمام
  document.documentElement.addEventListener("pointerleave", () => { m.style.removeProperty("--px"); m.style.removeProperty("--py"); });

  m.addEventListener("pointerdown", () => {
    m.classList.remove("hop");
    void m.offsetWidth;
    m.classList.add("hop");
  });
  m.addEventListener("animationend", (e) => { if (e.animationName === "m-hop") m.classList.remove("hop"); });
}

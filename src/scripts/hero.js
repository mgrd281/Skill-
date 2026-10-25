// حركة الصفحة الأولى: المعرض المتحرك والأرقام الدوّارة. الحركة نفسها في global.css (قسم "الموشن")،
// وهذا السكربت يبدّل الحالات فقط. مع تقليل الحركة لا يعمل شيء منه، فيبقى المعرض ثابتًا والأرقام بقيمتها.
const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- المعرض: كل بضع ثوانٍ تتقدم البطاقة التالية إلى الواجهة ----
// يتوقف حين يخرج من الشاشة، أو تُخفى الصفحة، أو يمر عليه المؤشر (حتى لا تتحرك البطاقة تحت يد الزائر).
const deck = document.querySelector("[data-deck]");
if (deck && !reduce && "IntersectionObserver" in window) {
  const cards = [...deck.querySelectorAll(".deck-card")];
  const HOLD = 4800, FIRST = 6000, MOVE = 1000;
  let front = 0, timer = 0, inView = false, hover = false;
  const next = () => {
    // التي في الواجهة تخرج إلى الموضع الأخير (.leave)، والأخيرة تنتقل إلى موضع التالية (.shift)
    const leaving = cards[front];
    const shifting = cards.find((c) => c.dataset.pos === "2");
    front = (front + 1) % cards.length;
    deck.classList.add("deck-on");
    leaving.classList.add("leave");
    if (shifting) shifting.classList.add("shift");
    setTimeout(() => { leaving.classList.remove("leave"); if (shifting) shifting.classList.remove("shift"); }, MOVE);
    cards.forEach((c, k) => { c.dataset.pos = String((k - front + cards.length) % cards.length); });
    schedule();
  };
  const schedule = () => {
    clearTimeout(timer);
    if (inView && !hover && !document.hidden) timer = setTimeout(next, deck.classList.contains("deck-on") ? HOLD : FIRST);
  };
  if (cards.length > 1) {
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; schedule(); }, { threshold: 0.4 }).observe(deck);
    deck.addEventListener("pointerenter", () => { hover = true; schedule(); });
    deck.addEventListener("pointerleave", () => { hover = false; schedule(); });
    document.addEventListener("visibilitychange", schedule);
  }
}

// ---- الأرقام: تدور مع حركة دخولها (CSS)، والتي خارج الشاشة تنتظر حتى تظهر ----
const odos = [...document.querySelectorAll(".odo")];
if (odos.length && !reduce && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    en.target.classList.remove("wait");
  }), { threshold: 0.6 });
  odos.forEach((o) => {
    const r = o.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;
    o.classList.add("wait");
    io.observe(o);
  });
}

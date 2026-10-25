// الانتقال بين الصفحات في المتصفحات التي تدعم View Transitions بين المستندات (التفعيل في <head> داخل Base.astro).
// حين يُفتح رابط أداة من بطاقة، يُسمّى مربع حرفيها tool-icon لحظة مغادرة الصفحة، فيكبر ويستقر مكان
// أيقونة صفحة الأداة (التي تحمل الاسم نفسه دائمًا). بقية الصفحة تتلاشى إلى الصفحة الجديدة.
const NAME = "tool-icon";
const BOX = ".card, .deck-card, .latest-item, .nf-item";
const path = (u) => new URL(u, location.href).pathname.replace(/\/$/, "");
let link = null;
const named = [];
const clear = () => { while (named.length) named.pop().style.viewTransitionName = ""; };

document.addEventListener("click", (e) => { link = e.target instanceof Element ? e.target.closest("a[href]") : null; }, true);
// الصفحة قد تعود من ذاكرة الرجوع (bfcache) بالاسم الذي أعطيناه، فنزيله حتى لا يتكرر
window.addEventListener("pageshow", clear);
window.addEventListener("pageswap", (e) => {
  clear();
  // إن أُلغي الانتقال (صفحة خُبّئت، أو تأخرت الجديدة) يرفض المتصفح هذا الوعد، وهذا متوقع لا خطأ
  if (e.viewTransition) e.viewTransition.ready.catch(() => {});
  const to = e.activation && e.activation.entry && e.activation.entry.url;
  if (!e.viewTransition || !to || !link || e.activation.navigationType !== "push") return;
  if (path(link.href) !== path(to) || !/\/tools\/[^/]+$/.test(path(to))) return;
  const box = link.closest(BOX);
  const mono = box && box.querySelector(".mono");
  if (!mono) return;
  const r = mono.getBoundingClientRect();
  if (!r.width || r.bottom < 0 || r.top > window.innerHeight) return;
  // في صفحة أداة: أيقونتها الكبيرة تحمل الاسم، فننزعه عنها حتى لا يتكرر مع البطاقة المضغوطة
  const own = document.querySelector(".p-hero .mono.xl");
  if (own) { own.style.viewTransitionName = "none"; named.push(own); }
  mono.style.viewTransitionName = NAME;
  named.push(mono);
});

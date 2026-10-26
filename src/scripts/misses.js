// عمليات البحث التي لم تجد نتيجة: تُجمع أثناء الزيارة وتُرسل حين يغادر الزائر الصفحة أو يخفيها، بلا هوية
// (api/feedback.js بنوع miss)، لنعرف ما يبحث عنه الناس ولا يجدونه في الدليل. تُسجَّل الكلمة إن بقيت بلا نتيجة ثانية ونصفًا.
import { BASE } from "./search-data.js";

const MAX = 5, WAIT = 1500;
const queue = new Set();
let timer = 0, sends = 0;

// تُستدعى كلما ظهرت «لا نتيجة» لبحث، وتُلغى بأي عرض بعده (clearMiss)
export function noteMiss(q) {
  clearTimeout(timer);
  const v = String(q || "").trim().toLowerCase().slice(0, 100);
  if (v.length < 3) return;
  timer = setTimeout(() => { if (queue.size < MAX) queue.add(v); }, WAIT);
}
export function clearMiss() { clearTimeout(timer); }

function flush() {
  if (!queue.size || sends >= 3 || !navigator.sendBeacon) return;
  // كلمة هي بداية كلمة أخرى في القائمة («fig» ثم «figma») لا تُرسل
  const qs = [...queue].filter((q, _, all) => !all.some((o) => o !== q && o.startsWith(q)));
  queue.clear();
  sends++;
  const body = JSON.stringify({ kind: "miss", queries: qs, lang: document.documentElement.lang, path: location.pathname });
  try { navigator.sendBeacon(BASE + "api/feedback", new Blob([body], { type: "application/json" })); } catch (e) {}
}
addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

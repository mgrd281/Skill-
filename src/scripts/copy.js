// نسخ أمر التثبيت عند الضغط على زر "نسخ" داخل أي .cmd (data-toast: نص الإشعار إن اختلف عن "تم نسخ أمر التثبيت")
import { toast } from "./ui.js";
import { L } from "../i18n/client.js";

// نسخ أمر تثبيت يُعدّ لقسم «الأكثر نسخًا هذا الأسبوع» (api/copy.js): مرة في اليوم لكل أداة في هذا المتصفح، بلا هوية.
// أمثلة الطلب (.prompt) لا تُعدّ. اسم الأداة من أقرب [data-slug]. ولا يُرسل شيء محليًا (الدالة تعمل على Vercel فقط).
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const CKEY = "toolkit-copied-v1";
function countCopy(c) {
  const slug = !c.closest(".prompt") && c.closest("[data-slug]")?.dataset.slug;
  if (!slug || LOCAL || !navigator.sendBeacon) return;
  const today = new Date().toISOString().slice(0, 10);
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(CKEY) || "{}") || {}; } catch (e) {}
  if (seen[slug] === today) return;
  for (const k of Object.keys(seen)) if (seen[k] !== today) delete seen[k];
  seen[slug] = today;
  try { localStorage.setItem(CKEY, JSON.stringify(seen)); } catch (e) {}
  try { navigator.sendBeacon(BASE + "api/copy", new Blob([JSON.stringify({ slug })], { type: "application/json" })); } catch (e) {}
}

export function initCopy(root = document) {
  root.addEventListener("click", (e) => {
    const c = e.target.closest(".copy");
    if (!c) return;
    const code = c.parentNode.querySelector("code");
    const label = c.querySelector(".copy-t");
    const text = code.textContent;
    const done = (msg, ok) => {
      if (label) label.textContent = ok ? L.copied : L.copy;
      c.classList.toggle("copied", ok);
      toast(msg);
      setTimeout(() => {
        c.classList.remove("copied");
        if (label) label.textContent = L.copy;
      }, 1800);
    };
    const fallback = () => {
      try {
        const r = document.createRange();
        r.selectNodeContents(code);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      } catch (err) {}
      done(L.copyManual, false);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => { done(c.dataset.toast || L.copiedToast, true); countCopy(c); }, fallback);
    } else {
      fallback();
    }
  });
}

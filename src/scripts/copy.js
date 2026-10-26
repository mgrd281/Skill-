// نسخ أمر التثبيت عند الضغط على زر "نسخ" داخل أي .cmd (data-toast: نص الإشعار إن اختلف عن "تم نسخ أمر التثبيت")
import { toast } from "./ui.js";
import { L } from "../i18n/client.js";

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
      navigator.clipboard.writeText(text).then(() => done(c.dataset.toast || L.copiedToast, true), fallback);
    } else {
      fallback();
    }
  });
}

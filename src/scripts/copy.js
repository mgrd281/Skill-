// نسخ أمر التثبيت عند الضغط على زر "نسخ" داخل أي .cmd
export function initCopy(root = document) {
  root.addEventListener("click", (e) => {
    const c = e.target.closest(".copy");
    if (!c) return;
    const code = c.parentNode.querySelector("code");
    const text = code.textContent;
    const done = (label) => {
      c.textContent = label;
      setTimeout(() => { c.textContent = "نسخ"; }, 1800);
    };
    const fallback = () => {
      try {
        const r = document.createRange();
        r.selectNodeContents(code);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      } catch (err) {}
      done("حدّده وانسخه");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => done("تم النسخ"), fallback);
    } else {
      fallback();
    }
  });
}

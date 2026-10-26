// «اقترح أداة» (src/components/SuggestDialog.astro): نافذة باسم الأداة أو رابطها وسبب اختياري، تُرسل إلى api/feedback بنوع suggest.
import { L } from "../i18n/client.js";
import { BASE } from "./search-data.js";

const dlg = document.getElementById("suggest");
if (dlg) {
  const form = document.getElementById("sg-form"), send = document.getElementById("sg-send"), err = document.getElementById("sg-err");
  const done = document.getElementById("sg-done");
  let back = null;
  const ready = () => { send.disabled = form.tool.value.trim().length < 2; };

  document.addEventListener("click", (e) => {
    const b = e.target instanceof Element ? e.target.closest("[data-suggest]") : null;
    if (!b) return;
    back = document.activeElement;
    form.hidden = false;
    done.hidden = true;
    err.hidden = true;
    // من «لا نتيجة»: ما بحث عنه الزائر هو غالبًا اسم الأداة
    if (b.dataset.suggestTool && !form.tool.value.trim()) form.tool.value = b.dataset.suggestTool;
    ready();
    dlg.showModal();
    form.tool.focus();
  });
  const close = () => dlg.close();
  document.getElementById("sg-x").addEventListener("click", close);
  document.getElementById("sg-close").addEventListener("click", close);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener("close", () => { if (back && document.contains(back)) back.focus({ preventScroll: true }); });
  form.addEventListener("input", ready);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.tool.value.trim().length < 2) return;
    send.disabled = true;
    err.hidden = true;
    try {
      const r = await fetch(BASE + "api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "suggest", tool: form.tool.value, message: form.message.value, website: form.website.value,
          lang: document.documentElement.lang, path: location.pathname,
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      form.reset();
      form.hidden = true;
      done.hidden = false;
      document.getElementById("sg-close").focus();
    } catch (x) {
      err.textContent = L.fbError;
      err.hidden = false;
      send.disabled = false;
    }
  });
}

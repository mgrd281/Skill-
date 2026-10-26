// «أبلغ عن مشكلة» (src/components/ReportDialog.astro): نافذة بسبب ورسالة، تُرسل إلى api/feedback بنوع report.
import { L } from "../i18n/client.js";

const dlg = document.getElementById("report");
if (dlg) {
  const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  const form = document.getElementById("rp-form"), send = document.getElementById("rp-send"), err = document.getElementById("rp-err");
  const done = document.getElementById("rp-done");
  let back = null;

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element) || !e.target.closest("[data-report]")) return;
    back = document.activeElement;
    form.hidden = false;
    done.hidden = true;
    err.hidden = true;
    dlg.showModal();
    form.querySelector('input[name="reason"]').focus();
  });
  const close = () => dlg.close();
  document.getElementById("rp-x").addEventListener("click", close);
  document.getElementById("rp-close").addEventListener("click", close);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener("close", () => { if (back && document.contains(back)) back.focus({ preventScroll: true }); });
  form.addEventListener("change", () => { send.disabled = !form.reason.value; });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reason.value) return;
    send.disabled = true;
    err.hidden = true;
    try {
      const r = await fetch(BASE + "api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "report", slug: dlg.dataset.slug, reason: form.reason.value, message: form.message.value,
          website: form.website.value, lang: document.documentElement.lang, path: location.pathname,
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      form.reset();
      form.hidden = true;
      done.hidden = false;
      document.getElementById("rp-close").focus();
    } catch (x) {
      err.textContent = L.fbError;
      err.hidden = false;
      send.disabled = false;
    }
  });
}

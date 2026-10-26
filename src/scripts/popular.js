// «الأكثر نسخًا هذا الأسبوع» في الرئيسية (api/popular.js): يظهر القسم إن وصلت ثلاث أدوات على الأقل، وإلا يبقى مخفيًا،
// كما قبل ربط مخزن العدّاد. يُطلب حين يفرغ المتصفح، ولا يُطلب محليًا (الدوال تعمل على Vercel فقط).
import { BASE } from "./search-data.js";

const sec = document.getElementById("popular");
if (sec && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  const data = JSON.parse(document.getElementById("app-data").textContent);
  const initials = (name) => {
    const words = name.split(/[\s\-_/.]+/).filter((w) => /[A-Za-z0-9]/.test(w));
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    const w = (words[0] || name).replace(/[^A-Za-z0-9]/g, "");
    return (w[0] || "?").toUpperCase() + (w[1] || "").toLowerCase();
  };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const run = () => fetch(BASE + "api/popular").then((r) => (r.ok ? r.json() : null)).then((j) => {
    const by = new Map(data.tools.map((x) => [x.s, x]));
    const list = ((j && j.tools) || []).filter((x) => by.has(x.s)).slice(0, 8);
    if (list.length < 3) return;
    const ol = document.getElementById("pop-list");
    list.forEach((x, i) => {
      const t = by.get(x.s);
      const a = el("a", "pop-item");
      a.href = data.base + x.s;
      const mono = el("span", "mono sm", initials(t.nm));
      mono.setAttribute("aria-hidden", "true");
      const tt = el("span", "pop-t");
      const b = el("b", null, t.nm);
      b.dir = "auto";
      tt.append(b, el("small", null, data.catNames[t.c] || ""));
      a.append(el("span", "pop-n", String(i + 1)), mono, tt);
      const li = el("li");
      li.append(a);
      ol.append(li);
    });
    sec.hidden = false;
  }).catch(() => {});
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

// «ساعدني أختار»: المدخل في كل صفحة، وهو خفيف. النافذة (src/views/FinderFragment.astro) وسكربتها (finder-app.js)
// يُحمَّلان عند الحاجة فقط: عند الضغط على أي [data-finder]، أو قبله بلحظة حين يمر المؤشر عليه أو يلمسه،
// أو قبل موعد النافذة الصغيرة بخمس ثوانٍ. الرابط #finder يفتحها، و#finder=<اهتمام>.<مشروع>.<شكل> يفتح نتيجة بعينها.
// النافذة الصغيرة: مرة واحدة بعد 25 ثانية من التصفح الفعلي (تُحسب عبر صفحات الجلسة والصفحة ظاهرة)، ولا تظهر مع نافذة
// الرأي في الجلسة نفسها (أيهما يظهر أولًا يسجل نفسه في toolkit-auto-popup). تظهر مرة كل 30 يومًا على الأكثر
// (أغلقها الزائر أو تجاهلها)، وإن وصل إلى النتائج لا تعود أبدًا (الحالة في toolkit-finder-v1).
import { L, homePath } from "../i18n/client.js";

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
const HOME = homePath(BASE);
const KEY = "toolkit-finder-v1", TKEY = "toolkit-fn-time", POP = "toolkit-auto-popup";
const SHOW_AFTER = 25, TICK = 5, SNOOZE_DAYS = 30;

const read = (k, store = localStorage) => { try { return JSON.parse(store.getItem(k) || "null"); } catch (e) { return null; } };
const write = (k, v, store = localStorage) => { try { store.setItem(k, JSON.stringify(v)); } catch (e) {} };

let pending = null, shellOff = null;
function load() {
  if (!pending) {
    pending = Promise.all([
      fetch(HOME + "finder/").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); }),
      import("./finder-app.js"),
    ])
      .then(([html, app]) => app.mount(html))
      .catch((e) => { pending = null; throw e; });
  }
  return pending;
}

// فتح من زر أو رابط: إن لم تصل النافذة بعد تظهر فورًا بحالة «جارٍ التحميل»، ثم يملؤها finder-app.js في مكانها
async function open(opts) {
  let shell = null;
  if (!document.querySelector("#finder .fd-body")) {
    shell = document.getElementById("finder");
    if (!shell) {
      shell = document.createElement("dialog");
      shell.id = "finder";
      document.body.append(shell);
    }
    shell.className = "fd fd-wait";
    shell.setAttribute("aria-label", L.finder);
    shell.innerHTML = `<button type="button" class="qs-x" aria-label="${L.close}"><svg class="i" aria-hidden="true"><use href="#i-x-bold"></use></svg></button><p class="fd-wait-t" role="status"></p>`;
    shell.querySelector(".fd-wait-t").textContent = L.loading;
    // مستمعات نافذة التحميل وحدها: تُلغى حين تحل محلها النافذة الكاملة، أو قبل محاولة جديدة بعد فشل
    shellOff?.abort();
    shellOff = new AbortController();
    const signal = shellOff.signal;
    shell.querySelector(".qs-x").addEventListener("click", () => shell.close(), { signal });
    shell.addEventListener("click", (e) => { if (e.target === shell) shell.close(); }, { signal });
    shell.addEventListener("close", () => { if (opts.opener && document.contains(opts.opener)) opts.opener.focus({ preventScroll: true }); }, { signal });
    if (!shell.open) shell.showModal();
  }
  try {
    const app = await load();
    if (shell) { shellOff?.abort(); shellOff = null; }
    shell?.removeAttribute("aria-label");
    // أُغلقت نافذة التحميل قبل أن تصل النافذة: لا تُفتح فجأة بعد ذلك
    if (shell && !shell.open) return;
    app.open(opts);
  } catch (e) {
    const t = shell?.querySelector(".fd-wait-t");
    if (t) t.textContent = L.loadError;
  }
}

document.addEventListener("click", (e) => {
  const b = e.target instanceof Element ? e.target.closest("[data-finder]") : null;
  if (!b) return;
  e.preventDefault();
  open({ opener: b });
});
// يبدأ التحميل حين يقترب الزائر من الزر، فتكون النافذة جاهزة غالبًا لحظة الضغط
const warm = (e) => { if (e.target instanceof Element && e.target.closest("[data-finder]")) load().catch(() => {}); };
document.addEventListener("pointerover", warm, { passive: true });
document.addEventListener("focusin", warm);
document.addEventListener("touchstart", warm, { passive: true });

// رابط مشاركة النتيجة: يُزال من العنوان بعد قراءته حتى لا تُفتح النافذة مرة أخرى عند إعادة التحميل
const m = /^#finder(?:=([\w-]+)\.([\w-]+)\.([\w-]+))?$/.exec(location.hash);
if (m) {
  history.replaceState(history.state, "", location.pathname + location.search);
  open({ answers: m[1] ? { need: m[1], project: m[2], kind: m[3] } : null });
}

function allowed() {
  const s = read(KEY);
  if (!s) return true;
  if (s.state === "done") return false;
  return Date.now() - (s.at || 0) > SNOOZE_DAYS * 864e5;
}
// لا نقاطع الزائر وهو يكتب، أو ولوحة أو نافذة مفتوحة
function busy() {
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
  return !!document.querySelector(".catpanel:not([hidden]), .notif:not([hidden]), .fb:not([hidden]), dialog[open]");
}
if (!m && allowed() && !read(POP, sessionStorage)) {
  const timer = setInterval(() => {
    if (document.hidden) return;
    const t = (read(TKEY, sessionStorage) || 0) + TICK;
    write(TKEY, t, sessionStorage);
    if (t >= SHOW_AFTER - TICK) load().catch(() => {});
    if (t < SHOW_AFTER || busy()) return;
    clearInterval(timer);
    if (read(POP, sessionStorage) || !allowed()) return;
    load().then((app) => {
      if (busy() || read(POP, sessionStorage)) return;
      write(POP, "finder", sessionStorage);
      // مرة كل 30 يومًا حتى لو تجاهلها الزائر وانتقل إلى صفحة أخرى (الوصول إلى النتائج يجعلها «done» فلا تعود)
      write(KEY, { state: "dismissed", at: Date.now() });
      app.nudge();
    }).catch(() => {});
  }, TICK * 1000);
}

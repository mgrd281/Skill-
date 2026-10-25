// نافذة "رأيك": تظهر مرة واحدة بعد دقيقة من التصفح الفعلي (تُحسب عبر الصفحات في الجلسة نفسها).
// إن أغلقها الزائر لا تعود قبل 30 يومًا، وإن أرسل رأيه لا تعود أبدًا. رابط التذييل يفتحها في أي وقت.
import { L } from "../i18n/client.js";

const KEY = "toolkit-feedback-v1", TKEY = "toolkit-fb-time";
const SHOW_AFTER = 60, TICK = 5, SNOOZE_DAYS = 30;
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
const box = document.getElementById("fb");
const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const read = (k, store = localStorage) => { try { return JSON.parse(store.getItem(k) || "null"); } catch (e) { return null; } };
const write = (k, v, store = localStorage) => { try { store.setItem(k, JSON.stringify(v)); } catch (e) {} };

function allowed() {
  const s = read(KEY);
  if (!s) return true;
  if (s.state === "done") return false;
  return Date.now() - (s.at || 0) > SNOOZE_DAYS * 864e5;
}

if (box) {
  const form = document.getElementById("fb-form"), stars = document.getElementById("fb-stars");
  const send = document.getElementById("fb-send"), err = document.getElementById("fb-err");
  const done = document.getElementById("fb-done"), msg = document.getElementById("fb-msg");
  let timer = null, opener = null;

  function open(manual) {
    if (!box.hidden) return;
    opener = manual ? document.activeElement : null;
    box.hidden = false;
    document.body.classList.add("fb-open");
    // عند الفتح التلقائي لا نسحب التركيز من الزائر، وعند الفتح من الرابط ننقله إلى النجوم
    if (manual) stars.querySelector("input")?.focus({ preventScroll: true });
  }
  function close(state) {
    if (box.hidden) return;
    const hide = () => { box.hidden = true; box.classList.remove("leaving"); document.body.classList.remove("fb-open"); };
    if (reduce) hide(); else { box.classList.add("leaving"); setTimeout(hide, 260); }
    if (state) write(KEY, { state, at: Date.now() });
    clearInterval(timer);
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
  }

  // تلوين النجوم حتى النجمة المختارة أو التي تحت المؤشر
  const paint = (n) => { stars.dataset.v = n || ""; };
  const checked = () => Number(form.rating.value) || 0;
  stars.addEventListener("pointerover", (e) => { const l = e.target.closest("label"); if (l) paint(l.dataset.n); });
  stars.addEventListener("pointerleave", () => paint(checked()));
  stars.addEventListener("change", () => { paint(checked()); send.disabled = !checked(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!checked()) return;
    send.disabled = true;
    err.hidden = true;
    try {
      const r = await fetch(BASE + "api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: checked(), message: msg.value, website: form.website.value, lang: document.documentElement.lang, path: location.pathname }),
      });
      if (!r.ok) throw new Error(String(r.status));
      form.hidden = true;
      done.hidden = false;
      write(KEY, { state: "done", at: Date.now() });
      setTimeout(() => close(null), 3200);
    } catch (x) {
      err.textContent = L.fbError;
      err.hidden = false;
      send.disabled = false;
    }
  });

  document.getElementById("fb-x").addEventListener("click", () => close(form.hidden ? null : "dismissed"));
  box.addEventListener("keydown", (e) => { if (e.key === "Escape") close(form.hidden ? null : "dismissed"); });
  document.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest("[data-feedback]")) { e.preventDefault(); form.hidden = false; done.hidden = true; open(true); }
  });

  // عدّاد وقت التصفح الفعلي: يتقدم فقط والصفحة ظاهرة
  if (allowed()) {
    timer = setInterval(() => {
      if (document.hidden) return;
      const t = (read(TKEY, sessionStorage) || 0) + TICK;
      write(TKEY, t, sessionStorage);
      if (t < SHOW_AFTER) return;
      // لا نقاطع الزائر وهو يكتب في البحث أو داخل لوحة مفتوحة
      const a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
      if (document.querySelector(".catpanel:not([hidden]), .notif:not([hidden])")) return;
      clearInterval(timer);
      open(false);
    }, TICK * 1000);
  }
}

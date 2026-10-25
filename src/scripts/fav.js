// المفضلة: قلب على كل أداة، والقائمة تُحفظ في متصفح الزائر وتظهر في صفحة /favorites
import { L, fmt } from "../i18n/client.js";
const KEY = "toolkit-fav-v1";
let favs = load();
const listeners = [];

function load() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(a) ? a.filter((s) => typeof s === "string") : [];
  } catch (e) { return []; }
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(favs)); } catch (e) {}
}

export const getFavs = () => favs.slice();
export const isFav = (slug) => favs.includes(slug);
export function onFavChange(cb) { listeners.push(cb); }

function notify(changed) {
  sync();
  listeners.forEach((cb) => cb(changed));
}

export function toggleFav(slug) {
  if (favs.includes(slug)) favs = favs.filter((s) => s !== slug);
  else favs = [slug, ...favs]; // الأحدث أولًا
  persist();
  notify(slug);
}
export function clearFavs() {
  favs = [];
  persist();
  notify(null);
}

// يحدّث كل أزرار القلب وعدّاد الرأس في الصفحة
export function sync() {
  document.querySelectorAll(".fav").forEach((b) => {
    const on = favs.includes(b.dataset.fav);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    const name = b.dataset.name || "";
    b.setAttribute("aria-label", fmt(on ? L.favRemove : L.favAdd, { name }));
    b.title = on ? L.favRemoveTitle : L.favAddTitle;
    const label = b.querySelector(".fav-label");
    if (label) label.textContent = on ? L.favOn : L.favOff;
  });
  document.querySelectorAll(".favcount").forEach((c) => {
    c.hidden = favs.length === 0;
    c.textContent = favs.length > 99 ? "99+" : String(favs.length);
  });
  document.querySelectorAll(".heartlink").forEach((a) => {
    a.setAttribute("aria-label", favs.length ? fmt(L.favsN, { n: favs.length }) : L.favs);
  });
}

export function initFav() {
  sync();
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".fav");
    if (!b) return;
    e.preventDefault();
    toggleFav(b.dataset.fav);
    b.classList.remove("pop");
    void b.offsetWidth;
    if (b.getAttribute("aria-pressed") === "true") b.classList.add("pop");
  });
  // مزامنة بين التبويبات المفتوحة
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) { favs = load(); notify(null); }
  });
}

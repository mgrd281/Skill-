// بطاقات الأدوات التي لم تُرسم في الصفحة: تُجلب مرة واحدة من /cards/ (src/views/CardsFragment.astro)، ويُقرأ منها
// ما سيُعرض فقط، بطاقةً بطاقة، فلا مهمة طويلة تجمّد الصفحة. تستخدمها الرئيسية (filter.js) والمفضلة.
import { initDates } from "./dates.js";
import { syncFavButtons } from "./fav.js";
import { HOME } from "./search-data.js";

let pieces = null, pending = null;
export function loadCards() {
  if (pieces) return Promise.resolve();
  if (!pending) {
    pending = fetch(HOME + "cards/")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
      .then((html) => {
        const m = new Map();
        for (const part of html.split("<!--card-->")) {
          const s = /data-slug="([^"]+)"/.exec(part);
          if (s) m.set(s[1], part);
        }
        pieces = m;
      })
      .catch((e) => { pending = null; throw e; });
  }
  return pending;
}
export const cardsLoaded = () => !!pieces;
export const hasCard = (slug) => !!pieces && pieces.has(slug);

// بطاقة أداة جاهزة للعرض (تاريخها النسبي وحالة زر المفضلة)، أو null إن لم تصل البطاقات بعد
export function makeCard(slug) {
  const html = pieces && pieces.get(slug);
  if (!html) return null;
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  initDates(tpl.content);
  syncFavButtons(tpl.content);
  return tpl.content.querySelector(".card");
}

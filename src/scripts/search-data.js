// فهرس البحث (src/lib/search-index.ts): يُحمَّل مرة واحدة عند أول حاجة إليه، ويشترك فيه بحث الصفحة الرئيسية
// والبحث السريع وحزمة التثبيت.
import { homePath } from "../i18n/client.js";
import { makeDoc, addVocab, translitWords } from "../lib/search.js";

export const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
export const HOME = homePath(BASE);

let pending = null;
export function loadIndex() {
  if (!pending) {
    pending = fetch(HOME + "search.json")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .catch((e) => { pending = null; throw e; });
  }
  return pending;
}

// وثيقة البحث لأداة من الفهرس (الحقول في src/lib/search.js)
export const docOf = (x) => makeDoc({ n: x.n, t: x.t, u: x.u, d: x.d, o: x.o, c: x.m });

// مفردات «هل تقصد»: كل كلمات الفهرس مع عدد الأدوات التي تحويها، وكتابات الأسماء التقنية بالعربية
export function vocabOf(docs) {
  const v = new Map();
  for (const d of docs) addVocab(v, [d.n, d.t, d.u, d.d, d.o].join(" "));
  for (const w of translitWords()) if (!v.has(w)) v.set(w, 1);
  return v;
}

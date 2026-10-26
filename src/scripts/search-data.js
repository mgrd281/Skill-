// فهرس البحث (src/lib/search-index.ts): يُحمَّل مرة واحدة عند أول حاجة إليه، ويشترك فيه بحث الصفحة الرئيسية
// والبحث السريع وحزمة التثبيت.
import { homePath } from "../i18n/client.js";
import { words, makeDoc, makeVocab, translitWords } from "../lib/search.js";

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

// وثيقة البحث لأداة من الفهرس (الحقول في src/lib/search.js). كلمات الفهرس بشكلها المكتوب، فتُطبَّع هنا
export const docOf = (x) => makeDoc({ n: x.n, t: words(x.t), u: words(x.u), d: words(x.d), o: words(x.o), c: x.m });
// نص الأداة كما يُكتب، لمفردات «هل تقصد»
export const rawText = (x) => [x.n, x.t, x.u, x.d, x.o].join(" ");

// مفردات «هل تقصد» من نص كل أداة: كل كلمة مع عدد الأدوات التي تحويها وشكلها المكتوب، وكتابات الأسماء التقنية بالعربية.
// تُبنى عند أول بحث بلا نتيجة فقط
export const vocabOf = (texts) => makeVocab(texts, translitWords());

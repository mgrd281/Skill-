// البحث في الدليل: تطبيع واحد للفهرس وللكلمة المكتوبة، وترتيب حسب القرب، واقتراح «هل تقصد» حين لا توجد نتيجة.
// يُستخدم وقت البناء (src/lib/search-index.ts) وفي المتصفح (src/scripts/filter.js وsrc/scripts/quick-search.js).

// أحرف صغيرة، بلا تشكيل ولا تطويل، وصور الحرف الواحد حرف واحد (أ إ آ ٱ ← ا، ى ← ي، ة ← ه، ؤ ← و، ئ ← ي)،
// والأرقام العربية لاتينية، والحروف اللاتينية بلا علامات (ä ← a، é ← e)، وكل ما ليس حرفًا أو رقمًا مسافة.
// NFD يفصل الهمزة والمدة عن الألف والواو والياء، فتُحذف مع التشكيل.
export function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/[ٱ-ٳٵ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ک/g, "ك")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// كلمات نص مطبَّع بلا تكرار (للفهرس: أصغر حجمًا والنتيجة نفسها)
export function words(s) {
  return [...new Set(norm(s).split(" ").filter((w) => w.length > 1))].join(" ");
}

const AR = /[؀-ۿ]/;
// "ال" وأخواتها في أول الكلمة، وعلامات الجمع والتاء المربوطة (بعد التطبيع هاء) في آخرها
const AR_PRE = /^(?:وال|بال|كال|فال|لل|ال)/;
const AR_SUF = /(?:ات|ون|ين|ه)$/;

// أسماء تقنية يكتبها الزائر العربي بحروف عربية («فيجما»، «شوبيفاي»، «انيميشن») ونصوص الدليل تكتبها باللاتينية.
// المفتاح الكلمة الإنجليزية، والقيمة طرق كتابتها بالعربية مفصولة بمسافة. العبارات متعددة الكلمات في TRANSLIT_PHRASES.
const TRANSLIT = {
  claude: "كلود كلاود", anthropic: "انثروبيك انثروبك", shopify: "شوبيفاي شوبفاي شوبيفي شوبفي", figma: "فيجما فيغما فجما فيقما",
  react: "رياكت ريكت", flutter: "فلاتر", python: "بايثون بيثون", javascript: "جافاسكربت جافاسكريبت", typescript: "تايبسكربت تايبسكريبت",
  swift: "سويفت", swiftui: "سويفتيواي", next: "نكست", vercel: "فيرسل فرسل", supabase: "سوبابيس سوبابيز", stripe: "سترايب ستريب",
  paypal: "بايبال", notion: "نوشن نوشين", obsidian: "اوبسيديان", canva: "كانفا", blender: "بلندر", davinci: "دافنشي دافينشي",
  excel: "اكسل", word: "وورد", powerpoint: "باوربوينت بوربوينت", seo: "سيو", animation: "انيميشن انميشن انيمشن انيمايشن",
  motion: "موشن", design: "ديزاين ديزين", font: "فونت فونتات", logo: "لوجو لوغو لوقو", icon: "ايكون ايكونات", video: "فيديو فديو",
  iphone: "ايفون", android: "اندرويد", mac: "ماك", landing: "لاندنج لاندينج لاندنق", dashboard: "داشبورد",
  theme: "ثيم ثيمات", plugin: "بلجن بلاجن بلوجن بلقن بلاقن", skill: "سكيل سكيلز سكل", prompt: "برومبت برومت بروبمت برومبتات",
  agent: "ايجنت ايجنتس", email: "ايميل اميل", gemini: "جيميني جمناي", google: "جوجل قوقل غوغل", tiktok: "تيكتوك",
  instagram: "انستغرام انستقرام انستجرام انستا", youtube: "يوتيوب", amazon: "امازون", github: "جيتهب قيتهب", chrome: "كروم",
  lottie: "لوتي", tailwind: "تيلويند تايلويند", markdown: "ماركداون", wordpress: "ووردبريس", chatgpt: "شاتجبت شاتجيبيتي",
  remotion: "ريموشن", xcode: "اكسكود", premiere: "بريمير", photoshop: "فوتوشوب",
};
const TRANSLIT_PHRASES = [
  ["بي دي اف", "pdf"], ["ام سي بي", "mcp"], ["جيت هب", "github"], ["افتر افكتس", "after effects"], ["ثري دي", "3d"],
  ["يو اي", "ui"], ["يو اكس", "ux"], ["اب ستور", "app store"], ["جوجل بلاي", "google play"], ["كلود كود", "claude code"],
  ["تيك توك", "tiktok"], ["نكست جي اس", "next js"], ["ثري جي اس", "three js"], ["شات جي بي تي", "chatgpt"], ["باي بال", "paypal"],
  ["اي او اس", "ios"], ["اي بي اي", "api"], ["اكس كود", "xcode"],
].map(([ar, en]) => [" " + norm(ar) + " ", " " + en + " "]);
const SYN = new Map();
for (const [en, ars] of Object.entries(TRANSLIT)) for (const a of ars.split(" ")) SYN.set(norm(a), en);
// مفردات «هل تقصد» تشمل هذه الكتابات، فيُصحَّح «شوبيفاى» و«فجما» أيضًا
export const translitWords = () => [...SYN.keys()];

// كلمات البحث: لكل كلمة صيغها، فتطابق «التطبيقات» نصًا فيه «تطبيق» و«للتصميم» نصًا فيه «تصميم» و«فيجما» نصًا فيه «Figma»
export function terms(q) {
  let s = " " + norm(q) + " ";
  for (const [ar, en] of TRANSLIT_PHRASES) s = s.split(ar).join(en);
  return s.trim().split(" ").filter(Boolean).map((w) => {
    const v = [w];
    if (AR.test(w)) {
      const p = w.replace(AR_PRE, "");
      if (p !== w && p.length >= 3) v.push(p);
      for (const x of [...v]) {
        const s2 = x.replace(AR_SUF, "");
        if (s2 !== x && s2.length >= 3 && !v.includes(s2)) v.push(s2);
      }
      // الكتابة العربية لاسم تقني، كاملة أو أثناء كتابتها («شوبي» ← shopify)
      const add = (en) => { if (!v.includes(en)) v.push(en); };
      for (const x of [...v]) {
        if (SYN.has(x)) add(SYN.get(x));
        else if (x.length >= 4) for (const [k, en] of SYN) if (k.startsWith(x)) add(en);
      }
    }
    return v;
  });
}

// موضع الكلمة في الحقل: كلمة كاملة 3، بداية كلمة 2، داخل كلمة 1 (الكلمات القصيرة جدًا لا تُقبل داخل كلمة).
// «ال» وأخواتها قبل الكلمة لا تُحسب: «تصميم» في «التصميم» أو «للتصميم» بداية كلمة
const AR_LEAD = new Set(["ال", "وال", "بال", "كال", "فال", "لل", "و", "ب", "ل", "ف", "ك"]);
function wordStart(field, i) {
  if (i === 0 || field[i - 1] === " ") return true;
  const from = field.lastIndexOf(" ", i - 1) + 1;
  return i - from <= 3 && AR_LEAD.has(field.slice(from, i));
}
function hit(field, v) {
  if (!field) return 0;
  let i = field.indexOf(v), best = 0;
  while (i !== -1 && best < 3) {
    const start = wordStart(field, i);
    const end = i + v.length === field.length || field[i + v.length] === " ";
    best = Math.max(best, start ? (end ? 3 : 2) : v.length > 2 ? 1 : 0);
    i = field.indexOf(v, i + 1);
  }
  return best;
}

// وثيقة البحث لكل أداة: n الاسم، nc الاسم بلا مسافات (nextjs ← Next.js)، t النوع والقسم، u المشاريع التي تفيدها،
// d الوصف بلغة الصفحة، o الوصف باللغتين الأخريين، c أمر التثبيت. كلها مطبَّعة.
// الدرجة: الاسم أولًا، ثم النوع والقسم، ثم الوصف، ثم الأمر واللغات الأخرى، ثم المشاريع (أداة «تفيد متجر Shopify»
// أبعد عن بحث «shopify» من أداة يذكرها وصفها). كل كلمة يجب أن تطابق شيئًا، وإلا فالدرجة 0.
export function score(doc, ts) {
  let total = 0;
  for (const vs of ts) {
    let best = 0;
    vs.forEach((v, k) => {
      const exact = k === 0 ? 1 : 0.8;
      const name = doc.n === v || doc.nc === v ? 30 : hit(doc.n, v) * 6 || (v.length > 2 && doc.nc.includes(v) ? 4 : 0);
      const s = Math.max(name, hit(doc.t, v) * 3, hit(doc.d, v) * 1.5, hit(doc.c, v), hit(doc.o, v) * 0.8, hit(doc.u, v) * 0.6);
      if (s * exact > best) best = s * exact;
    });
    if (!best) return 0;
    total += best;
  }
  return total;
}

export function makeDoc(f) {
  const n = norm(f.n);
  return { n, nc: n.replace(/ /g, ""), t: f.t || "", u: f.u || "", d: f.d || "", o: f.o || "", c: f.c || "" };
}

// ---- «هل تقصد»: أقرب كلمة من مفردات الدليل لكل كلمة لا تطابق شيئًا ----
// مسافة التحرير مع تبديل حرفين متجاورين (shopfiy ← shopify)، وتتوقف مبكرًا إن تجاوزت الحد
function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

// vocab: Map من الكلمة إلى عدد الأدوات التي تحويها. الكلمة التي توجد في المفردات (بإحدى صيغها) تبقى كما هي،
// وغيرها تُستبدل بأقرب كلمة (حرف واحد للكلمات القصيرة وحرفان للطويلة، والأكثر انتشارًا عند التساوي).
// يرجع البحث المصحَّح، أو null إن لم يتغير شيء.
export function suggest(q, vocab) {
  const ws = norm(q).split(" ").filter(Boolean);
  if (!ws.length) return null;
  const keys = [...vocab.keys()];
  let changed = false;
  const out = ws.map((w) => {
    const vs = terms(w)[0];
    if (w.length < 3 || vs.some((v) => keys.some((k) => k.includes(v)))) return w;
    // العربية أقصر كلمات وأكثر تشابهًا، فحرف واحد فقط حتى 8 أحرف. وأول حرف يبقى كما هو (الخطأ نادرًا ما يكون فيه)
    const max = w.length <= 5 || (AR.test(w) && w.length <= 8) ? 1 : 2;
    let best = null, bd = max + 1, bn = 0;
    for (const [k, n] of vocab) {
      if (k[0] !== w[0]) continue;
      const d = distance(w, k, max);
      if (d < bd || (d === bd && n > bn)) { best = k; bd = d; bn = n; }
    }
    if (best && bd <= max) { changed = true; return best; }
    return w;
  });
  return changed ? out.join(" ") : null;
}

export function addVocab(vocab, text) {
  for (const w of new Set(String(text).split(" "))) if (w.length >= 3) vocab.set(w, (vocab.get(w) || 0) + 1);
}

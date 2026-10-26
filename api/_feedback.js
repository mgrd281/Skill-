// التحقق من رسالة التقييم قبل حفظها. منفصل عن الدالة حتى يُختبر محليًا (الملفات التي تبدأ بـ _ لا تصبح دوال على Vercel).
const LANGS = ["ar", "de", "en"];
const MAX_MESSAGE = 1000;

// المسار والرسالة واللغة: مشتركة بين التقييم والإبلاغ عن مشكلة
function common(body) {
  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
  const lang = LANGS.includes(body.lang) ? body.lang : "ar";
  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200) : "/";
  return { message, lang, path };
}

export function parseFeedback(body) {
  if (!body || typeof body !== "object") return { error: "bad body" };
  // حقل فخ مخفي: يملؤه برامج السبام فقط
  if (body.website) return { spam: true };
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "rating must be 1-5" };
  return { value: { rating, ...common(body) } };
}

// يقبل الطلب من صفحات الموقع نفسه فقط، فلا تستطيع صفحة في موقع آخر أن ترسل باسم زوارها: المتصفحات ترسل Origin مع كل POST،
// ويجب أن يطابق عنوان الطلب. إن غاب (نادر) فيكفي ألا يقول Sec-Fetch-Site إنه من موقع آخر
export function sameSite(headers) {
  const origin = headers.get("origin");
  if (origin) {
    let h;
    try { h = new URL(origin).host; } catch { return false; }
    return h === headers.get("host") || h === headers.get("x-forwarded-host");
  }
  const site = headers.get("sec-fetch-site");
  return !site || site === "same-origin";
}

// الإبلاغ عن مشكلة في أداة (زر «أبلغ عن مشكلة» في صفحة الأداة): اسم الأداة وسبب من قائمة ثابتة، والرسالة اختيارية
export const REPORT_REASONS = ["link", "command", "outdated", "security", "other"];
export function parseReport(body) {
  if (!body || typeof body !== "object") return { error: "bad body" };
  if (body.website) return { spam: true };
  if (typeof body.slug !== "string" || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(body.slug)) return { error: "bad slug" };
  if (!REPORT_REASONS.includes(body.reason)) return { error: "bad reason" };
  return { value: { slug: body.slug, reason: body.reason, ...common(body) } };
}

// «اقترح أداة» (src/components/SuggestDialog.astro): اسم الأداة أو رابطها، وسبب اختياري
export function parseSuggest(body) {
  if (!body || typeof body !== "object") return { error: "bad body" };
  if (body.website) return { spam: true };
  const tool = typeof body.tool === "string" ? body.tool.trim().slice(0, 300) : "";
  if (tool.length < 2) return { error: "tool required" };
  return { value: { tool, ...common(body) } };
}

// عمليات بحث لم تجد نتيجة (src/scripts/misses.js): حتى 5 في كل إرسال، بلا هوية، لنعرف ما ينقص الدليل
export function parseMiss(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.queries)) return { error: "bad body" };
  const queries = [...new Set(body.queries.filter((q) => typeof q === "string").map((q) => q.trim().slice(0, 100)).filter((q) => q.length >= 2))].slice(0, 5);
  if (!queries.length) return { error: "no queries" };
  const { lang, path } = common(body);
  return { value: { queries, lang, path } };
}

// «ساعدني أختار» (src/scripts/finder-app.js): الإجابات الثلاث بلا هوية حين يصل الزائر إلى النتائج، لنعرف ما يهتم به الزوار.
// need الاهتمام وproject المشروع وtype شكل الأداة (any = لا تفضيل)، وfrom من أين فُتحت: النافذة الصغيرة أو زر في الصفحة أو رابط مشاركة
const ANSWER = /^[a-z]{2,12}$/;
const FROM = ["nudge", "page", "link"];
export function parseFinder(body) {
  if (!body || typeof body !== "object") return { error: "bad body" };
  if (![body.need, body.project, body.type].every((v) => typeof v === "string" && ANSWER.test(v))) return { error: "bad answers" };
  const { lang, path } = common(body);
  return { value: { need: body.need, project: body.project, type: body.type, from: FROM.includes(body.from) ? body.from : "page", lang, path } };
}

// نوع الرسالة ← دالة التحقق ومجلد الحفظ في المخزن
export const KINDS = {
  feedback: [parseFeedback, "feedback"],
  report: [parseReport, "reports"],
  suggest: [parseSuggest, "suggestions"],
  miss: [parseMiss, "misses"],
  finder: [parseFinder, "finder"],
};

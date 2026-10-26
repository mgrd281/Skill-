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

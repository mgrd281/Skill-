// التحقق من رسالة التقييم قبل حفظها. منفصل عن الدالة حتى يُختبر محليًا (الملفات التي تبدأ بـ _ لا تصبح دوال على Vercel).
const LANGS = ["ar", "de", "en"];
const MAX_MESSAGE = 1000;

export function parseFeedback(body) {
  if (!body || typeof body !== "object") return { error: "bad body" };
  // حقل فخ مخفي: يملؤه برامج السبام فقط
  if (body.website) return { spam: true };
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "rating must be 1-5" };
  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
  const lang = LANGS.includes(body.lang) ? body.lang : "ar";
  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200) : "/";
  return { value: { rating, message, lang, path } };
}

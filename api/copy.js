// يعدّ نسخ أمر تثبيت أداة لقسم «الأكثر نسخًا هذا الأسبوع»: اسم الأداة المختصر فقط، بلا هوية. المتصفح يرسل كل أداة
// مرة في اليوم (src/scripts/copy.js). بلا مخزن Upstash مربوط ترد بلا شيء (api/_counter.js).
import { sameSite } from "./_feedback.js";
import { redis, weekKey, SLUG } from "./_counter.js";

export async function POST(request) {
  if (!sameSite(request.headers)) return new Response(null, { status: 403 });
  const db = redis();
  if (!db) return new Response(null, { status: 204 });
  if (Number(request.headers.get("content-length") || 0) > 300) return new Response(null, { status: 413 });
  let body;
  try { body = await request.json(); } catch { return new Response(null, { status: 400 }); }
  const slug = body && typeof body.slug === "string" ? body.slug : "";
  if (!SLUG.test(slug)) return new Response(null, { status: 400 });
  const key = weekKey(new Date());
  await db([["ZINCRBY", key, "1", slug], ["EXPIRE", key, String(21 * 86400)]]);
  return new Response(null, { status: 204 });
}

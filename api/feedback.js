// يستقبل تقييم الزائر من نافذة "رأيك"، والإبلاغ عن مشكلة في أداة (kind: "report")، واقتراح أداة (kind: "suggest")،
// وعمليات البحث التي لم تجد نتيجة (kind: "miss")، وإجابات «ساعدني أختار» (kind: "finder")، ويحفظها في Vercel Blob
// (مخزن خاص، لا يُقرأ إلا من لوحة Vercel أو بـ npm run inbox): في feedback/ وreports/ وsuggestions/ وmisses/ وfinder/.
// يحتاج متغير البيئة BLOB_READ_WRITE_TOKEN، ويضيفه Vercel تلقائيًا عند ربط مخزن Blob بالمشروع.
import { put } from "@vercel/blob";
import { KINDS, sameSite } from "./_feedback.js";

const json = (status, data) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function POST(request) {
  if (!sameSite(request.headers)) return json(403, { ok: false });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(503, { ok: false, error: "storage not configured" });
  const len = Number(request.headers.get("content-length") || 0);
  if (len > 4000) return json(413, { ok: false });
  let body;
  try { body = await request.json(); } catch { return json(400, { ok: false }); }
  const kind = body && Object.hasOwn(KINDS, body.kind) ? body.kind : "feedback";
  const [parse, folder] = KINDS[kind];
  const r = parse(body);
  if (r.spam) return json(200, { ok: true });
  if (r.error) return json(400, { ok: false, error: r.error });
  const at = new Date().toISOString();
  const record = { ...r.value, at }; // لا اسم ولا بريد ولا IP: ما كتبه الزائر فقط
  const name = `${folder}/${at.slice(0, 10)}/${at.slice(11, 19).replace(/:/g, "")}-${crypto.randomUUID().slice(0, 8)}.json`;
  await put(name, JSON.stringify(record, null, 2), { access: "private", contentType: "application/json", addRandomSuffix: false });
  return json(200, { ok: true });
}

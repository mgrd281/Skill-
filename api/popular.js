// «الأكثر نسخًا هذا الأسبوع» للرئيسية (src/scripts/popular.js): أعلى الأدوات نسخًا في هذا الأسبوع والذي قبله معًا،
// حتى لا يفرغ القسم صباح كل اثنين. يُخزَّن في شبكة Vercel ساعة، فلا يُقرأ المخزن إلا مرة كل ساعة.
import { redis, weekKey, topOf } from "./_counter.js";

const headers = { "Content-Type": "application/json", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" };

export async function GET() {
  const db = redis();
  if (!db) return new Response(JSON.stringify({ tools: [] }), { headers });
  const now = new Date();
  try {
    const lists = await db([
      ["ZREVRANGE", weekKey(now), "0", "39", "WITHSCORES"],
      ["ZREVRANGE", weekKey(new Date(now.getTime() - 7 * 864e5)), "0", "39", "WITHSCORES"],
    ]);
    return new Response(JSON.stringify({ tools: topOf(lists, 12) }), { headers });
  } catch {
    return new Response(JSON.stringify({ tools: [] }), { headers: { ...headers, "Cache-Control": "no-store" } });
  }
}

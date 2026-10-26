// عدّاد نسخ أوامر التثبيت (api/copy.js وapi/popular.js): مجموعة مرتبة لكل أسبوع في Upstash Redis عبر واجهته REST.
// منفصل عن الدالتين حتى يُختبر محليًا (الملفات التي تبدأ بـ _ لا تصبح دوال على Vercel).

// يعمل حين يُربط مخزن Upstash بالمشروع في Vercel: يضيف Vercel KV_REST_API_URL وKV_REST_API_TOKEN
// (أو UPSTASH_REDIS_REST_URL وUPSTASH_REDIS_REST_TOKEN). بدونهما null، فلا تفعل الدالتان شيئًا.
export function redis(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return async (cmds) => {
    const r = await fetch(url.replace(/\/$/, "") + "/pipeline", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds),
    });
    if (!r.ok) throw new Error("redis " + r.status);
    return (await r.json()).map((x) => x.result);
  };
}

// مفتاح أسبوع ISO للتاريخ: copies:2026-W44 (الأسبوع يبدأ الاثنين، وأسبوع السنة الأول فيه أول خميس)
export function weekKey(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t - Date.UTC(year, 0, 1)) / 864e5 + 1) / 7);
  return `copies:${year}-W${String(week).padStart(2, "0")}`;
}

export const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

// يجمع نتائج ZREVRANGE … WITHSCORES (اسم، عدد، اسم، عدد…) لعدة أسابيع، ويرجع الأعلى: [{ s, n }]
export function topOf(lists, limit) {
  const sum = new Map();
  for (const l of lists) for (let i = 0; i + 1 < (l || []).length; i += 2) {
    const n = Number(l[i + 1]);
    if (SLUG.test(l[i]) && Number.isFinite(n)) sum.set(l[i], (sum.get(l[i]) || 0) + n);
  }
  return [...sum].map(([s, n]) => ({ s, n })).sort((a, b) => b.n - a.n || a.s.localeCompare(b.s)).slice(0, limit);
}

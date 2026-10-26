// صندوق الوارد: يلخّص ما أرسله الزوار إلى مخزن Vercel Blob الخاص (api/feedback.js): متوسط التقييم وآخر الرسائل،
// والبلاغات لكل أداة، واقتراحات الأدوات، وأكثر عمليات البحث التي لم تجد نتيجة، واهتمامات الزوار من «ساعدني أختار».
// للقراءة فقط، لا يحذف شيئًا.
// يحتاج BLOB_READ_WRITE_TOKEN: `npx vercel env pull .env.local` مرة واحدة، ثم:
//   node --env-file=.env.local scripts/inbox.mjs            (آخر 30 يومًا)
//   node --env-file=.env.local scripts/inbox.mjs --days=7
import fs from "node:fs";
import { list, get } from "@vercel/blob";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("لا يوجد BLOB_READ_WRITE_TOKEN. شغّل `npx vercel env pull .env.local` ثم أعد الأمر مع --env-file=.env.local");
  process.exit(1);
}
const days = Number((process.argv.find((a) => a.startsWith("--days=")) || "--days=30").slice(7)) || 30;
const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);

async function read(folder) {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix: folder + "/", cursor, limit: 1000 });
    for (const b of r.blobs) {
      if (b.pathname.slice(folder.length + 1, folder.length + 11) < since) continue;
      const g = await get(b.pathname, { access: "private" });
      if (g) out.push(JSON.parse(await new Response(g.stream).text()));
    }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
}

const [feedback, reports, suggestions, misses, finder] = await Promise.all(["feedback", "reports", "suggestions", "misses", "finder"].map(read));
const line = (s) => String(s || "").replace(/\s+/g, " ").slice(0, 160);
console.log(`# صندوق الوارد منذ ${since} (${days} يومًا)\n`);

console.log(`## الآراء: ${feedback.length}`);
if (feedback.length) {
  const avg = feedback.reduce((n, f) => n + f.rating, 0) / feedback.length;
  console.log(`متوسط التقييم ${avg.toFixed(1)} من 5`);
  feedback.filter((f) => f.message).slice(0, 15).forEach((f) => console.log(`- ${f.rating}★ [${f.lang}] ${line(f.message)}`));
}

console.log(`\n## البلاغات: ${reports.length}`);
const byTool = new Map();
reports.forEach((r) => byTool.set(r.slug, [...(byTool.get(r.slug) || []), r]));
[...byTool].sort((a, b) => b[1].length - a[1].length).forEach(([slug, rs]) => {
  console.log(`- ${slug} (${rs.length}): ${[...new Set(rs.map((r) => r.reason))].join("، ")}`);
  rs.filter((r) => r.message).slice(0, 3).forEach((r) => console.log(`  - ${line(r.message)}`));
});

console.log(`\n## اقتراحات أدوات: ${suggestions.length}`);
suggestions.forEach((s) => console.log(`- ${line(s.tool)}${s.message ? " — " + line(s.message) : ""} [${s.lang}]`));

console.log(`\n## بحث بلا نتيجة: ${misses.length} زيارة`);
const counts = new Map();
misses.forEach((m) => m.queries.forEach((q) => counts.set(q, (counts.get(q) || 0) + 1)));
[...counts].sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([q, n]) => console.log(`- ${q} (${n})`));

// «ساعدني أختار»: كم مرة اختير كل اهتمام ومشروع وشكل، وأكثر المجموعات (الأسماء من src/i18n/ui.ts وdata/projects.json)
console.log(`\n## «ساعدني أختار»: ${finder.length} نتيجة`);
if (finder.length) {
  const projects = JSON.parse(fs.readFileSync(new URL("../data/projects.json", import.meta.url), "utf8"));
  const NAME = {
    need: { design: "التصميم", motion: "الحركة والفيديو", code: "البرمجة", grow: "التسويق", work: "الإدارة والمستندات", write: "الكتابة", any: "كل شيء" },
    project: { ...Object.fromEntries(projects.map((p) => [p.id, p.name])), any: "أستكشف فقط" },
    type: { skill: "مهارات", mcp: "MCP", lib: "مكتبات وأدوات", ready: "جاهزة", any: "أي شكل" },
    from: { nudge: "النافذة الصغيرة", page: "زر في الصفحة", link: "رابط مشاركة" },
  };
  const tally = (key) => {
    const c = new Map();
    finder.forEach((f) => c.set(f[key], (c.get(f[key]) || 0) + 1));
    return [...c].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${NAME[key][v] || v} ${n}`).join("، ");
  };
  console.log(`- ما يهمهم: ${tally("need")}`);
  console.log(`- ماذا يبنون: ${tally("project")}`);
  console.log(`- الشكل: ${tally("type")}`);
  console.log(`- من أين: ${tally("from")}`);
  const combos = new Map();
  finder.forEach((f) => { const k = `${NAME.need[f.need] || f.need} + ${NAME.project[f.project] || f.project} + ${NAME.type[f.type] || f.type}`; combos.set(k, (combos.get(k) || 0) + 1); });
  console.log("- أكثر المجموعات:");
  [...combos].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, n]) => console.log(`  - ${k} (${n})`));
}

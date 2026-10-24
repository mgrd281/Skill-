// فحص سلامة البيانات قبل النشر: node scripts/check-data.mjs
import fs from "node:fs";
const R = new URL("../data/", import.meta.url);
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, R), "utf8"));
const tools = read("tools.json"), cats = read("categories.json"), projects = read("projects.json");
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const catIds = new Set(cats.map((c) => c.id)), projIds = new Set(projects.map((p) => p.id));
const slugs = new Set(), problems = [];
for (const t of tools) {
  if (!t.name || !t.desc) problems.push(`ناقص: ${t.name || "(بدون اسم)"}`);
  if (t.slug !== slugify(t.name)) problems.push(`slug غير مطابق للاسم: ${t.name}`);
  if (slugs.has(t.slug)) problems.push(`slug مكرر: ${t.slug}`);
  slugs.add(t.slug);
  if (!catIds.has(t.cat)) problems.push(`قسم غير معروف في ${t.name}: ${t.cat}`);
  for (const u of t.use) if (!projIds.has(u)) problems.push(`مشروع غير معروف في ${t.name}: ${u}`);
  for (const k of ["gh", "site"]) if (t[k] && !/^https:\/\//.test(t[k])) problems.push(`${k} ليس https في ${t.name}`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(t.added || "")) problems.push(`added غير صالح في ${t.name} (الصيغة: 2026-10-24T09:30:00Z)`);
  if (!t.gh && !t.site) problems.push(`لا رابط لـ ${t.name}`);
}
for (const p of projects) for (const k of p.picks) if (!slugs.has(slugify(k))) problems.push(`اقتراح غير موجود في ${p.id}: ${k}`);
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`OK: ${tools.length} أداة، ${cats.length} قسمًا، ${projects.length} مشروعًا`);

// فحص سلامة البيانات قبل النشر: node scripts/check-data.mjs
import fs from "node:fs";
const R = new URL("../data/", import.meta.url);
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, R), "utf8"));
const tools = read("tools.json"), cats = read("categories.json"), projects = read("projects.json");
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const catIds = new Set(cats.map((c) => c.id)), projIds = new Set(projects.map((p) => p.id));
const slugs = new Set(), problems = [];
// الأنواع المعروفة (لكل نوع ترجمة ألمانية وإنجليزية وأيقونة في src/lib/data.ts)
const KINDS = ["Skill", "MCP", "مكتبة", "أداة", "موقع", "منصة", "تطبيق", "صيغة", "دليل"];
// الحقول المترجمة (الموقع بثلاث لغات: العربية، والألمانية _de، والإنجليزية _en): يجب أن تكون موجودة وبلا حروف عربية
const AR = /[\u0600-\u06FF]/;
const TR = { de: "الألمانية", en: "الإنجليزية" };
const need = (val, lang, what) => {
  if (!val || !String(val).trim()) problems.push(`ترجمة ${TR[lang]} ناقصة: ${what}`);
  else if (AR.test(val)) problems.push(`حروف عربية في الترجمة ${TR[lang]}: ${what}`);
};
for (const lang of Object.keys(TR)) {
  for (const c of cats) need(c[`name_${lang}`], lang, `name_${lang} للقسم ${c.id}`);
  for (const p of projects) { need(p[`name_${lang}`], lang, `name_${lang} للمشروع ${p.id}`); need(p[`advice_${lang}`], lang, `advice_${lang} للمشروع ${p.id}`); }
}
for (const t of tools) {
  if (!t.name || !t.desc) problems.push(`ناقص: ${t.name || "(بدون اسم)"}`);
  for (const lang of Object.keys(TR)) need(t[`desc_${lang}`], lang, `desc_${lang} لـ ${t.name}`);
  if (!KINDS.includes(t.kind)) problems.push(`نوع غير معروف في ${t.name}: ${t.kind} (أضفه مع ترجمته في src/lib/data.ts وهنا)`);
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
// تحذير لا يفشل الفحص: بيانات GitHub (التاريخ والرخصة) تملؤها update-stars.mjs
const noMeta = tools.filter((t) => t.gh && (!t.pushed || t.license === undefined));
if (noMeta.length) console.warn(`تحذير: ${noMeta.length} أداة بلا تاريخ تحديث أو رخصة (شارات الحالة لن تظهر لها). شغّل update-stars.`);
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`OK: ${tools.length} أداة، ${cats.length} قسمًا، ${projects.length} مشروعًا`);

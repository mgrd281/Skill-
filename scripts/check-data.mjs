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
// مجموعة الأقسام: "apps" لأقسام «تطبيقات جاهزة» فقط، وكل أداة فيها نوعها «تطبيق» (src/lib/data.ts وsrc/lib/finder.ts)
const appCatIds = new Set(cats.filter((c) => c.group === "apps").map((c) => c.id));
for (const c of cats) if ("group" in c && c.group !== "apps") problems.push(`مجموعة غير معروفة للقسم ${c.id}: ${c.group} (المعروف: apps)`);
for (const t of tools) {
  if (!t.name || !t.desc) problems.push(`ناقص: ${t.name || "(بدون اسم)"}`);
  if (appCatIds.has(t.cat) && t.kind !== "تطبيق") problems.push(`${t.name} في قسم «تطبيقات جاهزة» ونوعه ليس «تطبيق»`);
  for (const lang of Object.keys(TR)) need(t[`desc_${lang}`], lang, `desc_${lang} لـ ${t.name}`);
  if ("inside" in t && t.inside !== false && !(typeof t.inside === "string" && t.inside.trim())) problems.push(`inside في ${t.name}: false أو كلمة (scripts/update-inside.mjs)`);
  if (!KINDS.includes(t.kind)) problems.push(`نوع غير معروف في ${t.name}: ${t.kind} (أضفه مع ترجمته في src/lib/data.ts وهنا)`);
  if (t.slug !== slugify(t.name)) problems.push(`slug غير مطابق للاسم: ${t.name}`);
  if (slugs.has(t.slug)) problems.push(`slug مكرر: ${t.slug}`);
  slugs.add(t.slug);
  if (!catIds.has(t.cat)) problems.push(`قسم غير معروف في ${t.name}: ${t.cat}`);
  for (const u of t.use) if (!projIds.has(u)) problems.push(`مشروع غير معروف في ${t.name}: ${u}`);
  for (const k of ["gh", "site"]) if (t[k] && !/^https:\/\//.test(t[k])) problems.push(`${k} ليس https في ${t.name}`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(t.added || "")) problems.push(`added غير صالح في ${t.name} (الصيغة: 2026-10-24T09:30:00Z)`);
  if (!t.gh && !t.site) problems.push(`لا رابط لـ ${t.name}`);
  if ("icon" in t && !(t.icon === false || (typeof t.icon === "string" && t.icon.trim() && t.kind === "تطبيق"))) problems.push(`icon في ${t.name}: مسار الأيقونة في المستودع أو false، للتطبيقات فقط (scripts/fetch-app-icons.mjs)`);
}
// أمثلة الطلب (data/examples.json): لأدوات موجودة، وبثلاث لغات
const examples = read("examples.json");
for (const [slug, ex] of Object.entries(examples)) {
  if (!slugs.has(slug)) problems.push(`مثال لأداة غير موجودة: ${slug}`);
  if (!ex.ar || !AR.test(ex.ar)) problems.push(`مثال عربي ناقص: ${slug}`);
  for (const lang of Object.keys(TR)) need(ex[lang], lang, `مثال ${lang} لـ ${slug}`);
}
for (const p of projects) for (const k of p.picks) if (!slugs.has(slugify(k))) problems.push(`اقتراح غير موجود في ${p.id}: ${k}`);
// إعدادات الموقع في data/meta.json: الناشر (Impressum) والنشرة البريدية، إن وُجدا (README، قسم «النشر»)
const meta = read("meta.json");
const str = (v) => typeof v === "string" && v.trim() !== "" && !/…|\.\.\.|الاسم|رابط /.test(v);
if ("operator" in meta) {
  const o = meta.operator ?? {};
  if (!str(o.name)) problems.push("operator.name ناقص في meta.json (الاسم الكامل أو اسم الشركة)");
  if (!Array.isArray(o.address) || o.address.length < 2 || !o.address.every(str)) problems.push("operator.address في meta.json: سطران على الأقل (الشارع والرقم، الرمز البريدي والمدينة)");
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(o.email || "")) problems.push("operator.email في meta.json: بريد صالح (مطلوب في Impressum)");
  if ("phone" in o && !/^\+?[\d\s()/-]{6,}$/.test(o.phone)) problems.push("operator.phone في meta.json: أرقام فقط، مثل +49 30 1234567");
  for (const k of ["represented", "register", "vatId", "responsible"]) if (k in o && !str(o[k])) problems.push(`operator.${k} فارغ في meta.json: احذفه أو املأه`);
  const known = ["name", "address", "email", "phone", "represented", "register", "vatId", "responsible"];
  for (const k of Object.keys(o)) if (!known.includes(k)) problems.push(`حقل غير معروف operator.${k} في meta.json (المعروف: ${known.join("، ")})`);
}
if ("newsletter" in meta) {
  const n = meta.newsletter ?? {};
  if (!str(n.provider)) problems.push("newsletter.provider ناقص في meta.json (اسم المزوّد، يظهر في الخصوصية)");
  if (!/^https:\/\/\S+$/.test(n.action || "")) problems.push("newsletter.action في meta.json: رابط https لنموذج الاشتراك عند المزوّد");
  if ("field" in n && !str(n.field)) problems.push("newsletter.field فارغ في meta.json");
  if ("hidden" in n && !(n.hidden && typeof n.hidden === "object" && !Array.isArray(n.hidden) && Object.values(n.hidden).every((v) => typeof v === "string")))
    problems.push("newsletter.hidden في meta.json: كائن قيمه نصوص، مثل { \"locale\": \"{lang}\" }");
}
if ("verify" in meta) {
  const v = meta.verify ?? {};
  for (const [k, val] of Object.entries(v)) {
    if (!["google", "bing"].includes(k)) problems.push(`حقل غير معروف verify.${k} في meta.json (المعروف: google، bing)`);
    else if (!/^[\w-]{8,100}$/.test(val || "")) problems.push(`verify.${k} في meta.json: قيمة content وحدها من وسم التحقق، بلا علامات اقتباس ولا وسم`);
  }
}
if ("sponsor" in meta) {
  const sp = meta.sponsor ?? {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sp.until || "")) problems.push("sponsor.until في meta.json: تاريخ انتهاء الإعلان بالصيغة 2026-12-31");
  if (sp.slug) { if (!slugs.has(sp.slug)) problems.push(`sponsor.slug في meta.json: لا أداة بهذا الاسم (${sp.slug})`); }
  else {
    if (!str(sp.name)) problems.push("sponsor.name ناقص في meta.json (أو ضع slug لأداة من الدليل)");
    if (!/^https:\/\/\S+$/.test(sp.url || "")) problems.push("sponsor.url في meta.json: رابط https");
    if (!sp.text) problems.push("sponsor.text ناقص في meta.json: { ar, de, en }");
  }
  if (sp.text) {
    if (!sp.text.ar || !AR.test(sp.text.ar)) problems.push("sponsor.text.ar ناقص في meta.json");
    for (const lang of Object.keys(TR)) need(sp.text[lang], lang, `sponsor.text.${lang} في meta.json`);
    for (const [k, v] of Object.entries(sp.text)) if (typeof v === "string" && v.length > 140) problems.push(`sponsor.text.${k} أطول من 140 حرفًا`);
  }
}
// «ننصح به» (data/picks.json): حتى ثلاث أدوات لكل قسم، من القسم نفسه، غير مؤرشفة، ولكل واحدة غرضها بثلاث لغات
const picksData = read("picks.json"), bySlug = new Map(tools.map((t) => [t.slug, t]));
for (const [cat, list] of Object.entries(picksData)) {
  if (!catIds.has(cat)) problems.push(`قسم غير معروف في picks.json: ${cat}`);
  if (list.length > 3) problems.push(`أكثر من ثلاث توصيات في القسم ${cat}`);
  for (const p of list) {
    const t = bySlug.get(p.slug);
    if (!t) { problems.push(`توصية لأداة غير موجودة: ${p.slug}`); continue; }
    if (t.cat !== cat) problems.push(`التوصية ${p.slug} ليست من القسم ${cat}`);
    if (t.archived) problems.push(`التوصية ${p.slug} مؤرشفة: اختر غيرها في picks.json`);
    if (!AR.test(p.for || "")) problems.push(`غرض عربي ناقص للتوصية ${p.slug}`);
    for (const lang of Object.keys(TR)) need(p[`for_${lang}`], lang, `for_${lang} للتوصية ${p.slug}`);
  }
}
// قوائم «الأفضل» (data/lists.json، src/lib/lists.ts): أقسام وأنواع معروفة، وترجمات، وخمس أدوات على الأقل
const bestLists = read("lists.json"), listIds = new Set();
for (const l of bestLists) {
  if (!/^[a-z0-9-]+$/.test(l.id || "") || listIds.has(l.id)) problems.push(`قائمة بمعرّف غير صالح أو مكرر: ${l.id}`);
  listIds.add(l.id);
  for (const c of l.cats || []) if (!catIds.has(c)) problems.push(`قسم غير معروف في القائمة ${l.id}: ${c}`);
  for (const k of l.kinds || []) if (!KINDS.includes(k)) problems.push(`نوع غير معروف في القائمة ${l.id}: ${k}`);
  if (!AR.test(l.title || "") || !AR.test(l.lead || "")) problems.push(`عنوان أو وصف عربي ناقص في القائمة ${l.id}`);
  for (const lang of Object.keys(TR)) { need(l[`title_${lang}`], lang, `title_${lang} للقائمة ${l.id}`); need(l[`lead_${lang}`], lang, `lead_${lang} للقائمة ${l.id}`); }
  const n = tools.filter((t) => (!l.cats || l.cats.includes(t.cat)) && (!l.kinds || l.kinds.includes(t.kind)) && !t.archived).length;
  if (n < 5) problems.push(`القائمة ${l.id} فيها ${n} أدوات فقط (5 على الأقل)`);
}
// تحذير لا يفشل الفحص: بيانات GitHub (التاريخ والرخصة) تملؤها update-stars.mjs
const noMeta = tools.filter((t) => t.gh && (!t.pushed || t.license === undefined));
if (noMeta.length) console.warn(`تحذير: ${noMeta.length} أداة بلا تاريخ تحديث أو رخصة (شارات الحالة لن تظهر لها). شغّل update-stars.`);
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`OK: ${tools.length} أداة، ${cats.length} قسمًا، ${projects.length} مشروعًا`);

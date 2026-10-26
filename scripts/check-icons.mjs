// يتحقق بعد البناء أن كل أيقونة <use href="#i-…"> في كل صفحة لها رسم <symbol> في الصفحة نفسها، ولا رسم بلا استخدام.
// البطاقات التي تُجلب لاحقًا (cards/index.html بكل لغة) بلا رسوم: أيقوناتها يجب أن تكون مرسومة في الرئيسية والمفضلة بلغتها.
// الاستخدام: npm run build && npm run check-icons
import fs from "node:fs";
import path from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
if (!fs.existsSync(dist)) { console.error("لا يوجد مجلد dist. شغّل npm run build أولًا."); process.exit(1); }

const pages = fs.readdirSync(dist, { recursive: true }).filter((f) => f.endsWith(".html"));
const problems = [];
const fragments = [];
const idsOf = (html, re) => new Set([...html.matchAll(re)].map((m) => m[1]));
let uses = 0;
for (const f of pages) {
  const html = fs.readFileSync(path.join(dist, f), "utf8");
  if (/(^|\/)cards\/index\.html$/.test(f)) { fragments.push(f); continue; }
  const defined = new Set([...html.matchAll(/<symbol id="(i-[^"]+)"/g)].map((m) => m[1]));
  const used = new Set([...html.matchAll(/<use href="#(i-[^"]+)"/g)].map((m) => m[1]));
  uses += used.size;
  const missing = [...used].filter((id) => !defined.has(id));
  const extra = [...defined].filter((id) => !used.has(id));
  if (missing.length) problems.push(`${f}: أيقونات بلا رسم: ${missing.join("، ")}`);
  if (extra.length) problems.push(`${f}: رسوم غير مستخدمة: ${extra.join("، ")}`);
}
for (const f of fragments) {
  const used = idsOf(fs.readFileSync(path.join(dist, f), "utf8"), /<use href="#(i-[^"]+)"/g);
  const dir = path.dirname(path.dirname(f));
  for (const host of [path.join(dir, "index.html"), path.join(dir, "favorites", "index.html")]) {
    const defined = idsOf(fs.readFileSync(path.join(dist, host), "utf8"), /<symbol id="(i-[^"]+)"/g);
    const missing = [...used].filter((id) => !defined.has(id));
    if (missing.length) problems.push(`${f}: أيقونات البطاقات غير مرسومة في ${host}: ${missing.join("، ")} (أضفها إلى src/components/CardIcons.astro)`);
  }
}
if (problems.length) {
  console.error(problems.join("\n"));
  console.error("\nأيقونة جديدة في Base.astro؟ أضفها إلى قائمة useIcon هناك.");
  process.exit(1);
}
console.log(`OK: ${pages.length} صفحة، وكل أيقوناتها مرسومة (${uses} استخدام فريد).`);

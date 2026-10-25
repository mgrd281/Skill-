// يتحقق بعد البناء أن كل أيقونة <use href="#i-…"> في كل صفحة لها رسم <symbol> في الصفحة نفسها.
// الاستخدام: npm run build && npm run check-icons
import fs from "node:fs";
import path from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
if (!fs.existsSync(dist)) { console.error("لا يوجد مجلد dist. شغّل npm run build أولًا."); process.exit(1); }

const pages = fs.readdirSync(dist, { recursive: true }).filter((f) => f.endsWith(".html"));
const problems = [];
let uses = 0;
for (const f of pages) {
  const html = fs.readFileSync(path.join(dist, f), "utf8");
  const defined = new Set([...html.matchAll(/<symbol id="(i-[^"]+)"/g)].map((m) => m[1]));
  const used = new Set([...html.matchAll(/<use href="#(i-[^"]+)"/g)].map((m) => m[1]));
  uses += used.size;
  const missing = [...used].filter((id) => !defined.has(id));
  const extra = [...defined].filter((id) => !used.has(id));
  if (missing.length) problems.push(`${f}: أيقونات بلا رسم: ${missing.join("، ")}`);
  if (extra.length) problems.push(`${f}: رسوم غير مستخدمة: ${extra.join("، ")}`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  console.error("\nأيقونة جديدة في Base.astro؟ أضفها إلى قائمة useIcon هناك.");
  process.exit(1);
}
console.log(`OK: ${pages.length} صفحة، وكل أيقوناتها مرسومة (${uses} استخدام فريد).`);
